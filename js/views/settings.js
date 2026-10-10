// CONFIGURAÇÕES: perfil, aparência, opções de treino e backup.
import { html, useState } from '../lib.js';
import { update, replaceState, getState, emptyState } from '../store.js';
import { allPhotos, putPhoto } from '../photos.js';
import { Field, NumInput, Seg, Check, toast, confirmDialog } from '../ui.js';
import { go } from '../nav.js';
import { dateKey } from '../util.js';

export function SettingsView({ s }) {
  const p = s.profile;
  const setP = (k) => (v) => update((st) => { st.profile[k] = v; });
  const setS = (k) => (v) => update((st) => { st.settings[k] = v; });
  const [withPhotos, setWithPhotos] = useState(true);

  const exportData = async () => {
    const data = { ...getState(), exportedAt: new Date().toISOString() };
    if (withPhotos) data.photos = await allPhotos();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fitquest-backup-${dateKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importData = async (file) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || !('diary' in data)) throw new Error('formato');
      if (!(await confirmDialog('Importar substitui todos os dados atuais deste aparelho. Continuar?', { ok: 'Importar' }))) return;
      const photos = data.photos ?? [];
      delete data.photos;
      delete data.exportedAt;
      for (const ph of photos) await putPhoto(ph);
      replaceState(data);
      toast('Backup importado');
    } catch {
      toast('Arquivo inválido');
    }
  };

  const reset = async () => {
    if (!(await confirmDialog('Apagar TODOS os dados (treinos, dieta, avaliações, XP)? Isso não pode ser desfeito.', { ok: 'Apagar tudo' }))) return;
    indexedDB.deleteDatabase('fitquest');
    replaceState(emptyState());
    go('hoje');
  };

  return html`
    <div class="stack">
      <div class="page-head"><h1>Ajustes</h1></div>

      <section class="card stack-sm">
        <h3 class="up">Perfil</h3>
        <${Field} label="Nome"><input class="input" value=${p.name} onInput=${(e) => setP('name')(e.target.value)} /><//>
        <${Field} label="Sexo biológico"><${Seg} value=${p.sex} onChange=${setP('sex')} options=${[['M', 'Masculino'], ['F', 'Feminino']]} /><//>
        <div class="grid-2">
          <${Field} label="Ano de nascimento"><${NumInput} value=${p.birthYear} onInput=${setP('birthYear')} step="1" /><//>
          <${Field} label="Altura"><${NumInput} value=${p.height} onInput=${setP('height')} unit="cm" /><//>
        </div>
        <${Field} label="Meta de treinos por semana"><${Seg} value=${p.trainDays} onChange=${setP('trainDays')} options=${[2, 3, 4, 5, 6].map((n) => [n, `${n}x`])} /><//>
        <p class="tiny muted">Objetivo e nível de atividade ficam em Dieta → Metas.</p>
      </section>

      <section class="card stack-sm">
        <h3 class="up">Aparência</h3>
        <${Seg} value=${s.settings.theme} onChange=${setS('theme')} options=${[['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Escuro']]} />
      </section>

      <section class="card stack-sm">
        <h3 class="up">Registro de treino</h3>
        <${Check} checked=${s.settings.showRpe} onChange=${setS('showRpe')}>Coluna RPE (esforço percebido 1–10)<//>
        <${Check} checked=${s.settings.showPct} onChange=${setS('showPct')}>Coluna %RM (digite a % e a carga é calculada)<//>
      </section>

      <section class="card stack-sm">
        <h3 class="up">Backup</h3>
        <p class="small muted">Seus dados ficam só neste aparelho/navegador. Exporte com frequência para não perder nada ao trocar de celular ou limpar o navegador.</p>
        <${Check} checked=${withPhotos} onChange=${setWithPhotos}>Incluir fotos no backup<//>
        <div class="grid-2">
          <button class="btn dark" onClick=${exportData}>Exportar</button>
          <label class="btn" style="cursor:pointer">Importar<input type="file" accept="application/json,.json" class="sr" onChange=${(e) => importData(e.target.files[0])} /></label>
        </div>
      </section>

      <section class="card stack-sm">
        <h3 class="up">Zona de perigo</h3>
        <button class="btn danger" onClick=${reset}>Apagar todos os dados</button>
      </section>

      <p class="tiny muted center">FitQuest 2.0 · Alimentos: TACO 4ª ed. (NEPA/UNICAMP) · % gordura: Marinha dos EUA / RFM · TMB: Mifflin-St Jeor / Katch-McArdle · 1RM: Epley.<br />Estimativas não substituem avaliação profissional.</p>
    </div>
  `;
}
