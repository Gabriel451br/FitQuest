// GPS ao vivo: acompanha a atividade ativa (corrida, caminhada, bike) enquanto ela durar,
// em qualquer tela do app. Pontos ficam no aparelho (localStorage) até a atividade terminar,
// assim um recarregamento do app no meio do treino não perde o percurso.
import { useEffect, useState } from './lib.js';
import { getState, subscribe } from './store.js';
import { createTrack, addFix, breakTrack, GPS_TYPES } from './gps.js';
import { sessionType } from './cardio.js';

const KEY = 'fitquest.track';
let cur = null; // { sesId, type, track, watchId, status }
const subs = new Set();
const notify = () => subs.forEach((f) => f());

export const gpsSupported = () => typeof navigator !== 'undefined' && !!navigator.geolocation;

export function activeCardio(s = getState()) {
  const ses = s.sessions?.find((x) => x.id === s.activeSessionId && !x.finishedAt);
  return ses && GPS_TYPES.includes(sessionType(ses)) ? ses : null;
}

export function elapsedOf(ses, now = Date.now()) {
  return Math.max(0, ((ses.pausedAt ?? now) - ses.startedAt - (ses.pausedMs || 0)) / 1000);
}

function load(sesId) {
  try {
    const j = JSON.parse(localStorage.getItem(KEY));
    if (j?.sesId === sesId && j.track) return j.track;
  } catch { /* vazio */ }
  return null;
}

let savedAt = 0;
function save(force = false) {
  if (!cur) return;
  const now = Date.now();
  if (!force && now - savedAt < 3000) return;
  savedAt = now;
  try { localStorage.setItem(KEY, JSON.stringify({ sesId: cur.sesId, track: cur.track })); } catch { /* cheio */ }
}

function onFix(pos) {
  if (!cur) return;
  const ses = getState().sessions.find((x) => x.id === cur.sesId);
  if (!ses || ses.finishedAt) return;
  if (ses.pausedAt) {
    breakTrack(cur.track);
    cur.status = 'paused';
    return notify();
  }
  const c = pos.coords;
  const r = addFix(cur.track, {
    lat: c.latitude, lon: c.longitude, acc: c.accuracy, alt: c.altitude, altAcc: c.altitudeAccuracy, t: pos.timestamp || Date.now(),
  }, { type: cur.type, elapsed: elapsedOf(ses) });
  cur.status = r === 'noise' ? 'weak' : 'ok';
  save();
  notify();
}

function onError(err) {
  if (!cur) return;
  cur.status = err.code === 1 ? 'denied' : 'searching';
  notify();
}

function start(ses) {
  const type = sessionType(ses);
  cur = { sesId: ses.id, type, track: load(ses.id) ?? createTrack(), watchId: null, status: 'searching' };
  if (!gpsSupported()) {
    cur.status = 'unsupported';
    return notify();
  }
  cur.watchId = navigator.geolocation.watchPosition(onFix, onError, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
  notify();
}

function stopWatch() {
  if (cur?.watchId != null) navigator.geolocation.clearWatch(cur.watchId);
  if (cur) cur.watchId = null;
}

// Liga/desliga conforme a sessão ativa e a chave "GPS" dela.
function sync(s) {
  const ses = activeCardio(s);
  const want = ses && ses.cardio?.gps;
  if (want && (!cur || cur.sesId !== ses.id || cur.watchId == null && cur.status !== 'unsupported')) {
    if (cur && cur.sesId !== ses.id) stopWatch();
    if (cur?.sesId === ses.id) {
      // religado depois de desligar: retoma o mesmo percurso, sem somar o trecho sem GPS
      breakTrack(cur.track);
      cur.status = 'searching';
      if (gpsSupported()) cur.watchId = navigator.geolocation.watchPosition(onFix, onError, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
      notify();
    } else {
      start(ses);
    }
  } else if (!want && cur?.watchId != null) {
    stopWatch();
    save(true);
    if (!ses) cur = null;
    notify();
  }
  // pausar quebra o trecho na hora (sem esperar a próxima leitura)
  if (ses?.pausedAt && cur?.sesId === ses.id) breakTrack(cur.track);
}

if (typeof window !== 'undefined') {
  subscribe(sync);
  setTimeout(() => sync(getState()), 0);
}

export function gpsFor(sesId) {
  if (cur?.sesId === sesId) return cur;
  const t = load(sesId);
  return t ? { sesId, track: t, status: 'off' } : null;
}

// Entrega o percurso ao finalizar e limpa o armazenamento temporário.
export function takeTrack(sesId) {
  const g = gpsFor(sesId);
  if (cur?.sesId === sesId) { stopWatch(); cur = null; }
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  notify();
  return g?.track ?? null;
}

export function useGps(sesId) {
  const [, set] = useState(0);
  useEffect(() => {
    const f = () => set((n) => n + 1);
    subs.add(f);
    return () => subs.delete(f);
  }, []);
  return gpsFor(sesId);
}
