// Radar Hunt deployment preflight v1.0 · © SCOUT SYSTEM
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = 'v1.0';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const packageJson = json('package.json');
const lock = json('package-lock.json');
assert.equal(lock.packages[''].name, packageJson.name);
assert.equal(lock.packages[''].version, packageJson.version);
const version = `v${packageJson.version}`;
const source = `entry/radar-hunt_${version}.html`;
const entry = read('index.html');
const deployment = json('vercel.json');

assert.equal(entry, read(source), `index.html 未同步：cp ${source} index.html`);
assert.ok(entry.includes(`<meta name="app-version" content="${version}"`), '缺少或錯誤嘅 app-version meta');
assert.ok(entry.includes(`<title>Radar Hunt ${version} `), 'title 版號同 package.json 唔一致');
assert.equal(deployment.framework, 'vite');
assert.equal(deployment.outputDirectory, 'dist');
assert.equal(deployment.buildCommand, 'npm run build');

const gateName = 'store_gate_v1.0.js';
const gateTag = `<script src="/${gateName}"></script>`;
const gateSource = read(`public/${gateName}`);
// Pinned to playerkousas-rgb/readme 4c63ac3096bf87fcff760b45b34adab14b1b2576.
assert.equal(createHash('sha256').update(gateSource).digest('hex'),
  '45de189d68e9fbf64d560a4306987d1a03cd03f03e56dd24222a4343011e3d5b', '官方閘門原檔有變');

const gatePos = entry.indexOf(gateTag);
assert.ok(entry.indexOf('<meta charset="UTF-8"') >= 0 && entry.indexOf('<meta charset="UTF-8"') < gatePos);
assert.ok(gatePos < entry.indexOf('<title>'), '閘門必須在 title 前同步載入');
const initializer = entry.slice(gatePos + gateTag.length).match(/^\s*<script>([\s\S]+?)<\/script>/)?.[1];
assert.ok(initializer, '缺少入口閘初始化');

// Capture the real HTML's options instead of testing a second copy of the config.
let options;
runInNewContext(initializer, {
  initStoreGate(config) { options = JSON.parse(JSON.stringify(config)); return { allowed: false }; },
});
assert.deepEqual(options, {
  appKey: 'skw-radar-hunt2',
  mode: 'entry-gate',
  portalIds: ['appstore'],
  silentPortalIds: ['library'],
  allowStandalone: true,
  autoRedirectSeconds: 0,
});
const sandbox = { URL };
runInNewContext(gateSource, sandbox, { filename: gateName });
const gate = sandbox.ScoutStoreGate;
const portals = gate.normalizePortals(options);
assert.equal(portals.filter(portal => !portal.silent).map(portal => portal.id).join(','), 'appstore');
for (const id of ['appstore', 'library']) {
  const decision = gate.evaluateStoreGate(options, { referrer: gate.getPortal(id).url });
  assert.ok(decision.allowed);
  assert.equal(decision.matchedPortalId, id);
}
assert.equal(gate.evaluateStoreGate(options).allowed, false);
assert.equal(gate.evaluateStoreGate(options, { standalone: true }).allowed, true);

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
for (const script of ['lint', 'build']) {
  const result = spawnSync(npm, ['run', script], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const output = deployment.outputDirectory;
const built = read(`${output}/index.html`);
const manifest = json(`${output}/manifest.json`);
assert.ok(built.includes(gateTag) && built.includes(initializer), 'dist 入口冇掛閘門');
assert.equal(read(`${output}/${gateName}`), gateSource, 'dist 閘門同 public 原檔不一致');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.display, 'standalone');
for (const path of [
  ...[...built.matchAll(/\b(?:href|src)="(\/(?!\/)[^"?#]+)/g)].map((match) => match[1]),
  ...manifest.icons.map((icon) => icon.src),
]) {
  assert.ok(existsSync(resolve(root, output, `.${path}`)), `dist 缺少 ${path}`);
}
console.log(`PASS preflight ${VERSION}: ${version} 入口、SG19、lint、build、dist 資產及 manifest`);
