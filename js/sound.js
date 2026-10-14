// Alarme do descanso e “tela sempre ligada” durante o treino.
//
// iPhone: o áudio só pode tocar se foi liberado por um toque do usuário; por isso
// prime() é chamado no toque que marca a série (✓) e no "Iniciar". O AudioContext fica
// vivo e o alarme toca depois sem bloqueio.
//
// Música de outros apps (Spotify, Apple Music…): o app declara a sessão de áudio como
// 'ambient' — sons que se MISTURAM com a música, sem pausá-la. Nada de <audio>/mídia
// (isso faria o iOS pausar a música). Só durante o alarme/voz a sessão vira 'transient',
// que pede ao sistema para abaixar a música por alguns segundos (iOS 16.4+).

let ctx = null;
const BASE_SESSION = 'ambient';

function audioCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  return ctx;
}

// Chamar dentro de um toque/clique.
export function prime() {
  try {
    const c = audioCtx();
    if (c && c.state !== 'running') c.resume();
    // toca um buffer silencioso: no iOS isso "destrava" o áudio da página
    if (c) {
      const b = c.createBuffer(1, 1, 22050);
      const src = c.createBufferSource();
      src.buffer = b;
      src.connect(c.destination);
      src.start(0);
    }
  } catch { /* sem áudio */ }
}

function setSession(type) {
  try {
    if (navigator.audioSession) navigator.audioSession.type = type === 'auto' ? BASE_SESSION : type;
  } catch { /* não suportado */ }
}
setSession(BASE_SESSION);

// Três sequências de bipes fortes (~2,5 s). Música de fundo é abaixada durante o alarme.
export async function alarm() {
  navigator.vibrate?.([300, 120, 300, 120, 500]);
  const c = audioCtx();
  if (!c) return;
  setSession('transient');
  try {
    if (c.state !== 'running') await c.resume();
    const t0 = c.currentTime + 0.05;
    const master = c.createGain();
    master.gain.value = 1;
    // compressor deixa o som mais "cheio" sem distorcer
    const comp = c.createDynamicsCompressor();
    master.connect(comp).connect(c.destination);
    const notes = [0, 0.18, 0.36, 0.8, 0.98, 1.16, 1.6, 1.78, 1.96];
    notes.forEach((dt, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'square';
      o.frequency.value = i % 3 === 2 ? 1320 : 990;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.9, t0 + dt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.15);
      o.connect(g).connect(master);
      o.start(t0 + dt);
      o.stop(t0 + dt + 0.16);
    });
    setTimeout(() => setSession('auto'), 2600);
  } catch {
    setSession('auto');
  }
}

// --- Tela sempre ligada (Wake Lock) ------------------------------------------------------

let lock = null;
let wanted = false;

export async function keepAwake(on) {
  wanted = on;
  try {
    if (on && !lock && 'wakeLock' in navigator) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener?.('release', () => { lock = null; });
    } else if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch { /* não suportado ou negado */ }
}

// o sistema solta o wake lock quando o app vai para o fundo; pede de novo ao voltar
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wanted) keepAwake(true);
});


// --- Avisos por voz (parciais de km, troca de etapa) -------------------------------------
// No iPhone a fala precisa ser "destravada" por um toque: primeVoice() no botão de iniciar.

export function primeVoice() {
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch { /* sem voz */ }
}

export function speak(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    setSession('transient');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    const v = speechSynthesis.getVoices().find((x) => x.lang?.replace('_', '-').startsWith('pt-BR'));
    if (v) u.voice = v;
    u.rate = 1.05;
    u.onend = () => setSession('auto');
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* sem voz */ }
}

// "5:32" → "5 minutos e 32" (para falar o pace)
export function sayDuration(sec) {
  sec = Math.round(sec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (!m) return `${s} segundos`;
  return s ? `${m} ${m === 1 ? 'minuto' : 'minutos'} e ${s}` : `${m} ${m === 1 ? 'minuto' : 'minutos'}`;
}

// Bipe curto (contagem regressiva das etapas). long = bipe final, mais grave e longo.
export function beep(long = false) {
  const c = audioCtx();
  if (!c) return;
  try {
    if (c.state !== 'running') c.resume();
    const t0 = c.currentTime + 0.02;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'square';
    o.frequency.value = long ? 1320 : 880;
    const len = long ? 0.45 : 0.12;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.8, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + len + 0.02);
  } catch { /* sem áudio */ }
}
