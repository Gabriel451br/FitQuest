// Atividades aeróbicas/esportivas: treinos planejados, cronômetro, registro, histórico e progresso.
import { html, useState } from '../lib.js';
import { update, getState, latestWeight } from '../store.js';
import {
  ACTIVITIES, sessionType, fmtDuration, parseDuration, rateText, estimateKcal, paceSecPerKm, speedKmh,
  cardioSessions, cardioWeek, cardioTotals, cardioRecords, cardioPRs,
} from '../cardio.js';
import { Icon, openModal, Sheet, Field, NumInput, toast, confirmDialog, Empty, Stat, useNow } from '../ui.js';
import { LineChart, BarChart } from '../charts.js';
import { startSession, deleteSession, deleteWorkout, moveWorkout } from '../actions.js';
import { go } from '../nav.js';
import { dateKey, uid, num, weekdayShort, addDays, weekStart, parseKey } from '../util.js';

const PRESETS = {
  run: [
    { name: 'Rodagem 5 km', kind: 'Rodagem', target: { distance: 5 } },
    { name: 'Intervalado 6×400 m', kind: 'Intervalado', target: { duration: 1800 }, notes: '6×400 m forte / 200 m trote' },
    { name: 'Longão 10 km', kind: 'Longão', target: { distance: 10 } },
  ],
  walk: [{ name: 'Caminhada 30 min', kind: 'Rápida', target: { duration: 1800 } }],
  bike: [{ name: 'Pedal 20 km', kind: 'Estrada', target: { distance: 20 } }, { name: 'Indoor 45 min', kind: 'Indoor', target: { duration: 2700 } }],
  swim: [{ name: 'Natação 1.000 m', kind: 'Livre', target: { distance: 1 } }],
  hiit: [{ name: 'HIIT 20 min', kind: 'HIIT', target: { duration: 1200 } }],
  sport: [{ name: 'Futebol', kind: 'Futebol', target: { duration: 3600 } }],
  other: [{ name: 'Yoga 30 min', kind: 'Yoga', target: { duration: 1800 } }],
};

const has = (type, f) => ACTIVITIES[type].fields?.includes(f);
const distUnit = (type) => (ACTIVITIES[type].meters ? 'm' : 'km');
const showDist = (type, km) => (km == null ? '—' : ACTIVITIES[type].meters ? `${num(km * 1000)} m` : `${num(km, 2)} km`);

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

function PlannedTab({ s, type, today }) {
  const a = ACTIVITIES[type];
  const list = s.workouts.filter((w) => w.type === type);
  return html`
    <div class="stack">
      <${WeekSummary} s=${s} type=${type} today=${today} />
      <div class="grid-2">
        <button class="btn primary" onClick=${() => startSession({ type, name: a.label }, today)}><${Icon} name="play" />Cronômetro</button>
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
                  <div class="s mono">${targetText(type, w.target) || 'Sem meta'}${w.notes ? ` · ${w.notes}` : ''}</div>
                </div>
                ${list.length > 1 && html`<div class="col-arrows"><button class="x-btn" onClick=${() => moveWorkout(w.id, -1)} disabled=${wi === 0} aria-label="Subir">↑</button><button class="x-btn" onClick=${() => moveWorkout(w.id, 1)} disabled=${wi === list.length - 1} aria-label="Descer">↓</button></div>`}
                <button class="icon-btn" aria-label="Editar" onClick=${() => openCardioWorkout(type, w)}><${Icon} name="edit" /></button>
                <button class="icon-btn" aria-label="Excluir treino" onClick=${() => deleteWorkout(w)}><${Icon} name="trash" /></button>
                <button class="btn sm dark" onClick=${() => startSession(w, today)}><${Icon} name="play" /><span class="hide-xs">Iniciar</span></button>
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
  const [name, setName] = useState(workout?.name ?? '');
  const [kind, setKind] = useState(workout?.kind ?? null);
  const [dist, setDist] = useState(workout?.target?.distance != null ? (a.meters ? workout.target.distance * 1000 : workout.target.distance) : null);
  const [dur, setDur] = useState(workout?.target?.duration ? fmtDuration(workout.target.duration) : '');
  const [notes, setNotes] = useState(workout?.notes ?? '');
  const save = () => {
    if (!name.trim()) return toast('Dê um nome ao treino');
    const target = {
      distance: dist ? (a.meters ? dist / 1000 : dist) : null,
      duration: parseDuration(dur),
    };
    update((st) => {
      const data = { type, name: name.trim(), kind, target, notes: notes.trim() };
      if (workout) Object.assign(st.workouts.find((x) => x.id === workout.id), data);
      else st.workouts.push({ id: uid(), ...data });
    });
    close();
  };
  const remove = async () => {
    if (await deleteWorkout(workout)) close();
  };
  return html`
    <${Sheet} title=${workout ? 'Editar treino' : `Novo treino · ${a.label}`} onClose=${close} footer=${html`
      ${workout && html`<button class="btn danger" onClick=${remove}><${Icon} name="trash" />Excluir</button>`}
      <button class="btn primary grow" onClick=${save}>Salvar</button>
    `}>
      <${Field} label="Nome"><input class="input" value=${name} onInput=${(e) => setName(e.target.value)} placeholder=${PRESETS[type]?.[0]?.name ?? 'Nome'} /><//>
      <${KindChips} type=${type} value=${kind} onChange=${setKind} />
      <div class="grid-2">
        ${has(type, 'distance') && html`<${Field} label=${`Meta de distância (${distUnit(type)})`}><${NumInput} value=${dist} onInput=${setDist} unit=${distUnit(type)} step="any" /><//>`}
        <${Field} label="Meta de tempo" hint="mm:ss ou h:mm:ss"><input class="input num" inputmode="numeric" value=${dur} onInput=${(e) => setDur(e.target.value)} placeholder="30:00" /><//>
      </div>
      <${Field} label="Descrição (opcional)"><input class="input" value=${notes} onInput=${(e) => setNotes(e.target.value)} placeholder="Ex.: 6×400 m forte / 200 m trote" /><//>
    <//>
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

export function CardioLive({ s, ses }) {
  const now = useNow(500);
  const type = sessionType(ses);
  const a = ACTIVITIES[type];
  if (ses.finishedAt) {
    // sessão concluída aberta por link: volta à lista e abre a edição
    setTimeout(() => { go('treino'); openCardioForm({ session: ses }); }, 0);
    return null;
  }
  const paused = !!ses.pausedAt;
  const elapsed = Math.max(0, ((ses.pausedAt ?? now) - ses.startedAt - (ses.pausedMs || 0)) / 1000);
  const t = ses.cardio?.target;
  const pct = t?.duration ? Math.min(1, elapsed / t.duration) : null;

  const toggle = () => patch(ses.id, (x) => {
    if (x.pausedAt) {
      x.pausedMs = (x.pausedMs || 0) + (Date.now() - x.pausedAt);
      x.pausedAt = null;
    } else {
      x.pausedAt = Date.now();
    }
  });
  const finish = () => {
    const dur = Math.round(elapsed);
    if (dur < 10) return toast('Muito curto para salvar');
    patch(ses.id, (x, st) => {
      x.cardio = { ...x.cardio, duration: dur };
      if (x.pausedAt) { x.pausedMs = (x.pausedMs || 0) + (Date.now() - x.pausedAt); x.pausedAt = null; }
      x.finishedAt = Date.now();
      st.activeSessionId = null;
    });
    go('treino');
    const saved = getState().sessions.find((x) => x.id === ses.id);
    openCardioForm({ session: saved });
    toast('Complete distância e detalhes');
  };
  const discard = async () => {
    if (!(await confirmDialog('Descartar esta atividade?', { ok: 'Descartar' }))) return;
    update((st) => {
      st.sessions = st.sessions.filter((x) => x.id !== ses.id);
      st.activeSessionId = null;
    });
    go('treino');
  };

  return html`
    <div class="stack">
      <div class="page-head">
        <div class="grow">
          <button class="link-btn small" onClick=${() => go('treino')}>← Treino</button>
          <div class="eyebrow" style="margin-top:6px">${a.label}${ses.cardio?.kind ? ` · ${ses.cardio.kind}` : ''}</div>
          <h1 style="margin-top:4px">${ses.name}</h1>
        </div>
      </div>
      <div class=${`card ${paused ? '' : 'accent'} center`} style="padding:28px 16px">
        <div class="eyebrow">${paused ? 'Pausado' : 'Em andamento'}</div>
        <div class="mono" style="font-size:64px;font-weight:800;letter-spacing:-0.05em;line-height:1;margin:10px 0">${fmtDuration(elapsed)}</div>
        ${t && html`<div class="mono small">Meta: ${targetText(type, t)}</div>`}
        ${pct != null && html`<div class="xp-bar" style="margin-top:12px"><i style=${`width:${pct * 100}%`}></i></div>`}
        ${ses.cardio?.notes && html`<p class="small" style="margin-top:10px">${ses.cardio.notes}</p>`}
      </div>
      <div class="grid-2">
        <button class="btn" onClick=${toggle}>${paused ? '▶ Retomar' : '❚❚ Pausar'}</button>
        <button class="btn primary" onClick=${finish}><${Icon} name="check" />Finalizar</button>
      </div>
      <p class="small muted center">Pode bloquear a tela ou sair do app: o tempo continua contando. Ao finalizar, você informa distância, FC e o resto.</p>
      <button class="btn ghost" onClick=${discard}>Descartar</button>
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

