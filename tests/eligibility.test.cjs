const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const Module = require('node:module');

const filename = path.resolve(__dirname, '../src/app/features/players/eligibility.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(compiled, filename);
const { eligiblePlayerIds, interestedPlayersToConfirm, SLOT_INTERVAL_MS } = loaded.exports;

const now = Date.parse('2026-11-10T12:00:00Z');
const game = { totalPlayers: 2, createdAt: new Date(now).toISOString() };
const player = (id, status = 'pending', interested = false, extra = {}) => ({
  id, status, interested, ...extra,
});

test('confirma interessados elegíveis pela ordem da fila, não pela ordem de entrada', () => {
  const players = [player(2, 'pending', true), player(1, 'pending', true), player(3, 'pending', true)];
  assert.deepEqual(interestedPlayersToConfirm(game, players, now).map(p => p.id), [1, 2]);
});

test('não confirma com jogo lotado e preenche somente vagas disponíveis', () => {
  const players = [player(1, 'confirmed'), player(2, 'pending', true), player(3, 'pending', true)];
  assert.deepEqual(interestedPlayersToConfirm(game, players, now).map(p => p.id), [2]);
  players[1].status = 'confirmed';
  assert.deepEqual(interestedPlayersToConfirm(game, players, now), []);
});

test('recusa libera prioridade e jogadores sem interesse não são confirmados', () => {
  const players = [player(1, 'declined'), player(2), player(3, 'pending', true)];
  assert.deepEqual([...eligiblePlayerIds(game, players, now)], [1, 2, 3]);
  assert.deepEqual(interestedPlayersToConfirm(game, players, now).map(p => p.id), [3]);
});

test('avanço por tempo libera o próximo interessado sem alterar capacidade', () => {
  const players = [player(1, 'confirmed'), player(2), player(3, 'pending', true)];
  assert.deepEqual(interestedPlayersToConfirm(game, players, now), []);
  assert.deepEqual(interestedPlayersToConfirm(game, players, now + SLOT_INTERVAL_MS).map(p => p.id), [3]);
});

test('libera exatamente uma posição a cada 4 horas desde a criação do jogo', () => {
  const fourHours = 4 * 60 * 60 * 1000;
  assert.equal(SLOT_INTERVAL_MS, fourHours);
  const players = [player(1), player(2), player(3), player(4), player(5)];
  assert.deepEqual([...eligiblePlayerIds(game, players, now + fourHours - 1)], [1, 2]);
  assert.deepEqual([...eligiblePlayerIds(game, players, now + fourHours)], [1, 2, 3]);
  assert.deepEqual([...eligiblePlayerIds(game, players, now + 2 * fourHours - 1)], [1, 2, 3]);
  assert.deepEqual([...eligiblePlayerIds(game, players, now + 2 * fourHours)], [1, 2, 3, 4]);
  assert.deepEqual([...eligiblePlayerIds(game, players, now + 3 * fourHours)], [1, 2, 3, 4, 5]);
});

test('considera convidados e elegibilidade por effectiveId', () => {
  const players = [player(1, 'pending', true, { effectiveId: 3 }), player(2), player(3, 'pending', true, { guest: true })];
  assert.deepEqual(interestedPlayersToConfirm(game, players, now).map(p => p.id), [1]);
  assert.deepEqual(interestedPlayersToConfirm(game, players, now + SLOT_INTERVAL_MS).map(p => p.id), [1, 3]);
});

test('ignora respostas confirmadas ou recusadas e interesse removido', () => {
  const players = [player(1, 'declined', true), player(2, 'pending', false), player(3, 'pending', true)];
  assert.deepEqual(interestedPlayersToConfirm(game, players, now).map(p => p.id), [3]);
});
