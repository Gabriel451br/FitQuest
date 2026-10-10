// Social: publica um resumo do usuário (ranking/perfil) e os treinos concluídos
// para amigos; consulta feed, ranking, amizades e curtidas no Supabase.
// Dieta, peso, medidas e fotos NUNCA são publicados.
import { sb, cloudEnabled, onSynced, currentUserId } from './cloud.js';
import { getState, finishedSessions, exerciseById } from './store.js';
import { computeGame, allPRs } from './game.js';
import { bestE1rm, sessionStats, setKind } from './training.js';
import { cardioSessions, cardioTotals, cardioWeek, isCardio, sessionType } from './cardio.js';
import { dateKey, weekStart } from './util.js';

export const LIFT_KEYS = { squat: 'agachamento', bench: 'supino-reto', deadlift: 'levantamento-terra', ohp: 'desenvolvimento' };

// --- Resumo público ------------------------------------------------------------------

export function buildSummary(s, today = dateKey()) {
  const g = computeGame(s, today);
  const ws = weekStart(today);
  const fs = finishedSessions(s);
  const weekSessions = fs.filter((x) => weekStart(x.date) === ws);
  const weekXp = Object.entries(g.xpByDay).filter(([d]) => weekStart(d) === ws).reduce((a, [, v]) => a + v, 0) + (g.thisWeek?.xp ?? 0);
  const lifts = {};
  for (const id of new Set(fs.flatMap((x) => x.exercises.map((e) => e.exId)))) {
    const v = bestE1rm(s, id);
    if (v > 0) lifts[id] = v;
  }
  return {
    display_name: s.profile?.name ?? '',
    is_public: s.settings.socialPublic !== false,
    level: g.level.level,
    title: g.level.title,
    xp: g.totalXp,
    streak: g.streak,
    best_streak: g.bestStreak,
    workouts: fs.length,
    prs: g.facts.prs,
    volume_kg: Math.round(g.facts.volume),
    cardio_km: Math.round(cardioTotals(cardioSessions(s)).km * 10) / 10,
    week_start: ws,
    week_xp: weekXp,
    week_workouts: weekSessions.length,
    week_volume: Math.round(weekSessions.reduce((a, x) => a + sessionStats(s, x).volume, 0)),
    week_km: Math.round(cardioWeek(s, undefined, today).km * 10) / 10,
    squat: lifts[LIFT_KEYS.squat] ?? 0,
    bench: lifts[LIFT_KEYS.bench] ?? 0,
    deadlift: lifts[LIFT_KEYS.deadlift] ?? 0,
    ohp: lifts[LIFT_KEYS.ohp] ?? 0,
    lifts,
    achievements: g.achievements.filter((a) => a.unlocked).length,
  };
}

// Treino concluído → registro compartilhável (sem dados de dieta/corpo).
export function buildWorkout(s, ses, prsBySession) {
  const st = sessionStats(s, ses);
  const base = {
    id: ses.id,
    date: ses.date,
    name: ses.name ?? '',
    type: sessionType(ses),
    sets: st.sets,
    volume: Math.round(st.volume),
    prs: prsBySession[ses.id] ?? 0,
    minutes: st.minutes ?? (ses.cardio?.duration ? Math.round(ses.cardio.duration / 60) : null),
  };
  if (isCardio(ses)) {
    const c = ses.cardio ?? {};
    base.data = { cardio: { kind: c.kind ?? null, distance: c.distance ?? null, duration: c.duration ?? null, hr: c.hr ?? null, elevation: c.elevation ?? null }, note: c.notes || ses.note || '' };
  } else {
    base.data = {
      note: ses.note || '',
      exercises: ses.exercises
        .map((e) => ({
          exId: e.exId,
          name: exerciseById(s, e.exId).name,
          sets: e.sets.filter((x) => x.done && Number(x.reps) > 0).map((x) => [Number(x.kg) || 0, Number(x.reps) || 0, x.rpe ?? null, setKind(x)]),
        }))
        .filter((e) => e.sets.length),
    };
  }
  return base;
}

// --- Publicação (após cada sincronização) -----------------------------------------------

const PUB_KEY = (uid) => `fitquest.social.pub:${uid}`;
let pubTimer = null;
let publishing = false;

function readPub(uid) {
  try { return JSON.parse(localStorage.getItem(PUB_KEY(uid)) || '{}'); } catch { return {}; }
}
function writePub(uid, v) {
  try { localStorage.setItem(PUB_KEY(uid), JSON.stringify(v)); } catch { /* ignore */ }
}

export async function publishNow() {
  const uid = currentUserId();
  if (!cloudEnabled || !uid || publishing) return;
  const s = getState();
  if (!s.profile) return;
  publishing = true;
  try {
    const pub = readPub(uid);
    const summary = buildSummary(s);
    const sig = JSON.stringify(summary);
    if (pub.profile !== sig) {
      const { error } = await sb.from('social_profiles').upsert({ user_id: uid, ...summary });
      if (!error) pub.profile = sig;
    }
    const share = s.settings.socialShareWorkouts !== false;
    const prs = {};
    for (const p of allPRs(s)) prs[p.sessionId] = (prs[p.sessionId] ?? 0) + 1;
    const list = share ? finishedSessions(s).slice(-150).map((x) => buildWorkout(s, x, prs)) : [];
    const seen = pub.workouts ?? {};
    const changed = list.filter((w) => seen[w.id] !== JSON.stringify(w));
    for (let i = 0; i < changed.length; i += 50) {
      const chunk = changed.slice(i, i + 50);
      const { error } = await sb.from('shared_workouts').upsert(chunk.map((w) => ({ ...w, user_id: uid })));
      if (!error) chunk.forEach((w) => (seen[w.id] = JSON.stringify(w)));
    }
    const keep = new Set(list.map((w) => w.id));
    const gone = Object.keys(seen).filter((id) => !keep.has(id));
    if (gone.length) {
      const { error } = await sb.from('shared_workouts').delete().eq('user_id', uid).in('id', gone);
      if (!error) gone.forEach((id) => delete seen[id]);
    }
    pub.workouts = seen;
    writePub(uid, pub);
  } catch (e) {
    console.warn('Publicação social falhou', e);
  } finally {
    publishing = false;
  }
}

if (cloudEnabled) {
  onSynced(() => {
    clearTimeout(pubTimer);
    pubTimer = setTimeout(publishNow, 2500);
  });
}

// --- Consultas -------------------------------------------------------------------------

const err = (e) => { if (e) throw new Error(e.message || 'Falha de conexão'); };

export async function listFriendships() {
  const { data, error } = await sb.rpc('my_friendships');
  err(error);
  return data ?? [];
}

export async function searchUsers(q) {
  const { data, error } = await sb.rpc('search_users', { p_query: q });
  err(error);
  return data ?? [];
}

export async function requestFriend(otherId) {
  const uid = currentUserId();
  // se o outro já me convidou, aceitar em vez de duplicar
  const { data: incoming } = await sb.from('friendships').select('requester').eq('requester', otherId).eq('addressee', uid).maybeSingle();
  if (incoming) return acceptFriend(otherId);
  const { error } = await sb.from('friendships').insert({ requester: uid, addressee: otherId });
  if (error && !String(error.message).includes('duplicate')) err(error);
}

export async function acceptFriend(otherId) {
  const { error } = await sb.from('friendships').update({ status: 'accepted' }).eq('requester', otherId).eq('addressee', currentUserId());
  err(error);
}

export async function removeFriend(otherId) {
  const uid = currentUserId();
  const { error } = await sb.from('friendships').delete().or(`and(requester.eq.${uid},addressee.eq.${otherId}),and(requester.eq.${otherId},addressee.eq.${uid})`);
  err(error);
}

const PROFILE_COLS = 'user_id, username, display_name, level, title, xp, streak, best_streak, workouts, prs, volume_kg, cardio_km, week_start, week_xp, week_workouts, week_volume, week_km, squat, bench, deadlift, ohp, lifts, achievements, is_public, updated_at';

export async function fetchProfiles(ids) {
  if (!ids.length) return [];
  const { data, error } = await sb.from('social_profiles').select(PROFILE_COLS).in('user_id', ids);
  err(error);
  return data ?? [];
}

export async function fetchGlobalRanking(column, limit = 50) {
  const { data, error } = await sb.from('social_profiles').select(PROFILE_COLS).eq('is_public', true).order(column, { ascending: false }).limit(limit);
  err(error);
  return data ?? [];
}

export async function fetchFeed(userIds, limit = 40) {
  if (!userIds.length) return [];
  const { data, error } = await sb.from('shared_workouts').select('*').in('user_id', userIds).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
  err(error);
  const rows = data ?? [];
  if (!rows.length) return rows;
  const { data: likes } = await sb.from('workout_likes').select('owner_id, workout_id, user_id').in('owner_id', [...new Set(rows.map((r) => r.user_id))]).in('workout_id', rows.map((r) => r.id));
  const me = currentUserId();
  for (const r of rows) {
    const l = (likes ?? []).filter((x) => x.owner_id === r.user_id && x.workout_id === r.id);
    r.likes = l.length;
    r.liked = l.some((x) => x.user_id === me);
  }
  return rows;
}

export async function fetchUserWorkouts(userId, limit = 30) {
  return fetchFeed([userId], limit);
}

export async function toggleLike(row) {
  const me = currentUserId();
  if (row.liked) {
    const { error } = await sb.from('workout_likes').delete().eq('owner_id', row.user_id).eq('workout_id', row.id).eq('user_id', me);
    err(error);
  } else {
    const { error } = await sb.from('workout_likes').insert({ owner_id: row.user_id, workout_id: row.id, user_id: me });
    err(error);
  }
}

// Dados “ao vivo” do próprio usuário para comparar com amigos sem esperar a publicação.
export function mySummary() {
  const s = getState();
  return { user_id: currentUserId(), username: '', ...buildSummary(s) };
}

