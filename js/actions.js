// Ações de domínio reutilizadas entre telas.
import { html, useState } from './lib.js';
import { update, getState, finishedSessions } from './store.js';
import { openModal, Sheet, Field, NumInput, toast } from './ui.js';
import { dateKey, uid } from './util.js';

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
export function nextWorkout(s) {
  if (!s.workouts.length) return null;
  const last = finishedSessions(s).filter((x) => x.workoutId).pop();
  if (!last) return s.workouts[0];
  const i = s.workouts.findIndex((w) => w.id === last.workoutId);
  return s.workouts[(i + 1) % s.workouts.length] ?? s.workouts[0];
}

export function startSession(workout, date = dateKey()) {
  const s = getState();
  if (s.activeSessionId && s.sessions.some((x) => x.id === s.activeSessionId && !x.finishedAt)) {
    location.hash = '#/treino/sessao';
    return;
  }
  const id = uid();
  update((st) => {
    st.sessions.push({
      id,
      date,
      workoutId: workout?.id ?? null,
      name: workout?.name ?? 'Treino livre',
      startedAt: Date.now(),
      finishedAt: null,
      exercises: (workout?.exercises ?? []).map((e) => ({
        exId: e.exId,
        target: e.reps,
        rest: e.rest ?? 90,
        sets: Array.from({ length: e.sets || 3 }, () => ({ kg: null, reps: null, rpe: null, pct: null, done: false, warmup: false })),
      })),
    });
    st.activeSessionId = id;
  });
  location.hash = '#/treino/sessao';
}
