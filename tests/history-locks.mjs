import assert from "node:assert/strict";

export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function createLockManager() {
  const queues = new Map();
  const activeNames = new Set();
  const idleWaiters = new Set();
  const events = [];

  function pendingCount() {
    let count = activeNames.size;
    for (const queue of queues.values()) count += queue.length;
    return count;
  }

  function resolveIdleWaiters() {
    if (pendingCount() !== 0) return;
    for (const resolve of idleWaiters) resolve();
    idleWaiters.clear();
  }

  function drain(name) {
    if (activeNames.has(name)) return;
    const queue = queues.get(name);
    if (!queue || queue.length === 0) {
      queues.delete(name);
      resolveIdleWaiters();
      return;
    }

    const job = queue.shift();
    activeNames.add(name);
    events.push({ type: "granted", name, ticket: job.ticket });

    Promise.resolve()
      .then(() => job.callback({ name, mode: "exclusive" }))
      .then(job.resolve, job.reject)
      .finally(() => {
        events.push({ type: "released", name, ticket: job.ticket });
        activeNames.delete(name);
        drain(name);
      });
  }

  let nextTicket = 1;
  function request(name, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    options ||= {};
    assert.equal(typeof name, "string");
    assert.ok(name.length > 0);
    assert.equal(typeof callback, "function");
    assert.equal(options.mode ?? "exclusive", "exclusive");
    assert.equal(options.ifAvailable, undefined);
    assert.equal(options.steal, undefined);

    const ticket = nextTicket++;
    events.push({ type: "requested", name, ticket });
    const promise = new Promise((resolve, reject) => {
      const queue = queues.get(name) || [];
      queue.push({ callback, resolve, reject, ticket });
      queues.set(name, queue);
    });
    queueMicrotask(() => drain(name));
    return promise;
  }

  function idle() {
    if (pendingCount() === 0) return Promise.resolve();
    return new Promise(resolve => idleWaiters.add(resolve));
  }

  return {
    request,
    idle,
    events,
    get pending() { return pendingCount(); },
  };
}
