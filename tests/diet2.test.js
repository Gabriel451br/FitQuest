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

import { DIET_STYLES, foodTags, effectiveTarget } from '../js/dietgen.js';
import { RECIPES } from '../js/data/recipes.js';

test('todo cardápio tem receita, tempo e estilo', () => {
  for (const t of MENU_TEMPLATES) {
    const r = RECIPES[t.id];
    assert.ok(r && r.recipe.length && r.time > 0 && Array.isArray(r.tags), t.id);
  }
});

test('estilos: vegetariano/vegano nunca recebem carne/peixe (inclusive opções)', () => {
  for (const style of ['vegetariana', 'vegana']) {
    for (const seed of [1, 2, 3]) {
      const p = generatePlan(T, { style, goal: 'cut', meals: 5 }, seed);
      for (const m of p.meals) for (const o of m.options) for (const it of o.items) {
        const tags = foodTags(it.foodId);
        assert.ok(!tags.includes('carne') && !tags.includes('peixe'), `${style}: ${o.name} → ${it.foodId}`);
        if (style === 'vegana') assert.ok(!tags.includes('ovo') && !tags.includes('lactose'), `vegana: ${o.name} → ${it.foodId}`);
      }
    }
  }
});

test('low carb: carboidrato reduzido e cardápios low carb', () => {
  const eff = effectiveTarget(T, { style: 'lowcarb' });
  assert.ok(eff.carbs < 100 && eff.fat > T.fat);
  const p = generatePlan(T, { style: 'lowcarb', goal: 'cut', meals: 4, trainTime: 'tarde' }, 7);
  assert.ok(p.totals.c < 110, `c ${p.totals.c}`);
  assert.ok(Math.abs(p.totals.p - T.protein) / T.protein < 0.1, `p ${p.totals.p}`);
  assert.ok(p.meals.every((m) => m.options[0].tags.includes('lowcarb')), 'opção principal low carb');
});

test('treino e objetivo: pré/pós-treino marcados, notas, sem proteína repetida no almoço e jantar', () => {
  const p = generatePlan(T, { style: 'tradicional', goal: 'cut', meals: 5, trainTime: 'noite', kg: 80 }, 5);
  assert.equal(p.meals.find((m) => m.key === 'jantar').badge, 'Pós-treino');
  assert.equal(p.meals.find((m) => m.key === 'lanche2').badge, 'Pré-treino');
  assert.ok(p.notes.why.length >= 3 && p.notes.tips.length >= 2);
  const mainProt = (k) => MENU_TEMPLATES.find((t) => t.id === p.meals.find((m) => m.key === k).options[0].templateId).items.find((i) => i[1] === 'p')[0];
  assert.notEqual(mainProt('almoco'), mainProt('jantar'));
  assert.ok(p.version === 3 && p.meals.every((m) => m.when));
  assert.ok(Object.keys(DIET_STYLES).length >= 8);
});

test('sem tempo para cozinhar: só preparos rápidos na opção principal', () => {
  const p = generatePlan(T, { style: 'pratica', cookTime: 'none', meals: 4 }, 9);
  assert.ok(p.meals.every((m) => m.options[0].time <= 15), p.meals.map((m) => m.options[0].time).join(','));
});

import { macroTargets } from '../js/calc.js';
import { sumMacros } from '../js/foods.js';

test('precisão: plano e trocas de opção ficam dentro das metas', () => {
  const errs = [];
  let n = 0;
  for (const sex of ['M', 'F']) for (const kg of [62, 85]) for (const goal of ['cut', 'maintain', 'bulk']) for (const style of Object.keys(DIET_STYLES)) for (const meals of [3, 5]) {
    n++;
    const T = macroTargets({ sex, kg, height: sex === 'M' ? 178 : 165, ageYears: 30, activity: 'moderado', goal });
    const p = generatePlan(T, { style, meals, goal, trainTime: ['manha', 'tarde', 'noite', 'nao'][n % 4] }, n);
    const t = p.target;
    const combos = [p.meals.map((m) => m.options[0].items)];
    p.meals.forEach((m, mi) => m.options.slice(1).forEach((o) => combos.push(p.meals.map((mm, j) => (j === mi ? o.items : mm.options[0].items)))));
    for (const c of combos) {
      const tot = sumMacros(c.flat());
      errs.push(Math.max(Math.abs(tot.kcal - t.kcal) / t.kcal, Math.abs(tot.p - t.protein) / t.protein, Math.abs(tot.c - t.carbs) / t.carbs, Math.abs(tot.f - t.fat) / t.fat));
      // vegano/vegetariano: nem os complementos da Nutri trazem alimento proibido
      if (style === 'vegana') for (const it of c.flat()) assert.ok(!foodTags(it.foodId).some((x) => ['carne', 'peixe', 'ovo', 'lactose'].includes(x)), `vegana: ${it.foodId}`);
    }
  }
  errs.sort((a, b) => a - b);
  const med = errs[Math.floor(errs.length / 2)];
  const p90 = errs[Math.floor(errs.length * 0.9)];
  assert.ok(med < 0.035, `mediana ${med}`);
  assert.ok(p90 < 0.08, `p90 ${p90}`);
});
