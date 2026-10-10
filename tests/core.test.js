import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bfNavy, bfRfm, macroTargets, e1rm, loadForPct, bmr } from '../js/calc.js';
import { generatePlan, solvePortions } from '../js/dietgen.js';
import { sumMacros, searchFoods } from '../js/foods.js';
import { computeGame, levelInfo, xpForLevel } from '../js/game.js';
import { computePRs, weeklySets, suggestNext } from '../js/training.js';
import { emptyState } from '../js/selectors.js';
import { dateKey, addDays, weekStart } from '../js/util.js';

test('BF Marinha e RFM em faixas plausíveis', () => {
  const m = bfNavy({ sex: 'M', height: 178, neck: 38, waist: 85 });
  assert.ok(m > 12 && m < 20, `navy M ${m}`);
  const f = bfNavy({ sex: 'F', height: 165, neck: 32, waist: 72, hip: 98 });
  assert.ok(f > 22 && f < 32, `navy F ${f}`);
  assert.equal(bfNavy({ sex: 'F', height: 165, neck: 32, waist: 72 }), null);
  assert.ok(bfRfm({ sex: 'M', height: 178, waist: 85 }) > 15);
});

test('TMB Mifflin e Katch', () => {
  assert.equal(bmr({ sex: 'M', kg: 80, height: 180, ageYears: 30 }), 1780);
  assert.equal(bmr({ sex: 'M', kg: 80, bf: 20 }), Math.round(370 + 21.6 * 64));
});

test('metas de macros fecham as calorias', () => {
  const t = macroTargets({ sex: 'M', kg: 80, height: 178, ageYears: 30, bf: null, activity: 'moderado', goal: 'cut' });
  const k = t.protein * 4 + t.carbs * 4 + t.fat * 9;
  assert.ok(Math.abs(k - t.kcal) < 15, `${k} vs ${t.kcal}`);
  assert.ok(t.kcal < t.tdee);
});

test('1RM e %RM', () => {
  assert.equal(e1rm(100, 1), 100);
  assert.equal(e1rm(100, 10), 133.3);
  assert.equal(e1rm(100, 8, 8), e1rm(100, 10));
  assert.equal(loadForPct(80, 100), 80);
});

test('solver respeita limites e aproxima meta', () => {
  const r = solvePortions([{ foodId: 410, min: 50, max: 300 }, { foodId: 3, min: 50, max: 500 }, { foodId: 260, min: 0, max: 30 }], { p: 40, c: 60, f: 15 });
  const t = sumMacros(r);
  assert.ok(Math.abs(t.p - 40) < 5 && Math.abs(t.c - 60) < 8 && Math.abs(t.f - 15) < 4, JSON.stringify(t));
});

test('plano automático onívoro chega perto das metas', () => {
  const target = { kcal: 2200, protein: 170, carbs: 240, fat: 62 };
  const p = generatePlan(target, { meals: 5 }, 7);
  assert.equal(p.meals.length, 5);
  assert.ok(Math.abs(p.totals.p - 170) / 170 < 0.1, `p ${p.totals.p}`);
  assert.ok(Math.abs(p.totals.c - 240) / 240 < 0.1, `c ${p.totals.c}`);
});

test('plano vegano não usa carne/ovo/laticínio', () => {
  const p = generatePlan({ kcal: 2000, protein: 120, carbs: 230, fat: 60 }, { meals: 4, vegan: true }, 3);
  const banned = new Set([410, 377, 346, 398, 301, 318, 488, 9008, 9006, 449, 469, 9003, 9001]);
  for (const m of p.meals) for (const it of m.items) assert.ok(!banned.has(it.foodId), `item ${it.foodId}`);
});

test('busca ignora acentos', () => {
  assert.ok(searchFoods('feijao preto cozido')[0].name.startsWith('Feijão, preto'));
});

function sessionState() {
  const s = emptyState();
  const today = dateKey();
  s.profile = { name: 'T', sex: 'M', birthYear: 1990, height: 180, activity: 'moderado', goal: 'maintain', trainDays: 3, startWeight: 80, createdAt: Date.now() - 3 * 86400000 };
  const mk = (d, kg) => ({ id: d, date: d, name: 'A', startedAt: 1, finishedAt: 2, exercises: [{ exId: 'supino-reto', sets: [{ kg, reps: 8, done: true }, { kg, reps: 8, done: true }] }] });
  s.sessions = [mk(addDays(today, -2), 80), mk(addDays(today, -1), 85)];
  return { s, today };
}

test('PR detectado só quando supera o melhor anterior', () => {
  const { s } = sessionState();
  const prs = computePRs(s);
  assert.equal(prs.length, 1);
  assert.equal(prs[0].exId, 'supino-reto');
});

test('volume semanal conta secundários pela metade', () => {
  const { s, today } = sessionState();
  const w = weeklySets(s, today);
  const inWeek = s.sessions.filter((x) => weekStart(x.date) === weekStart(today)).length;
  assert.equal(w.peito, 2 * inWeek);
  assert.equal(w.triceps, 1 * inWeek);
});

test('dupla progressão sugere subir carga ao bater o topo', () => {
  const last = { topKg: 60, sets: [{ kg: 60, reps: 12 }, { kg: 60, reps: 12 }] };
  assert.equal(suggestNext(last, '8-12').kg, 62.5);
  assert.equal(suggestNext({ topKg: 60, sets: [{ kg: 60, reps: 10 }] }, '8-12').kg, 60);
});

test('XP derivado: treino conta e é estável', () => {
  const { s, today } = sessionState();
  const g = computeGame(s, today);
  assert.ok(g.totalXp >= 200 + 25);
  assert.equal(computeGame(structuredClone(s), today).totalXp, g.totalXp);
  assert.equal(g.streak, 2);
});

test('curva de níveis', () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(xpForLevel(5)).level, 5);
});
