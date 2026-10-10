// Análises de treino (puras): histórico, PRs, volume por grupo e sugestão de progressão.
import { e1rm, setVolume } from './calc.js';
import { MUSCLES } from './data/exercises.js';
import { exerciseById, finishedSessions } from './selectors.js';
import { weekStart } from './util.js';

export const isWorking = (st) => st.done && !st.warmup && Number(st.reps) > 0;

export function setE1rm(st) {
  return e1rm(Number(st.kg) || 0, Number(st.reps) || 0, Number(st.rpe) || null);
}

// Histórico por exercício, do mais antigo ao mais recente.
export function exerciseHistory(s, exId) {
  const out = [];
  for (const ses of finishedSessions(s)) {
    for (const ex of ses.exercises) {
      if (ex.exId !== exId) continue;
      const sets = ex.sets.filter(isWorking);
      if (!sets.length) continue;
      const best = Math.max(...sets.map(setE1rm));
      out.push({
        date: ses.date,
        sessionId: ses.id,
        sets,
        e1rm: best,
        topKg: Math.max(...sets.map((x) => Number(x.kg) || 0)),
        volume: sets.reduce((a, x) => a + setVolume(x), 0),
      });
    }
  }
  return out;
}

export function lastPerformance(s, exId, excludeSessionId) {
  const h = exerciseHistory(s, exId).filter((x) => x.sessionId !== excludeSessionId);
  return h[h.length - 1] ?? null;
}

export function bestE1rm(s, exId) {
  const h = exerciseHistory(s, exId);
  return h.length ? Math.max(...h.map((x) => x.e1rm)) : 0;
}

// PRs: uma série cujo 1RM estimado supera o melhor anterior do exercício.
// A primeira vez que o exercício aparece não conta como PR.
export function computePRs(s) {
  const best = {};
  const prs = [];
  for (const ses of finishedSessions(s)) {
    for (const ex of ses.exercises) {
      const sets = ex.sets.filter(isWorking);
      if (!sets.length) continue;
      const top = Math.max(...sets.map(setE1rm));
      if (best[ex.exId] != null && top > best[ex.exId]) {
        prs.push({ sessionId: ses.id, date: ses.date, exId: ex.exId, e1rm: top, prev: best[ex.exId] });
      }
      best[ex.exId] = Math.max(best[ex.exId] ?? 0, top);
    }
  }
  return prs;
}

export function sessionStats(s, ses) {
  let sets = 0;
  let volume = 0;
  let reps = 0;
  for (const ex of ses.exercises) {
    for (const st of ex.sets) {
      if (!isWorking(st)) continue;
      sets++;
      reps += Number(st.reps) || 0;
      volume += setVolume(st);
    }
  }
  const minutes = ses.finishedAt && ses.startedAt ? Math.round((ses.finishedAt - ses.startedAt) / 60000) : null;
  return { sets, volume: Math.round(volume), reps, minutes };
}

// Séries válidas por grupo muscular na semana (primário = 1, secundário = 0,5).
export function weeklySets(s, anyDayOfWeek) {
  const ws = weekStart(anyDayOfWeek);
  const out = Object.fromEntries(Object.keys(MUSCLES).map((k) => [k, 0]));
  for (const ses of finishedSessions(s)) {
    if (weekStart(ses.date) !== ws) continue;
    for (const ex of ses.exercises) {
      const n = ex.sets.filter(isWorking).length;
      if (!n) continue;
      const def = exerciseById(s, ex.exId);
      out[def.primary] = (out[def.primary] ?? 0) + n;
      for (const sec of def.secondary) out[sec] = (out[sec] ?? 0) + n * 0.5;
    }
  }
  return out;
}

export function sessionsInWeek(s, anyDayOfWeek) {
  const ws = weekStart(anyDayOfWeek);
  return finishedSessions(s).filter((x) => weekStart(x.date) === ws);
}

// "8-12" → { min: 8, max: 12 }; "10" → { min: 10, max: 10 }.
export function parseRepRange(r) {
  const m = String(r ?? '').match(/(\d+)\s*(?:[-–a]\s*(\d+))?/);
  if (!m) return null;
  const min = Number(m[1]);
  return { min, max: Number(m[2] ?? m[1]) };
}

// Dupla progressão: bateu o topo da faixa em todas as séries → sobe carga.
export function suggestNext(last, repRange, step = 2.5) {
  if (!last) return null;
  const range = parseRepRange(repRange);
  const topKg = last.topKg;
  const topSets = last.sets.filter((x) => (Number(x.kg) || 0) === topKg);
  if (!range) return { kg: topKg, reps: topSets[0]?.reps, text: `Repita ${topKg} kg e tente +1 rep` };
  const allTop = topSets.every((x) => Number(x.reps) >= range.max);
  if (allTop && topKg > 0) {
    return { kg: topKg + step, reps: range.min, text: `Suba para ${topKg + step} kg × ${range.min}` };
  }
  const minReps = Math.min(...topSets.map((x) => Number(x.reps)));
  return { kg: topKg, reps: Math.min(range.max, minReps + 1), text: `Mantenha ${topKg} kg, busque ${Math.min(range.max, minReps + 1)}+ reps` };
}
