// Utilitários de data, ids e formatação (puros).

const pad = (n) => String(n).padStart(2, '0');

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function diffDays(a, b) {
  return Math.round((parseKey(a) - parseKey(b)) / 86400000);
}

// Semana começa na segunda-feira.
export function weekStart(key) {
  const d = parseKey(key);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return dateKey(d);
}

export function weekDays(key) {
  const s = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function weekdayShort(key) {
  return WEEKDAYS[parseKey(key).getDay()];
}

export function fmtDate(key, opts = {}) {
  const d = parseKey(key);
  const base = `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
  return opts.year ? `${base} ${d.getFullYear()}` : base;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function num(v, d = 0) {
  if (v == null || v === '' || !Number.isFinite(Number(v))) return '—';
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function toNum(v) {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
