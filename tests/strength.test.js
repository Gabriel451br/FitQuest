import { test } from 'node:test';
import assert from 'node:assert/strict';
import { oneRmEstimates, repsAtPct, brzycki } from '../js/calc.js';
import { isWorking, setKind, oneRmRef } from '../js/training.js';
import { migrate, emptyState, intensityFor } from '../js/selectors.js';

test('calculadora de 1RM', () => {
  const e = oneRmEstimates(100, 5);
  assert.equal(e.epley, 116.7);
  assert.equal(brzycki(100, 5), 112.5);
  assert.ok(e.avg > 110 && e.avg < 118);
  assert.equal(repsAtPct(100), 1);
  assert.equal(repsAtPct(75), 10);
});

test('tipos de série: aquecimento não conta, drop conta', () => {
  assert.equal(isWorking({ done: true, reps: 10, kind: 'warmup' }), false);
  assert.equal(isWorking({ done: true, reps: 10, warmup: true }), false);
  assert.equal(isWorking({ done: true, reps: 10, kind: 'drop' }), true);
  assert.equal(setKind({}), 'work');
});

test('migração das opções antigas de RPE/%RM', () => {
  assert.equal(migrate({ settings: { showPct: true } }).settings.intensity, 'pct');
  assert.equal(migrate({ settings: { showRpe: false } }).settings.intensity, 'none');
  assert.equal(migrate({ settings: { showRpe: true } }).settings.intensity, 'rpe');
  assert.equal(migrate({}).settings.intensity, 'rpe');
});

test('intensidade e 1RM por exercício', () => {
  const s = emptyState();
  s.exerciseSettings = { agachamento: { intensity: 'pct', oneRm: 150 } };
  assert.equal(intensityFor(s, 'agachamento'), 'pct');
  assert.equal(intensityFor(s, 'supino-reto'), 'rpe');
  assert.equal(oneRmRef(s, 'agachamento'), 150);
});

import { routineFromSession } from '../js/training.js';

test('sessão → rotina: séries válidas, faixa de reps, sem aquecimento', () => {
  const ses = { exercises: [
    { exId: 'supino', rest: 120, sets: [
      { kg: 40, reps: 12, done: true, kind: 'warmup' },
      { kg: 80, reps: 10, done: true, kind: 'work' },
      { kg: 80, reps: 8, done: true, kind: 'work' },
      { kg: 80, reps: 9, done: true, kind: 'drop' },
      { kg: null, reps: null, done: false, kind: 'work' },
    ] },
    { exId: 'rosca', sets: [{ kg: 14, reps: 12, done: true }, { kg: 14, reps: 12, done: true }] },
    { exId: 'novo', target: '6-8', sets: [{ done: false }, { done: false }] },
  ] };
  assert.deepEqual(routineFromSession(ses), [
    { exId: 'supino', sets: 3, reps: '8-10', rest: 120 },
    { exId: 'rosca', sets: 2, reps: '12', rest: 90 },
    { exId: 'novo', sets: 2, reps: '6-8', rest: 90 },
  ]);
});
