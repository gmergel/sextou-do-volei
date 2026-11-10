const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const Module = require('node:module');

function setup() {
  let resolve;
  let reject;
  let calls = 0;
  const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
  const service = {
    updateStatus: (_gameId, player, status, effectiveId) => {
      calls++;
      return pending.then(saved => saved ?? {
        ...player, status, interested: false, lastChange: status === 'pending' ? null : new Date(),
        effectiveId: effectiveId ?? player.effectiveId,
      });
    },
    setPlayerInterest: (_gameId, playerId, interested) => {
      calls++;
      const player = component.players().find(player => player.id === playerId);
      return pending.then(saved => saved ?? { ...player, interested });
    },
    addEventLog: async () => {},
  };
  class GameService {}
  const signal = value => {
    const read = () => value;
    read.set = next => { value = next; };
    read.update = update => { value = update(value); };
    return read;
  };
  const filename = path.resolve(__dirname, '../src/app/features/players/player-list.component.ts');
  const eligibilityFilename = path.resolve(__dirname, '../src/app/features/players/eligibility.ts');
  function load(file, dependencies) {
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true,
      },
    }).outputText;
    const loaded = new Module(file, module);
    loaded.filename = file;
    loaded.paths = module.paths;
    loaded.require = id => Object.hasOwn(dependencies, id) ? dependencies[id] : module.require(id);
    loaded._compile(compiled, file);
    return loaded.exports;
  }
  const { PlayerListComponent } = load(filename, {
    '@angular/core': {
      Component: () => target => target, signal, computed: fn => fn,
      inject: token => token === GameService ? service : {},
    },
    '@angular/common': {},
    '@angular/forms': {},
    '@angular/router': {},
    '../../models/turma.model': { TURMAS: {} },
    './game.service': { GameService },
    './eligibility': load(eligibilityFilename, {}),
  });
  const component = new PlayerListComponent();
  component.gameId = 'game';
  component.game.set({ totalPlayers: 1, createdAt: new Date().toISOString() });
  component.players.set([
    { id: 1, name: 'A', status: 'pending', lastChange: null },
    { id: 2, name: 'B', status: 'pending', lastChange: null },
  ]);
  return { component, resolve, reject, calls: () => calls };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('confirmação visual e contador são imediatos sem alterar a fila persistida', async () => {
  const { component, resolve, calls } = setup();
  component.setStatus(1, 'confirmed');
  assert.equal(component.actionErrors().size, 0);
  assert.equal(component.confirmedCount(), 1);
  assert.equal(component.regularPlayers()[0].status, 'confirmed');
  assert.equal(component.players()[0].status, 'pending');
  component.setStatus(1, 'confirmed');
  assert.equal(calls(), 1);
  resolve();
  await settle();
  assert.equal(component.savingActions().size, 0);
  assert.equal(component.confirmedCount(), 1);
  assert.equal(component.players()[0].status, 'confirmed');
});

test('falha remove envio e mostra erro no jogador sem apresentar confirmação', async () => {
  const { component, reject } = setup();
  component.setStatus(1, 'confirmed');
  reject(new Error('Sem vaga'));
  await settle();
  assert.equal(component.savingActions().size, 0);
  assert.match(component.actionErrors().get(1), /Tente novamente|tente novamente/);
  assert.equal(component.confirmedCount(), 0);
});

test('interesse aparece imediatamente mas a modal aguarda gravação bem-sucedida', async () => {
  const { component, resolve } = setup();
  const action = component.toggleInterest(component.players()[1]);
  assert.equal(component.actionErrors().size, 0);
  assert.equal(component.showInterestModal(), false);
  assert.equal(component.interestedCount(), 1);
  assert.equal(component.regularPlayers()[1].interested, true);
  assert.equal(component.players()[1].interested, undefined);
  resolve();
  await action;
  assert.equal(component.showInterestModal(), true);
  assert.equal(component.interestedCount(), 1);
});

test('recusa é imediata sem ampliar elegibilidade antes da gravação', async () => {
  const { component, resolve } = setup();
  component.setStatus(1, 'declined');
  assert.equal(component.actionErrors().size, 0);
  assert.equal(component.declinedCount(), 1);
  assert.equal(component.eligibleIds().has(2), false);
  resolve();
  await settle();
});

test('rollback não sobrescreve atualização remota nem contador de outro jogador', async () => {
  const { component, reject } = setup();
  component.setStatus(1, 'confirmed');
  component.players.update(players => players.map(player =>
    player.id === 2 ? { ...player, status: 'confirmed', lastChange: new Date() } : player,
  ));
  reject(new Error('Última vaga ocupada'));
  await settle();
  assert.equal(component.regularPlayers()[0].status, 'pending');
  assert.equal(component.regularPlayers()[1].status, 'confirmed');
  assert.equal(component.confirmedCount(), 1);
});

test('sucesso atrasado não sobrescreve resposta mais recente recebida em tempo real', async () => {
  const { component, resolve } = setup();
  component.setStatus(1, 'confirmed');
  component.players.update(players => players.map(player =>
    player.id === 1 ? { ...player, status: 'declined', lastChange: new Date() } : player,
  ));
  resolve();
  await settle();
  assert.equal(component.regularPlayers()[0].status, 'declined');
  assert.equal(component.confirmedCount(), 0);
  assert.equal(component.declinedCount(), 1);
});

test('falha no interesse restaura somente a projeção local', async () => {
  const { component, reject } = setup();
  const action = component.toggleInterest(component.players()[1]);
  assert.equal(component.interestedCount(), 1);
  reject(new Error('Sem conexão'));
  await action;
  assert.equal(component.interestedCount(), 0);
  assert.equal(component.showInterestModal(), false);
  assert.equal(component.savingActions().size, 0);
  assert.ok(component.actionErrors().has(2));
});

test('convidados recebem a mesma atualização otimista e rollback', async () => {
  const { component, reject } = setup();
  component.players.update(players => players.map(player =>
    player.id === 1 ? { ...player, guest: true } : player,
  ));
  component.setStatus(1, 'confirmed');
  assert.equal(component.guestPlayers()[0].status, 'confirmed');
  reject(new Error('Falha'));
  await settle();
  assert.equal(component.guestPlayers()[0].status, 'pending');
});

test('cancelamento de confirmação reverte visualmente e restaura a vaga se falhar', async () => {
  const { component, reject } = setup();
  component.players.update(players => players.map(player =>
    player.id === 1 ? { ...player, status: 'confirmed', lastChange: new Date() } : player,
  ));
  component.setStatus(1, 'confirmed');
  assert.equal(component.regularPlayers()[0].status, 'pending');
  assert.equal(component.confirmedCount(), 0);
  assert.equal(component.players()[0].status, 'confirmed');
  reject(new Error('Falha'));
  await settle();
  assert.equal(component.regularPlayers()[0].status, 'confirmed');
  assert.equal(component.confirmedCount(), 1);
});
