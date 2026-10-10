// CORPO: peso, avaliação física simplificada (BF), composição e fotos de progresso.
import { html, useState, useEffect } from '../lib.js';
import { update, getState, latestWeight, latestAssessment } from '../store.js';
import { estimateBf, bfClass, composition, bmi, bmiClass } from '../calc.js';
import { putPhoto, getPhoto, deletePhoto, compressImage } from '../photos.js';
import { Icon, openModal, Sheet, Field, NumInput, Seg, toast, confirmDialog, Empty, Stat } from '../ui.js';
import { LineChart } from '../charts.js';
import { openWeighIn } from '../actions.js';
import { dateKey, fmtDate, num, uid } from '../util.js';

const POSES = [['front', 'Frente'], ['side', 'Lado'], ['back', 'Costas']];

export function BodyView({ s }) {
  const [tab, setTab] = useState('resumo');
  return html`
    <div class="stack">
      <div class="page-head">
        <h1>Corpo</h1>
        <button class="btn primary sm" onClick=${() => openAssessment()}><${Icon} name="plus" />Avaliação</button>
      </div>
      <div class="tabs">
        ${[['resumo', 'Resumo'], ['avaliacoes', 'Avaliações'], ['fotos', 'Fotos'], ['peso', 'Peso']].map(([k, l]) => html`
          <button class=${tab === k ? 'on' : ''} onClick=${() => setTab(k)}>${l}</button>
        `)}
      </div>
      ${tab === 'resumo' && html`<${Summary} s=${s} />`}
      ${tab === 'avaliacoes' && html`<${AssessmentList} s=${s} />`}
      ${tab === 'fotos' && html`<${PhotoCompare} s=${s} />`}
      ${tab === 'peso' && html`<${WeightLog} s=${s} />`}
    </div>
  `;
}

function Summary({ s }) {
  const kg = latestWeight(s);
  const a = latestAssessment(s);
  const bf = a?.bf ?? null;
  const comp = composition(kg, bf);
  const b = bmi(kg, s.profile.height);
  const first = s.weights[0];
  const delta = first ? kg - first.kg : 0;
  const bfGoal = s.goals.find((g) => g.type === 'bf' && !g.completedAt)?.target ?? null;
  const wGoal = s.goals.find((g) => g.type === 'weight' && !g.completedAt)?.target ?? null;
  return html`
    <div class="stack">
      <div class="grid-2">
        <${Stat} v=${num(kg, 1)} unit="kg" l=${`Peso · ${delta >= 0 ? '+' : ''}${num(delta, 1)} desde o início`} />
        <${Stat} v=${bf != null ? num(bf, 1) : '—'} unit="%" l=${bf != null ? `Gordura · ${bfClass(bf, s.profile.sex)}` : 'Gordura · sem avaliação'} />
        <${Stat} v=${comp ? num(comp.leanKg, 1) : '—'} unit="kg" l="Massa magra" />
        <${Stat} v=${comp ? num(comp.fatKg, 1) : '—'} unit="kg" l="Massa gorda" />
      </div>
      <div class="row-sb small"><span class="muted">IMC</span><b class="mono">${num(b, 1)} · ${bmiClass(b)}</b></div>
      ${!a && html`<${Empty} title="Faça sua primeira avaliação" text="Só precisa de fita métrica: cintura e pescoço (e quadril, para mulheres). Leva 2 minutos e vale +80 XP." action=${html`<button class="btn primary" onClick=${() => openAssessment()}>Começar avaliação</button>`} />`}
      <div class="card">
        <div class="card-title"><h3 class="up">Peso</h3><button class="btn xs dark" onClick=${() => openWeighIn()}><${Icon} name="plus" size="14" />Pesar</button></div>
        <${LineChart} points=${s.weights.map((w) => ({ date: w.date, y: w.kg }))} unit=" kg" goal=${wGoal} />
      </div>
      <div class="card">
        <div class="card-title"><h3 class="up">% Gordura</h3></div>
        <${LineChart} points=${s.assessments.filter((x) => x.bf != null).map((x) => ({ date: x.date, y: x.bf }))} unit="%" goal=${bfGoal} />
      </div>
      ${s.assessments.length >= 2 && html`<${Composition} s=${s} />`}
    </div>
  `;
}

function Composition({ s }) {
  const list = [...s.assessments].filter((a) => a.bf != null).sort((a, b) => a.date.localeCompare(b.date));
  if (list.length < 2) return null;
  const f = list[0];
  const l = list[list.length - 1];
  const cf = composition(f.kg, f.bf);
  const cl = composition(l.kg, l.bf);
  const d = (x) => `${x >= 0 ? '+' : ''}${num(x, 1)}`;
  return html`
    <div class="card">
      <div class="card-title"><h3 class="up">Desde ${fmtDate(f.date)}</h3></div>
      <div class="grid-3">
        <${Stat} v=${d(l.kg - f.kg)} unit="kg" l="Peso" />
        <${Stat} v=${d(cl.leanKg - cf.leanKg)} unit="kg" l="Magra" />
        <${Stat} v=${d(cl.fatKg - cf.fatKg)} unit="kg" l="Gorda" />
      </div>
      <div class="row-sb small" style="margin-top:10px"><span class="muted">Cintura</span><b class="mono">${num(f.waist, 1)} → ${num(l.waist, 1)} cm</b></div>
    </div>
  `;
}

// --- Avaliação ---------------------------------------------------------------------

export function openAssessment(existing) {
  openModal((close) => html`<${AssessmentForm} existing=${existing} close=${close} />`);
}

function AssessmentForm({ existing, close }) {
  const s = getState();
  const sex = s.profile.sex;
  const prev = latestAssessment(s);
  const [m, setM] = useState(existing ?? {
    date: dateKey(), kg: latestWeight(s), waist: null, neck: prev?.neck ?? null, hip: null, photos: [],
  });
  const [thumbs, setThumbs] = useState({});
  const set = (k) => (v) => setM((o) => ({ ...o, [k]: v }));
  const est = estimateBf({ sex, height: s.profile.height, neck: m.neck, waist: m.waist, hip: m.hip });

  useEffect(() => {
    (async () => {
      const out = {};
      for (const p of m.photos) out[p.id] = (await getPhoto(p.id))?.data;
      setThumbs(out);
    })();
  }, []);

  const addPhoto = async (pose, file) => {
    if (!file) return;
    try {
      const data = await compressImage(file);
      const id = uid();
      await putPhoto({ id, data, date: m.date, pose });
      const old = m.photos.find((p) => p.pose === pose);
      if (old && !existing?.photos.some((p) => p.id === old.id)) await deletePhoto(old.id);
      setM((o) => ({ ...o, photos: [...o.photos.filter((p) => p.pose !== pose), { id, pose }] }));
      setThumbs((t) => ({ ...t, [id]: data }));
    } catch {
      toast('Não foi possível carregar a foto');
    }
  };

  const save = async () => {
    if (!m.kg) return toast('Informe o peso');
    if (!m.waist) return toast('Informe a cintura');
    const rec = { ...m, id: existing?.id ?? uid(), bf: est.bf, method: est.method };
    // fotos substituídas numa edição saem do IndexedDB
    for (const p of existing?.photos ?? []) if (!rec.photos.some((x) => x.id === p.id)) await deletePhoto(p.id);
    update((st) => {
      st.assessments = st.assessments.filter((x) => x.id !== rec.id);
      st.assessments.push(rec);
      st.weights = st.weights.filter((w) => w.date !== rec.date);
      st.weights.push({ date: rec.date, kg: rec.kg });
      st.weights.sort((a, b) => a.date.localeCompare(b.date));
    });
    close();
  };

  // fecha sem salvar: remove do IndexedDB as fotos adicionadas nesta edição
  const cancel = async () => {
    for (const p of m.photos) if (!existing?.photos.some((x) => x.id === p.id)) await deletePhoto(p.id);
    close();
  };

  return html`
    <${Sheet} title=${existing ? 'Editar avaliação' : 'Avaliação física'} onClose=${cancel} footer=${html`<button class="btn primary block" onClick=${save}>Salvar avaliação</button>`}>
      <div class="grid-2">
        <${Field} label="Data"><input class="input" type="date" value=${m.date} max=${dateKey()} onChange=${(e) => set('date')(e.target.value)} /><//>
        <${Field} label="Peso"><${NumInput} value=${m.kg} onInput=${set('kg')} unit="kg" step="0.1" /><//>
      </div>
      <div class="grid-2">
        <${Field} label="Cintura" hint="Na altura do umbigo, relaxado."><${NumInput} value=${m.waist} onInput=${set('waist')} unit="cm" step="0.5" /><//>
        <${Field} label="Pescoço" hint="Logo abaixo do pomo de Adão."><${NumInput} value=${m.neck} onInput=${set('neck')} unit="cm" step="0.5" /><//>
        ${sex === 'F' && html`<${Field} label="Quadril" hint="Na parte mais larga do glúteo."><${NumInput} value=${m.hip} onInput=${set('hip')} unit="cm" step="0.5" /><//>`}
      </div>

      <div class="card ink">
        <div class="row-sb">
          <div>
            <div class="eyebrow">% de gordura estimado</div>
            <div class="big-num" style="margin-top:4px">${est.bf != null ? `${num(est.bf, 1)}%` : '—'}</div>
          </div>
          <div class="right small">
            ${est.bf != null && html`<div class="tag acc">${bfClass(est.bf, sex)}</div>`}
            ${est.bf != null && m.kg && html`<div class="mono tiny" style="margin-top:6px">Magra ${num(composition(m.kg, est.bf).leanKg, 1)} kg</div>`}
          </div>
        </div>
        <div class="tiny" style="margin-top:10px;opacity:0.75">
          ${est.navy != null ? `Marinha EUA: ${num(est.navy, 1)}%` : 'Marinha EUA: precisa de pescoço' + (sex === 'F' ? ' e quadril' : '')}
          ${' · '}${est.rfm != null ? `RFM: ${num(est.rfm, 1)}%` : 'RFM: precisa de cintura'}
        </div>
      </div>

      <div class="stack-sm">
        <div class="row-sb"><h3 class="up">Fotos</h3><span class="tag">+20 XP</span></div>
        <div class="photo-grid">
          ${POSES.map(([pose, label]) => {
            const p = m.photos.find((x) => x.pose === pose);
            return html`
              <label class=${`photo-slot ${p ? 'has' : ''}`} style="cursor:pointer">
                <input type="file" accept="image/*" capture="environment" class="sr" onChange=${(e) => addPhoto(pose, e.target.files[0])} />
                ${p && thumbs[p.id] ? html`<img src=${thumbs[p.id]} alt=${label} />` : html`<span><${Icon} name="camera" /><br />${label}</span>`}
                ${p && html`<span class="lbl">${label}</span>`}
              </label>
            `;
          })}
        </div>
        <p class="tiny muted">Dica: mesma luz, mesmo lugar, mesma hora (de manhã, em jejum). Fotos ficam só neste aparelho.</p>
      </div>
    <//>
  `;
}

function AssessmentList({ s }) {
  const list = [...s.assessments].sort((a, b) => b.date.localeCompare(a.date));
  if (!list.length) return html`<${Empty} title="Nenhuma avaliação" text="Refaça a cada 2–4 semanas para acompanhar a composição corporal." action=${html`<button class="btn primary" onClick=${() => openAssessment()}>Nova avaliação</button>`} />`;
  const remove = async (a) => {
    if (!(await confirmDialog('Excluir esta avaliação e suas fotos?', { ok: 'Excluir' }))) return;
    for (const p of a.photos ?? []) await deletePhoto(p.id);
    update((st) => { st.assessments = st.assessments.filter((x) => x.id !== a.id); });
  };
  return html`
    <div class="list">
      ${list.map((a, i) => {
        const prev = list[i + 1];
        const d = prev && a.bf != null && prev.bf != null ? a.bf - prev.bf : null;
        return html`
          <div class="li" key=${a.id}>
            <div class="grow">
              <div class="row"><span class="t">${fmtDate(a.date, { year: true })}</span>${a.photos?.length ? html`<span class="tag">${a.photos.length} foto${a.photos.length > 1 ? 's' : ''}</span>` : ''}</div>
              <div class="s mono">${num(a.kg, 1)} kg · cintura ${num(a.waist, 1)} · ${a.bf != null ? `${num(a.bf, 1)}% (${a.method === 'navy' ? 'Marinha' : 'RFM'})` : '—'}${d != null ? ` · ${d > 0 ? '+' : ''}${num(d, 1)}pp` : ''}</div>
            </div>
            <button class="icon-btn" aria-label="Editar" onClick=${() => openAssessment(a)}><${Icon} name="edit" /></button>
            <button class="icon-btn" aria-label="Excluir" onClick=${() => remove(a)}><${Icon} name="trash" /></button>
          </div>
        `;
      })}
    </div>
  `;
}

// --- Fotos: antes x depois -----------------------------------------------------------------

function PhotoCompare({ s }) {
  const withPhotos = [...s.assessments].filter((a) => a.photos?.length).sort((a, b) => a.date.localeCompare(b.date));
  const [pose, setPose] = useState('front');
  const [aId, setA] = useState(withPhotos[0]?.id);
  const [bId, setB] = useState(withPhotos[withPhotos.length - 1]?.id);
  const [imgs, setImgs] = useState({});
  const A = withPhotos.find((x) => x.id === aId);
  const B = withPhotos.find((x) => x.id === bId);

  useEffect(() => {
    (async () => {
      const out = {};
      for (const a of [A, B]) {
        const p = a?.photos.find((x) => x.pose === pose);
        if (p) out[a.id] = (await getPhoto(p.id))?.data;
      }
      setImgs(out);
    })();
  }, [aId, bId, pose, s.assessments]);

  if (!withPhotos.length) return html`<${Empty} title="Sem fotos ainda" text="Adicione fotos nas avaliações para comparar antes e depois lado a lado." action=${html`<button class="btn primary" onClick=${() => openAssessment()}><${Icon} name="camera" />Nova avaliação</button>`} />`;

  const pickSel = (val, set) => html`
    <select class="input" value=${val} onChange=${(e) => set(e.target.value)}>
      ${withPhotos.map((a) => html`<option value=${a.id}>${fmtDate(a.date, { year: true })}</option>`)}
    </select>
  `;
  return html`
    <div class="stack">
      <${Seg} value=${pose} onChange=${setPose} options=${POSES} />
      <div class="grid-2">${pickSel(aId, setA)}${pickSel(bId, setB)}</div>
      <div class="compare">
        ${[A, B].map((a) => html`
          <figure>
            ${imgs[a?.id] ? html`<img src=${imgs[a.id]} alt="" />` : html`<div class="photo-slot" style="border:0">Sem foto</div>`}
            <figcaption>${a ? `${fmtDate(a.date)} · ${num(a.kg, 1)}kg${a.bf != null ? ` · ${num(a.bf, 1)}%` : ''}` : '—'}</figcaption>
          </figure>
        `)}
      </div>
      ${A && B && A.id !== B.id && html`
        <div class="grid-3">
          <${Stat} v=${`${B.kg - A.kg >= 0 ? '+' : ''}${num(B.kg - A.kg, 1)}`} unit="kg" l="Peso" />
          <${Stat} v=${`${B.waist - A.waist >= 0 ? '+' : ''}${num(B.waist - A.waist, 1)}`} unit="cm" l="Cintura" />
          <${Stat} v=${A.bf != null && B.bf != null ? `${B.bf - A.bf >= 0 ? '+' : ''}${num(B.bf - A.bf, 1)}` : '—'} unit="pp" l="Gordura" />
        </div>
      `}
    </div>
  `;
}

// --- Peso -----------------------------------------------------------------------------------

function WeightLog({ s }) {
  const list = [...s.weights].reverse();
  // média móvel de 7 registros para suavizar oscilações de água/sal
  const sorted = [...s.weights];
  const avg = sorted.map((w, i) => {
    const win = sorted.slice(Math.max(0, i - 6), i + 1);
    return { date: w.date, y: win.reduce((a, x) => a + x.kg, 0) / win.length };
  });
  return html`
    <div class="stack">
      <button class="btn primary" onClick=${() => openWeighIn()}><${Icon} name="plus" />Registrar peso</button>
      <div class="card">
        <div class="card-title"><h3 class="up">Média móvel (7)</h3></div>
        <${LineChart} points=${avg} unit=" kg" />
      </div>
      <div class="list">
        ${list.map((w, i) => {
          const prev = list[i + 1];
          const d = prev ? w.kg - prev.kg : null;
          return html`
            <div class="li" key=${w.date}>
              <span class="mono small grow">${fmtDate(w.date, { year: true })}</span>
              ${d != null && html`<span class=${`mono tiny ${d > 0 ? 'danger' : 'ok'}`}>${d > 0 ? '+' : ''}${num(d, 1)}</span>`}
              <b class="mono">${num(w.kg, 1)} kg</b>
              <button class="x-btn" aria-label="Excluir" onClick=${() => update((st) => { st.weights = st.weights.filter((x) => x.date !== w.date); })}>×</button>
            </div>
          `;
        })}
      </div>
    </div>
  `;
}
