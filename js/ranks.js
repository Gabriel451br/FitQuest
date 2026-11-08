// Graduações ligadas ao nível (XP): faixas de Jiu-Jitsu com graus ou patentes militares
// (Exército Brasileiro). Puro: usado no app, no social e nos testes.

export const RANK_STYLES = {
  faixa: { label: 'Faixas (Jiu-Jitsu)', short: 'Faixas' },
  militar: { label: 'Patentes (militar)', short: 'Patentes' },
};

// Faixas: [nível inicial, nome, cor, cor da ponta, máx. de graus, níveis por grau]
const BELTS = [
  [1, 'Faixa Branca', '#f4f2ea', '#0b0b0b', 4, 2],
  [11, 'Faixa Azul', '#1f5fd6', '#0b0b0b', 4, 2],
  [21, 'Faixa Roxa', '#6b2fb3', '#0b0b0b', 4, 2],
  [31, 'Faixa Marrom', '#6e4022', '#0b0b0b', 4, 2],
  [41, 'Faixa Preta', '#111111', '#c8102e', 6, 3],
  [61, 'Faixa Coral', 'repeating-linear-gradient(90deg,#c8102e 0 14%,#111 14% 28%)', '#f4f2ea', 0, 99],
  [71, 'Faixa Vermelha', '#c8102e', '#f4f2ea', 0, 99],
];

// Patentes: [nível inicial, nome, sigla, insígnia]
const MILITARY = [
  [1, 'Recruta', 'REC', '·'],
  [2, 'Soldado', 'SD', '▾'],
  [4, 'Cabo', 'CB', '▾▾'],
  [6, '3º Sargento', '3SGT', '▾▾▾'],
  [9, '2º Sargento', '2SGT', '▾▾▾▾'],
  [12, '1º Sargento', '1SGT', '▾▾▾▾▾'],
  [15, 'Subtenente', 'ST', '◆'],
  [18, 'Aspirante a Oficial', 'ASP', '✦'],
  [21, '2º Tenente', '2TEN', '★'],
  [24, '1º Tenente', '1TEN', '★★'],
  [28, 'Capitão', 'CAP', '★★★'],
  [32, 'Major', 'MAJ', '✪'],
  [36, 'Tenente-Coronel', 'TC', '✪✪'],
  [41, 'Coronel', 'CEL', '✪✪✪'],
  [47, 'General de Brigada', 'GEN BDA', '✸✸'],
  [54, 'General de Divisão', 'GEN DIV', '✸✸✸'],
  [62, 'General de Exército', 'GEN EX', '✸✸✸✸'],
  [71, 'Marechal', 'MAL', '✸✸✸✸✸'],
];

const pick = (list, level) => {
  let i = 0;
  while (i + 1 < list.length && level >= list[i + 1][0]) i++;
  return i;
};

export function rankFor(level, style = 'faixa') {
  level = Math.max(1, Math.floor(level || 1));
  if (style === 'militar') {
    const i = pick(MILITARY, level);
    const [from, name, short, insignia] = MILITARY[i];
    const next = MILITARY[i + 1];
    return { style, index: i, name, full: name, short, insignia, from, nextLevel: next?.[0] ?? null, nextName: next?.[1] ?? null };
  }
  const i = pick(BELTS, level);
  const [from, name, color, tip, maxStripes, per] = BELTS[i];
  const next = BELTS[i + 1];
  const stripes = Math.min(maxStripes, Math.floor((level - from) / per));
  const nextStripeLevel = stripes < maxStripes ? from + (stripes + 1) * per : null;
  const nextLevel = nextStripeLevel && (!next || nextStripeLevel < next[0]) ? nextStripeLevel : next?.[0] ?? null;
  const gr = (n) => (n === 1 ? '1 grau' : `${n} graus`);
  return {
    style, index: i, name, full: stripes ? `${name} · ${gr(stripes)}` : name, short: name.replace('Faixa ', ''), color, tip, stripes, maxStripes, from,
    nextLevel, nextName: nextLevel == null ? null : nextLevel === next?.[0] ? next[1] : `${name} · ${gr(stripes + 1)}`,
  };
}

// Todas as graduações do estilo (para a escada na Jornada).
export function rankLadder(style = 'faixa') {
  return style === 'militar'
    ? MILITARY.map(([from]) => rankFor(from, 'militar'))
    : BELTS.map(([from]) => rankFor(from, 'faixa'));
}

// Mudou de graduação entre dois níveis? (promoção ou novo grau)
export function rankChange(prevLevel, level, style = 'faixa') {
  const a = rankFor(prevLevel, style);
  const b = rankFor(level, style);
  if (a.full === b.full) return null;
  return { rank: b, promotion: a.index !== b.index };
}
