// CONFIGURAÇÕES: perfil, aparência, opções de treino e backup.
import { html, useState, useEffect } from '../lib.js';
import { update, replaceState, getState, emptyState, requestPersistence } from '../store.js';
import { allPhotos, putPhoto } from '../photos.js';
import { Field, NumInput, Seg, Check, toast, confirmDialog } from '../ui.js';
import { go } from '../nav.js';
import { dateKey } from '../util.js';
import { cloudEnabled, useAuth, useSync, signOut, syncNow } from '../cloud.js';

export function SettingsView({ s }) {
  const p = s.profile;
  const setP = (k) => (v) => update((st) => { st.profile[k] = v; });
  const setS = (k) => (v) => update((st) => { st.settings[k] = v; });
  const [withPhotos, setWithPhotos] = useState(true);
  const [persisted, setPersisted] = useState(null);
  const [usage, setUsage] = useState(null);
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => {});
    navigator.storage?.estimate?.().then((e) => setUsage(e.usage)).catch(() => {});
  }, []);

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

      ${cloudEnabled && html`<${AccountCard} />`}

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

      ${cloudEnabled && html`
        <section class="card stack-sm">
          <h3 class="up">Social</h3>
          <${Check} checked=${s.settings.socialPublic !== false} onChange=${setS('socialPublic')}>Aparecer no ranking geral (nível, XP, cargas)<//>
          <${Check} checked=${s.settings.socialShareWorkouts !== false} onChange=${setS('socialShareWorkouts')}>Compartilhar meus treinos com amigos<//>
          <p class="tiny muted">Dieta, peso, medidas e fotos nunca são compartilhados. Com o ranking desligado, só amigos veem seu resumo.</p>
        </section>
      `}

      <section class="card stack-sm">
        <h3 class="up">Aparência</h3>
        <${Seg} value=${s.settings.theme} onChange=${setS('theme')} options=${[['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Escuro']]} />
      </section>

      <section class="card stack-sm">
        <h3 class="up">Registro de treino</h3>
        <${Field} label="Coluna de intensidade padrão" hint="Cada exercício pode ter a sua (⋯ no exercício ou aba Treino → RM).">
          <${Seg} value=${s.settings.intensity ?? 'rpe'} onChange=${setS('intensity')} options=${[['rpe', 'RPE'], ['pct', '%RM'], ['none', 'Nenhuma']]} />
        <//>
      </section>

      <section class="card stack-sm">
        <h3 class="up">Corrida, bike e caminhada</h3>
        <${Check} checked=${s.settings.voice !== false} onChange=${setS('voice')}>Avisos por voz (cada km e troca de etapa)<//>
        <p class="tiny muted">O GPS liga sozinho ao iniciar uma atividade ao ar livre (desligue no próprio treino para esteira).</p>
      </section>

      <section class="card stack-sm">
        <h3 class="up">Backup</h3>
        <div class="row-sb small">
          <span>Armazenamento ${persisted ? html`<span class="tag acc">Persistente</span>` : html`<span class="tag">Padrão</span>`}</span>
          <span class="mono muted">${usage != null ? `${(usage / 1048576).toFixed(1)} MB usados` : ''}</span>
        </div>
        ${!persisted && html`<button class="btn sm" onClick=${async () => setPersisted(await requestPersistence())}>Proteger dados contra limpeza automática</button>`}
        <p class="small muted">Dieta, treinos, avaliações, fotos e XP são salvos automaticamente neste aparelho/navegador e funcionam offline. Instale o app (Adicionar à tela inicial) para máxima proteção. Exporte com frequência para não perder nada ao trocar de celular ou limpar o navegador.</p>
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

const SYNC_LABEL = {
  idle: ['Aguardando', ''],
  pending: ['Alterações a enviar', ''],
  syncing: ['Sincronizando…', ''],
  ok: ['Sincronizado', 'acc'],
  offline: ['Sem conexão — salvo no aparelho', ''],
};

function AccountCard() {
  const auth = useAuth();
  const sync = useSync();
  const u = auth.user;
  const [label, cls] = SYNC_LABEL[sync.status] ?? SYNC_LABEL.idle;
  const logout = async () => {
    if (!(await confirmDialog('Sair da conta neste aparelho? Seus dados continuam salvos na nuvem.', { ok: 'Sair', danger: false }))) return;
    await signOut();
    go('hoje');
  };
  return html`
    <section class="card stack-sm">
      <div class="row-sb"><h3 class="up">Conta</h3><span class=${`tag ${cls}`}>${label}</span></div>
      <dl class="kv">
        <dt>Usuário</dt><dd>@${u?.user_metadata?.username ?? '—'}</dd>
        <dt>E-mail</dt><dd style="overflow-wrap:anywhere">${u?.email ?? '—'}</dd>
        ${sync.at && html`<dt>Último envio/recebimento</dt><dd>${new Date(sync.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</dd>`}
      </dl>
      ${sync.status === 'offline' && sync.error && html`<p class="tiny muted">${sync.error}</p>`}
      <div class="grid-2">
        <button class="btn" onClick=${() => syncNow()}>Sincronizar</button>
        <button class="btn dark" onClick=${logout}>Sair</button>
      </div>
      <p class="tiny muted">Tudo é salvo no aparelho na hora e enviado à nuvem em seguida. Sem internet, o envio acontece quando a conexão voltar.</p>
    </section>
  `;
}
