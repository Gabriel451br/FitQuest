// Alarme do descanso e “tela sempre ligada” durante o treino.
//
// iPhone: o áudio só pode tocar se foi liberado por um toque do usuário; por isso
// prime() é chamado no toque que marca a série (✓). O AudioContext fica vivo e
// o alarme toca depois sem bloqueio. navigator.audioSession = 'transient' pede ao
// sistema para ABAIXAR a música de outros apps enquanto o alarme toca (iOS 16.4+).

let ctx = null;
let unlockedEl = null;

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
    if (!unlockedEl) {
      unlockedEl = new Audio(SILENT_WAV);
      unlockedEl.play().catch(() => {});
    }
  } catch { /* sem áudio */ }
}

function setSession(type) {
  try {
    if (navigator.audioSession) navigator.audioSession.type = type;
  } catch { /* não suportado */ }
}

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

// WAV silencioso de 0,05 s (só para destravar o áudio no iOS)
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
