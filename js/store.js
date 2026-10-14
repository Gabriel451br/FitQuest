// Estado global. Cache local por usuário (localStorage) + sincronização com a nuvem (cloud.js).
// Fotos ficam no IndexedDB e no Storage do Supabase (photos.js).
import { useEffect, useState } from './lib.js';
import { setCustomFoods } from './foods.js';
import { emptyState, migrate } from './selectors.js';

export * from './selectors.js';

// Chave sem usuário: modo local (sem nuvem configurada) e dados antigos a migrar.
export const LEGACY_KEY = 'fitquest.v2';
let KEY = LEGACY_KEY;

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

let state = read(KEY) ?? emptyState();
setCustomFoods(state.customFoods);
const subs = new Set();
const changeHooks = new Set();
let saveTimer = null;
let dirty = false;
// Incrementa quando o estado é trocado em bloco (nuvem, conta, importação):
// a UI usa isso para não comemorar XP que não foi ganho agora.
let epoch = 0;
export const getEpoch = () => epoch;

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

function emit() {
  setCustomFoods(state.customFoods);
  subs.forEach((s) => s(state));
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

// Notificado a cada mudança local (usado para enviar à nuvem).
export function onLocalChange(fn) {
  changeHooks.add(fn);
  return () => changeHooks.delete(fn);
}

// Mutação por rascunho: recebe uma cópia profunda, retorna novo estado imutável.
export function update(fn) {
  const draft = structuredClone(state);
  fn(draft);
  draft.updatedAt = Date.now();
  state = draft;
  persist();
  emit();
  changeHooks.forEach((h) => h(state));
}

// Substitui tudo. fromCloud=true não reenvia para a nuvem (evita eco).
export function replaceState(next, { fromCloud = false } = {}) {
  epoch++;
  state = migrate(next);
  if (!fromCloud) state.updatedAt = Date.now();
  persist();
  flush();
  emit();
  if (!fromCloud) changeHooks.forEach((h) => h(state));
}

// Troca para o cache local de um usuário. Na primeira vez, adota os dados
// que já existiam no aparelho (modo sem login) para não perder nada.
export function switchAccount(userId) {
  flush();
  KEY = userId ? `${LEGACY_KEY}:${userId}` : LEGACY_KEY;
  let next = read(KEY);
  let adoptedLegacy = false;
  if (!next && userId) {
    const legacy = read(LEGACY_KEY);
    if (legacy?.profile) {
      next = legacy;
      adoptedLegacy = true;
      // dados passam a pertencer a esta conta; outra conta no aparelho não os herda
      try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
    }
  }
  epoch++;
  state = next ?? emptyState();
  dirty = true;
  flush();
  emit();
  return { adoptedLegacy };
}

// Assinatura fora de componentes (ex.: GPS acompanha a sessão ativa).
export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
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
