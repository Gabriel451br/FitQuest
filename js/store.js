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

let dirty = false;

function flush() {
  clearTimeout(saveTimer);
  if (!dirty) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    dirty = false;
  } catch (e) {
    console.error('Falha ao salvar', e);
  }
}

function persist() {
  dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 150);
}

// Grava na hora se o app for fechado/minimizado antes do debounce.
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());

// Pede ao navegador armazenamento persistente (não é apagado sob pouco espaço).
export async function requestPersistence() {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}
requestPersistence();

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
