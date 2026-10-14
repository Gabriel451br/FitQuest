import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unitsFor, unitText } from '../js/data/units.js';
import { getFood } from '../js/foods.js';

const u = (id) => unitsFor(getFood(id));

test('medidas caseiras por nome (TACO intacta)', () => {
  assert.deepEqual(u(488).units[0], { label: 'ovo', plural: 'ovos', g: 50 });
  assert.equal(u(488).preferred, true);
  assert.equal(u(53).units[0].label, 'pão');
  assert.equal(u(3).units[0].label, 'colher de sopa');
  assert.equal(u(3).preferred, false);
  assert.equal(u(561).units[0].label, 'concha');
  assert.equal(u(182).units[0].g, 70);
  assert.equal(u(179).units[0].g, 100);
  assert.equal(u(9003).units[0].label, 'scoop');
  assert.equal(u(326).units[0].label, 'colher de sopa'); // carne moída não vira "bife"
  assert.equal(u(410).units[0].label, 'filé médio');
  assert.equal(u(9001).units[0].label, 'copo (200 ml)');
  assert.equal(u(456).units.length > 0 && u(456).units[0].label, 'colher de sopa'); // leite em pó
  assert.equal(u(463).units[0].label, 'fatia');
  // TACO não mudou: ovo cozido continua por 100 g
  assert.equal(getFood(488).kcal, 146);
});

test('alimento personalizado com porção e texto', () => {
  const r = unitsFor({ id: 'c-1', custom: true, name: 'Marmita', serving: 420 });
  assert.deepEqual(r.units[0], { label: 'porção', plural: 'porções', g: 420 });
  assert.equal(unitText(2, { label: 'ovo', plural: 'ovos' }), '2 ovos');
  assert.equal(unitText(0.5, { label: 'banana', plural: 'bananas' }), '½ banana');
  assert.equal(unitText(1.5, { label: 'concha', plural: 'conchas' }), '1,5 conchas');
});
