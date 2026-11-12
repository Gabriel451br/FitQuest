import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, exerciseById } from '../js/selectors.js';
import { instantiateProgram, PROGRAM_TEMPLATES } from '../js/data/programs.js';
import { blockProgress, suggestProgression, weekGuide, deloadSets, activeProgram } from '../js/programs.js';

let n = 0;
const uid = () => `id${++n}`;

function setup() {
  const s = emptyState();
  const { folder, workouts, program } = instantiateProgram('dad-strength', uid);
  s.workoutFolders.push(folder);
  s.workouts.push(...workouts);
  program.status = 'active';
  program.blockStartedAt = 1000;
  s.programs.push(program);
  s.activeProgramId = program.id;
  return { s, program };
}

const finish = (s, p, workoutId, t) => s.sessions.push({
  id: uid(), date: '2026-11-0' + ((t % 9) + 1), type: 'strength', workoutId, programId: p.id, blockId: p.blocks[p.blockIndex].id,
  startedAt: 2000 + t, finishedAt: 3000 + t, exercises: [{ exId: 'agachamento', sets: [{ kg: 100, reps: 8, done: true }] }],
});

test('Dad Strength: Base < Hipertrofia > Potência em nº de exercícios; tudo cadastrado', () => {
  const { s, program } = setup();
  assert.equal(program.blocks.length, 3);
  assert.deepEqual(program.blocks.map((b) => b.weeks), [6, 8, 6]);
  assert.equal(s.workouts.length, 9);
  for (const w of s.workouts) for (const e of w.exercises) assert.notEqual(exerciseById(s, e.exId).name, e.exId, `exercício ${e.exId} não cadastrado`);
  const count = (bi) => program.blocks[bi].workoutIds.reduce((a, id) => a + s.workouts.find((w) => w.id === id).exercises.length, 0);
  assert.ok(count(1) > count(0) && count(1) > count(2), 'hipertrofia tem mais exercícios');
  const sq = s.workouts[0].exercises.find((e) => e.exId === 'agachamento');
  assert.equal(sq.prog, 'pct');
  assert.equal(sq.groups[0].pct, 62.5);
  assert.equal(s.workouts[3].exercises[0].prog, 'w531');
  assert.ok(s.workouts.every((w) => w.folderId === s.workoutFolders[0].id), 'treinos ficam na pasta do programa');
  assert.equal(program.templateVersion, PROGRAM_TEMPLATES['dad-strength'].version);
});

test('semana avança ao concluir A, B e C; rodízio e deload na semana 7', () => {
  const { s, program } = setup();
  const [A, B, C] = program.blocks[0].workoutIds;
  let bp = blockProgress(s, program);
  assert.equal(bp.week, 1);
  assert.equal(bp.nextWorkoutId, A);
  finish(s, program, A, 1);
  finish(s, program, B, 2);
  bp = blockProgress(s, program);
  assert.equal(bp.week, 1);
  assert.equal(bp.nextWorkoutId, C);
  assert.deepEqual(bp.doneThisWeek, [A, B]);
  finish(s, program, C, 3);
  bp = blockProgress(s, program);
  assert.equal(bp.week, 2);
  assert.equal(bp.nextWorkoutId, A);
  assert.deepEqual(bp.doneThisWeek, []);
  // sessões de antes do início do bloco ou de outro programa não contam
  s.sessions.push({ id: 'x', type: 'strength', workoutId: A, programId: 'outro', blockId: program.blocks[0].id, startedAt: 5000, finishedAt: 6000, date: '2026-11-01', exercises: [] });
  assert.equal(blockProgress(s, program).sessions, 3);
  for (let t = 4; t <= 15; t++) finish(s, program, [A, B, C][t % 3], t);
  bp = blockProgress(s, program);
  assert.equal(bp.week, 6);
  assert.equal(bp.guide.deload, true);
  assert.equal(deloadSets(3), 2);
  for (let t = 16; t <= 18; t++) finish(s, program, [A, B, C][t % 3], t);
  assert.equal(blockProgress(s, program).finished, true);
  assert.equal(weekGuide(program.blocks[0], 3).rpe, '6-7');
  assert.ok(activeProgram(s));
});

test('sistemas de progressão', () => {
  // top set + back-off: topo da faixa no RPE alvo → sobe carga e back-off ~10% menor
  const ts = suggestProgression('topset', { sets: [{ kg: 80, reps: 6, rpe: 7.5, kind: 'top' }, { kg: 72, reps: 6, kind: 'backoff' }, { kg: 72, reps: 6, kind: 'backoff' }] }, '4-6', { step: 2, targetRpe: 8 });
  assert.equal(ts.kg, 82);
  assert.equal(ts.reps, 4);
  assert.equal(ts.backoffKg, 74);
  const ts2 = suggestProgression('topset', { sets: [{ kg: 80, reps: 5, rpe: 8, kind: 'top' }] }, '4-6', { step: 2 });
  assert.equal(ts2.kg, 80);
  // progressão dupla (exemplo do PDF: rosca Scott 10 kg, 12/12 → sobe)
  assert.equal(suggestProgression('double', { sets: [{ kg: 10, reps: 12 }, { kg: 10, reps: 12 }] }, '8-12', { step: 2 }).kg, 12);
  const d2 = suggestProgression('double', { sets: [{ kg: 10, reps: 11 }, { kg: 10, reps: 10 }] }, '8-12', { step: 2 });
  assert.equal(d2.kg, 10);
  assert.equal(d2.reps, 11);
  // RPE: abaixo do alvo sobe, acima desce
  assert.ok(suggestProgression('rpe', { sets: [{ kg: 100, reps: 5, rpe: 6 }] }, '3-5', { step: 5, targetRpe: 8 }).kg > 100);
  assert.ok(suggestProgression('rpe', { sets: [{ kg: 100, reps: 5, rpe: 9.5 }] }, '3-5', { step: 5, targetRpe: 8 }).kg < 100);
  // explosivo: só sobe com execução consistente
  assert.equal(suggestProgression('explosive', { sets: [{ kg: 60, reps: 3, rpe: 6 }, { kg: 60, reps: 3, rpe: 6 }] }, '2-3', { step: 5 }).kg, 62.5);
  assert.equal(suggestProgression('explosive', { sets: [{ kg: 60, reps: 1, rpe: 8 }, { kg: 60, reps: 2 }] }, '2-3', { step: 5 }).kg, 60);
  // linear
  assert.equal(suggestProgression('linear', { sets: [{ kg: 50, reps: 5 }, { kg: 50, reps: 5 }] }, '5', { step: 2.5 }).kg, 52.5);
});

test('todos os modelos: exercícios cadastrados, semanas e treinos coerentes', () => {
  for (const key of Object.keys(PROGRAM_TEMPLATES)) {
    const s = emptyState();
    const { workouts, program } = instantiateProgram(key, uid);
    s.workouts.push(...workouts);
    for (const w of workouts) for (const e of w.exercises) {
      assert.notEqual(exerciseById(s, e.exId).name, e.exId, `${key}: exercício ${e.exId} não cadastrado`);
      assert.ok(e.sets >= 1 && e.reps, `${key}: ${e.exId} sem séries/reps`);
    }
    assert.ok(program.blocks.every((b) => b.workoutIds.length && b.weeks >= 1), key);
  }
  const t = instantiateProgram('tronco-arvore', uid);
  assert.equal(t.program.blocks.reduce((a, b) => a + b.weeks, 0), 12);
  const day = (bi, di) => t.workouts[bi * 3 + di];
  const sets = (w) => w.exercises.reduce((a, e) => a + e.sets, 0);
  const a1 = day(0, 0);
  assert.equal(a1.warmup.length, 4);
  // bloco 1: básicos em %RM
  const terra = a1.exercises[0];
  assert.deepEqual([terra.exId, terra.prog, terra.groups[0].pct, terra.section], ['levantamento-terra', 'pct', 65, 'Força principal']);
  assert.equal(day(0, 2).exercises.find((e) => e.exId === 'rack-pull').pctOf, 'levantamento-terra');
  // braços e panturrilha em todos os blocos (hipertrofia/manutenção)
  const ARMS = ['rosca-direta', 'rosca-martelo', 'rosca-inversa', 'triceps-testa', 'triceps-corda', 'triceps-frances'];
  for (let bi = 0; bi < 3; bi++) {
    const ex = [0, 1, 2].flatMap((d) => day(bi, d).exercises.map((e) => e.exId));
    assert.ok(ex.filter((id) => ARMS.includes(id)).length >= 4, `bloco ${bi + 1}: braços`);
    assert.equal(ex.filter((id) => id.startsWith('panturrilha')).length, 3, `bloco ${bi + 1}: panturrilha 3×`);
    assert.equal(ex.filter((id) => id.startsWith('pescoco')).length, 3, `bloco ${bi + 1}: pescoço 3×`);
  }
  // bloco 2: Heavy Duty — menos da metade das séries do bloco 1, 1 série até a falha
  for (let d = 0; d < 3; d++) {
    assert.ok(sets(day(1, d)) * 2 < sets(day(0, d)), 'heavy duty: poucas séries');
    assert.ok(day(1, d).exercises.length <= 8);
    assert.ok(day(1, d).exercises.filter((e) => e.prog === 'hd').every((e) => e.sets === 1));
    assert.ok(day(1, d).exercises.filter((e) => e.prog === 'hd').length >= 4);
  }
  assert.equal(weekGuide(t.program.blocks[1], 3).rp, true);
  // bloco 3: explosivo abre o treino, básicos autorregulados; semana 4 é teste, não deload
  for (let d = 0; d < 3; d++) assert.equal(day(2, d).exercises[0].section, 'Explosão');
  assert.equal(day(2, 0).exercises[1].prog, 'haack');
  assert.equal(weekGuide(t.program.blocks[2], 4).deload, false);
  assert.equal(weekGuide(t.program.blocks[2], 4).test, true);
  assert.equal(weekGuide(t.program.blocks[0], 4).deload, true);
});
