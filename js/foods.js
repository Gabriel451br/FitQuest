// Acesso unificado aos alimentos: TACO + complementares + personalizados.
import { TACO, EXTRA_FOODS, TACO_CATEGORIES } from './data/taco.js';
import { normalize } from './util.js';

const toFood = ([id, name, cat, kcal, p, c, f, fiber, sodium], extra = false) => ({
  id, name, cat, kcal, p, c, f, fiber, sodium, extra, n: normalize(name),
});

const BASE = new Map();
for (const r of TACO) BASE.set(r[0], toFood(r));
for (const r of EXTRA_FOODS) BASE.set(r[0], toFood(r, true));

let custom = new Map();

export function setCustomFoods(list = []) {
  custom = new Map(list.map((f) => [f.id, { ...f, custom: true, n: normalize(f.name) }]));
}

export function getFood(id) {
  return custom.get(id) ?? BASE.get(id) ?? null;
}

export function allFoods() {
  return [...custom.values(), ...BASE.values()];
}

export function categoryName(cat) {
  return TACO_CATEGORIES[cat - 1] ?? 'Personalizado';
}

// Busca por termos (todas as palavras precisam aparecer), priorizando início do nome.
export function searchFoods(q, { limit = 40, cat = null } = {}) {
  const terms = normalize(q).split(/[\s,]+/).filter(Boolean);
  let list = allFoods();
  if (cat) list = list.filter((f) => f.cat === cat);
  if (!terms.length) return list.slice(0, limit);
  const scored = [];
  for (const f of list) {
    if (!terms.every((t) => f.n.includes(t))) continue;
    let s = f.n.startsWith(terms[0]) ? 0 : 10;
    s += f.n.length / 100;
    if (f.n.includes(' cru')) s += 0.5; // prioriza preparados em empate
    scored.push([s, f]);
  }
  scored.sort((a, b) => a[0] - b[0]);
  return scored.slice(0, limit).map((x) => x[1]);
}

export function macrosFor(foodOrId, grams) {
  const f = typeof foodOrId === 'object' ? foodOrId : getFood(foodOrId);
  const k = (Number(grams) || 0) / 100;
  if (!f) return { kcal: 0, p: 0, c: 0, f: 0, fiber: 0 };
  return { kcal: f.kcal * k, p: f.p * k, c: f.c * k, f: f.f * k, fiber: (f.fiber || 0) * k };
}

export function sumMacros(items) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, fiber: 0 };
  for (const it of items) {
    const m = macrosFor(it.foodId, it.g);
    t.kcal += m.kcal; t.p += m.p; t.c += m.c; t.f += m.f; t.fiber += m.fiber;
  }
  return t;
}
