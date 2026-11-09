// Programas em blocos (seguir bloco, semanas, progressões) e pastas/arquivo de treinos.
import { html, useState } from '../lib.js';
import { update, getState, exerciseById } from '../store.js';
import { MUSCLES } from '../data/exercises.js';
import { Icon, openModal, Sheet, Field, NumInput, toast, confirmDialog, Empty } from '../ui.js';
import {
  ARCHIVE, createFolder, moveToFolder, deleteFolder, deleteWorkout, installProgram, followProgram, pauseProgram,
  advanceBlock, restartBlock, startSession,
} from '../actions.js';
import { BLOCK_GOALS, PROGRESSIONS, activeProgram, blockProgress, currentBlock, DEFAULT_WEEK_PLAN } from '../programs.js';
import { PROGRAM_TEMPLATES } from '../data/programs.js';
import { uid } from '../util.js';

const wName = (s, id) => s.workouts.find((w) => w.id === id)?.name ?? 'Treino removido';
const shortW = (name) => name.replace(/^B\d\s·\s/, '');

// --- Card do programa ativo (topo da Rotina) -------------------------------------------

export function ProgramCard({ s, today }) {
  const p = activeProgram(s);
  if (!p) return null;
  const bp = blockProgress(s, p);
  if (!bp) return null;
  const b = bp.block;
  const next = s.workouts.find((w) => w.id === bp.nextWorkoutId);
  const week = Math.min(bp.week, b.weeks);
  return html`
    <div class="card program-card">
      <div class="row-sb">
        <div class="eyebrow">Programa · bloco ${p.blockIndex + 1}/${p.blocks.length}</div>
        <button class="link-btn tiny" onClick=${() => openProgram(p.id)}>Ver programa</button>
      </div>
      <h3 style="margin-top:4px">${b.name}</h3>
      <div class="row wrap" style="gap:6px;margin-top:6px">
        <span class="tag acc">${BLOCK_GOALS[b.goal] ?? b.goal}</span>
        <span class="tag">${PROGRESSIONS[b.progression]?.label ?? 'Progressão livre'}</span>
        ${bp.guide.rpe && html`<span class="tag">RPE ${bp.guide.rpe}</span>`}
      </div>
      <div class="row-sb" style="margin-top:12px">
        <span class="big-num" style="font-size:34px">Semana ${week}<span class="mono small" style="font-weight:600"> / ${b.weeks}</span></span>
        <span class="mono tiny">${bp.sessions} treinos no bloco</span>
      </div>
      <div class="week-pips">
        ${Array.from({ length: b.weeks }, (_, i) => html`<i class=${`${i + 1 < bp.week ? 'done' : i + 1 === bp.week ? 'cur' : ''} ${(b.weekPlan ?? DEFAULT_WEEK_PLAN).some((x) => x.deload && i + 1 >= x.from && i + 1 <= x.to) ? 'deload' : ''}`}></i>`)}
      </div>
      ${bp.guide.text && html`<div class=${`callout small ${bp.guide.deload ? 'warn' : ''}`} style="margin-top:10px">${bp.guide.deload ? '🔻 ' : ''}${bp.guide.text}</div>`}
      ${bp.finished
        ? html`
          <div class="callout small" style="margin-top:10px;border-left-color:var(--accent)">✓ Bloco concluído! ${b.criteria ?? ''}</div>
          <div class="row" style="margin-top:10px">
            <button class="btn primary grow" onClick=${() => { advanceBlock(p.id); toast(p.blockIndex + 1 < p.blocks.length ? `Começando: ${p.blocks[p.blockIndex + 1].name}` : 'Programa concluído! 🎖️'); }}>${p.blockIndex + 1 < p.blocks.length ? 'Avançar para o próximo bloco' : 'Concluir programa'}</button>
          </div>`
        : html`
          <div class="stack-sm" style="margin-top:12px">
            <div class="eyebrow">Esta semana</div>
            <div class="week-list">
              ${b.workoutIds.map((id) => html`
                <span class=${`wk ${bp.doneThisWeek.includes(id) ? 'done' : id === bp.nextWorkoutId ? 'next' : ''}`}>${bp.doneThisWeek.includes(id) ? '✓ ' : ''}${shortW(wName(s, id)).split(' — ')[0]}</span>`)}
            </div>
            ${next && html`<button class="btn primary" onClick=${() => startSession(next, today)}><${Icon} name="play" />Iniciar ${shortW(next.name)}</button>`}
          </div>`}
    </div>
  `;
}

// --- Aba Blocos: programas, modelos e editor ----------------------------------------------

export function ProgramsTab({ s }) {
  const list = s.programs ?? [];
  const installed = new Set(list.map((p) => p.template).filter(Boolean));
  return html`
    <div class="stack">
      <p class="small muted">Organize o treino em blocos (mesociclos): cada bloco tem objetivo, nº de semanas, sistema de progressão e seus treinos. A semana avança sozinha conforme você conclui os treinos do bloco.</p>
      ${list.length > 0 && html`
        <div class="list">
          ${list.map((p) => {
            const bp = blockProgress(s, p);
            const on = s.activeProgramId === p.id;
            return html`
              <button class="li btnlike" key=${p.id} onClick=${() => openProgram(p.id)}>
                <div class="grow">
                  <div class="row wrap" style="gap:6px"><span class="t">${p.name}</span>${on && html`<span class="tag acc">Seguindo</span>`}${p.status === 'done' && html`<span class="tag">Concluído</span>`}</div>
                  <div class="s">${p.blocks.length} blocos${p.status !== 'ready' && p.status !== 'done' && bp ? ` · ${currentBlock(p).name.split(' — ')[0]} · semana ${Math.min(bp.week, bp.weeks)}/${bp.weeks}` : ''}</div>
                </div>
                <${Icon} name="chev" />
              </button>`;
          })}
        </div>`}
      ${!list.length && html`<${Empty} title="Nenhum programa ainda" text="Escolha um pronto na Loja ou crie o seu com blocos, semanas e progressão." />`}
      <button class="btn" onClick=${() => openModal((close) => html`<${ProgramEditor} close=${close} />`)}><${Icon} name="plus" />Criar programa</button>
      <p class="tiny muted">Programas prontos ficam na aba <b>Loja</b>.</p>
    </div>
  `;
}

export function openProgram(id) {
  openModal((close) => html`<${ProgramSheet} id=${id} close=${close} />`);
}

function ProgramSheet({ id, close }) {
  const s = getState();
  const [, force] = useState(0);
  const p = (s.programs ?? []).find((x) => x.id === id);
  if (!p) return null;
  const on = s.activeProgramId === p.id;
  const bp = blockProgress(s, p);
  const act = (fn) => { fn(); force((n) => n + 1); };
  const remove = async () => {
    if (!(await confirmDialog(`Excluir o programa "${p.name}"? Os treinos continuam salvos na pasta dele e o histórico é mantido.`, { ok: 'Excluir programa' }))) return;
    update((st) => {
      st.programs = st.programs.filter((x) => x.id !== p.id);
      if (st.activeProgramId === p.id) st.activeProgramId = null;
    });
    close();
  };
  return html`
    <${Sheet} title=${p.name} onClose=${close} full footer=${html`
      ${on
        ? html`<button class="btn grow" onClick=${() => act(pauseProgram)}>Pausar programa</button>`
        : html`<button class="btn primary grow" onClick=${() => { act(() => followProgram(p.id)); toast('Seguindo o programa'); close(); }}><${Icon} name="play" />${p.status === 'ready' ? 'Começar programa' : p.status === 'done' ? 'Recomeçar' : 'Retomar programa'}</button>`}
    `}>
      ${p.desc && html`<p class="small">${p.desc}</p>`}
      ${p.rules?.length > 0 && html`
        <details><summary class="small"><b>Regras gerais</b></summary><ul class="nutri-list" style="margin-top:6px">${p.rules.map((r) => html`<li>${r}</li>`)}</ul></details>`}
      ${p.blocks.map((b, i) => {
        const cur = p.blockIndex === i && p.status !== 'ready' && p.status !== 'done';
        const doneB = (p.history ?? []).some((h) => h.blockId === b.id) && !cur;
        return html`
          <div class=${`card tight stack-sm ${cur ? 'block-cur' : ''}`} key=${b.id}>
            <div class="row-sb">
              <div><div class="eyebrow">Bloco ${i + 1} · ${b.weeks} semanas${cur && bp ? ` · semana ${Math.min(bp.week, b.weeks)}` : ''}</div><b>${b.name}</b></div>
              ${cur ? html`<span class="tag acc">Atual</span>` : doneB ? html`<span class="tag">✓ Feito</span>` : ''}
            </div>
            <div class="row wrap" style="gap:6px">
              <span class="tag">${BLOCK_GOALS[b.goal] ?? b.goal}</span>
              <span class="tag">${PROGRESSIONS[b.progression]?.label ?? '—'}</span>
            </div>
            ${b.objective && html`<p class="small">${b.objective}</p>`}
            <div class="list">
              ${b.workoutIds.map((wid) => {
                const w = s.workouts.find((x) => x.id === wid);
                return html`<div class="li"><div class="grow"><div class="t">${w?.name ?? 'Treino removido'}</div>${w && html`<div class="s">${w.exercises.map((e) => exerciseById(s, e.exId).name.split(' (')[0]).join(' · ')}</div>`}</div></div>`;
              })}
            </div>
            ${b.volumeTargets && html`<p class="tiny muted">${b.volumeTargets}</p>`}
            ${b.criteria && html`<p class="tiny muted"><b>Critério para avançar:</b> ${b.criteria}</p>`}
            ${!cur && html`<button class="btn xs" onClick=${() => { act(() => restartBlock(p.id, i)); toast(`Seguindo: ${b.name}`); }}>Seguir a partir deste bloco</button>`}
            ${cur && html`<button class="btn xs" onClick=${async () => { if (await confirmDialog('Encerrar este bloco agora e ir para o próximo?', { ok: 'Avançar', danger: false })) act(() => advanceBlock(p.id)); }}>Avançar bloco agora</button>`}
          </div>`;
      })}
      <details>
        <summary class="small"><b>Sistemas de progressão</b></summary>
        <div class="stack-sm" style="margin-top:6px">${Object.values(PROGRESSIONS).map((x) => html`<p class="small"><b>${x.label}:</b> ${x.desc}</p>`)}</div>
      </details>
      ${p.sections?.length > 0 && p.sections.map((sec) => html`<details class="fold"><summary><span>${sec.title}</span></summary><div class="card tight"><ul class="nutri-list">${sec.items.map((x) => html`<li>${x}</li>`)}</ul></div></details>`)}
      <div class="row">
        <button class="btn grow" onClick=${() => { close(); openModal((c) => html`<${ProgramEditor} program=${p} close=${c} />`); }}><${Icon} name="edit" />Editar</button>
        <button class="btn" onClick=${async () => { const m = await import('./store.js'); const key = `u-${uid()}`; update((st) => { (st.storePrograms ??= []).push({ ...m.programToTemplate(getState(), p), key }); }); toast('Cadastrado na loja'); close(); m.openStoreProgram(key); }} title="Cadastrar na loja"><${Icon} name="upload" /></button>
        <button class="btn danger" onClick=${remove} aria-label="Excluir programa"><${Icon} name="trash" /></button>
      </div>
    <//>
  `;
}

function ProgramEditor({ program, close }) {
  const s = getState();
  const pool = s.workouts.filter((w) => (w.type ?? 'strength') === 'strength' && w.folderId !== ARCHIVE);
  const [name, setName] = useState(program?.name ?? '');
  const [desc, setDesc] = useState(program?.desc ?? '');
  const [blocks, setBlocks] = useState(() => structuredClone(program?.blocks ?? [{ id: uid(), name: 'Bloco 1', goal: 'forca', weeks: 6, progression: 'double', workoutIds: [] }]));
  const patch = (i, k, v) => setBlocks((cur) => cur.map((b, j) => (j === i ? { ...b, [k]: v } : b)));
  const toggleW = (i, id) => setBlocks((cur) => cur.map((b, j) => (j === i ? { ...b, workoutIds: b.workoutIds.includes(id) ? b.workoutIds.filter((x) => x !== id) : [...b.workoutIds, id] } : b)));
  const save = () => {
    if (!name.trim()) return toast('Dê um nome ao programa');
    if (blocks.some((b) => !b.workoutIds.length)) return toast('Cada bloco precisa de pelo menos 1 treino');
    const clean = blocks.map((b) => ({ ...b, name: b.name.trim() || 'Bloco', weeks: Math.max(1, Math.round(b.weeks || 1)), perWeek: b.workoutIds.length, weekPlan: b.weekPlan ?? (b.deloadWeek ? null : null) }));
    update((st) => {
      st.programs ??= [];
      if (program) Object.assign(st.programs.find((x) => x.id === program.id), { name: name.trim(), desc: desc.trim(), blocks: clean, blockIndex: Math.min(program.blockIndex, clean.length - 1) });
      else st.programs.push({ id: uid(), name: name.trim(), desc: desc.trim(), blocks: clean, blockIndex: 0, blockStartedAt: null, status: 'ready', createdAt: Date.now(), history: [] });
    });
    toast('Programa salvo');
    close();
  };
  return html`
    <${Sheet} title=${program ? 'Editar programa' : 'Novo programa'} onClose=${close} full footer=${html`<button class="btn primary block" onClick=${save}>Salvar programa</button>`}>
      <${Field} label="Nome"><input class="input" value=${name} onInput=${(e) => setName(e.target.value)} placeholder="Ex.: Ciclo de força 2026" /><//>
      <${Field} label="Descrição (opcional)"><textarea class="input" rows="2" value=${desc} onInput=${(e) => setDesc(e.target.value)}></textarea><//>
      ${!pool.length && html`<p class="small muted">Crie seus treinos (A, B, C…) na Rotina primeiro; depois escolha quais entram em cada bloco.</p>`}
      ${blocks.map((b, i) => html`
        <div class="card tight stack-sm" key=${b.id}>
          <div class="row-sb"><span class="eyebrow">Bloco ${i + 1}</span>${blocks.length > 1 && html`<button class="x-btn" aria-label="Remover bloco" onClick=${() => setBlocks((cur) => cur.filter((_, j) => j !== i))}>×</button>`}</div>
          <input class="input" value=${b.name} onInput=${(e) => patch(i, 'name', e.target.value)} placeholder="Nome do bloco" />
          <div class="grid-2">
            <${Field} label="Objetivo"><select class="input" value=${b.goal} onChange=${(e) => patch(i, 'goal', e.target.value)}>${Object.entries(BLOCK_GOALS).map(([k, l]) => html`<option value=${k}>${l}</option>`)}</select><//>
            <${Field} label="Semanas"><${NumInput} value=${b.weeks} onInput=${(v) => patch(i, 'weeks', v)} step="1" unit="sem" /><//>
          </div>
          <${Field} label="Sistema de progressão" hint=${PROGRESSIONS[b.progression]?.desc}>
            <select class="input" value=${b.progression} onChange=${(e) => patch(i, 'progression', e.target.value)}>${Object.entries(PROGRESSIONS).map(([k, x]) => html`<option value=${k}>${x.label}</option>`)}</select>
          <//>
          <${Field} label="Treinos do bloco (na ordem do toque)">
            <div class="chips">${pool.map((w) => {
              const k = b.workoutIds.indexOf(w.id);
              return html`<button class=${`chip ${k >= 0 ? 'on' : ''}`} onClick=${() => toggleW(i, w.id)}>${k >= 0 ? `${k + 1}. ` : ''}${w.name}</button>`;
            })}</div>
          <//>
          <${Field} label="Objetivo do bloco / observações (opcional)"><textarea class="input" rows="2" value=${b.objective ?? ''} onInput=${(e) => patch(i, 'objective', e.target.value)}></textarea><//>
          <p class="tiny muted">Semanas 1–2 RPE 6–7 · 3–4 RPE 7–8 · 5–6 RPE 8 · 7 deload (padrão; modelos podem ter o próprio).</p>
        </div>`)}
      <button class="btn" onClick=${() => setBlocks((cur) => [...cur, { id: uid(), name: `Bloco ${cur.length + 1}`, goal: 'hipertrofia', weeks: 6, progression: 'double', workoutIds: [...(cur[cur.length - 1]?.workoutIds ?? [])] }])}><${Icon} name="plus" />Adicionar bloco</button>
    <//>
  `;
}

// --- Pastas e arquivo ---------------------------------------------------------------------

export function openMoveSheet(w) {
  openModal((close) => html`<${MoveSheet} w=${w} close=${close} />`);
}

function MoveSheet({ w, close }) {
  const s = getState();
  const [name, setName] = useState('');
  const folders = s.workoutFolders ?? [];
  const go = (fid, label) => { moveToFolder(w.id, fid); toast(label); close(); };
  return html`
    <${Sheet} title=${`Mover “${w.name}”`} onClose=${close}>
      <div class="list">
        ${w.folderId && html`<button class="li btnlike" onClick=${() => go(null, 'Voltou para Meus treinos')}><${Icon} name="train" /><span class="t grow">Meus treinos (rotina)</span></button>`}
        ${folders.filter((f) => f.id !== w.folderId).map((f) => html`<button class="li btnlike" onClick=${() => go(f.id, `Movido para ${f.name}`)}>📁<span class="t grow">${f.name}</span></button>`)}
        ${w.folderId !== ARCHIVE && html`<button class="li btnlike" onClick=${() => go(ARCHIVE, 'Treino arquivado')}>🗄️<span class="t grow">Arquivar (guardar sem excluir)</span></button>`}
      </div>
      <div class="row">
        <input class="input grow" value=${name} onInput=${(e) => setName(e.target.value)} placeholder="Nova pasta…" />
        <button class="btn dark" disabled=${!name.trim()} onClick=${() => { const id = createFolder(name); go(id, `Movido para ${name.trim()}`); }}>Criar e mover</button>
      </div>
      <button class="btn ghost" onClick=${async () => { if (await deleteWorkout(w)) close(); }}><${Icon} name="trash" />Excluir de vez</button>
    <//>
  `;
}

// Pastas abaixo da rotina (inclui as dos programas e o Arquivo).
export function FoldersSection({ s, renderRow }) {
  const [open, setOpen] = useState(null);
  const strength = s.workouts.filter((w) => (w.type ?? 'strength') === 'strength');
  const folders = [...(s.workoutFolders ?? []), { id: ARCHIVE, name: 'Arquivados', archive: true }]
    .map((f) => ({ ...f, items: strength.filter((w) => w.folderId === f.id) }))
    .filter((f) => !f.archive || f.items.length);
  const [newName, setNewName] = useState(null);
  return html`
    <div class="stack-sm">
      <div class="section-head"><h3 class="up">Pastas</h3><button class="btn xs" onClick=${() => setNewName('')}><${Icon} name="plus" size="14" />Pasta</button></div>
      ${newName != null && html`
        <div class="row">
          <input class="input grow" autofocus value=${newName} onInput=${(e) => setNewName(e.target.value)} placeholder="Nome da pasta" />
          <button class="btn dark" disabled=${!newName.trim()} onClick=${() => { createFolder(newName); setNewName(null); }}>Criar</button>
          <button class="x-btn" onClick=${() => setNewName(null)} aria-label="Cancelar">×</button>
        </div>`}
      ${!folders.length && newName == null && html`<p class="tiny muted">Use 📁 num treino para movê-lo para uma pasta ou arquivá-lo sem excluir.</p>`}
      ${folders.map((f) => html`
        <div class="folder" key=${f.id}>
          <button class="folder-head" onClick=${() => setOpen(open === f.id ? null : f.id)}>
            <span>${f.archive ? '🗄️' : '📁'}</span><b class="grow">${f.name}</b><span class="mono tiny">${f.items.length}</span><span>${open === f.id ? '▾' : '▸'}</span>
          </button>
          ${open === f.id && html`
            <div class="list">${f.items.map((w) => renderRow(w))}${!f.items.length && html`<div class="li small muted">Pasta vazia.</div>`}</div>
            ${!f.archive && html`<button class="btn xs ghost" style="margin-top:6px" onClick=${() => deleteFolder(f)}>Apagar pasta</button>`}`}
        </div>`)}
    </div>
  `;
}

export { MUSCLES, Empty };
