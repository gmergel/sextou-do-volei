const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const Module = require('node:module');

function load(filename, dependencies) {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true,
    },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  loaded.require = id => Object.hasOwn(dependencies, id) ? dependencies[id] : module.require(id);
  loaded._compile(compiled, filename);
  return loaded.exports;
}

const root = path.resolve(__dirname, '../src/app/features/players');
const eligibility = load(path.join(root, 'eligibility.ts'), {});
const player = (id, status = 'pending', interested = false) => ({
  id, name: `Player ${id}`, initial: 'P', status, interested, lastChange: null,
});

function setup(players, totalPlayers = 2) {
  const data = new Map([
    ['games/game', {
      uid: 'game', totalPlayers, createdAt: new Date().toISOString(), queueRevision: 0,
    }],
    ...players.map(p => [`games/game/players/${p.id}`, p]),
  ]);
  const versions = new Map();
  const reads = { game: 0, players: 0, collections: 0 };
  let autoId = 0;
  let commitError;
  let afterQueueRead;
  const copy = value => value === undefined ? undefined : structuredClone(value);
  const ref = (...parts) => ({ path: parts.join('/') });
  const snapshot = reference => {
    const value = copy(data.get(reference.path));
    return { ref: reference, exists: () => value !== undefined, data: () => value };
  };
  const read = reference => {
    if (reference.path === 'games/game') reads.game++;
    else reads.players++;
    return snapshot(reference);
  };
  const firestore = {
    Firestore: class Firestore {},
    doc: (parent, ...parts) => parent.path
      ? ref(parent.path, ...(parts.length ? parts : [`log-${++autoId}`]))
      : ref(...parts),
    collection: (_db, ...parts) => ref(...parts),
    increment: amount => ({ operation: 'increment', amount }),
    deleteField: () => ({ operation: 'delete' }),
    getDocFromServer: async reference => read(reference),
    getDocsFromServer: async reference => {
      reads.collections++;
      const result = {
        docs: [...data.keys()]
          .filter(key => key.startsWith(`${reference.path}/`))
          .map(key => snapshot(ref(key))),
      };
      if (afterQueueRead) {
        const callback = afterQueueRead;
        afterQueueRead = undefined;
        await callback();
      }
      return result;
    },
    runTransaction: async (_db, callback) => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const observed = new Map();
        const writes = [];
        const transaction = {
          get: async reference => {
            observed.set(reference.path, versions.get(reference.path) ?? 0);
            return read(reference);
          },
          update: (reference, value) => writes.push(['update', reference, copy(value)]),
          set: (reference, value) => writes.push(['set', reference, copy(value)]),
          delete: reference => writes.push(['delete', reference]),
        };
        const result = await callback(transaction);
        if ([...observed].some(([key, version]) => (versions.get(key) ?? 0) !== version)) continue;
        if (commitError) {
          const error = commitError;
          commitError = undefined;
          throw error;
        }
        for (const [operation, reference, value] of writes) {
          const key = reference.path;
          if (operation === 'delete') data.delete(key);
          else if (operation === 'set') data.set(key, value);
          else {
            const next = { ...data.get(key) };
            for (const [field, content] of Object.entries(value)) {
              if (content?.operation === 'increment') next[field] = (next[field] ?? 0) + content.amount;
              else if (content?.operation === 'delete') delete next[field];
              else next[field] = content;
            }
            data.set(key, next);
          }
          versions.set(key, (versions.get(key) ?? 0) + 1);
        }
        return result;
      }
      throw new Error('Transaction retry limit');
    },
  };
  const deviceInfo = {
    getCheckinDetails: async () => ({
      ip: null, deviceModel: '', userAgent: '', screenResolution: '', language: '',
    }),
  };
  const { GameService } = load(path.join(root, 'game.service.ts'), {
    '@angular/core': {
      Injectable: () => target => target,
      inject: token => token === firestore.Firestore ? {} : deviceInfo,
    },
    '@angular/fire/firestore': firestore,
    '../../models/game.model': { DEFAULT_PLAYERS: [] },
    '../../models/turma.model': { TURMAS: {} },
    './device-info.service': { DeviceInfoService: class DeviceInfoService {} },
    './eligibility': eligibility,
  });
  return {
    client: () => new GameService(), data, reads,
    resetReads: () => { reads.game = reads.players = reads.collections = 0; },
    failCommit: () => { commitError = new Error('Offline'); },
    afterQueueRead: callback => { afterQueueRead = callback; },
    setCapacity: capacity => {
      const key = 'games/game';
      data.set(key, { ...data.get(key), totalPlayers: capacity });
      versions.set(key, (versions.get(key) ?? 0) + 1);
    },
    logs: () => [...data.entries()].filter(([key]) => key.startsWith('games/game/checkins/')),
  };
}

test('snapshot preparado reduz cada clique a uma leitura do jogo, sem reler jogadores', async () => {
  const db = setup([player(1), player(2)]);
  const client = db.client();
  await Promise.all([client.prepareGameActions('game'), client.prepareGameActions('game')]);
  assert.equal(db.reads.collections, 1);
  db.resetReads();
  await client.updateStatus('game', player(1), 'confirmed');
  await client.setPlayerInterest('game', 2, true);
  await client.setPlayerInterest('game', 2, false);
  assert.deepEqual(db.reads, { game: 3, players: 0, collections: 0 });
  assert.equal(db.data.get('games/game/players/1').status, 'confirmed');
  assert.equal(db.data.get('games/game/players/2').interested, undefined);
  assert.equal(db.logs().length, 1);
});

test('mudança remota invalida o snapshot antes de permitir outra confirmação', async () => {
  const db = setup([player(1), player(2)], 1);
  const first = db.client();
  const second = db.client();
  await Promise.all([first.prepareGameActions('game'), second.prepareGameActions('game')]);
  await first.updateStatus('game', player(1), 'confirmed');
  await assert.rejects(second.updateStatus('game', player(2), 'confirmed'), /vaga/);
  assert.equal(db.data.get('games/game/players/2').status, 'pending');
  assert.equal(db.logs().length, 1);
});

test('disputa manual e automática pela última vaga não duplica confirmação nem log', async () => {
  const db = setup([player(1, 'pending', true)], 1);
  const automatic = db.client();
  const manual = db.client();
  await Promise.all([automatic.prepareGameActions('game'), manual.prepareGameActions('game')]);
  await Promise.allSettled([
    automatic.confirmInterestedPlayers('game'),
    manual.updateStatus('game', player(1, 'pending', true), 'confirmed'),
  ]);
  assert.equal(db.data.get('games/game/players/1').status, 'confirmed');
  assert.equal(db.logs().length, 1);
  await automatic.confirmInterestedPlayers('game');
  assert.equal(db.logs().length, 1);
});

test('cancelamento remoto de interesse é respeitado pela automação', async () => {
  const db = setup([player(1, 'pending', true)], 1);
  const first = db.client();
  const second = db.client();
  await Promise.all([first.prepareGameActions('game'), second.prepareGameActions('game')]);
  await first.setPlayerInterest('game', 1, false);
  await second.confirmInterestedPlayers('game');
  assert.equal(db.data.get('games/game/players/1').status, 'pending');
  assert.equal(db.logs().length, 0);
});

test('falha no commit não contamina o snapshot nem grava log de sucesso', async () => {
  const db = setup([player(1)], 1);
  const client = db.client();
  await client.prepareGameActions('game');
  db.failCommit();
  await assert.rejects(client.updateStatus('game', player(1), 'confirmed'), /Offline/);
  assert.equal(db.data.get('games/game/players/1').status, 'pending');
  assert.equal(db.logs().length, 0);
  await client.updateStatus('game', player(1), 'confirmed');
  assert.equal(db.logs().length, 1);
});

test('convidados concorrentes recebem IDs distintos e remoção atualiza o snapshot', async () => {
  const db = setup([player(1)]);
  const first = db.client();
  const second = db.client();
  await Promise.all([first.prepareGameActions('game'), second.prepareGameActions('game')]);
  await Promise.all([first.addGuestPlayer('game', 'A'), second.addGuestPlayer('game', 'B')]);
  assert.equal(db.data.get('games/game/players/2').name, 'A (convidado)');
  assert.equal(db.data.get('games/game/players/3').name, 'B (convidado)');
  await second.removeGuestPlayer('game', 3);
  await assert.rejects(second.setPlayerInterest('game', 3, true), /aguardando/);
});

test('alteração durante a preparação nunca valida snapshot inconsistente', async () => {
  const db = setup([player(1), player(2)], 1);
  const first = db.client();
  await first.prepareGameActions('game');
  db.afterQueueRead(() => first.updateStatus('game', player(1), 'confirmed'));
  const second = db.client();
  await second.prepareGameActions('game');
  await assert.rejects(second.updateStatus('game', player(2), 'confirmed'), /vaga/);
  assert.equal(db.logs().length, 1);
});

test('duas automações preenchem somente a última vaga uma única vez', async () => {
  const db = setup([player(1, 'pending', true), player(2, 'pending', true)], 1);
  const first = db.client();
  const second = db.client();
  await Promise.all([first.prepareGameActions('game'), second.prepareGameActions('game')]);
  await Promise.all([first.confirmInterestedPlayers('game'), second.confirmInterestedPlayers('game')]);
  assert.equal(db.data.get('games/game/players/1').status, 'confirmed');
  assert.equal(db.data.get('games/game/players/2').status, 'pending');
  assert.equal(db.data.get('games/game/players/2').interested, true);
  assert.equal(db.logs().length, 1);
});

test('validação usa a capacidade atual, mesmo sem mudança na revisão de jogadores', async () => {
  const db = setup([player(1, 'confirmed'), player(2)], 2);
  const client = db.client();
  await client.prepareGameActions('game');
  db.setCapacity(1);
  db.resetReads();
  await assert.rejects(client.updateStatus('game', player(2), 'confirmed'), /vaga/);
  assert.deepEqual(db.reads, { game: 1, players: 0, collections: 0 });
});

test('operações sem mudança não incrementam a revisão nem gravam logs', async () => {
  const db = setup([player(1)], 1);
  const client = db.client();
  await client.prepareGameActions('game');
  await client.setPlayerInterest('game', 1, false);
  await client.confirmInterestedPlayers('game');
  assert.equal(db.data.get('games/game').queueRevision, 0);
  assert.equal(db.logs().length, 0);
});
