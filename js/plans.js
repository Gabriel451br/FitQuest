// Treinos estruturados (puro): intervalado, fartlek, ritmo, longão, progressivo, regenerativo.
// Cada treino vira uma lista de etapas { kind, label, by: 'time'|'dist', value, pace }
//   value: segundos (by time) ou km (by dist); pace: alvo em s/km (opcional).
// Durante a atividade, um cursor { idx, t, d } marca onde a etapa atual começou
// (t = segundos de atividade, d = km percorridos) e as voltas concluídas viram "laps".

import { fmtDuration } from './cardio.js';

export const PLAN_TYPES = {
  livre: { label: 'Livre', desc: 'Só meta de distância/tempo (opcional).' },
  intervalado: { label: 'Intervalado', desc: 'Tiros fortes com recuperação entre eles.' },
  fartlek: { label: 'Fartlek', desc: 'Alterna forte e leve por tempo, sem parar.' },
  ritmo: { label: 'Ritmo (tempo run)', desc: 'Bloco contínuo no ritmo de prova, com aquecimento e desaquecimento.' },
  longao: { label: 'Longão', desc: 'Distância longa em ritmo confortável e constante.' },
  progressivo: { label: 'Progressivo', desc: 'Blocos cada vez mais rápidos.' },
  regenerativo: { label: 'Regenerativo', desc: 'Leve, para recuperar.' },
};

export const PLANS_BY_TYPE = {
  run: ['livre', 'intervalado', 'fartlek', 'ritmo', 'longao', 'progressivo', 'regenerativo'],
  walk: ['livre', 'intervalado', 'longao', 'regenerativo'],
  bike: ['livre', 'intervalado', 'ritmo', 'longao', 'progressivo', 'regenerativo'],
  swim: ['livre', 'intervalado', 'longao'],
};

// Tipo de treino (chip "kind") correspondente a cada modelo.
export const PLAN_KIND = {
  intervalado: 'Intervalado', fartlek: 'Fartlek', ritmo: 'Ritmo', longao: 'Longão', progressivo: 'Progressivo', regenerativo: 'Regenerativo',
};

// Parâmetros padrão: unidades da tela (min, m, km, s/km).
export function planDefaults(tpl, type = 'run') {
  const bike = type === 'bike';
  const swim = type === 'swim';
  const walk = type === 'walk';
  switch (tpl) {
    case 'intervalado':
      return swim
        ? { warm: 5, reps: 8, workBy: 'dist', workDist: 100, workTime: 90, workPace: null, restBy: 'time', restTime: 30, restDist: 50, cool: 5 }
        : bike
          ? { warm: 10, reps: 5, workBy: 'time', workTime: 180, workDist: 1000, workPace: 3600 / 32, restBy: 'time', restTime: 120, restDist: 500, cool: 10 }
          : { warm: 10, reps: walk ? 6 : 6, workBy: 'dist', workDist: walk ? 500 : 400, workTime: 60, workPace: walk ? 540 : 270, restBy: 'time', restTime: 90, restDist: 200, cool: 5 };
    case 'fartlek':
      return { warm: 10, reps: 8, hard: 60, easy: 90, cool: 5 };
    case 'ritmo':
      return bike
        ? { warm: 10, tempoBy: 'time', tempoTime: 20, tempoDist: 15, tempoPace: 3600 / 30, cool: 10 }
        : { warm: 10, tempoBy: 'time', tempoTime: 20, tempoDist: 4, tempoPace: 300, cool: 5 };
    case 'longao':
      return { dist: swim ? 2 : bike ? 60 : walk ? 8 : 15, pace: swim ? null : bike ? 3600 / 26 : walk ? 600 : 360 };
    case 'progressivo':
      return bike ? { blocks: 3, blockKm: 10, startPace: 3600 / 25, speedInc: 2 } : { blocks: 3, blockKm: 2, startPace: 360, drop: 15 };
    case 'regenerativo':
      return { time: bike ? 45 : 30, pace: bike ? 3600 / 22 : walk ? 660 : 420 };
    default:
      return {};
  }
}

const mmss = (sec) => fmtDuration(sec);
const distLabel = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${String(+km.toFixed(2)).replace('.', ',')} km`);

export function stepLabel(st) {
  const names = { warm: 'Aquecimento', work: 'Forte', rest: 'Recuperação', cool: 'Desaquecimento', steady: 'Contínuo' };
  const base = st.name ?? names[st.kind] ?? 'Etapa';
  return `${base} ${st.by === 'time' ? mmss(st.value) : distLabel(st.value)}`;
}

export function buildSteps(tpl, p = {}) {
  const out = [];
  const add = (kind, by, value, pace = null, name) => {
    if (!(value > 0)) return;
    out.push({ kind, by, value: by === 'time' ? Math.round(value) : +value.toFixed(3), pace: pace || null, ...(name ? { name } : {}) });
  };
  const warm = () => add('warm', 'time', (p.warm ?? 0) * 60);
  const cool = () => add('cool', 'time', (p.cool ?? 0) * 60);
  switch (tpl) {
    case 'intervalado': {
      warm();
      const n = Math.max(1, Math.min(50, Math.round(p.reps || 1)));
      for (let i = 0; i < n; i++) {
        const nm = `Tiro ${i + 1}/${n}`;
        if (p.workBy === 'time') add('work', 'time', p.workTime, p.workPace, nm);
        else add('work', 'dist', (p.workDist ?? 0) / 1000, p.workPace, nm);
        if (i < n - 1) {
          if (p.restBy === 'dist') add('rest', 'dist', (p.restDist ?? 0) / 1000);
          else add('rest', 'time', p.restTime);
        }
      }
      cool();
      break;
    }
    case 'fartlek': {
      warm();
      const n = Math.max(1, Math.min(50, Math.round(p.reps || 1)));
      for (let i = 0; i < n; i++) {
        add('work', 'time', p.hard, null, `Forte ${i + 1}/${n}`);
        add('rest', 'time', p.easy, null, 'Leve');
      }
      cool();
      break;
    }
    case 'ritmo':
      warm();
      if (p.tempoBy === 'dist') add('work', 'dist', p.tempoDist, p.tempoPace, 'Ritmo');
      else add('work', 'time', (p.tempoTime ?? 0) * 60, p.tempoPace, 'Ritmo');
      cool();
      break;
    case 'longao':
      add('steady', 'dist', p.dist, p.pace, 'Longão');
      break;
    case 'progressivo': {
      const n = Math.max(1, Math.min(10, Math.round(p.blocks || 1)));
      for (let i = 0; i < n; i++) {
        // bike: acelera em km/h por bloco (speedInc); corrida: reduz o pace em s/km (drop)
        const pace = !p.startPace ? null : p.speedInc ? 3600 / (3600 / p.startPace + i * p.speedInc) : p.startPace - i * (p.drop ?? 0);
        add('work', 'dist', p.blockKm, pace ? Math.round(pace) : null, `Bloco ${i + 1}/${n}`);
      }
      break;
    }
    case 'regenerativo':
      add('steady', 'time', (p.time ?? 0) * 60, p.pace, 'Regenerativo');
      break;
    default:
  }
  return out;
}

// Estimativa de duração e distância totais (usa o pace alvo quando existe).
export function planTotals(steps, fallbackPace = 360) {
  let sec = 0;
  let km = 0;
  let exact = true;
  for (const st of steps) {
    const pace = st.pace || fallbackPace;
    if (st.by === 'time') {
      sec += st.value;
      km += st.value / pace;
      if (!st.pace) exact = false;
    } else {
      km += st.value;
      sec += st.value * pace;
      if (!st.pace) exact = false;
    }
  }
  return { sec: Math.round(sec), km, exact };
}

export function stepProgress(step, cursor, elapsed, km) {
  if (!step) return null;
  const done = step.by === 'time' ? elapsed - cursor.t : km - cursor.d;
  const pct = Math.max(0, Math.min(1, done / step.value));
  return { done: Math.max(0, done), remain: Math.max(0, step.value - done), pct };
}

/**
 * Avança as etapas cumpridas. hasDist: há distância medida (GPS); sem ela, etapas por
 * distância só avançam manualmente. Retorna { cursor, laps } (laps = voltas novas).
 */
export function advance(steps, cursor, elapsed, km, hasDist) {
  let c = { ...cursor };
  const laps = [];
  while (c.idx < steps.length) {
    const st = steps[c.idx];
    if (st.by === 'time') {
      if (elapsed - c.t < st.value) break;
      const t = c.t + st.value;
      laps.push({ i: c.idx, kind: st.kind, sec: st.value, km: hasDist ? +(km - c.d).toFixed(3) : null, pace: st.pace ?? null });
      c = { idx: c.idx + 1, t, d: km };
    } else {
      if (!hasDist || km - c.d < st.value - 1e-6) break;
      const d = c.d + st.value;
      laps.push({ i: c.idx, kind: st.kind, sec: Math.round(elapsed - c.t), km: st.value, pace: st.pace ?? null });
      c = { idx: c.idx + 1, t: elapsed, d };
    }
  }
  return { cursor: c, laps };
}

// Pular para a próxima etapa (botão): registra a volta com o que foi feito.
export function skip(steps, cursor, elapsed, km, hasDist) {
  if (cursor.idx >= steps.length) return { cursor, laps: [] };
  const st = steps[cursor.idx];
  const lap = { i: cursor.idx, kind: st.kind, sec: Math.round(elapsed - cursor.t), km: hasDist ? +(km - cursor.d).toFixed(3) : null, pace: st.pace ?? null, skipped: true };
  return { cursor: { idx: cursor.idx + 1, t: elapsed, d: km }, laps: [lap] };
}

// Compara o ritmo atual com o alvo (s/km). Tolerância em s/km.
export function paceStatus(target, current, tol = 10) {
  if (!target || !current) return null;
  if (current < target - tol) return 'fast';
  if (current > target + tol) return 'slow';
  return 'ok';
}
