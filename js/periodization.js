// Prescrição de cargas por %RM e RPE (puro, sem navegador).
// Esquemas:
//  pct   — percentual linear: % do 1RM que sobe X% por semana (padrão +2,5%), com grupos
//          de séries (top sets, AMRAP, back-off, cluster, speed). Ex.: 2×5 @65% + 3×AMRAP @60%.
//  w531  — 5/3/1 (Wendler): training max = 90% do 1RM; semanas 5s / 3s / 5-3-1 / deload,
//          última série AMRAP; suplementar FSL (5×5) ou BBB (5×10 @50%).
//  jugg  — Juggernaut: ondas de 10s, 8s, 5s ou 3s; acumulação → intensificação → realização
//          (AMRAP no padrão da onda) → deload. Usa o training max (90%).
//  haack — autorregulação (estilo John Haack / RTS): top set em RPE alvo calculado pelo
//          1RM estimado do dia, back-offs X% mais leves. O 1RM estimado vem do histórico
//          com RPE, então a carga se ajusta sozinha ao seu dia.
import { parseRepRange } from './training.js';

export const SCHEMES = {
  pct: { label: '%RM linear', short: '%RM', desc: 'Carga em % do 1RM, subindo ~2,5% por semana. Top sets, AMRAPs, back-offs e clusters com a porcentagem definida.' },
  w531: { label: '5/3/1 (Wendler)', short: '5/3/1', desc: 'Training max = 90% do 1RM. Semana 1: 65/75/85% ×5+ · 2: 70/80/90% ×3+ · 3: 75/85/95% ×5/3/1+ · 4: deload. A última série é AMRAP; o recorde dela sobe o 1RM estimado.' },
  jugg: { label: 'Juggernaut', short: 'Jugg', desc: 'Ondas de 10, 8, 5 e 3 reps. Acumulação (volume) → intensificação → realização (AMRAP no padrão) → deload. Reps acima do padrão no AMRAP sobem o training max.' },
  haack: { label: 'Autorregulada (Haack)', short: 'Auto', desc: 'Top set no RPE alvo com a carga calculada pelo seu 1RM estimado do dia; back-offs ~10% mais leves. Registre o RPE: o 1RM se recalcula a cada treino.' },
};
export const isScheme = (p) => !!SCHEMES[p];

// RPE → % do 1RM para N reps (Epley com reps em reserva). 1 rep @10 = 100%.
export function rpePct(reps, rpe = 10) {
  const total = Math.max(1, Number(reps) || 1) + Math.max(0, 10 - (Number(rpe) || 10));
  if (total <= 1) return 100;
  return Math.round((100 / (1 + total / 30)) * 10) / 10;
}

const round = (kg, step) => Math.round(kg / step) * step;
export const kgFor = (pct, base, step = 2.5) => (pct && base ? Math.max(step, round((base * pct) / 100, step)) : null);

// Ondas do Juggernaut: [acumulação, intensificação, realização] → séries × reps @% TM.
export const JUGG_WAVES = {
  10: [{ sets: 5, reps: 10, pct: 60 }, { sets: 3, reps: 10, pct: 67.5 }, { sets: 1, reps: 10, pct: 75 }],
  8: [{ sets: 5, reps: 8, pct: 65 }, { sets: 3, reps: 8, pct: 72.5 }, { sets: 1, reps: 8, pct: 80 }],
  5: [{ sets: 6, reps: 5, pct: 70 }, { sets: 4, reps: 5, pct: 77.5 }, { sets: 1, reps: 5, pct: 85 }],
  3: [{ sets: 7, reps: 3, pct: 75 }, { sets: 5, reps: 3, pct: 82.5 }, { sets: 1, reps: 3, pct: 90 }],
};
const W531 = [
  [[65, 5], [75, 5], [85, 5]],
  [[70, 3], [80, 3], [90, 3]],
  [[75, 5], [85, 3], [95, 1]],
];
const DELOAD = [[40, 5], [50, 5], [60, 5]];

const f = (x) => String(x).replace('.', ',');
const g = (sets, reps, pct, kind = 'work', extra = {}) => ({ sets, reps: String(reps), pct, kind, ...extra });

/**
 * Séries prescritas de um exercício do programa.
 * item: { prog, sets, reps, pct?, pctStep?, groups?, wave?, supp?, rpe?, drop? }
 * ctx:  { week, deload, test, oneRm, rpe (alvo da semana) }
 * Retorna { groups:[{sets,reps,pct,rpe,kind,note}], base, tm, text } ou null (sem esquema).
 */
export function prescribe(item, ctx = {}) {
  const prog = item.prog;
  if (!isScheme(prog)) return null;
  const week = Math.max(1, ctx.week || 1);
  const oneRm = Number(ctx.oneRm) || 0;
  const step = ctx.step ?? 2.5;
  const tm = oneRm ? oneRm * 0.9 : 0;
  let groups = [];
  let base = oneRm;
  let text = '';

  if (prog === 'pct') {
    const inc = (item.pctStep ?? 2.5) * (week - 1);
    const src = item.groups?.length ? item.groups : [g(item.sets || 3, item.reps || '5', item.pct ?? 70)];
    groups = src.map((x) => ({ ...x, reps: String(x.reps), pct: x.pct != null ? Math.round((x.pct + (x.fixed ? 0 : inc)) * 10) / 10 : null }));
    if (ctx.deload) groups = groups.map((x) => ({ ...x, sets: Math.max(1, Math.round(x.sets * 0.6)), pct: x.pct ? x.pct - 10 : null, kind: x.kind === 'amrap' ? 'work' : x.kind, reps: String(x.reps).replace('+', '') }));
    text = groups.map((x) => `${x.sets}×${x.reps}${x.pct ? ` @${f(x.pct)}%` : ''}${x.kind === 'amrap' ? ' AMRAP' : x.kind === 'cluster' ? ' cluster' : x.kind === 'speed' ? ' speed' : ''}`).join(' + ');
  } else if (prog === 'w531') {
    base = tm;
    const wk = (week - 1) % 4;
    const rows = ctx.deload || wk === 3 ? DELOAD : W531[wk];
    groups = rows.map(([p, r], i) => g(1, i === 2 && !(ctx.deload || wk === 3) ? `${r}+` : r, p, i === 2 && !(ctx.deload || wk === 3) ? 'amrap' : 'work'));
    if (!(ctx.deload || wk === 3) && item.supp === 'bbb') groups.push(g(5, 10, 50, 'backoff', { note: 'BBB' }));
    if (!(ctx.deload || wk === 3) && item.supp === 'fsl') groups.push(g(5, 5, rows[0][0], 'backoff', { note: 'FSL' }));
    text = `${['5s', '3s', '5/3/1', 'Deload'][ctx.deload ? 3 : wk]} · TM ${tm ? Math.round(tm) + ' kg' : '90% do 1RM'}: ${groups.map((x) => `${x.sets > 1 ? x.sets + '×' : ''}${x.reps} @${f(x.pct)}%`).join(' · ')}`;
  } else if (prog === 'jugg') {
    base = tm;
    const wave = JUGG_WAVES[item.wave ?? ctx.wave ?? 8] ?? JUGG_WAVES[8];
    const phase = ctx.deload ? 3 : (week - 1) % 4;
    if (phase === 3) groups = DELOAD.map(([p, r]) => g(1, r, p));
    else if (phase === 2) groups = [g(1, 5, 50, 'warmup'), g(1, 3, 60, 'warmup'), g(1, 1, 70, 'warmup'), g(1, `${wave[2].reps}+`, wave[2].pct, 'amrap')];
    else groups = [g(wave[phase].sets, wave[phase].reps, wave[phase].pct)];
    const nm = ['Acumulação', 'Intensificação', 'Realização', 'Deload'][phase];
    text = `Onda de ${item.wave ?? ctx.wave ?? 8}s · ${nm}: ${groups.filter((x) => x.kind !== 'warmup').map((x) => `${x.sets}×${x.reps} @${f(x.pct)}% TM`).join(' + ')}${phase === 2 ? ` (padrão ${wave[2].reps}; cada rep a mais sobe o TM)` : ''}`;
  } else if (prog === 'haack') {
    const range = parseRepRange(item.reps) ?? { min: 3, max: 3 };
    const reps = range.max;
    const rpe = item.rpe ?? Math.min(ctx.rpe ?? 8, item.rpeMax ?? 10);
    const top = ctx.deload ? Math.min(rpe, 6) : ctx.test ? Math.max(rpe, 9) : rpe;
    const pTop = rpePct(reps, top);
    const drop = item.drop ?? 10;
    const backs = ctx.deload ? Math.max(1, Math.round((item.sets || 3) * 0.5)) : Math.max(0, (item.sets || 3) - 1);
    groups = [g(1, reps, pTop, 'top', { rpe: top })];
    if (backs) groups.push(g(backs, item.backReps ?? reps, Math.round(pTop * (1 - drop / 100) * 10) / 10, 'backoff'));
    text = `Top set 1×${reps} @RPE ${top}${oneRm ? ` (~${kgFor(pTop, oneRm, step)} kg pelo 1RM est. ${Math.round(oneRm)})` : ''}${backs ? ` + ${backs}×${item.backReps ?? reps} back-off −${drop}%` : ''}. Ajuste a carga do dia: se o top set sair mais leve/pesado que @${top}, corrija os back-offs.`;
  }
  return { groups, base, tm, text };
}

// Expande a prescrição em séries da sessão (kg calculado quando há 1RM).
export function prescribedSets(rx, step = 2.5) {
  const out = [];
  for (const x of rx.groups) {
    for (let i = 0; i < x.sets; i++) {
      out.push({
        kg: kgFor(x.pct, rx.base, step), reps: null, rpe: null, pct: x.pct ?? null, done: false,
        kind: x.kind ?? 'work', tReps: x.reps, ...(x.rpe ? { tRpe: x.rpe } : {}),
        auto: { kg: true, pct: true },
      });
    }
  }
  return out;
}

/**
 * Heavy Duty (estilo Dorian Yates): aquecimentos progressivos + série(s) até a falha.
 * item: { sets (séries válidas, padrão 1), warm (0–2 aquecimentos), rp (séries de rest-pause) }
 * opts: kg = carga da série válida (sugestão pela última vez); toFailure=false → "top" (semana de
 * calibração, para antes da falha); rp=true → semana de intensificação; deload → 1 série leve.
 */
export function heavyDutySets(item, { deload = false, rp = false, toFailure = true, kg = null, step = 1 } = {}) {
  const r = (f) => (kg ? Math.max(step, Math.round((kg * f) / step) * step) : null);
  const mk = (kind, k, tReps) => ({ kg: k, reps: null, rpe: null, pct: null, done: false, kind, ...(tReps ? { tReps } : {}), auto: { kg: true } });
  const warm = item.warm ?? 1;
  const ramp = warm >= 2 ? [[0.5, '8'], [0.75, '4']] : warm === 1 ? [[0.6, '6']] : [];
  const out = ramp.map(([f, reps]) => mk('warmup', r(f), reps));
  const n = Math.max(1, item.sets || 1);
  for (let i = 0; i < n; i++) out.push(mk(deload ? 'work' : toFailure ? 'failure' : 'top', deload ? r(0.9) : kg, item.reps ? String(item.reps) : null));
  if (rp && !deload) for (let i = 0; i < (item.rp || 0); i++) out.push(mk('restpause', kg, '2-4'));
  return out;
}

// Resumo curto para listas: "2×5 @65% + 3×8+ @60%".
export function rxSummary(item, week = 1) {
  const rx = prescribe(item, { week });
  return rx ? rx.text : `${item.sets}×${item.reps}`;
}
