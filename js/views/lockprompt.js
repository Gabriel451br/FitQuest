// Convite (uma vez) para ativar o painel do treino na tela de bloqueio.
import { html } from '../lib.js';
import { update } from '../store.js';
import { toast } from '../ui.js';
import { lockPermission, enableLockScreen } from '../lockscreen.js';

export function LockPrompt({ s }) {
  if (lockPermission() !== 'default' || s.settings.lockPromptDismissed) return null;
  const dismiss = () => update((st) => { st.settings.lockPromptDismissed = true; });
  return html`
    <div class="callout small row-sb" style="gap:8px;border-left-color:var(--accent)">
      <span>📱 Ver este treino na <b>tela de bloqueio</b> quando bloquear o celular?</span>
      <span class="row" style="gap:6px;flex:none">
        <button class="btn xs dark" onClick=${async () => { const ok = await enableLockScreen(); toast(ok ? 'Ativado: bloqueie a tela para ver' : 'Permissão não concedida'); dismiss(); }}>Ativar</button>
        <button class="x-btn" aria-label="Agora não" onClick=${dismiss}>×</button>
      </span>
    </div>
  `;
}
