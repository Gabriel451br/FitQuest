// Componentes de UI compartilhados.
import { html, render, useEffect, useState } from './lib.js';
import { num, clamp } from './util.js';

// --- Ícones (traço 2px, quadrados — combina com o visual brutalista) ---------
const PATHS = {
  today: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4',
  train: 'M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12',
  diet: 'M7 3v8a3 3 0 0 0 3 3v7M10 3v6M4 3v6a3 3 0 0 0 3 3M17 3c-2 0-3 3-3 6s1 4 3 4v8',
  body: 'M12 4a2 2 0 1 0 0 .01M7 8h10l-2 6v7M9 14v7M7 8l-2 5M17 8l2 5',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a3 3 0 0 0 4 3M16 6h4v2a3 3 0 0 1-4 3M12 13v4M8 20h8M9 17h6v3H9z',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6 6 18',
  chev: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  camera: 'M3 7h4l2-3h6l2 3h4v13H3zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8',
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1 1 2 2 3 4 0-3 0-5 0-7z',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  swap: 'M4 8h13l-3-3M20 16H7l3 3',
  play: 'M7 4l13 8-13 8z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5',
  water: 'M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 11.5v1',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  download: 'M12 4v11M7 10l5 5 5-5M4 20h16',
  upload: 'M12 20V9M7 14l5-5 5 5M4 4h16',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-6 7-6s7 2.5 7 6M17 11a3 3 0 1 0 0-6M19 14c2 .7 3 2.5 3 6',
  heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5 21 21',
  run: 'M14 4a1.5 1.5 0 1 0 0 .01M9 20l3-6 3 2v5M7 11l3-3 4 1 2 3 3 1M12 14l-2-3',
  walk: 'M12 4a1.5 1.5 0 1 0 0 .01M10 21l2-7 3 3v4M9 12l2-4h2l2 4 2 1M12 14l-1-3',
  bike: 'M6 17a3 3 0 1 0 0 .01M18 17a3 3 0 1 0 0 .01M6 17l4-7h5l3 7M10 10l2 7h3M14 6h2',
  swim: 'M3 18c2 0 2-1.5 4.5-1.5S9.5 18 12 18s2-1.5 4.5-1.5S19 18 21 18M7 13l4-4 3 3M15 7a1.5 1.5 0 1 0 0 .01',
  ball: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 9h17M3.5 15h17M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18',
};

// Tamanho padrão 20px; regras de CSS específicas (nav, botões) podem sobrescrever.
export function Icon({ name, size = 20 }) {
  return html`<svg viewBox="0 0 24 24" width=${size} height=${size} style="flex:none" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d=${PATHS[name] ?? ''} /></svg>`;
}

// --- Modal (bottom sheet) ----------------------------------------------------
// Janelas empilháveis: cada uma tem seu próprio container, então abrir uma
// (ex.: escolher exercício) por cima de outra (editar treino) preserva a de baixo.
const modalStack = [];

export function openModal(renderFn) {
  const host = document.createElement('div');
  host.className = 'modal-layer';
  host.style.position = 'relative';
  host.style.zIndex = String(100 + modalStack.length);
  document.body.appendChild(host);
  modalStack.push(host);
  document.body.style.overflow = 'hidden';
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    render(null, host);
    host.remove();
    modalStack.splice(modalStack.indexOf(host), 1);
    if (!modalStack.length) document.body.style.overflow = '';
  };
  render(html`<${ModalRoot} renderFn=${renderFn} close=${close} host=${host} />`, host);
  return close;
}

function ModalRoot({ renderFn, close, host }) {
  useEffect(() => {
    // Esc fecha só a janela do topo
    const onKey = (e) => e.key === 'Escape' && modalStack[modalStack.length - 1] === host && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return renderFn(close);
}

// full: ocupa a tela a partir do topo (bom para busca: o teclado não empurra o conteúdo).
// sub: área fixa abaixo do título (ex.: campo de busca), fora da rolagem.
export function Sheet({ title, onClose, children, footer, full, sub }) {
  return html`
    <div class=${`overlay ${full ? 'top' : ''}`} onClick=${(e) => e.target === e.currentTarget && onClose()}>
      <div class=${`sheet ${full ? 'full' : ''}`} role="dialog" aria-modal="true" aria-label=${title}>
        <div class="sheet-head">
          <h2>${title}</h2>
          <button class="icon-btn" onClick=${onClose} aria-label="Fechar"><${Icon} name="x" /></button>
        </div>
        ${sub && html`<div class="sheet-sub">${sub}</div>`}
        <div class="sheet-body">${children}</div>
        ${footer && html`<div class="sheet-foot">${footer}</div>`}
      </div>
    </div>
  `;
}

export function confirmDialog(message, { ok = 'Confirmar', danger = true } = {}) {
  return new Promise((resolve) => {
    const close = openModal((c) => html`
      <${Sheet}
        title="Confirmar"
        onClose=${() => { c(); resolve(false); }}
        footer=${html`
          <button class="btn grow" onClick=${() => { c(); resolve(false); }}>Cancelar</button>
          <button class=${`btn grow ${danger ? 'danger' : 'primary'}`} onClick=${() => { c(); resolve(true); }}>${ok}</button>
        `}
      >
        <p>${message}</p>
      <//>
    `);
    return close;
  });
}

// --- Toasts -------------------------------------------------------------------
let toastHost = null;
let toasts = [];

export function toast(msg, kind = '') {
  if (!toastHost) {
    toastHost = document.createElement('div');
    document.body.appendChild(toastHost);
  }
  const id = Math.random();
  toasts = [...toasts, { id, msg, kind }].slice(-3);
  drawToasts();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    drawToasts();
  }, 2600);
}

function drawToasts() {
  render(html`<div class="toast-wrap" aria-live="polite">${toasts.map((t) => html`<div key=${t.id} class=${`toast ${t.kind}`}>${t.msg}</div>`)}</div>`, toastHost);
}

// --- Form ---------------------------------------------------------------------
export function Field({ label, hint, children }) {
  return html`<label class="field"><span>${label}</span>${children}${hint && html`<small class="hint">${hint}</small>`}</label>`;
}

export function NumInput({ value, onInput, unit, placeholder, step = 'any', min, max, ...rest }) {
  return html`
    <div class="input-unit">
      <input
        class="input num"
        type="number"
        inputmode="decimal"
        step=${step}
        min=${min}
        max=${max}
        placeholder=${placeholder}
        value=${value ?? ''}
        onInput=${(e) => onInput(e.target.value === '' ? null : Number(e.target.value))}
        ...${rest}
      />
      ${unit && html`<em>${unit}</em>`}
    </div>
  `;
}

export function Seg({ options, value, onChange }) {
  return html`
    <div class="seg" role="radiogroup">
      ${options.map(([v, label]) => html`
        <button type="button" role="radio" aria-checked=${value === v} class=${value === v ? 'on' : ''} onClick=${() => onChange(v)}>${label}</button>
      `)}
    </div>
  `;
}

export function Check({ checked, onChange, children }) {
  return html`
    <label class=${`check ${checked ? 'on' : ''}`}>
      <input type="checkbox" checked=${checked} onChange=${(e) => onChange(e.target.checked)} />
      <span>${children}</span>
    </label>
  `;
}

// --- Indicadores --------------------------------------------------------------
export function Bar({ value, max, cls = '', mark }) {
  const pct = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  const over = max > 0 && value > max * 1.1;
  return html`
    <div class=${`bar ${cls} ${over ? 'over' : ''}`}>
      <i style=${`width:${pct}%`}></i>
      ${mark != null && html`<span class="mark" style=${`left:${clamp(mark, 0, 100)}%`}></span>`}
    </div>
  `;
}

export function MacroRow({ label, color, value, target, unit = 'g' }) {
  return html`
    <div class="macro-row">
      <span class="lbl"><i class=${`dot bg-${color}`}></i>${label}</span>
      <div class="bar sm"><i class=${`bg-${color}`} style=${`width:${target ? clamp((value / target) * 100, 0, 100) : 0}%`}></i></div>
      <span class="num small"><b>${num(value)}</b><span class="muted">/${num(target)}${unit}</span></span>
    </div>
  `;
}

export function Ring({ value, target, label = 'kcal' }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = target ? clamp(value / target, 0, 1) : 0;
  const over = target && value > target * 1.1;
  return html`
    <div class="ring-wrap">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r=${r} fill="none" stroke="var(--surface-2)" stroke-width="14" />
        <circle cx="60" cy="60" r=${r} fill="none" stroke=${over ? 'var(--danger)' : 'var(--ink)'} stroke-width="14" stroke-dasharray=${`${c * pct} ${c}`} stroke-linecap="butt" />
        <circle cx="60" cy="60" r="44" fill="none" stroke="var(--line)" stroke-width="2" />
        <circle cx="60" cy="60" r="59" fill="none" stroke="var(--line)" stroke-width="2" />
      </svg>
      <div class="ring-c">
        <div>
          <div class="num" style="font-size:24px;font-weight:700;letter-spacing:-0.04em">${num(value)}</div>
          <div class="eyebrow" style="line-height:1.2">/ ${num(target)}<br />${label}</div>
        </div>
      </div>
    </div>
  `;
}

export function Stat({ v, unit, l }) {
  return html`<div class="stat"><div class="v">${v}${unit && html`<small>${unit}</small>`}</div><div class="l">${l}</div></div>`;
}

export function Empty({ title, text, action }) {
  return html`<div class="empty"><h3 class="up">${title}</h3>${text && html`<p>${text}</p>`}${action}</div>`;
}

export function useNow(ms = 1000) {
  const [now, set] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => set(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
