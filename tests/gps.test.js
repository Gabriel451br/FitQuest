import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversine, createTrack, addFix, breakTrack, currentSpeed, splitTimes, simplify, projectRoute } from '../js/gps.js';
import { buildSteps, planDefaults, planTotals, advance, skip, stepProgress, paceStatus } from '../js/plans.js';

// ~1 m de latitude = 1/111195 grau
const M = 1 / 111195;

test('haversine: 1 km para o norte', () => {
  const d = haversine({ lat: -23.5, lon: -46.6 }, { lat: -23.5 + 1000 * M, lon: -46.6 });
  assert.ok(Math.abs(d - 1000) < 1, d);
});

test('track: soma distância, ignora ruído, tremida e saltos, fecha parciais', () => {
  const tr = createTrack();
  const t0 = 1_000_000;
  // 3 m/s (pace 5:33/km) por 700 s → 2,1 km, um ponto por segundo
  for (let i = 0; i <= 700; i++) addFix(tr, { lat: -23.5 + i * 3 * M, lon: -46.6, acc: 8, t: t0 + i * 1000 }, { type: 'run', elapsed: i });
  // a tremida de 1 s com 3 m fica abaixo do limiar → só soma a cada ~2 s; total deve fechar
  assert.ok(Math.abs(tr.dist - 2100) < 10, tr.dist);
  assert.equal(tr.splits.length, 2);
  assert.ok(Math.abs(splitTimes(tr.splits)[0] - 333) <= 2, tr.splits);
  // leitura imprecisa
  assert.equal(addFix(tr, { lat: 0, lon: 0, acc: 80, t: t0 + 701000 }), 'noise');
  // salto impossível (5 km em 1 s)
  assert.equal(addFix(tr, { lat: -23.5 + 7000 * M, lon: -46.6, acc: 5, t: t0 + 702000 }, { type: 'run' }), 'jump');
  // parado: não soma
  const before = tr.dist;
  for (let i = 0; i < 20; i++) addFix(tr, { lat: -23.5 + 2100 * M + (i % 2) * 2 * M, lon: -46.6, acc: 6, t: t0 + 703000 + i * 1000 }, { type: 'run' });
  assert.ok(tr.dist - before < 5, tr.dist - before);
  assert.equal(currentSpeed(tr, t0 + 722000) < 0.5, true);
});

test('track: pausa não soma o trecho parado; velocidade atual', () => {
  const tr = createTrack();
  for (let i = 0; i <= 60; i++) addFix(tr, { lat: i * 5 * M, lon: 0, acc: 5, t: i * 1000 }, { type: 'bike', elapsed: i });
  const v = currentSpeed(tr, 60000);
  assert.ok(Math.abs(v - 5) < 0.2, v);
  breakTrack(tr);
  addFix(tr, { lat: 2000 * M, lon: 0, acc: 5, t: 120000 }, { type: 'bike' });
  assert.ok(Math.abs(tr.dist - 300) < 2, tr.dist);
});

test('rota: simplifica e projeta', () => {
  const pts = Array.from({ length: 1000 }, (_, i) => [i * M, i * M, i, i]);
  const r = simplify(pts, 100);
  assert.ok(r.length <= 101 && r.length >= 99, r.length);
  const xy = projectRoute(r, 300, 180);
  assert.equal(xy.length, r.length);
  assert.ok(xy.every(([x, y]) => x >= 0 && x <= 300 && y >= 0 && y <= 180));
});

test('intervalado: etapas, totais e avanço por tempo/distância', () => {
  const p = { ...planDefaults('intervalado', 'run'), reps: 3, warm: 10, cool: 5, workDist: 400, workPace: 240, restTime: 90 };
  const st = buildSteps('intervalado', p);
  assert.deepEqual(st.map((x) => x.kind), ['warm', 'work', 'rest', 'work', 'rest', 'work', 'cool']);
  assert.equal(st[1].value, 0.4);
  assert.equal(st[1].pace, 240);
  const tot = planTotals(st);
  assert.ok(tot.sec > 900 + 300);
  let c = { idx: 0, t: 0, d: 0 };
  // 10 min de aquecimento cumpridos (1,6 km)
  let r = advance(st, c, 600, 1.6, true);
  assert.equal(r.cursor.idx, 1);
  assert.equal(r.laps[0].sec, 600);
  c = r.cursor;
  // tiro 400 m
  assert.equal(advance(st, c, 650, 1.9, true).cursor.idx, 1);
  r = advance(st, c, 690, 2.0, true);
  assert.equal(r.cursor.idx, 2);
  assert.equal(r.laps[0].sec, 90);
  assert.equal(r.cursor.d, 2.0);
  // sem GPS: etapa de distância não avança sozinha; botão pula
  assert.equal(advance(st, { idx: 1, t: 600, d: 0 }, 900, 0, false).cursor.idx, 1);
  const sk = skip(st, { idx: 1, t: 600, d: 0 }, 700, 0, false);
  assert.equal(sk.cursor.idx, 2);
  assert.equal(sk.laps[0].sec, 100);
  // volta depois de muito tempo em segundo plano: recupera várias etapas de tempo
  const ft = buildSteps('fartlek', { warm: 0, reps: 3, hard: 60, easy: 60, cool: 0 });
  assert.equal(advance(ft, { idx: 0, t: 0, d: 0 }, 250, 0, false).cursor.idx, 4);
  const pr = stepProgress(st[0], { idx: 0, t: 0, d: 0 }, 300, 0);
  assert.equal(pr.pct, 0.5);
});

test('outros modelos e ritmo alvo', () => {
  assert.equal(buildSteps('longao', { dist: 15, pace: 360 })[0].value, 15);
  const pg = buildSteps('progressivo', { blocks: 3, blockKm: 2, startPace: 360, drop: 15 });
  assert.deepEqual(pg.map((x) => x.pace), [360, 345, 330]);
  assert.equal(buildSteps('ritmo', { warm: 10, tempoBy: 'time', tempoTime: 20, tempoPace: 300, cool: 5 }).length, 3);
  assert.equal(buildSteps('livre', {}).length, 0);
  assert.equal(paceStatus(300, 280), 'fast');
  assert.equal(paceStatus(300, 325), 'slow');
  assert.equal(paceStatus(300, 305), 'ok');
});
