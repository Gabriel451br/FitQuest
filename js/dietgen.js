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
  const extra = (f && !f.extra && CAT_TAGS[f.cat]) || [];
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
    const pool = pickOptions(scored);
    pool.forEach((t, i) => {
      used.set(t.id, (used.get(t.id) ?? 0) + (i === 0 ? 2 : 1));
      if (i === 0) usedProt.set(mainProteinOf(t), (usedProt.get(mainProteinOf(t)) ?? 0) + 1);
    });
    const sh = shares[idx];
    const tgt = { p: target.protein * sh.p, c: target.carbs * sh.c, f: target.fat * sh.f };
    const options = pool.map((t) => ({ templateId: t.id, name: t.name, template: t, items: solveTemplate(t.items, tgt) }));
    return { key, type, tgt, options, choice: 0 };
  });

  // 2ª passada: o que faltou/sobrou no dia vai para as refeições com margem
  for (let pass = 0; pass < 2; pass++) {
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
      m.options = m.options.map((o) => ({ ...o, items: solveTemplate(o.template.items, m.tgt) }));
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
  const plan = { version: 3, createdAt: Date.now(), seed, answers: rawAnswers, baseTarget, target, meals: out, totals };
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
