// Loja de programas (estilo Boostcamp): catálogo com filtros, página do programa e
// "Começar". Programas próprios podem ser cadastrados na loja e compartilhados por código.
import { html, useState } from '../lib.js';
import { update, getState, exerciseById } from '../store.js';
import { Icon, openModal, Sheet, toast, confirmDialog, Empty } from '../ui.js';
import { PROGRAM_TEMPLATES, instantiateProgram } from '../data/programs.js';
import { SPLIT_TEMPLATES } from '../data/exercises.js';
import { BLOCK_GOALS, PROGRESSIONS, weekGuide, DEFAULT_WEEK_PLAN } from '../programs.js';
import { followProgram } from '../actions.js';
import { openProgram } from './programs.js';
import { uid } from '../util.js';

const GOAL_LABEL = { forca: 'Força', hipertrofia: 'Hipertrofia', potencia: 'Potência', strongman: 'Strongman', 'jiu-jitsu': 'Jiu-Jitsu', iniciante: 'Iniciante', geral: 'Condicionamento' };
const SPLIT_COVERS = { fullbody: '#2f5bff', upperlower: '#0f9d76', ppl: '#7a3cff', abc: '#c8102e' };

// Rotinas simples (modelos antigos) viram programas de 1 bloco na loja.
function splitTemplates() {
  return Object.fromEntries(Object.entries(SPLIT_TEMPLATES).map(([k, t]) => [`split-${k}`, {
    name: t.name, author: 'FitQuest', cover: SPLIT_COVERS[k] ?? '#444', tagline: t.workouts.map((w) => w.name).join(' · '),
    level: 'Iniciante', days: t.workouts.length === 2 ? 3 : t.workouts.length, sessionMin: 60, goals: ['hipertrofia', 'iniciante'], equipment: 'Academia',
    desc: `Rotina clássica com ${t.workouts.length} treinos em rodízio. Progressão dupla: complete o topo da faixa em todas as séries e suba a carga.`,
    blocks: [{
      name: 'Bloco único — Base', goal: 'hipertrofia', weeks: 8, progression: 'double', weekPlan: DEFAULT_WEEK_PLAN,
      objective: 'Construir base de força e massa com volume moderado e técnica consistente.',
      workouts: t.workouts.map((w) => ({ name: w.name, exercises: w.exercises.map((exId, i) => ({ exId, sets: i < 2 ? 4 : 3, reps: i < 2 ? '6-10' : '10-15', rest: i < 2 ? 150 : 90 })) })),
    }],
  }]));
}

export function storeCatalog(s = getState()) {
  const own = Object.fromEntries((s.storePrograms ?? []).map((t) => [t.key, { ...t, custom: true }]));
  return { ...PROGRAM_TEMPLATES, ...splitTemplates(), ...own };
}

const totalWeeks = (t) => t.blocks.reduce((a, b) => a + (b.weeks || 0), 0);
const installedOf = (s, key) => (s.programs ?? []).find((p) => p.template === key);

export function installTemplate(key, t) {
  const { folder, workouts, program } = instantiateProgram(key, uid, t);
  update((st) => {
    (st.workoutFolders ??= []).push(folder);
    st.workouts.push(...workouts);
    (st.programs ??= []).push(program);
  });
  return program.id;
}

// Programa meu → modelo da loja (com os treinos atuais de cada bloco).
export function programToTemplate(s, p) {
  return {
    name: p.name, author: s.profile?.name ? `por ${s.profile.name}` : 'Meu programa', cover: p.meta?.cover ?? '#0b0b0b', tagline: p.meta?.tagline ?? '',
    level: p.meta?.level ?? 'Intermediário', days: p.meta?.days ?? Math.max(...p.blocks.map((b) => b.workoutIds.length)), sessionMin: p.meta?.sessionMin ?? 60,
    goals: p.meta?.goals ?? [...new Set(p.blocks.map((b) => b.goal))], equipment: p.meta?.equipment ?? 'Academia',
    desc: p.desc ?? '', rules: p.rules ?? [], sections: p.sections ?? [], schedule: p.schedule ?? null,
    blocks: p.blocks.map((b) => ({
      name: b.name, goal: b.goal, weeks: b.weeks, progression: b.progression, weekPlan: b.weekPlan ?? null, objective: b.objective ?? '', criteria: b.criteria ?? '',
      workouts: b.workoutIds.map((id) => s.workouts.find((w) => w.id === id)).filter(Boolean).map((w) => ({
        name: w.name, ...(w.warmup ? { warmup: w.warmup } : {}), ...(w.short ? { short: w.short } : {}),
        exercises: w.exercises.map((e) => ({ ...e })),
      })),
    })),
  };
}

// Código para compartilhar (texto colável em qualquer app de mensagem).
export function encodeProgram(t) {
  const { custom, key, ...clean } = t;
  return `FQP1:${btoa(unescape(encodeURIComponent(JSON.stringify(clean))))}`;
}
export function decodeProgram(code) {
  const raw = String(code).trim().replace(/^FQP1:/, '');
  const t = JSON.parse(decodeURIComponent(escape(atob(raw))));
  if (!t?.name || !Array.isArray(t.blocks) || !t.blocks.every((b) => Array.isArray(b.workouts) && b.workouts.every((w) => Array.isArray(w.exercises)))) throw new Error('Código inválido');
  return t;
}

function addToStore(t) {
  const key = `u-${uid()}`;
  update((st) => { (st.storePrograms ??= []).push({ ...t, key }); });
  return key;
}

// --- Telas -------------------------------------------------------------------------------

export function ProgramsHub({ s, children }) {
  const [view, setView] = useState('loja');
  return html`
    <div class="stack">
      <div class="seg">
        <button class=${view === 'loja' ? 'on' : ''} onClick=${() => setView('loja')}>Loja</button>
        <button class=${view === 'meus' ? 'on' : ''} onClick=${() => setView('meus')}>Meus programas (${(s.programs ?? []).length})</button>
      </div>
      ${view === 'loja' ? html`<${StoreTab} s=${s} />` : children}
    </div>
  `;
}

const FILTERS = [['todos', 'Todos'], ['forca', 'Força'], ['hipertrofia', 'Hipertrofia'], ['strongman', 'Strongman'], ['jiu-jitsu', 'Jiu-Jitsu'], ['iniciante', 'Iniciante'], ['meus', 'Cadastrados por mim']];

function StoreTab({ s }) {
  const [q, setQ] = useState('');
  const [f, setF] = useState('todos');
  const cat = storeCatalog(s);
  const list = Object.entries(cat).filter(([, t]) => {
    if (f === 'meus' && !t.custom) return false;
    if (f !== 'todos' && f !== 'meus' && !(t.goals ?? []).includes(f)) return false;
    const n = `${t.name} ${t.tagline ?? ''} ${t.author ?? ''}`.toLowerCase();
    return !q || n.includes(q.toLowerCase());
  });
  return html`
    <div class="stack">
      <input class="input" type="search" placeholder="Buscar programa…" value=${q} onInput=${(e) => setQ(e.target.value)} />
      <div class="chips" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px">
        ${FILTERS.map(([k, l]) => html`<button class=${`chip ${f === k ? 'on' : ''}`} style="white-space:nowrap" onClick=${() => setF(k)}>${l}</button>`)}
      </div>
      <div class="store-grid">
        ${list.map(([key, t]) => html`<${StoreCard} key=${key} k=${key} t=${t} s=${s} />`)}
      </div>
      ${!list.length && html`<${Empty} title="Nada encontrado" text="Tente outro filtro ou cadastre um programa seu na loja." />`}
      <div class="card stack-sm">
        <h3 class="up">Cadastrar na loja</h3>
        <p class="small muted">Publique um programa seu para reutilizar quando quiser, ou importe um programa que alguém compartilhou com você por código.</p>
        <div class="row wrap">
          <button class="btn sm" onClick=${() => openPublish()}><${Icon} name="upload" size="16" />Publicar programa meu</button>
          <button class="btn sm" onClick=${() => openImport()}><${Icon} name="download" size="16" />Importar código</button>
        </div>
      </div>
    </div>
  `;
}

function StoreCard({ k, t, s }) {
  const inst = installedOf(s, k);
  const on = inst && s.activeProgramId === inst.id;
  return html`
    <button class="store-card" onClick=${() => openStoreProgram(k)}>
      <div class="store-cover" style=${`--cover:${t.cover ?? '#0b0b0b'}`}>
        <span class="store-author">${t.author ?? ''}</span>
        <b>${t.name}</b>
        ${on ? html`<span class="tag acc">Seguindo</span>` : inst ? html`<span class="tag">Adicionado</span>` : t.custom ? html`<span class="tag">Meu</span>` : ''}
      </div>
      <div class="store-body">
        ${t.tagline && html`<p class="small">${t.tagline}</p>`}
        <div class="store-stats">
          <span><b>${totalWeeks(t)}</b> sem.</span><span><b>${t.days ?? '—'}</b>×/sem.</span><span><b>${t.sessionMin ?? '—'}</b> min</span><span>${t.level ?? ''}</span>
        </div>
        <div class="row wrap" style="gap:4px">${(t.goals ?? []).slice(0, 3).map((g) => html`<span class="tag">${GOAL_LABEL[g] ?? g}</span>`)}</div>
      </div>
    </button>
  `;
}

export function openStoreProgram(key) {
  openModal((close) => html`<${StoreProgram} k=${key} close=${close} />`);
}

function StoreProgram({ k, close }) {
  const s = getState();
  const t = storeCatalog(s)[k];
  const [bi, setBi] = useState(0);
  const [openW, setOpenW] = useState(null);
  if (!t) return null;
  const inst = installedOf(s, k);
  const b = t.blocks[bi];
  const start = () => {
    const id = inst?.id ?? installTemplate(k, t);
    followProgram(id);
    toast(`Começando: ${t.name}`);
    close();
  };
  const share = async () => {
    const code = encodeProgram(t);
    try { await navigator.clipboard.writeText(code); toast('Código copiado — cole numa mensagem'); } catch { prompt('Copie o código do programa:', code); }
  };
  const removeFromStore = async () => {
    if (!(await confirmDialog(`Remover "${t.name}" da loja? Se você já adicionou, ele continua nos seus programas.`, { ok: 'Remover' }))) return;
    update((st) => { st.storePrograms = (st.storePrograms ?? []).filter((x) => x.key !== k); });
    close();
  };
  return html`
    <${Sheet} title="Programa" onClose=${close} full footer=${html`
      ${inst && html`<button class="btn" onClick=${() => { close(); openProgram(inst.id); }}>Ver meu progresso</button>`}
      <button class="btn primary grow" onClick=${start}><${Icon} name="play" />${inst ? (s.activeProgramId === inst.id ? 'Continuar programa' : 'Seguir programa') : 'Começar programa'}</button>
    `}>
      <div class="store-cover big" style=${`--cover:${t.cover ?? '#0b0b0b'}`}>
        <span class="store-author">${t.author ?? ''}</span>
        <b>${t.name}</b>
        ${t.tagline && html`<span class="small" style="opacity:.85">${t.tagline}</span>`}
      </div>
      <div class="store-stats big">
        <span><b>${totalWeeks(t)}</b>semanas</span><span><b>${t.days ?? '—'}</b>dias/sem.</span><span><b>${t.sessionMin ?? '—'}</b>min/treino</span><span><b>${t.blocks.length}</b>${t.blocks.length > 1 ? 'blocos' : 'bloco'}</span>
      </div>
      <div class="row wrap" style="gap:6px">
        ${t.level && html`<span class="tag fill">${t.level}</span>`}
        ${(t.goals ?? []).map((g) => html`<span class="tag">${GOAL_LABEL[g] ?? g}</span>`)}
        ${t.equipment && html`<span class="tag">${t.equipment}</span>`}
      </div>
      ${t.desc && html`<p class="small">${t.desc}</p>`}
      ${t.schedule && html`
        <div class="stack-sm">
          <div class="eyebrow">Semana típica</div>
          <div class="sched">${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d, i) => html`<div class=${`sd ${/^[A-Z]$/.test(t.schedule[i]) ? 'lift' : /off/i.test(t.schedule[i]) ? 'off' : 'other'}`}><i>${d}</i><b>${t.schedule[i]}</b></div>`)}</div>
        </div>`}
      ${t.rules?.length > 0 && html`<details class="fold"><summary><span>Regras do programa</span></summary><div class="card tight"><ul class="nutri-list">${t.rules.map((r) => html`<li>${r}</li>`)}</ul></div></details>`}

      <div class="stack-sm">
        <div class="eyebrow">Estrutura</div>
        ${t.blocks.length > 1 && html`<div class="chips">${t.blocks.map((x, i) => html`<button class=${`chip ${bi === i ? 'on' : ''}`} onClick=${() => { setBi(i); setOpenW(null); }}>${x.name.split(' — ')[0]}</button>`)}</div>`}
        <div class="card tight stack-sm">
          <div class="row-sb"><b>${b.name}</b><span class="mono tiny">${b.weeks} sem.</span></div>
          <div class="row wrap" style="gap:6px"><span class="tag acc">${BLOCK_GOALS[b.goal] ?? b.goal}</span><span class="tag">${PROGRESSIONS[b.progression]?.label ?? ''}</span></div>
          ${b.objective && html`<p class="small">${b.objective}</p>`}
          <div class="week-plan">
            ${Array.from({ length: b.weeks }, (_, i) => {
              const g = weekGuide(b, i + 1);
              return html`<div class=${`wp ${g.deload ? 'deload' : ''} ${g.test ? 'test' : ''}`}><i>S${i + 1}</i><b>${g.deload ? 'Deload' : g.test ? 'Teste' : g.rpe ? `RPE ${g.rpe}` : '—'}</b></div>`;
            })}
          </div>
        </div>
        <div class="list">
          ${b.workouts.map((w, wi) => html`
            <div key=${wi}>
              <button class="li btnlike" onClick=${() => setOpenW(openW === wi ? null : wi)}>
                <div class="grow"><div class="t">${w.name}</div><div class="s">${w.exercises.length} exercícios${w.sessionMin ? ` · ~${w.sessionMin} min` : ''}</div></div>
                <span>${openW === wi ? '▾' : '▸'}</span>
              </button>
              ${openW === wi && html`<${WorkoutPreview} s=${s} w=${w} />`}
            </div>`)}
        </div>
      </div>
      ${(t.sections ?? []).map((sec) => html`<details class="fold"><summary><span>${sec.title}</span></summary><div class="card tight"><ul class="nutri-list">${sec.items.map((x) => html`<li>${x}</li>`)}</ul></div></details>`)}
      ${t.custom && html`
        <div class="row">
          <button class="btn sm grow" onClick=${share}><${Icon} name="copy" size="16" />Compartilhar código</button>
          <button class="btn sm" onClick=${removeFromStore} aria-label="Remover da loja"><${Icon} name="trash" size="16" /></button>
        </div>`}
      ${!t.custom && html`<button class="btn sm ghost" onClick=${share}><${Icon} name="copy" size="16" />Copiar código para compartilhar</button>`}
    <//>
  `;
}

function WorkoutPreview({ s, w }) {
  let lastSec = null;
  return html`
    <div class="wprev">
      ${w.warmup?.length > 0 && html`<p class="tiny muted"><b>Aquecimento:</b> ${w.warmup.join(' · ')}</p>`}
      ${w.exercises.map((e0) => {
        const e = Array.isArray(e0) ? { exId: e0[0], sets: e0[1], reps: e0[2] } : e0;
        const head = e.section && e.section !== lastSec ? (lastSec = e.section) : null;
        return html`
          ${head && html`<div class="eyebrow" style="margin-top:8px">${head}</div>`}
          <div class="wprev-row">
            <span class="grow">${exerciseById(s, e.exId).name}${e.superset ? html` <span class="tag">SS</span>` : ''}${e.optional ? html` <span class="tag">cortável</span>` : ''}</span>
            <b class="mono small">${e.sets}×${e.reps}</b>
          </div>`;
      })}
      ${w.short && html`<p class="tiny muted"><b>Versão curta:</b> ${w.short}</p>`}
    </div>
  `;
}

function openPublish() {
  openModal((close) => html`<${Publish} close=${close} />`);
}

function Publish({ close }) {
  const s = getState();
  const mine = (s.programs ?? []).filter((p) => !PROGRAM_TEMPLATES[p.template]);
  const publish = (p) => {
    const key = addToStore(programToTemplate(s, p));
    toast('Programa cadastrado na loja');
    close();
    openStoreProgram(key);
  };
  return html`
    <${Sheet} title="Publicar na loja" onClose=${close}>
      <p class="small muted">Escolha um programa seu. Ele vira um modelo na loja com os treinos atuais de cada bloco — dá para começar de novo do zero ou compartilhar por código.</p>
      ${mine.length
        ? html`<div class="list">${mine.map((p) => html`<button class="li btnlike" onClick=${() => publish(p)}><div class="grow"><div class="t">${p.name}</div><div class="s">${p.blocks.length} blocos</div></div><${Icon} name="upload" /></button>`)}</div>`
        : html`<${Empty} title="Nenhum programa seu ainda" text="Crie um em Programas → Meus programas → Criar programa e volte aqui." />`}
    <//>
  `;
}

function openImport() {
  openModal((close) => html`<${Import} close=${close} />`);
}

function Import({ close }) {
  const [code, setCode] = useState('');
  const go = () => {
    try {
      const t = decodeProgram(code);
      const key = addToStore(t);
      toast(`“${t.name}” adicionado à loja`);
      close();
      openStoreProgram(key);
    } catch {
      toast('Código inválido — confira se copiou inteiro');
    }
  };
  return html`
    <${Sheet} title="Importar programa" onClose=${close} footer=${html`<button class="btn primary block" disabled=${!code.trim()} onClick=${go}>Adicionar à loja</button>`}>
      <p class="small muted">Cole o código que começa com <b class="mono">FQP1:</b>.</p>
      <textarea class="input mono" rows="6" value=${code} onInput=${(e) => setCode(e.target.value)} placeholder="FQP1:…"></textarea>
    <//>
  `;
}

// Vitrine na aba Hoje quando não há programa ativo.
export function StoreTeaser({ s }) {
  const cat = storeCatalog(s);
  const featured = ['tronco-arvore', 'dad-strength'].filter((k) => cat[k]);
  return html`
    <div class="stack-sm">
      <div class="section-head"><h3 class="up">Siga um programa</h3></div>
      <div class="store-grid">${featured.map((k) => html`<${StoreCard} key=${k} k=${k} t=${cat[k]} s=${s} />`)}</div>
    </div>
  `;
}
