// JORNADA: nível, histórico de XP, objetivos pessoais e conquistas.
import { html, useState } from '../lib.js';
import { update, getState, latestWeight, currentBf, allExercises, exerciseById } from '../store.js';
import { xpForLevel, XP, DAILY_QUESTS, WEEKLY_QUESTS, TITLES } from '../game.js';
import { bestE1rm } from '../training.js';
import { Icon, openModal, Sheet, Field, NumInput, Seg, Bar, toast, confirmDialog, Stat, Empty } from '../ui.js';
import { BarChart } from '../charts.js';
import { addDays, weekStart, fmtDate, num, uid, parseKey, dateKey } from '../util.js';

export function JourneyView({ s, game, today }) {
  const lv = game.level;
  const nextTitle = TITLES.find(([l]) => l > lv.level);
  const unlocked = game.achievements.filter((a) => a.unlocked).length;
  return html`
    <div class="stack">
      <div class="page-head"><h1>Jornada</h1></div>

      <section class="card accent">
        <div class="hero">
          <div>
            <div class="eyebrow">${lv.title}</div>
            <div class="lvl-big">LV${String(lv.level).padStart(2, '0')}</div>
          </div>
          <div class="right">
            <div class="mono" style="font-size:22px;font-weight:800">${num(game.totalXp)}</div>
            <div class="eyebrow">XP total</div>
          </div>
        </div>
        <div class="xp-bar" style="margin-top:14px"><i style=${`width:${Math.round(lv.pct * 100)}%`}></i><span>${num(lv.need - lv.into)} XP para o LV ${lv.level + 1}</span></div>
        ${nextTitle && html`<p class="small" style="margin-top:10px;font-weight:600">Próximo título: <b class="up">${nextTitle[1]}</b> no LV ${nextTitle[0]} (${num(xpForLevel(nextTitle[0]) - game.totalXp)} XP)</p>`}
      </section>

      <div class="grid-4">
        <${Stat} v=${game.streak} unit="d" l="Sequência" />
        <${Stat} v=${game.bestStreak} unit="d" l="Recorde" />
        <${Stat} v=${game.facts.workouts} l="Treinos" />
        <${Stat} v=${game.facts.prs} l="PRs" />
      </div>

      <${XpHistory} game=${game} today=${today} />
      <${Goals} s=${s} />

      <section class="stack-sm">
        <div class="section-head"><h2>Conquistas</h2><span class="tag fill">${unlocked}/${game.achievements.length}</span></div>
        <div class="badges">
          ${game.achievements.map((a) => html`
            <div class=${`badge ${a.unlocked ? 'on' : ''}`} key=${a.id} title=${a.desc}>
              <div class="ic">${a.icon}</div>
              <b>${a.name}</b>
              <small>${a.desc}</small>
              <span class="mono tiny" style="margin-top:auto">+${a.xp} XP</span>
            </div>
          `)}
        </div>
      </section>

      <${XpRules} />
    </div>
  `;
}

function XpHistory({ game, today }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const bars = days.map((d) => ({ label: String(parseKey(d).getDate()), value: game.xpByDay[d] ?? 0, hi: d === today }));
  // heatmap 18 semanas
  const start = addDays(weekStart(today), -17 * 7);
  const cells = Array.from({ length: 18 * 7 }, (_, i) => addDays(start, i));
  const lvl = (x) => (x == null ? 'none' : x === 0 ? '' : x < 60 ? 'l1' : x < 140 ? 'l2' : x < 220 ? 'l3' : 'l4');
  return html`
    <section class="card stack-sm">
      <div class="card-title" style="margin:0"><h3 class="up">XP — 14 dias</h3><span class="mono small">${num(days.reduce((a, d) => a + (game.xpByDay[d] ?? 0), 0))} XP</span></div>
      <${BarChart} bars=${bars} unit=" XP" />
      <div class="eyebrow" style="margin-top:6px">Constância — 18 semanas</div>
      <div class="heat" aria-label="Mapa de atividade">
        ${cells.map((d) => html`<i class=${d > today ? 'none' : lvl(game.xpByDay[d] ?? (d < today ? 0 : null))} title=${`${fmtDate(d)}: ${game.xpByDay[d] ?? 0} XP`}></i>`)}
      </div>
    </section>
  `;
}

// --- Objetivos -----------------------------------------------------------------------

const GOAL_TYPES = [['weight', 'Peso'], ['bf', '% Gordura'], ['lift', 'Carga'], ['custom', 'Livre']];

export function goalProgress(s, g) {
  if (g.type === 'weight') {
    const cur = latestWeight(s);
    const start = g.start ?? cur;
    const met = g.target < start ? cur <= g.target : cur >= g.target;
    const pct = start === g.target ? 1 : Math.max(0, Math.min(1, (start - cur) / (start - g.target)));
    return { cur, label: `${num(cur, 1)} / ${num(g.target, 1)} kg`, pct, met };
  }
  if (g.type === 'bf') {
    const cur = currentBf(s);
    if (cur == null) return { cur, label: `sem avaliação / ${num(g.target, 1)}%`, pct: 0, met: false };
    const start = g.start ?? cur;
    const total = Math.abs(start - g.target) || 1;
    return { cur, label: `${num(cur, 1)} / ${num(g.target, 1)}%`, pct: Math.max(0, Math.min(1, (start - cur) / total)), met: cur <= g.target };
  }
  if (g.type === 'lift') {
    const cur = bestE1rm(s, g.exId);
    return { cur, label: `${num(cur, 1)} / ${num(g.target, 1)} kg (1RM est.)`, pct: Math.min(1, cur / g.target), met: cur >= g.target };
  }
  return { cur: null, label: 'Marque quando concluir', pct: 0, met: true };
}

function Goals({ s }) {
  const open = s.goals.filter((g) => !g.completedAt);
  const done = s.goals.filter((g) => g.completedAt);
  const claim = (g) => {
    update((st) => { st.goals.find((x) => x.id === g.id).completedAt = Date.now(); });
  };
  const remove = async (g) => {
    if (!(await confirmDialog(`Remover o objetivo "${g.title}"?`, { ok: 'Remover' }))) return;
    update((st) => { st.goals = st.goals.filter((x) => x.id !== g.id); });
  };
  return html`
    <section class="stack-sm">
      <div class="section-head"><h2>Objetivos</h2><button class="btn sm dark" onClick=${() => openGoalForm()}><${Icon} name="plus" />Novo</button></div>
      ${!s.goals.length && html`<${Empty} title="Defina um alvo" text=${`Peso, % de gordura, carga num exercício ou algo livre. Concluir vale +${XP.goal} XP.`} />`}
      ${open.length > 0 && html`
        <div class="list">
          ${open.map((g) => {
            const p = goalProgress(s, g);
            return html`
              <div class="li" key=${g.id} style="flex-wrap:wrap">
                <span class="dot" style="width:14px;height:14px;background:var(--accent)"></span>
                <div class="grow">
                  <div class="t">${g.title}</div>
                  <div class="s mono">${p.label}</div>
                </div>
                ${p.met
                  ? html`<button class="btn sm primary" onClick=${() => claim(g)}>Resgatar +${XP.goal}</button>`
                  : html`<button class="x-btn" aria-label="Remover" onClick=${() => remove(g)}>×</button>`}
                ${g.type !== 'custom' && html`<div style="flex-basis:100%"><${Bar} value=${p.pct} max=${1} cls="sm acc" /></div>`}
              </div>
            `;
          })}
        </div>
      `}
      ${done.length > 0 && html`
        <div class="list">
          ${done.map((g) => html`
            <div class="li done" key=${g.id}>
              <span class="tag acc">✓</span>
              <span class="t grow" style="text-decoration:line-through">${g.title}</span>
              <span class="mono tiny">${fmtDate(dateKey(new Date(g.completedAt)))}</span>
            </div>
          `)}
        </div>
      `}
    </section>
  `;
}

function openGoalForm() {
  openModal((close) => html`<${GoalForm} close=${close} />`);
}

function GoalForm({ close }) {
  const s = getState();
  const [type, setType] = useState('weight');
  const [target, setTarget] = useState(null);
  const [title, setTitle] = useState('');
  const [exId, setExId] = useState('supino-reto');
  const save = () => {
    if (type !== 'custom' && !target) return toast('Informe o alvo');
    if (type === 'custom' && !title.trim()) return toast('Descreva o objetivo');
    const auto = {
      weight: `Chegar a ${num(target, 1)} kg`,
      bf: `Chegar a ${num(target, 1)}% de gordura`,
      lift: `${exerciseById(s, exId).name}: 1RM de ${num(target, 1)} kg`,
      custom: title.trim(),
    }[type];
    const start = type === 'weight' ? latestWeight(s) : type === 'bf' ? currentBf(s) : null;
    update((st) => st.goals.push({ id: uid(), type, target, exId: type === 'lift' ? exId : null, title: title.trim() || auto, start, createdAt: Date.now(), completedAt: null }));
    close();
  };
  return html`
    <${Sheet} title="Novo objetivo" onClose=${close} footer=${html`<button class="btn primary block" onClick=${save}>Criar objetivo</button>`}>
      <${Seg} value=${type} onChange=${setType} options=${GOAL_TYPES} />
      ${type === 'weight' && html`<${Field} label="Peso alvo" hint=${`Atual: ${num(latestWeight(s), 1)} kg`}><${NumInput} value=${target} onInput=${setTarget} unit="kg" step="0.1" /><//>`}
      ${type === 'bf' && html`<${Field} label="% de gordura alvo" hint=${currentBf(s) != null ? `Atual: ${num(currentBf(s), 1)}%` : 'Faça uma avaliação para acompanhar'}><${NumInput} value=${target} onInput=${setTarget} unit="%" step="0.5" /><//>`}
      ${type === 'lift' && html`
        <${Field} label="Exercício">
          <select class="input" value=${exId} onChange=${(e) => setExId(e.target.value)}>
            ${allExercises(s).map((e) => html`<option value=${e.id}>${e.name}</option>`)}
          </select>
        <//>
        <${Field} label="1RM estimado alvo" hint=${`Atual: ${num(bestE1rm(s, exId), 1)} kg`}><${NumInput} value=${target} onInput=${setTarget} unit="kg" step="2.5" /><//>
      `}
      <${Field} label=${type === 'custom' ? 'Objetivo' : 'Nome (opcional)'}>
        <input class="input" value=${title} onInput=${(e) => setTitle(e.target.value)} placeholder=${type === 'custom' ? 'Ex.: Correr 5 km sem parar' : ''} />
      <//>
    <//>
  `;
}

function XpRules() {
  return html`
    <details class="card">
      <summary style="cursor:pointer;font-weight:700;text-transform:uppercase">Como ganhar XP</summary>
      <dl class="kv" style="margin-top:12px">
        ${DAILY_QUESTS.map((q) => html`<dt>${q.label}</dt><dd>+${q.xp}</dd>`)}
        <dt>Dia perfeito</dt><dd>+${XP.perfect}</dd>
        <dt>Recorde pessoal (PR)</dt><dd>+${XP.pr} cada</dd>
        <dt>Avaliação física (+ fotos)</dt><dd>+${XP.assessment} (+${XP.photos})</dd>
        <dt>Bônus de sequência</dt><dd>+${XP.streakPerDay}/dia (até +${XP.streakPerDay * XP.streakCap})</dd>
        ${WEEKLY_QUESTS.map((q) => html`<dt>Semanal: ${q.label('N')}</dt><dd>+${q.xp}</dd>`)}
        <dt>Objetivo concluído</dt><dd>+${XP.goal}</dd>
      </dl>
      <p class="tiny muted" style="margin-top:10px">O XP é recalculado a partir dos seus registros: editar ou apagar algo ajusta o total. Nada de farm.</p>
    </details>
  `;
}
