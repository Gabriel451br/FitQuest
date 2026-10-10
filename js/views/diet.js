// DIETA: diário alimentar (TACO), plano automático, metas de macros e banco de alimentos.
import { html, useState, useMemo } from '../lib.js';
import { update, getState, targets, autoTargets, dayEntry, MEALS, latestWeight, currentBf } from '../store.js';
import { searchFoods, getFood, macrosFor, sumMacros, categoryName } from '../foods.js';
import { TACO, TACO_CATEGORIES } from '../data/taco.js';
import { generatePlan, substitutes, POOLS } from '../dietgen.js';
import { ACTIVITY, GOALS, kcalFromMacros } from '../calc.js';
import { Icon, openModal, Sheet, Field, NumInput, Seg, Check, Ring, MacroRow, toast, confirmDialog, Stat } from '../ui.js';
import { addDays, fmtDate, weekdayShort, num, uid, dateKey } from '../util.js';

export function DietView({ s, today }) {
  const [tab, setTab] = useState('diario');
  return html`
    <div class="stack">
      <div class="page-head"><h1>Dieta</h1></div>
      <div class="tabs">
        ${[['diario', 'Diário'], ['plano', 'Plano'], ['metas', 'Metas'], ['alimentos', 'TACO']].map(([k, l]) => html`
          <button class=${tab === k ? 'on' : ''} onClick=${() => setTab(k)}>${l}</button>
        `)}
      </div>
      ${tab === 'diario' && html`<${DiaryTab} s=${s} today=${today} />`}
      ${tab === 'plano' && html`<${PlanTab} s=${s} today=${today} />`}
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
        <button class="btn xs dark" onClick=${() => openFoodSearch(date, meal.key)} aria-label=${`Adicionar em ${meal.label}`}><${Icon} name="plus" size="14" /></button>
      </div>
      ${items.map((it) => {
        const f = getFood(it.foodId);
        const m = macrosFor(f, it.g);
        return html`
          <div class="food-li" key=${it.id}>
            <button class="grow" style="background:none;border:0;padding:0;text-align:left" onClick=${() => openPortion(f, { date, meal: meal.key, item: it })}>
              <div class="t">${f?.name ?? 'Alimento removido'}</div>
              <div class="s">${num(it.g)} g · ${fmtMacros(m)}</div>
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

function addItems(date, meal, items) {
  update((s) => {
    const d = (s.diary[date] ??= { meals: {}, water: 0 });
    const l = (d.meals[meal] ??= []);
    for (const it of items) {
      l.push({ id: uid(), foodId: it.foodId, g: it.g });
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
  openModal((close) => html`<${FoodSearch} close=${close} onPick=${(f) => { close(); openPortion(f, { date, meal }); }} />`);
}

function FoodSearch({ close, onPick }) {
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
              <div class="s mono">100 g · ${num(f.kcal)} kcal · P ${num(f.p, 1)} · C ${num(f.c, 1)} · G ${num(f.f, 1)}</div>
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
  const [g, setG] = useState(ctx.item?.g ?? 100);
  const [meal, setMeal] = useState(ctx.meal);
  const m = macrosFor(food, g || 0);
  const save = () => {
    if (!g || g <= 0) return toast('Informe a quantidade');
    if (ctx.item) {
      update((s) => {
        const src = s.diary[ctx.date].meals[ctx.meal];
        const it = src.find((x) => x.id === ctx.item.id);
        it.g = g;
        if (meal !== ctx.meal) {
          s.diary[ctx.date].meals[ctx.meal] = src.filter((x) => x.id !== it.id);
          (s.diary[ctx.date].meals[meal] ??= []).push(it);
        }
      });
    } else {
      addItems(ctx.date, meal, [{ foodId: food.id, g }]);
    }
    close();
  };
  return html`
    <${Sheet} title=${ctx.item ? 'Editar porção' : 'Porção'} onClose=${close} footer=${html`<button class="btn primary block" onClick=${save}>${ctx.item ? 'Salvar' : 'Adicionar'}</button>`}>
      <div>
        <h3>${food.name}</h3>
        <div class="tiny muted mono" style="margin-top:4px">${food.custom ? 'Alimento personalizado' : food.extra ? 'Valor médio de rótulo' : `TACO · ${categoryName(food.cat)}`}</div>
      </div>
      <${Field} label="Quantidade">
        <${NumInput} value=${g} onInput=${setG} unit="g" autofocus onKeyDown=${(e) => e.key === 'Enter' && save()} />
      <//>
      <div class="chips">${[25, 50, 100, 150, 200, 300].map((v) => html`<button class=${`chip ${g === v ? 'on' : ''}`} onClick=${() => setG(v)}>${v} g</button>`)}</div>
      <div class="grid-4">
        <${Stat} v=${num(m.kcal)} l="kcal" />
        <${Stat} v=${num(m.p, 1)} unit="g" l="Prot" />
        <${Stat} v=${num(m.c, 1)} unit="g" l="Carb" />
        <${Stat} v=${num(m.f, 1)} unit="g" l="Gord" />
      </div>
      <${Field} label="Refeição">
        <select class="input" value=${meal} onChange=${(e) => setMeal(e.target.value)}>
          ${MEALS.map((x) => html`<option value=${x.key}>${x.label}</option>`)}
        </select>
      <//>
    <//>
  `;
}

// --- Plano automático ------------------------------------------------------------------

const DEFAULT_ANSWERS = {
  meals: 5, vegetarian: false, vegan: false, lactoseFree: false, glutenFree: false,
  noFish: false, noSupplements: false, nutAllergy: false, includeLegumes: true, includeFruit: true,
  preferredProteins: [], preferredCarbs: [], excluded: [],
};

function PlanTab({ s, today }) {
  const [editing, setEditing] = useState(!s.dietPlan);
  const t = targets(s);
  if (!t) return null;
  if (editing || !s.dietPlan) {
    return html`<${PlanForm} initial=${s.dietPlan?.answers ?? DEFAULT_ANSWERS} t=${t} onDone=${() => setEditing(false)} canCancel=${!!s.dietPlan} />`;
  }
  const plan = s.dietPlan;
  const tot = sumMacros(plan.meals.flatMap((m) => m.items));
  const regen = () => update((st) => { st.dietPlan = generatePlan(t, plan.answers, Date.now()); });
  const outdated = Math.abs(plan.target.kcal - t.kcal) > 50 || Math.abs(plan.target.protein - t.protein) > 5;

  return html`
    <div class="stack">
      <div class="card ink">
        <div class="row-sb"><div class="eyebrow">Plano gerado · ${plan.meals.length} refeições</div><span class="mono tiny">${fmtDate(dateKey(new Date(plan.createdAt)))}</span></div>
        <div class="row-sb" style="margin-top:8px"><span class="big-num">${num(tot.kcal)}</span><span class="mono small">/ ${num(t.kcal)} kcal</span></div>
        <div class="grid-3" style="margin-top:10px">
          ${[['P', tot.p, t.protein], ['C', tot.c, t.carbs], ['G', tot.f, t.fat]].map(([l, v, g]) => html`
            <div><div class="mono" style="font-weight:700;font-size:18px">${num(v)}g</div><div class="eyebrow">${l} · meta ${g}</div></div>
          `)}
        </div>
      </div>
      ${outdated && html`<div class="callout warn small">Suas metas mudaram desde que o plano foi gerado. <button class="link-btn" onClick=${regen}>Recalcular</button></div>`}
      ${plan.meals.map((m) => {
        const mt = sumMacros(m.items);
        return html`
          <div class="meal" key=${m.key}>
            <div class="meal-head"><h3>${MEALS.find((x) => x.key === m.key).label}</h3><span class="mono tiny">${num(mt.kcal)} kcal · ${num(mt.p)}P · ${num(mt.c)}C · ${num(mt.f)}G</span></div>
            ${m.items.map((it, i) => {
              const f = getFood(it.foodId);
              return html`
                <div class="food-li" key=${i}>
                  <div class="grow"><div class="t">${f.name}</div><div class="s">${num(it.g)} g · ${fmtMacros(macrosFor(f, it.g))}</div></div>
                  <button class="x-btn" aria-label="Substituir" title="Substituir" onClick=${() => openSubstitutes(m.key, i, it)}><${Icon} name="swap" size="14" /></button>
                </div>
              `;
            })}
          </div>
        `;
      })}
      <button class="btn primary" onClick=${() => applyPlan(plan, today)}><${Icon} name="copy" />Aplicar ao diário de hoje</button>
      <div class="row">
        <button class="btn grow" onClick=${regen}>Gerar outro</button>
        <button class="btn grow" onClick=${() => setEditing(true)}>Refazer perguntas</button>
      </div>
      <p class="tiny muted">Porções em peso pronto para consumo (exceto quando indicado “cru”). Valores da TACO/UNICAMP. Plano automático é ponto de partida — ajuste com um nutricionista se tiver condições de saúde específicas.</p>
    </div>
  `;
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

function PlanForm({ initial, t, onDone, canCancel }) {
  const [a, setA] = useState({ ...DEFAULT_ANSWERS, ...initial });
  const set = (k) => (v) => setA((o) => ({ ...o, [k]: v }));
  const toggleIn = (k, id) => setA((o) => ({ ...o, [k]: o[k].includes(id) ? o[k].filter((x) => x !== id) : [...o[k], id] }));
  const proteins = [...POOLS.protein_main, ...POOLS.protein_light].filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i);
  const carbs = [...POOLS.carb_main, ...POOLS.carb_breakfast];
  const go = () => {
    update((s) => { s.dietPlan = generatePlan(t, a, Date.now()); });
    onDone();
  };
  return html`
    <div class="stack">
      <div class="card accent">
        <div class="eyebrow">Gerador automático</div>
        <h2 style="margin-top:4px">Monte seu plano em 1 minuto</h2>
        <p class="small" style="margin-top:6px">Meta: <b class="mono">${num(t.kcal)} kcal · P ${t.protein} · C ${t.carbs} · G ${t.fat}</b>. Ajuste as metas na aba Metas.</p>
      </div>
      <${Field} label="Quantas refeições por dia?">
        <${Seg} value=${a.meals} onChange=${set('meals')} options=${[3, 4, 5, 6].map((n) => [n, String(n)])} />
      <//>
      <${Field} label="Restrições">
        <div class="grid-2">
          <${Check} checked=${a.vegetarian} onChange=${set('vegetarian')}>Vegetariano<//>
          <${Check} checked=${a.vegan} onChange=${set('vegan')}>Vegano<//>
          <${Check} checked=${a.lactoseFree} onChange=${set('lactoseFree')}>Sem lactose<//>
          <${Check} checked=${a.glutenFree} onChange=${set('glutenFree')}>Sem glúten<//>
          <${Check} checked=${a.noFish} onChange=${set('noFish')}>Sem peixe<//>
          <${Check} checked=${a.nutAllergy} onChange=${set('nutAllergy')}>Sem oleaginosas<//>
          <${Check} checked=${a.noSupplements} onChange=${set('noSupplements')}>Sem suplementos<//>
        </div>
      <//>
      <${Field} label="Incluir">
        <div class="grid-2">
          <${Check} checked=${a.includeLegumes} onChange=${set('includeLegumes')}>Feijão/lentilha<//>
          <${Check} checked=${a.includeFruit} onChange=${set('includeFruit')}>Frutas no café<//>
        </div>
      <//>
      <${Field} label="Proteínas preferidas" hint="Opcional. Deixe vazio para variar entre todas.">
        <div class="chips">${proteins.map((p) => html`<button class=${`chip ${a.preferredProteins.includes(p.id) ? 'on' : ''}`} onClick=${() => toggleIn('preferredProteins', p.id)}>${p.label}</button>`)}</div>
      <//>
      <${Field} label="Carboidratos preferidos" hint="Opcional.">
        <div class="chips">${carbs.map((p) => html`<button class=${`chip ${a.preferredCarbs.includes(p.id) ? 'on' : ''}`} onClick=${() => toggleIn('preferredCarbs', p.id)}>${p.label}</button>`)}</div>
      <//>
      <${Field} label="Não gosto / não como" hint="Esses alimentos ficam de fora.">
        <div class="chips">${[...proteins, ...carbs, ...POOLS.fruit, ...POOLS.fat, ...POOLS.veg].filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i).map((p) => html`<button class=${`chip ${a.excluded.includes(p.id) ? 'on' : ''}`} onClick=${() => toggleIn('excluded', p.id)}>${p.label}</button>`)}</div>
      <//>
      <div class="row">
        ${canCancel && html`<button class="btn" onClick=${onDone}>Cancelar</button>`}
        <button class="btn primary grow" onClick=${go}><${Icon} name="bolt" />Gerar plano</button>
      </div>
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

function openCustomFood(food) {
  openModal((close) => html`<${CustomFood} food=${food} close=${close} />`);
}

function CustomFood({ food, close }) {
  const [f, setF] = useState(food ?? { name: '', kcal: null, p: null, c: null, f: null, fiber: 0, sodium: 0 });
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const save = () => {
    if (!f.name?.trim()) return toast('Informe o nome');
    const rec = { id: food?.id ?? `c-${uid()}`, name: f.name.trim(), cat: 99, kcal: f.kcal ?? kcalFromMacros(f.p || 0, f.c || 0, f.f || 0), p: f.p || 0, c: f.c || 0, f: f.f || 0, fiber: f.fiber || 0, sodium: f.sodium || 0 };
    update((s) => {
      s.customFoods = s.customFoods.filter((x) => x.id !== rec.id);
      s.customFoods.push(rec);
    });
    close();
  };
  const remove = async () => {
    if (!(await confirmDialog('Excluir este alimento? Registros antigos com ele ficarão sem valores.', { ok: 'Excluir' }))) return;
    update((s) => { s.customFoods = s.customFoods.filter((x) => x.id !== food.id); });
    close();
  };
  return html`
    <${Sheet} title=${food ? 'Editar alimento' : 'Novo alimento'} onClose=${close} footer=${html`
      ${food && html`<button class="btn" onClick=${remove} aria-label="Excluir"><${Icon} name="trash" /></button>`}
      <button class="btn primary grow" onClick=${save}>Salvar</button>
    `}>
      <${Field} label="Nome"><input class="input" value=${f.name} onInput=${(e) => set('name')(e.target.value)} placeholder="Ex.: Barra de proteína X" /><//>
      <p class="eyebrow">Valores por 100 g</p>
      <div class="grid-2">
        <${Field} label="Proteína"><${NumInput} value=${f.p} onInput=${set('p')} unit="g" /><//>
        <${Field} label="Carboidrato"><${NumInput} value=${f.c} onInput=${set('c')} unit="g" /><//>
        <${Field} label="Gordura"><${NumInput} value=${f.f} onInput=${set('f')} unit="g" /><//>
        <${Field} label="Kcal" hint="Vazio = calcula pelos macros"><${NumInput} value=${f.kcal} onInput=${set('kcal')} /><//>
        <${Field} label="Fibra"><${NumInput} value=${f.fiber} onInput=${set('fiber')} unit="g" /><//>
        <${Field} label="Sódio"><${NumInput} value=${f.sodium} onInput=${set('sodium')} unit="mg" /><//>
      </div>
    <//>
  `;
}

