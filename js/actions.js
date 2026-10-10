// Ações de domínio reutilizadas entre telas.
import { html, useState } from './lib.js';
import { update, getState, finishedSessions } from './store.js';
import { openModal, Sheet, Field, NumInput, toast, confirmDialog } from './ui.js';
import { dateKey, uid } from './util.js';
import { ACTIVITIES, sessionType } from './cardio.js';

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
export function nextWorkout(s, type = 'strength') {
  const list = s.workouts.filter((w) => (w.type ?? 'strength') === type);
  if (!list.length) return type === 'strength' ? s.workouts[0] ?? null : null;
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
    let j = i + dir;
    while (j >= 0 && j < st.workouts.length && (st.workouts[j].type ?? 'strength') !== type) j += dir;
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
        cardio: { kind: workout?.kind ?? null, distance: null, duration: null, target: workout?.target ?? null, notes: workout?.notes ?? '' },
      });
      st.activeSessionId = id;
    });
    location.hash = '#/treino/sessao';
    return;
  }
  update((st) => {
    st.sessions.push({
      id,
      date,
      type: 'strength',
      workoutId: workout?.id ?? null,
      name: workout?.name ?? 'Treino livre',
      startedAt: Date.now(),
      finishedAt: null,
      exercises: (workout?.exercises ?? []).map((e) => ({
        exId: e.exId,
        target: e.reps,
        targetRpe: e.targetRpe ?? null,
        targetPct: e.targetPct ?? null,
        targetKg: e.targetKg ?? null,
        rest: e.rest ?? 90,
        sets: Array.from({ length: e.sets || 3 }, () => ({ kg: e.targetKg ?? null, reps: null, rpe: null, pct: e.targetPct ?? null, done: false, kind: 'work', auto: { kg: true, pct: true } })),
      })),
    });
    st.activeSessionId = id;
  });
  location.hash = '#/treino/sessao';
}
