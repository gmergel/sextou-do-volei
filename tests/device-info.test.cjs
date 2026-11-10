const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const Module = require('node:module');

const filename = path.resolve(__dirname, '../src/app/features/players/device-info.service.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
}).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded.require = id => id === '@angular/core'
  ? { Injectable: () => target => target }
  : module.require(id);
loaded._compile(compiled, filename);
const { DeviceInfoService } = loaded.exports;

function service() {
  const instance = new DeviceInfoService();
  instance.getUserAgent = () => 'browser';
  instance.getScreenResolution = () => '800x600';
  instance.getLanguage = () => 'pt-BR';
  return instance;
}

test('coleta IP e modelo simultaneamente e preserva os dados do histórico', async () => {
  const instance = service();
  let releaseIp;
  const calls = [];
  instance.getIp = () => {
    calls.push('ip');
    return new Promise(resolve => { releaseIp = resolve; });
  };
  instance.getDeviceModel = async () => {
    calls.push('model');
    return 'modelo';
  };
  const result = instance.getCheckinDetails();
  assert.deepEqual(calls, ['ip', 'model']);
  releaseIp('127.0.0.1');
  assert.deepEqual(await result, {
    ip: '127.0.0.1', deviceModel: 'modelo', userAgent: 'browser',
    screenResolution: '800x600', language: 'pt-BR',
  });
});

test('limita a espera por dados opcionais indisponíveis', async () => {
  const instance = service();
  instance.getIp = () => new Promise(() => {});
  instance.getDeviceModel = async () => 'modelo';
  const started = Date.now();
  const details = await instance.getCheckinDetails();
  assert.equal(details.ip, null);
  assert.equal(details.deviceModel, 'modelo');
  assert.equal(details.userAgent, 'browser');
  assert.ok(Date.now() - started < 2500);
});

test('reutiliza a preparação entre cliques sem repetir a coleta', async () => {
  const instance = service();
  let ipCalls = 0;
  let modelCalls = 0;
  instance.getIp = async () => { ipCalls++; return '127.0.0.1'; };
  instance.getDeviceModel = async () => { modelCalls++; return 'modelo'; };
  const first = instance.getCheckinDetails();
  const concurrent = instance.getCheckinDetails();
  assert.equal(first, concurrent);
  await first;
  assert.equal(await instance.getCheckinDetails(), await first);
  assert.equal(ipCalls, 1);
  assert.equal(modelCalls, 1);
});
