import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SW_SOURCE = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const ORIGIN = "https://www.evspend.com";

function versionedSource(version) {
  return SW_SOURCE.replace(
    /(const CACHE_VERSION\s*=\s*)'[^']*'/,
    `$1'${version}'`
  );
}

function keyOf(input, ignoreSearch = false) {
  const raw = typeof input === "string" ? input : input.url;
  const url = new URL(raw, ORIGIN);
  if (ignoreSearch) url.search = "";
  return url.href;
}

class TestRequest {
  constructor(input, init = {}) {
    const previous = typeof input === "object" && input ? input : {};
    this.url = keyOf(input);
    this.method = init.method || previous.method || "GET";
    this.mode = init.mode || previous.mode || "cors";
    this.cache = init.cache || previous.cache || "default";
    this.headers = new Headers(init.headers || previous.headers || {});
  }
}

class MemoryCache {
  constructor(storage, name) {
    this.storage = storage;
    this.name = name;
    this.entries = new Map();
  }

  async put(request, response) {
    const key = keyOf(request);
    this.storage.putCalls.push([this.name, key]);
    if (this.storage.failPut && this.storage.failPut(this.name, new URL(key))) {
      throw new Error("synthetic cache put failure");
    }
    this.entries.set(key, response.clone());
  }

  async addAll(requests) {
    const responses = await Promise.all(requests.map(request => this.storage.fetcher(request)));
    const staged = [];
    const keys = new Set();
    for (let index = 0; index < requests.length; index += 1) {
      const request = requests[index];
      const response = responses[index];
      const key = keyOf(request);
      if (!response || !response.ok || keys.has(key)) {
        throw new Error("synthetic cache addAll failure");
      }
      if (this.storage.failPut && this.storage.failPut(this.name, new URL(key))) {
        throw new Error("synthetic cache put failure");
      }
      keys.add(key);
      staged.push([key, response.clone()]);
    }
    for (const [key, response] of staged) {
      this.storage.putCalls.push([this.name, key]);
      this.entries.set(key, response);
    }
  }

  async match(request, options = {}) {
    const exact = keyOf(request, !!options.ignoreSearch);
    for (const [key, response] of this.entries) {
      if (keyOf(key, !!options.ignoreSearch) === exact) return response.clone();
    }
    return undefined;
  }
}

class MemoryCacheStorage {
  constructor(options = {}) {
    this.caches = new Map();
    this.failOpen = options.failOpen || null;
    this.failPut = options.failPut || null;
    this.failDelete = options.failDelete || null;
    this.putCalls = [];
    this.deleteCalls = [];
    this.globalMatchCalls = 0;
    this.fetcher = null;
  }

  async open(name) {
    if (this.failOpen && this.failOpen(name)) throw new Error("synthetic cache open failure");
    if (!this.caches.has(name)) this.caches.set(name, new MemoryCache(this, name));
    return this.caches.get(name);
  }

  async match(request, options = {}) {
    this.globalMatchCalls += 1;
    for (const cache of this.caches.values()) {
      const response = await cache.match(request, options);
      if (response) return response;
    }
    return undefined;
  }

  async keys() {
    return [...this.caches.keys()];
  }

  async delete(name) {
    this.deleteCalls.push(name);
    if (this.failDelete && this.failDelete(name)) throw new Error("synthetic cache delete failure");
    return this.caches.delete(name);
  }
}

function contentType(url) {
  if (/\.css$/i.test(url.pathname)) return "text/css";
  if (/\.js$/i.test(url.pathname)) return "text/javascript";
  if (/\.woff2?$/i.test(url.pathname)) return "font/woff2";
  if (/\.(?:png|webp|ico)$/i.test(url.pathname)) return "image/png";
  if (/\.webmanifest$/i.test(url.pathname)) return "application/manifest+json";
  return "text/html; charset=utf-8";
}

function createWorker(options = {}) {
  const listeners = new Map();
  const cacheStorage = options.caches || new MemoryCacheStorage(options);
  const fetchCalls = [];
  const state = { skipWaiting: 0, claimed: 0, fetchWaitUntil: 0, storageAccesses: 0 };
  let network = options.network || (async (request) => {
    const url = new URL(request.url);
    return new Response(`NETWORK:${url.pathname}`, {
      status: 200,
      headers: { "Content-Type": contentType(url) }
    });
  });
  const self = {
    location: new URL(`${ORIGIN}/sw.js`),
    addEventListener(type, handler) { listeners.set(type, handler); },
    skipWaiting() { state.skipWaiting += 1; return Promise.resolve(); },
    clients: { claim() { state.claimed += 1; return Promise.resolve(); } }
  };
  const fetchRequest = (request) => {
    const normalized = request instanceof TestRequest ? request : new TestRequest(request);
    fetchCalls.push(normalized.url);
    return network(normalized);
  };
  cacheStorage.fetcher = fetchRequest;
  const sandbox = {
    self,
    caches: cacheStorage,
    fetch: fetchRequest,
    Request: TestRequest,
    Response,
    Headers,
    URL,
    Promise,
    console
  };
  for (const storageApi of ["localStorage", "sessionStorage", "indexedDB"]) {
    Object.defineProperty(sandbox, storageApi, {
      configurable: true,
      get() {
        state.storageAccesses += 1;
        throw new Error(`Unexpected access to ${storageApi}`);
      }
    });
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(options.source || SW_SOURCE, context, { filename: "sw.js" });

  async function lifecycle(type) {
    let promise;
    listeners.get(type)({ waitUntil(value) { promise = Promise.resolve(value); } });
    assert.ok(promise, `${type} must call waitUntil`);
    return promise;
  }

  async function request(url, init = {}) {
    const req = new TestRequest(url, init);
    let responsePromise;
    const lifetimePromises = [];
    listeners.get("fetch")({
      request: req,
      respondWith(value) { responsePromise = Promise.resolve(value); },
      waitUntil(value) {
        state.fetchWaitUntil += 1;
        lifetimePromises.push(Promise.resolve(value));
      }
    });
    const response = responsePromise ? await responsePromise : await network(req);
    await Promise.all(lifetimePromises);
    return {
      intercepted: !!responsePromise,
      response
    };
  }

  return {
    caches: cacheStorage,
    fetchCalls,
    state,
    install: () => lifecycle("install"),
    activate: () => lifecycle("activate"),
    request,
    setNetwork(next) { network = next; }
  };
}

async function seed(storage, cacheName, entries) {
  const cache = await storage.open(cacheName);
  for (const [url, body, type = "text/html; charset=utf-8"] of entries) {
    await cache.put(url, new Response(body, { status: 200, headers: { "Content-Type": type } }));
  }
}

async function body(response) {
  return response.clone().text();
}

test("EVS-051 erster vollständiger Aufbau aktiviert genau eine Generation", async () => {
  const rt = createWorker();
  await rt.install();
  assert.equal(rt.state.skipWaiting, 1);
  const names = await rt.caches.keys();
  assert.equal(names.filter(name => name.startsWith("evspend-static-")).length, 1);
  const cache = await rt.caches.open(names.find(name => name.startsWith("evspend-static-")));
  assert.ok(await cache.match("/script.min.js?v=20260619-wfinal"));
});

test("H1 versionierter Verlauf Coordinator bleibt aus dem Pflicht Precache offline verfügbar", async () => {
  const route = "/history-store.js?v=20260927-h1";
  const rt = createWorker();
  await rt.install();
  const fetchesAfterInstall = rt.fetchCalls.length;
  rt.setNetwork(async () => { throw new Error("offline cache hit must not fetch"); });

  const result = await rt.request(ORIGIN + route);
  assert.equal(result.intercepted, true);
  assert.equal(result.response.status, 200);
  assert.equal(await body(result.response), "NETWORK:/history-store.js");
  assert.equal(rt.fetchCalls.length, fetchesAfterInstall);
});

test("EVS-051 ein Pflichtfehler verwirft die neue Generation und erhält A", async () => {
  const caches = new MemoryCacheStorage();
  await seed(caches, "evspend-static-vA", [["/", "A"], ["/script.min.js?v=20260619-wfinal", "A_JS", "text/javascript"]]);
  const rt = createWorker({
    caches,
    network: async request => {
      if (new URL(request.url).pathname === "/script.min.js") throw new Error("synthetic network failure");
      return new Response("B", { status: 200 });
    }
  });
  await assert.rejects(rt.install());
  assert.equal(rt.state.skipWaiting, 0);
  assert.ok((await caches.keys()).includes("evspend-static-vA"));
  assert.deepEqual((await caches.keys()).filter(name => name !== "evspend-static-vA"), []);
});

test("EVS-051 mehrere Pflichtfehler ergeben keine halbe Generation", async () => {
  const caches = new MemoryCacheStorage();
  await seed(caches, "evspend-static-vA", [["/", "A"]]);
  const failures = new Set(["/script.min.js", "/styles-app.min.css", "/datenschutz"]);
  const rt = createWorker({
    caches,
    network: async request => {
      if (failures.has(new URL(request.url).pathname)) throw new Error("synthetic network failure");
      return new Response("B", { status: 200 });
    }
  });
  await assert.rejects(rt.install());
  assert.deepEqual(await caches.keys(), ["evspend-static-vA"]);
});

test("EVS-051 Pflichtbatch bleibt bis zum vollständigen Erfolg unsichtbar", async () => {
  const caches = new MemoryCacheStorage();
  await seed(caches, "evspend-static-vA", [["/", "A"]]);
  let failScript;
  const rt = createWorker({
    source: versionedSource("vB"),
    caches,
    network: async request => {
      if (new URL(request.url).pathname === "/script.min.js") {
        return new Promise((resolve, reject) => { failScript = reject; });
      }
      return new Response("B", { status: 200 });
    }
  });
  const pendingInstall = rt.install();
  await new Promise(resolve => setImmediate(resolve));
  const preparing = await caches.open("evspend-static-vB");
  assert.equal(preparing.entries.size, 0);
  failScript(new Error("synthetic interrupted batch"));
  await assert.rejects(pendingInstall);
  assert.deepEqual(await caches.keys(), ["evspend-static-vA"]);
});

test("EVS-051 Cache put Fehler lässt die alte Generation unangetastet", async () => {
  const caches = new MemoryCacheStorage({
    failPut: (name, url) => name !== "evspend-static-vA" && url.pathname === "/script.min.js"
  });
  await seed(caches, "evspend-static-vA", [["/", "A"]]);
  const rt = createWorker({ caches });
  await assert.rejects(rt.install());
  assert.deepEqual(await caches.keys(), ["evspend-static-vA"]);
  assert.equal(rt.state.skipWaiting, 0);
});

test("EVS-051 Cache open Fehler aktiviert nichts", async () => {
  const caches = new MemoryCacheStorage({ failOpen: name => name.startsWith("evspend-static-") });
  const rt = createWorker({ caches });
  await assert.rejects(rt.install());
  assert.equal(rt.state.skipWaiting, 0);
  assert.deepEqual(await caches.keys(), []);
});

test("EVS-051 optionale Bildfehler blockieren die vollständige Kernversion nicht", async () => {
  const rt = createWorker({
    network: async request => {
      if (new URL(request.url).pathname === "/banner.webp") throw new Error("synthetic optional failure");
      return new Response("OK", { status: 200 });
    }
  });
  await rt.install();
  assert.equal(rt.state.skipWaiting, 1);
});

test("EVS-051 erneuter Versuch nach Fehler installiert B und entfernt A erst bei activate", async () => {
  const caches = new MemoryCacheStorage();
  await seed(caches, "evspend-static-vA", [["/", "A"], ["/script.min.js?v=20260619-wfinal", "A_JS", "text/javascript"]]);
  const failed = createWorker({
    source: versionedSource("vB"),
    caches,
    network: async request => {
      if (new URL(request.url).pathname === "/script.min.js") throw new Error("synthetic offline");
      return new Response("B", { status: 200 });
    }
  });
  await assert.rejects(failed.install());
  assert.deepEqual(await caches.keys(), ["evspend-static-vA"]);

  const retry = createWorker({ source: versionedSource("vB"), caches });
  await retry.install();
  assert.ok((await caches.keys()).includes("evspend-static-vA"));
  await retry.activate();
  assert.ok(!(await caches.keys()).includes("evspend-static-vA"));
  assert.ok((await caches.keys()).includes("evspend-static-vB"));
});

test("EVS-051 aktiver Worker liest nur seine eigene Cachegeneration", async () => {
  const caches = new MemoryCacheStorage();
  await seed(caches, "evspend-static-vB", [["/script.min.js?v=20260619-wfinal", "PARTIAL_B", "text/javascript"]]);
  await seed(caches, "evspend-static-vA", [["/script.min.js?v=20260619-wfinal", "COMPLETE_A", "text/javascript"]]);
  const rt = createWorker({
    source: versionedSource("vA"),
    caches,
    network: async () => { throw new Error("offline"); }
  });
  const result = await rt.request(`${ORIGIN}/script.min.js?v=20260619-wfinal`);
  assert.equal(await body(result.response), "COMPLETE_A");
  assert.equal(caches.globalMatchCalls, 0);
});

test("EVS-051 activate löscht nur veraltete eigene Generationen", async () => {
  const caches = new MemoryCacheStorage();
  await seed(caches, "evspend-static-vOld", [["/", "OLD"]]);
  await seed(caches, "evspend-runtime-vOld", [["/x", "OLD"]]);
  await seed(caches, "another-app-cache", [["/foreign", "FOREIGN"]]);
  const rt = createWorker({ source: versionedSource("vNew"), caches });
  await rt.install();
  await rt.activate();
  assert.deepEqual((await caches.keys()).sort(), [
    "another-app-cache", "evspend-static-vNew"
  ]);
  assert.equal(rt.state.claimed, 1);
  await rt.activate();
  assert.deepEqual((await caches.keys()).sort(), [
    "another-app-cache", "evspend-static-vNew"
  ]);
});

test("EVS-051 Cleanup Fehler verhindert die Aktivierung der vollständigen Generation nicht", async () => {
  const caches = new MemoryCacheStorage({
    failDelete: name => name === "evspend-static-vOld"
  });
  await seed(caches, "evspend-static-vOld", [["/", "OLD"]]);
  await seed(caches, "evspend-runtime-vOld", [["/old.js", "OLD_JS", "text/javascript"]]);
  const rt = createWorker({ source: versionedSource("vNew"), caches });
  await rt.install();
  await rt.activate();
  assert.equal(rt.state.claimed, 1);
  assert.ok((await caches.keys()).includes("evspend-static-vNew"));
  assert.ok((await caches.keys()).includes("evspend-static-vOld"));
  assert.ok(!(await caches.keys()).includes("evspend-runtime-vOld"));

  caches.failDelete = null;
  await rt.activate();
  assert.ok(!(await caches.keys()).includes("evspend-static-vOld"));
});

const LEGAL_ROUTES = [
  ["/impressum", "de"], ["/datenschutz", "de"], ["/terms", "de"],
  ["/hinweise", "de"], ["/barrierefreiheit", "de"],
  ["/impressum.en", "en"], ["/datenschutz.en", "en"], ["/terms.en", "en"],
  ["/hinweise.en", "en"], ["/barrierefreiheit.en", "en"],
  ["/impressum.tr", "tr"], ["/datenschutz.tr", "tr"], ["/terms.tr", "tr"],
  ["/hinweise.tr", "tr"], ["/barrierefreiheit.tr", "tr"],
  ["/en-eu/impressum", "en"], ["/en-eu/datenschutz", "en"], ["/en-eu/terms", "en"],
  ["/en-eu/hinweise", "en"], ["/en-eu/barrierefreiheit", "en"],
  ["/privacy-policy", "en"]
];

test("EVS-059 Offline Erstaufruf aller ausgelieferten Rechtstexte erklärt die Nichtverfügbarkeit", async () => {
  const rt = createWorker();
  await rt.install();
  rt.setNetwork(async () => { throw new Error("offline"); });
  for (const [route, language] of LEGAL_ROUTES) {
    const result = await rt.request(`${ORIGIN}${route}`, {
      mode: "navigate",
      headers: { Accept: "text/html" }
    });
    assert.equal(result.response.status, 503, route);
    assert.equal(result.response.headers.get("Content-Language"), language, route);
    assert.equal(result.response.headers.get("Cache-Control"), "no-store", route);
    assert.match(result.response.headers.get("Content-Type") || "", /^text\/html/i, route);
    assert.match((await body(result.response)).toLocaleLowerCase("tr"), /offline|çevrimdışı/, route);
  }
});

test("EVS-059 bereits gecachte Rechtstexte bleiben offline ihre eigene Seite", async () => {
  const caches = new MemoryCacheStorage();
  await seed(caches, "evspend-static-vLegal", [["/", "HOME"]]);
  await seed(caches, "evspend-runtime-vLegal", LEGAL_ROUTES.map(([route]) => [route, `CACHED:${route}`]));
  const rt = createWorker({
    source: versionedSource("vLegal"),
    caches,
    network: async () => { throw new Error("offline"); }
  });
  for (const [route] of LEGAL_ROUTES) {
    const result = await rt.request(`${ORIGIN}${route}`, {
      mode: "navigate",
      headers: { Accept: "text/html" }
    });
    assert.equal(result.response.status, 200, route);
    assert.equal(await body(result.response), `CACHED:${route}`, route);
  }
});

test("EVS-059 Offline Shell bleibt für Hauptnavigation und Verlauf verfügbar", async () => {
  const rt = createWorker();
  await rt.install();
  rt.setNetwork(async () => { throw new Error("offline"); });
  for (const [route, cachedRoute] of [
    ["/", "/"], ["/index.html", "/"],
    ["/en-eu/", "/en-eu/"], ["/en-eu/index.html", "/en-eu/"],
    ["/tr/", "/tr/"], ["/tr/index.html", "/tr/"],
    ["/verlauf", "/verlauf"], ["/en-eu/verlauf", "/en-eu/verlauf"],
    ["/tr/verlauf", "/tr/verlauf"]
  ]) {
    const result = await rt.request(`${ORIGIN}${route}`, { mode: "navigate", headers: { Accept: "text/html" } });
    assert.equal(result.response.status, 200, route);
    assert.equal(await body(result.response), `NETWORK:${cachedRoute}`, route);
  }
});

test("EVS-059 Navigationen mit Query bleiben Navigationen", async () => {
  const rt = createWorker();
  await rt.install();
  rt.setNetwork(async () => { throw new Error("offline"); });
  for (const [route, cachedRoute] of [
    ["/?v=1", "/"], ["/verlauf?v=1", "/verlauf"],
    // EVS-050 keeps history parameters on the existing regional destinations.
    ["/en-eu/?id=12345&entryKey=abc&entryIndex=2", "/en-eu/"],
    ["/tr/?id=12345&entryKey=abc&entryIndex=2", "/tr/"],
    ["/en-eu/verlauf?id=12345", "/en-eu/verlauf"],
    ["/tr/verlauf?id=12345", "/tr/verlauf"]
  ]) {
    const result = await rt.request(`${ORIGIN}${route}`, { mode: "navigate", headers: { Accept: "text/html" } });
    assert.equal(result.response.status, 200, route);
    assert.equal(await body(result.response), `NETWORK:${cachedRoute}`, route);
  }
  const legal = await rt.request(`${ORIGIN}/datenschutz?v=1`, { mode: "navigate", headers: { Accept: "text/html" } });
  assert.equal(legal.response.status, 503);
  assert.equal(legal.response.headers.get("Content-Language"), "de");
});

test("EVS-059 fehlende CSS JS Font und Manifest Ressourcen erhalten niemals HTML", async () => {
  const rt = createWorker({ network: async () => { throw new Error("offline"); } });
  for (const route of ["/missing.css", "/missing.js", "/missing.woff2", "/missing.webmanifest"]) {
    const result = await rt.request(`${ORIGIN}${route}`);
    assert.equal(result.intercepted, true, route);
    assert.doesNotMatch(result.response.headers.get("Content-Type") || "", /text\/html/i, route);
    assert.notEqual(await body(result.response), "NETWORK:/", route);
  }
});

test("EVS-059 unbekannte Navigation meldet Offlinezustand statt Rechnerinhalt", async () => {
  const rt = createWorker({ network: async () => { throw new Error("offline"); } });
  for (const [route, phrase, language] of [["/unbekannt", "offline", "de"], ["/en-eu/unavailable", "offline", "en"], ["/tr/yok", "çevrimdışı", "tr"]]) {
    const result = await rt.request(`${ORIGIN}${route}`, { mode: "navigate", headers: { Accept: "text/html" } });
    assert.equal(result.response.status, 503, route);
    assert.match((await body(result.response)).toLocaleLowerCase("tr"), new RegExp(phrase), route);
    assert.equal(result.response.headers.get("Cache-Control"), "no-store", route);
    assert.equal(result.response.headers.get("Content-Language"), language, route);
    assert.match(result.response.headers.get("Content-Type") || "", /^text\/html/i, route);
  }
});

test("EVS-059 fehlgeschlagenes B lässt Rechtstext und Rechner aus A offline verwendbar", async () => {
  const caches = new MemoryCacheStorage();
  await seed(caches, "evspend-static-vA", [
    ["/", "A_HOME"], ["/datenschutz", "A_PRIVACY"],
    ["/script.min.js?v=20260619-wfinal", "A_JS", "text/javascript"]
  ]);
  const failedB = createWorker({
    source: versionedSource("vB"),
    caches,
    network: async request => {
      if (new URL(request.url).pathname === "/script.min.js") throw new Error("offline");
      return new Response("B", { status: 200 });
    }
  });
  await assert.rejects(failedB.install());
  const activeA = createWorker({ source: versionedSource("vA"), caches, network: async () => { throw new Error("offline"); } });
  const privacy = await activeA.request(`${ORIGIN}/datenschutz`, { mode: "navigate", headers: { Accept: "text/html" } });
  const script = await activeA.request(`${ORIGIN}/script.min.js?v=20260619-wfinal`);
  assert.equal(await body(privacy.response), "A_PRIVACY");
  assert.equal(await body(script.response), "A_JS");
});

test("EVS-059 erneuter Onlinebetrieb füllt fehlendes Asset ohne Nutzerdatenzugriff", async () => {
  const rt = createWorker({
    network: async request => new Response(`FRESH:${new URL(request.url).pathname}`, {
      status: 200,
      headers: { "Content-Type": "text/javascript" }
    })
  });
  const online = await rt.request(`${ORIGIN}/extra.js`);
  assert.equal(await body(online.response), "FRESH:/extra.js");
  await Promise.resolve();
  rt.setNetwork(async () => { throw new Error("offline"); });
  const offline = await rt.request(`${ORIGIN}/extra.js`);
  assert.equal(await body(offline.response), "FRESH:/extra.js");
});

test("Navigation Revalidierung bindet den Runtime Schreibvorgang an den Fetch Event", async () => {
  const caches = new MemoryCacheStorage();
  await seed(caches, "evspend-static-vRuntime", [["/", "CACHED_HOME"]]);
  const rt = createWorker({
    source: versionedSource("vRuntime"),
    caches,
    network: async () => new Response("FRESH_HOME", { status: 200, headers: { "Content-Type": "text/html" } })
  });
  const result = await rt.request(`${ORIGIN}/`, { mode: "navigate", headers: { Accept: "text/html" } });
  assert.equal(await body(result.response), "CACHED_HOME");
  assert.equal(rt.state.fetchWaitUntil, 1);
  const runtime = await caches.open("evspend-runtime-vRuntime");
  assert.equal(await body(await runtime.match("/")), "FRESH_HOME");
});

const NAVIGATION = { mode: "navigate", headers: { Accept: "text/html" } };

test("EVS-052 Revalidierung liefert beim Folgeaufruf und offline NEW statt Precache OLD", async () => {
  const caches = new MemoryCacheStorage();
  await seed(caches, "evspend-static-vPriority", [["/", "OLD"]]);
  const rt = createWorker({ source: versionedSource("vPriority"), caches,
    network: async () => new Response("NEW", { headers: { "Content-Type": "text/html" } }) });
  assert.equal(await body((await rt.request(`${ORIGIN}/`, NAVIGATION)).response), "OLD");
  const runtime = await caches.open("evspend-runtime-vPriority");
  assert.equal(await body(await runtime.match("/")), "NEW");
  assert.equal(await body((await rt.request(`${ORIGIN}/`, NAVIGATION)).response), "NEW");
  rt.setNetwork(async () => { throw new Error("offline"); });
  assert.equal(await body((await rt.request(`${ORIGIN}/`, NAVIGATION)).response), "NEW");
  assert.equal(await body(await (await caches.open("evspend-static-vPriority")).match("/")), "OLD");
  assert.equal(rt.state.fetchWaitUntil, 3);
});

test("EVS-052 aktuelle Navigation gewinnt unabhängig von der Cacheanlagereihenfolge", async () => {
  for (const runtimeFirst of [false, true]) {
    const caches = new MemoryCacheStorage();
    const entries = [
      ["evspend-static-vOrder", [["/", "OLD"]]],
      ["evspend-runtime-vOrder", [["/", "CURRENT"]]]
    ];
    for (const [name, values] of runtimeFirst ? entries.toReversed() : entries) await seed(caches, name, values);
    const rt = createWorker({ source: versionedSource("vOrder"), caches,
      network: async () => new Response("NEXT", { headers: { "Content-Type": "text/html" } }) });
    assert.equal(await body((await rt.request(`${ORIGIN}/`, NAVIGATION)).response), "CURRENT");
    assert.equal(await body((await rt.request(`${ORIGIN}/`, NAVIGATION)).response), "NEXT");
    assert.equal(caches.globalMatchCalls, 0);
  }
});

test("EVS-052 regionale Shells direkte HTML Einstiege und Querys revalidieren ihre eigene URL", async () => {
  const routes = ["/", "/verlauf", "/en-eu/", "/tr/", "/en-eu/verlauf", "/tr/verlauf",
    "/verlauf.html", "/en-eu/verlauf.html", "/tr/verlauf.html", "/index.html", "/en-eu/index.html", "/tr/index.html",
    "/en-eu/?id=12345&entryKey=abc&entryIndex=2", "/tr/verlauf?id=12345", "/?v=1"];
  const caches = new MemoryCacheStorage();
  await seed(caches, "evspend-static-vRoutes", routes.map(route => [route, `OLD:${route}`]));
  const rt = createWorker({ source: versionedSource("vRoutes"), caches,
    network: async request => new Response(`NEW:${new URL(request.url).pathname}${new URL(request.url).search}`, { headers: { "Content-Type": "text/html" } }) });
  for (const route of routes) {
    assert.equal(await body((await rt.request(ORIGIN + route, NAVIGATION)).response), `OLD:${route}`);
    assert.equal(await body((await rt.request(ORIGIN + route, NAVIGATION)).response), `NEW:${route}`);
  }
  rt.setNetwork(async () => { throw new Error("offline"); });
  for (const route of routes) assert.equal(await body((await rt.request(ORIGIN + route, NAVIGATION)).response), `NEW:${route}`);
});

test("EVS-052 Netzwerkfehler behält aktuelles Runtime HTML und ignoriert fremde Generationen", async () => {
  const caches = new MemoryCacheStorage();
  await seed(caches, "evspend-runtime-vForeign", [["/", "FOREIGN"]]);
  await seed(caches, "evspend-static-vOffline", [["/", "OLD"]]);
  await seed(caches, "evspend-runtime-vOffline", [["/", "CURRENT"]]);
  const rt = createWorker({ source: versionedSource("vOffline"), caches,
    network: async () => { throw new Error("offline"); } });
  assert.equal(await body((await rt.request(`${ORIGIN}/`, NAVIGATION)).response), "CURRENT");
  assert.equal(caches.globalMatchCalls, 0);
});

test("EVS-052 HTTP Fehler überschreiben weder aktuelles HTML noch den vollständigen Precache", async () => {
  for (const status of [404, 503]) {
    const caches = new MemoryCacheStorage();
    await seed(caches, "evspend-static-vHttp", [["/", "OLD"], ["/verlauf", "COMPLETE"]]);
    await seed(caches, "evspend-runtime-vHttp", [["/", "CURRENT"]]);
    const rt = createWorker({ source: versionedSource("vHttp"), caches,
      network: async () => new Response("HTTP_ERROR", { status }) });
    assert.equal(await body((await rt.request(`${ORIGIN}/`, NAVIGATION)).response), "CURRENT");
    assert.equal(await body((await rt.request(`${ORIGIN}/verlauf`, NAVIGATION)).response), "COMPLETE");
    assert.equal(await body(await (await caches.open("evspend-runtime-vHttp")).match("/")), "CURRENT");
    assert.equal(await (await caches.open("evspend-runtime-vHttp")).match("/verlauf"), undefined);
  }
});

test("EVS-052 nicht gecachte Navigation hält HTTP Fehler getrennt von Offline 503 und erholt sich online", async () => {
  const rt = createWorker({ network: async () => new Response("HTTP_NOT_FOUND", { status: 404 }) });
  const missing = await rt.request(`${ORIGIN}/en-eu/new-page`, NAVIGATION);
  assert.equal(missing.response.status, 404);
  assert.equal(await body(missing.response), "HTTP_NOT_FOUND");
  rt.setNetwork(async () => { throw new Error("offline"); });
  const offline = await rt.request(`${ORIGIN}/en-eu/new-page`, NAVIGATION);
  assert.equal(offline.response.status, 503);
  assert.equal(offline.response.headers.get("Content-Language"), "en");
  rt.setNetwork(async () => new Response("RECOVERED", { headers: { "Content-Type": "text/html" } }));
  assert.equal(await body((await rt.request(`${ORIGIN}/en-eu/new-page`, NAVIGATION)).response), "RECOVERED");
  rt.setNetwork(async () => { throw new Error("offline"); });
  assert.equal(await body((await rt.request(`${ORIGIN}/en-eu/new-page`, NAVIGATION)).response), "RECOVERED");
});

test("EVS-052 statische Assets behalten die Static vor Runtime Cachepriorität", async () => {
  const routes = ["/script.min.js?v=20260619-wfinal", "/styles-app.min.css?v=20260601-audit-fix-2",
    "/extra.js", "/extra.css", "/favicon.ico", "/fonts/InterVariable.woff2", "/site.webmanifest"];
  const caches = new MemoryCacheStorage();
  for (const name of ["evspend-static-vAsset", "evspend-runtime-vAsset"]) {
    await seed(caches, name, routes.map(route => [route, name.includes("static") ? "STATIC_ASSET" : "RUNTIME_ASSET", contentType(new URL(route, ORIGIN))]));
  }
  const rt = createWorker({ source: versionedSource("vAsset"), caches,
    network: async () => { throw new Error("asset cache hit must not fetch"); } });
  for (const route of routes) assert.equal(await body((await rt.request(ORIGIN + route)).response), "STATIC_ASSET");
  assert.equal(rt.fetchCalls.length, 0);
});

test("EVS-052 Offline Alias und Queryfallback bevorzugt das aktualisierte passende HTML", async () => {
  const caches = new MemoryCacheStorage();
  const routes = ["/", "/verlauf", "/en-eu/", "/tr/", "/en-eu/verlauf", "/tr/verlauf"];
  await seed(caches, "evspend-static-vFallback", routes.map(route => [route, `OLD:${route}`]));
  await seed(caches, "evspend-runtime-vFallback", routes.map(route => [route, `NEW:${route}`]));
  const rt = createWorker({ source: versionedSource("vFallback"), caches,
    network: async () => { throw new Error("offline"); } });
  for (const [route, target] of [
    ["/?id=12345", "/"], ["/index.html", "/"], ["/verlauf?id=12345", "/verlauf"],
    ["/en-eu/?id=12345&entryKey=abc&entryIndex=2", "/en-eu/"], ["/tr/?id=12345", "/tr/"],
    ["/en-eu/index.html", "/en-eu/"], ["/tr/index.html", "/tr/"],
    ["/en-eu/verlauf?id=12345", "/en-eu/verlauf"], ["/tr/verlauf?id=12345", "/tr/verlauf"]
  ]) assert.equal(await body((await rt.request(ORIGIN + route, NAVIGATION)).response), `NEW:${target}`);
  await seed(caches, "evspend-runtime-vFallback", [["/?id=one", "ONE"], ["/?id=two", "TWO"]]);
  assert.equal(await body((await rt.request(`${ORIGIN}/?id=one`, NAVIGATION)).response), "ONE");
  assert.equal(await body((await rt.request(`${ORIGIN}/?id=two`, NAVIGATION)).response), "TWO");
});

test("EVS-052 Cachelesefehler lässt den anderen aktuellen Cache weiterhin als Reserve zu", async () => {
  for (const failing of ["static", "runtime"]) {
    const caches = new MemoryCacheStorage();
    await seed(caches, "evspend-static-vRead", [["/", "STATIC"]]);
    await seed(caches, "evspend-runtime-vRead", [["/", "RUNTIME"]]);
    caches.failOpen = name => name === `evspend-${failing}-vRead`;
    const rt = createWorker({ source: versionedSource("vRead"), caches,
      network: async () => { throw new Error("offline"); } });
    assert.equal(await body((await rt.request(`${ORIGIN}/`, NAVIGATION)).response), failing === "static" ? "RUNTIME" : "STATIC");
  }
});

test("EVS-052 fehlgeschlagenes Update erhält A einschließlich seines aktualisierten HTML", async () => {
  const caches = new MemoryCacheStorage();
  const a = createWorker({ source: versionedSource("vA"), caches });
  await a.install();
  await seed(caches, "evspend-runtime-vA", [["/", "CURRENT_A"]]);
  const b = createWorker({ source: versionedSource("vB"), caches,
    network: async request => {
      if (new URL(request.url).pathname === "/script.min.js") throw new Error("update failed");
      return new Response("B");
    } });
  await assert.rejects(b.install());
  assert.equal(b.state.skipWaiting, 0);
  assert.ok((await caches.keys()).includes("evspend-static-vA"));
  a.setNetwork(async () => { throw new Error("offline"); });
  assert.equal(await body((await a.request(`${ORIGIN}/`, NAVIGATION)).response), "CURRENT_A");
  assert.equal(await body((await a.request(`${ORIGIN}/script.min.js?v=20260619-wfinal`)).response), "NETWORK:/script.min.js");
});

test("EVS-052 erfolgreiche neue Generation benutzt B und revalidiert nur innerhalb B", async () => {
  const caches = new MemoryCacheStorage();
  await seed(caches, "evspend-runtime-vA", [["/", "OLD_A"]]);
  const b = createWorker({ source: versionedSource("vB"), caches,
    network: async () => new Response("B_BUILD", { headers: { "Content-Type": "text/html" } }) });
  await b.install();
  await b.activate();
  assert.ok(!(await caches.keys()).includes("evspend-runtime-vA"));
  b.setNetwork(async () => new Response("B_UPDATED", { headers: { "Content-Type": "text/html" } }));
  assert.equal(await body((await b.request(`${ORIGIN}/`, NAVIGATION)).response), "B_BUILD");
  assert.equal(await body((await b.request(`${ORIGIN}/`, NAVIGATION)).response), "B_UPDATED");
  b.setNetwork(async () => { throw new Error("offline"); });
  assert.equal(await body((await b.request(`${ORIGIN}/`, NAVIGATION)).response), "B_UPDATED");
});

test("EVS-052 besuchte Rechtstexte revalidieren ohne andere Sprachseiten als Fallback", async () => {
  const rt = createWorker();
  const routes = ["/datenschutz", "/datenschutz.en", "/datenschutz.tr", "/en-eu/datenschutz", "/privacy-policy"];
  rt.setNetwork(async request => new Response(`FIRST:${new URL(request.url).pathname}`, { headers: { "Content-Type": "text/html" } }));
  for (const route of routes) assert.equal(await body((await rt.request(ORIGIN + route, NAVIGATION)).response), `FIRST:${route}`);
  rt.setNetwork(async request => new Response(`UPDATED:${new URL(request.url).pathname}`, { headers: { "Content-Type": "text/html" } }));
  for (const route of routes) assert.equal(await body((await rt.request(ORIGIN + route, NAVIGATION)).response), `FIRST:${route}`);
  rt.setNetwork(async () => { throw new Error("offline"); });
  for (const route of routes) assert.equal(await body((await rt.request(ORIGIN + route, NAVIGATION)).response), `UPDATED:${route}`);
});

test("Service Worker lässt POST Range no-store und fremde Origins unangetastet", async () => {
  const rt = createWorker();
  for (const [url, init] of [
    [`${ORIGIN}/api`, { method: "POST" }],
    [`${ORIGIN}/video`, { headers: { Range: "bytes=0-10" } }],
    [`${ORIGIN}/live.js`, { cache: "no-store" }],
    ["https://example.org/file.js", {}]
  ]) {
    const result = await rt.request(url, init);
    assert.equal(result.intercepted, false, url);
  }
});

test("Service Worker greift nicht auf EVSpend Nutzerdaten zu", async () => {
  const rt = createWorker();
  await rt.install();
  await rt.activate();
  await rt.request(`${ORIGIN}/extra.js`);
  assert.equal(rt.state.storageAccesses, 0);
  assert.doesNotMatch(SW_SOURCE, /localStorage|sessionStorage|indexedDB/);
});

test("Precache Liste ist eindeutig und verweist auf vorhandene Produktionsdateien", () => {
  const listeners = new Map();
  const self = {
    location: new URL(`${ORIGIN}/sw.js`),
    addEventListener(type, handler) { listeners.set(type, handler); },
    clients: { claim() {} }, skipWaiting() {}
  };
  const context = vm.createContext({ self, caches: {}, fetch() {}, Request: TestRequest, Response, URL, Promise, console });
  vm.runInContext(`${SW_SOURCE}\nself.__precache = {required: REQUIRED_PRECACHE_URLS, optional: OPTIONAL_PRECACHE_URLS};`, context);
  const required = [...self.__precache.required];
  const optional = [...self.__precache.optional];
  const all = [...required, ...optional];
  assert.equal(new Set(all).size, all.length);

  function sourceFile(urlValue) {
    const pathname = new URL(urlValue, ORIGIN).pathname;
    if (pathname === "/") return "index.html";
    if (pathname === "/en-eu/" || pathname === "/tr/") return `${pathname.slice(1)}index.html`;
    const rel = pathname.slice(1);
    if (path.extname(rel)) {
      if (/\.(?:en|tr)$/.test(rel)) return `${rel}.html`;
      return rel;
    }
    return `${rel}.html`;
  }
  for (const asset of all) {
    assert.ok(fs.existsSync(path.join(ROOT, sourceFile(asset))), asset);
  }
  for (const [route] of LEGAL_ROUTES) {
    assert.ok(!all.includes(route), route);
    assert.ok(fs.existsSync(path.join(ROOT, sourceFile(route))), route);
  }
  for (const asset of [
    "/history-store.js?v=20260927-h1", "/script.min.js?v=20260619-wfinal", "/verlauf.min.js?v=20260619-wfinal",
    "/styles-app.min.css?v=20260601-audit-fix-2", "/theme-init.js?v=20260619-wfinal",
    "/vendor/chart-4.4.6.umd.js", "/fonts/InterVariable.woff2"
  ]) assert.ok(required.includes(asset), asset);
  for (const asset of [
    "/styles-pages.min.css?v=20260501-legal3", "/lang-switch.js?v=20260501-legal3",
    "/fonts/InterVariable-Italic.woff2", "/favicon-16x16.png", "/favicon.ico"
  ]) assert.ok(optional.includes(asset), asset);
});

test("EVS-053 license navigation returns original text and preserves it offline", async () => {
  const license = fs.readFileSync(path.join(ROOT, "LICENSES.md"), "utf8");
  const rt = createWorker({ network: async () => new Response(license, { headers: { "Content-Type": "text/markdown; charset=utf-8" } }) });
  const online = await rt.request('/LICENSES.md', { mode: 'navigate', headers: { Accept: 'text/html' } });
  assert.equal(online.response.status, 200);
  assert.equal(await body(online.response), license);
  rt.setNetwork(async () => { throw new Error('offline'); });
  const offline = await rt.request('/LICENSES.md', { mode: 'navigate', headers: { Accept: 'text/html' } });
  assert.equal(await body(offline.response), license);
  assert.match(offline.response.headers.get('Content-Type'), /text\/markdown/);
});

test("EVS-053 uncached offline license path never substitutes calculator HTML", async () => {
  const rt = createWorker({ network: async () => { throw new Error('offline'); } });
  await seed(rt.caches, 'evspend-static-' + SW_SOURCE.match(/const CACHE_VERSION\s*=\s*'([^']+)'/)[1], [['/', 'SYNTHETIC CALCULATOR']]);
  const result = await rt.request('/LICENSES.md', { mode: 'navigate', headers: { Accept: 'text/html' } });
  assert.equal(result.response.status, 503);
  assert.equal(result.response.headers.get('Cache-Control'), 'no-store');
  assert.doesNotMatch(await body(result.response), /SYNTHETIC CALCULATOR/);
});
