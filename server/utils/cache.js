/**
 * Simple in-memory TTL cache shared across server services.
 * Returns a { getCached, setCached, clearAll } object bound to its own store.
 */
const TTL = 5 * 60 * 1000; // 5 minutes

function makeCache() {
  const store = {};
  return {
    get(key) {
      const e = store[key];
      if (!e) return null;
      if (Date.now() - e.at > TTL) { delete store[key]; return null; }
      return e.v;
    },
    set(key, v) { store[key] = { v, at: Date.now() }; },
    clearAll()  { Object.keys(store).forEach(k => delete store[k]); },
  };
}

module.exports = { makeCache };
