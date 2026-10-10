import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration, fmtDuration, rateText, estimateKcal, cardioPRs, cardioWeek } from '../js/cardio.js';
import { computeGame } from '../js/game.js';
import { emptyState } from '../js/selectors.js';
import { dateKey, addDays } from '../js/util.js';

test('duração: parse e formato', () => {
  assert.equal(parseDuration('45'), 2700);
  assert.equal(parseDuration('32:15'), 1935);
  assert.equal(parseDuration('1:02:03'), 3723);
  assert.equal(parseDuration('abc'), null);
  assert.equal(fmtDuration(3723), '1:02:03');
  assert.equal(fmtDuration(1935), '32:15');
});

test('ritmo por atividade', () => {
  assert.equal(rateText('run', 5, 1500), '5:00 /km');
  assert.equal(rateText('bike', 30, 3600), '30,0 km/h');
  assert.equal(rateText('swim', 1, 1200), '2:00 /100m');
  assert.equal(rateText('hiit', 0, 600), null);
});

test('kcal estimada', () => {
  assert.equal(estimateKcal('run', { distance: 10, duration: 3000 }, 70), 700);
  assert.equal(estimateKcal('hiit', { duration: 1800 }, 80), 320);
});

function runState() {
  const s = emptyState();
  const t = dateKey();
  s.profile = { name: 'R', sex: 'M', birthYear: 1990, height: 175, activity: 'moderado', goal: 'maintain', trainDays: 3, startWeight: 70, createdAt: Date.now() - 5 * 86400000 };
  const run = (d, km, sec) => ({ id: d, type: 'run', date: d, name: 'Corrida', startedAt: 1, finishedAt: 2, exercises: [], cardio: { distance: km, duration: sec } });
  s.sessions = [run(addDays(t, -3), 5, 1650), run(addDays(t, -1), 6, 1800)];
  return { s, t };
}

test('PRs de corrida: distância e pace', () => {
  const { s } = runState();
  const prs = cardioPRs(s);
  assert.equal(prs.length, 2);
  assert.deepEqual(prs.map((p) => p.kind).sort(), ['dist', 'rate']);
});

test('cardio conta como treino no XP e semana', () => {
  const { s, t } = runState();
  const g = computeGame(s, t);
  assert.ok(g.days[addDays(t, -1)].q.train);
  assert.ok(g.achievements.find((a) => a.id === 'r5').unlocked);
  assert.ok(g.facts.prs >= 2);
  const w = cardioWeek(s, 'run', addDays(t, -1));
  assert.ok(w.count >= 1);
});
