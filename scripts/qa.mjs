import { spawn, spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'qa');
const PREFIX = process.env.QA_BASE ? 'live-' : '';
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

async function openPage(browser, options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelector('#app')?.dataset.ready === 'true',
    null,
    { timeout: 90000 },
  );
  return { context, page, errors };
}

async function desktopRun(browser) {
  const { context, page, errors } = await openPage(browser, {
    viewport: { width: 1440, height: 900 },
  });
  await page.waitForTimeout(900);

  const animeFile = path.join(OUT, `${PREFIX}desktop-anime.png`);
  await page.screenshot({ path: animeFile });
  check('desktop anime rendered', (await coverage(animeFile)) > 0.02);

  const rotateBefore = await page.getAttribute('#btn-rotate', 'aria-pressed');
  await page.click('#btn-rotate');
  const rotateAfter = await page.getAttribute('#btn-rotate', 'aria-pressed');
  check('auto-rotate toggles', rotateBefore === 'true' && rotateAfter === 'false', `${rotateBefore} -> ${rotateAfter}`);

  await page.click('#btn-reset');
  await page.click('button[data-character="cow"]');
  await page.waitForFunction(
    () => {
      const app = document.querySelector('#app');
      return app?.dataset.character === 'cow' && app?.dataset.ready === 'true';
    },
    null,
    { timeout: 90000 },
  );
  await page.waitForTimeout(900);

  const cowFile = path.join(OUT, `${PREFIX}desktop-cow.png`);
  await page.screenshot({ path: cowFile });
  check('desktop cow rendered', (await coverage(cowFile)) > 0.02);
  check(
    'switcher marks active character',
    (await page.getAttribute('button[data-character="cow"]', 'aria-pressed')) === 'true',
  );

  const triangles = await page.evaluate(() =>
    Number(document.querySelector('#app')?.dataset.triangles ?? 0),
  );
  check('cow triangles in range', triangles > 100000 && triangles <= 600000, `${triangles}`);
  check('desktop console clean', errors.length === 0, errors.slice(0, 3).join(' | '));
  await context.close();
}

async function mobileRun(browser) {
  const { context, page, errors } = await openPage(browser, {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await page.waitForTimeout(900);

  const animeFile = path.join(OUT, `${PREFIX}mobile-anime.png`);
  await page.screenshot({ path: animeFile });
  check('mobile anime rendered', (await coverage(animeFile)) > 0.02);

  const overflow = await page.evaluate(
    () => document.scrollingElement.scrollWidth - window.innerWidth,
  );
  check('mobile no horizontal overflow', overflow <= 1, `${overflow}px`);

  await page.tap('button[data-character="cow"]');
  await page.waitForFunction(
    () => {
      const app = document.querySelector('#app');
      return app?.dataset.character === 'cow' && app?.dataset.ready === 'true';
    },
    null,
    { timeout: 90000 },
  );
  await page.waitForTimeout(900);

  const cowFile = path.join(OUT, `${PREFIX}mobile-cow.png`);
  await page.screenshot({ path: cowFile });
  check('mobile cow rendered', (await coverage(cowFile)) > 0.02);
  check(
    'mobile auto-rotate defaults off',
    (await page.getAttribute('#btn-rotate', 'aria-pressed')) === 'false',
  );
  check('mobile console clean', errors.length === 0, errors.slice(0, 3).join(' | '));
  await context.close();
}

async function reducedMotionRun(browser) {
  const { context, page, errors } = await openPage(browser, {
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  check(
    'reduced motion disables auto-rotate',
    (await page.getAttribute('#btn-rotate', 'aria-pressed')) === 'false',
  );
  check('reduced motion console clean', errors.length === 0, errors.slice(0, 3).join(' | '));
  await context.close();
}

const server = SPAWN_SERVER ? await startPreview() : null;
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, headless: true });

try {
  await desktopRun(browser);
  await mobileRun(browser);
  await reducedMotionRun(browser);
} finally {
  await browser.close();
  stopPreview(server);
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
