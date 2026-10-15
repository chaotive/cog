// Optional real-browser smoke test. Start Vite first, then run with Node.
// Uses Chrome's DevTools protocol directly; no extra test dependencies.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const out = resolve('.tmp'); await mkdir(out, { recursive: true });
const executable = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--remote-debugging-port=9224', `--user-data-dir=${resolve(out, 'chrome-test')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws; let counter = 0; const pending = new Map(); const errors = [];
const delay = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, message, timeout = 15000) { const end = Date.now() + timeout; while (Date.now() < end) { if (await fn()) return; await delay(100); } throw new Error(message); }
async function cdp(method, params = {}) { const id = ++counter; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expression) { const response = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.text + ': ' + response.exceptionDetails.exception?.description); return response.result.value; }
async function click(selector) { assert.ok(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), selector); await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await delay(100); }
async function key(key, code = key) { await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code }); await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code }); await delay(100); }
async function shot(name) { const image = await cdp('Page.captureScreenshot', { format: 'png' }); await writeFile(resolve(out, name), Buffer.from(image.data, 'base64')); }

try {
  let target;
  await waitFor(async () => { try { const targets = await (await fetch('http://127.0.0.1:9224/json/list')).json(); target = targets.find(t => t.type === 'page'); return !!target; } catch { return false; } }, 'Chrome did not start');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = event => { const message = JSON.parse(event.data); if (message.id) { const task = pending.get(message.id); if (task) { pending.delete(message.id); message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result); } } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text); };
  await cdp('Runtime.enable'); await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: 'http://127.0.0.1:3000' });
  await waitFor(() => evaluate(`!!document.querySelector('#new-voyage')`), 'Application did not load');
  await evaluate('localStorage.clear()');
  await cdp('Page.reload'); await delay(500);
  await waitFor(() => evaluate(`!!document.querySelector('#embark') && !!document.querySelector('#map canvas')`), 'Outfitting or Phaser canvas did not load');
  await evaluate(`localStorage.clear(); document.querySelector('#seed-input').value = '12345'`);
  await shot('outfitting-desktop.png');
  await click('[data-loadout="scout"]'); await click('[data-cargo="tools"]'); await click('#embark');
  assert.ok(await evaluate(`document.querySelector('.voyage-modal') !== null`)); await click('#land');
  assert.ok(await evaluate(`document.querySelector('.modal') === null`));
  const originalDay = await evaluate(`document.querySelector('#day').textContent`);
  await key('ArrowRight', 'ArrowRight');
  assert.notEqual(await evaluate(`document.querySelector('#day').textContent`), originalDay);
  assert.ok(await evaluate(`JSON.parse(localStorage.getItem('cog.atlas.v1')).player.x === 9`));
  await click('#all-orders'); assert.ok(await evaluate(`document.querySelector('.orders-modal') !== null`)); await key('Escape', 'Escape');
  await click('#guide'); assert.ok(await evaluate(`document.querySelectorAll('.guide-grid article').length === 6`)); await key('Escape', 'Escape');
  await click('#zoom-in'); await click('#zoom-out'); await click('#recenter');
  await shot('atlas-desktop.png');
  const savedDay = await evaluate(`document.querySelector('#day').textContent`);
  await cdp('Page.reload'); await delay(500); await waitFor(() => evaluate(`!!document.querySelector('#map canvas') && document.querySelector('#day')?.textContent === ${JSON.stringify(savedDay)}`), 'Save did not restore');
  assert.ok(await evaluate(`document.querySelector('.outfit-modal') === null`));
  await click('#new-voyage'); assert.ok(await evaluate(`document.querySelector('.outfit-modal') !== null`)); await key('Escape', 'Escape');
  assert.equal(await evaluate(`document.querySelector('#day').textContent`), savedDay);
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await delay(300);
  assert.ok(await evaluate(`document.documentElement.scrollWidth <= 390`), 'Mobile layout overflows horizontally');
  await shot('atlas-mobile.png');
  await click('#new-voyage'); await shot('outfitting-mobile.png');
  assert.ok(await evaluate(`document.querySelector('.modal').scrollWidth <= document.querySelector('.modal').clientWidth`), 'Mobile dialog overflows');
  assert.deepEqual(errors, [], 'Browser raised runtime errors');
  console.log('PASS: outfitting, voyage, Phaser rendering, movement, saves, reload, orders, field guide, camera controls, new-voyage cancel, mobile layout.');
  console.log('Screenshots: .tmp/outfitting-desktop.png, .tmp/atlas-desktop.png, .tmp/atlas-mobile.png, .tmp/outfitting-mobile.png');
} finally {
  if (ws?.readyState === 1) { try { await cdp('Browser.close'); } catch {} ws.close(); }
  browser.kill();
}
