// Gerador automático de plano alimentar: escolhe cardápios reais da base
// (data/menus.js) conforme restrições e gostos e ajusta só as quantidades.
import { getFood, sumMacros } from './foods.js';
import { MENU_TEMPLATES, HOUSE_UNITS, FOOD_TAGS } from './data/menus.js';
import { RECIPES, PRICEY_FOODS } from './data/recipes.js';

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
// Tags do alimento: lista manual + categoria da TACO (peixes, carnes, ovos, laticínios),
// assim nenhuma carne/peixe escapa de um filtro vegetariano por falta de etiqueta.
const CAT_TAGS = { 5: ['peixe'], 6: ['carne'], 9: ['ovo'], 7: ['lactose'] };
export function foodTags(id) {
  const base = FOOD_TAGS[id] ?? [];
  const f = getFood(id);
  const extra = (f && CAT_TAGS[f.cat]) || [];
  return [...new Set([...base, ...extra, ...(f?.cat === 6 && /porco|lombo|bisteca|pernil|toucinho|lingui|presunto|salame|mortadela/i.test(f.name) ? ['porco'] : [])])];
}

export function adaptTemplate(t, a) {
  const ban = bannedFor(a);
  const ex = new Set(a.excluded ?? []);
  const items = [];
  for (const it of t.items) {
    const [id, role] = it;
    const bad = ex.has(id) || foodTags(id).some((tag) => ban.has(tag));
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

// --- Ajuste de porções ---------------------------------------------------------------
//
// Mínimos quadrados ponderados pelas kcal de cada macro (P e C ×4, G ×9): a prioridade é
// bater a meta; a quantidade "natural" da receita só desempata (regularização fraca).
// Limites crescem com a meta (planos de 3.500 kcal precisam de pratos maiores).

const W2 = [16, 16, 81];

function lsSolve(rows, x, lo, hi, base, lam, goal, W = W2) {
  const cur = [0, 0, 0];
  rows.forEach((r, i) => r.forEach((v, k) => (cur[k] += v * x[i])));
  for (let iter = 0; iter < 5000; iter++) {
    let moved = 0;
    for (let i = 0; i < x.length; i++) {
      if (lo[i] === hi[i]) continue;
      const r = rows[i];
      let num = lam[i] * base[i];
      let den = lam[i];
      for (let k = 0; k < 3; k++) {
        const rest = goal[k] - (cur[k] - r[k] * x[i]);
        num += W[k] * r[k] * rest;
        den += W[k] * r[k] * r[k];
      }
      if (den <= 0) continue;
      const nx = Math.min(hi[i], Math.max(lo[i], num / den));
      const d = nx - x[i];
      if (Math.abs(d) > 1e-7) {
        for (let k = 0; k < 3; k++) cur[k] += r[k] * d;
        x[i] = nx;
        moved += Math.abs(d);
      }
    }
    if (moved < 1e-4) break;
  }
  return cur;
}

// Porção máxima plausível numa refeição (g). Acima disso, a Nutri soma outro alimento.
const MAX_PORTION = {
  3: 400, 1: 400, 561: 300, 567: 300, 88: 450, 91: 450, 129: 400, 9013: 450, 533: 400, 64: 400, 577: 300, 9012: 300,
  549: 300, 448: 400, 449: 400, 9006: 400, 584: 400, 9015: 300, 9008: 300, 222: 260, 231: 300, 239: 300, 182: 200,
  225: 300, 207: 225, 410: 300, 408: 300, 377: 300, 346: 300, 351: 300, 371: 300, 9018: 280, 398: 300, 317: 280,
  301: 300, 9009: 300, 488: 300, 52: 150, 53: 150, 9005: 120, 7: 100, 582: 500, 9001: 400, 9002: 400, 118: 300,
  163: 200, 588: 40, 9004: 40,
  589: 10, // castanha-do-pará: 1–2 por dia (selênio)
};
const MIN_PORTION = 15; // abaixo disso (ex.: 5 g de queijo) o ingrediente não faz sentido no prato

// Erro da refeição em kcal (raiz da soma ponderada dos desvios).
const misfit = (cur, goal) => Math.sqrt(W2.reduce((a, w, k) => a + w * (goal[k] - cur[k]) ** 2, 0));
// Pesos relativos: cada macro conta pelo seu % de erro (carbo baixo do low carb também importa).
const FLOOR = [8, 8, 4];
const relWeights = (goal) => goal.map((g, k) => 1 / Math.max(g, FLOOR[k]) ** 2);
// Erro relativo médio (0,05 = 5%).
export const relMisfit = (cur, goal) => Math.sqrt(goal.reduce((a, g, k) => a + ((g - cur[k]) / Math.max(g, FLOOR[k])) ** 2, 0) / 3);

// Complementos que a Nutri pode somar quando a receita sozinha não bate a meta.
// [id, máximo em g]; leves = café/lanche/ceia, principais = almoço/jantar.
const COMPLEMENTS = {
  p: { light: [[9006, 300], [9008, 250], [9014, 200], [9003, 45], [9010, 100], [488, 150], [583, 45], [584, 250]], main: [[410, 200], [408, 200], [9008, 200], [584, 300], [9015, 250], [9012, 200]] },
  c: { light: [[182, 200], [7, 80], [52, 100], [9005, 80], [222, 200]], main: [[3, 300], [88, 300], [561, 200], [1, 300], [129, 250]] },
  f: { light: [[9004, 40], [588, 30], [163, 150], [9016, 20]], main: [[260, 20], [163, 150]] },
};

// Low carb: carboidrato complementar vem de legumes/frutas de baixo índice, não de mandioca/arroz.
const LOWCARB_CARBS = { light: [[239, 200], [222, 150], [207, 150]], main: [[64, 250], [97, 150], [109, 150]] };

function complementsFor(macro, slot, a, present) {
  const ban = bannedFor(a);
  const ex = new Set(a.excluded ?? []);
  const kind = slot === 'almoco' || slot === 'jantar' ? 'main' : 'light';
  const list = macro === 'c' && DIET_STYLES[a.style]?.carbPct ? LOWCARB_CARBS[kind] : COMPLEMENTS[macro][kind];
  return list.filter(([id]) => !present.has(id) && !ex.has(id) && !foodTags(id).some((t) => ban.has(t)) && getFood(id));
}

/**
 * Resolve as gramas de uma receita para a meta { p, c, f } da refeição.
 * Se faltar muito de algum macro, soma até 2 complementos (marcados com add: true).
 */
export function solveMeal(templateItems, target, a = {}, slot = 'almoco') {
  const goal = [target.p, target.c, target.f];
  const W = relWeights(goal);
  const build = (list) => {
    const foods = list.map(([id]) => getFood(id));
    const rows = foods.map((fd) => [fd.p / 100, fd.c / 100, fd.f / 100]);
    const base = list.map((it) => it[2]);
    const lo = [];
    const hi = [];
    list.forEach(([, role, b, mn, mx], i) => {
      const kcal = foods[i].kcal * b / 100;
      if (role === 'x') {
        // complemento fixo (salada, fruta, bebida): pode diminuir até a metade se tiver calorias
        lo.push(kcal >= 25 ? Math.max(Math.min(MIN_PORTION, b), b * 0.4) : b);
        hi.push(b);
      } else {
        // pode encolher bastante (metas baixas de carbo/gordura), mas o item continua no prato
        const oil = foods[i].kcal >= 500; // azeite, manteiga, castanhas: porções pequenas são normais
        const floor = role === 'add' || oil ? 0 : Math.min(MIN_PORTION, b);
        lo.push(role === 'add' ? 0 : Math.max(floor, Math.min(mn, b * (role === 'p' ? 0.5 : 0.3))));
        const cap = MAX_PORTION[list[i][0]] ?? Infinity;
        hi.push(Math.max(lo[i], Math.min(cap, Math.max(mx, b * (role === 'add' ? 1 : 4), oil && role === 'f' ? 30 : 0))));
      }
    });
    // regularização bem fraca, na mesma escala do erro de cada alimento: só desempata
    // (2% da "força" do alimento sobre os macros puxando para a quantidade da receita)
    const lam = rows.map((r) => 0.02 * r.reduce((acc, v, k) => acc + W[k] * v * v, 0) + 1e-12);
    return { rows, base, lo, hi, lam };
  };
  const solveList = (list) => {
    const m = build(list);
    const x = m.base.map((b, i) => Math.min(m.hi[i], Math.max(m.lo[i], b)));
    const cur = lsSolve(m.rows, x, m.lo, m.hi, m.base, m.lam, goal, W);
    return { list, x, cur, err: relMisfit(cur, goal), m };
  };

  let best = solveList(templateItems.map((it) => [...it]));
  for (let round = 0; round < 2; round++) {
    // macro com maior falta relativa (só vale complementar se faltar de verdade)
    const def = [0, 1, 2].map((k) => (goal[k] - best.cur[k]) / Math.max(goal[k], FLOOR[k]));
    const k = def.indexOf(Math.max(...def));
    if (def[k] <= 0.04 || goal[k] - best.cur[k] < [3, 5, 2][k]) break;
    const macro = ['p', 'c', 'f'][k];
    const present = new Set(best.list.map((it) => it[0]));
    let improved = null;
    // refeições grandes (ganho de massa, low carb com muita gordura) aceitam porções maiores
    const scale = Math.min(2.5, Math.max(1, (goal[0] * 4 + goal[1] * 4 + goal[2] * 9) / 650));
    for (const [id, mx0] of complementsFor(macro, slot, a, present).slice(0, 5)) {
      const mx = Math.round(mx0 * scale);
      const r = solveList([...best.list, [id, 'add', 0, 0, mx]]);
      // complemento de 10 g de tapioca não faz sentido: só vale com porção de verdade
      const g = r.x[r.x.length - 1];
      if (g < (mx <= 45 ? 8 : 25)) continue;
      if (!improved || r.err < improved.err) improved = r;
    }
    if (!improved || improved.err > best.err * 0.8) break;
    best = improved;
  }

  // medidas caseiras (ovos, pães, frutas…) viram unidades inteiras; o resto se reajusta
  const { list, x, m } = best;
  let anyUnit = false;
  list.forEach(([id, role], i) => {
    const u = HOUSE_UNITS[id];
    if (!u || m.lo[i] === m.hi[i]) return;
    const n = Math.max(m.lo[i] > 0 || role === 'add' ? 1 : 0, Math.round(x[i] / u[0]));
    m.lo[i] = m.hi[i] = x[i] = n * u[0];
    anyUnit = true;
  });
  if (anyUnit) lsSolve(m.rows, x, m.lo, m.hi, m.base, m.lam, goal, W);
  return list
    .map(([id, role], i) => {
      // azeite/castanhas de 1 em 1 g, porções médias de 5 em 5, grandes de 10 em 10
      const step = m.hi[i] <= 45 ? 1 : m.hi[i] <= 160 ? 5 : 10;
      const g = HOUSE_UNITS[id] ? x[i] : Math.round(x[i] / step) * step;
      return { foodId: id, g: Math.max(0, Math.round(g)), ...(role === 'add' ? { add: true } : {}) };
    })
    .filter((it) => it.g >= (it.add ? 5 : 1));
}

// Compatível com o uso anterior (sem complementos).
export function solveTemplate(items, target) {
  return solveMeal(items, target, { excluded: [...new Set(Object.values(COMPLEMENTS).flatMap((g) => [...g.light, ...g.main].map(([id]) => id)))] });
}

const mealMisfit = (items, tgt) => {
  const t = sumMacros(items);
  return relMisfit([t.p, t.c, t.f], [tgt.p, tgt.c, tgt.f]);
};

export function houseMeasure(foodId, g) {
  const u = HOUSE_UNITS[foodId];
  if (!u || g % u[0] !== 0) return null;
  const n = g / u[0];
  return `${n} ${n === 1 ? u[1] : u[2]}`;
}

const PLANT_PROTEIN = new Set([584, 582, 583, 9015, 9012, 577]);

// --- Estilos de dieta, objetivos e o "nutricionista" -----------------------------------

export const DIET_STYLES = {
  tradicional: { label: 'Tradicional brasileira', emoji: '🍛', desc: 'Arroz e feijão, pão francês, tapioca, cuscuz — comida de casa.', boost: { br: 4 } },
  pratica: { label: 'Prática e rápida', emoji: '⚡', desc: 'Até 15 min, marmitas e opções sem fogão.', boost: { quick: 4, nocook: 2, batch: 1 } },
  fitness: { label: 'Fitness clássica', emoji: '💪', desc: 'Frango, ovos, batata-doce, whey — o básico da academia.', boost: { fit: 4 }, fitOnly: true },
  lowcarb: { label: 'Low carb', emoji: '🥑', desc: 'Pouco pão, arroz e massa; mais ovos, carnes, legumes e gorduras boas.', boost: { lowcarb: 6 }, require: 'lowcarb', carbPct: 0.13 },
  mediterranea: { label: 'Mediterrânea', emoji: '🫒', desc: 'Peixes, azeite, grãos, legumes e iogurte.', boost: { med: 5 } },
  vegetariana: { label: 'Vegetariana', emoji: '🥚', desc: 'Sem carnes e peixes; com ovos e laticínios.', flags: { vegetarian: true }, boost: {} },
  vegana: { label: 'Vegana', emoji: '🌱', desc: '100% vegetal.', flags: { vegan: true }, boost: {} },
  flexivel: { label: 'Variada', emoji: '🎲', desc: 'Um pouco de tudo, máxima variedade.', boost: {} },
};

export const MEAL_TIME = { cafe: '07:00', lanche1: '10:00', almoco: '12:30', lanche2: '16:00', jantar: '19:30', ceia: '22:00' };

const tplMeta = (t) => RECIPES[t.id] ?? { tags: [], time: 15, recipe: [] };
const hasTag = (t, tag) => tplMeta(t).tags.includes(tag);

// Respostas do questionário → flags usadas pelos filtros (compatível com planos antigos).
export function normalizeAnswers(a = {}) {
  const st = DIET_STYLES[a.style] ?? null;
  const out = { meals: 5, excluded: [], ...a, ...(st?.flags ?? {}) };
  if (out.vegan) out.vegetarian = true;
  if (out.noEggs) out.excluded = [...new Set([...out.excluded, 488, 489, 490, 9008])];
  if (out.lightDinner == null) out.lightDinner = (a.goal === 'cut' || a.goal === 'recomp') && a.trainTime !== 'noite';
  return out;
}

// Low carb muda a divisão: carboidrato ~20% das kcal, o resto vira gordura.
export function effectiveTarget(target, a) {
  const st = DIET_STYLES[a.style];
  if (!st?.carbPct) return { ...target };
  const carbs = Math.round((target.kcal * st.carbPct) / 4);
  const fat = Math.max(target.fat, Math.round((target.kcal - target.protein * 4 - carbs * 4) / 9));
  return { ...target, carbs, fat };
}

function scoreTemplate(t, a, slot, rand, nearTraining = false) {
  const meta = tplMeta(t);
  const ids = t.items.map((i) => i[0]);
  const st = DIET_STYLES[a.style] ?? DIET_STYLES.flexivel;
  let sc = rand() * 2;
  for (const [tag, w] of Object.entries(st.boost ?? {})) if (meta.tags.includes(tag)) sc += w;
  if (meta.tags.includes('fitonly') && !st.fitOnly) sc -= 6;
  // objetivo
  const cutting = a.goal === 'cut' || a.goal === 'recomp';
  if (cutting) {
    if (meta.tags.includes('light')) sc += slot === 'jantar' || slot === 'ceia' || slot === 'lanche' ? 3 : 1.5;
    if (meta.tags.includes('dense')) sc -= 3;
  }
  if (a.goal === 'bulk') {
    if (meta.tags.includes('dense')) sc += 3;
    if (meta.tags.includes('light')) sc -= 3;
  }
  // pré/pós-treino pedem uma fonte de carboidrato (exceto no low carb)
  if (nearTraining && !st.carbPct && !t.items.some((i) => i[1] === 'c')) sc -= 4;
  // tempo de cozinha
  if (a.cookTime === 'none') sc += meta.time <= 10 || meta.tags.includes('nocook') ? 3 : meta.time <= 15 ? 0 : -4;
  if (a.cookTime === 'quick' && meta.time > 20) sc -= 3;
  if (a.cookTime === 'cook' && meta.time > 20) sc += 0.5;
  // orçamento
  if (a.budget === 'eco') sc -= 2.5 * ids.filter((id) => PRICEY_FOODS.has(id)).length;
  // quem come carne recebe proteína vegetal só se preferir
  const mainProt = t.items.filter((i) => i[1] === 'p').map((i) => i[0]);
  if (!a.vegetarian && !a.vegan && mainProt.every((id) => PLANT_PROTEIN.has(id)) && !(a.preferredProteins ?? []).some((id) => mainProt.includes(id))) sc -= 4;
  if ((a.preferredProteins ?? []).some((id) => ids.includes(id))) sc += 3;
  if ((a.preferredCarbs ?? []).some((id) => ids.includes(id))) sc += 2;
  if ((a.liked ?? []).includes(t.id)) sc += 4;
  return sc;
}

// Filtros "duros" do estilo/tempo, só quando sobram opções suficientes.
function narrow(list, a) {
  let out = list;
  const st = DIET_STYLES[a.style];
  if (st?.require) {
    const f = out.filter((t) => hasTag(t, st.require));
    if (f.length >= 2) out = f;
  }
  if (a.cookTime === 'none') {
    const f = out.filter((t) => tplMeta(t).time <= 15 || hasTag(t, 'nocook'));
    if (f.length >= 2) out = f;
  }
  return out;
}

const mainProteinOf = (t) => (t.items.find((i) => i[1] === 'p') ?? [])[0];

// Escolhe até 3 opções variando a proteína principal (frango, ovo, peixe…).
function pickOptions(scored, n = 3) {
  const out = [];
  const prots = new Set();
  for (const x of scored) {
    if (out.length >= n) break;
    const p = mainProteinOf(x.t);
    if (prots.has(p) && scored.length > n) continue;
    out.push(x.t);
    prots.add(p);
  }
  for (const x of scored) if (out.length < n && !out.includes(x.t)) out.push(x.t);
  return out;
}

// Refeições de pré e pós-treino conforme o horário do treino.
function trainingMeals(keys, trainTime) {
  const has = (k) => keys.includes(k);
  if (trainTime === 'manha') return { pre: 'cafe', post: has('lanche1') ? 'lanche1' : 'almoco' };
  if (trainTime === 'tarde') return { pre: 'almoco', post: has('lanche2') ? 'lanche2' : 'jantar' };
  if (trainTime === 'noite') return { pre: has('lanche2') ? 'lanche2' : 'almoco', post: 'jantar' };
  return {};
}

/**
 * Plano a partir das metas e do questionário.
 * answers: goal, style, meals 3..6, trainTime ('manha'|'tarde'|'noite'|'nao'), cookTime
 *   ('none'|'quick'|'cook'), recipes (bool), budget ('eco'|'normal'), kg, restrições
 *   (lactoseFree, glutenFree, noFish, noPork, noEggs, nutAllergy, noSoy, noSupplements),
 *   excluded [ids], preferredProteins [ids].
 * Cada refeição recebe até 3 opções equivalentes em macros.
 */
export function generatePlan(baseTarget, rawAnswers, seed = Date.now()) {
  const answers = normalizeAnswers(rawAnswers);
  const target = effectiveTarget(baseTarget, answers);
  const rand = rng(seed);
  const layout = LAYOUTS[answers.meals] ?? LAYOUTS[4];
  const keys = layout.map(([k]) => k);
  const tm = trainingMeals(keys, answers.trainTime);
  const shares = layout.map(([key, , share]) => ({ key, p: share, c: share, f: share }));
  // carboidrato em volta do treino: 20% do total vai para pré (40%) e pós (60%)
  if (tm.pre || tm.post) {
    const moving = 0.2;
    const others = shares.filter((x) => x.key !== tm.pre && x.key !== tm.post);
    const oSum = others.reduce((a, x) => a + x.c, 0) || 1;
    others.forEach((x) => (x.c -= (moving * x.c) / oSum));
    shares.forEach((x) => {
      if (x.key === tm.pre) x.c += moving * (tm.post ? 0.4 : 1);
      if (x.key === tm.post) x.c += moving * (tm.pre ? 0.6 : 1);
    });
  }
  // jantar leve: metade do carboidrato da noite vai para café/almoço (exceto pós-treino)
  const lightDinner = answers.lightDinner && tm.post !== 'jantar';
  if (lightDinner) {
    const d = shares.find((x) => x.key === 'jantar');
    if (d) {
      const moved = d.c * 0.5;
      d.c -= moved;
      const others = shares.filter((x) => x.key === 'cafe' || x.key === 'almoco');
      others.forEach((o) => (o.c += moved / others.length));
    }
  }

  const used = new Map(); // cardápios já usados no dia
  const usedProt = new Map(); // proteína principal já usada (variedade)
  const meals = layout.map(([key, type], idx) => {
    const slot = SLOT_OF[key];
    const scored = narrow(candidates(slot, answers), answers)
      .map((t) => ({
        t,
        sc: scoreTemplate(t, answers, slot, rand, key === tm.pre || key === tm.post) - (used.get(t.id) ?? 0) * 4 - (usedProt.get(mainProteinOf(t)) ?? 0) * (slot === 'almoco' || slot === 'jantar' ? 3 : 1),
      }))
      .sort((a, b) => b.sc - a.sc);
    // as melhores por estilo/gosto são testadas na meta; as que não fecham os macros caem
    const sh0 = shares[idx];
    const tgt0 = { p: target.protein * sh0.p, c: target.carbs * sh0.c, f: target.fat * sh0.f };
    let ranked = scored.slice(0, 12).map((x) => {
      const items = solveMeal(x.t.items, tgt0, answers, slot);
      const rel = mealMisfit(items, tgt0);
      const adds = items.filter((it) => it.add).length;
      return { t: x.t, rel, sc: x.sc - rel * 40 - adds * 0.8 };
    }).sort((p, q) => q.sc - p.sc);
    // opções que não fecham os macros (>12%) só entram se faltar alternativa
    const good = ranked.filter((x) => x.rel <= 0.12);
    if (good.length >= 3) ranked = good;
    else ranked = [...good, ...ranked.filter((x) => x.rel > 0.12 && x.rel <= 0.2).sort((p, q) => p.rel - q.rel)].slice(0, Math.max(2, good.length));
    if (!ranked.length) ranked = scored.slice(0, 1);
    const pool = pickOptions(ranked);
    pool.forEach((t, i) => {
      used.set(t.id, (used.get(t.id) ?? 0) + (i === 0 ? 2 : 1));
      if (i === 0) usedProt.set(mainProteinOf(t), (usedProt.get(mainProteinOf(t)) ?? 0) + 1);
    });
    const sh = shares[idx];
    const tgt = { p: target.protein * sh.p, c: target.carbs * sh.c, f: target.fat * sh.f };
    const options = pool.map((t) => ({ templateId: t.id, name: t.name, template: t, items: solveMeal(t.items, tgt, answers, slot) }));
    return { key, slot, type, tgt, options, choice: 0 };
  });

  // 2ª passada: o que faltou/sobrou no dia vai para as refeições com margem
  for (let pass = 0; pass < 4; pass++) {
    const tot = sumMacros(meals.flatMap((m) => m.options[m.choice]?.items ?? []));
    const miss = { p: target.protein - tot.p, c: target.carbs - tot.c, f: target.fat - tot.f };
    const cTake = shares.map((sh) => (lightDinner && sh.key === 'jantar' ? 0 : sh.c));
    const cSum = cTake.reduce((a, b) => a + b, 0) || 1;
    meals.forEach((m, i) => {
      const sh = shares[i];
      m.tgt = {
        p: Math.max(0, m.tgt.p + miss.p * sh.p),
        c: Math.max(0, m.tgt.c + (miss.c * cTake[i]) / cSum),
        f: Math.max(0, m.tgt.f + miss.f * sh.f),
      };
      m.options = m.options.map((o) => ({ ...o, items: solveMeal(o.template.items, m.tgt, answers, m.slot) }));
    });
  }

  const out = meals.map((m) => {
    const options = m.options.map((o) => {
      const meta = tplMeta(o.template);
      return { templateId: o.templateId, name: o.name, items: o.items, time: meta.time, tags: meta.tags, recipe: meta.recipe };
    });
    return {
      key: m.key,
      type: m.type,
      when: MEAL_TIME[m.key],
      badge: m.key === tm.pre && m.key === tm.post ? 'Pré/pós-treino' : m.key === tm.pre ? 'Pré-treino' : m.key === tm.post ? 'Pós-treino' : null,
      choice: 0,
      options,
      name: options[0]?.name ?? '',
      items: options[0]?.items ?? [],
    };
  });
  const totals = sumMacros(out.flatMap((m) => m.items));
  const plan = { version: 3, solver: 2, createdAt: Date.now(), seed, answers: rawAnswers, baseTarget, target, meals: out, totals };
  plan.notes = planNotes(plan, answers, { lightDinner, tm });
  return plan;
}

const GOAL_TEXT = { cut: 'secar (déficit calórico)', recomp: 'recomposição (déficit leve)', maintain: 'manter o peso', bulk: 'ganhar massa (superávit leve)' };

// "Análise da nutri": por que o plano é assim + dicas práticas.
export function planNotes(plan, a, { lightDinner, tm }) {
  const t = plan.target;
  const tot = plan.totals;
  const kg = Number(a.kg) || null;
  const why = [];
  why.push(`Meta de ${Math.round(t.kcal)} kcal para ${GOAL_TEXT[a.goal] ?? 'o seu objetivo'}.`);
  why.push(`Proteína: ${Math.round(t.protein)} g/dia${kg ? ` (${(t.protein / kg).toFixed(1).replace('.', ',')} g por kg)` : ''}, dividida em todas as refeições — é o que preserva e constrói músculo.`);
  if (DIET_STYLES[a.style]?.carbPct) why.push(`Low carb: carboidrato reduzido para ${t.carbs} g e gordura ajustada para ${t.fat} g, mantendo as calorias.`);
  if (tm.pre || tm.post) why.push(`Treino ${a.trainTime === 'manha' ? 'de manhã' : a.trainTime === 'tarde' ? 'à tarde' : 'à noite'}: mais carboidrato no pré e no pós-treino para render e recuperar.`);
  if (lightDinner) why.push('Jantar mais leve em carboidrato, com o restante distribuído no café e no almoço.');
  why.push(`Fibras: ~${Math.round(tot.fiber)} g/dia${tot.fiber < 25 ? ' — complete com salada e fruta extra (meta 25–35 g)' : ' (meta 25–35 g)'}.`);
  const tips = [];
  if (kg) tips.push(`Água: ~${(kg * 0.035).toFixed(1).replace('.', ',')} L por dia (mais em dias de treino e calor).`);
  if (a.goal === 'cut' || a.goal === 'recomp') {
    tips.push('Salada e legumes são livres: encha metade do prato com eles para ter mais saciedade.');
    tips.push('Use as 3 opções de cada refeição para variar sem sair da meta — todas têm macros equivalentes.');
  } else if (a.goal === 'bulk') {
    tips.push('Pouca fome? Prefira líquidos e calóricos práticos: vitamina, pasta de amendoim, azeite na comida.');
    tips.push('Não pule refeições: o superávit vem da constância ao longo da semana.');
  } else {
    tips.push('Mantenha as porções e acompanhe o peso semanal; se mudar mais de 0,5 kg, ajuste as metas.');
  }
  if (a.cookTime !== 'cook') tips.push('Cozinhe arroz, feijão e proteínas 1–2 vezes por semana e congele em porções: o dia a dia fica em 5 minutos.');
  return { why, tips };
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
