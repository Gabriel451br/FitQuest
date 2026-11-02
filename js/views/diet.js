// DIETA: diário alimentar (TACO), plano automático, metas de macros e banco de alimentos.
import { html, useState, useMemo } from '../lib.js';
import { update, getState, targets, autoTargets, dayEntry, MEALS, latestWeight, currentBf } from '../store.js';
import { searchFoods, getFood, macrosFor, sumMacros, categoryName } from '../foods.js';
import { TACO, TACO_CATEGORIES } from '../data/taco.js';
import { generatePlan, substitutes, houseMeasure, DIET_STYLES } from '../dietgen.js';

const shortName = (id) => {
  const n = getFood(id)?.name ?? String(id);
  return n.replace(/\s*\((rótulo|referência) médi[oa]\)/, '').split(',').slice(0, 2).join(',');
};
import { ACTIVITY, GOALS, kcalFromMacros } from '../calc.js';
import { Icon, openModal, Sheet, Field, NumInput, Seg, Check, Ring, MacroRow, toast, confirmDialog, Stat, Empty } from '../ui.js';
import { openScanner } from './scanner.js';
import { unitsFor, unitText } from '../data/units.js';
import { addDays, fmtDate, weekdayShort, num, uid, dateKey } from '../util.js';

export function DietView({ s, today }) {
  const [tab, setTab] = useState('diario');
  return html`
    <div class="stack">
      <div class="page-head"><h1>Dieta</h1></div>
      <div class="tabs">
        ${[['diario', 'Diário'], ['plano', 'Plano'], ['refeicoes', 'Refeições'], ['metas', 'Metas'], ['alimentos', 'TACO']].map(([k, l]) => html`
          <button class=${tab === k ? 'on' : ''} onClick=${() => setTab(k)}>${l}</button>
        `)}
      </div>
      ${tab === 'diario' && html`<${DiaryTab} s=${s} today=${today} />`}
      ${tab === 'plano' && html`<${PlanTab} s=${s} today=${today} />`}
      ${tab === 'refeicoes' && html`<${SavedMealsTab} s=${s} />`}
      ${tab === 'metas' && html`<${TargetsTab} s=${s} />`}
      ${tab === 'alimentos' && html`<${FoodsTab} s=${s} />`}
    </div>
  `;
}

const fmtMacros = (m) => `${num(m.kcal)} kcal · P ${num(m.p)} · C ${num(m.c)} · G ${num(m.f)}`;

// --- Diário ------------------------------------------------------------------------

function DiaryTab({ s, today }) {
  const [date, setDate] = useState(today);
  const t = targets(s);
  const entry = dayEntry(s, date);
  const all = MEALS.flatMap((m) => entry.meals[m.key] ?? []);
  const tot = sumMacros(all);
  const label = date === today ? 'Hoje' : date === addDays(today, -1) ? 'Ontem' : `${weekdayShort(date)} ${fmtDate(date)}`;

  const copyPrevDay = async () => {
    const prev = dayEntry(s, addDays(date, -1));
    if (!Object.values(prev.meals).some((l) => l.length)) return toast('Dia anterior vazio');
    if (all.length && !(await confirmDialog('Substituir as refeições deste dia pelas do dia anterior?', { ok: 'Substituir', danger: false }))) return;
    update((st) => {
      const d = (st.diary[date] ??= { meals: {}, water: 0 });
      d.meals = Object.fromEntries(Object.entries(prev.meals).map(([k, l]) => [k, l.map((it) => ({ ...it, id: uid() }))]));
    });
  };

  return html`
    <div class="stack">
      <div class="date-nav">
        <button onClick=${() => setDate(addDays(date, -1))} aria-label="Dia anterior">‹</button>
        <div class="lbl">${label}</div>
        <button onClick=${() => setDate(addDays(date, 1))} disabled=${date >= today} aria-label="Próximo dia">›</button>
      </div>

      <div class="card">
        <div class="row" style="gap:16px">
          <${Ring} value=${Math.round(tot.kcal)} target=${t?.kcal} />
          <div class="stack-sm grow">
            <${MacroRow} label="Prot" color="p" value=${tot.p} target=${t?.protein} />
            <${MacroRow} label="Carb" color="c" value=${tot.c} target=${t?.carbs} />
            <${MacroRow} label="Gord" color="f" value=${tot.f} target=${t?.fat} />
            <div class="row-sb tiny mono muted"><span>FIBRA ${num(tot.fiber)}/${num(t?.fiber)}g</span><span>RESTA ${num(Math.max(0, (t?.kcal ?? 0) - tot.kcal))} KCAL</span></div>
          </div>
        </div>
      </div>

      ${MEALS.map((m) => html`<${MealCard} key=${m.key} s=${s} date=${date} meal=${m} items=${entry.meals[m.key] ?? []} />`)}

      <div class="row wrap">
        <button class="btn sm" onClick=${copyPrevDay}><${Icon} name="copy" />Copiar dia anterior</button>
        ${s.dietPlan && html`<button class="btn sm" onClick=${() => applyPlan(s.dietPlan, date)}><${Icon} name="copy" />Usar plano</button>`}
      </div>
    </div>
  `;
}

function MealCard({ s, date, meal, items }) {
  const tot = sumMacros(items);
  const planMeal = s.dietPlan?.meals.find((m) => m.key === meal.key);
  return html`
    <div class="meal">
      <div class="meal-head">
        <h3>${meal.label}</h3>
        ${items.length > 0 && html`<span class="mono tiny">${num(tot.kcal)} kcal · ${num(tot.p)}P</span>`}
        ${items.length > 0 && html`<button class="btn xs" onClick=${() => saveMealFromDiary(items, meal.label)} aria-label="Salvar como refeição" title="Salvar como refeição"><${Icon} name="star" size="14" /></button>`}
        <button class="btn xs dark" onClick=${() => openFoodSearch(date, meal.key)} aria-label=${`Adicionar em ${meal.label}`}><${Icon} name="plus" size="14" /></button>
      </div>
      ${items.map((it) => {
        const f = getFood(it.foodId);
        const m = macrosFor(f, it.g);
        return html`
          <div class="food-li" key=${it.id}>
            <button class="grow" style="background:none;border:0;padding:0;text-align:left" onClick=${() => openPortion(f, { date, meal: meal.key, item: it })}>
              <div class="t">${f?.name ?? 'Alimento removido'}</div>
              <div class="s">${itemQty(f, it)} · ${fmtMacros(m)}</div>
            </button>
            <button class="x-btn" aria-label="Remover" onClick=${() => removeItem(date, meal.key, it.id)}>×</button>
          </div>
        `;
      })}
      ${!items.length && planMeal && html`
        <div class="food-li">
          <span class="grow small muted">Plano: ${planMeal.items.map((x) => getFood(x.foodId)?.name.split(',')[0]).join(', ')}</span>
          <button class="btn xs" onClick=${() => addItems(date, meal.key, planMeal.items)}>Usar</button>
        </div>
      `}
    </div>
  `;
}

// "2 ovos (100 g)" quando foi lançado em medida caseira; senão "100 g".
function itemQty(f, it) {
  const u = it.u && unitsFor(f).units.find((x) => x.label === it.u);
  return u && it.q ? `${unitText(it.q, u)} (${num(it.g)} g)` : `${num(it.g)} g`;
}

function addItems(date, meal, items) {
  update((s) => {
    const d = (s.diary[date] ??= { meals: {}, water: 0 });
    const l = (d.meals[meal] ??= []);
    for (const it of items) {
      l.push({ id: uid(), foodId: it.foodId, g: it.g, ...(it.u ? { u: it.u, q: it.q } : {}) });
      s.recentFoods = [it.foodId, ...s.recentFoods.filter((x) => x !== it.foodId)].slice(0, 30);
    }
  });
}

function removeItem(date, meal, id) {
  update((s) => {
    const l = s.diary[date]?.meals?.[meal];
    if (l) s.diary[date].meals[meal] = l.filter((x) => x.id !== id);
  });
}

async function applyPlan(plan, date) {
  const s = getState();
  const has = Object.values(dayEntry(s, date).meals).some((l) => l.length);
  if (has && !(await confirmDialog('Substituir as refeições deste dia pelo plano?', { ok: 'Substituir', danger: false }))) return;
  update((st) => {
    const d = (st.diary[date] ??= { meals: {}, water: 0 });
    d.meals = Object.fromEntries(plan.meals.map((m) => [m.key, m.items.map((it) => ({ id: uid(), foodId: it.foodId, g: it.g }))]));
  });
  toast('Plano aplicado ao diário');
}

// --- Busca de alimentos -----------------------------------------------------------------

function openFoodSearch(date, meal) {
  openModal((close) => html`<${FoodSearch}
    close=${close}
    onPick=${(f) => { close(); openPortion(f, { date, meal }); }}
    onSavedMeal=${(sm) => { close(); addItems(date, meal, sm.items); toast(`${sm.name} adicionada`); }}
    onScanned=${(f, g) => { close(); openPortion(f, { date, meal, defaultG: g }); }}
  />`);
}

// Escaneia e devolve um alimento salvo (já existente ou recém-cadastrado) + porção sugerida.
export function scanFood(onReady) {
  openScanner({
    onFound: (food, g) => onReady(food, g),
    onNew: (prefill) => openCustomFood(null, { prefill, title: prefill.name ? 'Confirmar produto' : 'Cadastrar produto', onSaved: (rec) => onReady(rec, rec.serving ?? 100) }),
  });
}

function FoodSearch({ close, onPick, onSavedMeal, onScanned }) {
  const s = getState();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(null);
  const results = useMemo(() => {
    if (!q && !cat) {
      const rec = s.recentFoods.map(getFood).filter(Boolean);
      return rec.length ? rec : searchFoods('', { limit: 30 });
    }
    return searchFoods(q, { cat, limit: 60 });
  }, [q, cat]);
  return html`
    <${Sheet} title="Adicionar alimento" onClose=${close} full sub=${html`
      <div class="row">
        <button class="btn sm dark grow" onClick=${() => scanFood((f, g) => (onScanned ? onScanned(f, g) : onPick(f)))}><${Icon} name="scan" />Escanear código</button>
      </div>
      ${onSavedMeal && (s.savedMeals ?? []).length > 0 && html`
        <div class="chips" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px">
          ${(s.savedMeals ?? []).map((sm) => html`<button class="chip saved-chip" style="white-space:nowrap" onClick=${() => onSavedMeal(sm)}>★ ${sm.name} · ${num(sumMacros(sm.items).kcal)} kcal</button>`)}
        </div>
      `}
      <input class="input" type="search" enterkeyhint="search" placeholder="Buscar na TACO: frango, arroz, banana…" value=${q} onInput=${(e) => setQ(e.target.value)} />
      <div class="chips" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px">
        <button class=${`chip ${!cat ? 'on' : ''}`} onClick=${() => setCat(null)}>Todas</button>
        ${TACO_CATEGORIES.map((c, i) => html`<button class=${`chip ${cat === i + 1 ? 'on' : ''}`} style="white-space:nowrap" onClick=${() => setCat(i + 1)}>${c.split(' ')[0].replace(',', '')}</button>`)}
      </div>
    `}>
      ${!q && !cat && s.recentFoods.length > 0 && html`<div class="eyebrow">Recentes</div>`}
      <div class="list">
        ${results.map((f) => html`
          <button class="li btnlike" key=${f.id} onClick=${() => onPick(f)}>
            <div class="grow">
              <div class="t" style="white-space:normal">${f.name}${f.custom ? html` <span class="tag">Meu</span>` : f.extra ? html` <span class="tag">Rótulo</span>` : ''}</div>
              <div class="s mono">100 g · ${num(f.kcal)} kcal · P ${num(f.p, 1)} · C ${num(f.c, 1)} · G ${num(f.f, 1)}${unitsFor(f).units[0] ? html` · <b>1 ${unitsFor(f).units[0].label} = ${num(unitsFor(f).units[0].g)} g</b>` : ''}</div>
            </div>
            <${Icon} name="plus" />
          </button>
        `)}
        ${!results.length && html`<div class="li small muted">Nada encontrado. Cadastre em Dieta → TACO → Novo alimento.</div>`}
      </div>
    <//>
  `;
}

function openPortion(food, ctx) {
  if (!food) return;
  openModal((close) => html`<${Portion} food=${food} ctx=${ctx} close=${close} />`);
}

function Portion({ food, ctx, close }) {
  const { units, preferred } = unitsFor(food);
  // medida inicial: a do item editado; senão a medida caseira preferida (ex.: 1 ovo); senão gramas
  const initUnit = ctx.item?.u ? Math.max(-1, units.findIndex((x) => x.label === ctx.item.u)) : ctx.defaultG == null && preferred && units.length ? 0 : -1;
  const [ui, setUi] = useState(initUnit);
  const [q, setQ] = useState(ctx.item?.u && initUnit >= 0 ? ctx.item.q : 1);
  const [grams, setGrams] = useState(ctx.item?.g ?? ctx.defaultG ?? 100);
  const [meal, setMeal] = useState(ctx.meal);
  const unit = ui >= 0 ? units[ui] : null;
  const g = unit ? Math.round((q || 0) * unit.g * 10) / 10 : grams;
  const m = macrosFor(food, g || 0);
  const pickUnit = (i) => {
    if (i === ui) return;
    if (i < 0) setGrams(g || 100);
    else setQ(unit || !g ? 1 : Math.max(0.5, Math.round((g / units[i].g) * 2) / 2));
    setUi(i);
  };
  const save = () => {
    if (!g || g <= 0) return toast('Informe a quantidade');
    const extra = unit ? { u: unit.label, q } : {};
    if (ctx.onSave) {
      ctx.onSave(food.id, g, extra);
      return close();
    }
    if (ctx.item) {
      update((s) => {
        const src = s.diary[ctx.date].meals[ctx.meal];
        const it = src.find((x) => x.id === ctx.item.id);
        it.g = g;
        if (unit) { it.u = unit.label; it.q = q; } else { delete it.u; delete it.q; }
        if (meal !== ctx.meal) {
          s.diary[ctx.date].meals[ctx.meal] = src.filter((x) => x.id !== it.id);
          (s.diary[ctx.date].meals[meal] ??= []).push(it);
        }
      });
    } else {
      addItems(ctx.date, meal, [{ foodId: food.id, g, ...extra }]);
    }
    close();
  };
  return html`
    <${Sheet} title=${ctx.item ? 'Editar porção' : 'Porção'} onClose=${close} footer=${html`<button class="btn primary block" onClick=${save}>${ctx.item ? 'Salvar' : 'Adicionar'}</button>`}>
      <div>
        <h3>${food.name}</h3>
        <div class="tiny muted mono" style="margin-top:4px">${food.custom ? (food.recipe ? 'Refeição salva como alimento' : 'Alimento personalizado') : food.extra ? 'Valor médio de rótulo' : `TACO · ${categoryName(food.cat)}`}</div>
      </div>
      ${units.length > 0 && html`
        <div class="chips">
          ${units.map((x, i) => html`<button class=${`chip ${ui === i ? 'on' : ''}`} onClick=${() => pickUnit(i)}>${x.label}</button>`)}
          <button class=${`chip ${ui < 0 ? 'on' : ''}`} onClick=${() => pickUnit(-1)}>gramas</button>
        </div>`}
      ${unit
        ? html`
          <${Field} label="Quantidade" hint=${`1 ${unit.label} ≈ ${num(unit.g)} g · total ${num(g)} g`}>
            <${NumInput} key=${`u${ui}`} value=${q} onInput=${setQ} unit=${q > 1 ? unit.plural.split(' (')[0] : unit.label.split(' (')[0]} step="any" onKeyDown=${(e) => e.key === 'Enter' && save()} />
          <//>
          <div class="chips">${[0.5, 1, 2, 3, 4].map((v) => html`<button class=${`chip ${q === v ? 'on' : ''}`} onClick=${() => setQ(v)}>${unitText(v, unit)}</button>`)}</div>`
        : html`
          <${Field} label="Quantidade">
            <${NumInput} key="g" value=${grams} onInput=${setGrams} unit="g" onKeyDown=${(e) => e.key === 'Enter' && save()} />
          <//>
          <div class="chips">${[25, 50, 100, 150, 200, 300].map((v) => html`<button class=${`chip ${grams === v ? 'on' : ''}`} onClick=${() => setGrams(v)}>${v} g</button>`)}</div>`}
      <div class="grid-4">
        <${Stat} v=${num(m.kcal)} l="kcal" />
        <${Stat} v=${num(m.p, 1)} unit="g" l="Prot" />
        <${Stat} v=${num(m.c, 1)} unit="g" l="Carb" />
        <${Stat} v=${num(m.f, 1)} unit="g" l="Gord" />
      </div>
      ${!ctx.onSave && html`
        <${Field} label="Refeição">
          <select class="input" value=${meal} onChange=${(e) => setMeal(e.target.value)}>
            ${MEALS.map((x) => html`<option value=${x.key}>${x.label}</option>`)}
          </select>
        <//>
      `}
    <//>
  `;
}

// --- Refeições salvas ------------------------------------------------------------------

function saveMealFromDiary(items, label) {
  openModal((close) => html`<${SavedMealEditor} initial=${{ name: label, items: items.map((x) => ({ foodId: x.foodId, g: x.g, ...(x.u ? { u: x.u, q: x.q } : {}) })) }} close=${close} />`);
}

function SavedMealsTab({ s }) {
  const list = s.savedMeals ?? [];
  return html`
    <div class="stack">
      <p class="small muted">Salve combinações que você repete (ex.: “Café de sempre”) e adicione tudo com um toque no diário. Ou transforme uma receita/marmita em <b>um alimento só</b> (opção “Um alimento só” ao criar).</p>
      <button class="btn primary" onClick=${() => openModal((close) => html`<${SavedMealEditor} close=${close} />`)}><${Icon} name="plus" />Nova refeição</button>
      ${!list.length && html`<${Empty} title="Nenhuma refeição salva" text="Crie aqui ou toque em ★ numa refeição do diário para salvá-la." />`}
      ${list.map((sm) => {
        const t = sumMacros(sm.items);
        return html`
          <div class="meal" key=${sm.id}>
            <div class="meal-head">
              <h3>★ ${sm.name}</h3>
              <span class="mono tiny">${num(t.kcal)} kcal · ${num(t.p)}P</span>
              <button class="btn xs" onClick=${() => openModal((close) => html`<${SavedMealEditor} meal=${sm} close=${close} />`)} aria-label="Editar"><${Icon} name="edit" size="14" /></button>
            </div>
            ${sm.items.map((it, i) => html`<div class="food-li" key=${i}><div class="grow"><div class="t">${getFood(it.foodId)?.name ?? 'Alimento removido'}</div><div class="s">${itemQty(getFood(it.foodId), it)} · ${fmtMacros(macrosFor(it.foodId, it.g))}</div></div></div>`)}
          </div>
        `;
      })}
    </div>
  `;
}

// Refeição → um alimento só: macros por 100 g a partir da soma dos itens; 1 porção = peso total.
export function mealAsFood(name, items, id) {
  const t = sumMacros(items);
  const total = items.reduce((a, it) => a + (Number(it.g) || 0), 0);
  const k = total > 0 ? 100 / total : 0;
  const sodium = items.reduce((a, it) => a + ((getFood(it.foodId)?.sodium || 0) * (Number(it.g) || 0)) / 100, 0);
  const r1 = (v) => Math.round(v * k * 10) / 10;
  return {
    id: id ?? `c-${uid()}`, name, cat: 99,
    kcal: Math.round(t.kcal * k), p: r1(t.p), c: r1(t.c), f: r1(t.f), fiber: r1(t.fiber), sodium: Math.round(sodium * k),
    serving: Math.round(total), recipe: items.map((x) => ({ foodId: x.foodId, g: x.g })),
  };
}

function SavedMealEditor({ meal, initial, close }) {
  const [name, setName] = useState(meal?.name ?? initial?.name ?? '');
  const [items, setItems] = useState(meal?.items ?? initial?.items ?? []);
  const [mode, setMode] = useState('meal');
  const t = sumMacros(items);
  const totalG = items.reduce((a, it) => a + (Number(it.g) || 0), 0);
  const addFood = () => {
    openModal((c2) => html`<${FoodSearch} close=${c2} onPick=${(f) => { c2(); openPortion(f, { onSave: (foodId, g, extra) => setItems((cur) => [...cur, { foodId, g, ...extra }]) }); }} />`);
  };
  const save = () => {
    if (!name.trim()) return toast(mode === 'food' ? 'Dê um nome ao alimento' : 'Dê um nome à refeição');
    if (!items.length) return toast('Adicione ao menos um alimento');
    if (mode === 'food') {
      if (totalG <= 0) return toast('Informe as quantidades');
      const rec = mealAsFood(name.trim(), items);
      update((st) => {
        st.customFoods.push(rec);
        if (meal) st.savedMeals = (st.savedMeals ?? []).filter((x) => x.id !== meal.id);
      });
      toast(`“${rec.name}” virou alimento · 1 porção = ${num(rec.serving)} g`);
      return close();
    }
    update((st) => {
      st.savedMeals ??= [];
      const rec = { id: meal?.id ?? uid(), name: name.trim(), items };
      const i = st.savedMeals.findIndex((x) => x.id === rec.id);
      if (i >= 0) st.savedMeals[i] = rec;
      else st.savedMeals.push(rec);
    });
    toast('Refeição salva');
    close();
  };
  const remove = async () => {
    if (!(await confirmDialog(`Excluir a refeição "${meal.name}"?`, { ok: 'Excluir' }))) return;
    update((st) => { st.savedMeals = (st.savedMeals ?? []).filter((x) => x.id !== meal.id); });
    close();
  };
  return html`
    <${Sheet} title=${meal ? 'Editar refeição' : 'Nova refeição'} onClose=${close} footer=${html`
      ${meal && html`<button class="btn danger" onClick=${remove}><${Icon} name="trash" /></button>`}
      <button class="btn primary grow" onClick=${save}>${mode === 'food' ? 'Salvar como alimento' : 'Salvar'}</button>
    `}>
      <${Field} label="Salvar como">
        <${Seg} value=${mode} onChange=${setMode} options=${[['meal', 'Refeição (itens separados)'], ['food', 'Um alimento só']]} />
      <//>
      <p class="tiny muted">${mode === 'food'
        ? 'Vira um alimento único na busca (ex.: “Marmita de frango”, “Vitamina”). No diário entra como 1 item, em porções ou gramas — não lança cada ingrediente.'
        : 'Ao usar, adiciona cada alimento separado no diário.'}</p>
      <${Field} label="Nome"><input class="input" value=${name} onInput=${(e) => setName(e.target.value)} placeholder=${mode === 'food' ? 'Ex.: Marmita de frango, Bolo de banana fit' : 'Ex.: Café de sempre, Pós-treino'} /><//>
      <div class="mono small">${num(t.kcal)} kcal · P ${num(t.p)} · C ${num(t.c)} · G ${num(t.f)}${mode === 'food' && totalG > 0 ? html` · <b>1 porção = ${num(totalG)} g</b>` : ''}</div>
      <div class="list">
        ${items.map((it, i) => html`
          <div class="food-li" key=${i + ':' + it.foodId}>
            <div class="grow"><div class="t">${getFood(it.foodId)?.name ?? '—'}</div>${it.u && html`<div class="s">${itemQty(getFood(it.foodId), it)}</div>`}</div>
            <div style="width:96px"><${NumInput} value=${it.g} onInput=${(v) => setItems((cur) => cur.map((x, j) => (j === i ? { foodId: x.foodId, g: v || 0 } : x)))} unit="g" /></div>
            <button class="x-btn" aria-label="Remover" onClick=${() => setItems((cur) => cur.filter((_, j) => j !== i))}>×</button>
          </div>
        `)}
      </div>
      <div class="row">
        <button class="btn grow" onClick=${addFood}><${Icon} name="plus" />Alimento</button>
        <button class="btn grow" onClick=${() => scanFood((f, g) => setItems((cur) => [...cur, { foodId: f.id, g }]))}><${Icon} name="scan" />Escanear</button>
      </div>
    <//>
  `;
}

// --- Plano automático ------------------------------------------------------------------

const DEFAULT_ANSWERS = {
  goal: null, style: 'tradicional', meals: 5, trainTime: 'noite', cookTime: 'quick', recipes: true, budget: 'normal',
  vegetarian: false, vegan: false, lactoseFree: false, glutenFree: false, noEggs: false,
  noFish: false, noPork: false, noSoy: false, noSupplements: false, nutAllergy: false,
  preferredProteins: [], preferredCarbs: [], excluded: [],
};

const RESTRICTIONS = [
  ['lactoseFree', 'Sem lactose'], ['glutenFree', 'Sem glúten'], ['vegetarian', 'Vegetariano'], ['vegan', 'Vegano'],
  ['noEggs', 'Sem ovo'], ['noFish', 'Sem peixe'], ['noPork', 'Sem carne de porco'], ['nutAllergy', 'Alergia a castanhas/amendoim'],
  ['noSoy', 'Sem soja'], ['noSupplements', 'Sem suplementos (whey)'],
];

// "Não como de jeito nenhum": grupos simples em vez de 60 alimentos.
const DISLIKES = [
  ['Batata-doce', [88]], ['Mandioca', [129]], ['Cuscuz', [533]], ['Tapioca', [9005]], ['Aveia', [7]],
  ['Feijão', [561, 567]], ['Lentilha', [577]], ['Grão-de-bico', [9012]], ['Abóbora', [64]], ['Brócolis', [100]],
  ['Couve', [116]], ['Abobrinha / berinjela', [70, 72, 95]], ['Beterraba', [97]], ['Iogurte', [448, 449, 9006]],
  ['Cottage / ricota', [9014, 469]], ['Requeijão', [468]], ['Atum / sardinha', [277, 318, 319]], ['Tofu', [584]],
  ['Proteína de soja', [9015, 583]], ['Peito de peru / presunto', [9010, 439]], ['Abacate', [163]], ['Mamão', [225, 226]],
  ['Banana', [182]], ['Pasta de amendoim', [9004]], ['Café', [471]],
];

const GOAL_OPTS = [
  ['cut', '🔥 Secar', 'Perder gordura'],
  ['recomp', '⚖️ Recomposição', 'Perder gordura e ganhar músculo'],
  ['maintain', '🎯 Manter', 'Manter peso e performance'],
  ['bulk', '💪 Ganhar massa', 'Superávit controlado'],
];

// Perguntas da Nutri: uma por vez, quase tudo em um toque.
const STEPS = [
  { id: 'goal', ask: 'Oi! Sou a Nutri do FitQuest 👋 Vou montar seu plano em poucas perguntas. Qual é o seu objetivo agora?', opts: GOAL_OPTS },
  { id: 'style', ask: 'Qual estilo de comida combina mais com você?', style: true },
  { id: 'meals', ask: 'Quantas refeições você consegue fazer por dia?', opts: [[3, '3', 'Rotina corrida'], [4, '4', 'Equilibrado'], [5, '5', 'Recomendado'], [6, '6', 'Muita fome / ganho']] },
  { id: 'trainTime', ask: 'Em que horário você costuma treinar? Eu coloco mais carboidrato perto do treino.', opts: [['manha', '🌅 Manhã'], ['tarde', '☀️ Tarde'], ['noite', '🌙 Noite'], ['nao', 'Não treino']] },
  { id: 'restrictions', ask: 'Alguma restrição ou alergia?', multi: RESTRICTIONS },
  { id: 'cookTime', ask: 'Quanto tempo você tem para cozinhar?', opts: [['none', '⚡ Quase nada', 'Rápido ou sem fogão'], ['quick', '🍳 Até 20 min', 'Pratos simples'], ['cook', '👩‍🍳 Gosto de cozinhar', 'Receitas mais elaboradas']] },
  { id: 'recipes', ask: 'Quer que eu mostre o modo de preparo de cada refeição?', opts: [[true, 'Sim, com receitas'], [false, 'Não, só os alimentos']] },
  { id: 'budget', ask: 'E o orçamento para a feira?', opts: [['eco', '💰 Econômico', 'Evito salmão, whey, castanhas…'], ['normal', 'Normal']] },
  { id: 'dislikes', ask: 'Tem algo que você não come de jeito nenhum? (opcional)', dislikes: true },
];

const optLabel = (st, v, a) => {
  if (st.id === 'style') return `${DIET_STYLES[v].emoji} ${DIET_STYLES[v].label}`;
  if (st.id === 'restrictions') {
    const on = RESTRICTIONS.filter(([k]) => a[k]).map(([, l]) => l);
    return on.length ? on.join(', ') : 'Nenhuma';
  }
  if (st.id === 'dislikes') {
    const on = DISLIKES.filter(([, ids]) => ids.some((id) => a.excluded.includes(id))).map(([l]) => l);
    return on.length ? on.join(', ') : 'Como de tudo';
  }
  const o = st.opts.find((x) => x[0] === v);
  return o ? o[1] : String(v);
};

function PlanTab({ s, today }) {
  const [editing, setEditing] = useState(!s.dietPlan);
  const t = targets(s);
  if (!t) return null;
  if (editing || !s.dietPlan) {
    return html`<${NutriChat} s=${s} initial=${s.dietPlan?.answers} onDone=${() => setEditing(false)} canCancel=${!!s.dietPlan} />`;
  }
  return html`<${PlanView} s=${s} t=${t} today=${today} onRedo=${() => setEditing(true)} />`;
}

function PlanView({ s, t, today, onRedo }) {
  const plan = s.dietPlan;
  const goalT = plan.target;
  const tot = sumMacros(plan.meals.flatMap((m) => m.items));
  const a = plan.answers ?? {};
  const style = DIET_STYLES[a.style];
  const regen = () => update((st) => { st.dietPlan = generatePlan(targets(st), { ...plan.answers, kg: latestWeight(st) }, Date.now()); });
  const base = plan.baseTarget ?? plan.target;
  const outdated = Math.abs(base.kcal - t.kcal) > 50 || Math.abs(base.protein - t.protein) > 5;
  const dev = Math.max(...[[tot.kcal, goalT.kcal], [tot.p, goalT.protein], [tot.c, goalT.carbs]].map(([v, g]) => Math.abs(v - g) / g));
  const showRecipes = a.recipes !== false;

  return html`
    <div class="stack">
      ${plan.version !== 3 && html`<div class="callout small" style="border-left-color:var(--accent)">A Nutri ganhou um questionário novo, com estilos de dieta e receitas. <button class="link-btn" onClick=${onRedo}>Refazer agora</button></div>`}
      <div class="card ink">
        <div class="row-sb"><div class="eyebrow">Plano da Nutri${style ? ` · ${style.emoji} ${style.label}` : ''}</div><span class="mono tiny">${fmtDate(dateKey(new Date(plan.createdAt)))}</span></div>
        <div class="row-sb" style="margin-top:8px"><span class="big-num">${num(tot.kcal)}</span><span class="mono small">/ ${num(goalT.kcal)} kcal</span></div>
        <div class="grid-3" style="margin-top:10px">
          ${[['P', tot.p, goalT.protein], ['C', tot.c, goalT.carbs], ['G', tot.f, goalT.fat]].map(([l, v, g]) => html`
            <div><div class="mono" style="font-weight:700;font-size:18px">${num(v)}g</div><div class="eyebrow">${l} · meta ${num(g)}</div></div>
          `)}
        </div>
      </div>
      ${plan.version === 3 && plan.solver !== 2 && html`<div class="callout small" style="border-left-color:var(--accent)">A Nutri ficou mais precisa nas quantidades. <button class="link-btn" onClick=${regen}>Recalcular meu plano</button> para tudo bater com suas metas.</div>`}
      ${outdated && html`<div class="callout warn small">Suas metas mudaram desde que o plano foi gerado. <button class="link-btn" onClick=${regen}>Recalcular</button></div>`}
      ${dev > 0.1 && html`<div class="callout warn small">Com essas escolhas o plano ficou ${Math.round(dev * 100)}% fora de alguma meta. Mais refeições ou menos restrições de proteína ajudam.</div>`}
      ${plan.notes && html`
        <div class="card nutri-card">
          <div class="row" style="gap:10px;align-items:flex-start">
            <span class="nutri-avatar">🥗</span>
            <div class="grow stack-sm">
              <div class="eyebrow">Análise da Nutri</div>
              <ul class="nutri-list">${plan.notes.why.map((x) => html`<li>${x}</li>`)}</ul>
              <details><summary class="small"><b>Dicas para seguir o plano</b></summary><ul class="nutri-list" style="margin-top:6px">${plan.notes.tips.map((x) => html`<li>${x}</li>`)}</ul></details>
            </div>
          </div>
        </div>`}
      ${plan.meals.map((m) => {
        const mt = sumMacros(m.items);
        const opts = m.options ?? [];
        const opt = opts[m.choice ?? 0];
        return html`
          <div class="meal" key=${m.key}>
            <div class="meal-head">
              <h3>${m.when ? html`<span class="mono tiny muted">${m.when}</span> ` : ''}${MEALS.find((x) => x.key === m.key).label}</h3>
              ${m.badge && html`<span class="tag acc">${m.badge}</span>`}
              <span class="mono tiny">${num(mt.kcal)} kcal · ${num(mt.p)}P · ${num(mt.c)}C · ${num(mt.f)}G</span>
            </div>
            ${opts.length > 1 && html`
              <div class="opt-row">
                ${opts.map((o, oi) => html`<button class=${`chip ${(m.choice ?? 0) === oi ? 'on' : ''}`} onClick=${() => chooseOption(m.key, oi)}>Opção ${oi + 1}</button>`)}
              </div>
            `}
            ${m.name && html`<div class="meal-name">${m.name}${opt?.time ? html` <span class="mono tiny muted">· ⏱ ${opt.time} min</span>` : ''}</div>`}
            ${m.items.map((it, i) => {
              const f = getFood(it.foodId);
              const hm = houseMeasure(it.foodId, it.g);
              return html`
                <div class="food-li" key=${i}>
                  <div class="grow"><div class="t">${it.add ? html`<span class="tag acc" title="Somado pela Nutri para fechar seus macros">+ ajuste</span> ` : ''}${hm ? html`<b>${hm}</b> · ` : ''}${f.name}</div><div class="s">${num(it.g)} g · ${fmtMacros(macrosFor(f, it.g))}</div></div>
                  <button class="x-btn" aria-label="Substituir" title="Substituir" onClick=${() => openSubstitutes(m.key, i, it)}><${Icon} name="swap" size="14" /></button>
                </div>
              `;
            })}
            ${m.items.some((it) => it.add) && html`<p class="tiny muted" style="margin-top:6px">“+ ajuste”: a Nutri somou esse alimento para a refeição bater seus macros.</p>`}
            ${showRecipes && opt?.recipe?.length > 0 && html`
              <details class="recipe">
                <summary>Modo de preparo</summary>
                <ol>${opt.recipe.map((r) => html`<li>${r}</li>`)}</ol>
              </details>`}
          </div>
        `;
      })}
      <button class="btn primary" onClick=${() => applyPlan(plan, today)}><${Icon} name="copy" />Aplicar ao diário de hoje</button>
      <button class="btn" onClick=${() => openShoppingList(plan)}><${Icon} name="diet" />Lista de compras da semana</button>
      <div class="row">
        <button class="btn grow" onClick=${regen}>Outras opções</button>
        <button class="btn grow" onClick=${onRedo}>Refazer perguntas</button>
      </div>
      <p class="tiny muted">Porções em peso pronto para consumo (exceto quando indicado “cru”). Valores da TACO/UNICAMP. A Nutri do app é um assistente automático, não substitui um nutricionista — especialmente com condições de saúde específicas.</p>
    </div>
  `;
}

function chooseOption(mealKey, oi) {
  update((st) => {
    const m = st.dietPlan.meals.find((x) => x.key === mealKey);
    const o = m.options?.[oi];
    if (!o) return;
    m.choice = oi;
    m.items = o.items.map((x) => ({ ...x }));
    m.name = o.name;
  });
}

function openSubstitutes(mealKey, idx, item) {
  const subs = substitutes(item.foodId, item.g);
  openModal((close) => html`
    <${Sheet} title="Substituir por" onClose=${close}>
      <p class="small muted">Quantidades equivalentes no macronutriente principal de <b>${getFood(item.foodId).name}</b> (${item.g} g).</p>
      <div class="list">
        ${subs.map((x) => html`
          <button class="li btnlike" onClick=${() => {
            update((s) => { const m = s.dietPlan.meals.find((mm) => mm.key === mealKey); m.items[idx] = { foodId: x.foodId, g: x.g }; });
            close();
          }}>
            <div class="grow"><div class="t">${getFood(x.foodId).name}</div><div class="s">${x.g} g · ${fmtMacros(macrosFor(x.foodId, x.g))}</div></div>
            <${Icon} name="swap" />
          </button>
        `)}
        ${!subs.length && html`<div class="li small muted">Sem substitutos cadastrados para este item.</div>`}
      </div>
    <//>
  `);
}

// Lista de compras: opções escolhidas × 7 dias, agrupada por tipo de alimento.
export function shoppingList(plan, days = 7) {
  const tot = new Map();
  for (const m of plan.meals) for (const it of m.items) tot.set(it.foodId, (tot.get(it.foodId) ?? 0) + it.g * days);
  const groups = new Map();
  for (const [id, g] of tot) {
    const f = getFood(id);
    if (!f) continue;
    const { units, preferred } = unitsFor(f);
    const u = preferred && units[0];
    const qty = u ? unitText(Math.ceil(g / u.g), u) : g >= 1000 ? `${String(+(g / 1000).toFixed(1)).replace('.', ',')} kg` : `${Math.round(g / 10) * 10} g`;
    const cat = f.custom ? 'Outros' : categoryName(f.cat);
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push({ name: shortName(id), qty });
  }
  return [...groups.entries()].map(([cat, items]) => ({ cat, items: items.sort((a, b) => a.name.localeCompare(b.name)) }));
}

function openShoppingList(plan) {
  const list = shoppingList(plan);
  const text = list.map((g) => `${g.cat.toUpperCase()}\n${g.items.map((i) => `- ${i.name}: ${i.qty}`).join('\n')}`).join('\n\n');
  openModal((close) => html`
    <${Sheet} title="Lista de compras · 7 dias" onClose=${close} footer=${html`<button class="btn primary block" onClick=${async () => { try { await navigator.clipboard.writeText(text); toast('Lista copiada'); } catch { toast('Não foi possível copiar'); } }}><${Icon} name="copy" />Copiar lista</button>`}>
      <p class="small muted">Com as opções escolhidas hoje em cada refeição, repetidas por 7 dias. Pesos de alimentos prontos (arroz, feijão e carnes cozidos rendem mais do que o peso cru).</p>
      ${list.map((g) => html`
        <div class="stack-sm">
          <div class="eyebrow">${g.cat}</div>
          <div class="list">${g.items.map((i) => html`<div class="li"><span class="t grow">${i.name}</span><b class="mono small">${i.qty}</b></div>`)}</div>
        </div>`)}
    <//>
  `);
}

// --- Questionário em conversa com a Nutri ----------------------------------------------

function NutriChat({ s, initial, onDone, canCancel }) {
  const [a, setA] = useState(() => ({ ...DEFAULT_ANSWERS, ...(initial ?? {}), goal: s.profile?.goal ?? initial?.goal ?? 'maintain' }));
  const [step, setStep] = useState(0);
  const [thinking, setThinking] = useState(false);
  const cur = STEPS[step];
  const answer = (k, v) => {
    setA((o) => ({ ...o, [k]: v }));
    setStep((i) => i + 1);
  };
  const toggle = (k) => setA((o) => {
    const n = { ...o, [k]: !o[k] };
    if (k === 'vegan' && n.vegan) n.vegetarian = true;
    return n;
  });
  const toggleDislike = (ids) => setA((o) => {
    const on = ids.some((id) => o.excluded.includes(id));
    return { ...o, excluded: on ? o.excluded.filter((x) => !ids.includes(x)) : [...o.excluded, ...ids] };
  });
  const finish = () => {
    setThinking(true);
    setTimeout(() => {
      update((st) => {
        if (st.profile && a.goal && st.profile.goal !== a.goal) st.profile.goal = a.goal;
      });
      const st = getState();
      update((x) => { x.dietPlan = generatePlan(targets(st), { ...a, kg: latestWeight(st) }, Date.now()); });
      onDone();
    }, 700);
  };
  const tNow = targets(s);
  return html`
    <div class="stack">
      <div class="row-sb">
        <div class="row" style="gap:10px"><span class="nutri-avatar">🥗</span><div><div class="eyebrow">Nutri FitQuest</div><div class="tiny muted">Seu plano em ~1 minuto</div></div></div>
        ${canCancel && html`<button class="btn xs" onClick=${onDone}>Cancelar</button>`}
      </div>
      <div class="xp-bar" style="height:10px"><i style=${`width:${Math.round((Math.min(step, STEPS.length) / STEPS.length) * 100)}%`}></i></div>
      <div class="chat">
        ${STEPS.slice(0, step).map((st, i) => html`
          <div class="bubble bot small">${st.ask}</div>
          <button class="bubble me" title="Alterar" onClick=${() => setStep(i)}>${optLabel(st, st.id === 'restrictions' || st.id === 'dislikes' ? null : a[st.id], a)} <span class="tiny">✎</span></button>
        `)}
        ${cur && html`<div class="bubble bot">${cur.ask}</div>`}
        ${cur?.id === 'goal' && s.manualTargets && html`<div class="tiny muted">Você usa metas manuais (${num(tNow.kcal)} kcal) — o objetivo muda só o estilo das refeições.</div>`}
        ${step >= STEPS.length && !thinking && html`
          <div class="bubble bot">Perfeito! Vou montar ${a.meals} refeições no estilo <b>${DIET_STYLES[a.style].label.toLowerCase()}</b>, com 3 opções equivalentes em cada uma${a.recipes ? ' e o modo de preparo' : ''}.</div>`}
        ${thinking && html`<div class="bubble bot typing"><i></i><i></i><i></i></div>`}
      </div>

      ${cur?.opts && html`
        <div class=${`answer-grid ${cur.opts.some((o) => o[2]) ? 'with-hint' : ''}`}>
          ${cur.opts.map(([v, l, hint]) => html`
            <button class=${`answer ${a[cur.id] === v ? 'on' : ''}`} onClick=${() => answer(cur.id, v)}><b>${l}</b>${hint && html`<span>${hint}</span>`}</button>`)}
        </div>`}
      ${cur?.style && html`
        <div class="answer-grid with-hint">
          ${Object.entries(DIET_STYLES).map(([k, st]) => html`
            <button class=${`answer ${a.style === k ? 'on' : ''}`} onClick=${() => { if (k === 'vegana') setA((o) => ({ ...o, vegan: true, vegetarian: true })); if (k === 'vegetariana') setA((o) => ({ ...o, vegetarian: true })); answer('style', k); }}>
              <b>${st.emoji} ${st.label}</b><span>${st.desc}</span>
            </button>`)}
        </div>`}
      ${cur?.multi && html`
        <div class="chips">${cur.multi.map(([k, l]) => html`<button class=${`chip ${a[k] ? 'on' : ''}`} onClick=${() => toggle(k)}>${l}</button>`)}</div>
        <button class="btn primary" onClick=${() => setStep((i) => i + 1)}>${RESTRICTIONS.some(([k]) => a[k]) ? 'Continuar' : 'Nenhuma, continuar'}</button>`}
      ${cur?.dislikes && html`
        <div class="chips">${DISLIKES.map(([l, ids]) => html`<button class=${`chip ${ids.some((id) => a.excluded.includes(id)) ? 'on' : ''}`} onClick=${() => toggleDislike(ids)}>${l}</button>`)}</div>
        <button class="btn primary" onClick=${() => setStep((i) => i + 1)}>${a.excluded.length ? 'Continuar' : 'Como de tudo, continuar'}</button>`}
      ${step >= STEPS.length && html`
        <button class="btn primary" disabled=${thinking} onClick=${finish}><${Icon} name="bolt" />${thinking ? 'Montando seu plano…' : 'Montar meu plano'}</button>`}
      ${step > 0 && !thinking && html`<button class="btn ghost sm" onClick=${() => setStep((i) => i - 1)}>← Voltar</button>`}
    </div>
  `;
}

// --- Metas ---------------------------------------------------------------------------

function TargetsTab({ s }) {
  const auto = autoTargets(s);
  const t = targets(s);
  const p = s.profile;
  const [manual, setManual] = useState(s.manualTargets ?? { kcal: auto.kcal, protein: auto.protein, carbs: auto.carbs, fat: auto.fat, water: auto.water });
  const setProfile = (k, v) => update((st) => { st.profile[k] = v; });
  const bf = currentBf(s);
  return html`
    <div class="stack">
      <div class="card">
        <div class="card-title"><h3 class="up">Cálculo automático</h3>${!s.manualTargets && html`<span class="tag acc">Ativo</span>`}</div>
        <dl class="kv">
          <dt>Peso atual</dt><dd>${num(latestWeight(s), 1)} kg</dd>
          <dt>% gordura</dt><dd>${bf != null ? `${num(bf, 1)}%` : '— (faça uma avaliação)'}</dd>
          <dt>TMB (${bf != null ? 'Katch-McArdle' : 'Mifflin-St Jeor'})</dt><dd>${num(auto.bmr)} kcal</dd>
          <dt>Gasto total (×${ACTIVITY[p.activity].factor})</dt><dd>${num(auto.tdee)} kcal</dd>
          <dt>Ajuste do objetivo</dt><dd>${GOALS[p.goal].kcalAdj > 0 ? '+' : ''}${Math.round(GOALS[p.goal].kcalAdj * 100)}%</dd>
          <dt><b>Meta</b></dt><dd>${num(auto.kcal)} kcal</dd>
          <dt>Proteína (${GOALS[p.goal].proteinPerKg} g/kg${bf != null ? ' ajustado' : ''})</dt><dd>${auto.protein} g</dd>
          <dt>Gordura (25% / mín. 0,6 g/kg)</dt><dd>${auto.fat} g</dd>
          <dt>Carboidrato (restante)</dt><dd>${auto.carbs} g</dd>
          <dt>Água (35 ml/kg)</dt><dd>${num(auto.water)} ml</dd>
        </dl>
      </div>
      <${Field} label="Objetivo">
        <div class="choice-grid">
          ${Object.entries(GOALS).map(([k, g]) => html`<button class=${`choice ${p.goal === k ? 'on' : ''}`} onClick=${() => setProfile('goal', k)}><b>${g.label}</b><small>${g.hint}</small></button>`)}
        </div>
      <//>
      <${Field} label="Nível de atividade">
        <select class="input" value=${p.activity} onChange=${(e) => setProfile('activity', e.target.value)}>
          ${Object.entries(ACTIVITY).map(([k, a]) => html`<option value=${k}>${a.label} — ${a.hint}</option>`)}
        </select>
      <//>
      <div class="card stack-sm">
        <div class="card-title" style="margin:0"><h3 class="up">Metas manuais</h3>${s.manualTargets && html`<span class="tag acc">Ativo</span>`}</div>
        <p class="small muted">Use se seu nutricionista definiu valores. As calorias são recalculadas a partir dos macros.</p>
        <div class="grid-3">
          <${Field} label="Prot (g)"><${NumInput} value=${manual.protein} onInput=${(v) => setManual({ ...manual, protein: v })} /><//>
          <${Field} label="Carb (g)"><${NumInput} value=${manual.carbs} onInput=${(v) => setManual({ ...manual, carbs: v })} /><//>
          <${Field} label="Gord (g)"><${NumInput} value=${manual.fat} onInput=${(v) => setManual({ ...manual, fat: v })} /><//>
        </div>
        <${Field} label="Água (ml)"><${NumInput} value=${manual.water} onInput=${(v) => setManual({ ...manual, water: v })} /><//>
        <div class="mono small">= ${num(kcalFromMacros(manual.protein || 0, manual.carbs || 0, manual.fat || 0))} kcal</div>
        <div class="row">
          ${s.manualTargets && html`<button class="btn" onClick=${() => update((st) => { st.manualTargets = null; })}>Voltar ao automático</button>`}
          <button class="btn dark grow" onClick=${() => {
            update((st) => { st.manualTargets = { ...manual, kcal: kcalFromMacros(manual.protein || 0, manual.carbs || 0, manual.fat || 0) }; });
            toast('Metas manuais salvas');
          }}>Salvar manuais</button>
        </div>
      </div>
      <p class="tiny muted">Em uso agora: <b class="mono">${num(t.kcal)} kcal · P ${t.protein} · C ${t.carbs} · G ${t.fat}</b></p>
    </div>
  `;
}

// --- Banco de alimentos -----------------------------------------------------------------

function FoodsTab({ s }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => searchFoods(q, { limit: 80 }), [q, s.customFoods]);
  return html`
    <div class="stack">
      <div class="row">
        <input class="input grow" placeholder=${`Buscar entre ${TACO.length + s.customFoods.length} alimentos`} value=${q} onInput=${(e) => setQ(e.target.value)} />
        <button class="btn dark" onClick=${() => openCustomFood()}><${Icon} name="plus" />Novo</button>
      </div>
      <div class="list">
        ${results.map((f) => html`
          <button class="li btnlike" key=${f.id} onClick=${() => (f.custom ? openCustomFood(f) : null)} style=${f.custom ? '' : 'cursor:default'}>
            <div class="grow">
              <div class="t" style="white-space:normal">${f.name}${f.custom ? html` <span class="tag">Meu</span>` : ''}</div>
              <div class="s mono">${num(f.kcal)} kcal · P ${num(f.p, 1)} · C ${num(f.c, 1)} · G ${num(f.f, 1)} · Fibra ${num(f.fiber, 1)} · Na ${num(f.sodium)}mg</div>
            </div>
          </button>
        `)}
      </div>
      <p class="tiny muted">Tabela Brasileira de Composição de Alimentos (TACO), 4ª ed. — NEPA/UNICAMP. Valores por 100 g.</p>
    </div>
  `;
}

export function openCustomFood(food, { prefill, onSaved, title } = {}) {
  openModal((close) => html`<${CustomFood} food=${food} prefill=${prefill} onSaved=${onSaved} title=${title} close=${close} />`);
}

function CustomFood({ food, prefill, onSaved, title, close }) {
  const [f, setF] = useState(food ?? { name: '', kcal: null, p: null, c: null, f: null, fiber: 0, sodium: 0, ...(prefill ?? {}) });
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const [basis, setBasis] = useState('100');
  const [portion, setPortion] = useState(f.serving ?? 30);
  const save = () => {
    if (!f.name?.trim()) return toast('Informe o nome');
    if (basis === 'porcao') {
      if (!portion || portion <= 0) return toast('Informe o tamanho da porção');
      const k = 100 / portion;
      const conv = (v) => (v == null ? v : Math.round(v * k * 10) / 10);
      f.p = conv(f.p); f.c = conv(f.c); f.f = conv(f.f); f.kcal = f.kcal == null ? null : Math.round(f.kcal * k);
      f.fiber = conv(f.fiber); f.sodium = f.sodium == null ? f.sodium : Math.round(f.sodium * k);
      f.serving = portion;
    }
    const rec = {
      id: food?.id ?? `c-${uid()}`, name: f.name.trim(), cat: 99,
      kcal: f.kcal ?? kcalFromMacros(f.p || 0, f.c || 0, f.f || 0), p: f.p || 0, c: f.c || 0, f: f.f || 0,
      fiber: f.fiber || 0, sodium: f.sodium || 0,
      ...(f.barcode ? { barcode: String(f.barcode) } : {}), ...(f.serving ? { serving: f.serving } : {}),
    };
    update((s) => {
      s.customFoods = s.customFoods.filter((x) => x.id !== rec.id);
      s.customFoods.push(rec);
    });
    close();
    onSaved?.(rec);
  };
  const remove = async () => {
    if (!(await confirmDialog('Excluir este alimento? Registros antigos com ele ficarão sem valores.', { ok: 'Excluir' }))) return;
    update((s) => { s.customFoods = s.customFoods.filter((x) => x.id !== food.id); });
    close();
  };
  return html`
    <${Sheet} title=${title ?? (food ? 'Editar alimento' : 'Novo alimento')} onClose=${close} footer=${html`
      ${food && html`<button class="btn" onClick=${remove} aria-label="Excluir"><${Icon} name="trash" /></button>`}
      <button class="btn primary grow" onClick=${save}>Salvar</button>
    `}>
      <${Field} label="Nome"><input class="input" value=${f.name} onInput=${(e) => set('name')(e.target.value)} placeholder="Ex.: Barra de proteína X" /><//>
      <${Field} label="Valores informados por" hint=${basis === 'porcao' ? 'Copie direto do rótulo; o app converte para 100 g ao salvar.' : null}>
        <div class="row">
          <${Seg} value=${basis} onChange=${setBasis} options=${[['100', '100 g'], ['porcao', 'Porção']]} />
          ${basis === 'porcao' && html`<div style="width:120px"><${NumInput} value=${portion} onInput=${setPortion} unit="g" /></div>`}
        </div>
      <//>
      <div class="grid-2">
        <${Field} label="Proteína"><${NumInput} value=${f.p} onInput=${set('p')} unit="g" /><//>
        <${Field} label="Carboidrato"><${NumInput} value=${f.c} onInput=${set('c')} unit="g" /><//>
        <${Field} label="Gordura"><${NumInput} value=${f.f} onInput=${set('f')} unit="g" /><//>
        <${Field} label="Kcal" hint="Vazio = calcula pelos macros"><${NumInput} value=${f.kcal} onInput=${set('kcal')} /><//>
        <${Field} label="Fibra"><${NumInput} value=${f.fiber} onInput=${set('fiber')} unit="g" /><//>
        <${Field} label="Sódio"><${NumInput} value=${f.sodium} onInput=${set('sodium')} unit="mg" /><//>
      </div>
      <${Field} label="Código de barras (opcional)" hint="Com o código salvo, escanear de novo já encontra este alimento.">
        <input class="input num" inputmode="numeric" value=${f.barcode ?? ''} onInput=${(e) => set('barcode')(e.target.value.replace(/\D/g, ''))} />
      <//>
    <//>
  `;
}

