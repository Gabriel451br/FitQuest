// Estado inicial, migração e seletores puros (sem DOM/Preact — testável no Node).
import { macroTargets, age } from './calc.js';
import { BASE_EXERCISES } from './data/exercises.js';
import { dateKey } from './util.js';

export const MEALS = [
  { key: 'cafe', label: 'Café da manhã' },
  { key: 'lanche1', label: 'Lanche da manhã' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'lanche2', label: 'Lanche da tarde' },
  { key: 'jantar', label: 'Jantar' },
  { key: 'ceia', label: 'Ceia' },
];

export function emptyState() {
  return {
    version: 2,
    profile: null, // { name, sex, birthYear, height, activity, goal, trainDays, startWeight, createdAt }
    manualTargets: null, // { kcal, protein, carbs, fat, water } quando o usuário sobrescreve
    customFoods: [],
    recentFoods: [],
    diary: {}, // { [date]: { meals: { [meal]: [{ id, foodId, g }] }, water: ml } }
    dietPlan: null,
    weights: [], // [{ date, kg }]
    assessments: [], // [{ id, date, kg, neck, waist, hip, bf, method, photos: [{ id, pose }] }]
    customExercises: [],
    workouts: [], // [{ id, name, exercises: [{ exId, sets, reps }] }]
    sessions: [], // [{ id, date, workoutId, name, startedAt, finishedAt, exercises: [{ exId, sets: [...] }] }]
    activeSessionId: null,
    goals: [], // [{ id, type, title, target, exId, createdAt, completedAt }]
    // intensity: coluna padrão nas séries ('rpe' | 'pct' | 'none'); cada exercício pode sobrescrever.
    settings: { theme: 'auto', intensity: 'rpe' },
    exerciseSettings: {}, // { [exId]: { intensity, oneRm } }
  };
}

export function migrate(s) {
  const base = emptyState();
  const out = { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) } };
  // versões antigas tinham duas chaves (showRpe/showPct) em vez de "intensity"
  if (!s.settings?.intensity && s.settings) {
    out.settings.intensity = s.settings.showPct ? 'pct' : s.settings.showRpe === false ? 'none' : 'rpe';
  }
  delete out.settings.showRpe;
  delete out.settings.showPct;
  out.version = 2;
  return out;
}

// Coluna de intensidade de um exercício: configuração própria ou padrão global.
export function intensityFor(s, exId) {
  return s.exerciseSettings?.[exId]?.intensity ?? s.settings.intensity ?? 'rpe';
}

// --- Seletores ----------------------------------------------------------------

export function latestWeight(s) {
  const w = [...s.weights].sort((a, b) => a.date.localeCompare(b.date)).pop();
  return w?.kg ?? s.profile?.startWeight ?? null;
}

export function latestAssessment(s) {
  return [...s.assessments].sort((a, b) => a.date.localeCompare(b.date)).pop() ?? null;
}

export function currentBf(s) {
  return latestAssessment(s)?.bf ?? null;
}

export function autoTargets(s) {
  const p = s.profile;
  if (!p) return null;
  return macroTargets({
    sex: p.sex,
    kg: latestWeight(s),
    height: p.height,
    ageYears: age(p.birthYear),
    bf: currentBf(s),
    activity: p.activity,
    goal: p.goal,
  });
}

export function targets(s) {
  const auto = autoTargets(s);
  if (!s.manualTargets) return auto;
  return { ...auto, ...s.manualTargets, manual: true };
}

export function dayEntry(s, date = dateKey()) {
  return s.diary[date] ?? { meals: {}, water: 0 };
}

export function allExercises(s) {
  return [...BASE_EXERCISES, ...s.customExercises];
}

export function exerciseById(s, id) {
  return allExercises(s).find((e) => e.id === id) ?? { id, name: id, primary: 'peito', secondary: [] };
}

export function finishedSessions(s) {
  return s.sessions.filter((x) => x.finishedAt).sort((a, b) => a.date.localeCompare(b.date) || a.startedAt - b.startedAt);
}
