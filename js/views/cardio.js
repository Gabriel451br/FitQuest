// Atividades aeróbicas/esportivas: treinos planejados, cronômetro, registro, histórico e progresso.
import { html, useState, useEffect } from '../lib.js';
import { update, getState, latestWeight } from '../store.js';
import {
  ACTIVITIES, sessionType, fmtDuration, parseDuration, rateText, estimateKcal, paceSecPerKm, speedKmh,
  cardioSessions, cardioWeek, cardioTotals, cardioRecords, cardioPRs,
} from '../cardio.js';
import { Icon, openModal, Sheet, Field, NumInput, toast, confirmDialog, Empty, Stat, useNow, Seg } from '../ui.js';
import { PLAN_TYPES, PLANS_BY_TYPE, PLAN_KIND, planDefaults, buildSteps, planTotals, stepLabel, stepProgress, skip, paceStatus } from '../plans.js';
import { GPS_TYPES, currentSpeed, splitTimes, simplify, projectRoute } from '../gps.js';
import { useGps, takeTrack, gpsSupported, elapsedOf } from '../gpslive.js';
import { liveDistance, announceStep } from '../livecoach.js';
import { prime, primeVoice, keepAwake } from '../sound.js';
import { LockPrompt } from './lockprompt.js';
import { LineChart, BarChart } from '../charts.js';
import { startSession, deleteSession, deleteWorkout, moveWorkout } from '../actions.js';
import { go } from '../nav.js';
import { dateKey, uid, num, weekdayShort, addDays, weekStart, parseKey } from '../util.js';

// Sugestões prontas (treinos estruturados quando faz sentido).
const preset = (type, tpl, name, over = {}) => {
  const params = { ...planDefaults(tpl, type), ...over };
  return { name, kind: PLAN_KIND[tpl] ?? null, plan: { tpl, params, steps: buildSteps(tpl, params) } };
};
const PRESETS = {
  run: [
    { name: 'Rodagem 5 km', kind: 'Rodagem', target: { distance: 5 } },
    preset('run', 'intervalado', 'Intervalado 6×400 m'),
    preset('run', 'intervalado', 'Intervalado 5×1 km', { reps: 5, workDist: 1000, workPace: 285, restTime: 120 }),
    preset('run', 'fartlek', 'Fartlek 8×1 min'),
    preset('run', 'ritmo', 'Ritmo 20 min'),
    preset('run', 'longao', 'Longão 15 km'),
    preset('run', 'progressivo', 'Progressivo 3×2 km'),
    preset('run', 'regenerativo', 'Regenerativo 30 min'),
  ],
  walk: [{ name: 'Caminhada 30 min', kind: 'Rápida', target: { duration: 1800 } }, preset('walk', 'intervalado', 'Caminhada intervalada 6×500 m'), preset('walk', 'longao', 'Caminhada longa 8 km')],
  bike: [
    { name: 'Pedal 20 km', kind: 'Estrada', target: { distance: 20 } },
    preset('bike', 'intervalado', 'Intervalado 5×3 min'),
    preset('bike', 'longao', 'Longão 60 km'),
    preset('bike', 'progressivo', 'Progressivo 3×10 km'),
    { name: 'Indoor 45 min', kind: 'Indoor', target: { duration: 2700 } },
  ],
  swim: [{ name: 'Natação 1.000 m', kind: 'Livre', target: { distance: 1 } }, preset('swim', 'intervalado', 'Séries 8×100 m')],
  hiit: [{ name: 'HIIT 20 min', kind: 'HIIT', target: { duration: 1200 } }],
  sport: [{ name: 'Futebol', kind: 'Futebol', target: { duration: 3600 } }],
  other: [{ name: 'Yoga 30 min', kind: 'Yoga', target: { duration: 1800 } }],
};

// Ritmo: s/km internamente; bike mostra km/h, natação /100 m.
export function paceText(type, secPerKm, withUnit = true) {
  if (!secPerKm || !Number.isFinite(secPerKm) || secPerKm <= 0) return '—';
  if (type === 'bike') return `${num(3600 / secPerKm, 1)}${withUnit ? ' km/h' : ''}`;
  if (type === 'swim') return `${fmtDuration(secPerKm / 10)}${withUnit ? ' /100m' : ''}`;
  if (secPerKm > 3600) return '—';
  return `${fmtDuration(secPerKm)}${withUnit ? ' /km' : ''}`;
}

function planSummary(type, plan) {
  const st = plan?.steps ?? [];
  if (!st.length) return '';
  const tot = planTotals(st, type === 'bike' ? 3600 / 25 : type === 'swim' ? 1200 : type === 'walk' ? 600 : 360);
  const works = st.filter((x) => x.kind === 'work');
  const parts = [];
  if (['intervalado', 'fartlek'].includes(plan.tpl) && works.length) parts.push(`${works.length}× ${works[0].by === 'time' ? fmtDuration(works[0].value) : showDist(type, works[0].value)}`);
  parts.push(`~${fmtDuration(tot.sec).replace(/:\d\d$/, '')} ${tot.sec >= 3600 ? 'h' : 'min'}`);
  parts.push(`~${showDist(type, tot.km)}`);
  return parts.join(' · ');
}

const has = (type, f) => ACTIVITIES[type].fields?.includes(f);
const distUnit = (type) => (ACTIVITIES[type].meters ? 'm' : 'km');
const showDist = (type, km) => (km == null ? '—' : ACTIVITIES[type].meters || km < 1 ? `${num(km * 1000)} m` : `${num(km, 2)} km`);

function targetText(type, t) {
  if (!t) return '';
  const parts = [];
  if (t.distance) parts.push(showDist(type, t.distance));
  if (t.duration) parts.push(fmtDuration(t.duration));
  return parts.join(' · ');
}

// --- Home da categoria ---------------------------------------------------------------

export function CardioHome({ s, type, today }) {
  const [tab, setTab] = useState('treinos');
  return html`
    <div class="stack">
      <div class="tabs">
        ${[['treinos', 'Treinos'], ['historico', 'Histórico'], ['progresso', 'Progresso']].map(([k, l]) => html`
          <button class=${tab === k ? 'on' : ''} onClick=${() => setTab(k)}>${l}</button>
        `)}
      </div>
      ${tab === 'treinos' && html`<${PlannedTab} s=${s} type=${type} today=${today} />`}
      ${tab === 'historico' && html`<${CardioHistory} s=${s} type=${type} />`}
      ${tab === 'progresso' && html`<${CardioProgress} s=${s} type=${type} today=${today} />`}
    </div>
  `;
}

function WeekSummary({ s, type, today }) {
  const w = cardioWeek(s, type, today);
  const a = ACTIVITIES[type];
  return html`
    <div class="grid-3">
      <${Stat} v=${w.count} l="Na semana" />
      ${a.fields.includes('distance')
        ? html`<${Stat} v=${a.meters ? num(w.km * 1000) : num(w.km, 1)} unit=${distUnit(type)} l="Distância" />`
        : html`<${Stat} v=${num(w.sec / 60)} unit="min" l="Tempo" />`}
      ${a.fields.includes('distance')
        ? html`<${Stat} v=${fmtDuration(w.sec)} l="Tempo" />`
        : html`<${Stat} v=${num(estimateKcal(type, { duration: w.sec }, latestWeight(s) ?? 75) ?? 0)} unit="kcal" l="Gasto est." />`}
    </div>
  `;
}

// Iniciar: o toque libera áudio e voz no iPhone (alarme, bipes e parciais faladas).
function begin(w, today) {
  prime();
  primeVoice();
  startSession(w, today);
}

function PlannedTab({ s, type, today }) {
  const a = ACTIVITIES[type];
  const list = s.workouts.filter((w) => w.type === type);
  return html`
    <div class="stack">
      <${WeekSummary} s=${s} type=${type} today=${today} />
      <div class="grid-2">
        <button class="btn primary" onClick=${() => begin({ type, name: a.label }, today)}><${Icon} name="play" />${GPS_TYPES.includes(type) ? 'Iniciar (GPS)' : 'Cronômetro'}</button>
        <button class="btn" onClick=${() => openCardioForm({ type })}><${Icon} name="plus" />Registrar</button>
      </div>
      <div class="section-head"><h3 class="up">Treinos de ${a.label.toLowerCase()}</h3><button class="btn xs dark" onClick=${() => openCardioWorkout(type)}><${Icon} name="plus" size="14" />Novo</button></div>
      ${list.length
        ? html`
          <div class="list">
            ${list.map((w, wi) => html`
              <div class="li" key=${w.id}>
                <div class="grow">
                  <div class="row wrap" style="gap:6px"><span class="t">${w.name}</span>${w.kind && html`<span class="tag">${w.kind}</span>`}</div>
                  <div class="s mono">${(w.plan?.steps?.length ? planSummary(type, w.plan) : targetText(type, w.target)) || 'Sem meta'}${w.notes ? ` · ${w.notes}` : ''}</div>
                </div>
                ${list.length > 1 && html`<div class="col-arrows"><button class="x-btn" onClick=${() => moveWorkout(w.id, -1)} disabled=${wi === 0} aria-label="Subir">↑</button><button class="x-btn" onClick=${() => moveWorkout(w.id, 1)} disabled=${wi === list.length - 1} aria-label="Descer">↓</button></div>`}
                <button class="icon-btn" aria-label="Editar" onClick=${() => openCardioWorkout(type, w)}><${Icon} name="edit" /></button>
                <button class="icon-btn" aria-label="Excluir treino" onClick=${() => deleteWorkout(w)}><${Icon} name="trash" /></button>
                <button class="btn sm dark" onClick=${() => begin(w, today)}><${Icon} name="play" /><span class="hide-xs">Iniciar</span></button>
              </div>
            `)}
          </div>`
        : html`
          <div class="stack-sm">
            <p class="small muted">Salve treinos que você repete (com meta de distância ou tempo). Sugestões:</p>
            <div class="chips">
              ${(PRESETS[type] ?? []).map((p) => html`
                <button class="chip" onClick=${() => update((st) => st.workouts.push({ id: uid(), type, ...structuredClone(p) }))}>+ ${p.name}</button>
              `)}
            </div>
          </div>`}
    </div>
  `;
}

// --- Editor de treino planejado -------------------------------------------------------

function openCardioWorkout(type, w) {
  openModal((close) => html`<${CardioWorkoutEditor} type=${type} workout=${w} close=${close} />`);
}

function CardioWorkoutEditor({ type, workout, close }) {
  const a = ACTIVITIES[type];
  const tpls = PLANS_BY_TYPE[type] ?? ['livre'];
  const [name, setName] = useState(workout?.name ?? '');
  const [kind, setKind] = useState(workout?.kind ?? null);
  const [tpl, setTpl] = useState(workout?.plan?.tpl ?? 'livre');
  const [params, setParams] = useState(() => (workout?.plan?.params ? { ...workout.plan.params } : {}));
  const [dist, setDist] = useState(workout?.target?.distance != null ? (a.meters ? workout.target.distance * 1000 : workout.target.distance) : null);
  const [dur, setDur] = useState(workout?.target?.duration ? fmtDuration(workout.target.duration) : '');
  const [notes, setNotes] = useState(workout?.notes ?? '');
  const p = tpl === 'livre' ? {} : { ...planDefaults(tpl, type), ...params };
  const steps = buildSteps(tpl, p);
  const chooseTpl = (t) => {
    if (t === tpl) return;
    setTpl(t);
    setParams(workout?.plan?.tpl === t ? { ...workout.plan.params } : {});
    if (PLAN_KIND[t] && (a.kinds ?? []).includes(PLAN_KIND[t])) setKind(PLAN_KIND[t]);
  };
  const setP = (k) => (v) => setParams((o) => ({ ...o, [k]: v }));
  const save = () => {
    const nm = name.trim() || (tpl !== 'livre' ? PLAN_TYPES[tpl].label : '');
    if (!nm) return toast('Dê um nome ao treino');
    if (tpl !== 'livre' && !steps.length) return toast('Preencha as etapas do treino');
    const target = tpl === 'livre'
      ? { distance: dist ? (a.meters ? dist / 1000 : dist) : null, duration: parseDuration(dur) }
      : null;
    update((st) => {
      const data = { type, name: nm, kind, target, notes: notes.trim(), plan: tpl === 'livre' ? null : { tpl, params: p, steps } };
      if (workout) Object.assign(st.workouts.find((x) => x.id === workout.id), data);
      else st.workouts.push({ id: uid(), ...data });
    });
    close();
  };
  const remove = async () => {
    if (await deleteWorkout(workout)) close();
  };
  // funções (não componentes) para os campos não serem recriados a cada tecla
  const P = ({ k, label, hint }) => html`<${Field} label=${label} hint=${hint}><${PaceInput} key=${`${tpl}-${k}`} type=${type} value=${p[k]} onChange=${setP(k)} /><//>`;
  const N = ({ k, label, unit, step = '1' }) => html`<${Field} label=${label}><${NumInput} value=${p[k]} onInput=${setP(k)} unit=${unit} step=${step} /><//>`;
  const T = ({ k, label }) => html`<${Field} label=${label} hint="mm:ss"><${TimeInput} key=${`${tpl}-${k}`} value=${p[k]} onChange=${setP(k)} /><//>`;
  return html`
    <${Sheet} title=${workout ? 'Editar treino' : `Novo treino · ${a.label}`} onClose=${close} footer=${html`
      ${workout && html`<button class="btn danger" onClick=${remove}><${Icon} name="trash" />Excluir</button>`}
      <button class="btn primary grow" onClick=${save}>Salvar</button>
    `}>
      ${tpls.length > 1 && html`
        <${Field} label="Modelo de treino">
          <div class="chips">
            ${tpls.map((t) => html`<button type="button" class=${`chip ${tpl === t ? 'on' : ''}`} onClick=${() => chooseTpl(t)}>${PLAN_TYPES[t].label}</button>`)}
          </div>
          <p class="tiny muted" style="margin-top:6px">${PLAN_TYPES[tpl].desc}</p>
        <//>`}
      <${Field} label="Nome"><input class="input" value=${name} onInput=${(e) => setName(e.target.value)} placeholder=${tpl !== 'livre' ? PLAN_TYPES[tpl].label : PRESETS[type]?.[0]?.name ?? 'Nome'} /><//>
      <${KindChips} type=${type} value=${kind} onChange=${setKind} />
      ${tpl === 'livre' && html`
        <div class="grid-2">
          ${has(type, 'distance') && html`<${Field} label=${`Meta de distância (${distUnit(type)})`}><${NumInput} value=${dist} onInput=${setDist} unit=${distUnit(type)} step="any" /><//>`}
          <${Field} label="Meta de tempo" hint="mm:ss ou h:mm:ss"><input class="input num" inputmode="numeric" value=${dur} onInput=${(e) => setDur(e.target.value)} placeholder="30:00" /><//>
        </div>`}
      ${tpl === 'intervalado' && html`
        <div class="grid-2">
          ${N({ k: 'warm', label: 'Aquecimento', unit: 'min' })}
          ${N({ k: 'reps', label: 'Repetições', unit: '×' })}
        </div>
        <${Field} label="Tiro por"><${Seg} options=${[['dist', 'Distância'], ['time', 'Tempo']]} value=${p.workBy} onChange=${setP('workBy')} /><//>
        <div class="grid-2">
          ${p.workBy === 'time' ? html`${T({ k: 'workTime', label: 'Duração do tiro' })}` : html`${N({ k: 'workDist', label: 'Distância do tiro', unit: 'm' })}`}
          ${P({ k: 'workPace', label: type === 'bike' ? 'Velocidade alvo' : 'Pace alvo', hint: 'opcional' })}
        </div>
        <${Field} label="Recuperação por"><${Seg} options=${[['time', 'Tempo'], ['dist', 'Distância']]} value=${p.restBy} onChange=${setP('restBy')} /><//>
        <div class="grid-2">
          ${p.restBy === 'dist' ? html`${N({ k: 'restDist', label: 'Recuperação', unit: 'm' })}` : html`${T({ k: 'restTime', label: 'Recuperação' })}`}
          ${N({ k: 'cool', label: 'Desaquecimento', unit: 'min' })}
        </div>`}
      ${tpl === 'fartlek' && html`
        <div class="grid-2">
          ${N({ k: 'warm', label: 'Aquecimento', unit: 'min' })}
          ${N({ k: 'reps', label: 'Repetições', unit: '×' })}
          ${T({ k: 'hard', label: 'Forte' })}
          ${T({ k: 'easy', label: 'Leve' })}
          ${N({ k: 'cool', label: 'Desaquecimento', unit: 'min' })}
        </div>`}
      ${tpl === 'ritmo' && html`
        <div class="grid-2">
          ${N({ k: 'warm', label: 'Aquecimento', unit: 'min' })}
          ${N({ k: 'cool', label: 'Desaquecimento', unit: 'min' })}
        </div>
        <${Field} label="Bloco no ritmo por"><${Seg} options=${[['time', 'Tempo'], ['dist', 'Distância']]} value=${p.tempoBy} onChange=${setP('tempoBy')} /><//>
        <div class="grid-2">
          ${p.tempoBy === 'dist' ? html`${N({ k: 'tempoDist', label: 'Distância', unit: 'km', step: 'any' })}` : html`${N({ k: 'tempoTime', label: 'Duração', unit: 'min' })}`}
          ${P({ k: 'tempoPace', label: type === 'bike' ? 'Velocidade alvo' : 'Pace alvo' })}
        </div>`}
      ${tpl === 'longao' && html`
        <div class="grid-2">
          ${N({ k: 'dist', label: 'Distância', unit: 'km', step: 'any' })}
          ${P({ k: 'pace', label: type === 'bike' ? 'Velocidade alvo' : 'Pace alvo', hint: 'confortável' })}
        </div>`}
      ${tpl === 'progressivo' && html`
        <div class="grid-2">
          ${N({ k: 'blocks', label: 'Blocos', unit: '×' })}
          ${N({ k: 'blockKm', label: 'Cada bloco', unit: 'km', step: 'any' })}
          ${P({ k: 'startPace', label: type === 'bike' ? 'Velocidade inicial' : 'Pace inicial' })}
          ${type === 'bike'
            ? html`${N({ k: 'speedInc', label: 'Acelerar por bloco', unit: 'km/h', step: 'any' })}`
            : html`${N({ k: 'drop', label: 'Mais rápido por bloco', unit: 's/km' })}`}
        </div>`}
      ${tpl === 'regenerativo' && html`
        <div class="grid-2">
          ${N({ k: 'time', label: 'Duração', unit: 'min' })}
          ${P({ k: 'pace', label: type === 'bike' ? 'Velocidade' : 'Pace leve' })}
        </div>`}
      ${steps.length > 0 && html`<${StepsPreview} type=${type} steps=${steps} />`}
      <${Field} label="Descrição (opcional)"><input class="input" value=${notes} onInput=${(e) => setNotes(e.target.value)} placeholder=${tpl === 'livre' ? 'Ex.: percurso do parque' : 'Ex.: na pista, tiros no plano'} /><//>
    <//>
  `;
}

function StepsPreview({ type, steps }) {
  const tot = planTotals(steps, type === 'bike' ? 3600 / 25 : type === 'swim' ? 1200 : type === 'walk' ? 600 : 360);
  return html`
    <div class="stack-sm">
      <div class="row-sb"><span class="eyebrow">Etapas (${steps.length})</span><span class="mono tiny">~${fmtDuration(tot.sec)} · ~${showDist(type, tot.km)}</span></div>
      <ol class="steps-list">
        ${steps.map((st, i) => html`
          <li key=${i} class=${`k-${st.kind}`}><span>${stepLabel(st)}</span>${st.pace && html`<span class="mono tiny">${paceText(type, st.pace)}</span>`}</li>
        `)}
      </ol>
      ${!tot.exact && html`<p class="tiny muted">Estimativa usa um ritmo médio onde não há alvo.</p>`}
    </div>
  `;
}

// mm:ss → segundos (para etapas por tempo)
function TimeInput({ value, onChange }) {
  const [txt, setTxt] = useState(value ? fmtDuration(value) : '');
  return html`<input class="input num" inputmode="numeric" value=${txt} placeholder="1:30"
    onInput=${(e) => { setTxt(e.target.value); const v = parseDuration(e.target.value.includes(':') ? e.target.value : `0:${e.target.value}`); if (v) onChange(v); }} />`;
}

// Pace (mm:ss /km; natação /100 m) ou velocidade (km/h na bike). Valor interno: s/km.
function PaceInput({ type, value, onChange }) {
  const bike = type === 'bike';
  const swim = type === 'swim';
  const [txt, setTxt] = useState(() => (!value ? '' : bike ? String(+(3600 / value).toFixed(1)).replace('.', ',') : fmtDuration(swim ? value / 10 : value)));
  const onIn = (e) => {
    const t = e.target.value;
    setTxt(t);
    if (!t.trim()) return onChange(null);
    if (bike) {
      const v = Number(t.replace(',', '.'));
      if (v > 0) onChange(3600 / v);
    } else {
      const sec = parseDuration(t.includes(':') ? t : `${t}:00`);
      if (sec) onChange(swim ? sec * 10 : sec);
    }
  };
  return html`
    <div class="input-unit">
      <input class="input num" style="padding-right:64px" inputmode=${bike ? 'decimal' : 'numeric'} value=${txt} onInput=${onIn} placeholder=${bike ? '28' : swim ? '2:00' : '5:30'} />
      <em>${bike ? 'km/h' : swim ? '/100m' : '/km'}</em>
    </div>
  `;
}

function KindChips({ type, value, onChange }) {
  const kinds = ACTIVITIES[type].kinds ?? [];
  if (!kinds.length) return null;
  return html`
    <${Field} label="Tipo">
      <div class="chips">
        ${kinds.map((k) => html`<button type="button" class=${`chip ${value === k ? 'on' : ''}`} onClick=${() => onChange(value === k ? null : k)}>${k}</button>`)}
      </div>
    <//>
  `;
}

// --- Registro / edição -------------------------------------------------------------------

export function openCardioForm({ type, session }) {
  openModal((close) => html`<${CardioForm} type=${type ?? sessionType(session)} session=${session} close=${close} />`);
}

function CardioForm({ type, session, close }) {
  const a = ACTIVITIES[type];
  const c = session?.cardio ?? {};
  const [f, setF] = useState({
    name: session?.name ?? a.label,
    date: session?.date ?? dateKey(),
    kind: c.kind ?? null,
    dist: c.distance != null ? (a.meters ? Math.round(c.distance * 1000) : c.distance) : null,
    dur: c.duration ? fmtDuration(c.duration) : '',
    hr: c.hr ?? null,
    elevation: c.elevation ?? null,
    cadence: c.cadence ?? null,
    rounds: c.rounds ?? null,
    rpe: c.rpe ?? null,
    notes: c.notes ?? '',
  });
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const km = f.dist ? (a.meters ? f.dist / 1000 : f.dist) : null;
  const sec = parseDuration(f.dur);
  const rate = km && sec ? rateText(type, km, sec) : null;
  const kcal = estimateKcal(type, { distance: km, duration: sec }, latestWeight(getState()) ?? 75);

  const save = () => {
    if (!sec) return toast('Informe a duração (ex.: 32:15)');
    if (has(type, 'distance') && f.dist != null && f.dist < 0) return toast('Distância inválida');
    const cardio = {
      ...c,
      kind: f.kind, distance: km, duration: sec, hr: f.hr, elevation: f.elevation,
      cadence: f.cadence, rounds: f.rounds, rpe: f.rpe, notes: f.notes.trim(), kcal,
    };
    update((st) => {
      if (session) {
        const x = st.sessions.find((y) => y.id === session.id);
        Object.assign(x, { name: f.name.trim() || a.label, date: f.date, cardio });
        if (!x.finishedAt) x.finishedAt = Date.now();
        if (st.activeSessionId === x.id) st.activeSessionId = null;
      } else {
        const now = Date.now();
        st.sessions.push({ id: uid(), type, date: f.date, name: f.name.trim() || a.label, startedAt: now - sec * 1000, finishedAt: now, exercises: [], cardio });
      }
    });
    close();
  };
  const remove = async () => {
    if (await deleteSession(session.id)) close();
  };

  return html`
    <${Sheet} title=${session ? `Editar · ${a.label}` : `Registrar · ${a.label}`} onClose=${close} footer=${html`
      ${session && html`<button class="btn danger" onClick=${remove} aria-label="Excluir"><${Icon} name="trash" /></button>`}
      <button class="btn primary grow" onClick=${save}>Salvar</button>
    `}>
      <div class="grid-2">
        <${Field} label="Nome"><input class="input" value=${f.name} onInput=${(e) => set('name')(e.target.value)} /><//>
        <${Field} label="Data"><input class="input" type="date" value=${f.date} max=${dateKey()} onChange=${(e) => e.target.value && set('date')(e.target.value)} /><//>
      </div>
      <${KindChips} type=${type} value=${f.kind} onChange=${set('kind')} />
      <div class="grid-2">
        ${has(type, 'distance') && html`<${Field} label="Distância"><${NumInput} value=${f.dist} onInput=${set('dist')} unit=${distUnit(type)} step="any" /><//>`}
        <${Field} label="Duração" hint="mm:ss ou h:mm:ss"><input class="input num" inputmode="numeric" value=${f.dur} onInput=${(e) => set('dur')(e.target.value)} placeholder="32:15" /><//>
        ${has(type, 'hr') && html`<${Field} label="FC média"><${NumInput} value=${f.hr} onInput=${set('hr')} unit="bpm" step="1" /><//>`}
        ${has(type, 'elevation') && html`<${Field} label="Elevação"><${NumInput} value=${f.elevation} onInput=${set('elevation')} unit="m" step="1" /><//>`}
        ${has(type, 'cadence') && html`<${Field} label="Cadência"><${NumInput} value=${f.cadence} onInput=${set('cadence')} unit=${type === 'bike' ? 'rpm' : 'ppm'} step="1" /><//>`}
        ${has(type, 'rounds') && html`<${Field} label="Rounds"><${NumInput} value=${f.rounds} onInput=${set('rounds')} step="1" /><//>`}
        <${Field} label="Esforço (RPE)"><${NumInput} value=${f.rpe} onInput=${set('rpe')} step="0.5" min="1" max="10" placeholder="1–10" /><//>
      </div>
      <div class="card ink">
        <div class="grid-3">
          <div><div class="mono" style="font-weight:700;font-size:18px">${sec ? fmtDuration(sec) : '—'}</div><div class="eyebrow">Tempo</div></div>
          <div><div class="mono" style="font-weight:700;font-size:18px">${rate ?? '—'}</div><div class="eyebrow">${a.rate === 'speed' ? 'Velocidade' : 'Pace'}</div></div>
          <div><div class="mono" style="font-weight:700;font-size:18px">${kcal ?? '—'}</div><div class="eyebrow">kcal est.</div></div>
        </div>
      </div>
      ${c.route?.length > 1 && html`<div class="card tight"><div class="card-title"><h3 class="up">Percurso (GPS)</h3>${c.maxSpeed && html`<span class="mono tiny">máx. ${num(c.maxSpeed, 1)} km/h</span>`}</div><${RouteMap} route=${c.route} /></div>`}
      ${c.splits?.length > 0 && html`<${SplitsTable} type=${type} splits=${c.splits} />`}
      ${c.plan?.steps?.length > 0 && html`<${StepsDone} type=${type} steps=${c.plan.steps} laps=${c.laps ?? []} cur=${-1} />`}
      <${Field} label="Notas"><textarea class="input" rows="2" value=${f.notes} onInput=${(e) => set('notes')(e.target.value)} placeholder="Como foi? Clima, percurso, sensações…"></textarea><//>
    <//>
  `;
}

// --- Cronômetro ao vivo ----------------------------------------------------------------------

function patch(id, fn) {
  update((st) => {
    const x = st.sessions.find((y) => y.id === id);
    if (x) fn(x, st);
  });
}

const GPS_TXT = {
  ok: ['GPS', 'on'], weak: ['GPS fraco', 'warn'], searching: ['Buscando GPS…', 'warn'], paused: ['GPS pausado', ''],
  denied: ['GPS bloqueado', 'bad'], unsupported: ['Sem GPS', 'bad'], off: ['GPS desligado', ''],
};

export function CardioLive({ s, ses }) {
  const now = useNow(500);
  const type = sessionType(ses);
  const a = ACTIVITIES[type];
  const gps = useGps(ses.id);
  useEffect(() => {
    keepAwake(true);
    return () => keepAwake(false);
  }, []);
  if (ses.finishedAt) {
    // sessão concluída aberta por link: volta à lista e abre a edição
    setTimeout(() => { go('treino'); openCardioForm({ session: ses }); }, 0);
    return null;
  }
  const paused = !!ses.pausedAt;
  const elapsed = elapsedOf(ses, now);
  const t = ses.cardio?.target;
  const gpsCapable = GPS_TYPES.includes(type);
  const gpsOn = gpsCapable && !!ses.cardio?.gps;
  const { km, hasDist, track } = liveDistance(ses);
  const curSpeed = track && gpsOn ? currentSpeed(track, now) : null; // m/s
  const curPace = curSpeed > 0.3 ? 1000 / curSpeed : null; // s/km
  const avgPace = km > 0.05 ? elapsed / km : null;
  const splits = track ? splitTimes(track.splits) : [];
  const plan = ses.cardio?.plan;
  const steps = plan?.steps ?? [];
  const cursor = ses.cardio?.cursor ?? { idx: 0, t: 0, d: 0 };
  const step = steps[cursor.idx];
  const prog = step ? stepProgress(step, cursor, elapsed, km) : null;
  const status = step?.pace ? paceStatus(step.pace, curPace, type === 'bike' ? 6 : 10) : null;
  const pct = !steps.length && t?.duration ? Math.min(1, elapsed / t.duration) : !steps.length && t?.distance && km ? Math.min(1, km / t.distance) : null;
  const gpsTxt = !gpsCapable ? null : !gpsOn ? GPS_TXT.off : GPS_TXT[gps?.status ?? 'searching'] ?? GPS_TXT.searching;

  const toggle = () => patch(ses.id, (x) => {
    if (x.pausedAt) {
      x.pausedMs = (x.pausedMs || 0) + (Date.now() - x.pausedAt);
      x.pausedAt = null;
    } else {
      x.pausedAt = Date.now();
    }
  });
  const toggleGps = () => {
    if (!gpsOn && !gpsSupported()) return toast('Este navegador não tem GPS');
    patch(ses.id, (x) => { x.cardio.gps = !gpsOn; });
  };
  const next = () => {
    const r = skip(steps, cursor, elapsed, km, hasDist);
    patch(ses.id, (x) => { x.cardio.cursor = r.cursor; x.cardio.laps = [...(x.cardio.laps ?? []), ...r.laps]; });
    announceStep(ses, r.cursor.idx);
  };
  const finish = () => {
    const dur = Math.round(elapsed);
    if (dur < 10) return toast('Muito curto para salvar');
    const tr = takeTrack(ses.id);
    patch(ses.id, (x, st) => {
      const c = x.cardio;
      x.cardio = { ...c, duration: dur };
      if (tr && tr.fixes > 0 && tr.dist > 0) {
        Object.assign(x.cardio, {
          distance: +(tr.dist / 1000).toFixed(2),
          elevation: Math.round(tr.gain) || c.elevation || null,
          splits: splitTimes(tr.splits),
          route: simplify(tr.pts),
          maxSpeed: tr.maxSpeed ? +(tr.maxSpeed * 3.6).toFixed(1) : null,
          gpsTracked: true,
        });
      }
      // etapa em andamento entra como volta parcial
      if (c.plan?.steps?.length && c.cursor && c.cursor.idx < c.plan.steps.length && dur - c.cursor.t > 5) {
        const r = skip(c.plan.steps, c.cursor, dur, tr ? tr.dist / 1000 : 0, !!tr?.fixes);
        x.cardio.laps = [...(c.laps ?? []), ...r.laps];
        x.cardio.cursor = r.cursor;
      }
      if (x.pausedAt) { x.pausedMs = (x.pausedMs || 0) + (Date.now() - x.pausedAt); x.pausedAt = null; }
      x.finishedAt = Date.now();
      st.activeSessionId = null;
    });
    go('treino');
    const saved = getState().sessions.find((x) => x.id === ses.id);
    openCardioForm({ session: saved });
    toast(saved.cardio?.gpsTracked ? 'Percurso salvo — confira e salve' : 'Complete distância e detalhes');
  };
  const discard = async () => {
    if (!(await confirmDialog('Descartar esta atividade?', { ok: 'Descartar' }))) return;
    takeTrack(ses.id);
    update((st) => {
      st.sessions = st.sessions.filter((x) => x.id !== ses.id);
      st.activeSessionId = null;
    });
    go('treino');
  };

  const big = (v, l) => html`<div><div class="mono live-v">${v}</div><div class="eyebrow">${l}</div></div>`;
  return html`
    <div class="stack">
      <div class="page-head">
        <div class="grow">
          <button class="link-btn small" onClick=${() => go('treino')}>← Treino</button>
          <div class="eyebrow" style="margin-top:6px">${a.label}${ses.cardio?.kind ? ` · ${ses.cardio.kind}` : ''}</div>
          <h1 style="margin-top:4px">${ses.name}</h1>
        </div>
        ${gpsTxt && html`<button class=${`gps-chip ${gpsTxt[1]}`} onClick=${toggleGps} aria-label=${gpsOn ? 'Desligar GPS' : 'Ligar GPS'}><i></i>${gpsTxt[0]}</button>`}
      </div>

      <div class=${`card ${paused ? '' : 'accent'} center`} style="padding:22px 14px">
        <div class="eyebrow">${paused ? 'Pausado' : 'Em andamento'}</div>
        <div class="mono" style="font-size:60px;font-weight:800;letter-spacing:-0.05em;line-height:1;margin:8px 0 14px">${fmtDuration(elapsed)}</div>
        ${gpsOn
          ? html`<div class="grid-3">
              ${big(showDist(type, km), 'Distância')}
              ${big(type === 'bike' ? paceText(type, curPace, false) : paceText(type, curPace, false), type === 'bike' ? 'km/h agora' : 'Pace agora')}
              ${big(paceText(type, avgPace, false), type === 'bike' ? 'km/h média' : 'Pace médio')}
            </div>`
          : t && html`<div class="mono small">Meta: ${targetText(type, t)}</div>`}
        ${pct != null && html`<div class="xp-bar" style="margin-top:12px"><i style=${`width:${pct * 100}%`}></i></div>`}
      </div>

      <${LockPrompt} s=${s} />

      ${steps.length > 0 && html`
        <div class=${`card step-card k-${step?.kind ?? 'done'}`}>
          ${step
            ? html`
              <div class="row-sb">
                <span class="eyebrow">Etapa ${cursor.idx + 1}/${steps.length}</span>
                ${status && html`<span class=${`pace-st ${status}`}>${status === 'fast' ? (type === 'bike' ? '▼ Alivie' : '▼ Segure') : status === 'slow' ? '▲ Acelere' : '✓ No ritmo'}</span>`}
              </div>
              <h2 style="margin:6px 0 2px">${stepLabel(step)}</h2>
              <div class="mono" style="font-size:40px;font-weight:800;line-height:1.1">
                ${step.by === 'time' ? fmtDuration(prog.remain) : hasDist ? showDist(type, prog.remain) : '—'}
                <span class="small" style="font-weight:600"> restam</span>
              </div>
              ${step.by === 'dist' && !hasDist && html`<p class="tiny">Sem GPS: toque em “Próxima etapa” ao completar a distância.</p>`}
              <div class="xp-bar" style="margin-top:10px"><i style=${`width:${prog.pct * 100}%`}></i></div>
              ${step.pace && html`<div class="mono small" style="margin-top:8px">Alvo ${paceText(type, step.pace)}${curPace ? ` · agora ${paceText(type, curPace)}` : ''}</div>`}
              <div class="row-sb" style="margin-top:10px">
                <span class="tiny">${steps[cursor.idx + 1] ? `Depois: ${stepLabel(steps[cursor.idx + 1])}` : 'Última etapa'}</span>
                <button class="btn xs dark" onClick=${next}>Próxima etapa ⏭</button>
              </div>`
            : html`<h3 class="up">✓ Treino estruturado concluído</h3><p class="small">Continue no seu ritmo ou finalize.</p>`}
        </div>`}

      <div class="grid-2">
        <button class="btn" onClick=${toggle}>${paused ? '▶ Retomar' : '❚❚ Pausar'}</button>
        <button class="btn primary" onClick=${finish}><${Icon} name="check" />Finalizar</button>
      </div>

      ${gpsOn && html`
        <div class="grid-3">
          <${Stat} v=${track ? num(track.gain) : '—'} unit="m" l="Subida" />
          <${Stat} v=${splits.length ? (type === 'bike' ? num(3600 / splits[splits.length - 1], 1) : fmtDuration(splits[splits.length - 1])) : '—'} unit=${type === 'bike' && splits.length ? 'km/h' : ''} l="Último km" />
          <${Stat} v=${track?.maxSpeed ? num(track.maxSpeed * 3.6, 1) : '—'} unit="km/h" l="Vel. máx." />
        </div>
        ${track?.pts?.length > 1 && html`<div class="card tight"><${RouteMap} route=${simplify(track.pts, 200)} /></div>`}
        ${splits.length > 0 && html`<${SplitsTable} type=${type} splits=${splits} />`}
      `}

      ${steps.length > 0 && html`<${StepsDone} type=${type} steps=${steps} laps=${ses.cardio?.laps ?? []} cur=${cursor.idx} />`}

      ${ses.cardio?.notes && html`<p class="small">${ses.cardio.notes}</p>`}
      ${gpsOn && html`
        <p class="tiny muted">
          A tela fica ligada durante a atividade. No iPhone, o GPS do app para quando a tela é bloqueada ou o app
          vai para segundo plano; ao voltar, o trecho é ligado em linha reta. Para o percurso mais preciso, mantenha o app aberto.
          ${gps?.status === 'denied' ? ' Localização bloqueada: Ajustes → Privacidade → Serviços de Localização → Safari (ou o app) → “Ao Usar o App” e “Localização Precisa”.' : ''}
        </p>`}
      <button class="btn ghost" onClick=${discard}>Descartar</button>
    </div>
  `;
}

export function RouteMap({ route, h = 180 }) {
  const pts = projectRoute(route, 320, h, 12);
  if (pts.length < 2) return null;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  const [sx, sy] = pts[0];
  const [ex, ey] = pts[pts.length - 1];
  return html`
    <svg class="route" viewBox=${`0 0 320 ${h}`} role="img" aria-label="Percurso">
      <path d=${d} class="route-line" />
      <circle cx=${sx} cy=${sy} r="6" class="route-start" />
      <rect x=${ex - 6} y=${ey - 6} width="12" height="12" class="route-end" />
    </svg>
  `;
}

function SplitsTable({ type, splits }) {
  const best = Math.min(...splits);
  return html`
    <div class="card tight">
      <div class="card-title"><h3 class="up">Parciais por km</h3></div>
      <div class="splits">
        ${splits.map((sec, i) => html`
          <div class=${`split ${sec === best && splits.length > 1 ? 'best' : ''}`} key=${i}>
            <span class="mono">${i + 1}</span>
            <i style=${`width:${Math.round((best / sec) * 100)}%`}></i>
            <b class="mono">${type === 'bike' ? `${num(3600 / sec, 1)} km/h` : fmtDuration(sec)}</b>
          </div>
        `)}
      </div>
    </div>
  `;
}

function StepsDone({ type, steps, laps, cur }) {
  return html`
    <div class="card tight">
      <div class="card-title"><h3 class="up">Etapas</h3></div>
      <ol class="steps-list">
        ${steps.map((st, i) => {
          const lap = laps.filter((l) => l.i === i).pop();
          const pace = lap?.km > 0.05 ? lap.sec / lap.km : null;
          return html`
            <li key=${i} class=${`k-${st.kind} ${i === cur ? 'cur' : ''} ${lap ? 'done' : ''}`}>
              <span>${lap ? '✓ ' : i === cur ? '▶ ' : ''}${stepLabel(st)}</span>
              <span class="mono tiny">${lap ? `${fmtDuration(lap.sec)}${pace ? ` · ${paceText(type, pace)}` : ''}` : st.pace ? paceText(type, st.pace) : ''}</span>
            </li>
          `;
        })}
      </ol>
    </div>
  `;
}

// --- Histórico ----------------------------------------------------------------------------------

function CardioHistory({ s, type }) {
  const list = cardioSessions(s, type).slice().reverse();
  const prs = cardioPRs(s);
  if (!list.length) return html`<${Empty} title="Nada registrado" text=${`Use o cronômetro ou registre uma atividade de ${ACTIVITIES[type].label.toLowerCase()} já feita.`} action=${html`<button class="btn primary" onClick=${() => openCardioForm({ type })}><${Icon} name="plus" />Registrar</button>`} />`;
  return html`
    <div class="list">
      ${list.map((x) => {
        const c = x.cardio ?? {};
        const n = prs.filter((p) => p.sessionId === x.id).length;
        const rate = rateText(type, c.distance, c.duration);
        return html`
          <div class="li" key=${x.id}>
            <button class="row grow" style="background:none;border:0;padding:0;text-align:left;min-width:0" onClick=${() => openCardioForm({ session: x })}>
              <div style="width:44px" class="center"><div class="eyebrow">${weekdayShort(x.date)}</div><div class="mono" style="font-weight:700;font-size:18px">${x.date.slice(8)}</div></div>
              <div class="grow" style="min-width:0">
                <div class="row wrap" style="gap:6px"><span class="t">${x.name}</span>${c.kind && html`<span class="tag">${c.kind}</span>`}${n > 0 && html`<span class="pr-flag">${n} PR</span>`}</div>
                <div class="s mono">${[c.distance ? showDist(type, c.distance) : null, fmtDuration(c.duration), rate, c.hr ? `${c.hr} bpm` : null].filter(Boolean).join(' · ')}</div>
              </div>
            </button>
            <button class="icon-btn" aria-label="Excluir atividade" onClick=${() => deleteSession(x.id)}><${Icon} name="trash" /></button>
          </div>
        `;
      })}
    </div>
  `;
}

// --- Progresso ----------------------------------------------------------------------------------

function CardioProgress({ s, type, today }) {
  const a = ACTIVITIES[type];
  const list = cardioSessions(s, type);
  if (!list.length) return html`<${Empty} title="Sem dados ainda" text="Registre atividades para ver volume semanal, ritmo e recordes." />`;
  const usesDist = a.fields.includes('distance');
  const ws0 = weekStart(today);
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(ws0, (i - 7) * 7));
  const bars = weeks.map((ws) => {
    const w = cardioWeek(s, type, ws);
    const d = parseKey(ws);
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: usesDist ? (a.meters ? w.km * 1000 : w.km) : w.sec / 60, hi: ws === ws0 };
  });
  const ratePts = list
    .filter((x) => x.cardio?.distance >= (a.minPrKm ?? 1) && x.cardio?.duration)
    .map((x) => ({
      date: x.date,
      y: a.rate === 'speed' ? speedKmh(x.cardio.distance, x.cardio.duration) : paceSecPerKm(x.cardio.distance, x.cardio.duration) / 60 / (a.rate === 'pace100' ? 10 : 1),
    }));
  const rec = cardioRecords(s, type);
  const tot = cardioTotals(list);
  const hrPts = list.filter((x) => x.cardio?.hr).map((x) => ({ date: x.date, y: x.cardio.hr }));
  return html`
    <div class="stack">
      <div class="card">
        <div class="card-title"><h3 class="up">${usesDist ? `Distância por semana (${distUnit(type)})` : 'Minutos por semana'}</h3></div>
        <${BarChart} bars=${bars} unit=${usesDist ? ` ${distUnit(type)}` : ' min'} />
      </div>
      ${a.rate && html`
        <div class="card">
          <div class="card-title"><h3 class="up">${a.rate === 'speed' ? 'Velocidade média (km/h)' : a.rate === 'pace100' ? 'Pace (min/100 m)' : 'Pace (min/km)'}</h3></div>
          <${LineChart} points=${ratePts} unit=${a.rate === 'speed' ? ' km/h' : ' min'} decimals=${1} />
          ${a.rate !== 'speed' && ratePts.length >= 2 && html`<p class="tiny muted" style="margin-top:6px">Quanto mais baixo, mais rápido.</p>`}
        </div>
      `}
      ${hrPts.length >= 2 && html`<div class="card"><div class="card-title"><h3 class="up">FC média (bpm)</h3></div><${LineChart} points=${hrPts} unit=" bpm" decimals=${0} /></div>`}
      <h3 class="up">Recordes</h3>
      <div class="grid-3">
        ${usesDist && html`<${Stat} v=${rec.longest ? showDist(type, rec.longest.km) : '—'} l="Maior distância" />`}
        ${a.rate && html`<${Stat} v=${rec.fastest ? rateText(type, rec.fastest.km, rec.fastest.sec).split(' ')[0] : '—'} unit=${rec.fastest ? ' ' + rateText(type, rec.fastest.km, rec.fastest.sec).split(' ').slice(1).join(' ') : ''} l=${a.rate === 'speed' ? 'Mais rápida' : 'Melhor pace'} />`}
        <${Stat} v=${rec.longestTime ? fmtDuration(rec.longestTime.sec) : '—'} l="Mais longa" />
      </div>
      <h3 class="up">Total</h3>
      <div class="grid-3">
        <${Stat} v=${tot.count} l="Atividades" />
        ${usesDist && html`<${Stat} v=${a.meters ? num(tot.km * 1000) : num(tot.km, 1)} unit=${distUnit(type)} l="Distância" />`}
        <${Stat} v=${num(tot.sec / 3600, 1)} unit="h" l="Tempo" />
      </div>
      <p class="tiny muted">Recordes de ritmo contam a partir de ${a.meters ? `${(a.minPrKm ?? 1) * 1000} m` : `${a.minPrKm ?? 1} km`}. Cada PR vale +25 XP. Calorias estimadas por distância (corrida/caminhada) ou MET × peso × tempo.</p>
    </div>
  `;
}

