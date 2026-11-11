// Programas em blocos (mesociclos): cada bloco tem objetivo, nº de semanas, sistema de
// progressão, diretrizes por semana (RPE, deload) e seus treinos (ex.: A/B/C).
// A semana do bloco avança conforme os treinos do bloco são concluídos: fez A, B e C → semana 2.
// Puro (sem navegador): usado pelas telas e pelos testes.
import { finishedSessions, exerciseById } from './selectors.js';
import { parseRepRange, setKind } from './training.js';
import { SCHEMES } from './periodization.js';

export const BLOCK_GOALS = {
  forca: 'Força',
  hipertrofia: 'Hipertrofia',
  potencia: 'Potência',
  resistencia: 'Resistência muscular',
  recomp: 'Recomposição',
  preparacao: 'Preparação / técnica',
  transicao: 'Deload / transição',
};

export const PROGRESSIONS = {
  double: { label: 'Progressão dupla', short: 'Dupla', desc: 'Mantém a carga até fazer o topo da faixa em todas as séries; aí sobe a carga e volta para o início da faixa.' },
  topset: { label: 'Top set + back-off', short: 'Top+BO', desc: 'Uma série principal no RPE alvo e back-offs ~10% mais leves. Topo da faixa no top set → sobe carga na próxima.' },
  linear: { label: 'Linear', short: 'Linear', desc: 'Completou todas as séries e reps → +carga na próxima sessão.' },
  rpe: { label: 'Autorregulada (RPE)', short: 'RPE', desc: 'Ajusta a carga pelo RPE da última vez: abaixo do alvo sobe, acima desce.' },
  explosive: { label: 'Explosivos', short: 'Explosivo', desc: 'Poucas reps rápidas, sem falha. Só sobe a carga quando a execução estiver consistente.' },
  // por %RM / RPE (cargas calculadas pelo 1RM): %RM linear, 5/3/1, Juggernaut, autorregulada (Haack)
  ...SCHEMES,
};

// Diretrizes padrão por semana (bloco de 7 semanas + 8ª opcional).
export const DEFAULT_WEEK_PLAN = [
  { from: 1, to: 2, rpe: '6-7', text: 'Adaptação técnica: encontre as cargas de trabalho.' },
  { from: 3, to: 4, rpe: '7-8', text: 'Progressão gradual de reps/carga.' },
  { from: 5, to: 6, rpe: '8', text: 'Maior estímulo do bloco, sem falha nos básicos.' },
  { from: 7, to: 7, rpe: '5-6', deload: true, text: 'Deload: séries reduzidas em ~40–50%, cargas 5–15% menores se necessário.' },
  { from: 8, to: 8, rpe: '7-8', text: 'Opcional: consolidação / teste submáximo técnico ou transição.' },
];

export const activeProgram = (s) => (s.programs ?? []).find((p) => p.id === s.activeProgramId && p.status !== 'done') ?? null;
export const currentBlock = (p) => p?.blocks?.[p.blockIndex ?? 0] ?? null;

export function weekGuide(block, week) {
  const plan = block?.weekPlan?.length ? block.weekPlan : DEFAULT_WEEK_PLAN;
  const g = plan.find((x) => week >= x.from && week <= x.to) ?? null;
  const deload = !!g?.deload || (!!block?.deloadWeek && week === block.deloadWeek);
  return { ...(g ?? {}), deload };
}

// Sessões concluídas que contam para o bloco atual.
export function blockSessions(s, p, block = currentBlock(p)) {
  if (!block) return [];
  const ids = new Set(block.workoutIds);
  return finishedSessions(s).filter((x) => x.programId === p.id && x.blockId === block.id && ids.has(x.workoutId) && (x.startedAt ?? 0) >= (p.blockStartedAt ?? 0));
}

export function blockProgress(s, p) {
  const block = currentBlock(p);
  if (!block) return null;
  const perWeek = Math.max(1, block.perWeek || block.workoutIds.length || 1);
  const done = blockSessions(s, p, block);
  const week = Math.floor(done.length / perWeek) + 1;
  const doneThisWeek = done.slice(done.length - (done.length % perWeek));
  const last = done[done.length - 1];
  const order = block.workoutIds;
  const nextId = last ? order[(order.indexOf(last.workoutId) + 1) % order.length] : order[0];
  return {
    block, perWeek, sessions: done.length, week, weeks: block.weeks,
    finished: week > block.weeks,
    pct: Math.min(1, done.length / (perWeek * block.weeks)),
    doneThisWeek: doneThisWeek.map((x) => x.workoutId),
    nextWorkoutId: nextId,
    guide: weekGuide(block, Math.min(week, block.weeks)),
  };
}

// Incremento de carga: membros superiores 2 kg (anilhas de 1 kg), inferiores 5 kg.
const LOWER = new Set(['quadriceps', 'posterior', 'gluteos', 'panturrilha']);
export function loadStep(s, exId) {
  const ex = exerciseById(s, exId);
  return LOWER.has(ex.primary) ? 5 : 2;
}
const round = (kg, step = 1) => Math.round(kg / step) * step;

/**
 * Sugestão para a próxima vez, conforme o sistema de progressão do exercício.
 * last: { sets: [{kg, reps, rpe, kind}] } (séries válidas da última vez)
 * Retorna { kg, reps, backoffKg?, text }.
 */
export function suggestProgression(prog, last, repRange, { step = 2.5, targetRpe = null } = {}) {
  if (!last?.sets?.length) return null;
  const range = parseRepRange(repRange);
  const sets = last.sets;
  const kgs = sets.map((x) => Number(x.kg) || 0);
  const topKg = Math.max(...kgs);
  const top = sets.find((x) => setKind(x) === 'top') ?? sets[kgs.indexOf(topKg)];
  const reps = (x) => Number(x.reps) || 0;
  const rpeT = targetRpe ?? 8;
  switch (prog) {
    case 'topset': {
      const hit = range ? reps(top) >= range.max : true;
      const easy = top.rpe == null || Number(top.rpe) <= rpeT;
      const backs = sets.filter((x) => x !== top);
      const backsOk = !range || backs.every((x) => reps(x) >= range.max);
      const kg = hit && easy && backsOk ? topKg + step : topKg;
      return {
        kg, reps: range ? (kg > topKg ? range.min : Math.min(range.max, reps(top) + 1)) : reps(top), backoffKg: round(kg * 0.9, step >= 5 ? 2.5 : 1),
        text: kg > topKg ? `Top set ${kg} kg × ${range?.min ?? reps(top)} (RPE ${rpeT}) · back-off ~${round(kg * 0.9, step >= 5 ? 2.5 : 1)} kg` : `Top set ${kg} kg, busque ${Math.min(range?.max ?? 99, reps(top) + 1)} reps · back-off ~${round(kg * 0.9, step >= 5 ? 2.5 : 1)} kg`,
      };
    }
    case 'linear': {
      const all = range ? sets.every((x) => reps(x) >= range.min) : true;
      const kg = all ? topKg + step : topKg;
      return { kg, reps: range?.min ?? reps(top), text: all ? `Suba para ${kg} kg (completou tudo)` : `Repita ${kg} kg até completar todas as séries` };
    }
    case 'rpe': {
      const r = Number(top.rpe);
      if (!r) return { kg: topKg, reps: reps(top), text: `Repita ${topKg} kg e registre o RPE para ajustar` };
      const diff = rpeT - r;
      const kg = diff >= 1 ? round(topKg * 1.025 + 0.01, step >= 5 ? 2.5 : 1) : diff <= -1 ? round(topKg * 0.975, step >= 5 ? 2.5 : 1) : topKg;
      return { kg, reps: reps(top), text: diff >= 1 ? `RPE ${r} < alvo ${rpeT}: suba para ${kg} kg` : diff <= -1 ? `RPE ${r} > alvo ${rpeT}: reduza para ${kg} kg` : `No alvo: mantenha ${kg} kg` };
    }
    case 'explosive': {
      const consistent = sets.every((x) => reps(x) >= (range?.min ?? 1) && (x.rpe == null || Number(x.rpe) <= 7));
      const kg = consistent && sets.length >= 2 ? topKg + Math.min(step, 2.5) : topKg;
      return { kg, reps: range?.max ?? reps(top), text: kg > topKg ? `Execução consistente: ${kg} kg, sem perder velocidade` : `Mantenha ${kg} kg; pare a série se a velocidade cair` };
    }
    default: { // progressão dupla
      const work = sets.filter((x) => (Number(x.kg) || 0) === topKg);
      if (!range) return { kg: topKg, reps: reps(work[0]), text: `Repita ${topKg} kg e tente +1 rep` };
      if (work.every((x) => reps(x) >= range.max) && topKg > 0) return { kg: topKg + step, reps: range.min, text: `Topo da faixa em todas: suba para ${topKg + step} kg × ${range.min}` };
      const minR = Math.min(...work.map(reps));
      return { kg: topKg, reps: Math.min(range.max, minR + 1), text: `Mantenha ${topKg} kg, busque ${Math.min(range.max, minR + 1)}+ reps` };
    }
  }
}

// Deload: ~40% menos séries (mínimo 1).
export const deloadSets = (n) => Math.max(1, Math.round((n || 1) * 0.6));
