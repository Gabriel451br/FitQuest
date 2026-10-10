// Gráficos SVG minimalistas (sem dependências).
import { html } from './lib.js';
import { fmtDate, diffDays, num } from './util.js';

const W = 340;

function niceRange(min, max) {
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    return [min - pad, max + pad];
  }
  const pad = (max - min) * 0.12;
  return [min - pad, max + pad];
}

// points: [{ date: 'YYYY-MM-DD', y }]
export function LineChart({ points, height = 160, unit = '', decimals = 1, goal = null }) {
  if (!points || points.length < 2) {
    return html`<div class="empty-chart">Registre ao menos 2 pontos para ver o gráfico.</div>`;
  }
  const H = height;
  const pl = 36, pr = 10, pt = 12, pb = 22;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0].date;
  const span = Math.max(1, diffDays(sorted[sorted.length - 1].date, first));
  const ys = sorted.map((p) => p.y).concat(goal != null ? [goal] : []);
  const [lo, hi] = niceRange(Math.min(...ys), Math.max(...ys));
  const x = (d) => pl + (diffDays(d, first) / span) * (W - pl - pr);
  const y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  const path = sorted.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.y).toFixed(1)}`).join('');
  const area = `${path}L${x(sorted[sorted.length - 1].date).toFixed(1)},${H - pb}L${pl},${H - pb}Z`;
  const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15];
  const showPts = sorted.length <= 40;
  return html`
    <svg class="chart" viewBox=${`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de evolução">
      ${ticks.map((t) => html`
        <line class="grid" x1=${pl} x2=${W - pr} y1=${y(t)} y2=${y(t)} />
        <text x=${pl - 6} y=${y(t) + 3} text-anchor="end">${num(t, decimals && hi - lo < 10 ? 1 : 0)}</text>
      `)}
      ${goal != null && html`
        <line x1=${pl} x2=${W - pr} y1=${y(goal)} y2=${y(goal)} stroke="var(--danger)" stroke-width="1.5" stroke-dasharray="6 4" />
        <text x=${W - pr} y=${y(goal) - 4} text-anchor="end" style="fill:var(--danger)">meta ${num(goal, decimals)}${unit}</text>
      `}
      <path class="area" d=${area} />
      <path class="line" d=${path} />
      ${showPts && sorted.map((p) => html`<rect class="pt" x=${x(p.date) - 3.5} y=${y(p.y) - 3.5} width="7" height="7"><title>${fmtDate(p.date)}: ${num(p.y, decimals)}${unit}</title></rect>`)}
      <line class="axis" x1=${pl} x2=${W - pr} y1=${H - pb} y2=${H - pb} />
      <text x=${pl} y=${H - 6}>${fmtDate(first)}</text>
      <text x=${W - pr} y=${H - 6} text-anchor="end">${fmtDate(sorted[sorted.length - 1].date)}</text>
    </svg>
  `;
}

// bars: [{ label, value, hi? }]
export function BarChart({ bars, height = 140, target = null, unit = '' }) {
  if (!bars?.length) return null;
  const H = height;
  const pl = 8, pr = 8, pt = 14, pb = 20;
  const max = Math.max(...bars.map((b) => b.value), target ?? 0, 1) * 1.1;
  const bw = (W - pl - pr) / bars.length;
  const y = (v) => pt + (1 - v / max) * (H - pt - pb);
  return html`
    <svg class="chart" viewBox=${`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de barras">
      ${target != null && html`
        <line x1=${pl} x2=${W - pr} y1=${y(target)} y2=${y(target)} stroke="var(--danger)" stroke-width="1.5" stroke-dasharray="6 4" />
      `}
      ${bars.map((b, i) => html`
        <rect class=${`barr ${b.hi ? 'hi' : ''}`} x=${pl + i * bw + bw * 0.18} y=${y(b.value)} width=${bw * 0.64} height=${Math.max(0, H - pb - y(b.value))}>
          <title>${b.label}: ${num(b.value)}${unit}</title>
        </rect>
        <text x=${pl + i * bw + bw / 2} y=${H - 6} text-anchor="middle">${b.label}</text>
      `)}
      <line class="axis" x1=${pl} x2=${W - pr} y1=${H - pb} y2=${H - pb} />
    </svg>
  `;
}
