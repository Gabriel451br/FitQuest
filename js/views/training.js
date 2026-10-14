// TREINO: rotinas, sessão ativa, histórico e progresso.
import { html, useState, useEffect, useMemo } from '../lib.js';
import { update, getState, useStore, allExercises, exerciseById, finishedSessions, intensityFor } from '../store.js';
import { MUSCLES, SPLIT_TEMPLATES, WEEKLY_SET_TARGET } from '../data/exercises.js';
import { exerciseHistory, lastPerformance, bestE1rm, computePRs, sessionStats, weeklySets, suggestNext, setE1rm, SET_KINDS, setKind, isWarmup, oneRmRef, MAIN_LIFTS } from '../training.js';
import { pctOf1rm, loadForPct, oneRmEstimates, repsAtPct } from '../calc.js';
import { Icon, openModal, Sheet, Field, Seg, Check, NumInput, NumField, toast, confirmDialog, Empty, Stat, useNow } from '../ui.js';
import { LineChart } from '../charts.js';
import { startSession, nextWorkout, deleteSession, deleteWorkout, moveWorkout } from '../actions.js';
import { ACTIVITIES, isCardio, sessionType } from '../cardio.js';
import { CardioHome, CardioLive } from './cardio.js';
import { go } from '../nav.js';
import { alarm, prime, keepAwake } from '../sound.js';
import { uid, normalize, num, fmtDate, weekdayShort, addDays, weekStart, toNum } from '../util.js';

export function TrainingView({ s, params, today }) {
  if (params[0] === 'sessao') {
    const id = params[1] ?? s.activeSessionId;
    const ses = s.sessions.find((x) => x.id === id);
    if (ses && isCardio(ses)) return html`<${CardioLive} s=${s} ses=${ses} />`;
    if (ses) return html`<${SessionView} s=${s} ses=${ses} />`;
  }
  return html`<${TrainingHome} s=${s} today=${today} />`;
}

function TrainingHome({ s, today }) {
  const [tab, setTab] = useState('rotina');
  const cat = s.settings.trainCat && ACTIVITIES[s.settings.trainCat] ? s.settings.trainCat : 'strength';
  const setCat = (c) => update((st) => { st.settings.trainCat = c; });
  const active = s.sessions.find((x) => x.id === s.activeSessionId && !x.finishedAt);
  return html`
    <div class="stack">
      <div class="page-head"><h1>Treino</h1></div>
      ${active && html`
        <button class="card ink row-sb" style="text-align:left;cursor:pointer" onClick=${() => go('treino/sessao')}>
          <div><div class="eyebrow">Em andamento · ${ACTIVITIES[sessionType(active)].label}</div><h3 style="margin-top:4px">${active.name}</h3></div>
          <span class="btn sm primary">Continuar</span>
        </button>
      `}
      <div class="cat-row" role="tablist" aria-label="Categoria de treino">
        ${Object.entries(ACTIVITIES).map(([k, a]) => html`
          <button role="tab" aria-selected=${cat === k} class=${`cat ${cat === k ? 'on' : ''}`} onClick=${() => setCat(k)}>
            <${Icon} name=${a.icon} /><span>${a.short}</span>
          </button>
        `)}
      </div>
      ${cat === 'strength'
        ? html`
          <div class="tabs">
            ${[['rotina', 'Rotina'], ['historico', 'Histórico'], ['progresso', 'Progresso'], ['volume', 'Volume'], ['rm', 'RM']].map(([k, l]) => html`
              <button class=${tab === k ? 'on' : ''} onClick=${() => setTab(k)}>${l}</button>
            `)}
          </div>
          ${tab === 'rotina' && html`<${RoutineTab} s=${s} today=${today} />`}
          ${tab === 'historico' && html`<${HistoryTab} s=${s} />`}
          ${tab === 'progresso' && html`<${ProgressTab} s=${s} />`}
          ${tab === 'volume' && html`<${VolumeTab} s=${s} today=${today} />`}
          ${tab === 'rm' && html`<${RmTab} s=${s} />`}
        `
        : html`<${CardioHome} key=${cat} s=${s} type=${cat} today=${today} />`}
    </div>
  `;
}

// --- Rotina -------------------------------------------------------------------

function RoutineTab({ s, today }) {
  const [reorder, setReorder] = useState(false);
  const nw = nextWorkout(s);
  const workouts = s.workouts.filter((w) => (w.type ?? 'strength') === 'strength');
  if (!workouts.length) {
    return html`
      <div class="stack">
        <${Empty} title="Sem rotina ainda" text="Comece com um modelo pronto ou monte seus treinos do zero." action=${html`<button class="btn primary" onClick=${() => editWorkout(s, null)}><${Icon} name="plus" />Criar treino</button>`} />
        <h3 class="up">Modelos prontos</h3>
        <div class="choice-grid">
          ${Object.entries(SPLIT_TEMPLATES).map(([k, t]) => html`
            <button class="choice" onClick=${() => applyTemplate(k)}>
              <b>${t.name}</b><small>${t.workouts.map((w) => w.name).join(' · ')}</small>
            </button>
          `)}
        </div>
        <button class="btn" onClick=${() => startSession(null, today)}><${Icon} name="play" />Treino livre</button>
      </div>
    `;
  }
  return html`
    <div class="stack">
      <div class="list">
        ${workouts.map((w, wi) => html`
          <div class="li" key=${w.id}>
            <div class="grow">
              <div class="row"><span class="t">${w.name}</span>${nw?.id === w.id && html`<span class="tag acc">Próximo</span>`}</div>
              <div class="s">${w.exercises.length} exercícios · ${w.exercises.reduce((a, e) => a + (e.sets || 0), 0)} séries · ${[...new Set(w.exercises.map((e) => MUSCLES[exerciseById(s, e.exId).primary]))].slice(0, 4).join(', ')}</div>
            </div>
            ${reorder
              ? html`
                <button class="icon-btn" onClick=${() => moveWorkout(w.id, -1)} disabled=${wi === 0} aria-label="Subir">↑</button>
                <button class="icon-btn" onClick=${() => moveWorkout(w.id, 1)} disabled=${wi === workouts.length - 1} aria-label="Descer">↓</button>`
              : html`
                <button class="icon-btn" onClick=${() => editWorkout(s, w)} aria-label="Editar"><${Icon} name="edit" /></button>
                <button class="icon-btn" onClick=${() => deleteWorkout(w)} aria-label="Excluir treino"><${Icon} name="trash" /></button>
                <button class="btn sm dark" onClick=${() => startSession(w, today)}><${Icon} name="play" /><span class="hide-xs">Iniciar</span></button>`}
          </div>
        `)}
      </div>
      <div class="row wrap">
        ${workouts.length > 1 && html`<button class=${`btn ${reorder ? 'primary' : ''}`} onClick=${() => setReorder(!reorder)}>${reorder ? 'Concluir' : '↕ Reordenar'}</button>`}
        <button class="btn" onClick=${() => editWorkout(s, null)}><${Icon} name="plus" />Novo treino</button>
        <button class="btn ghost" onClick=${() => startSession(null, today)}>Treino livre</button>
      </div>
    </div>
  `;
}

function applyTemplate(key) {
  const t = SPLIT_TEMPLATES[key];
  update((s) => {
    s.workouts = [...s.workouts.filter((w) => (w.type ?? 'strength') !== 'strength'), ...t.workouts.map((w) => ({
      id: uid(),
      type: 'strength',
      name: w.name,
      exercises: w.exercises.map((exId, i) => ({ exId, sets: i < 2 ? 4 : 3, reps: i < 2 ? '6-10' : '10-15', rest: i < 2 ? 150 : 90 })),
    }))];
  });
  toast(`Rotina ${t.name} criada`);
}

function editWorkout(s, w) {
  openModal((close) => html`<${WorkoutEditor} workout=${w} close=${close} />`);
}

// Rascunho do editor: se a janela fechar sem salvar, nada se perde.
const DRAFT_KEY = 'fitquest.workoutDraft';
const readDraft = (id) => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    return d && d.id === (id ?? null) ? d : null;
  } catch {
    return null;
  }
};
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } };

// Aplica a rotina editada ao treino em andamento: mantém o que já foi registrado,
// adiciona os exercícios novos e remove só os que ainda não têm série feita.
export function syncSessionWithRoutine(ses, routineExercises) {
  const pool = [...ses.exercises];
  const next = routineExercises.map((r) => {
    const k = pool.findIndex((e) => e.exId === r.exId);
    if (k >= 0) {
      const e = pool.splice(k, 1)[0];
      const done = e.sets.filter((x) => x.done).length;
      while (e.sets.length < Math.max(r.sets || 0, done)) e.sets.push(newSet());
      while (e.sets.length > Math.max(r.sets || 0, done, 1) && !e.sets[e.sets.length - 1].done && e.sets[e.sets.length - 1].kg == null) e.sets.pop();
      return { ...e, target: r.reps, rest: r.rest ?? e.rest, targetRpe: r.targetRpe ?? e.targetRpe, targetPct: r.targetPct ?? e.targetPct, targetKg: r.targetKg ?? e.targetKg };
    }
    return {
      exId: r.exId, target: r.reps, rest: r.rest ?? 90, targetRpe: r.targetRpe ?? null, targetPct: r.targetPct ?? null, targetKg: r.targetKg ?? null,
      sets: Array.from({ length: r.sets || 3 }, () => newSet()),
    };
  });
  // exercícios que saíram da rotina mas já têm séries feitas continuam no treino
  const kept = pool.filter((e) => e.sets.some((x) => x.done));
  ses.exercises = [...next, ...kept];
}

function WorkoutEditor({ workout, close }) {
  const draft = readDraft(workout?.id);
  const [name, setName] = useState(draft?.name ?? workout?.name ?? '');
  const [items, setItems] = useState(draft?.items ?? workout?.exercises ?? []);
  const sAll = getState();
  useEffect(() => { if (draft) toast('Rascunho recuperado'); }, []);
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ id: workout?.id ?? null, name, items })); } catch { /* ignore */ }
  }, [name, items]);
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const a = [...items];
    [a[i], a[j]] = [a[j], a[i]];
    setItems(a);
  };
  const patch = (i, k, v) => setItems((cur) => cur.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  const active = workout && sAll.sessions.find((x) => x.id === sAll.activeSessionId && !x.finishedAt && x.workoutId === workout.id);
  const save = () => {
    if (!name.trim()) return toast('Dê um nome ao treino');
    update((s) => {
      const data = { name: name.trim(), exercises: items };
      if (workout) Object.assign(s.workouts.find((x) => x.id === workout.id), data);
      else s.workouts.push({ id: uid(), type: 'strength', ...data });
      const ses = workout && s.sessions.find((x) => x.id === s.activeSessionId && !x.finishedAt && x.workoutId === workout.id);
      if (ses) syncSessionWithRoutine(ses, items);
    });
    clearDraft();
    if (active) toast('Treino em andamento atualizado');
    close();
  };
  const cancel = () => {
    clearDraft();
    close();
  };
  const remove = async () => {
    if (await deleteWorkout(workout)) { clearDraft(); close(); }
  };
  return html`
    <${Sheet} title=${workout ? 'Editar treino' : 'Novo treino'} onClose=${close} footer=${html`
      ${workout && html`<button class="btn danger" onClick=${remove}><${Icon} name="trash" />Excluir</button>`}
      <button class="btn primary grow" onClick=${save}>Salvar</button>
    `}>
      ${draft && html`<div class="row-sb small"><span class="muted">Rascunho não salvo recuperado.</span><button class="link-btn" onClick=${cancel}>Descartar</button></div>`}
      ${active && html`<div class="callout small" style="border-left-color:var(--accent)">Este treino está em andamento: ao salvar, as mudanças entram nele também (séries já feitas são mantidas).</div>`}
      <${Field} label="Nome"><input class="input" value=${name} onInput=${(e) => setName(e.target.value)} placeholder="Ex.: Upper A, Peito/Tríceps" /><//>
      <div class="row-sb"><span class="eyebrow">${items.length} exercício${items.length === 1 ? '' : 's'}</span></div>
      ${!items.length && html`<p class="small muted">Nenhum exercício ainda. Toque em “Adicionar exercício”.</p>`}
      <div class="stack-sm">
        ${items.map((it, i) => html`
          <div class="card flat tight" key=${i + ':' + it.exId}>
            <div class="row-sb">
              <b class="small grow" style="min-width:0">${i + 1}. ${exerciseById(sAll, it.exId).name}</b>
              <div class="row" style="gap:4px">
                <button class="x-btn" onClick=${() => move(i, -1)} disabled=${i === 0} aria-label="Subir">↑</button>
                <button class="x-btn" onClick=${() => move(i, 1)} disabled=${i === items.length - 1} aria-label="Descer">↓</button>
                <button class="x-btn" onClick=${() => pickExercise((exId) => patch(i, 'exId', exId))} aria-label="Trocar exercício" title="Trocar exercício"><${Icon} name="swap" size="14" /></button>
                <button class="x-btn" onClick=${() => setItems((cur) => cur.filter((_, idx) => idx !== i))} aria-label="Remover">×</button>
              </div>
            </div>
            <div class="grid-3" style="margin-top:8px">
              <${Field} label="Séries"><${NumField} decimals=${false} value=${it.sets} onValue=${(v) => patch(i, 'sets', v || 1)} /><//>
              <${Field} label="Reps"><input class="input num" value=${it.reps} onInput=${(e) => patch(i, 'reps', e.target.value)} placeholder="8-12" /><//>
              <${Field} label="Descanso"><${NumField} decimals=${false} value=${it.rest ?? 90} onValue=${(v) => patch(i, 'rest', v || 0)} /><//>
            </div>
          </div>
        `)}
      </div>
      <button class="btn" onClick=${() => pickExercise((exId) => setItems((cur) => [...cur, { exId, sets: 3, reps: '8-12', rest: 90 }]))}>
        <${Icon} name="plus" />Adicionar exercício
      </button>
    <//>
  `;
}

// --- Seletor de exercícios -------------------------------------------------------

export function pickExercise(onPick) {
  openModal((close) => html`<${ExercisePicker} close=${close} onPick=${(id) => { onPick(id); close(); }} />`);
}

function ExercisePicker({ close, onPick }) {
  const s = getState();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState(null);
  const [creating, setCreating] = useState(false);
  const [nw, setNw] = useState({ name: '', primary: 'peito' });
  const list = allExercises(s).filter((e) => (!group || e.primary === group) && (!q || normalize(e.name).includes(normalize(q))));

  const create = () => {
    if (!nw.name.trim()) return;
    const id = `custom-${uid()}`;
    update((st) => st.customExercises.push({ id, name: nw.name.trim(), primary: nw.primary, secondary: [], custom: true }));
    onPick(id);
  };

  return html`
    <${Sheet} title="Exercícios" onClose=${close} full sub=${html`
      <input class="input" type="search" enterkeyhint="search" placeholder="Buscar exercício…" value=${q} onInput=${(e) => setQ(e.target.value)} />
      <div class="chips" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px">
        <button class=${`chip ${!group ? 'on' : ''}`} onClick=${() => setGroup(null)}>Todos</button>
        ${Object.entries(MUSCLES).map(([k, l]) => html`<button class=${`chip ${group === k ? 'on' : ''}`} style="white-space:nowrap" onClick=${() => setGroup(k)}>${l}</button>`)}
      </div>
    `}>
      <div class="list">
        ${list.map((e) => html`
          <button class="li btnlike" key=${e.id} onClick=${() => onPick(e.id)}>
            <div class="grow"><div class="t">${e.name}</div><div class="s">${MUSCLES[e.primary]}${e.secondary.length ? ' · ' + e.secondary.map((m) => MUSCLES[m]).join(', ') : ''}</div></div>
            <${Icon} name="plus" />
          </button>
        `)}
        ${!list.length && html`<div class="li muted small">Nada encontrado.</div>`}
      </div>
      ${creating
        ? html`
          <div class="card flat stack-sm">
            <${Field} label="Nome do exercício"><input class="input" value=${nw.name} onInput=${(e) => setNw({ ...nw, name: e.target.value })} /><//>
            <${Field} label="Grupo principal">
              <select class="input" value=${nw.primary} onChange=${(e) => setNw({ ...nw, primary: e.target.value })}>
                ${Object.entries(MUSCLES).map(([k, l]) => html`<option value=${k}>${l}</option>`)}
              </select>
            <//>
            <button class="btn primary" onClick=${create}>Criar e adicionar</button>
          </div>`
        : html`<button class="btn" onClick=${() => { setCreating(true); setNw({ ...nw, name: q }); }}><${Icon} name="plus" />Criar exercício personalizado</button>`}
    <//>
  `;
}

// --- Sessão ativa -----------------------------------------------------------------

// Descanso: guardado no aparelho para sobreviver a recarregar/fechar o app.
const REST_KEY = 'fitquest.restEnd';
let restEnd = Number(localStorage.getItem(REST_KEY)) || 0;
const restListeners = new Set();
function startRest(sec) {
  restEnd = sec > 0 ? Date.now() + sec * 1000 : 0;
  try { localStorage.setItem(REST_KEY, String(restEnd)); } catch { /* ignore */ }
  restListeners.forEach((f) => f(restEnd));
}

// segundos restantes calculados na hora do toque (toques rápidos seguidos não se perdem)
const restLeft = () => Math.max(0, Math.ceil((restEnd - Date.now()) / 1000));

const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

// Barra fixa no topo: tempo de treino + descanso sempre à vista.
function SessionBar({ ses, st, onFinish }) {
  const [end, setEnd] = useState(restEnd);
  const now = useNow(250);
  useEffect(() => {
    restListeners.add(setEnd);
    return () => restListeners.delete(setEnd);
  }, []);
  const left = end ? Math.max(0, Math.ceil((end - now) / 1000)) : 0;
  useEffect(() => {
    if (end && left === 0) {
      alarm();
      startRest(0);
    }
  }, [left === 0]);
  const elapsed = Math.max(0, Math.floor((now - ses.startedAt) / 1000));
  const resting = left > 0;
  return html`
    <div class=${`session-bar ${resting ? 'resting' : ''}`} role="timer">
      <div class="sb-block">
        <span class="sb-l">${resting ? 'Descanso' : 'Treino'}</span>
        <span class="sb-v">${resting ? mmss(left) : mmss(elapsed)}</span>
      </div>
      ${resting
        ? html`
          <div class="sb-actions">
            <button onClick=${() => { prime(); startRest(Math.max(1, restLeft() - 15)); }}>−15</button>
            <button onClick=${() => { prime(); startRest(restLeft() + 15); }}>+15</button>
            <button onClick=${() => startRest(0)}>Pular</button>
          </div>`
        : html`
          <div class="sb-meta mono">${st.sets} séries · ${num(st.volume)} kg</div>
          <button class="sb-finish" onClick=${onFinish}><${Icon} name="check" size="16" />Finalizar</button>`}
    </div>
  `;
}

function patchSession(id, fn) {
  update((s) => {
    const ses = s.sessions.find((x) => x.id === id);
    if (ses) fn(ses, s);
  });
}

const newSet = (extra = {}) => ({ kg: null, reps: null, rpe: null, pct: null, done: false, kind: 'work', ...extra });

function SessionView({ s, ses }) {
  const editing = !!ses.finishedAt;
  // tela ligada durante o treino: sem isso o iPhone congela o app e o alarme não toca
  useEffect(() => {
    if (editing) return undefined;
    keepAwake(true);
    return () => keepAwake(false);
  }, [editing]);
  const st = sessionStats(s, ses);

  const finish = async () => {
    const pending = ses.exercises.some((e) => e.sets.some((x) => !x.done && (x.kg || x.reps)));
    if (!st.sets) return toast('Marque ao menos uma série como feita ✓');
    if (pending && !(await confirmDialog('Há séries preenchidas e não marcadas. Finalizar mesmo assim?', { ok: 'Finalizar', danger: false }))) return;
    startRest(0);
    patchSession(ses.id, (x, root) => {
      x.finishedAt = Date.now();
      x.exercises.forEach((e) => (e.sets = e.sets.filter((y) => y.done)));
      x.exercises = x.exercises.filter((e) => e.sets.length);
      root.activeSessionId = null;
    });
    const after = getState();
    const prs = computePRs(after).filter((p) => p.sessionId === ses.id);
    openModal((close) => html`<${SessionSummary} s=${after} ses=${after.sessions.find((x) => x.id === ses.id)} prs=${prs} close=${() => { close(); go('treino'); }} />`);
  };

  const discard = async () => {
    if (editing) {
      if (await deleteSession(ses.id)) go('treino');
      return;
    }
    if (!(await confirmDialog('Descartar este treino?', { ok: 'Descartar' }))) return;
    startRest(0);
    update((root) => {
      root.sessions = root.sessions.filter((x) => x.id !== ses.id);
      if (root.activeSessionId === ses.id) root.activeSessionId = null;
    });
    go('treino');
  };

  return html`
    <div class="stack">
      ${!editing && html`<${SessionBar} ses=${ses} st=${st} onFinish=${finish} />`}
      <div class="page-head">
        <div class="grow">
          <div class="row-sb">
            <button class="link-btn small" onClick=${() => go('treino')}>← Treino</button>
            ${!editing && ses.workoutId && s.workouts.some((w) => w.id === ses.workoutId) && html`<button class="link-btn small" onClick=${() => editWorkout(s, s.workouts.find((w) => w.id === ses.workoutId))}>✎ Editar rotina</button>`}
          </div>
          <input class="input title-input" value=${ses.name} onInput=${(e) => patchSession(ses.id, (x) => (x.name = e.target.value))} aria-label="Nome do treino" />
          ${editing && html`<div class="row small mono muted"><span>${fmtDate(ses.date, { year: true })} · ${st.sets} séries · ${num(st.volume)} kg</span></div>`}
        </div>
      </div>

      ${editing && html`
        <${Field} label="Data">
          <input class="input" type="date" value=${ses.date} onChange=${(e) => e.target.value && patchSession(ses.id, (x) => (x.date = e.target.value))} />
        <//>
      `}

      ${ses.exercises.map((ex, i) => html`<${ExerciseLog} key=${ex.exId + i} s=${s} ses=${ses} ex=${ex} idx=${i} />`)}

      <button class="btn" onClick=${() => pickExercise((exId) => patchSession(ses.id, (x) => x.exercises.push({ exId, target: '8-12', rest: 90, sets: [0, 1, 2].map(() => newSet()) })))}>
        <${Icon} name="plus" />Adicionar exercício
      </button>

      <${Field} label="Observações do treino">
        <textarea class="input" rows="2" placeholder="Como foi o treino? Energia, sono, dores…" value=${ses.note ?? ''} onInput=${(e) => patchSession(ses.id, (x) => (x.note = e.target.value))}></textarea>
      <//>

      <div class="row">
        <button class="btn" onClick=${discard}>${editing ? 'Excluir' : 'Descartar'}</button>
        ${editing
          ? html`<button class="btn primary grow" onClick=${() => go('treino')}>Pronto</button>`
          : html`<button class="btn primary grow" onClick=${finish}><${Icon} name="check" />Finalizar treino</button>`}
      </div>
    </div>
  `;
}

function targetLabel(ex) {
  const t = [];
  if (ex.target) t.push(`${ex.target} reps`);
  if (ex.targetRpe) t.push(`RPE ${ex.targetRpe}`);
  if (ex.targetPct) t.push(`${ex.targetPct}%`);
  if (ex.targetKg) t.push(`${num(ex.targetKg, 1)} kg`);
  return t.join(' · ');
}

function ExerciseLog({ s, ses, ex, idx }) {
  const def = exerciseById(s, ex.exId);
  const last = useMemo(() => lastPerformance(s, ex.exId, ses.id), [s.sessions, ex.exId]);
  const lastNote = useMemo(() => {
    const prev = finishedSessions(s).filter((x) => x.id !== ses.id).reverse();
    for (const p of prev) {
      const e = p.exercises.find((y) => y.exId === ex.exId && y.note);
      if (e) return e.note;
    }
    return null;
  }, [s.sessions, ex.exId]);
  const best = useMemo(() => bestE1rm(s, ex.exId), [s.sessions, ex.exId]);
  const ref = oneRmRef(s, ex.exId);
  const sug = suggestNext(last, ex.target);
  const mode = intensityFor(s, ex.exId);
  const [showNote, setShowNote] = useState(!!ex.note);
  const prevBest = useMemo(() => {
    // melhor 1RM antes desta sessão (para marcar PR ao vivo)
    const h = exerciseHistory(s, ex.exId).filter((x) => x.sessionId !== ses.id && x.date <= ses.date);
    return h.length ? Math.max(...h.map((x) => x.e1rm)) : null;
  }, [s.sessions, ex.exId]);

  const patchEx = (fn) => patchSession(ses.id, (x) => fn(x.exercises[idx]));

  // Edita um campo e copia o valor para as séries de baixo ainda não feitas
  // (que estejam vazias ou também auto-preenchidas). Valor digitado à mão não é sobrescrito.
  const patchSet = (j, k, v) => patchEx((e) => {
    const apply = (set, auto) => {
      const kgManual = set.kg != null && set.auto?.kg === false;
      set[k] = v;
      set.auto = { ...(set.auto || {}), [k]: auto };
      if (k === 'pct' && v && ref && (!auto || !kgManual)) {
        set.kg = loadForPct(v, ref);
        set.auto.kg = auto;
      }
    };
    apply(e.sets[j], false);
    const warm = isWarmup(e.sets[j]);
    for (let i = j + 1; i < e.sets.length; i++) {
      const t = e.sets[i];
      if (t.done || isWarmup(t) !== warm) continue;
      if (t[k] == null || t.auto?.[k]) apply(t, true);
    }
  });

  const toggleDone = (j) => {
    const set = ex.sets[j];
    const workIdx = ex.sets.slice(0, j).filter((x) => !isWarmup(x)).length;
    const prev = isWarmup(set) ? null : last?.sets[workIdx] ?? last?.sets[last.sets.length - 1];
    patchEx((e) => {
      const st = e.sets[j];
      if (!st.done) {
        if (st.kg == null && prev) st.kg = Number(prev.kg);
        if (st.reps == null && prev) st.reps = Number(prev.reps);
        if (st.kg == null && sug && !isWarmup(st)) st.kg = sug.kg;
        st.auto = {};
      }
      st.done = !st.done;
    });
    if (!set.done && !ses.finishedAt) {
      prime(); // libera o áudio no próprio toque (exigência do iPhone)
      startRest(isWarmup(set) ? Math.min(60, ex.rest ?? 90) : ex.rest ?? 90);
    }
  };

  let workN = 0;
  return html`
    <div class="ex-card">
      <div class="ex-head">
        <div class="grow">
          <h3>${def.name}</h3>
          <div class="row wrap" style="gap:6px;margin-top:6px">
            <span class="tag fill">${MUSCLES[def.primary]}</span>
            <button class="tag tag-btn" onClick=${() => openTargetEditor(s, ses, idx)} title="Editar meta">${targetLabel(ex) ? `Meta ${targetLabel(ex)}` : '+ Meta'} ✎</button>
            ${ref > 0 && html`<span class="tag">1RM ${num(ref, 1)}${s.exerciseSettings?.[ex.exId]?.oneRm ? '' : ' est.'}</span>`}
          </div>
        </div>
        <button class="x-btn" aria-label="Opções" onClick=${() => exerciseMenu(s, ses, idx, def)}>⋯</button>
      </div>
      ${(last || lastNote) && html`
        <div class="ex-prev">
          ${last && html`<b class="mono">ÚLTIMA ${fmtDate(last.date)}:</b>
          <span class="mono">${last.sets.map((x) => `${num(x.kg, 1)}×${x.reps}${x.rpe ? '@' + x.rpe : ''}`).join('  ')}</span>`}
          ${sug && html`<span style="flex-basis:100%;font-weight:700">→ ${sug.text}</span>`}
          ${lastNote && html`<span style="flex-basis:100%" class="muted">Obs. anterior: ${lastNote}</span>`}
        </div>
      `}
      <table class="sets">
        <thead><tr>
          <th>Série</th><th>Kg</th><th>Reps</th>
          ${mode === 'rpe' && html`<th>RPE</th>`}
          ${mode === 'pct' && html`<th>%RM</th>`}
          <th></th>
        </tr></thead>
        <tbody>
          ${ex.sets.map((st, j) => {
            const kind = setKind(st);
            const warm = kind === 'warmup';
            if (!warm) workN++;
            const prev = warm ? null : last?.sets[workN - 1];
            const isPr = st.done && !warm && prevBest != null && setE1rm(st) > prevBest;
            const pctShown = st.kg && ref ? pctOf1rm(st.kg, ref) : null;
            const a = st.auto || {};
            return html`
              <tr class=${`${st.done ? 'done' : ''} ${warm ? 'warm' : ''} kind-${kind}`} key=${j}>
                <td>
                  <button class="set-num" title="Tipo de série" onClick=${() => openSetKind(ses, idx, j, st)}>
                    ${SET_KINDS[kind].short || workN}
                    ${kind !== 'work' && kind !== 'warmup' && html`<small>${workN}</small>`}
                  </button>
                  ${isPr && html`<div class="pr-flag">PR</div>`}
                </td>
                <td><${NumField} class=${`input ${a.kg ? 'auto' : ''}`} placeholder=${prev ? num(prev.kg, 1) : (!warm && sug?.kg) || '—'} value=${st.kg} onValue=${(v) => patchSet(j, 'kg', v)} aria-label="Carga" /></td>
                <td><${NumField} class=${`input ${a.reps ? 'auto' : ''}`} decimals=${false} placeholder=${prev?.reps ?? '—'} value=${st.reps} onValue=${(v) => patchSet(j, 'reps', v)} aria-label="Repetições" /></td>
                ${mode === 'rpe' && html`<td><${NumField} class=${`input ${a.rpe ? 'auto' : ''}`} placeholder=${ex.targetRpe ?? '—'} value=${st.rpe} onValue=${(v) => patchSet(j, 'rpe', v)} aria-label="RPE" /></td>`}
                ${mode === 'pct' && html`<td><${NumField} class=${`input ${a.pct ? 'auto' : ''}`} decimals=${false} placeholder=${pctShown ?? ex.targetPct ?? '—'} value=${st.pct} onValue=${(v) => patchSet(j, 'pct', v)} aria-label="% de 1RM" /></td>`}
                <td><button class=${`set-check ${st.done ? 'on' : ''}`} onClick=${() => toggleDone(j)} aria-label="Série feita"><${Icon} name="check" /></button></td>
              </tr>
            `;
          })}
        </tbody>
      </table>
      ${mode === 'pct' && !ref && html`<div class="ex-prev muted">Defina o 1RM em ⋯ → 1RM de referência para calcular a carga pela %.</div>`}
      ${showNote && html`
        <div style="padding:8px 12px;border-top:var(--bw) solid var(--line)">
          <textarea class="input" rows="2" placeholder="Observação deste exercício (ajuste do banco, pegada, dor…)" value=${ex.note ?? ''} onInput=${(e) => patchEx((y) => (y.note = e.target.value))}></textarea>
        </div>
      `}
      <div class="ex-foot">
        <button class="btn xs" onClick=${() => patchEx((e) => {
          const l = [...e.sets].reverse().find((y) => !isWarmup(y)) ?? e.sets[e.sets.length - 1];
          e.sets.push(newSet({ kg: l?.kg ?? null, reps: l?.reps ?? null, rpe: l?.rpe ?? null, pct: l?.pct ?? null, auto: { kg: true, reps: true, rpe: true, pct: true } }));
        })}><${Icon} name="plus" size="14" />Série</button>
        <button class="btn xs" onClick=${() => patchEx((e) => {
          const at = e.sets.findIndex((y) => !isWarmup(y));
          e.sets.splice(at < 0 ? e.sets.length : at, 0, newSet({ kind: 'warmup' }));
        })}>+ Aquec.</button>
        ${ex.sets.length > 1 && html`<button class="btn xs ghost" onClick=${() => patchEx((e) => e.sets.pop())}>− Série</button>`}
        <button class=${`btn xs ${showNote ? 'dark' : 'ghost'}`} onClick=${() => setShowNote(!showNote)}>Obs</button>
        <span class="grow"></span>
        <button class="link-btn mono tiny" style="align-self:center" onClick=${() => openTargetEditor(s, ses, idx)}>Desc. ${ex.rest ?? 90}s</button>
      </div>
    </div>
  `;
}

function openSetKind(ses, idx, j, st) {
  openModal((close) => html`
    <${Sheet} title=${`Série ${j + 1} · tipo`} onClose=${close}>
      <div class="list">
        ${Object.entries(SET_KINDS).map(([k, v]) => html`
          <button class=${`li btnlike ${setKind(st) === k ? 'done' : ''}`} onClick=${() => {
            patchSession(ses.id, (x) => {
              const set = x.exercises[idx].sets[j];
              set.kind = k;
              delete set.warmup;
            });
            close();
          }}>
            <span class="set-num static">${v.short || '1'}</span>
            <div class="grow"><div class="t">${v.label}</div><div class="s">${v.hint}</div></div>
            ${setKind(st) === k && html`<${Icon} name="check" />`}
          </button>
        `)}
        <button class="li btnlike" onClick=${() => { patchSession(ses.id, (x) => x.exercises[idx].sets.splice(j, 1)); close(); }}>
          <${Icon} name="trash" /><span class="t danger">Remover esta série</span>
        </button>
      </div>
    <//>
  `);
}

function openTargetEditor(s, ses, idx) {
  openModal((close) => html`<${TargetEditor} s=${s} ses=${ses} idx=${idx} close=${close} />`);
}

function TargetEditor({ s, ses, idx, close }) {
  const ex = ses.exercises[idx];
  const [f, setF] = useState({ target: ex.target ?? '', targetRpe: ex.targetRpe ?? null, targetPct: ex.targetPct ?? null, targetKg: ex.targetKg ?? null, rest: ex.rest ?? 90 });
  const inRoutine = ses.workoutId && s.workouts.find((w) => w.id === ses.workoutId)?.exercises.some((e) => e.exId === ex.exId);
  const [saveRoutine, setSaveRoutine] = useState(!!inRoutine);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const save = () => {
    patchSession(ses.id, (x) => Object.assign(x.exercises[idx], f));
    if (saveRoutine && inRoutine) {
      update((st) => {
        const w = st.workouts.find((y) => y.id === ses.workoutId);
        const e = w?.exercises.find((y) => y.exId === ex.exId);
        if (e) Object.assign(e, { reps: f.target, targetRpe: f.targetRpe, targetPct: f.targetPct, targetKg: f.targetKg, rest: f.rest });
      });
    }
    close();
  };
  return html`
    <${Sheet} title="Meta do exercício" onClose=${close} footer=${html`<button class="btn primary block" onClick=${save}>Salvar</button>`}>
      <div class="grid-2">
        <${Field} label="Repetições" hint="Ex.: 8-12, 5, 3-5"><input class="input num" value=${f.target} onInput=${(e) => set('target')(e.target.value)} placeholder="8-12" /><//>
        <${Field} label="Descanso"><${NumInput} value=${f.rest} onInput=${set('rest')} unit="s" step="5" /><//>
        <${Field} label="RPE alvo"><${NumInput} value=${f.targetRpe} onInput=${set('targetRpe')} step="0.5" placeholder="ex.: 8" /><//>
        <${Field} label="% do 1RM alvo"><${NumInput} value=${f.targetPct} onInput=${set('targetPct')} unit="%" step="1" placeholder="ex.: 75" /><//>
        <${Field} label="Carga alvo"><${NumInput} value=${f.targetKg} onInput=${set('targetKg')} unit="kg" step="0.5" /><//>
      </div>
      ${inRoutine && html`<${Check} checked=${saveRoutine} onChange=${setSaveRoutine}>Salvar também na rotina (próximos treinos)<//>`}
    <//>
  `;
}

function exerciseMenu(s, ses, idx, def) {
  const exId = ses.exercises[idx].exId;
  openModal((close) => html`
    <${Sheet} title=${def.name} onClose=${close}>
      <${IntensityConfig} exId=${exId} />
      <div class="list">
        <button class="li btnlike" onClick=${() => { close(); openTargetEditor(s, ses, idx); }}><${Icon} name="target" /><span class="t">Meta e descanso…</span></button>
        <button class="li btnlike" onClick=${() => { close(); pickExercise((id) => patchSession(ses.id, (x) => (x.exercises[idx].exId = id))); }}><${Icon} name="swap" /><span class="t">Trocar exercício</span></button>
        <button class="li btnlike" onClick=${() => { patchSession(ses.id, (x) => idx > 0 && x.exercises.splice(idx - 1, 0, x.exercises.splice(idx, 1)[0])); close(); }}><span class="t">↑ Mover para cima</span></button>
        <button class="li btnlike" onClick=${() => { patchSession(ses.id, (x) => idx < x.exercises.length - 1 && x.exercises.splice(idx + 1, 0, x.exercises.splice(idx, 1)[0])); close(); }}><span class="t">↓ Mover para baixo</span></button>
        <button class="li btnlike" onClick=${() => { patchSession(ses.id, (x) => x.exercises.splice(idx, 1)); close(); }}><${Icon} name="trash" /><span class="t danger">Remover do treino</span></button>
      </div>
    <//>
  `);
}

// Por exercício: coluna RPE ou %RM e o 1RM usado como referência.
function IntensityConfig({ exId }) {
  const cur = useStore();
  const cfg = cur.exerciseSettings?.[exId] ?? {};
  const mode = intensityFor(cur, exId);
  const est = bestE1rm(cur, exId);
  const setCfg = (patch) => update((st) => {
    st.exerciseSettings ??= {};
    st.exerciseSettings[exId] = { ...(st.exerciseSettings[exId] ?? {}), ...patch };
  });
  return html`
    <div class="card flat stack-sm">
      <${Field} label="Coluna de intensidade neste exercício">
        <${Seg} value=${mode} onChange=${(v) => setCfg({ intensity: v })} options=${[['rpe', 'RPE'], ['pct', '%RM'], ['none', 'Nenhuma']]} />
      <//>
      <${Field} label="1RM de referência" hint=${est ? `Estimado pelo histórico: ${num(est, 1)} kg. Deixe vazio para usar o estimado.` : 'Informe seu 1RM testado (ou use a calculadora na aba RM).'}>
        <${NumInput} value=${cfg.oneRm ?? null} onInput=${(v) => setCfg({ oneRm: v })} unit="kg" step="0.5" placeholder=${est ? num(est, 1) : '—'} />
      <//>
    </div>
  `;
}

function SessionSummary({ s, ses, prs, close }) {
  const st = sessionStats(s, ses);
  return html`
    <${Sheet} title="Treino concluído" onClose=${close} footer=${html`<button class="btn primary block" onClick=${close}>Fechar</button>`}>
      <div class="card accent center">
        <div class="eyebrow">Recompensa</div>
        <div class="big-num" style="margin:6px 0">+${100 + prs.length * 25} XP</div>
        <div class="small">Treino +100${prs.length ? ` · ${prs.length} PR × 25` : ''}</div>
      </div>
      <div class="grid-3">
        <${Stat} v=${st.sets} l="Séries" />
        <${Stat} v=${num(st.volume)} unit="kg" l="Volume" />
        <${Stat} v=${st.minutes ?? '—'} unit="min" l="Duração" />
      </div>
      ${prs.length > 0 && html`
        <div class="stack-sm">
          <h3 class="up">Recordes pessoais</h3>
          <div class="list">
            ${prs.map((p) => html`<div class="li"><span class="pr-flag">PR</span><span class="t grow">${exerciseById(s, p.exId).name}</span><span class="mono small">${num(p.prev, 1)} → <b>${num(p.e1rm, 1)}</b> kg</span></div>`)}
          </div>
        </div>
      `}
    <//>
  `;
}

// --- Histórico ------------------------------------------------------------------------

function HistoryTab({ s }) {
  const list = finishedSessions(s).filter((x) => !isCardio(x)).reverse();
  const prs = computePRs(s);
  if (!list.length) return html`<${Empty} title="Nenhum treino ainda" text="Seus treinos concluídos aparecem aqui, com volume e recordes." />`;
  return html`
    <div class="list">
      ${list.map((ses) => {
        const st = sessionStats(s, ses);
        const n = prs.filter((p) => p.sessionId === ses.id).length;
        return html`
          <div class="li" key=${ses.id}>
            <button class="row grow" style="background:none;border:0;padding:0;text-align:left;min-width:0" onClick=${() => go(`treino/sessao/${ses.id}`)}>
            <div style="width:44px" class="center"><div class="eyebrow">${weekdayShort(ses.date)}</div><div class="mono" style="font-weight:700;font-size:18px">${ses.date.slice(8)}</div></div>
            <div class="grow">
              <div class="row"><span class="t">${ses.name}</span>${n > 0 && html`<span class="pr-flag">${n} PR</span>`}</div>
              <div class="s">${fmtDate(ses.date, { year: true })} · ${st.sets} séries · ${num(st.volume)} kg${st.minutes ? ` · ${st.minutes} min` : ''}</div>
            </div>
            </button>
            <button class="icon-btn" aria-label="Excluir treino" onClick=${() => deleteSession(ses.id)}><${Icon} name="trash" /></button>
          </div>
        `;
      })}
    </div>
  `;
}

// --- Progresso -------------------------------------------------------------------------

function ProgressTab({ s }) {
  const done = new Set(finishedSessions(s).flatMap((x) => x.exercises.map((e) => e.exId)));
  const options = allExercises(s).filter((e) => done.has(e.id));
  const [exId, setExId] = useState(options[0]?.id ?? null);
  const [metric, setMetric] = useState('e1rm');
  if (!options.length) return html`<${Empty} title="Sem dados ainda" text="Complete treinos para acompanhar a evolução de carga, 1RM estimado e volume por exercício." />`;
  const cur = options.find((o) => o.id === exId) ? exId : options[0].id;
  const h = exerciseHistory(s, cur);
  const prs = computePRs(s).filter((p) => p.exId === cur);
  const first = h[0];
  const lastH = h[h.length - 1];
  const points = h.map((x) => ({ date: x.date, y: x[metric] }));
  const unit = ' kg';
  return html`
    <div class="stack">
      <select class="input" value=${cur} onChange=${(e) => setExId(e.target.value)}>
        ${options.map((o) => html`<option value=${o.id}>${o.name}</option>`)}
      </select>
      <${Seg} value=${metric} onChange=${setMetric} options=${[['e1rm', '1RM est.'], ['topKg', 'Carga máx'], ['volume', 'Volume']]} />
      <div class="card"><${LineChart} points=${points} unit=${unit} decimals=${metric === 'volume' ? 0 : 1} /></div>
      <div class="grid-3">
        <${Stat} v=${num(lastH.e1rm, 1)} unit="kg" l="1RM atual" />
        <${Stat} v=${`${lastH.e1rm >= first.e1rm ? '+' : ''}${num(lastH.e1rm - first.e1rm, 1)}`} unit="kg" l="Desde o início" />
        <${Stat} v=${prs.length} l="PRs" />
      </div>
      <h3 class="up">Sessões</h3>
      <div class="list">
        ${h.slice().reverse().slice(0, 15).map((x) => html`
          <div class="li">
            <span class="mono small" style="width:56px">${fmtDate(x.date)}</span>
            <span class="mono small grow">${x.sets.map((st) => `${num(st.kg, 1)}×${st.reps}${st.rpe ? '@' + st.rpe : ''}`).join('  ')}</span>
            <b class="mono small">${num(x.e1rm, 1)}</b>
          </div>
        `)}
      </div>
      <p class="tiny muted">1RM estimado pela fórmula de Epley; com RPE, as repetições em reserva (10 − RPE) entram no cálculo.</p>
    </div>
  `;
}

// --- Volume semanal -----------------------------------------------------------------------

function VolumeTab({ s, today }) {
  const [offset, setOffset] = useState(0);
  const ws = addDays(weekStart(today), offset * 7);
  const sets = weeklySets(s, ws);
  const max = Math.max(WEEKLY_SET_TARGET.max + 4, ...Object.values(sets));
  const { min: lo, max: hi } = WEEKLY_SET_TARGET;
  const total = Object.values(sets).reduce((a, b) => a + b, 0);
  return html`
    <div class="stack">
      <div class="date-nav">
        <button onClick=${() => setOffset(offset - 1)} aria-label="Semana anterior">‹</button>
        <div class="lbl">${offset === 0 ? 'Esta semana' : `${fmtDate(ws)} – ${fmtDate(addDays(ws, 6))}`}</div>
        <button onClick=${() => setOffset(Math.min(0, offset + 1))} disabled=${offset === 0} aria-label="Próxima semana">›</button>
      </div>
      <div class="card stack-sm">
        <div class="row-sb"><h3 class="up">Séries por grupo</h3><span class="mono small">${num(total, 1)} total</span></div>
        <p class="tiny muted">Faixa destacada = ${lo}–${hi} séries/semana (referência para hipertrofia). Exercício secundário conta meia série.</p>
        ${Object.entries(MUSCLES).map(([k, l]) => html`
          <div class="muscle-row">
            <span>${l}</span>
            <div class="bar">
              <span class="zone" style=${`left:${(lo / max) * 100}%;width:${((hi - lo) / max) * 100}%`}></span>
              <i style=${`width:${Math.min(100, (sets[k] / max) * 100)}%;background:${sets[k] >= lo ? 'var(--ink)' : 'var(--ink-2)'}`}></i>
            </div>
            <span class="mono small right"><b>${num(sets[k], sets[k] % 1 ? 1 : 0)}</b></span>
          </div>
        `)}
      </div>
    </div>
  `;
}

// --- RM: calculadora e 1RM de referência ----------------------------------------------------

function RmTab({ s }) {
  const [kg, setKg] = useState(100);
  const [reps, setReps] = useState(5);
  const [rpe, setRpe] = useState(null);
  const est = oneRmEstimates(kg || 0, reps || 0, rpe);
  const base = est.avg;
  const pcts = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
  const configured = Object.entries(s.exerciseSettings ?? {}).filter(([, c]) => c.oneRm || c.intensity === 'pct').map(([id]) => id);
  const lifts = [...new Set([...MAIN_LIFTS, ...configured])];
  const setCfg = (exId, patch) => update((st) => {
    st.exerciseSettings ??= {};
    st.exerciseSettings[exId] = { ...(st.exerciseSettings[exId] ?? {}), ...patch };
  });
  return html`
    <div class="stack">
      <div class="card stack-sm">
        <h3 class="up">Calculadora de 1RM</h3>
        <div class="grid-3">
          <${Field} label="Carga"><${NumInput} value=${kg} onInput=${setKg} unit="kg" step="0.5" /><//>
          <${Field} label="Reps"><${NumInput} value=${reps} onInput=${setReps} step="1" /><//>
          <${Field} label="RPE (opc.)"><${NumInput} value=${rpe} onInput=${setRpe} step="0.5" placeholder="—" /><//>
        </div>
        <div class="card ink tight">
          <div class="row-sb"><span class="eyebrow">1RM estimado (média)</span><span class="big-num" style="font-size:34px">${num(base, 1)}<small style="font-size:14px"> kg</small></span></div>
          <div class="mono tiny" style="margin-top:6px;opacity:.8">Epley ${num(est.epley, 1)} · Brzycki ${num(est.brzycki, 1)} · Lombardi ${num(est.lombardi, 1)}</div>
        </div>
        ${base > 0 && html`
          <table class="rm-table">
            <thead><tr><th>%</th><th>Carga</th><th>Reps aprox.</th></tr></thead>
            <tbody>
              ${pcts.map((p) => html`<tr><td>${p}%</td><td><b>${num(loadForPct(p, base), 1)} kg</b></td><td>${repsAtPct(p)}</td></tr>`)}
            </tbody>
          </table>
        `}
        <p class="tiny muted">Estimativas valem melhor até ~10 reps. Com RPE, as repetições em reserva entram no cálculo.</p>
      </div>

      <div class="section-head"><h3 class="up">Meus 1RM</h3><button class="btn xs dark" onClick=${() => pickExercise((id) => setCfg(id, { intensity: 'pct' }))}><${Icon} name="plus" size="14" />Exercício</button></div>
      <p class="small muted">Escolha usar <b>%RM</b> no lugar de RPE nos exercícios principais. Na sessão, digite a % e a carga é calculada pelo 1RM de referência.</p>
      <div class="list">
        ${lifts.map((id) => {
          const cfg = s.exerciseSettings?.[id] ?? {};
          const e = bestE1rm(s, id);
          return html`
            <div class="li" key=${id} style="flex-wrap:wrap">
              <div class="grow" style="min-width:150px">
                <div class="t">${exerciseById(s, id).name}</div>
                <div class="s mono">${e ? `Estimado: ${num(e, 1)} kg` : 'Sem histórico'}</div>
              </div>
              <div style="width:110px"><${NumInput} value=${cfg.oneRm ?? null} onInput=${(v) => setCfg(id, { oneRm: v })} unit="kg" step="0.5" placeholder=${e ? num(e, 1) : '1RM'} /></div>
              <div style="flex-basis:100%"><${Seg} value=${intensityFor(s, id)} onChange=${(v) => setCfg(id, { intensity: v })} options=${[['rpe', 'RPE'], ['pct', '%RM'], ['none', 'Nenhuma']]} /></div>
            </div>
          `;
        })}
      </div>
    </div>
  `;
}
