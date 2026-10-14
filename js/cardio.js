// Atividades aeróbicas/esportivas: definição de métricas, cálculos e recordes (puro).
import { finishedSessions } from './selectors.js';
import { weekStart } from './util.js';

// fields: quais métricas o formulário mostra. rate: 'pace' (min/km ou /100m) ou 'speed' (km/h).
// kcalKm: kcal por kg por km (atividades de deslocamento); met: equivalente metabólico por tempo.
export const ACTIVITIES = {
  strength: { label: 'Musculação', short: 'Muscul.', icon: 'train' },
  run: { label: 'Corrida', short: 'Corrida', icon: 'run', fields: ['distance', 'duration', 'hr', 'elevation', 'cadence'], rate: 'pace', kcalKm: 1.0, met: 9.8, kinds: ['Rodagem', 'Intervalado', 'Fartlek', 'Longão', 'Ritmo', 'Progressivo', 'Regenerativo', 'Prova', 'Esteira'], minPrKm: 1 },
  walk: { label: 'Caminhada', short: 'Caminh.', icon: 'walk', fields: ['distance', 'duration', 'hr', 'elevation'], rate: 'pace', kcalKm: 0.55, met: 3.8, kinds: ['Leve', 'Rápida', 'Trilha', 'Esteira', 'Intervalado', 'Longão', 'Regenerativo'], minPrKm: 1 },
  bike: { label: 'Ciclismo', short: 'Bike', icon: 'bike', fields: ['distance', 'duration', 'hr', 'elevation', 'cadence'], rate: 'speed', met: 8, kinds: ['Estrada', 'MTB', 'Indoor', 'Intervalado', 'Longão', 'Ritmo', 'Progressivo', 'Regenerativo'], minPrKm: 5 },
  swim: { label: 'Natação', short: 'Natação', icon: 'swim', fields: ['distance', 'duration', 'hr'], rate: 'pace100', met: 7, kinds: ['Livre', 'Técnica', 'Intervalado', 'Águas abertas'], meters: true, minPrKm: 0.4 },
  hiit: { label: 'HIIT / Funcional', short: 'HIIT', icon: 'bolt', fields: ['duration', 'rounds', 'hr'], met: 8, kinds: ['HIIT', 'Funcional', 'Crossfit', 'Circuito', 'Tabata'] },
  sport: { label: 'Esportes', short: 'Esporte', icon: 'ball', fields: ['duration', 'hr'], met: 7, kinds: ['Futebol', 'Basquete', 'Vôlei', 'Tênis', 'Lutas', 'Beach tennis'] },
  other: { label: 'Outro', short: 'Outro', icon: 'dots', fields: ['duration', 'hr'], met: 5, kinds: ['Yoga', 'Pilates', 'Mobilidade', 'Dança', 'Alongamento'] },
};

export const CARDIO_TYPES = Object.keys(ACTIVITIES).filter((k) => k !== 'strength');

export const sessionType = (x) => x?.type ?? 'strength';
export const isCardio = (x) => sessionType(x) !== 'strength';

// --- Formatação de tempo -------------------------------------------------------

export function fmtDuration(sec) {
  if (sec == null || !Number.isFinite(sec)) return '—';
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
}

// "45" = 45 min; "45:30" = 45min30s; "1:02:03" = 1h02m03s
export function parseDuration(str) {
  if (str == null || str === '') return null;
  const parts = String(str).trim().split(':').map((x) => Number(x.replace(',', '.')));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 1) return Math.round(parts[0] * 60);
  if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
  if (parts.length === 3) return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  return null;
}

// --- Métricas -------------------------------------------------------------------------

export function paceSecPerKm(km, sec) {
  return km > 0 && sec > 0 ? sec / km : null;
}

export function speedKmh(km, sec) {
  return km > 0 && sec > 0 ? km / (sec / 3600) : null;
}

// Texto da métrica de ritmo adequada à atividade.
export function rateText(type, km, sec) {
  const a = ACTIVITIES[type];
  if (!a?.rate) return null;
  if (a.rate === 'speed') {
    const v = speedKmh(km, sec);
    return v ? `${v.toFixed(1).replace('.', ',')} km/h` : null;
  }
  if (a.rate === 'pace100') {
    const p = paceSecPerKm(km, sec);
    return p ? `${fmtDuration(p / 10)} /100m` : null;
  }
  const p = paceSecPerKm(km, sec);
  return p ? `${fmtDuration(p)} /km` : null;
}

// kcal: por distância (corrida/caminhada, ~independente do ritmo) ou MET × kg × horas.
export function estimateKcal(type, { distance, duration } = {}, kg = 75) {
  const a = ACTIVITIES[type];
  if (!a || type === 'strength') return null;
  if (a.kcalKm && distance > 0) return Math.round(a.kcalKm * kg * distance);
  if (duration > 0) return Math.round(a.met * kg * (duration / 3600));
  return null;
}

// --- Agregados -------------------------------------------------------------------------

export function cardioSessions(s, type) {
  return finishedSessions(s).filter((x) => (type ? sessionType(x) === type : isCardio(x)));
}

export function cardioTotals(list) {
  let km = 0;
  let sec = 0;
  for (const x of list) {
    km += Number(x.cardio?.distance) || 0;
    sec += Number(x.cardio?.duration) || 0;
  }
  return { count: list.length, km, sec };
}

export function cardioWeek(s, type, anyDay) {
  const ws = weekStart(anyDay);
  return cardioTotals(cardioSessions(s, type).filter((x) => weekStart(x.date) === ws));
}

// Recordes: maior distância e melhor ritmo (pace menor ou velocidade maior) por atividade.
// Primeira sessão de cada tipo não conta como PR (precisa superar algo).
export function cardioPRs(s) {
  const best = {};
  const prs = [];
  for (const ses of finishedSessions(s)) {
    const type = sessionType(ses);
    const a = ACTIVITIES[type];
    if (type === 'strength' || !a?.rate) continue;
    const km = Number(ses.cardio?.distance) || 0;
    const sec = Number(ses.cardio?.duration) || 0;
    if (km > 0) {
      const k = `${type}:dist`;
      if (best[k] != null && km > best[k]) prs.push({ sessionId: ses.id, date: ses.date, exId: k, kind: 'dist', type, value: km, prev: best[k] });
      best[k] = Math.max(best[k] ?? 0, km);
    }
    if (km >= (a.minPrKm ?? 1) && sec > 0) {
      const k = `${type}:rate`;
      const v = a.rate === 'speed' ? speedKmh(km, sec) : -paceSecPerKm(km, sec); // maior é melhor
      if (best[k] != null && v > best[k]) prs.push({ sessionId: ses.id, date: ses.date, exId: k, kind: 'rate', type, value: Math.abs(v), prev: Math.abs(best[k]) });
      best[k] = Math.max(best[k] ?? -Infinity, v);
    }
  }
  return prs;
}

export function cardioRecords(s, type) {
  const a = ACTIVITIES[type];
  const list = cardioSessions(s, type);
  let longest = null;
  let fastest = null;
  let longestTime = null;
  for (const x of list) {
    const km = Number(x.cardio?.distance) || 0;
    const sec = Number(x.cardio?.duration) || 0;
    if (km > 0 && (!longest || km > longest.km)) longest = { km, date: x.date };
    if (sec > 0 && (!longestTime || sec > longestTime.sec)) longestTime = { sec, date: x.date };
    if (a?.rate && km >= (a.minPrKm ?? 1) && sec > 0) {
      const v = a.rate === 'speed' ? speedKmh(km, sec) : paceSecPerKm(km, sec);
      const better = !fastest || (a.rate === 'speed' ? v > fastest.v : v < fastest.v);
      if (better) fastest = { v, km, sec, date: x.date };
    }
  }
  return { longest, fastest, longestTime };
}
