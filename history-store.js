/* Shared history commit boundary for calculator, history and same-origin tabs. */
(function () {
  "use strict";
  const KEY = "eautofakten_history", LEGACY_KEY = "eaf.history.v1";
  const LOCK = "evspend:history:v1", MAX_PENDING = 64;
  let pending = 0, inCriticalSection = false;
  function failure(code) { const error = new Error(code); error.code = code; return error; }
  function plain(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value)
      && Object.prototype.toString.call(value) === "[object Object]";
  }
  function read() {
    const entries = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(entries) || !entries.every(plain)) throw failure("HISTORY_INVALID_STORAGE");
    return entries;
  }
  async function exclusive(operation) {
    if (window.isSecureContext === false || !navigator.locks || typeof navigator.locks.request !== "function") {
      throw failure("HISTORY_COORDINATION_UNAVAILABLE");
    }
    if (pending >= MAX_PENDING) throw failure("HISTORY_QUEUE_FULL");
    pending++;
    try {
      return await navigator.locks.request(LOCK, {mode: "exclusive"}, () => {
        inCriticalSection = true;
        try { return operation(); }
        finally { inCriticalSection = false; }
      });
    }
    finally { pending--; }
  }
  function commit(entries) {
    if (!Array.isArray(entries) || !entries.every(plain) || entries.length > 50) {
      throw failure("HISTORY_INVALID_MUTATION");
    }
    localStorage.setItem(KEY, JSON.stringify(entries));
  }
  window.EAF_HISTORY = Object.freeze({
    mutate(transform) {
      if (inCriticalSection) throw failure("HISTORY_REENTRANT_MUTATION");
      return exclusive(() => {
        // No await between this fresh read and commit. All writers use this lock.
        const change = transform(read());
        if (!change || typeof change.then === "function") throw failure("HISTORY_INVALID_MUTATION");
        if (change.write !== false) commit(change.entries);
        return change.result;
      });
    },
    migrate(mapper) {
      if (inCriticalSection) throw failure("HISTORY_REENTRANT_MUTATION");
      return exclusive(() => {
        if (read().length) return;
        const old = localStorage.getItem(LEGACY_KEY);
        if (!old) return;
        const legacy = JSON.parse(old);
        if (!Array.isArray(legacy)) throw failure("HISTORY_INVALID_STORAGE");
        if (legacy.length) commit(legacy.map(mapper).slice(0, 50));
        // A cleanup error must never roll back the committed new history.
        try { localStorage.removeItem(LEGACY_KEY); } catch (_) {}
      });
    }
  });
})();
