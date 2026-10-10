// Nuvem (Supabase): autenticação por usuário/senha e sincronização dos dados.
// Estratégia offline-first: o app lê/grava no cache local e espelha um documento
// JSON por usuário na tabela user_data (último a gravar vence, por updatedAt).
import { useEffect, useState } from './lib.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { getState, replaceState, onLocalChange, switchAccount } from './store.js';
import { setPhotoRemote } from './photos.js';

export const cloudEnabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase?.createClient);

export const sb = cloudEnabled
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      // sessão fica salva no aparelho e é renovada sozinha: não precisa logar toda vez
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'fitquest.auth' },
    })
  : null;

export const USERNAME_RE = /^[a-zA-Z0-9_.]{3,24}$/;

// --- Estado observável (auth + sync) -------------------------------------------------

let auth = { ready: !cloudEnabled, user: null };
let sync = { status: 'idle', at: null, error: null };
const listeners = new Set();
const notify = () => listeners.forEach((f) => f());

function useObservable(get) {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    listeners.add(f);
    f(); // pode ter mudado entre o render e a inscrição (ex.: sessão lida do cache)
    return () => listeners.delete(f);
  }, []);
  return get();
}

export const useAuth = () => useObservable(() => auth);
export const useSync = () => useObservable(() => sync);

// Avisados após cada sincronização bem-sucedida (ex.: publicar resumo social).
const syncedHooks = new Set();
export function onSynced(fn) {
  syncedHooks.add(fn);
  return () => syncedHooks.delete(fn);
}

function setSync(patch) {
  sync = { ...sync, ...patch };
  notify();
  if (patch.status === 'ok' && user) syncedHooks.forEach((h) => { try { h(user); } catch (e) { console.warn(e); } });
}

// --- Erros em português --------------------------------------------------------------

function friendly(error) {
  const m = String(error?.message ?? error ?? '').toLowerCase();
  if (m.includes('database error saving new user')) return 'Não foi possível criar a conta (usuário já em uso?). Tente outro nome.';
  if (m.includes('invalid login')) return 'Usuário ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Este e-mail já tem conta. Faça login.';
  if (m.includes('password') && m.includes('6')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
  if (m.includes('invalid') && m.includes('email')) return 'E-mail inválido.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão com o servidor. Verifique a internet.';
  if (m.includes('function') && m.includes('does not exist')) return 'Banco ainda não configurado (rode supabase/schema.sql).';
  return error?.message || 'Algo deu errado. Tente novamente.';
}

// --- Cadastro / login ------------------------------------------------------------------

export async function signUp({ username, email, password }) {
  username = username.trim();
  email = email.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) throw new Error('Usuário: 3 a 24 caracteres (letras, números, _ ou .).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido.');
  if (password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
  const { data: free, error: e1 } = await sb.rpc('username_available', { p_username: username });
  if (e1) throw new Error(friendly(e1));
  if (!free) throw new Error('Esse nome de usuário já está em uso.');
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username } } });
  if (error) throw new Error(friendly(error));
  // identities vazio = e-mail já cadastrado (Supabase não revela por segurança)
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('Este e-mail já tem conta. Faça login.');
  }
  return { needsConfirm: !data.session };
}

export async function signIn({ username, password }) {
  username = username.trim();
  if (!username || !password) throw new Error('Preencha usuário e senha.');
  let email = username;
  if (!username.includes('@')) {
    const { data, error } = await sb.rpc('email_for_username', { p_username: username });
    if (error) throw new Error(friendly(error));
    if (!data) throw new Error('Usuário ou senha incorretos.');
    email = data;
  }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendly(error));
}

export async function signOut() {
  await pushNow();
  await sb.auth.signOut();
}

// --- Sincronização ----------------------------------------------------------------------

let user = null;
let pending = false;
let pushTimer = null;
let inflight = null;

async function pull() {
  if (!user) return;
  if (pending) return pushNow(); // mudanças locais não enviadas têm prioridade
  setSync({ status: 'syncing' });
  const { data, error } = await sb.from('user_data').select('data, updated_at').eq('user_id', user.id).maybeSingle();
  if (error) return setSync({ status: 'offline', error: friendly(error) });
  const local = getState();
  const localAt = local.updatedAt || 0;
  if (!data) {
    if (local.profile) {
      pending = true;
      return pushNow();
    }
  } else if ((data.updated_at || 0) > localAt) {
    replaceState({ ...data.data, updatedAt: data.updated_at }, { fromCloud: true });
  } else if (localAt > (data.updated_at || 0)) {
    pending = true;
    return pushNow();
  }
  setSync({ status: 'ok', at: Date.now(), error: null });
  retryPhotos();
}

export async function pushNow() {
  clearTimeout(pushTimer);
  if (!user || !pending) return inflight;
  if (inflight) await inflight;
  if (!pending) return;
  pending = false;
  const st = getState();
  setSync({ status: 'syncing' });
  inflight = sb
    .from('user_data')
    .upsert({ user_id: user.id, data: st, updated_at: st.updatedAt || Date.now(), synced_at: new Date().toISOString() })
    .then(({ error }) => {
      if (error) {
        pending = true;
        setSync({ status: 'offline', error: friendly(error) });
      } else {
        setSync({ status: 'ok', at: Date.now(), error: null });
      }
    })
    .catch((e) => {
      pending = true;
      setSync({ status: 'offline', error: friendly(e) });
    })
    .finally(() => { inflight = null; });
  return inflight;
}

onLocalChange(() => {
  if (!user) return;
  pending = true;
  setSync({ status: 'pending' });
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushNow, 1500);
});

addEventListener('online', () => (pending ? pushNow() : pull()));
document.addEventListener('visibilitychange', () => {
  if (!user) return;
  if (document.visibilityState === 'hidden') pushNow();
  else pull(); // voltou ao app: pega mudanças feitas em outro aparelho
});

export const syncNow = () => (pending ? pushNow() : pull());

// --- Fotos no Storage (bucket privado "photos", pasta = id do usuário) -------------------

const QUEUE_KEY = 'fitquest.photoQueue';
const queue = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } };
const setQueue = (q) => { try { localStorage.setItem(QUEUE_KEY, JSON.stringify([...new Set(q)])); } catch { /* ignore */ } };

const pathOf = (id) => `${user.id}/${id}.jpg`;

async function dataUrlToBlob(dataUrl) {
  return (await fetch(dataUrl)).blob();
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

const photoRemote = {
  async upload(rec) {
    if (!user) return;
    const { error } = await sb.storage.from('photos').upload(pathOf(rec.id), await dataUrlToBlob(rec.data), { upsert: true, contentType: 'image/jpeg' });
    if (error) {
      setQueue([...queue(), rec.id]);
      throw error;
    }
    setQueue(queue().filter((x) => x !== rec.id));
  },
  async download(id) {
    if (!user) return undefined;
    const { data, error } = await sb.storage.from('photos').download(pathOf(id));
    if (error || !data) return undefined;
    return { id, data: await blobToDataUrl(data) };
  },
  async remove(id) {
    if (!user) return;
    setQueue(queue().filter((x) => x !== id));
    await sb.storage.from('photos').remove([pathOf(id)]);
  },
};

async function retryPhotos() {
  const { getPhoto } = await import('./photos.js');
  for (const id of queue()) {
    const rec = await getPhoto(id);
    if (rec) photoRemote.upload(rec).catch(() => {});
    else setQueue(queue().filter((x) => x !== id));
  }
}

// --- Ciclo de vida da sessão ---------------------------------------------------------------

function onUser(u) {
  if ((u?.id ?? null) === (user?.id ?? null)) {
    auth = { ready: true, user: u };
    notify();
    return;
  }
  user = u;
  pending = false;
  if (u) {
    // Dados que já estavam no aparelho são adotados pela conta; pull() compara
    // updatedAt com a nuvem e envia ou baixa o que for mais recente.
    switchAccount(u.id);
    setPhotoRemote(photoRemote);
    auth = { ready: true, user: u };
    notify();
    // fora do callback de auth do supabase-js (chamadas dentro dele podem travar)
    setTimeout(pull, 0);
  } else {
    setPhotoRemote(null);
    switchAccount(null);
    auth = { ready: true, user: null };
    setSync({ status: 'idle', at: null, error: null });
  }
}

if (cloudEnabled) {
  // getSession lê a sessão salva no aparelho (funciona offline)
  sb.auth.getSession().then(({ data }) => onUser(data.session?.user ?? null)).catch(() => onUser(null));
  sb.auth.onAuthStateChange((_event, session) => onUser(session?.user ?? null));
}

export const currentUserId = () => auth.user?.id ?? null;
export const currentUsername = () => auth.user?.user_metadata?.username ?? auth.user?.email ?? '';
