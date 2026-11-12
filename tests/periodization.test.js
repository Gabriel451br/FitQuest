import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, migrate } from '../js/selectors.js';
import { prescribe, prescribedSets, rpePct, kgFor, heavyDutySets } from '../js/periodization.js';
import { instantiateProgram, upgradeProgram, PROGRAM_TEMPLATES } from '../js/data/programs.js';
import { blockProgress, suggestProgression } from '../js/programs.js';

test('RPE → %1RM (Epley com reps em reserva)', () => {
  assert.equal(rpePct(1, 10), 100);
  assert.ok(Math.abs(rpePct(3, 8) - 85.7) < 0.2);
  assert.ok(rpePct(5, 8) < rpePct(3, 8));
  assert.equal(kgFor(65, 200), 130);
  assert.equal(kgFor(62.5, 101), 62.5);
});

test('%RM linear: +2,5%/semana, grupos (top + AMRAP) e deload', () => {
  const item = { prog: 'pct', groups: [{ sets: 2, reps: '5', pct: 65, kind: 'top' }, { sets: 3, reps: '8+', pct: 60, kind: 'amrap' }] };
  const w1 = prescribe(item, { week: 1, oneRm: 200 });
  assert.deepEqual(w1.groups.map((g) => g.pct), [65, 60]);
  const w3 = prescribe(item, { week: 3, oneRm: 200 });
  assert.deepEqual(w3.groups.map((g) => g.pct), [70, 65]);
  const sets = prescribedSets(w3);
  assert.equal(sets.length, 5);
  assert.deepEqual(sets.map((x) => x.kg), [140, 140, 130, 130, 130]);
  assert.equal(sets[2].kind, 'amrap');
  assert.equal(sets[2].tReps, '8+');
  const dl = prescribe(item, { week: 4, deload: true, oneRm: 200 });
  assert.ok(dl.groups.every((g) => !String(g.reps).includes('+')));
  assert.equal(prescribedSets(dl).length, 1 + 2);
});

test('5/3/1: TM 90%, semanas 5s/3s/531/deload e BBB', () => {
  const item = { prog: 'w531', supp: 'bbb' };
  const w1 = prescribe(item, { week: 1, oneRm: 100 });
  assert.equal(w1.base, 90);
  const s1 = prescribedSets(w1);
  assert.deepEqual(s1.slice(0, 3).map((x) => x.kg), [57.5, 67.5, 77.5]);
  assert.equal(s1[2].kind, 'amrap');
  assert.equal(s1.length, 8);
  const w3 = prescribedSets(prescribe(item, { week: 3, oneRm: 100 }));
  assert.equal(w3[2].kg, 85);
  assert.equal(w3[2].tReps, '1+');
  const w4 = prescribe(item, { week: 4, oneRm: 100 });
  assert.equal(prescribedSets(w4).length, 3, 'deload sem BBB');
  assert.equal(prescribe(item, { week: 5, oneRm: 100 }).groups[0].pct, 65, 'ciclo recomeça');
});

test('Juggernaut: acumulação → intensificação → realização AMRAP → deload', () => {
  const item = { prog: 'jugg' };
  const acc = prescribe(item, { week: 1, wave: 8, oneRm: 200 });
  assert.deepEqual([acc.groups[0].sets, acc.groups[0].reps, acc.groups[0].pct], [5, '8', 65]);
  const real = prescribedSets(prescribe(item, { week: 3, wave: 8, oneRm: 200 }));
  const amrap = real.find((x) => x.kind === 'amrap');
  assert.equal(amrap.kg, 145); // 80% de 180 (TM)
  assert.equal(amrap.tReps, '8+');
  assert.ok(real.filter((x) => x.kind === 'warmup').length === 3);
  assert.equal(prescribe(item, { week: 4, wave: 8, oneRm: 200 }).groups[0].pct, 40);
});

test('Autorregulada (Haack): top set pelo RPE + back-offs −10%', () => {
  const rx = prescribe({ prog: 'haack', sets: 4, reps: '3' }, { week: 2, rpe: 8, oneRm: 200 });
  const sets = prescribedSets(rx);
  assert.equal(sets.length, 4);
  assert.equal(sets[0].kind, 'top');
  assert.equal(sets[0].tRpe, 8);
  assert.equal(sets[0].kg, 172.5); // 85,7% de 200
  assert.equal(sets[1].kind, 'backoff');
  assert.equal(sets[1].kg, 155);
  // semana de teste puxa o RPE para 9+
  assert.equal(prescribe({ prog: 'haack', sets: 4, reps: '3' }, { test: true, rpe: 8, oneRm: 200 }).groups[0].rpe, 9);
});

// Estrutura real da conta: Tronco ativo (bloco 1, semana 1, 1 treino feito) e Dad Strength com
// o programa apontando para treinos que sumiram, enquanto a pasta antiga ficou com cópias.
function legacyAccount() {
  let n = 0;
  const uid = () => `x${++n}`;
  const s = emptyState();
  const dadOld = instantiateProgram('dad-strength', uid);
  s.workoutFolders.push(dadOld.folder);
  // cópias v1 da pasta do Dad (nomes antigos)
  const oldNames = ['B1 · A — Power & Strength', 'B1 · B — Deadlift & Grip', 'B1 · C — Hypertrophy & Armor', 'B2 · A — Upper strength + braços', 'B2 · B — Posterior', 'B2 · C — Lower & Armor', 'B3 · A — Power', 'B3 · B — Deadlift & Grip', 'B3 · C — Squat & Armor'];
  oldNames.forEach((name, i) => s.workouts.push({ id: `old${i}`, type: 'strength', name, folderId: dadOld.folder.id, exercises: [{ exId: 'agachamento', sets: 3, reps: '5' }] }));
  const dadProg = { ...dadOld.program, id: 'dadP', templateVersion: undefined, status: 'active', blockStartedAt: 10, blocks: dadOld.program.blocks.map((b, i) => ({ ...b, workoutIds: [`gone${i}a`, `gone${i}b`, `gone${i}c`] })) };
  delete dadProg.templateVersion;
  const tr = instantiateProgram('tronco-arvore', uid);
  s.workoutFolders.push(tr.folder);
  s.workouts.push(...tr.workouts.map((w) => ({ ...w, exercises: [{ exId: 'levantamento-terra', sets: 4, reps: '6-8' }] })));
  const trProg = { ...tr.program, id: 'trP', status: 'active', blockStartedAt: 100 };
  delete trProg.templateVersion;
  s.programs.push(dadProg, trProg);
  s.activeProgramId = 'trP';
  s.sessions.push({ id: 'ses1', type: 'strength', date: '2026-11-10', workoutId: trProg.blocks[0].workoutIds[0], programId: 'trP', blockId: trProg.blocks[0].id, week: 1, startedAt: 200, finishedAt: 300, exercises: [{ exId: 'levantamento-terra', sets: [{ kg: 120, reps: 8, done: true }] }] });
  return { s, trProg, dadProg };
}

test('upgrade mantém o progresso do programa atual (ids, semana, treino feito)', () => {
  const { s, trProg } = legacyAccount();
  const before = { ids: trProg.blocks.map((b) => b.id), w: trProg.blocks.map((b) => [...b.workoutIds]), bp: blockProgress(s, trProg) };
  const nW = s.workouts.length;
  assert.ok(upgradeProgram(s, trProg));
  assert.deepEqual(trProg.blocks.map((b) => b.id), before.ids);
  assert.deepEqual(trProg.blocks.map((b) => b.workoutIds), before.w);
  const bp = blockProgress(s, trProg);
  assert.equal(bp.sessions, 1);
  assert.equal(bp.week, 1);
  assert.equal(bp.nextWorkoutId, before.bp.nextWorkoutId);
  assert.equal(trProg.blockStartedAt, 100);
  assert.equal(trProg.status, 'active');
  // conteúdo novo: base com %RM e poucos exercícios
  const a = s.workouts.find((w) => w.id === trProg.blocks[0].workoutIds[0]);
  assert.equal(a.exercises[0].prog, 'pct');
  assert.equal(a.exercises.length, 9);
  assert.equal(s.workouts.length, nW, 'não duplica treinos');
  assert.equal(upgradeProgram(s, trProg), false, 'idempotente');
});

test('upgrade repara programa órfão adotando os treinos da pasta (sem duplicar)', () => {
  const { s, dadProg } = legacyAccount();
  const nW = s.workouts.length;
  upgradeProgram(s, dadProg);
  assert.deepEqual(dadProg.blocks[0].workoutIds, ['old0', 'old1', 'old2']);
  assert.deepEqual(dadProg.blocks[2].workoutIds, ['old6', 'old7', 'old8']);
  assert.equal(s.workouts.length, nW);
  assert.equal(s.workouts.find((w) => w.id === 'old0').name, 'B1 · A — Base: Agachamento + Supino');
  assert.deepEqual(dadProg.blocks.map((b) => b.weeks), [6, 8, 6]);
});

test('migrate aplica o upgrade ao carregar', () => {
  const { s } = legacyAccount();
  const m = migrate(JSON.parse(JSON.stringify(s)));
  assert.ok(m.programs.every((p) => p.templateVersion === PROGRAM_TEMPLATES[p.template].version));
  assert.equal(m.sessions.length, 1);
});

test('instalar de novo um programa cuja pasta ficou não duplica os treinos', async () => {
  const { installInto } = await import('../js/data/programs.js');
  let n = 0;
  const uid = () => `y${++n}`;
  const s = emptyState();
  installInto(s, 'tronco-arvore', uid);
  const nW = s.workouts.length;
  const folders = s.workoutFolders.length;
  s.programs = []; // excluiu o programa; treinos continuam na pasta
  const id = installInto(s, 'tronco-arvore', uid);
  assert.equal(s.workouts.length, nW);
  assert.equal(s.workoutFolders.length, folders);
  const p = s.programs.find((x) => x.id === id);
  assert.ok(p.blocks.every((b) => b.workoutIds.length === 3 && b.workoutIds.every((w) => s.workouts.some((x) => x.id === w))));
});

test('Heavy Duty: aquecimentos + 1 série até a falha, rest-pause e deload', () => {
  const item = { prog: 'hd', sets: 1, reps: '6-8', warm: 2, rp: 1 };
  const wk2 = heavyDutySets(item, { kg: 40, step: 1 });
  assert.deepEqual(wk2.map((x) => x.kind), ['warmup', 'warmup', 'failure']);
  assert.deepEqual(wk2.map((x) => x.kg), [20, 30, 40]);
  // calibração (semana 1): para antes da falha
  assert.equal(heavyDutySets(item, { kg: 40, toFailure: false }).pop().kind, 'top');
  // intensificação: + rest-pause com a mesma carga
  const wk3 = heavyDutySets(item, { kg: 40, rp: true });
  assert.deepEqual(wk3.map((x) => x.kind), ['warmup', 'warmup', 'failure', 'restpause']);
  assert.equal(wk3[3].kg, 40);
  // deload: 1 série leve, sem falha nem rest-pause
  const dl = heavyDutySets(item, { kg: 40, rp: true, deload: true });
  assert.deepEqual(dl.map((x) => x.kind), ['warmup', 'warmup', 'work']);
  assert.equal(dl[2].kg, 36);
  // sem histórico: estrutura sem cargas
  assert.ok(heavyDutySets({ sets: 1, warm: 1 }, {}).every((x) => x.kg == null));
  // progressão: topo da faixa na série até a falha → sobe; senão mantém e busca +1 rep
  const up = suggestProgression('hd', { sets: [{ kg: 40, reps: 8, kind: 'failure' }, { kg: 40, reps: 3, kind: 'restpause' }] }, '6-8', { step: 2 });
  assert.equal(up.kg, 42);
  const keep = suggestProgression('hd', { sets: [{ kg: 40, reps: 6, kind: 'failure' }] }, '6-8', { step: 2 });
  assert.deepEqual([keep.kg, keep.reps], [40, 7]);
  // vindo do bloco anterior (3 séries normais): usa a mais pesada
  assert.equal(suggestProgression('hd', { sets: [{ kg: 30, reps: 8 }, { kg: 30, reps: 8 }] }, '6-8', { step: 2 }).kg, 32);
});

test('top set autorregulado respeita o teto de RPE (básicos sem falha no Heavy Duty)', () => {
  const rx = prescribe({ prog: 'haack', sets: 2, reps: '6', rpeMax: 9 }, { week: 2, rpe: 10, oneRm: 150 });
  assert.equal(rx.groups[0].rpe, 9);
  assert.equal(prescribedSets(rx).length, 2);
  assert.equal(prescribe({ prog: 'haack', sets: 2, reps: '6', rpeMax: 8 }, { rpe: 8, oneRm: 150 }).groups[0].rpe, 8);
});

test('Tronco v2 → v3 mantém bloco, semana e treino feito', () => {
  const { s, trProg } = legacyAccount();
  upgradeProgram(s, trProg, { ...PROGRAM_TEMPLATES['tronco-arvore'], version: 2 });
  trProg.templateVersion = 2;
  const ids = trProg.blocks.map((b) => [b.id, ...b.workoutIds]);
  const next = blockProgress(s, trProg).nextWorkoutId;
  assert.ok(upgradeProgram(s, trProg));
  assert.equal(trProg.templateVersion, 3);
  assert.deepEqual(trProg.blocks.map((b) => [b.id, ...b.workoutIds]), ids);
  const bp = blockProgress(s, trProg);
  assert.deepEqual([bp.week, bp.sessions, bp.nextWorkoutId], [1, 1, next]);
  assert.equal(s.workouts.find((w) => w.id === trProg.blocks[1].workoutIds[0]).exercises[1].prog, 'hd');
});

test('Heavy Duty: vindo de reps altas, calcula a carga para falhar na faixa nova', () => {
  // tríceps testa 20 kg × 15 @9 → faixa 8–10
  const s1 = suggestProgression('hd', { sets: [{ kg: 20, reps: 15, rpe: 9 }] }, '8-10', { step: 2 });
  assert.equal(s1.kg, 23);
  // panturrilha 90 kg × 20 → faixa 10–12 (passo de 5 kg, arredonda em 2,5)
  const s2 = suggestProgression('hd', { sets: [{ kg: 90, reps: 20 }] }, '10-12', { step: 5 });
  assert.ok(s2.kg >= 105 && s2.kg <= 110);
});
