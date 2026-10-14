// "Treinador" da atividade aeróbica ativa: avança as etapas do treino estruturado,
// faz a contagem regressiva com bipes e fala as parciais (km) e a troca de etapa.
// Roda em qualquer tela do app (não depende da tela do cronômetro estar aberta).
import { getState, update } from './store.js';
import { sessionType } from './cardio.js';
import { advance, stepProgress, stepLabel } from './plans.js';
import { splitTimes } from './gps.js';
import { gpsFor, elapsedOf } from './gpslive.js';
import { alarm, beep, speak, sayDuration } from './sound.js';

const announced = new Map(); // sesId → nº de parciais já faladas
let lastBeep = '';

export function liveDistance(ses) {
  const g = ses.cardio?.gps ? gpsFor(ses.id) : null;
  const km = g?.track ? g.track.dist / 1000 : 0;
  return { km, hasDist: !!g?.track && g.track.fixes > 0, track: g?.track ?? null };
}

const voiceOn = () => getState().settings?.voice !== false;

function stepSpeech(st, type) {
  if (!st) return 'Treino concluído. Pode finalizar quando quiser.';
  let txt = stepLabel(st).replace(/(\d+)\/(\d+)/, '$1 de $2').replace(/(\d+):(\d\d)/, (_, m, s) => sayDuration(+m * 60 + +s)).replace(/(\d) km\b/, '$1 quilômetros').replace(/(\d) m\b/, '$1 metros');
  if (st.pace) txt += type === 'bike' ? `. Alvo ${Math.round(3600 / st.pace)} quilômetros por hora` : `. Pace alvo ${sayDuration(st.pace)}`;
  return txt;
}

function tick() {
  const s = getState();
  const ses = s.sessions?.find((x) => x.id === s.activeSessionId && !x.finishedAt);
  if (!ses || sessionType(ses) === 'strength' || ses.pausedAt) return;
  const type = sessionType(ses);
  const elapsed = elapsedOf(ses);
  const { km, hasDist, track } = liveDistance(ses);

  // parciais: corrida/caminhada a cada km, bike a cada 5 km
  if (track) {
    const n = track.splits.length;
    if (!announced.has(ses.id)) announced.set(ses.id, n);
    const every = type === 'bike' ? 5 : 1;
    if (n > announced.get(ses.id)) {
      announced.set(ses.id, n);
      if (n % every === 0 && voiceOn()) {
        const sp = splitTimes(track.splits);
        if (type === 'bike') {
          const last5 = sp.slice(-5).reduce((a, b) => a + b, 0);
          speak(`${n} quilômetros. Média dos últimos 5: ${Math.round(18000 / last5)} quilômetros por hora.`);
        } else {
          speak(`${n} ${n === 1 ? 'quilômetro' : 'quilômetros'}. Último em ${sayDuration(sp[sp.length - 1])}.`);
        }
      }
    }
  }

  const plan = ses.cardio?.plan;
  if (!plan?.steps?.length) return;
  const cursor = ses.cardio.cursor ?? { idx: 0, t: 0, d: 0 };
  const cur = plan.steps[cursor.idx];
  // contagem regressiva nos 3 últimos segundos das etapas por tempo
  if (cur?.by === 'time') {
    const pr = stepProgress(cur, cursor, elapsed, km);
    const left = Math.ceil(pr.remain);
    const key = `${ses.id}:${cursor.idx}:${left}`;
    if (left >= 1 && left <= 3 && key !== lastBeep) { lastBeep = key; beep(); }
  }
  const r = advance(plan.steps, cursor, elapsed, km, hasDist);
  if (!r.laps.length) return;
  update((st) => {
    const x = st.sessions.find((y) => y.id === ses.id);
    if (!x) return;
    x.cardio.cursor = r.cursor;
    x.cardio.laps = [...(x.cardio.laps ?? []), ...r.laps];
  });
  const next = plan.steps[r.cursor.idx];
  if (next) beep(true); else alarm();
  navigator.vibrate?.([250, 100, 250]);
  if (voiceOn()) setTimeout(() => speak(stepSpeech(next, type)), 500);
}

// Chamado pelo botão "próxima etapa": anuncia a nova etapa.
export function announceStep(ses, idx) {
  if (voiceOn()) speak(stepSpeech(ses.cardio.plan.steps[idx], sessionType(ses)));
}

if (typeof window !== 'undefined') setInterval(tick, 1000);
