// "Painel" do treino na tela de bloqueio.
//
// Apps web no iPhone não têm widget/Atividade ao Vivo, e o JavaScript para quando a tela
// bloqueia. O que funciona é uma NOTIFICAÇÃO local: ao bloquear a tela (ou sair do app)
// no meio do treino, publicamos um resumo com horários absolutos (ex.: "descanso até
// 10:32:15", "início 07:05") — que continuam corretos mesmo sem atualizar. Ao voltar
// para o app, a notificação some. Tocar nela abre o treino.
// Requisitos do iOS: app instalado na Tela de Início (16.4+) e permissão de notificações.
import { getState, update, exerciseById } from './store.js';
import { ACTIVITIES, sessionType, fmtDuration } from './cardio.js';
import { setKind } from './training.js';
import { stepLabel, stepProgress } from './plans.js';
import { splitTimes } from './gps.js';
import { gpsFor, elapsedOf } from './gpslive.js';

const TAG = 'fitquest-treino';
const hhmm = (t, sec = false) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', ...(sec ? { second: '2-digit' } : {}) });

export const lockSupported = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
export const lockPermission = () => (lockSupported() ? Notification.permission : 'unsupported');
export const lockEnabled = (s = getState()) => s.settings?.lockScreen !== false && lockPermission() === 'granted';

// Pede permissão (precisa ser chamado num toque). Retorna true se liberado.
export async function enableLockScreen() {
  if (!lockSupported()) return false;
  let p = Notification.permission;
  if (p === 'default') p = await Notification.requestPermission();
  if (p === 'granted') update((st) => { st.settings.lockScreen = true; });
  return p === 'granted';
}

function strengthSummary(s, ses) {
  const now = Date.now();
  const min = Math.max(1, Math.round((now - ses.startedAt) / 60000));
  let done = 0, total = 0, vol = 0;
  for (const e of ses.exercises) for (const st of e.sets) {
    total++;
    if (st.done) { done++; if (setKind(st) !== 'warmup') vol += (Number(st.kg) || 0) * (Number(st.reps) || 0); }
  }
  const cur = ses.exercises.find((e) => e.sets.some((x) => !x.done)) ?? ses.exercises[ses.exercises.length - 1];
  const lines = [];
  const restEnd = Number(localStorage.getItem('fitquest.restEnd')) || 0;
  if (restEnd > now) lines.push(`⏱ Descanso até ${hhmm(restEnd, true)}`);
  if (cur) {
    const i = cur.sets.findIndex((x) => !x.done);
    const n = i < 0 ? cur.sets.length : i + 1;
    const next = cur.sets[i < 0 ? cur.sets.length - 1 : i];
    const target = next && (next.kg || next.reps) ? ` · ${next.kg ?? '—'} kg × ${next.reps ?? '—'}` : '';
    lines.push(`▶ ${exerciseById(s, cur.exId)?.name ?? 'Exercício'} — série ${n}/${cur.sets.length}${target}`);
    const after = ses.exercises[ses.exercises.indexOf(cur) + 1];
    if (after) lines.push(`Depois: ${exerciseById(s, after.exId)?.name ?? ''}`);
  }
  lines.push(`✓ ${done}/${total} séries · ${Math.round(vol).toLocaleString('pt-BR')} kg · início ${hhmm(ses.startedAt)}`);
  return { title: `🏋️ ${ses.name} · ${min} min`, body: lines.join('\n') };
}

function cardioSummary(s, ses) {
  const type = sessionType(ses);
  const a = ACTIVITIES[type];
  const el = elapsedOf(ses);
  const g = ses.cardio?.gps ? gpsFor(ses.id) : null;
  const km = g?.track ? g.track.dist / 1000 : 0;
  const lines = [];
  const parts = [`⏱ ${fmtDuration(el)}`];
  if (km > 0.01) {
    parts.push(`${km.toFixed(2).replace('.', ',')} km`);
    const pace = el / km;
    parts.push(type === 'bike' ? `${(3600 / pace).toFixed(1).replace('.', ',')} km/h méd.` : `${fmtDuration(pace)}/km méd.`);
  }
  lines.push(parts.join(' · '));
  const steps = ses.cardio?.plan?.steps ?? [];
  const c = ses.cardio?.cursor ?? { idx: 0, t: 0, d: 0 };
  const st = steps[c.idx];
  if (st) {
    const pr = stepProgress(st, c, el, km);
    const until = st.by === 'time' && !ses.pausedAt ? ` (até ${hhmm(Date.now() + pr.remain * 1000, true)})` : '';
    lines.push(`▶ Etapa ${c.idx + 1}/${steps.length}: ${stepLabel(st)}${until}`);
    if (steps[c.idx + 1]) lines.push(`Depois: ${stepLabel(steps[c.idx + 1])}`);
  }
  const sp = g?.track ? splitTimes(g.track.splits) : [];
  if (sp.length) lines.push(`Último km: ${fmtDuration(sp[sp.length - 1])}`);
  lines.push(ses.pausedAt ? '❚❚ Pausado' : `Início ${hhmm(ses.startedAt)}${ses.cardio?.gps ? ' · GPS volta ao abrir o app' : ''}`);
  return { title: `${type === 'bike' ? '🚴' : type === 'walk' ? '🚶' : type === 'swim' ? '🏊' : '🏃'} ${ses.name || a.label}`, body: lines.join('\n') };
}

export function liveSummary(s = getState()) {
  const ses = s.sessions?.find((x) => x.id === s.activeSessionId && !x.finishedAt);
  if (!ses) return null;
  return sessionType(ses) === 'strength' ? strengthSummary(s, ses) : cardioSummary(s, ses);
}

async function reg() {
  try { return await navigator.serviceWorker.ready; } catch { return null; }
}

export async function showLockCard() {
  if (!lockEnabled()) return;
  const sum = liveSummary();
  if (!sum) return;
  const r = await reg();
  try {
    await r?.showNotification(sum.title, {
      body: sum.body, tag: TAG, renotify: false, silent: true, requireInteraction: true,
      icon: './icons/icon-192.png', badge: './icons/icon-192.png', data: { url: './#/treino/sessao' },
    });
  } catch { /* sem suporte */ }
}

export async function hideLockCard() {
  const r = await reg();
  try { (await r?.getNotifications({ tag: TAG }))?.forEach((n) => n.close()); } catch { /* ignore */ }
}

if (lockSupported()) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') showLockCard();
    else hideLockCard();
  });
  // pagehide: alguns iOS disparam só este ao bloquear
  addEventListener('pagehide', () => showLockCard());
  // treino terminou/descartado: some com o painel
  setTimeout(() => hideLockCard(), 0);
}
