// Gerador automático de plano alimentar: escolhe cardápios reais da base
// (data/menus.js) conforme restrições e gostos e ajusta só as quantidades.
import { getFood, sumMacros } from './foods.js';
import { MENU_TEMPLATES, HOUSE_UNITS, FOOD_TAGS } from './data/menus.js';

// Grupos de alimentos por papel. ids da TACO (9xxx = complementares).
export const POOLS = {
  protein_main: [
    { id: 410, label: 'Peito de frango grelhado', tags: [], min: 80, max: 300 },
    { id: 377, label: 'Patinho grelhado', tags: [], min: 80, max: 300 },
    { id: 346, label: 'Contra-filé s/ gordura grelhado', tags: [], min: 80, max: 300 },
    { id: 398, label: 'Coxa de frango s/ pele', tags: [], min: 80, max: 300 },
    { id: 301, label: 'Merluza assada', tags: ['peixe'], min: 100, max: 350 },
    { id: 318, label: 'Sardinha assada', tags: ['peixe'], min: 80, max: 250 },
    { id: 488, label: 'Ovo cozido', tags: ['ovo', 'veg', 'vegonly'], min: 50, max: 250 },
    { id: 584, label: 'Tofu', tags: ['veg', 'vegano', 'vegonly'], min: 100, max: 500 },
  ],
  protein_light: [
    { id: 488, label: 'Ovo cozido', tags: ['ovo', 'veg'], min: 50, max: 200 },
    { id: 9008, label: 'Clara pasteurizada', tags: ['ovo', 'veg'], min: 60, max: 300 },
    { id: 9006, label: 'Iogurte grego zero', tags: ['lactose', 'veg'], min: 100, max: 500 },
    { id: 449, label: 'Iogurte natural desnatado', tags: ['lactose', 'veg'], min: 100, max: 400 },
    { id: 469, label: 'Ricota', tags: ['lactose', 'veg'], min: 30, max: 150 },
    { id: 9003, label: 'Whey protein', tags: ['lactose', 'veg', 'suplemento'], min: 15, max: 60 },
    { id: 584, label: 'Tofu', tags: ['veg', 'vegano', 'vegonly'], min: 80, max: 300 },
  ],
  carb_main: [
    { id: 3, label: 'Arroz branco cozido', tags: [], min: 50, max: 500 },
    { id: 1, label: 'Arroz integral cozido', tags: [], min: 50, max: 500 },
    { id: 88, label: 'Batata-doce cozida', tags: [], min: 80, max: 500 },
    { id: 91, label: 'Batata inglesa cozida', tags: [], min: 80, max: 500 },
    { id: 129, label: 'Mandioca cozida', tags: [], min: 60, max: 350 },
    { id: 40, label: 'Macarrão (peso cru)', tags: ['gluten'], min: 30, max: 150 },
  ],
  carb_breakfast: [
    { id: 52, label: 'Pão integral de forma', tags: ['gluten'], min: 25, max: 150 },
    { id: 53, label: 'Pão francês', tags: ['gluten'], min: 25, max: 150 },
    { id: 7, label: 'Aveia em flocos', tags: ['gluten'], min: 15, max: 100 },
    { id: 9005, label: 'Tapioca (goma)', tags: [], min: 20, max: 120 },
    { id: 533, label: 'Cuscuz de milho', tags: [], min: 50, max: 300 },
  ],
  fruit: [
    { id: 182, label: 'Banana prata', tags: [], min: 50, max: 250 },
    { id: 222, label: 'Maçã Fuji', tags: [], min: 80, max: 250 },
    { id: 225, label: 'Mamão formosa', tags: [], min: 100, max: 350 },
    { id: 239, label: 'Morango', tags: [], min: 80, max: 300 },
    { id: 214, label: 'Laranja pêra', tags: [], min: 100, max: 300 },
  ],
  fat: [
    { id: 260, label: 'Azeite extra virgem', tags: [], min: 0, max: 25 },
    { id: 9004, label: 'Pasta de amendoim', tags: ['amendoim'], min: 0, max: 40 },
    { id: 589, label: 'Castanha-do-pará', tags: ['castanha'], min: 0, max: 30 },
    { id: 163, label: 'Abacate', tags: [], min: 0, max: 150 },
  ],
  legume: [
    { id: 561, label: 'Feijão carioca cozido', tags: [], min: 80, max: 80 },
    { id: 567, label: 'Feijão preto cozido', tags: [], min: 80, max: 80 },
    { id: 577, label: 'Lentilha cozida', tags: [], min: 80, max: 80 },
  ],
  veg: [
    { id: 100, label: 'Brócolis cozido', tags: [], min: 100, max: 100 },
    { id: 78, label: 'Alface crespa', tags: [], min: 50, max: 50 },
    { id: 157, label: 'Tomate', tags: [], min: 80, max: 80 },
    { id: 109, label: 'Cenoura cozida', tags: [], min: 80, max: 80 },
    { id: 70, label: 'Abobrinha cozida', tags: [], min: 100, max: 100 },
  ],
  dairy: [
    { id: 9001, label: 'Leite integral', tags: ['lactose', 'veg'], min: 0, max: 300 },
    { id: 582, label: 'Bebida de soja', tags: ['veg', 'vegano', 'vegonly'], min: 0, max: 300 },
  ],
};

// Estrutura das refeições por quantidade/dia: [chave do diário, tipo, peso calórico]
const LAYOUTS = {
  3: [['cafe', 'breakfast', 0.3], ['almoco', 'main', 0.4], ['jantar', 'main', 0.3]],
  4: [['cafe', 'breakfast', 0.25], ['almoco', 'main', 0.35], ['lanche2', 'snack', 0.15], ['jantar', 'main', 0.25]],
  5: [['cafe', 'breakfast', 0.22], ['lanche1', 'snack', 0.1], ['almoco', 'main', 0.3], ['lanche2', 'snack', 0.13], ['jantar', 'main', 0.25]],
  6: [['cafe', 'breakfast', 0.2], ['lanche1', 'snack', 0.1], ['almoco', 'main', 0.28], ['lanche2', 'snack', 0.12], ['jantar', 'main', 0.22], ['ceia', 'supper', 0.08]],
};

// Restrições → tags proibidas.
function bannedTags(a) {
  const b = new Set();
  if (a.vegetarian) ['carne', 'peixe'].forEach((t) => b.add(t));
  if (a.vegan) ['carne', 'peixe', 'ovo', 'lactose'].forEach((t) => b.add(t));
  if (a.lactoseFree) b.add('lactose');
  if (a.glutenFree) b.add('gluten');
  if (a.noFish) b.add('peixe');
  if (a.noSupplements) b.add('suplemento');
  if (a.nutAllergy) ['amendoim', 'castanha'].forEach((t) => b.add(t));
  return b;
}

const MEAT_IDS = new Set([410, 377, 346, 398]);

export function allowed(pool, a, excluded = []) {
  const ban = bannedTags(a);
  const ex = new Set(excluded);
  return POOLS[pool].filter((o) => {
    if (ex.has(o.id)) return false;
    const preferred = (a.preferredProteins ?? []).includes(o.id) || a.lactoseFree;
    if (o.tags.includes('vegonly') && !(a.vegetarian || a.vegan) && !preferred) return false;
    if ((a.vegetarian || a.vegan) && MEAT_IDS.has(o.id)) return false;
    if (a.vegan && !o.tags.includes('vegano') && (pool.startsWith('protein') || pool === 'dairy')) return false;
    return !o.tags.some((t) => ban.has(t));
  });
}

// Resolve gramas minimizando o erro ponderado de macros (kcal de cada macro).
// items: [{ foodId, min, max, fixed? }] ; target: { p, c, f }
export function solvePortions(items, target, iterations = 200) {
  const rows = items.map((it) => {
    const fd = getFood(it.foodId);
    return [fd.p / 100, fd.c / 100, fd.f / 100];
  });
  const w = [4, 4, 9]; // pondera pelo valor calórico de cada macro
  const goal = [target.p, target.c, target.f];
  const x = items.map((it) => (it.fixed ? it.min : (it.min + it.max) / 4));
  const cur = [0, 0, 0];
  const recompute = () => {
    cur.fill(0);
    rows.forEach((r, i) => r.forEach((v, k) => (cur[k] += v * x[i])));
  };
  recompute();
  for (let it = 0; it < iterations; it++) {
    let moved = 0;
    for (let i = 0; i < items.length; i++) {
      if (items[i].fixed) continue;
      const r = rows[i];
      let num = 0;
      let den = 0;
      for (let k = 0; k < 3; k++) {
        const resid = goal[k] - (cur[k] - r[k] * x[i]);
        num += w[k] * w[k] * r[k] * resid;
        den += w[k] * w[k] * r[k] * r[k];
      }
      if (den === 0) continue;
      const nx = Math.min(items[i].max, Math.max(items[i].min, num / den));
      const delta = nx - x[i];
      if (Math.abs(delta) > 1e-6) {
        for (let k = 0; k < 3; k++) cur[k] += r[k] * delta;
        x[i] = nx;
        moved += Math.abs(delta);
      }
    }
    if (moved < 0.01) break;
  }
  return items.map((it, i) => ({ foodId: it.foodId, g: roundPortion(x[i], it) }));
}

function roundPortion(g, it) {
  const step = it.max <= 60 ? 5 : 10;
  return Math.min(it.max, Math.max(it.min, Math.round(g / step) * step));
}

function pick(list, seed) {
  if (!list.length) return null;
  return list[((seed % list.length) + list.length) % list.length];
}

// Seed simples e determinística para permitir "gerar outro".
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function preferFirst(list, preferred = []) {
  if (!preferred.length) return list;
  const pref = list.filter((o) => preferred.includes(o.id));
  return pref.length ? pref : list;
}

/**
 * answers: {
 *   meals: 3..6, vegetarian, vegan, lactoseFree, glutenFree, noFish, noSupplements, nutAllergy,
 *   preferredProteins: [ids], preferredCarbs: [ids], excluded: [ids], includeLegumes, includeFruit
 * }
 * target: { kcal, protein, carbs, fat }
 */
// --- Gerador baseado em cardápios -------------------------------------------------------

const SLOT_OF = { cafe: 'cafe', lanche1: 'lanche', lanche2: 'lanche', almoco: 'almoco', jantar: 'jantar', ceia: 'ceia' };

function bannedFor(a) {
  const b = new Set();
  if (a.vegetarian) ['carne', 'peixe'].forEach((t) => b.add(t));
  if (a.vegan) ['carne', 'peixe', 'ovo', 'lactose'].forEach((t) => b.add(t));
  if (a.lactoseFree) b.add('lactose');
  if (a.glutenFree) b.add('gluten');
  if (a.noFish) b.add('peixe');
  if (a.noPork) b.add('porco');
  if (a.noSupplements) b.add('suplemento');
  if (a.nutAllergy) ['amendoim', 'castanha'].forEach((t) => b.add(t));
  if (a.noSoy) b.add('soja');
  return b;
}

// Adapta o cardápio às restrições: alimento proibido como base da refeição
// descarta a opção; se for só complemento (salada, bebida…), ele sai.
export function adaptTemplate(t, a) {
  const ban = bannedFor(a);
  const ex = new Set(a.excluded ?? []);
  const items = [];
  for (const it of t.items) {
    const [id, role] = it;
    const bad = ex.has(id) || (FOOD_TAGS[id] ?? []).some((tag) => ban.has(tag));
    if (bad) {
      if (role === 'x') continue;
      return null;
    }
    items.push(it);
  }
  if (!items.some((x) => x[1] === 'p')) return null;
  return { ...t, items };
}

export function candidates(slot, a) {
  return MENU_TEMPLATES.filter((t) => t.slots.includes(slot)).map((t) => adaptTemplate(t, a)).filter(Boolean);
}

// Mínimos quadrados com regularização: bate os macros mexendo o mínimo possível
// nas quantidades "naturais" da receita (gramasBase).
export function solveTemplate(items, target) {
  const foods = items.map(([id]) => getFood(id));
  const rows = foods.map((f) => [f.p / 100, f.c / 100, f.f / 100]);
  const w2 = [16, 16, 81];
  const goal = [target.p, target.c, target.f];
  const fixed = items.map(([, role]) => role === 'x');
  const x = items.map(([, , base]) => base);
  const lam = items.map(([, , base]) => 400 / Math.max(10, base) ** 2);
  const lo = items.map((it) => it[3]);
  const hi = items.map((it) => it[4]);

  const run = () => {
    const cur = [0, 0, 0];
    rows.forEach((r, i) => r.forEach((v, k) => (cur[k] += v * x[i])));
    for (let iter = 0; iter < 300; iter++) {
      let moved = 0;
      for (let i = 0; i < x.length; i++) {
        if (fixed[i]) continue;
        const r = rows[i];
        let num = lam[i] * items[i][2];
        let den = lam[i];
        for (let k = 0; k < 3; k++) {
          const rest = goal[k] - (cur[k] - r[k] * x[i]);
          num += w2[k] * r[k] * rest;
          den += w2[k] * r[k] * r[k];
        }
        const nx = Math.min(hi[i], Math.max(lo[i], num / den));
        const d = nx - x[i];
        if (Math.abs(d) > 1e-6) {
          for (let k = 0; k < 3; k++) cur[k] += r[k] * d;
          x[i] = nx;
          moved += Math.abs(d);
        }
      }
      if (moved < 0.01) break;
    }
  };

  run();
  // medidas caseiras (ovos, pães, frutas…) viram unidades inteiras e ficam fixas
  let anyUnit = false;
  items.forEach(([id], i) => {
    const u = HOUSE_UNITS[id];
    if (!u || fixed[i]) return;
    const n = Math.max(lo[i] > 0 ? 1 : 0, Math.round(x[i] / u[0]));
    x[i] = Math.min(hi[i], n * u[0]);
    fixed[i] = true;
    anyUnit = true;
  });
  if (anyUnit) run();
  return items.map(([id], i) => {
    const step = hi[i] <= 40 ? 5 : 10;
    const g = HOUSE_UNITS[id] ? x[i] : Math.round(x[i] / step) * step;
    return { foodId: id, g: Math.max(0, Math.round(g)) };
  }).filter((it) => it.g > 0);
}

export function houseMeasure(foodId, g) {
  const u = HOUSE_UNITS[foodId];
  if (!u || g % u[0] !== 0) return null;
  const n = g / u[0];
  return `${n} ${n === 1 ? u[1] : u[2]}`;
}

const PLANT_PROTEIN = new Set([584, 582, 583, 9015, 9012, 577]);

function scoreTemplate(t, a, rand) {
  const ids = t.items.map((i) => i[0]);
  let sc = rand() * 2;
  // quem come carne recebe proteína vegetal só se preferir
  const mainProt = t.items.filter((i) => i[1] === 'p').map((i) => i[0]);
  if (!a.vegetarian && !a.vegan && mainProt.every((id) => PLANT_PROTEIN.has(id)) && !(a.preferredProteins ?? []).some((id) => mainProt.includes(id))) sc -= 4;
  if ((a.preferredProteins ?? []).some((id) => ids.includes(id))) sc += 3;
  if ((a.preferredCarbs ?? []).some((id) => ids.includes(id))) sc += 2;
  if ((a.liked ?? []).includes(t.id)) sc += 4;
  return sc;
}

/**
 * answers: meals 3..6, vegetarian, vegan, lactoseFree, glutenFree, noFish, noPork, noSoy,
 *          noSupplements, nutAllergy, lightDinner, preferredProteins, preferredCarbs, excluded
 * Cada refeição recebe até 3 opções equivalentes em macros.
 */
export function generatePlan(target, answers, seed = Date.now()) {
  const rand = rng(seed);
  const layout = LAYOUTS[answers.meals] ?? LAYOUTS[4];
  // fatias por macro (jantar leve passa parte do carboidrato para café/almoço)
  const shares = layout.map(([key, , share]) => ({ key, p: share, c: share, f: share }));
  if (answers.lightDinner) {
    const d = shares.find((x) => x.key === 'jantar');
    if (d) {
      const moved = d.c * 0.5;
      d.c -= moved;
      const others = shares.filter((x) => x.key === 'cafe' || x.key === 'almoco');
      others.forEach((o) => (o.c += moved / others.length));
    }
  }

  const used = new Map(); // quantas vezes cada cardápio já apareceu no dia
  const meals = layout.map(([key, type], idx) => {
    const slot = SLOT_OF[key];
    const pool = candidates(slot, answers)
      .map((t) => ({ t, sc: scoreTemplate(t, answers, rand) - (used.get(t.id) ?? 0) * 4 }))
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 3)
      .map((x) => x.t);
    pool.forEach((t, i) => used.set(t.id, (used.get(t.id) ?? 0) + (i === 0 ? 2 : 1)));
    const sh = shares[idx];
    const tgt = { p: target.protein * sh.p, c: target.carbs * sh.c, f: target.fat * sh.f };
    const options = pool.map((t) => ({ templateId: t.id, name: t.name, template: t, items: solveTemplate(t.items, tgt) }));
    return { key, type, tgt, options, choice: 0 };
  });

  // 2ª passada: o que faltou/sobrou no dia vai para as refeições com margem
  for (let pass = 0; pass < 2; pass++) {
    const tot = sumMacros(meals.flatMap((m) => m.options[m.choice]?.items ?? []));
    const miss = { p: target.protein - tot.p, c: target.carbs - tot.c, f: target.fat - tot.f };
    // carboidrato extra não volta para o jantar quando ele é leve
    const cTake = shares.map((sh) => (answers.lightDinner && sh.key === 'jantar' ? 0 : sh.c));
    const cSum = cTake.reduce((a, b) => a + b, 0) || 1;
    meals.forEach((m, i) => {
      const sh = shares[i];
      m.tgt = {
        p: Math.max(0, m.tgt.p + miss.p * sh.p),
        c: Math.max(0, m.tgt.c + (miss.c * cTake[i]) / cSum),
        f: Math.max(0, m.tgt.f + miss.f * sh.f),
      };
      m.options = m.options.map((o) => ({ ...o, items: solveTemplate(o.template.items, m.tgt) }));
    });
  }

  const out = meals.map((m) => ({
    key: m.key,
    type: m.type,
    choice: 0,
    options: m.options.map((o) => ({ templateId: o.templateId, name: o.name, items: o.items })),
    name: m.options[0]?.name ?? '',
    items: m.options[0]?.items ?? [],
  }));
  return { version: 2, createdAt: Date.now(), seed, answers, target, meals: out, totals: sumMacros(out.flatMap((m) => m.items)) };
}

export function planTotals(plan) {
  return sumMacros(plan.meals.flatMap((m) => m.items));
}

// Substitutos equivalentes: mesmo papel, gramas ajustadas pelo macro dominante.
export function substitutes(foodId, grams) {
  const food = getFood(foodId);
  if (!food) return [];
  const pool = Object.entries(POOLS).find(([, list]) => list.some((o) => o.id === foodId));
  const candidates = pool ? pool[1].filter((o) => o.id !== foodId) : [];
  const key = food.p * 4 >= Math.max(food.c * 4, food.f * 9) ? 'p' : food.c * 4 >= food.f * 9 ? 'c' : 'f';
  const amount = (food[key] * grams) / 100;
  return candidates
    .map((o) => {
      const fd = getFood(o.id);
      if (!fd || !fd[key]) return null;
      const g = Math.round(((amount / fd[key]) * 100) / 5) * 5;
      return { foodId: o.id, g, label: o.label };
    })
    .filter(Boolean);
}
