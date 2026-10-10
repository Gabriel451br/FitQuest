// SOCIAL: feed de treinos dos amigos, ranking, amigos e duelos (comparação).
import { html, useState, useEffect, useMemo } from '../lib.js';
import { update, getState, exerciseById } from '../store.js';
import { cloudEnabled, useAuth, currentUserId, currentUsername } from '../cloud.js';
import {
  listFriendships, searchUsers, requestFriend, acceptFriend, removeFriend, fetchProfiles,
  fetchGlobalRanking, fetchFeed, fetchUserWorkouts, toggleLike, mySummary, publishNow, LIFT_KEYS,
} from '../social.js';
import { ACTIVITIES, fmtDuration, rateText } from '../cardio.js';
import { SET_KINDS } from '../training.js';
import { Icon, openModal, Sheet, Seg, toast, confirmDialog, Empty, Stat } from '../ui.js';
import { num, fmtDate, dateKey, weekStart, diffDays } from '../util.js';

const METRICS = [
  ['xp', 'XP total', (p) => p.xp, ''],
  ['week_xp', 'XP semana', (p) => (isThisWeek(p) ? p.week_xp : 0), '', true],
  ['week_workouts', 'Treinos sem.', (p) => (isThisWeek(p) ? p.week_workouts : 0), '', true],
  ['week_volume', 'Volume sem.', (p) => (isThisWeek(p) ? p.week_volume : 0), ' kg', true],
  ['week_km', 'Km semana', (p) => (isThisWeek(p) ? Number(p.week_km) : 0), ' km', true],
  ['bench', 'Supino', (p) => Number(p.bench), ' kg'],
  ['squat', 'Agachamento', (p) => Number(p.squat), ' kg'],
  ['deadlift', 'Terra', (p) => Number(p.deadlift), ' kg'],
  ['ohp', 'Desenvolv.', (p) => Number(p.ohp), ' kg'],
  ['streak', 'Sequência', (p) => p.streak, ' d'],
  ['workouts', 'Treinos total', (p) => p.workouts, ''],
];
const isThisWeek = (p) => p.week_start === weekStart(dateKey());

function relDate(d) {
  const n = diffDays(dateKey(), d);
  return n === 0 ? 'hoje' : n === 1 ? 'ontem' : n < 7 ? `há ${n} dias` : fmtDate(d);
}

function useAsync(fn, deps) {
  const [st, set] = useState({ loading: true, data: null, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    set((o) => ({ ...o, loading: true, error: null }));
    fn().then((data) => alive && set({ loading: false, data, error: null })).catch((e) => alive && set({ loading: false, data: null, error: e.message }));
    return () => { alive = false; };
  }, [...deps, tick]);
  return { ...st, reload: () => setTick((t) => t + 1) };
}

export function Avatar({ name, level, size = 40 }) {
  const ch = (name || '?').replace('@', '').charAt(0).toUpperCase();
  return html`
    <span class="avatar" style=${`width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px`}>
      ${ch}${level != null && html`<b>${level}</b>`}
    </span>
  `;
}

export function SocialView({ s }) {
  const auth = useAuth();
  const [tab, setTab] = useState('feed');
  if (!cloudEnabled || !auth.user) {
    return html`<div class="stack"><div class="page-head"><h1>Social</h1></div><${Empty} title="Entre na sua conta" text="O social precisa de login para ver amigos e ranking." /></div>`;
  }
  return html`
    <div class="stack">
      <div class="page-head">
        <h1>Social</h1>
        <span class="tag fill">@${auth.user.user_metadata?.username ?? ''}</span>
      </div>
      ${!navigator.onLine && html`<div class="callout warn small">Sem internet: o social precisa de conexão. Seus treinos são publicados quando ela voltar.</div>`}
      <div class="tabs">
        ${[['feed', 'Feed'], ['ranking', 'Ranking'], ['amigos', 'Amigos']].map(([k, l]) => html`
          <button class=${tab === k ? 'on' : ''} onClick=${() => setTab(k)}>${l}</button>
        `)}
      </div>
      ${tab === 'feed' && html`<${FeedTab} s=${s} />`}
      ${tab === 'ranking' && html`<${RankingTab} s=${s} />`}
      ${tab === 'amigos' && html`<${FriendsTab} s=${s} />`}
    </div>
  `;
}

// --- Feed ------------------------------------------------------------------------------------

function FeedTab({ s }) {
  const me = currentUserId();
  const res = useAsync(async () => {
    await publishNow();
    const fr = await listFriendships();
    const ids = [me, ...fr.filter((f) => f.status === 'accepted').map((f) => f.other_id)];
    const [rows, profiles] = await Promise.all([fetchFeed(ids, 40), fetchProfiles(ids)]);
    return { rows, profiles: Object.fromEntries(profiles.map((p) => [p.user_id, p])), friends: ids.length - 1 };
  }, []);
  const [, force] = useState(0);
  if (res.loading && !res.data) return html`<p class="muted small">Carregando…</p>`;
  if (res.error) return html`<div class="callout warn small">${res.error} <button class="link-btn" onClick=${res.reload}>Tentar de novo</button></div>`;
  const { rows, profiles, friends } = res.data;
  const like = async (r) => {
    try {
      await toggleLike(r);
      r.likes += r.liked ? -1 : 1;
      r.liked = !r.liked;
      force((n) => n + 1);
    } catch (e) { toast(e.message); }
  };
  return html`
    <div class="stack">
      <div class="row-sb"><span class="small muted">${friends} amigo${friends === 1 ? '' : 's'} · treinos recentes</span><button class="btn xs" onClick=${res.reload}>Atualizar</button></div>
      ${!friends && html`<${Empty} title="Adicione amigos" text="Procure pelo usuário na aba Amigos. Os treinos deles aparecem aqui para comentar com um “boa!” e competir." />`}
      ${rows.map((r) => html`<${WorkoutCard} key=${r.user_id + r.id} r=${r} p=${profiles[r.user_id]} mine=${r.user_id === me} onLike=${() => like(r)} />`)}
      ${friends > 0 && !rows.length && html`<p class="muted small">Ninguém treinou ainda. Seja o primeiro! 💪</p>`}
    </div>
  `;
}

function bestSetText(sets) {
  const work = sets.filter((x) => x[3] !== 'warmup');
  if (!work.length) return '';
  const top = work.reduce((a, b) => (b[0] > a[0] || (b[0] === a[0] && b[1] > a[1]) ? b : a));
  return `${num(top[0], 1)}×${top[1]}`;
}

function WorkoutCard({ r, p, mine, onLike }) {
  const type = r.type || 'strength';
  const a = ACTIVITIES[type] ?? ACTIVITIES.strength;
  const c = r.data?.cardio;
  return html`
    <article class="card tight post">
      <header class="row">
        <button class="row grow" style="background:none;border:0;padding:0;text-align:left;min-width:0" onClick=${() => openProfile(r.user_id)}>
          <${Avatar} name=${p?.username} level=${p?.level} />
          <div class="grow" style="min-width:0">
            <div class="t" style="font-weight:700">${p?.display_name || p?.username || 'Atleta'}${mine ? ' (você)' : ''}</div>
            <div class="s mono tiny muted">@${p?.username ?? '—'} · ${relDate(r.date)}</div>
          </div>
        </button>
        <span class="tag">${a.short ?? a.label}</span>
      </header>
      <button class="post-body" onClick=${() => openWorkout(r, p)}>
        <h3>${r.name || a.label}</h3>
        ${c
          ? html`<div class="post-stats mono">
              ${c.distance ? html`<span><b>${num(c.distance, 2)}</b> km</span>` : ''}
              ${c.duration ? html`<span><b>${fmtDuration(c.duration)}</b></span>` : ''}
              ${c.distance && c.duration ? html`<span><b>${rateText(type, c.distance, c.duration)}</b></span>` : ''}
              ${c.kind ? html`<span>${c.kind}</span>` : ''}
            </div>`
          : html`
            <ul class="post-ex">
              ${(r.data?.exercises ?? []).slice(0, 4).map((e) => html`<li><span>${e.name}</span><b class="mono">${bestSetText(e.sets)}</b></li>`)}
              ${(r.data?.exercises?.length ?? 0) > 4 && html`<li class="muted">+${r.data.exercises.length - 4} exercícios</li>`}
            </ul>
            <div class="post-stats mono">
              <span><b>${r.sets}</b> séries</span>
              <span><b>${num(r.volume)}</b> kg</span>
              ${r.minutes ? html`<span><b>${r.minutes}</b> min</span>` : ''}
            </div>`}
        ${r.prs > 0 && html`<span class="pr-flag" style="margin-top:6px;display:inline-block">${r.prs} PR${r.prs > 1 ? 's' : ''}</span>`}
      </button>
      <footer class="row-sb">
        <button class=${`btn xs ${r.liked ? 'primary' : ''}`} onClick=${onLike}>
          <${Icon} name="heart" size="14" />${r.liked ? 'Boa!' : 'Dar boa'} ${r.likes ? `· ${r.likes}` : ''}
        </button>
        <button class="link-btn small" onClick=${() => openWorkout(r, p)}>Ver treino →</button>
      </footer>
    </article>
  `;
}

function openWorkout(r, p) {
  openModal((close) => html`<${WorkoutDetail} r=${r} p=${p} close=${close} />`);
}

function WorkoutDetail({ r, p, close }) {
  const c = r.data?.cardio;
  const copyToRoutine = () => {
    const ex = (r.data?.exercises ?? []).map((e) => {
      const work = e.sets.filter((x) => x[3] !== 'warmup');
      return { exId: e.exId, sets: Math.max(1, work.length), reps: work.length ? String(work[0][1]) : '8-12', rest: 90 };
    });
    update((st) => st.workouts.push({ id: `w-${Date.now().toString(36)}`, type: 'strength', name: `${r.name} (@${p?.username ?? 'amigo'})`, exercises: ex }));
    toast('Treino copiado para a sua rotina');
    close();
  };
  return html`
    <${Sheet} title=${r.name || 'Treino'} onClose=${close} footer=${!c && r.user_id !== currentUserId() && (r.data?.exercises?.length ?? 0) > 0 ? html`<button class="btn primary block" onClick=${copyToRoutine}>Copiar para minha rotina</button>` : null}>
      <div class="row">
        <${Avatar} name=${p?.username} level=${p?.level} />
        <div><b>${p?.display_name || p?.username}</b><div class="tiny mono muted">@${p?.username} · ${fmtDate(r.date, { year: true })}</div></div>
      </div>
      ${c
        ? html`<div class="grid-3">
            <${Stat} v=${c.distance ? num(c.distance, 2) : '—'} unit="km" l="Distância" />
            <${Stat} v=${fmtDuration(c.duration)} l="Tempo" />
            <${Stat} v=${c.hr ?? '—'} unit="bpm" l="FC média" />
          </div>`
        : html`
          <div class="grid-3">
            <${Stat} v=${r.sets} l="Séries" />
            <${Stat} v=${num(r.volume)} unit="kg" l="Volume" />
            <${Stat} v=${r.prs} l="PRs" />
          </div>
          ${(r.data?.exercises ?? []).map((e) => {
            let n = 0;
            return html`
              <div class="card flat tight">
                <b>${e.name}</b>
                <table class="rm-table" style="margin-top:6px">
                  <tbody>
                    ${e.sets.map((x) => {
                      const warm = x[3] === 'warmup';
                      if (!warm) n++;
                      return html`<tr class=${warm ? 'muted' : ''}><td style="width:40px">${SET_KINDS[x[3]]?.short || n}</td><td><b>${num(x[0], 1)} kg</b></td><td>× ${x[1]}</td><td>${x[2] ? `RPE ${x[2]}` : ''}</td></tr>`;
                    })}
                  </tbody>
                </table>
              </div>
            `;
          })}`}
      ${r.data?.note && html`<div class="callout small">“${r.data.note}”</div>`}
    <//>
  `;
}

// --- Ranking ---------------------------------------------------------------------------------

function RankingTab() {
  const [scope, setScope] = useState('amigos');
  const [metric, setMetric] = useState('week_xp');
  const me = currentUserId();
  const m = METRICS.find((x) => x[0] === metric);
  const res = useAsync(async () => {
    await publishNow();
    if (scope === 'amigos') {
      const fr = await listFriendships();
      return fetchProfiles([me, ...fr.filter((f) => f.status === 'accepted').map((f) => f.other_id)]);
    }
    return fetchGlobalRanking(metric, 100);
  }, [scope, scope === 'geral' ? metric : '']);
  const rows = useMemo(() => {
    if (!res.data) return [];
    const live = mySummary();
    const list = res.data.map((p) => (p.user_id === me ? { ...p, ...live, username: p.username } : p));
    if (!list.some((p) => p.user_id === me) && scope === 'amigos') list.push({ ...live, username: 'você' });
    return list.map((p) => ({ p, v: m[2](p) || 0 })).sort((a, b) => b.v - a.v);
  }, [res.data, metric]);
  return html`
    <div class="stack">
      <${Seg} value=${scope} onChange=${setScope} options=${[['amigos', 'Amigos'], ['geral', 'Geral']]} />
      <div class="chips" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px">
        ${METRICS.map(([k, l]) => html`<button class=${`chip ${metric === k ? 'on' : ''}`} style="white-space:nowrap" onClick=${() => setMetric(k)}>${l}</button>`)}
      </div>
      ${m[4] && html`<p class="tiny muted">Semana atual (segunda a domingo). Zera toda segunda — corra atrás!</p>`}
      ${res.loading && html`<p class="muted small">Carregando…</p>`}
      ${res.error && html`<div class="callout warn small">${res.error}</div>`}
      ${!res.loading && !res.error && html`
        <ol class="list rank">
          ${rows.map(({ p, v }, i) => html`
            <li class=${`li ${p.user_id === me ? 'me' : ''}`} key=${p.user_id}>
              <span class=${`pos mono ${i < 3 ? 'top' : ''}`}>${i + 1}</span>
              <button class="row grow" style="background:none;border:0;padding:0;text-align:left;min-width:0" onClick=${() => p.user_id !== me && openProfile(p.user_id)}>
                <${Avatar} name=${p.username} level=${p.level} size=${34} />
                <div class="grow" style="min-width:0">
                  <div class="t">${p.display_name || p.username}${p.user_id === me ? ' (você)' : ''}</div>
                  <div class="s mono">@${p.username} · LV ${p.level}</div>
                </div>
              </button>
              <b class="mono">${num(v, metric.includes('km') ? 1 : 0)}${m[3]}</b>
            </li>
          `)}
        </ol>
        ${scope === 'amigos' && rows.length <= 1 && html`<p class="small muted">Adicione amigos para competir no ranking.</p>`}
        ${scope === 'geral' && html`<p class="tiny muted">O ranking geral mostra quem deixou o perfil público (Ajustes → Social).</p>`}
      `}
    </div>
  `;
}

// --- Amigos ----------------------------------------------------------------------------------

function FriendsTab() {
  const res = useAsync(() => listFriendships(), []);
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  useEffect(() => {
    if (q.trim().length < 2) return setFound(null);
    const t = setTimeout(() => searchUsers(q.trim()).then(setFound).catch((e) => toast(e.message)), 300);
    return () => clearTimeout(t);
  }, [q]);
  const fr = res.data ?? [];
  const rel = Object.fromEntries(fr.map((f) => [f.other_id, f]));
  const act = (fn, msg) => async () => {
    try {
      await fn();
      if (msg) toast(msg);
      res.reload();
    } catch (e) { toast(e.message); }
  };
  const incoming = fr.filter((f) => f.status === 'pending' && f.incoming);
  const outgoing = fr.filter((f) => f.status === 'pending' && !f.incoming);
  const friends = fr.filter((f) => f.status === 'accepted');
  return html`
    <div class="stack">
      <div class="input-unit">
        <input class="input" type="search" enterkeyhint="search" autocapitalize="none" placeholder="Buscar usuário para adicionar…" value=${q} onInput=${(e) => setQ(e.target.value)} />
      </div>
      ${found && html`
        <div class="list">
          ${found.map((u) => {
            const r = rel[u.user_id];
            return html`
              <div class="li" key=${u.user_id}>
                <${Avatar} name=${u.username} level=${u.level} size=${34} />
                <div class="grow"><div class="t">${u.display_name || u.username}</div><div class="s mono">@${u.username}</div></div>
                ${!r && html`<button class="btn xs primary" onClick=${act(() => requestFriend(u.user_id), 'Pedido enviado')}>+ Adicionar</button>`}
                ${r?.status === 'pending' && !r.incoming && html`<span class="tag">Enviado</span>`}
                ${r?.status === 'pending' && r.incoming && html`<button class="btn xs primary" onClick=${act(() => acceptFriend(u.user_id), 'Agora vocês são amigos!')}>Aceitar</button>`}
                ${r?.status === 'accepted' && html`<span class="tag acc">Amigo</span>`}
              </div>
            `;
          })}
          ${!found.length && html`<div class="li small muted">Ninguém encontrado.</div>`}
        </div>
      `}

      ${incoming.length > 0 && html`
        <h3 class="up">Pedidos recebidos</h3>
        <div class="list">
          ${incoming.map((f) => html`
            <div class="li" key=${f.other_id}>
              <${Avatar} name=${f.username} level=${f.level} size=${34} />
              <div class="grow"><div class="t">${f.display_name || f.username}</div><div class="s mono">@${f.username}</div></div>
              <button class="btn xs primary" onClick=${act(() => acceptFriend(f.other_id), 'Agora vocês são amigos!')}>Aceitar</button>
              <button class="btn xs ghost" onClick=${act(() => removeFriend(f.other_id))}>Recusar</button>
            </div>
          `)}
        </div>
      `}

      <h3 class="up">Amigos ${friends.length ? `(${friends.length})` : ''}</h3>
      ${res.loading && html`<p class="muted small">Carregando…</p>`}
      ${res.error && html`<div class="callout warn small">${res.error}</div>`}
      ${!res.loading && !friends.length && html`<p class="small muted">Busque pelo nome de usuário acima. Seu usuário: <b class="mono">@${currentUsername()}</b> — passe para seus amigos.</p>`}
      ${friends.length > 0 && html`
        <div class="list">
          ${friends.map((f) => html`
            <button class="li btnlike" key=${f.other_id} onClick=${() => openProfile(f.other_id)}>
              <${Avatar} name=${f.username} level=${f.level} size=${34} />
              <div class="grow"><div class="t">${f.display_name || f.username}</div><div class="s mono">@${f.username} · LV ${f.level}</div></div>
              <span class="tag">Duelo ⚔</span>
            </button>
          `)}
        </div>
      `}

      ${outgoing.length > 0 && html`
        <h3 class="up">Aguardando resposta</h3>
        <div class="list">
          ${outgoing.map((f) => html`
            <div class="li" key=${f.other_id}>
              <${Avatar} name=${f.username} level=${f.level} size=${34} />
              <div class="grow"><div class="t">@${f.username}</div></div>
              <button class="btn xs ghost" onClick=${act(() => removeFriend(f.other_id))}>Cancelar</button>
            </div>
          `)}
        </div>
      `}
    </div>
  `;
}


// --- Perfil + duelo ---------------------------------------------------------------------------

export function openProfile(userId) {
  openModal((close) => html`<${ProfileSheet} userId=${userId} close=${close} />`);
}

const DUEL = [
  ['week_xp', 'XP na semana', true],
  ['week_workouts', 'Treinos na semana', true],
  ['week_volume', 'Volume na semana (kg)', true],
  ['week_km', 'Km na semana', true],
  ['xp', 'XP total'],
  ['streak', 'Sequência atual'],
  ['prs', 'Recordes (PRs)'],
  ['volume_kg', 'Volume total (kg)'],
];

function ProfileSheet({ userId, close }) {
  const me = currentUserId();
  const [tab, setTab] = useState('duelo');
  const res = useAsync(async () => {
    const [prof] = await fetchProfiles([userId]);
    const workouts = await fetchUserWorkouts(userId, 20).catch(() => []);
    const fr = await listFriendships();
    return { prof, workouts, rel: fr.find((f) => f.other_id === userId) };
  }, [userId]);
  const mine = mySummary();
  const p = res.data?.prof;
  const s = getState();
  const title = p ? p.display_name || p.username : 'Perfil';
  const unfriend = async () => {
    if (!(await confirmDialog(`Desfazer amizade com @${p.username}?`, { ok: 'Desfazer' }))) return;
    try { await removeFriend(userId); close(); } catch (e) { toast(e.message); }
  };
  const val = (x, k) => {
    if (!x) return 0;
    if (DUEL.find((d) => d[0] === k)?.[2] && x.week_start !== weekStart(dateKey())) return 0;
    return Number(x[k]) || 0;
  };
  const commonLifts = p ? Object.keys(p.lifts || {}).filter((id) => mine.lifts[id]) : [];
  let wins = 0;
  let losses = 0;
  return html`
    <${Sheet} title=${title} onClose=${close}>
      ${res.loading && html`<p class="muted small">Carregando…</p>`}
      ${res.error && html`<div class="callout warn small">${res.error}</div>`}
      ${!res.loading && !p && html`<p class="small muted">Este perfil é privado. Envie um pedido de amizade para ver.</p>`}
      ${p && html`
        <div class="row">
          <${Avatar} name=${p.username} level=${p.level} size=${56} />
          <div class="grow">
            <h2 style="font-size:20px">${title}</h2>
            <div class="mono small muted">@${p.username} · LV ${p.level} ${p.title}</div>
          </div>
        </div>
        <div class="grid-4">
          <${Stat} v=${num(p.xp)} l="XP" />
          <${Stat} v=${p.streak} unit="d" l="Sequência" />
          <${Stat} v=${p.workouts} l="Treinos" />
          <${Stat} v=${p.prs} l="PRs" />
        </div>
        <${Seg} value=${tab} onChange=${setTab} options=${[['duelo', '⚔ Duelo'], ['cargas', 'Cargas'], ['treinos', 'Treinos']]} />

        ${tab === 'duelo' && html`
          <div class="duel">
            <div class="duel-head mono"><span>VOCÊ</span><span></span><span>@${p.username}</span></div>
            ${DUEL.map(([k, l]) => {
              const a = val(mine, k);
              const b = val(p, k);
              if (a > b) wins++;
              else if (b > a) losses++;
              const max = Math.max(a, b, 1);
              return html`
                <div class="duel-row">
                  <div class=${`duel-v ${a > b ? 'win' : ''}`}><i style=${`width:${(a / max) * 100}%`}></i><b class="mono">${num(a, k.includes('km') ? 1 : 0)}</b></div>
                  <span class="duel-l">${l}</span>
                  <div class=${`duel-v right ${b > a ? 'win' : ''}`}><i style=${`width:${(b / max) * 100}%`}></i><b class="mono">${num(b, k.includes('km') ? 1 : 0)}</b></div>
                </div>
              `;
            })}
            <div class=${`card ${wins >= losses ? 'accent' : 'ink'} center tight`} style="margin-top:8px">
              <b class="up">${wins > losses ? `Você lidera ${wins} × ${losses}` : wins < losses ? `@${p.username} lidera ${losses} × ${wins}` : `Empate ${wins} × ${losses}`}</b>
            </div>
          </div>
        `}

        ${tab === 'cargas' && html`
          <p class="tiny muted">1RM estimado (Epley) do melhor registro de cada um.</p>
          <table class="rm-table">
            <thead><tr><th>Exercício</th><th>Você</th><th>@${p.username}</th></tr></thead>
            <tbody>
              ${Object.entries(LIFT_KEYS).map(([, id]) => [id, mine.lifts[id] || 0, (p.lifts || {})[id] || 0]).concat(
                commonLifts.filter((id) => !Object.values(LIFT_KEYS).includes(id)).map((id) => [id, mine.lifts[id], p.lifts[id]]),
              ).map(([id, a, b]) => html`
                <tr><td>${exerciseById(s, id).name}</td><td class=${a > b ? 'win-cell' : ''}>${a ? num(a, 1) : '—'}</td><td class=${b > a ? 'win-cell' : ''}>${b ? num(b, 1) : '—'}</td></tr>
              `)}
            </tbody>
          </table>
        `}

        ${tab === 'treinos' && html`
          ${!res.data.rel || res.data.rel.status !== 'accepted'
            ? html`<p class="small muted">Os treinos aparecem quando vocês forem amigos.</p>`
            : res.data.workouts.length
              ? res.data.workouts.map((r) => html`
                  <button class="li btnlike card flat tight" key=${r.id} onClick=${() => openWorkout(r, p)}>
                    <div class="grow"><div class="t">${r.name}</div><div class="s mono">${relDate(r.date)} · ${r.data?.cardio ? `${num(r.data.cardio.distance ?? 0, 2)} km · ${fmtDuration(r.data.cardio.duration)}` : `${r.sets} séries · ${num(r.volume)} kg`}${r.prs ? ` · ${r.prs} PR` : ''}</div></div>
                    <${Icon} name="chev" />
                  </button>
                `)
              : html`<p class="small muted">Nenhum treino publicado ainda.</p>`}
        `}

        ${res.data.rel?.status === 'accepted' && userId !== me && html`<button class="btn ghost sm" onClick=${unfriend}>Desfazer amizade</button>`}
        ${!res.data.rel && userId !== me && html`<button class="btn primary" onClick=${async () => { try { await requestFriend(userId); toast('Pedido enviado'); res.reload(); } catch (e) { toast(e.message); } }}>+ Adicionar amigo</button>`}
      `}
    <//>
  `;
}
