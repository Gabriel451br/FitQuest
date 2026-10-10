// Cálculos puros: composição corporal, gasto energético, macros e força.
// Sem dependências de DOM para poder ser testado no Node.

export const ACTIVITY = {
  sedentario: { label: 'Sedentário', hint: 'Trabalho sentado, pouco movimento', factor: 1.2 },
  leve: { label: 'Leve', hint: 'Treino 1–3x/semana', factor: 1.375 },
  moderado: { label: 'Moderado', hint: 'Treino 3–5x/semana', factor: 1.55 },
  alto: { label: 'Alto', hint: 'Treino 6–7x/semana', factor: 1.725 },
  atleta: { label: 'Atleta', hint: 'Treino 2x/dia ou trabalho físico', factor: 1.9 },
};

export const GOALS = {
  cut: { label: 'Secar', hint: 'Perder gordura', kcalAdj: -0.2, proteinPerKg: 2.2 },
  recomp: { label: 'Recomposição', hint: 'Perder gordura e ganhar músculo', kcalAdj: -0.08, proteinPerKg: 2.2 },
  maintain: { label: 'Manter', hint: 'Manter peso e performance', kcalAdj: 0, proteinPerKg: 1.8 },
  bulk: { label: 'Ganhar massa', hint: 'Superávit controlado', kcalAdj: 0.1, proteinPerKg: 2.0 },
};

const round = (n, d = 0) => {
  const m = 10 ** d;
  return Math.round(n * m) / m;
};

export function age(birthYear, now = new Date()) {
  return birthYear ? now.getFullYear() - birthYear : 30;
}

export function bmi(kg, heightCm) {
  if (!kg || !heightCm) return null;
  const m = heightCm / 100;
  return round(kg / (m * m), 1);
}

export function bmiClass(v) {
  if (v == null) return '';
  if (v < 18.5) return 'Abaixo do peso';
  if (v < 25) return 'Normal';
  if (v < 30) return 'Sobrepeso';
  if (v < 35) return 'Obesidade I';
  if (v < 40) return 'Obesidade II';
  return 'Obesidade III';
}

// Protocolo da Marinha dos EUA (medidas em cm).
export function bfNavy({ sex, height, neck, waist, hip }) {
  if (!height || !neck || !waist) return null;
  let bf;
  if (sex === 'F') {
    if (!hip || waist + hip - neck <= 0) return null;
    bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(height)) - 450;
  } else {
    if (waist - neck <= 0) return null;
    bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
  }
  return clampBf(bf);
}

// Relative Fat Mass (Woolcott & Bergman, 2018): só altura e cintura.
export function bfRfm({ sex, height, waist }) {
  if (!height || !waist) return null;
  return clampBf((sex === 'F' ? 76 : 64) - 20 * (height / waist));
}

function clampBf(v) {
  if (!Number.isFinite(v)) return null;
  return round(Math.min(60, Math.max(3, v)), 1);
}

// Usa Navy quando há pescoço (e quadril, se mulher); senão RFM.
export function estimateBf(m) {
  const navy = bfNavy(m);
  const rfm = bfRfm(m);
  if (navy != null) return { bf: navy, method: 'navy', navy, rfm };
  if (rfm != null) return { bf: rfm, method: 'rfm', navy, rfm };
  return { bf: null, method: null, navy, rfm };
}

export function bfClass(bf, sex) {
  if (bf == null) return '';
  const t = sex === 'F' ? [14, 21, 25, 32] : [6, 14, 18, 25];
  if (bf < t[0]) return 'Essencial';
  if (bf < t[1]) return 'Atlético';
  if (bf < t[2]) return 'Fitness';
  if (bf < t[3]) return 'Médio';
  return 'Elevado';
}

export function composition(kg, bf) {
  if (!kg || bf == null) return null;
  const fat = (kg * bf) / 100;
  return { fatKg: round(fat, 1), leanKg: round(kg - fat, 1) };
}

// TMB: Katch-McArdle quando o BF é conhecido; senão Mifflin-St Jeor.
export function bmr({ sex, kg, height, ageYears, bf }) {
  if (bf != null && kg) return round(370 + 21.6 * (kg * (1 - bf / 100)));
  if (!kg || !height) return null;
  return round(10 * kg + 6.25 * height - 5 * ageYears + (sex === 'F' ? -161 : 5));
}

export function tdee(bmrValue, activity) {
  if (!bmrValue) return null;
  return round(bmrValue * (ACTIVITY[activity]?.factor ?? 1.375));
}

// Metas diárias. Proteína por kg de peso, limitada pela massa magra em quem
// tem BF alto (evita metas exageradas); gordura 25% kcal com piso 0,6 g/kg.
export function macroTargets({ sex, kg, height, ageYears, bf, activity, goal }) {
  const b = bmr({ sex, kg, height, ageYears, bf });
  const t = tdee(b, activity);
  if (!t) return null;
  const g = GOALS[goal] ?? GOALS.maintain;
  const floor = sex === 'F' ? 1200 : 1500;
  const kcal = Math.max(floor, round((t * (1 + g.kcalAdj)) / 10) * 10);

  let proteinBase = kg;
  if (bf != null) {
    const lean = kg * (1 - bf / 100);
    proteinBase = Math.min(kg, lean / (sex === 'F' ? 0.75 : 0.85));
  }
  const protein = round(proteinBase * g.proteinPerKg);
  const fat = round(Math.max(0.6 * kg, (kcal * 0.25) / 9));
  const carbs = Math.max(0, round((kcal - protein * 4 - fat * 9) / 4));
  return {
    bmr: b,
    tdee: t,
    kcal,
    protein,
    fat,
    carbs,
    water: round(kg * 35 / 50) * 50,
    fiber: round((kcal / 1000) * 14),
  };
}

export const kcalFromMacros = (p, c, f) => round(p * 4 + c * 4 + f * 9);

// --- Força -----------------------------------------------------------------

// 1RM estimado (Epley). Com RPE, soma as repetições em reserva (10 - RPE).
export function e1rm(kg, reps, rpe) {
  if (!kg || !reps) return 0;
  const rir = rpe ? Math.max(0, 10 - rpe) : 0;
  const total = reps + rir;
  if (total <= 1) return round(kg, 1);
  return round(kg * (1 + total / 30), 1);
}

// Outras fórmulas clássicas (comparação na calculadora de RM).
export function brzycki(kg, reps) {
  if (!kg || !reps || reps >= 37) return 0;
  return reps === 1 ? kg : round((kg * 36) / (37 - reps), 1);
}

export function lombardi(kg, reps) {
  if (!kg || !reps) return 0;
  return round(kg * reps ** 0.1, 1);
}

// Reps aproximadas que se consegue fazer com X% do 1RM (Epley invertida).
export function repsAtPct(pct) {
  if (!pct || pct >= 100) return 1;
  return Math.max(1, Math.round(30 * (100 / pct - 1)));
}

export function oneRmEstimates(kg, reps, rpe) {
  const epley = e1rm(kg, reps, rpe);
  const rir = rpe ? Math.max(0, 10 - rpe) : 0;
  const r = reps + rir;
  const bz = brzycki(kg, r);
  const lb = lombardi(kg, r);
  const vals = [epley, bz, lb].filter((v) => v > 0);
  return { epley, brzycki: bz, lombardi: lb, avg: vals.length ? round(vals.reduce((a, b) => a + b, 0) / vals.length, 1) : 0 };
}

export function pctOf1rm(kg, oneRm) {
  if (!kg || !oneRm) return null;
  return round((kg / oneRm) * 100);
}

export function loadForPct(pct, oneRm, step = 2.5) {
  if (!pct || !oneRm) return null;
  return round(Math.round((oneRm * pct) / 100 / step) * step, 1);
}

export function setVolume(s) {
  return (Number(s.kg) || 0) * (Number(s.reps) || 0);
}
