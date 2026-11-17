import { spawn, spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'qa');
const CHROME =
  process.env.CHROME_PATH ||
  'C:/Users/Giantiensinh/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173';
const SPAWN_SERVER = !process.env.QA_BASE;
const failures = [];

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
}

async function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Server not ready: ${url}`);
}

async function startPreview() {
  const child = spawn('npm', ['run', 'preview'], { cwd: ROOT, shell: true, stdio: 'ignore' });
  await waitForServer(BASE);
  return child;
}

function stopPreview(child) {
  if (!child) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

async function coverage(file) {
  const { data } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let bright = 0;
  let total = 0;
  for (let i = 0; i < data.length; i += 32) {
    if (data[i] > 70 || data[i + 1] > 70 || data[i + 2] > 70) bright += 1;
    total += 1;
  }
  return bright / total;
}

const server = SPAWN_SERVER ? await startPreview() : null;
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, headless: true });

try {
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  const started = Date.now();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelector('#app')?.dataset.ready === 'true',
    null,
    { timeout: 90000 },
  );
  const loadMs = Date.now() - started;
  await page.waitForTimeout(900);

  const file = path.join(OUT, 'desktop-anime.png');
  await page.screenshot({ path: file });
  const pixelCoverage = await coverage(file);
  const triangles = await page.evaluate(() =>
    Number(document.querySelector('#app')?.dataset.triangles ?? 0),
  );

  check('desktop canvas rendered', pixelCoverage > 0.02, `coverage ${(pixelCoverage * 100).toFixed(1)}%`);
  check('desktop triangles in range', triangles > 100000 && triangles <= 600000, `${triangles}`);
  check('desktop console clean', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`INFO desktop load ${loadMs} ms`);
  await context.close();
} finally {
  await browser.close();
  stopPreview(server);
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
