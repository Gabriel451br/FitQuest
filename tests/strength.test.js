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
