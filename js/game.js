// Gamificação derivada dos dados: XP, nível, sequência, missões e conquistas.
// Nada é acumulado em separado — editar/apagar um registro recalcula tudo,
// então não existe XP duplicado nem "farm" por desfazer/refazer.
import { sumMacros } from './foods.js';
import { targets, finishedSessions, MEALS } from './selectors.js';
import { computePRs, sessionStats, weeklySets } from './training.js';
import { cardioPRs, cardioSessions, cardioTotals } from './cardio.js';

export const allPRs = (s) => [...computePRs(s), ...cardioPRs(s)];
import { dateKey, addDays, weekStart, diffDays } from './util.js';

export const XP = {
  meals: 30,
  protein: 30,
  kcal: 40,
  water: 20,
  train: 100,
  weigh: 10,
  perfect: 50,
  pr: 25,
  assessment: 80,
  photos: 20,
  streakPerDay: 3,
  streakCap: 10,
  goal: 300,
};

export const DAILY_QUESTS = [
  { key: 'meals', label: 'Registrar 3+ refeições', xp: XP.meals },
  { key: 'protein', label: 'Bater a proteína (≥90%)', xp: XP.protein },
  { key: 'kcal', label: 'Calorias na meta (±10%)', xp: XP.kcal },
  { key: 'water', label: 'Meta de água', xp: XP.water },
  { key: 'train', label: 'Concluir um treino', xp: XP.train },
  { key: 'weigh', label: 'Registrar o peso', xp: XP.weigh },
];

export const WEEKLY_QUESTS = [
  { key: 'trainDays', label: (n) => `Treinar ${n}x na semana`, xp: 150 },
  { key: 'protein5', label: () => 'Proteína batida em 5 dias', xp: 150 },
  { key: 'diary6', label: () => 'Diário alimentar em 6 dias', xp: 100 },
  { key: 'volume', label: () => '10+ séries: peito, costas, ombros, quadríceps e posterior', xp: 200 },
];

const BIG_GROUPS = ['peito', 'costas', 'ombros', 'quadriceps', 'posterior'];

export const TITLES = [
  [1, 'Novato'], [3, 'Iniciante'], [6, 'Aprendiz'], [10, 'Dedicado'], [15, 'Guerreiro'],
  [20, 'Atleta'], [30, 'Elite'], [40, 'Mestre'], [50, 'Lenda'],
];

export function xpForLevel(level) {
  return Math.round(150 * (level - 1) ** 1.6);
}

export function levelInfo(totalXp) {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) level++;
  const cur = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const title = [...TITLES].reverse().find(([l]) => level >= l)[1];
  return { level, title, cur, next, into: totalXp - cur, need: next - cur, pct: (totalXp - cur) / (next - cur) };
}

// --- Por dia ----------------------------------------------------------------------

function indexByDate(s) {
  const sessions = {};
  for (const x of finishedSessions(s)) (sessions[x.date] ??= []).push(x);
  const weights = new Set(s.weights.map((w) => w.date));
  const assessments = {};
  for (const a of s.assessments) (assessments[a.date] ??= []).push(a);
  const prs = {};
  for (const p of allPRs(s)) (prs[p.date] ??= []).push(p);
  return { sessions, weights, assessments, prs };
}

export function dayStatus(s, date, idx = indexByDate(s), t = targets(s)) {
  const entry = s.diary[date] ?? { meals: {}, water: 0 };
  const items = MEALS.flatMap((m) => entry.meals?.[m.key] ?? []);
  const mealsLogged = MEALS.filter((m) => (entry.meals?.[m.key] ?? []).length).length;
  const tot = sumMacros(items);
  const sessions = idx.sessions[date] ?? [];
  const q = {
    meals: mealsLogged >= 3,
    protein: !!t && t.protein > 0 && tot.p >= t.protein * 0.9,
    kcal: !!t && items.length > 0 && Math.abs(tot.kcal - t.kcal) <= t.kcal * 0.1,
    water: !!t && (entry.water || 0) >= t.water,
    train: sessions.length > 0,
    weigh: idx.weights.has(date),
  };
  const active = mealsLogged > 0 || q.train || q.weigh || (entry.water || 0) > 0;
  const perfect = q.meals && q.protein && q.kcal && q.water;
  const prs = idx.prs[date] ?? [];
  const assessments = idx.assessments[date] ?? [];
  return { date, q, tot, mealsLogged, active, perfect, prs, assessments, sessions, water: entry.water || 0 };
}

function dayXp(d, streak) {
  let xp = 0;
  for (const qq of DAILY_QUESTS) if (d.q[qq.key]) xp += qq.xp;
  if (d.perfect) xp += XP.perfect;
  xp += d.prs.length * XP.pr;
  for (const a of d.assessments) {
    xp += XP.assessment;
    if (a.photos?.length) xp += XP.photos;
  }
  if (d.active) xp += Math.min(streak, XP.streakCap) * XP.streakPerDay;
  return xp;
}

// --- Por semana -------------------------------------------------------------------

export function weekStatus(s, anyDay, days) {
  const ws = weekStart(anyDay);
  const list = Array.from({ length: 7 }, (_, i) => days[addDays(ws, i)]).filter(Boolean);
  const trainTarget = s.profile?.trainDays ?? 3;
  const trainCount = new Set(list.filter((d) => d.q.train).map((d) => d.date)).size;
  const proteinDays = list.filter((d) => d.q.protein).length;
  const diaryDays = list.filter((d) => d.mealsLogged > 0).length;
  const sets = weeklySets(s, ws);
  const volumeOk = BIG_GROUPS.filter((g) => sets[g] >= 10).length;
  return {
    weekStart: ws,
    trainTarget,
    progress: {
      trainDays: [trainCount, trainTarget],
      protein5: [proteinDays, 5],
      diary6: [diaryDays, 6],
      volume: [volumeOk, BIG_GROUPS.length],
    },
    done: {
      trainDays: trainCount >= trainTarget,
      protein5: proteinDays >= 5,
      diary6: diaryDays >= 6,
      volume: volumeOk === BIG_GROUPS.length,
    },
  };
}

// --- Conquistas ---------------------------------------------------------------------

export const ACHIEVEMENTS = [
  { id: 'w1', icon: '01', name: 'Primeiro treino', desc: 'Conclua 1 treino', xp: 50, test: (x) => x.workouts >= 1 },
  { id: 'w10', icon: '10', name: 'Rotina', desc: '10 treinos', xp: 100, test: (x) => x.workouts >= 10 },
  { id: 'w50', icon: '50', name: 'Rato de academia', desc: '50 treinos', xp: 300, test: (x) => x.workouts >= 50 },
  { id: 'w100', icon: 'C', name: 'Centurião', desc: '100 treinos', xp: 600, test: (x) => x.workouts >= 100 },
  { id: 'pr1', icon: 'PR', name: 'Recorde!', desc: 'Bata seu primeiro PR', xp: 50, test: (x) => x.prs >= 1 },
  { id: 'pr10', icon: 'PRx', name: 'Quebrando limites', desc: '10 PRs', xp: 150, test: (x) => x.prs >= 10 },
  { id: 'pr50', icon: 'MAX', name: 'Máquina de PR', desc: '50 PRs', xp: 500, test: (x) => x.prs >= 50 },
  { id: 's7', icon: '7D', name: 'Semana em chamas', desc: 'Sequência de 7 dias', xp: 100, test: (x) => x.bestStreak >= 7 },
  { id: 's30', icon: '30D', name: 'Hábito formado', desc: 'Sequência de 30 dias', xp: 400, test: (x) => x.bestStreak >= 30 },
  { id: 's100', icon: '100', name: 'Imparável', desc: 'Sequência de 100 dias', xp: 1000, test: (x) => x.bestStreak >= 100 },
  { id: 'd7', icon: 'KC', name: 'Diário em dia', desc: '7 dias com dieta registrada', xp: 100, test: (x) => x.diaryDays >= 7 },
  { id: 'd30', icon: 'KC+', name: 'Contador de macros', desc: '30 dias com dieta registrada', xp: 300, test: (x) => x.diaryDays >= 30 },
  { id: 'p7', icon: 'P', name: 'Proteína em dia', desc: 'Bata a proteína em 7 dias', xp: 100, test: (x) => x.proteinDays >= 7 },
  { id: 'p30', icon: 'P+', name: 'Anabólico natural', desc: 'Bata a proteína em 30 dias', xp: 300, test: (x) => x.proteinDays >= 30 },
  { id: 'pf1', icon: '★', name: 'Dia perfeito', desc: 'Refeições, proteína, kcal e água no mesmo dia', xp: 75, test: (x) => x.perfectDays >= 1 },
  { id: 'pf10', icon: '★★', name: 'Disciplina', desc: '10 dias perfeitos', xp: 300, test: (x) => x.perfectDays >= 10 },
  { id: 'a1', icon: 'BF', name: 'Ponto de partida', desc: 'Primeira avaliação física', xp: 50, test: (x) => x.assessments >= 1 },
  { id: 'a4', icon: 'BF4', name: 'Acompanhamento', desc: '4 avaliações físicas', xp: 200, test: (x) => x.assessments >= 4 },
  { id: 'ph', icon: 'IMG', name: 'Antes e depois', desc: 'Fotos em 2 avaliações', xp: 100, test: (x) => x.photoAssessments >= 2 },
  { id: 'v10', icon: '10T', name: '10 toneladas', desc: '10.000 kg de volume total', xp: 100, test: (x) => x.volume >= 10000 },
  { id: 'v100', icon: '100T', name: '100 toneladas', desc: '100.000 kg de volume total', xp: 300, test: (x) => x.volume >= 100000 },
  { id: 'v1000', icon: '1KT', name: 'Mil toneladas', desc: '1.000.000 kg de volume total', xp: 1000, test: (x) => x.volume >= 1000000 },
  { id: 'plan', icon: 'PLN', name: 'Estrategista', desc: 'Gere um plano alimentar', xp: 50, test: (x) => x.hasPlan },
  { id: 'goal1', icon: 'OBJ', name: 'Missão cumprida', desc: 'Conclua um objetivo pessoal', xp: 100, test: (x) => x.goalsDone >= 1 },
  { id: 'c1', icon: 'CRD', name: 'Coração em dia', desc: 'Registre a 1ª atividade aeróbica', xp: 50, test: (x) => x.cardioCount >= 1 },
  { id: 'c25', icon: 'C25', name: 'Cardio constante', desc: '25 atividades aeróbicas', xp: 250, test: (x) => x.cardioCount >= 25 },
  { id: 'r5', icon: '5K', name: 'Primeiros 5 km', desc: 'Corra 5 km numa atividade', xp: 100, test: (x) => x.longestRun >= 5 },
  { id: 'r10', icon: '10K', name: 'Dez mil', desc: 'Corra 10 km numa atividade', xp: 200, test: (x) => x.longestRun >= 10 },
  { id: 'r21', icon: '21K', name: 'Meia maratona', desc: 'Corra 21,1 km numa atividade', xp: 500, test: (x) => x.longestRun >= 21.0975 },
  { id: 'k100', icon: '100K', name: 'Estradeiro', desc: '100 km somando corrida, bike, etc.', xp: 300, test: (x) => x.cardioKm >= 100 },
  { id: 'wq', icon: 'WK', name: 'Semana completa', desc: 'Todas as missões de uma semana', xp: 250, test: (x) => x.fullWeeks >= 1 },
];

// --- Agregado -----------------------------------------------------------------------

const cache = new WeakMap();

export function computeGame(s, today = dateKey()) {
  const hit = cache.get(s);
  if (hit && hit.today === today) return hit.result;

  const idx = indexByDate(s);
  const t = targets(s);
  const dates = [
    s.profile?.createdAt ? dateKey(new Date(s.profile.createdAt)) : today,
    ...Object.keys(s.diary),
    ...Object.keys(idx.sessions),
    ...s.weights.map((w) => w.date),
    ...s.assessments.map((a) => a.date),
  ].filter((d) => d <= today);
  const start = dates.sort()[0] ?? today;

  const days = {};
  const xpByDay = {};
  let streak = 0;
  let bestStreak = 0;
  let totalXp = 0;
  const n = diffDays(today, start);
  for (let i = 0; i <= n; i++) {
    const date = addDays(start, i);
    const d = dayStatus(s, date, idx, t);
    streak = d.active ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
    d.streak = streak;
    days[date] = d;
    xpByDay[date] = dayXp(d, streak);
    totalXp += xpByDay[date];
  }
  // Sequência atual: hoje ainda não registrado não quebra a sequência de ontem.
  const currentStreak = days[today]?.active ? days[today].streak : days[addDays(today, -1)]?.streak ?? 0;

  // Semanas
  let fullWeeks = 0;
  const weeks = {};
  for (let ws = weekStart(start); ws <= today; ws = addDays(ws, 7)) {
    const w = weekStatus(s, ws, days);
    weeks[ws] = w;
    let wxp = 0;
    for (const q of WEEKLY_QUESTS) if (w.done[q.key]) wxp += q.xp;
    if (WEEKLY_QUESTS.every((q) => w.done[q.key])) fullWeeks++;
    w.xp = wxp;
    totalXp += wxp;
  }

  // Objetivos
  const goalsDone = s.goals.filter((g) => g.completedAt).length;
  totalXp += goalsDone * XP.goal;

  // Conquistas
  const fs = finishedSessions(s);
  const dayList = Object.values(days);
  const facts = {
    workouts: fs.length,
    prs: allPRs(s).length,
    bestStreak,
    diaryDays: dayList.filter((d) => d.mealsLogged > 0).length,
    proteinDays: dayList.filter((d) => d.q.protein).length,
    perfectDays: dayList.filter((d) => d.perfect).length,
    assessments: s.assessments.length,
    photoAssessments: s.assessments.filter((a) => a.photos?.length).length,
    volume: fs.reduce((a, x) => a + sessionStats(s, x).volume, 0),
    hasPlan: !!s.dietPlan,
    goalsDone,
    fullWeeks,
    cardioCount: cardioSessions(s).length,
    cardioKm: cardioTotals(cardioSessions(s)).km,
    longestRun: Math.max(0, ...cardioSessions(s, 'run').map((x) => Number(x.cardio?.distance) || 0)),
  };
  const achievements = ACHIEVEMENTS.map((a) => ({ ...a, unlocked: a.test(facts) }));
  totalXp += achievements.filter((a) => a.unlocked).reduce((acc, a) => acc + a.xp, 0);

  const result = {
    totalXp,
    level: levelInfo(totalXp),
    streak: currentStreak,
    bestStreak,
    days,
    xpByDay,
    weeks,
    today: days[today],
    thisWeek: weeks[weekStart(today)],
    achievements,
    facts,
  };
  cache.set(s, { today, result });
  return result;
}
