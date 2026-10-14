// Shell do app: roteamento por hash, barra superior, navegação e feedback de XP.
import { html, render, useEffect, useRef, useState } from './lib.js';
import { useStore, getState, getEpoch } from './store.js';
import { cloudEnabled, useAuth } from './cloud.js';
import { AuthView, Splash } from './views/auth.js';
import { computeGame } from './game.js';
import { Icon, toast } from './ui.js';
import { dateKey } from './util.js';
import { go } from './nav.js';
import { Onboarding } from './views/onboarding.js';
import { TodayView } from './views/today.js';
import { TrainingView } from './views/training.js';
import { DietView } from './views/diet.js';
import { BodyView } from './views/body.js';
import { JourneyView } from './views/journey.js';
import { SettingsView } from './views/settings.js';
import { SocialView } from './views/social.js';
import './social.js';

const TABS = [
  ['hoje', 'Hoje', 'today'],
  ['treino', 'Treino', 'train'],
  ['dieta', 'Dieta', 'diet'],
  ['corpo', 'Corpo', 'body'],
  ['jornada', 'Jornada', 'trophy'],
  ['social', 'Social', 'users'],
];

function parseHash() {
  const [route, ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  return { route: route || 'hoje', params: rest };
}

function useRoute() {
  const [r, set] = useState(parseHash());
  useEffect(() => {
    const on = () => {
      set(parseHash());
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return r;
}

function useTheme(theme) {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0d0d0d' : '#f1efe8');
  }, [theme]);
}

// Mostra "+XP" e "LEVEL UP" quando o XP derivado sobe.
function useXpFeedback(game) {
  const prev = useRef(null);
  useEffect(() => {
    const p = prev.current;
    prev.current = { xp: game.totalXp, level: game.level.level, ach: game.achievements.filter((a) => a.unlocked).map((a) => a.id), epoch: getEpoch() };
    if (!p || p.epoch !== getEpoch()) return;
    const gained = game.totalXp - p.xp;
    if (gained > 0) toast(`+${gained} XP`, 'xp');
    if (game.level.level > p.level) setTimeout(() => toast(`LEVEL UP → LV ${game.level.level} · ${game.level.title.toUpperCase()}`, 'xp'), 400);
    const newAch = game.achievements.filter((a) => a.unlocked && !p.ach.includes(a.id));
    newAch.forEach((a, i) => setTimeout(() => toast(`CONQUISTA: ${a.name.toUpperCase()}`), 800 + i * 400));
  }, [game.totalXp]);
}

function useOnline() {
  const [on, set] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => set(true);
    const b = () => set(false);
    addEventListener('online', a);
    addEventListener('offline', b);
    return () => { removeEventListener('online', a); removeEventListener('offline', b); };
  }, []);
  return on;
}

function TopBar({ game }) {
  const lv = game.level;
  const online = useOnline();
  return html`
    <header class="topbar">
      <div class="topbar-in">
        <button class="brand" onClick=${() => go('hoje')} aria-label="Início">
          <span class="brand-mark">FQ</span><span class="hide-xs">FitQuest</span>
        </button>
        <div class="spacer"></div>
        ${!online && html`<span class="net-chip" title="Sem internet: tudo continua salvo no aparelho e sincroniza depois">OFFLINE</span>`}
        <button class="lvl-chip" onClick=${() => go('jornada')} aria-label=${`Nível ${lv.level}`} style="cursor:pointer">
          <span class="lv">LV ${lv.level}</span>
          <span class="track"><i style=${`width:${Math.round(lv.pct * 100)}%`}></i></span>
        </button>
        <span class=${`streak-chip ${game.streak > 0 ? 'on' : ''}`} title="Sequência de dias ativos">${game.streak}D</span>
        <button class="icon-btn" onClick=${() => go('config')} aria-label="Configurações"><${Icon} name="gear" /></button>
      </div>
    </header>
  `;
}

function Nav({ route }) {
  return html`
    <nav class="nav" aria-label="Principal">
      <div class="nav-in">
        ${TABS.map(([key, label, icon]) => html`
          <button class=${route === key ? 'on' : ''} onClick=${() => go(key)} aria-current=${route === key ? 'page' : null}>
            <${Icon} name=${icon} /><span>${label}</span>
          </button>
        `)}
      </div>
    </nav>
  `;
}

function App() {
  const auth = useAuth();
  const s = useStore();
  const { route, params } = useRoute();
  useTheme(s.settings.theme);
  const [today, setToday] = useState(dateKey());

  // Vira o dia automaticamente se o app ficar aberto.
  useEffect(() => {
    const t = setInterval(() => setToday(dateKey()), 60000);
    return () => clearInterval(t);
  }, []);

  const game = computeGame(s, today);
  useXpFeedback(game);

  if (cloudEnabled && !auth.ready) return html`<${Splash} />`;
  if (cloudEnabled && !auth.user) return html`<${AuthView} />`;
  if (!s.profile) return html`<${Onboarding} />`;

  let view;
  switch (route) {
    case 'treino': view = html`<${TrainingView} s=${s} params=${params} today=${today} />`; break;
    case 'dieta': view = html`<${DietView} s=${s} params=${params} today=${today} />`; break;
    case 'corpo': view = html`<${BodyView} s=${s} params=${params} today=${today} />`; break;
    case 'jornada': view = html`<${JourneyView} s=${s} game=${game} today=${today} />`; break;
    case 'config': view = html`<${SettingsView} s=${s} />`; break;
    case 'social': view = html`<${SocialView} s=${s} />`; break;
    default: view = html`<${TodayView} s=${s} game=${game} today=${today} />`;
  }

  return html`
    <div class="shell">
      <${TopBar} game=${game} />
      <main class="main">${view}</main>
      <${Nav} route=${route} />
    </div>
  `;
}

render(html`<${App} />`, document.getElementById('app'));

// iPhone: "Agitar para Desfazer". O iOS só oferece desfazer quando o campo tem histórico
// de digitação; regravar o valor por código apaga esse histórico. Fazemos isso logo após
// cada pausa na digitação e ao sair do campo — assim nunca há o que desfazer e o aviso
// não aparece. Se o desfazer for acionado mesmo assim, ele é cancelado.
const TEXT_TYPES = ['text', 'search', 'email', 'password', 'tel', 'url', 'number', ''];
const isTextField = (el) => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && TEXT_TYPES.includes(el.type)));
function clearUndo(el) {
  if (!isTextField(el)) return;
  const v = el.value;
  let a = null, b = null;
  try { a = el.selectionStart; b = el.selectionEnd; } catch { /* type sem seleção */ }
  el.value = '';
  el.value = v;
  try { if (a != null && document.activeElement === el) el.setSelectionRange(a, b); } catch { /* ignore */ }
}
let undoTimer = 0;
document.addEventListener('input', (e) => {
  if (e.isComposing || !isTextField(e.target)) return;
  clearTimeout(undoTimer);
  const el = e.target;
  undoTimer = setTimeout(() => clearUndo(el), 350);
}, true);
document.addEventListener('compositionend', (e) => clearUndo(e.target), true);
document.addEventListener('focusout', (e) => clearUndo(e.target), true);
document.addEventListener('beforeinput', (e) => {
  if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') e.preventDefault();
}, true);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // Quando uma versão nova do app assume, recarrega uma vez para usá-la já.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
      // app instalado no iPhone quase nunca "reinicia": verifica atualização ao voltar para ele
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update().catch(() => {}));
    }).catch(() => {});
  });
}

// Expor para depuração no console.
window.fitquest = { getState };
