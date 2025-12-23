/**
 * Test setup file for Vitest
 * Provides localStorage mock for jsdom environment
 */

// Create a localStorage mock if not available
if (typeof localStorage === 'undefined' || !localStorage.setItem) {
  const store = new Map();
  
  global.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (index) => Array.from(store.keys())[index] ?? null,
  };
}
