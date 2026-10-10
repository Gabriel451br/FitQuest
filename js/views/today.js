// HOJE: painel diário/semanal gamificado.
import { html } from '../lib.js';
import { targets, latestWeight } from '../store.js';
import { DAILY_QUESTS, WEEKLY_QUESTS } from '../game.js';
import { Icon, Ring, MacroRow, Bar } from '../ui.js';
import { addWater, openWeighIn, nextWorkout, startSession } from '../actions.js';
import { weekDays, weekdayShort, parseKey, fmtDate, num } from '../util.js';
import { go } from '../nav.js';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export function TodayView({ s, game, today }) {
  const t = targets(s);
  const d = game.today;
  const lv = game.level;
  const xpToday = game.xpByDay[today] ?? 0;
  const doneCount = DAILY_QUESTS.filter((q) => d.q[q.key]).length;
  const nw = nextWorkout(s);
  const active = s.sessions.find((x) => x.id === s.activeSessionId && !x.finishedAt);

  const questAction = {
    meals: () => go('dieta'),
    protein: () => go('dieta'),
    kcal: () => go('dieta'),
    water: () => addWater(today, 250),
    train: () => (active ? go('treino/sessao') : nw ? startSession(nw, today) : go('treino')),
    weigh: () => openWeighIn(today),
  };

  return html`
    <div class="stack">
      <div class="page-head">
        <div>
          <div class="eyebrow">${weekdayShort(today)} · ${fmtDate(today, { year: true })}</div>
          <h1>${greeting()}, ${s.profile.name.split(' ')[0]}</h1>
        </div>
      </div>

      <section class="card accent">
        <div class="hero">
          <div>
            <div class="eyebrow">Nível · ${lv.title}</div>
            <div class="lvl-big">LV${String(lv.level).padStart(2, '0')}</div>
          </div>
          <div class="right">
            <div class="mono" style="font-size:22px;font-weight:800">+${xpToday}</div>
            <div class="eyebrow">XP hoje</div>
          </div>
        </div>
        <div class="xp-bar" style="margin-top:14px">
          <i style=${`width:${Math.round(lv.pct * 100)}%`}></i>
          <span>${num(lv.into)} / ${num(lv.need)} XP</span>
        </div>
        <div class="row-sb small" style="margin-top:10px;font-weight:700">
          <span>🔥 ${game.streak} dia${game.streak === 1 ? '' : 's'} seguidos</span>
          <span class="mono">${num(game.totalXp)} XP total</span>
        </div>
      </section>

      ${active && html`
        <button class="card ink row-sb" style="text-align:left;cursor:pointer" onClick=${() => go('treino/sessao')}>
          <div><div class="eyebrow">Treino em andamento</div><h3 style="margin-top:4px">${active.name}</h3></div>
          <${Icon} name="chev" />
        </button>
      `}

      <section>
        <div class="section-head" style="margin-bottom:8px">
          <h2>Missões do dia</h2>
          <span class="tag fill">${doneCount}/${DAILY_QUESTS.length}</span>
        </div>
        <div class="list">
          ${DAILY_QUESTS.map((q) => html`
            <button class=${`quest li btnlike ${d.q[q.key] ? 'done' : ''}`} onClick=${questAction[q.key]}>
              <span class="box">${d.q[q.key] && html`<${Icon} name="check" size="14" />`}</span>
              <span class="qt">${q.label}${q.key === 'water' ? html` <span class="muted mono small">${num(d.water / 1000, 2)}/${num((t?.water ?? 0) / 1000, 1)} L</span>` : ''}</span>
              <span class="xp">+${q.xp} XP</span>
            </button>
          `)}
          ${d.perfect
            ? html`<div class="quest done" style="background:var(--accent);color:var(--accent-ink)"><span class="box">★</span><b class="up">Dia perfeito</b><span class="xp">+50 XP</span></div>`
            : html`<div class="quest"><span class="box">★</span><span class="muted small">Refeições + proteína + kcal + água = dia perfeito</span><span class="xp">+50 XP</span></div>`}
        </div>
      </section>

      <section class="card">
        <div class="card-title">
          <h3 class="up">Nutrição</h3>
          <button class="btn sm primary" onClick=${() => go('dieta')}><${Icon} name="plus" />Refeição</button>
        </div>
        <div class="row" style="gap:16px;align-items:center">
          <${Ring} value=${Math.round(d.tot.kcal)} target=${t?.kcal} />
          <div class="stack-sm grow">
            <${MacroRow} label="Prot" color="p" value=${d.tot.p} target=${t?.protein} />
            <${MacroRow} label="Carb" color="c" value=${d.tot.c} target=${t?.carbs} />
            <${MacroRow} label="Gord" color="f" value=${d.tot.f} target=${t?.fat} />
          </div>
        </div>
        <hr class="rule" style="margin:14px 0 10px" />
        <div class="row-sb">
          <div class="row" style="gap:6px;white-space:nowrap"><${Icon} name="water" /><span class="mono small"><b>${num(d.water / 1000, 2)}</b><span class="muted">/${num((t?.water ?? 0) / 1000, 1)} L</span></span></div>
          <div class="row">
            <button class="btn xs" onClick=${() => addWater(today, -250)} aria-label="Remover 250 ml">−</button>
            <button class="btn xs dark" onClick=${() => addWater(today, 250)}>+250</button>
            <button class="btn xs dark" onClick=${() => addWater(today, 500)}>+500</button>
          </div>
        </div>
      </section>

      <section class="grid-2">
        <button class="card tight" style="text-align:left;cursor:pointer" onClick=${() => (active ? go('treino/sessao') : nw ? startSession(nw, today) : go('treino'))}>
          <div class="eyebrow">Próximo treino</div>
          <h3 style="margin:6px 0 10px">${active ? active.name : nw ? nw.name : 'Monte sua rotina'}</h3>
          <span class="btn sm dark"><${Icon} name="play" />${active ? 'Continuar' : nw ? 'Iniciar' : 'Criar'}</span>
        </button>
        <button class="card tight" style="text-align:left;cursor:pointer" onClick=${() => openWeighIn(today)}>
          <div class="eyebrow">Peso atual</div>
          <div class="mono" style="font-size:28px;font-weight:700;margin:6px 0 4px">${num(latestWeight(s), 1)}<small class="muted" style="font-size:13px"> kg</small></div>
          <span class="small muted">${d.q.weigh ? 'Pesado hoje ✓' : 'Toque para registrar'}</span>
        </button>
      </section>

      <${WeekCard} s=${s} game=${game} today=${today} />
    </div>
  `;
}

function WeekCard({ s, game, today }) {
  const days = weekDays(today);
  const w = game.thisWeek;
  return html`
    <section class="stack-sm">
      <div class="section-head">
        <h2>Semana</h2>
        <span class="tag">+${w?.xp ?? 0} XP</span>
      </div>
      <div class="week">
        ${days.map((k) => {
          const d = game.days[k];
          const future = k > today;
          return html`
            <div class=${`wd ${k === today ? 'today' : ''} ${d?.active ? 'active' : ''} ${future ? 'future' : ''}`}>
              <div class="d">${weekdayShort(k)}</div>
              <div class="n">${parseKey(k).getDate()}</div>
              <div class="pips">
                ${d?.q.train && html`<i title="Treino"></i>`}
                ${d?.q.protein && html`<i title="Proteína" class="bg-p"></i>`}
                ${d?.q.kcal && html`<i title="Calorias" class="bg-c"></i>`}
              </div>
            </div>
          `;
        })}
      </div>
      <div class="list">
        ${w && WEEKLY_QUESTS.map((q) => {
          const [cur, max] = w.progress[q.key];
          const done = w.done[q.key];
          return html`
            <div class=${`quest ${done ? 'done' : ''}`} style="flex-wrap:wrap">
              <span class="box">${done && html`<${Icon} name="check" size="14" />`}</span>
              <span class="qt grow small" style="font-weight:600">${q.label(w.trainTarget)}</span>
              <span class="xp">+${q.xp}</span>
              <div style="flex-basis:100%;display:flex;gap:10px;align-items:center;padding-left:34px">
                <div class="grow"><${Bar} value=${cur} max=${max} cls="sm acc" /></div>
                <span class="mono tiny">${cur}/${max}</span>
              </div>
            </div>
          `;
        })}
      </div>
    </section>
  `;
}
