import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan, adaptTemplate, candidates, houseMeasure } from '../js/dietgen.js';
import { MENU_TEMPLATES, FOOD_TAGS } from '../js/data/menus.js';
import { getFood } from '../js/foods.js';
import { parseScan, fromOpenFoodFacts } from '../js/barcode.js';

const T = { kcal: 2200, protein: 170, carbs: 240, fat: 62 };

test('todos os alimentos dos cardápios existem', () => {
  for (const t of MENU_TEMPLATES) for (const [id] of t.items) assert.ok(getFood(id), `${t.id}: alimento ${id}`);
});

test('plano usa cardápios com 3 opções e bate a meta (onívoro)', () => {
  const p = generatePlan(T, { meals: 5 }, 11);
  assert.equal(p.meals.length, 5);
  for (const m of p.meals) assert.ok(m.options.length >= 2 && m.name, m.key);
  assert.ok(Math.abs(p.totals.p - T.protein) / T.protein < 0.1, `p ${p.totals.p}`);
  assert.ok(Math.abs(p.totals.kcal - T.kcal) / T.kcal < 0.1, `kcal ${p.totals.kcal}`);
});

test('restrições: vegano e sem glúten nunca recebem alimento proibido', () => {
  for (const a of [{ meals: 5, vegan: true }, { meals: 6, glutenFree: true, lactoseFree: true }]) {
    const p = generatePlan(T, a, 3);
    const ban = a.vegan ? ['carne', 'peixe', 'ovo', 'lactose'] : ['gluten', 'lactose'];
    for (const m of p.meals) for (const o of m.options) for (const it of o.items) {
      assert.ok(!(FOOD_TAGS[it.foodId] ?? []).some((t) => ban.includes(t)), `${o.name}: ${it.foodId}`);
    }
  }
});

test('alimento excluído sai do complemento ou descarta a opção', () => {
  const t = MENU_TEMPLATES.find((x) => x.id === 'pf-frango-arroz-feijao');
  assert.equal(adaptTemplate(t, { excluded: [410] }), null);
  assert.ok(!adaptTemplate(t, { excluded: [78] }).items.some((i) => i[0] === 78));
  assert.ok(candidates('almoco', { excluded: [410] }).every((c) => !c.items.some((i) => i[0] === 410)));
});

test('medidas caseiras', () => {
  assert.equal(houseMeasure(488, 100), '2 ovos');
  assert.equal(houseMeasure(53, 50), '1 pão francês');
  assert.equal(houseMeasure(3, 150), null);
});

test('leitura de código: EAN, URL, QR com JSON', () => {
  assert.deepEqual(parseScan('7891000100103'), { code: '7891000100103' });
  assert.deepEqual(parseScan('https://br.openfoodfacts.org/produto/7896004000855/x'), { code: '7896004000855' });
  assert.equal(parseScan('{"name":"Barra","kcal":200,"p":20,"c":15,"f":7}').food.p, 20);
  assert.equal(parseScan('abc'), null);
});

test('Open Food Facts → valores por 100 g', () => {
  const r = fromOpenFoodFacts('123', { status: 1, product: { product_name: 'Iogurte', brands: 'Marca X', serving_quantity: 170, nutriments: { 'energy-kcal_100g': 61, proteins_100g: 9.4, carbohydrates_100g: 4.1, fat_100g: 0.5, sodium_100g: 0.05 } } });
  assert.equal(r.name, 'Iogurte — Marca X');
  assert.equal(r.p, 9.4);
  assert.equal(r.sodium, 50);
  assert.equal(r.serving, 170);
  assert.equal(fromOpenFoodFacts('1', { status: 0 }), null);
});
