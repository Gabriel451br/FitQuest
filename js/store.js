// Estado global persistido em localStorage. Fotos ficam no IndexedDB (photos.js).
import { useEffect, useState } from './lib.js';
import { setCustomFoods } from './foods.js';
import { emptyState, migrate } from './selectors.js';

export * from './selectors.js';

const KEY = 'fitquest.v2';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    return migrate(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

let state = load();
setCustomFoods(state.customFoods);
const subs = new Set();
let saveTimer = null;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Falha ao salvar', e);
    }
  }, 150);
}

export function getState() {
  return state;
}

// Mutação por rascunho: recebe uma cópia profunda, retorna novo estado imutável.
export function update(fn) {
  const draft = structuredClone(state);
  fn(draft);
  state = draft;
  setCustomFoods(state.customFoods);
  persist();
  subs.forEach((s) => s(state));
}

export function replaceState(next) {
  state = migrate(next);
  setCustomFoods(state.customFoods);
  persist();
  subs.forEach((s) => s(state));
}

export function useStore() {
  const [s, set] = useState(state);
  useEffect(() => {
    subs.add(set);
    set(state);
    return () => subs.delete(set);
  }, []);
  return s;
}
