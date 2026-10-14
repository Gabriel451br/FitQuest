// Rastreamento por GPS (puro, sem navegador): distância, ritmo atual, parciais por km,
// ganho de elevação e rota simplificada. Os pontos vêm de navigator.geolocation.
//
// Filtros contra o "ruído" do GPS:
//  - descarta leituras com precisão ruim (> 35 m);
//  - ignora micro-deslocamentos (parado no semáforo não soma distância);
//  - descarta saltos impossíveis (velocidade acima do limite da atividade).

const R = 6371008.8;
const rad = (d) => (d * Math.PI) / 180;

export function haversine(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Velocidade máxima plausível (m/s) por atividade.
export const MAX_SPEED = { run: 12, walk: 4, bike: 30 };
export const GPS_TYPES = ['run', 'walk', 'bike'];
export const MAX_ACC = 35;

export function createTrack() {
  // pts: [lat, lon, t(ms), distância acumulada (m)]
  return { dist: 0, gain: 0, pts: [], last: null, altRef: null, maxSpeed: 0, splits: [], fixes: 0, acc: null };
}

/**
 * Adiciona uma leitura. fix = { lat, lon, acc, alt, altAcc, t }.
 * opts = { type, elapsed } (elapsed: segundos de atividade no momento, para as parciais).
 * Retorna 'ok' | 'first' | 'noise' | 'jitter' | 'jump'.
 */
export function addFix(track, fix, { type = 'run', elapsed = 0 } = {}) {
  track.fixes++;
  track.acc = fix.acc ?? null;
  if (fix.acc != null && fix.acc > MAX_ACC) return 'noise';
  const p = { lat: fix.lat, lon: fix.lon, t: fix.t };
  if (!track.last) {
    track.last = p;
    track.pts.push([p.lat, p.lon, p.t, track.dist]);
    trackAlt(track, fix);
    return 'first';
  }
  const d = haversine(track.last, p);
  const dt = (p.t - track.last.t) / 1000;
  // parado / tremida do sinal: não move o ponto de referência
  if (d < Math.max(4, (fix.acc ?? 0) * 0.4)) return 'jitter';
  const v = dt > 0 ? d / dt : Infinity;
  if (v > (MAX_SPEED[type] ?? 30)) return 'jump';
  track.dist += d;
  if (dt >= 2) track.maxSpeed = Math.max(track.maxSpeed, v);
  track.last = p;
  track.pts.push([p.lat, p.lon, p.t, track.dist]);
  trackAlt(track, fix);
  while (track.dist >= (track.splits.length + 1) * 1000) {
    // interpola o instante exato em que o km fechou
    const prevDist = track.dist - d;
    const target = (track.splits.length + 1) * 1000;
    const frac = d > 0 ? (target - prevDist) / d : 1;
    track.splits.push(Math.round(elapsed - dt * (1 - frac)));
  }
  return 'ok';
}

// Elevação com histerese de 3 m (o altímetro do GPS oscila bastante).
function trackAlt(track, fix) {
  if (fix.alt == null || (fix.altAcc != null && fix.altAcc > 25)) return;
  if (track.altRef == null) { track.altRef = fix.alt; return; }
  const diff = fix.alt - track.altRef;
  if (diff >= 3) { track.gain += diff; track.altRef = fix.alt; }
  else if (diff <= -3) track.altRef = fix.alt;
}

// Ao pausar: o próximo ponto recomeça a contagem (o trecho parado não soma).
export function breakTrack(track) {
  track.last = null;
}

// Velocidade atual (m/s) pela janela dos últimos `win` segundos.
export function currentSpeed(track, now = Date.now(), win = 20) {
  const pts = track.pts;
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1];
  if (now - last[2] > 15000) return 0; // sem pontos novos = parado
  let i = pts.length - 2;
  while (i > 0 && last[2] - pts[i][2] < win * 1000) i--;
  const a = pts[i];
  const dt = (last[2] - a[2]) / 1000;
  if (dt < 3) return null;
  return (last[3] - a[3]) / dt;
}

// Parciais: tempo de cada km (s).
export function splitTimes(splits) {
  return splits.map((t, i) => t - (i ? splits[i - 1] : 0));
}

// Rota simplificada para guardar/desenhar (no máx. `max` pontos, 5 casas ≈ 1 m).
export function simplify(pts, max = 300) {
  if (!pts.length) return [];
  const step = Math.max(1, Math.ceil(pts.length / max));
  const out = [];
  for (let i = 0; i < pts.length; i += step) out.push([+pts[i][0].toFixed(5), +pts[i][1].toFixed(5)]);
  const last = pts[pts.length - 1];
  if ((pts.length - 1) % step) out.push([+last[0].toFixed(5), +last[1].toFixed(5)]);
  return out;
}

// Projeta a rota num retângulo (para SVG), mantendo a proporção.
export function projectRoute(route, w = 300, h = 180, pad = 10) {
  if (!route?.length) return [];
  const lat0 = rad(route.reduce((s, p) => s + p[0], 0) / route.length);
  const xy = route.map(([la, lo]) => [lo * Math.cos(lat0), -la]);
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY) || 1e-9;
  const k = Math.min((w - 2 * pad) / (maxX - minX || span), (h - 2 * pad) / (maxY - minY || span));
  const ox = (w - (maxX - minX) * k) / 2;
  const oy = (h - (maxY - minY) * k) / 2;
  return xy.map(([x, y]) => [+(ox + (x - minX) * k).toFixed(1), +(oy + (y - minY) * k).toFixed(1)]);
}
