// Cadastro inicial em 4 passos.
import { html, useState } from '../lib.js';
import { update } from '../store.js';
import { ACTIVITY, GOALS, macroTargets, bmi, bmiClass } from '../calc.js';
import { Field, NumInput, Seg } from '../ui.js';
import { dateKey, num } from '../util.js';

const THIS_YEAR = new Date().getFullYear();

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    name: '', sex: 'M', birthYear: null, height: null, weight: null,
    activity: 'moderado', goal: 'recomp', trainDays: 4,
  });
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  const valid = [
    () => f.name.trim().length > 0,
    () => f.birthYear > 1920 && f.birthYear < THIS_YEAR - 10 && f.height > 120 && f.height < 230 && f.weight > 30 && f.weight < 300,
    () => true,
    () => true,
  ];

  const t = f.weight && f.height
    ? macroTargets({ sex: f.sex, kg: f.weight, height: f.height, ageYears: THIS_YEAR - (f.birthYear || THIS_YEAR - 30), bf: null, activity: f.activity, goal: f.goal })
    : null;

  const finish = () => {
    update((s) => {
      s.profile = {
        name: f.name.trim(), sex: f.sex, birthYear: f.birthYear, height: f.height,
        activity: f.activity, goal: f.goal, trainDays: f.trainDays, startWeight: f.weight,
        createdAt: Date.now(),
      };
      s.weights.push({ date: dateKey(), kg: f.weight });
    });
    location.hash = '#/hoje';
  };

  const steps = [
    html`
      <div class="stack">
        <h1 class="onb-title">Sua jornada <em>fitness</em>, em modo jogo.</h1>
        <p class="muted">Treino, dieta e corpo num só lugar. Cada registro vira XP, cada semana vira missão. Tudo fica salvo só neste dispositivo.</p>
        <${Field} label="Como quer ser chamado?">
          <input class="input" autofocus value=${f.name} onInput=${(e) => set('name')(e.target.value)} placeholder="Seu nome" maxlength="30" />
        <//>
      </div>
    `,
    html`
      <div class="stack">
        <h2>Dados básicos</h2>
        <${Field} label="Sexo biológico" hint="Usado nas fórmulas de gasto calórico e % de gordura.">
          <${Seg} value=${f.sex} onChange=${set('sex')} options=${[['M', 'Masculino'], ['F', 'Feminino']]} />
        <//>
        <div class="grid-3">
          <${Field} label="Nascimento"><${NumInput} value=${f.birthYear} onInput=${set('birthYear')} placeholder="1995" step="1" /><//>
          <${Field} label="Altura"><${NumInput} value=${f.height} onInput=${set('height')} unit="cm" placeholder="175" /><//>
          <${Field} label="Peso"><${NumInput} value=${f.weight} onInput=${set('weight')} unit="kg" placeholder="78" /><//>
        </div>
        ${f.weight && f.height ? html`<p class="small muted">IMC ${num(bmi(f.weight, f.height), 1)} · ${bmiClass(bmi(f.weight, f.height))}</p>` : null}
      </div>
    `,
    html`
      <div class="stack">
        <h2>Rotina</h2>
        <${Field} label="Nível de atividade">
          <div class="choice-grid">
            ${Object.entries(ACTIVITY).map(([k, a]) => html`
              <button type="button" class=${`choice ${f.activity === k ? 'on' : ''}`} onClick=${() => set('activity')(k)}>
                <b>${a.label}</b><small>${a.hint}</small>
              </button>
            `)}
          </div>
        <//>
        <${Field} label="Treinos por semana (meta)">
          <${Seg} value=${f.trainDays} onChange=${set('trainDays')} options=${[2, 3, 4, 5, 6].map((n) => [n, `${n}x`])} />
        <//>
      </div>
    `,
    html`
      <div class="stack">
        <h2>Objetivo</h2>
        <div class="choice-grid">
          ${Object.entries(GOALS).map(([k, g]) => html`
            <button type="button" class=${`choice ${f.goal === k ? 'on' : ''}`} onClick=${() => set('goal')(k)}>
              <b>${g.label}</b><small>${g.hint}</small>
            </button>
          `)}
        </div>
        ${t && html`
          <div class="card ink">
            <div class="eyebrow" style="margin-bottom:8px">Suas metas iniciais</div>
            <div class="row-sb"><span class="big-num">${num(t.kcal)}</span><span class="mono">kcal/dia</span></div>
            <div class="grid-3" style="margin-top:12px">
              <div><div class="mono" style="font-size:20px;font-weight:700">${t.protein}g</div><div class="eyebrow">Proteína</div></div>
              <div><div class="mono" style="font-size:20px;font-weight:700">${t.carbs}g</div><div class="eyebrow">Carbo</div></div>
              <div><div class="mono" style="font-size:20px;font-weight:700">${t.fat}g</div><div class="eyebrow">Gordura</div></div>
            </div>
            <p class="tiny muted" style="margin-top:10px">TMB ${num(t.bmr)} · Gasto total ${num(t.tdee)} kcal. Ajusta sozinho quando você registra peso ou % de gordura.</p>
          </div>
        `}
      </div>
    `,
  ];

  return html`
    <div class="onb">
      <div class="row-sb">
        <div class="brand"><span class="brand-mark">FQ</span><span>FitQuest</span></div>
        <span class="eyebrow">${step + 1} / ${steps.length}</span>
      </div>
      <div class="steps">${steps.map((_, i) => html`<i class=${i <= step ? 'on' : ''}></i>`)}</div>
      <div class="grow">${steps[step]}</div>
      <div class="row">
        ${step > 0 && html`<button class="btn" onClick=${() => setStep(step - 1)}>Voltar</button>`}
        ${step < steps.length - 1
          ? html`<button class="btn primary grow" disabled=${!valid[step]()} onClick=${() => setStep(step + 1)}>Continuar</button>`
          : html`<button class="btn primary grow" onClick=${finish}>Começar jornada</button>`}
      </div>
    </div>
  `;
}
