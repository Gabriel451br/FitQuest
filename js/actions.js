// Ações de domínio reutilizadas entre telas.
import { html, useState } from './lib.js';
import { update, getState, finishedSessions, exerciseById } from './store.js';
import { openModal, Sheet, Field, NumInput, toast, confirmDialog, choiceDialog } from './ui.js';
import { dateKey, uid } from './util.js';
import { ACTIVITIES, sessionType } from './cardio.js';
import { GPS_TYPES } from './gps.js';
import { routineFromSession } from './training.js';
import { activeProgram, blockProgress, deloadSets, loadStep, suggestProgression } from './programs.js';
import { isScheme, prescribe, prescribedSets, heavyDutySets } from './periodization.js';
import { oneRmRef, lastPerformance } from './training.js';
import { installInto } from './data/programs.js';

export function addWater(date, ml) {
  update((s) => {
    const d = (s.diary[date] ??= { meals: {}, water: 0 });
    d.water = Math.max(0, (d.water || 0) + ml);
  });
}

export function setWeight(date, kg) {
  update((s) => {
    s.weights = s.weights.filter((w) => w.date !== date);
    if (kg) s.weights.push({ date, kg });
    s.weights.sort((a, b) => a.date.localeCompare(b.date));
  });
}

export function openWeighIn(date = dateKey()) {
  const s = getState();
  const cur = s.weights.find((w) => w.date === date)?.kg ?? [...s.weights].pop()?.kg ?? null;
  openModal((close) => html`<${WeighIn} date=${date} initial=${cur} close=${close} />`);
}

function WeighIn({ date, initial, close }) {
  const [kg, setKg] = useState(initial);
  const save = () => {
    if (!kg || kg < 30 || kg > 300) return toast('Peso inválido');
    setWeight(date, kg);
    close();
  };
  return html`
    <${Sheet} title="Pesagem" onClose=${close} footer=${html`<button class="btn primary block" onClick=${save}>Salvar</button>`}>
      <${Field} label="Peso de hoje" hint="De preferência em jejum, após ir ao banheiro.">
        <${NumInput} value=${kg} onInput=${setKg} unit="kg" step="0.1" autofocus onKeyDown=${(e) => e.key === 'Enter' && save()} />
      <//>
    <//>
  `;
}

// Próximo treino da rotação: o seguinte ao último concluído.
// Próximo treino da rotação de uma categoria (musculação por padrão).
// Última observação registrada para o exercício (continua no próximo treino).
export function lastExerciseNote(s, exId) {
  const list = finishedSessions(s);
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i].exercises?.find((y) => y.exId === exId && y.note?.trim());
    if (e) return e.note;
  }
  return '';
}

// Treinos "soltos" (fora de pastas e do arquivo) entram no rodízio da rotina.
export const inRotation = (w) => !w.folderId;

export function nextWorkout(s, type = 'strength') {
  if (type === 'strength') {
    const p = activeProgram(s);
    const bp = p ? blockProgress(s, p) : null;
    const w = bp && !bp.finished && s.workouts.find((x) => x.id === bp.nextWorkoutId);
    if (w) return w;
  }
  const list = s.workouts.filter((w) => (w.type ?? 'strength') === type && inRotation(w));
  if (!list.length) return type === 'strength' ? s.workouts.find((w) => (w.type ?? 'strength') === 'strength' && !w.folderId) ?? null : null;
  const last = finishedSessions(s).filter((x) => x.workoutId && sessionType(x) === type).pop();
  if (!last) return list[0];
  const i = list.findIndex((w) => w.id === last.workoutId);
  return list[(i + 1) % list.length] ?? list[0];
}

export async function deleteSession(id) {
  const ok = await confirmDialog('Excluir este treino do histórico? O XP ligado a ele também sai.', { ok: 'Excluir' });
  if (!ok) return false;
  update((st) => {
    st.sessions = st.sessions.filter((x) => x.id !== id);
    if (st.activeSessionId === id) st.activeSessionId = null;
  });
  return true;
}

export async function deleteWorkout(w) {
  const ok = await confirmDialog(`Excluir o treino "${w.name}" da rotina? O histórico já registrado é mantido.`, { ok: 'Excluir' });
  if (!ok) return false;
  update((st) => { st.workouts = st.workouts.filter((x) => x.id !== w.id); });
  return true;
}

// Move um treino para cima/baixo entre os da mesma categoria (mantém os demais no lugar).
export function moveWorkout(id, dir) {
  update((st) => {
    const i = st.workouts.findIndex((w) => w.id === id);
    if (i < 0) return;
    const type = st.workouts[i].type ?? 'strength';
    const folder = st.workouts[i].folderId ?? null;
    const same = (w) => (w.type ?? 'strength') === type && (w.folderId ?? null) === folder;
    let j = i + dir;
    while (j >= 0 && j < st.workouts.length && !same(st.workouts[j])) j += dir;
    if (j < 0 || j >= st.workouts.length) return;
    [st.workouts[i], st.workouts[j]] = [st.workouts[j], st.workouts[i]];
  });
}

export function startSession(workout, date = dateKey()) {
  const s = getState();
  if (s.activeSessionId && s.sessions.some((x) => x.id === s.activeSessionId && !x.finishedAt)) {
    location.hash = '#/treino/sessao';
    return;
  }
  const id = uid();
  const type = workout?.type ?? 'strength';
  if (type !== 'strength') {
    update((st) => {
      st.sessions.push({
        id, date, type, workoutId: workout?.id ?? null,
        name: workout?.name ?? ACTIVITIES[type].label,
        startedAt: Date.now(), finishedAt: null, pausedMs: 0, pausedAt: null, exercises: [],
        cardio: {
          kind: workout?.kind ?? null, distance: null, duration: null, target: workout?.target ?? null, notes: workout?.notes ?? '',
          // GPS ligado por padrão ao ar livre (corrida, caminhada, bike); esteira/indoor não
          gps: GPS_TYPES.includes(type) && !['Esteira', 'Indoor'].includes(workout?.kind),
          ...(workout?.plan?.steps?.length ? { plan: structuredClone(workout.plan), cursor: { idx: 0, t: 0, d: 0 }, laps: [] } : {}),
        },
      });
      st.activeSessionId = id;
    });
    location.hash = '#/treino/sessao';
    return;
  }
  // treino do bloco atual do programa ativo: marca bloco/semana e aplica o deload
  const prog = activeProgram(s);
  const bp = prog ? blockProgress(s, prog) : null;
  const inBlock = bp && workout && bp.block.workoutIds.includes(workout.id);
  const deload = inBlock && bp.guide.deload;
  const week = inBlock ? Math.min(bp.week, bp.weeks) : 1;
  const rpeWeek = inBlock && bp.guide.rpe ? Number(String(bp.guide.rpe).split('-').pop()) : null;
  const prevSameWorkout = workout ? finishedSessions(s).filter((x) => x.workoutId === workout.id && x.note).pop() : null;
  update((st) => {
    st.sessions.push({
      id,
      date,
      type: 'strength',
      workoutId: workout?.id ?? null,
      name: workout?.name ?? 'Treino livre',
      startedAt: Date.now(),
      finishedAt: null,
      // observações do treino continuam de uma sessão para a outra
      note: prevSameWorkout?.note ?? '',
      ...(workout?.warmup ? { warmup: workout.warmup } : {}), ...(workout?.short ? { short: workout.short } : {}),
      ...(inBlock ? { programId: prog.id, blockId: bp.block.id, week: Math.min(bp.week, bp.weeks), deload: !!deload } : {}),
      ...(workout?.finisher?.length ? { finisher: workout.finisher } : {}),
      exercises: (workout?.exercises ?? []).map((e) => {
        const n = deload ? deloadSets(e.sets || 3) : e.sets || 3;
        const prog = e.prog ?? (inBlock ? bp.block.progression : null);
        const topset = prog === 'topset' && n >= 2;
        // esquemas por %RM / RPE (5/3/1, Juggernaut, %RM linear, autorregulado): séries já com carga
        const rx = isScheme(prog)
          ? prescribe({ ...e, prog }, { week, deload, test: inBlock && bp.guide.test, rpe: rpeWeek, wave: inBlock ? bp.block.wave : null, oneRm: oneRmRef(s, e.pctOf ?? e.exId), step: loadStep(s, e.exId) >= 5 ? 2.5 : 2 })
          : null;
        if (rx) {
          return {
            exId: e.exId, target: e.reps, targetRpe: e.rpe ?? e.targetRpe ?? null, targetPct: null, targetKg: null,
            rest: e.rest ?? 90, cue: e.note ?? '', prog, rx: rx.text,
            ...(e.section ? { section: e.section } : {}), ...(e.optional ? { optional: true } : {}), ...(e.superset ? { superset: e.superset } : {}),
            note: lastExerciseNote(s, e.exId),
            sets: prescribedSets(rx, loadStep(s, e.exId) >= 5 ? 2.5 : 2),
          };
        }
        if (prog === 'hd') {
          // Heavy Duty: aquecimentos + 1 série até a falha, já com a carga sugerida pela última vez
          const step = loadStep(s, e.exId);
          const sug = suggestProgression('hd', lastPerformance(s, e.exId), e.reps, { step });
          return {
            exId: e.exId, target: e.reps, targetRpe: null, targetPct: null, targetKg: null,
            rest: e.rest ?? 150, cue: e.note ?? '', prog,
            ...(e.section ? { section: e.section } : {}), ...(e.optional ? { optional: true } : {}), ...(e.superset ? { superset: e.superset } : {}),
            note: lastExerciseNote(s, e.exId),
            sets: heavyDutySets(e, { deload, rp: inBlock && !!bp.guide.rp, toFailure: !rpeWeek || rpeWeek >= 10, kg: sug?.kg || null, step: step >= 5 ? 2.5 : 1 }),
          };
        }
        return {
          exId: e.exId,
          target: e.reps,
          targetRpe: e.targetRpe ?? e.rpe ?? null,
          targetPct: e.targetPct ?? null,
          targetKg: e.targetKg ?? null,
          rest: e.rest ?? 90,
          cue: e.note ?? '',
          prog: e.prog ?? (inBlock ? bp.block.progression : null),
          ...(e.section ? { section: e.section } : {}), ...(e.optional ? { optional: true } : {}), ...(e.superset ? { superset: e.superset } : {}),
          note: lastExerciseNote(s, e.exId),
          sets: Array.from({ length: n }, (_, i) => ({ kg: e.targetKg ?? null, reps: null, rpe: null, pct: e.targetPct ?? null, done: false, kind: topset ? (i === 0 ? 'top' : 'backoff') : 'work', auto: { kg: true, pct: true } })),
        };
      }),
    });
    st.activeSessionId = id;
  });
  location.hash = '#/treino/sessao';
}

// --- Salvar sessão (treino livre / histórico) como treino para repetir ----------------------

export function workoutFromSession(ses) {
  const type = sessionType(ses);
  if (type === 'strength') return { type, exercises: routineFromSession(ses) };
  const c = ses.cardio ?? {};
  return {
    type,
    kind: c.kind ?? null,
    target: c.plan?.steps?.length ? null : { distance: c.distance ?? c.target?.distance ?? null, duration: c.duration ?? c.target?.duration ?? null },
    notes: c.notes ?? '',
    ...(c.plan?.steps?.length ? { plan: structuredClone(c.plan) } : {}),
  };
}

const exSig = (list) => (list ?? []).map((e) => e.exId).join('|');

// Treino já salvo que corresponde à sessão: o próprio treino de origem (mesmo arquivado
// ou numa pasta) ou outro com o mesmo nome e os mesmos exercícios.
export function existingWorkoutFor(s, ses) {
  const byId = ses.workoutId && s.workouts.find((w) => w.id === ses.workoutId);
  if (byId) return byId;
  const data = workoutFromSession(ses);
  if (data.type !== 'strength') return null;
  return s.workouts.find((w) => (w.type ?? 'strength') === 'strength' && w.name === ses.name && exSig(w.exercises) === exSig(data.exercises)) ?? null;
}

const folderLabel = (s, w) => (w.folderId === ARCHIVE ? 'Arquivados' : w.folderId ? `a pasta “${(s.workoutFolders ?? []).find((f) => f.id === w.folderId)?.name ?? 'pasta'}”` : 'Meus treinos');

// Salvar como treino sem duplicar: se o treino já existe (inclusive arquivado), oferece
// trazê-lo de volta para "Meus treinos" em vez de criar uma cópia.
export async function openSaveAsWorkout(ses) {
  const s = getState();
  const ex = existingWorkoutFor(s, ses);
  if (ex) {
    const opts = [
      ...(ex.folderId ? [{ value: 'restore', label: `Trazer “${ex.name}” para Meus treinos`, primary: true }] : []),
      { value: 'copy', label: 'Salvar uma cópia separada mesmo assim' },
    ];
    const v = await choiceDialog('Treino já salvo', `“${ex.name}” já existe em ${folderLabel(s, ex)}. Não precisa duplicar.`, opts);
    if (v === 'restore') { moveToFolder(ex.id, null); toast(`“${ex.name}” voltou para Meus treinos`); }
    if (v !== 'copy') return;
  }
  openModal((close) => html`<${SaveAsWorkout} ses=${ses} close=${close} />`);
}

function SaveAsWorkout({ ses, close }) {
  const s = getState();
  const generic = !ses.name || /^treino livre$/i.test(ses.name) || ses.name === ACTIVITIES[sessionType(ses)]?.label;
  const [name, setName] = useState(generic ? '' : ses.name);
  const data = workoutFromSession(ses);
  const n = data.exercises?.length;
  const save = () => {
    const base = name.trim();
    if (!base) return toast('Dê um nome ao treino');
    if (data.type === 'strength' && !n) return toast('Este treino não tem exercícios');
    let nm = base;
    for (let i = 2; s.workouts.some((w) => w.name === nm); i++) nm = `${base} (${i})`;
    const id = uid();
    update((st) => {
      st.workouts.push({ id, name: nm, ...structuredClone(data) });
      // treino em andamento passa a ser dessa rotina (permite "Editar rotina")
      const x = st.sessions.find((y) => y.id === ses.id);
      if (x && !x.finishedAt && !x.workoutId) x.workoutId = id;
      st.settings.trainCat = data.type;
    });
    toast(`“${nm}” salvo em Treinos`);
    close();
  };
  return html`
    <${Sheet} title="Salvar como treino" onClose=${close} footer=${html`<button class="btn primary block" onClick=${save}>Salvar treino</button>`}>
      <p class="small">Fica na sua lista de treinos para fazer de novo quando quiser${data.type === 'strength' ? ' — com os mesmos exercícios, número de séries e faixa de repetições.' : '.'}</p>
      <${Field} label="Nome do treino"><input class="input" value=${name} onInput=${(e) => setName(e.target.value)} placeholder="Ex.: Peito e tríceps, Treino A" onKeyDown=${(e) => e.key === 'Enter' && save()} /><//>
      ${data.type === 'strength' && html`
        <div class="list">
          ${data.exercises.map((e) => html`<div class="li"><span class="t grow">${exerciseById(s, e.exId).name}</span><span class="mono small">${e.sets} × ${e.reps}</span></div>`)}
        </div>`}
      <p class="tiny muted">Dá para ajustar depois em Treino → ✎ Editar.</p>
    <//>
  `;
}

// --- Pastas e arquivo de treinos ----------------------------------------------------------

export const ARCHIVE = 'archive';

export function createFolder(name) {
  const id = uid();
  update((st) => { (st.workoutFolders ??= []).push({ id, name: name.trim() }); });
  return id;
}

export function moveToFolder(workoutId, folderId) {
  update((st) => {
    const w = st.workouts.find((x) => x.id === workoutId);
    if (!w) return;
    if (folderId) w.folderId = folderId;
    else delete w.folderId;
  });
}

// Apagar pasta: só a pasta (treinos voltam para "Meus treinos") ou a pasta com todos os treinos.
// Programas que usam esses treinos também saem (o histórico de sessões é sempre mantido).
export async function deleteFolder(folder) {
  const s = getState();
  const items = s.workouts.filter((w) => w.folderId === folder.id);
  const ids = new Set(items.map((w) => w.id));
  const progs = (s.programs ?? []).filter((p) => p.blocks.some((b) => b.workoutIds.some((id) => ids.has(id))));
  const v = await choiceDialog(`Apagar “${folder.name}”`, items.length ? `A pasta tem ${items.length} treino(s).${progs.length ? ` Eles fazem parte do programa “${progs.map((p) => p.name).join('”, “')}”.` : ''} O histórico de treinos feitos é mantido.` : 'A pasta está vazia.', [
    ...(items.length ? [{ value: 'all', label: `Apagar a pasta e ${items.length === 1 ? 'o treino' : `os ${items.length} treinos`}${progs.length ? ' (e o programa)' : ''}`, danger: true }] : []),
    { value: 'folder', label: items.length ? 'Apagar só a pasta (treinos voltam para Meus treinos)' : 'Apagar pasta', danger: !items.length },
  ]);
  if (!v) return false;
  update((st) => {
    st.workoutFolders = (st.workoutFolders ?? []).filter((f) => f.id !== folder.id);
    if (v === 'all') {
      st.workouts = st.workouts.filter((w) => !ids.has(w.id));
      const pids = new Set(progs.map((p) => p.id));
      st.programs = (st.programs ?? []).filter((p) => !pids.has(p.id));
      if (pids.has(st.activeProgramId)) st.activeProgramId = null;
    } else st.workouts.forEach((w) => { if (w.folderId === folder.id) delete w.folderId; });
  });
  toast(v === 'all' ? 'Pasta e treinos apagados' : 'Pasta apagada');
  return true;
}

// --- Programas em blocos ------------------------------------------------------------------

export function installProgram(key) {
  // modelo já instalado: reaproveita (não cria outra pasta com cópias dos treinos)
  const inst = (getState().programs ?? []).find((p) => p.template === key);
  if (inst) return inst.id;
  let id = null;
  update((st) => { id = installInto(st, key, uid); });
  return id;
}

export function followProgram(id) {
  update((st) => {
    const p = st.programs.find((x) => x.id === id);
    if (!p) return;
    st.activeProgramId = id;
    if (p.status !== 'active') {
      p.status = 'active';
      p.blockStartedAt ??= Date.now();
    }
  });
}

export function pauseProgram() {
  update((st) => { st.activeProgramId = null; });
}

// Conclui o bloco atual e começa o próximo (o histórico guarda início/fim de cada bloco).
export function advanceBlock(id) {
  update((st) => {
    const p = st.programs.find((x) => x.id === id);
    if (!p) return;
    const b = p.blocks[p.blockIndex];
    (p.history ??= []).push({ blockId: b.id, name: b.name, startedAt: p.blockStartedAt, endedAt: Date.now() });
    if (p.blockIndex + 1 >= p.blocks.length) {
      p.status = 'done';
      if (st.activeProgramId === p.id) st.activeProgramId = null;
    } else {
      p.blockIndex += 1;
      p.blockStartedAt = Date.now();
    }
  });
}

export function restartBlock(id, index) {
  update((st) => {
    const p = st.programs.find((x) => x.id === id);
    if (!p) return;
    p.blockIndex = index;
    p.blockStartedAt = Date.now();
    p.status = 'active';
    st.activeProgramId = id;
  });
}
