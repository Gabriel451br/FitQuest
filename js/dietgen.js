// Gerador automático de plano alimentar com alimentos da TACO.
// Para cada refeição escolhe fontes (proteína / carboidrato / gordura + fixos)
// e resolve as gramas por mínimos quadrados com limites (descida por coordenadas).
import { getFood, sumMacros } from './foods.js';

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
export function generatePlan(target, answers, seed = Date.now()) {
  const rand = rng(seed);
  const layout = LAYOUTS[answers.meals] ?? LAYOUTS[4];
  const ex = answers.excluded ?? [];
  const built = [];
  let mainIdx = Math.floor(rand() * 10);

  for (const [key, type, share] of layout) {
    const tgt = { p: target.protein * share, c: target.carbs * share, f: target.fat * share };
    const items = [];
    const r = () => Math.floor(rand() * 100);

    if (type === 'main') {
      const prot = preferFirst(allowed('protein_main', answers, ex), answers.preferredProteins);
      const carb = preferFirst(allowed('carb_main', answers, ex), answers.preferredCarbs);
      const p = pick(prot, mainIdx++);
      const c = pick(carb, r());
      if (p) items.push({ foodId: p.id, min: p.min, max: p.max });
      if (c) items.push({ foodId: c.id, min: c.min, max: c.max });
      if (answers.includeLegumes !== false) {
        const l = pick(allowed('legume', answers, ex), r());
        const veg = answers.vegetarian || answers.vegan;
        if (l) items.push(veg ? { foodId: l.id, min: 80, max: 300 } : { foodId: l.id, min: l.min, max: l.max, fixed: true });
      }
      const v = pick(allowed('veg', answers, ex), r());
      if (v) items.push({ foodId: v.id, min: v.min, max: v.max, fixed: true });
      const fat = allowed('fat', answers, ex).find((o) => o.id === 260) ?? pick(allowed('fat', answers, ex), r());
      if (fat) items.push({ foodId: fat.id, min: fat.min, max: fat.max });
    } else if (type === 'breakfast') {
      const p = pick(preferFirst(allowed('protein_light', answers, ex), answers.preferredProteins), r());
      const c = pick(preferFirst(allowed('carb_breakfast', answers, ex), answers.preferredCarbs), r());
      if (p) items.push({ foodId: p.id, min: p.min, max: p.max });
      if (c) items.push({ foodId: c.id, min: c.min, max: c.max });
      if (answers.includeFruit !== false) {
        const fr = pick(allowed('fruit', answers, ex), r());
        if (fr) items.push({ foodId: fr.id, min: fr.min, max: Math.min(fr.max, 150) });
      }
      const d = pick(allowed('dairy', answers, ex), r());
      if (d) items.push({ foodId: d.id, min: 0, max: d.max });
      const fat = pick(allowed('fat', answers, ex).filter((o) => o.id !== 260), r());
      if (fat) items.push({ foodId: fat.id, min: fat.min, max: fat.max });
    } else if (type === 'snack') {
      const p = pick(allowed('protein_light', answers, ex), r());
      const fr = pick(allowed('fruit', answers, ex), r());
      const fat = pick(allowed('fat', answers, ex).filter((o) => o.id !== 260), r());
      if (p) items.push({ foodId: p.id, min: p.min, max: p.max });
      if (fr) items.push({ foodId: fr.id, min: fr.min, max: fr.max });
      if (fat) items.push({ foodId: fat.id, min: fat.min, max: fat.max });
      const oats = allowed('carb_breakfast', answers, ex).find((o) => o.id === 7);
      if (oats) items.push({ foodId: oats.id, min: 0, max: oats.max });
    } else {
      // ceia: proteína + gordura, pouco carboidrato
      const p = pick(allowed('protein_light', answers, ex), r());
      const fat = pick(allowed('fat', answers, ex).filter((o) => o.id !== 260), r());
      if (p) items.push({ foodId: p.id, min: p.min, max: p.max });
      if (fat) items.push({ foodId: fat.id, min: fat.min, max: fat.max });
    }

    built.push({ key, type, share, items, tgt });
  }

  // 1ª passada por refeição; 2ª redistribui o que faltou/sobrou entre as refeições
  // que ainda têm margem (limites de porção impedem algumas de absorver tudo).
  let solved = built.map((b) => solvePortions(b.items, b.tgt));
  for (let pass = 0; pass < 2; pass++) {
    const tot = sumMacros(solved.flat());
    const miss = { p: target.protein - tot.p, c: target.carbs - tot.c, f: target.fat - tot.f };
    solved = built.map((b, i) => {
      const cur = sumMacros(solved[i]);
      const t2 = {
        p: Math.max(0, cur.p + miss.p * b.share),
        c: Math.max(0, cur.c + miss.c * b.share),
        f: Math.max(0, cur.f + miss.f * b.share),
      };
      return solvePortions(b.items, t2);
    });
  }
  const meals = built.map((b, i) => ({ key: b.key, type: b.type, items: solved[i].filter((x) => x.g > 0) }));
  const all = meals.flatMap((m) => m.items);
  return { createdAt: Date.now(), seed, answers, target, meals, totals: sumMacros(all) };
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
