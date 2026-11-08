import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankFor, rankChange, rankLadder } from '../js/ranks.js';

test('faixas com graus', () => {
  assert.equal(rankFor(1).full, 'Faixa Branca');
  assert.equal(rankFor(3).full, 'Faixa Branca · 1 grau');
  assert.equal(rankFor(10).stripes, 4);
  assert.equal(rankFor(11).full, 'Faixa Azul');
  assert.equal(rankFor(41).name, 'Faixa Preta');
  assert.equal(rankFor(59).stripes, 6);
  assert.equal(rankFor(80).name, 'Faixa Vermelha');
  assert.equal(rankFor(7).nextName, 'Faixa Branca · 4 graus');
  assert.equal(rankFor(9).nextName, 'Faixa Azul');
  assert.equal(rankFor(10).nextName, 'Faixa Azul');
  assert.equal(rankFor(10).nextLevel, 11);
});

test('patentes militares', () => {
  assert.equal(rankFor(1, 'militar').name, 'Recruta');
  assert.equal(rankFor(5, 'militar').name, 'Cabo');
  assert.equal(rankFor(28, 'militar').name, 'Capitão');
  assert.equal(rankFor(99, 'militar').name, 'Marechal');
  assert.equal(rankFor(99, 'militar').nextLevel, null);
  assert.equal(rankLadder('militar').length, 18);
});

test('promoção e novo grau', () => {
  assert.equal(rankChange(10, 11).promotion, true);
  assert.equal(rankChange(4, 5).promotion, false);
  assert.equal(rankChange(4, 4), null);
  assert.equal(rankChange(3, 4, 'militar').rank.name, 'Cabo');
});
