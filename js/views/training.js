// TREINO: rotinas, sessão ativa, histórico e progresso.
import { html, useState, useEffect, useMemo } from '../lib.js';
import { update, getState, allExercises, exerciseById, finishedSessions } from '../store.js';
import { MUSCLES, SPLIT_TEMPLATES, WEEKLY_SET_TARGET } from '../data/exercises.js';
import { exerciseHistory, lastPerformance, bestE1rm, computePRs, sessionStats, weeklySets, suggestNext, setE1rm, isWorking } from '../training.js';
import { pctOf1rm, loadForPct } from '../calc.js';
import { Icon, openModal, Sheet, Field, Seg, toast, confirmDialog, Empty, Stat, useNow } from '../ui.js';
import { LineChart } from '../charts.js';
import { startSession, nextWorkout, deleteSession, deleteWorkout } from '../actions.js';
import { ACTIVITIES, isCardio, sessionType } from '../cardio.js';
import { CardioHome, CardioLive } from './cardio.js';
import { go } from '../nav.js';
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
            ${[['rotina', 'Rotina'], ['historico', 'Histórico'], ['progresso', 'Progresso'], ['volume', 'Volume']].map(([k, l]) => html`
              <button class=${tab === k ? 'on' : ''} onClick=${() => setTab(k)}>${l}</button>
            `)}
          </div>
          ${tab === 'rotina' && html`<${RoutineTab} s=${s} today=${today} />`}
          ${tab === 'historico' && html`<${HistoryTab} s=${s} />`}
          ${tab === 'progresso' && html`<${ProgressTab} s=${s} />`}
          ${tab === 'volume' && html`<${VolumeTab} s=${s} today=${today} />`}
        `
        : html`<${CardioHome} key=${cat} s=${s} type=${cat} today=${today} />`}
    </div>
  `;
}

// --- Rotina -------------------------------------------------------------------

function RoutineTab({ s, today }) {
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
        ${workouts.map((w) => html`
          <div class="li" key=${w.id}>
            <div class="grow">
              <div class="row"><span class="t">${w.name}</span>${nw?.id === w.id && html`<span class="tag acc">Próximo</span>`}</div>
              <div class="s">${w.exercises.length} exercícios · ${w.exercises.reduce((a, e) => a + (e.sets || 0), 0)} séries · ${[...new Set(w.exercises.map((e) => MUSCLES[exerciseById(s, e.exId).primary]))].slice(0, 4).join(', ')}</div>
            </div>
            <button class="icon-btn" onClick=${() => editWorkout(s, w)} aria-label="Editar"><${Icon} name="edit" /></button>
            <button class="icon-btn" onClick=${() => deleteWorkout(w)} aria-label="Excluir treino"><${Icon} name="trash" /></button>
            <button class="btn sm dark" onClick=${() => startSession(w, today)}><${Icon} name="play" /><span class="hide-xs">Iniciar</span></button>
          </div>
        `)}
      </div>
      <div class="row wrap">
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

function WorkoutEditor({ workout, close }) {
  const [name, setName] = useState(workout?.name ?? '');
  const [items, setItems] = useState(workout?.exercises ?? []);
  const sAll = getState();
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const a = [...items];
    [a[i], a[j]] = [a[j], a[i]];
    setItems(a);
  };
  const patch = (i, k, v) => setItems(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  const save = () => {
    if (!name.trim()) return toast('Dê um nome ao treino');
    update((s) => {
      const data = { name: name.trim(), exercises: items };
      if (workout) Object.assign(s.workouts.find((x) => x.id === workout.id), data);
      else s.workouts.push({ id: uid(), type: 'strength', ...data });
    });
    close();
  };
  const remove = async () => {
    if (await deleteWorkout(workout)) close();
  };
  return html`
    <${Sheet} title=${workout ? 'Editar treino' : 'Novo treino'} onClose=${close} footer=${html`
      ${workout && html`<button class="btn danger" onClick=${remove}><${Icon} name="trash" />Excluir</button>`}
      <button class="btn primary grow" onClick=${save}>Salvar</button>
    `}>
      <${Field} label="Nome"><input class="input" value=${name} onInput=${(e) => setName(e.target.value)} placeholder="Ex.: Upper A, Peito/Tríceps" /><//>
      <div class="stack-sm">
        ${items.map((it, i) => html`
          <div class="card flat tight" key=${it.exId + i}>
            <div class="row-sb">
              <b class="small">${exerciseById(sAll, it.exId).name}</b>
              <div class="row" style="gap:4px">
                <button class="x-btn" onClick=${() => move(i, -1)} aria-label="Subir">↑</button>
                <button class="x-btn" onClick=${() => move(i, 1)} aria-label="Descer">↓</button>
                <button class="x-btn" onClick=${() => setItems(items.filter((_, idx) => idx !== i))} aria-label="Remover">×</button>
              </div>
            </div>
            <div class="grid-3" style="margin-top:8px">
              <${Field} label="Séries"><input class="input num" type="number" inputmode="numeric" value=${it.sets} onInput=${(e) => patch(i, 'sets', Number(e.target.value) || 1)} /><//>
              <${Field} label="Reps"><input class="input num" value=${it.reps} onInput=${(e) => patch(i, 'reps', e.target.value)} placeholder="8-12" /><//>
              <${Field} label="Descanso"><input class="input num" type="number" inputmode="numeric" value=${it.rest ?? 90} onInput=${(e) => patch(i, 'rest', Number(e.target.value) || 0)} /><//>
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
    <${Sheet} title="Exercícios" onClose=${close}>
      <input class="input" placeholder="Buscar exercício…" value=${q} onInput=${(e) => setQ(e.target.value)} autofocus />
      <div class="chips">
        <button class=${`chip ${!group ? 'on' : ''}`} onClick=${() => setGroup(null)}>Todos</button>
        ${Object.entries(MUSCLES).map(([k, l]) => html`<button class=${`chip ${group === k ? 'on' : ''}`} onClick=${() => setGroup(k)}>${l}</button>`)}
      </div>
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

let restEnd = 0;
let restListeners = new Set();
function startRest(sec) {
  restEnd = Date.now() + sec * 1000;
  restListeners.forEach((f) => f(restEnd));
}

function RestTimer() {
  const [end, setEnd] = useState(restEnd);
  const now = useNow(250);
  useEffect(() => {
    restListeners.add(setEnd);
    return () => restListeners.delete(setEnd);
  }, []);
  const left = Math.max(0, Math.ceil((end - now) / 1000));
  useEffect(() => {
    if (end && left === 0) {
      navigator.vibrate?.([200, 100, 200]);
      setEnd(0);
      restEnd = 0;
    }
  }, [left === 0]);
  if (!end || left <= 0) return null;
  return html`
    <div class="timer" role="timer">
      <span>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span>
      <button onClick=${() => startRest(left + 30)}>+30</button>
      <button onClick=${() => { startRest(0); }}>Pular</button>
    </div>
  `;
}

function patchSession(id, fn) {
  update((s) => {
    const ses = s.sessions.find((x) => x.id === id);
    if (ses) fn(ses, s);
  });
}

function SessionView({ s, ses }) {
  const now = useNow(1000);
  const editing = !!ses.finishedAt;
  const elapsed = Math.floor(((ses.finishedAt ?? now) - ses.startedAt) / 1000);
  const st = sessionStats(s, ses);

  const finish = async () => {
    const pending = ses.exercises.some((e) => e.sets.some((x) => !x.done && (x.kg || x.reps)));
    if (!st.sets) return toast('Marque ao menos uma série como feita ✓');
    if (pending && !(await confirmDialog('Há séries preenchidas e não marcadas. Finalizar mesmo assim?', { ok: 'Finalizar', danger: false }))) return;
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
    update((root) => {
      root.sessions = root.sessions.filter((x) => x.id !== ses.id);
      if (root.activeSessionId === ses.id) root.activeSessionId = null;
    });
    go('treino');
  };

  return html`
    <div class="stack">
      <div class="page-head">
        <div class="grow">
          <button class="link-btn small" onClick=${() => go('treino')}>← Treino</button>
          <input class="input" style="font-size:22px;font-weight:700;text-transform:uppercase;border:0;padding:4px 0;min-height:0;background:transparent;box-shadow:none" value=${ses.name} onInput=${(e) => patchSession(ses.id, (x) => (x.name = e.target.value))} aria-label="Nome do treino" />
          <div class="row small mono muted">
            <span>${editing ? fmtDate(ses.date, { year: true }) : `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`}</span>
            <span>· ${st.sets} séries · ${num(st.volume)} kg</span>
          </div>
        </div>
      </div>

      ${editing && html`
        <${Field} label="Data">
          <input class="input" type="date" value=${ses.date} onChange=${(e) => e.target.value && patchSession(ses.id, (x) => (x.date = e.target.value))} />
        <//>
      `}

      ${ses.exercises.map((ex, i) => html`<${ExerciseLog} key=${ex.exId + i} s=${s} ses=${ses} ex=${ex} idx=${i} />`)}

      <button class="btn" onClick=${() => pickExercise((exId) => patchSession(ses.id, (x) => x.exercises.push({ exId, target: '8-12', rest: 90, sets: [0, 1, 2].map(() => ({ kg: null, reps: null, rpe: null, pct: null, done: false, warmup: false })) })))}>
        <${Icon} name="plus" />Adicionar exercício
      </button>

      <div class="row">
        <button class="btn" onClick=${discard}>${editing ? 'Excluir' : 'Descartar'}</button>
        ${editing
          ? html`<button class="btn primary grow" onClick=${() => go('treino')}>Pronto</button>`
          : html`<button class="btn primary grow" onClick=${finish}><${Icon} name="check" />Finalizar treino</button>`}
      </div>
      ${!editing && html`<div style="height:64px" aria-hidden="true"></div><${RestTimer} />`}
    </div>
  `;
}

function ExerciseLog({ s, ses, ex, idx }) {
  const def = exerciseById(s, ex.exId);
  const last = useMemo(() => lastPerformance(s, ex.exId, ses.id), [s.sessions, ex.exId]);
  const best = useMemo(() => bestE1rm(s, ex.exId), [s.sessions, ex.exId]);
  const sug = suggestNext(last, ex.target);
  const { showRpe, showPct } = s.settings;
  const prevBest = useMemo(() => {
    // melhor 1RM antes desta sessão (para marcar PR ao vivo)
    const h = exerciseHistory(s, ex.exId).filter((x) => x.sessionId !== ses.id && x.date <= ses.date);
    return h.length ? Math.max(...h.map((x) => x.e1rm)) : null;
  }, [s.sessions, ex.exId]);

  const patchEx = (fn) => patchSession(ses.id, (x) => fn(x.exercises[idx]));
  const patchSet = (j, k, v) => patchEx((e) => {
    const set = e.sets[j];
    set[k] = v;
    if (k === 'pct' && v && best) set.kg = loadForPct(v, best);
  });
  const toggleDone = (j) => {
    const set = ex.sets[j];
    const prev = last?.sets[j] ?? last?.sets[last.sets.length - 1];
    patchEx((e) => {
      const st = e.sets[j];
      if (!st.done) {
        if (st.kg == null && prev) st.kg = Number(prev.kg);
        if (st.reps == null && prev) st.reps = Number(prev.reps);
        if (st.kg == null && sug) st.kg = sug.kg;
      }
      st.done = !st.done;
    });
    if (!set.done && !ses.finishedAt) startRest(ex.rest ?? 90);
  };

  return html`
    <div class="ex-card">
      <div class="ex-head">
        <div class="grow">
          <h3>${def.name}</h3>
          <div class="row wrap" style="gap:6px;margin-top:6px">
            <span class="tag fill">${MUSCLES[def.primary]}</span>
            ${ex.target && html`<span class="tag">Meta ${ex.target}</span>`}
            ${best > 0 && html`<span class="tag">1RM est. ${num(best, 1)}</span>`}
          </div>
        </div>
        <button class="x-btn" aria-label="Opções" onClick=${() => exerciseMenu(ses, idx, def)}>⋯</button>
      </div>
      ${last && html`
        <div class="ex-prev">
          <b class="mono">ÚLTIMA ${fmtDate(last.date)}:</b>
          <span class="mono">${last.sets.map((x) => `${num(x.kg, 1)}×${x.reps}${x.rpe ? '@' + x.rpe : ''}`).join('  ')}</span>
          ${sug && html`<span style="flex-basis:100%;font-weight:700">→ ${sug.text}</span>`}
        </div>
      `}
      <table class="sets">
        <thead><tr>
          <th>Série</th><th>Kg</th><th>Reps</th>
          ${showRpe && html`<th>RPE</th>`}
          ${showPct && html`<th>%RM</th>`}
          <th></th>
        </tr></thead>
        <tbody>
          ${ex.sets.map((st, j) => {
            const prev = last?.sets[j];
            const isPr = st.done && !st.warmup && prevBest != null && setE1rm(st) > prevBest;
            const pctShown = st.pct ?? (st.kg && best ? pctOf1rm(st.kg, best) : null);
            return html`
              <tr class=${`${st.done ? 'done' : ''} ${st.warmup ? 'warm' : ''}`} key=${j}>
                <td>
                  <button class="link-btn mono" style="text-decoration:none" title="Tocar para marcar aquecimento" onClick=${() => patchSet(j, 'warmup', !st.warmup)}>${st.warmup ? 'W' : j + 1 - ex.sets.slice(0, j).filter((x) => x.warmup).length}</button>
                  ${isPr && html`<div class="pr-flag">PR</div>`}
                </td>
                <td><input class="input" type="number" inputmode="decimal" step="any" placeholder=${prev ? num(prev.kg, 1) : sug?.kg ?? '—'} value=${st.kg ?? ''} onInput=${(e) => patchSet(j, 'kg', toNum(e.target.value))} aria-label="Carga" /></td>
                <td><input class="input" type="number" inputmode="numeric" placeholder=${prev?.reps ?? '—'} value=${st.reps ?? ''} onInput=${(e) => patchSet(j, 'reps', toNum(e.target.value))} aria-label="Repetições" /></td>
                ${showRpe && html`<td><input class="input" type="number" inputmode="decimal" step="0.5" min="5" max="10" placeholder="—" value=${st.rpe ?? ''} onInput=${(e) => patchSet(j, 'rpe', toNum(e.target.value))} aria-label="RPE" /></td>`}
                ${showPct && html`<td><input class="input" type="number" inputmode="numeric" placeholder=${pctShown ?? '—'} value=${st.pct ?? ''} onInput=${(e) => patchSet(j, 'pct', toNum(e.target.value))} aria-label="% de 1RM" /></td>`}
                <td><button class=${`set-check ${st.done ? 'on' : ''}`} onClick=${() => toggleDone(j)} aria-label="Série feita"><${Icon} name="check" /></button></td>
              </tr>
            `;
          })}
        </tbody>
      </table>
      <div class="ex-foot">
        <button class="btn xs" onClick=${() => patchEx((e) => {
          const l = e.sets[e.sets.length - 1];
          e.sets.push({ kg: l?.kg ?? null, reps: l?.reps ?? null, rpe: null, pct: null, done: false, warmup: false });
        })}><${Icon} name="plus" size="14" />Série</button>
        ${ex.sets.length > 1 && html`<button class="btn xs ghost" onClick=${() => patchEx((e) => e.sets.pop())}>− Série</button>`}
        <span class="grow"></span>
        <span class="mono tiny muted" style="align-self:center">Descanso ${ex.rest ?? 90}s</span>
      </div>
    </div>
  `;
}

function exerciseMenu(ses, idx, def) {
  openModal((close) => html`
    <${Sheet} title=${def.name} onClose=${close}>
      <div class="list">
        <button class="li btnlike" onClick=${() => { close(); pickExercise((exId) => patchSession(ses.id, (x) => (x.exercises[idx].exId = exId))); }}><${Icon} name="swap" /><span class="t">Trocar exercício</span></button>
        <button class="li btnlike" onClick=${() => { patchSession(ses.id, (x) => idx > 0 && x.exercises.splice(idx - 1, 0, x.exercises.splice(idx, 1)[0])); close(); }}><span class="t">↑ Mover para cima</span></button>
        <button class="li btnlike" onClick=${() => { patchSession(ses.id, (x) => idx < x.exercises.length - 1 && x.exercises.splice(idx + 1, 0, x.exercises.splice(idx, 1)[0])); close(); }}><span class="t">↓ Mover para baixo</span></button>
        <button class="li btnlike" onClick=${() => {
          const v = prompt('Descanso entre séries (segundos)', String(ses.exercises[idx].rest ?? 90));
          if (v != null && Number(v) >= 0) patchSession(ses.id, (x) => (x.exercises[idx].rest = Number(v)));
          close();
        }}><span class="t">Descanso…</span></button>
        <button class="li btnlike" onClick=${() => { patchSession(ses.id, (x) => x.exercises.splice(idx, 1)); close(); }}><${Icon} name="trash" /><span class="t danger">Remover do treino</span></button>
      </div>
    <//>
  `);
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
