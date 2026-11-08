// Faixa de Jiu-Jitsu (com graus na ponta) ou insígnia militar para um nível.
import { html } from '../lib.js';
import { rankFor } from '../ranks.js';
import { getState } from '../store.js';

export const rankStyle = (s = getState()) => s.settings?.rankStyle ?? 'faixa';

export function RankBadge({ level, style = rankStyle(), size = 'md', label = false }) {
  const r = rankFor(level, style);
  if (r.style === 'militar') {
    return html`<span class=${`rank-mil ${size}`} title=${r.name}><b>${r.insignia}</b>${label && html`<em>${r.short}</em>`}</span>`;
  }
  return html`
    <span class=${`belt ${size}`} title=${r.full} style=${`--belt:${r.color};--tip:${r.tip}`}>
      <i class="belt-body"></i>
      <i class="belt-tip">${Array.from({ length: r.stripes }, () => html`<s></s>`)}</i>
      ${label && html`<em>${r.short}${r.stripes ? ` ${r.stripes}º` : ''}</em>`}
    </span>
  `;
}
