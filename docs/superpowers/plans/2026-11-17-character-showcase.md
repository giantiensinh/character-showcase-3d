# Character Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng trang trưng bày 3D "dark cinematic studio" cho 2 nhân vật GLB, mượt trên desktop và điện thoại, deploy Vercel.

**Architecture:** Vite + TypeScript + three.js thuần. `scene.ts` sở hữu renderer/đèn/bệ/camera, `character.ts` tải–chuẩn hoá–dispose GLB, `ui.ts` sở hữu overlay DOM, `main.ts` nối vòng đời và trạng thái. Asset gốc được tối ưu một lần bằng `gltf-transform` thành bản nhẹ trong `public/models`. Kiểm chứng bằng Playwright headless (chromium-1248) + phân tích pixel bằng sharp.

**Tech Stack:** three 0.187.0, Vite 8.3.8, TypeScript 5.9.3, @gltf-transform 4.5.1, meshoptimizer 1.3.0, sharp 0.35.5, playwright-core 1.65.1, @fontsource (Be Vietnam Pro, JetBrains Mono).

**Spec:** `docs/superpowers/specs/2026-11-17-3d-character-showcase-design.md`

## Global Constraints

- Mọi lệnh chạy từ `E:\webshowcharacter` (Git Bash của agent; lệnh hand-off cho user dùng `cd /d E:\webshowcharacter` trong cmd.exe).
- Node ≥ 22.12; `npm run build` phải xanh sau MỌI task.
- Không sửa/xoá 2 file gốc `anime_girl_3d_model_v1.glb`, `cow_girl_3d_model.glb`; chỉ ghi bản tối ưu vào `public/models/`.
- UI microcopy tiếng Anh; tên mặc định "Anime Girl", "Cow Girl"; narration/commit message tiếng Việt.
- Palette: nền `#0A0B0D`, ink `#EDE9E2`, muted `#8C8A85`, hairline `rgba(237,233,226,0.14)`, accent DUY NHẤT `#D9A05B`.
- Cấm: gradient tím/violet, glassmorphism, card bo góc, emoji icon. Icon dùng SVG nét mảnh.
- Chromium QA: `C:/Users/Giantiensinh/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe` (override qua `CHROME_PATH`).
- Screenshot QA ghi vào `qa/` (gitignored). Không deploy trước khi user duyệt screenshot ở Task 5.
- Commit tiếng Việt kiểu conventional, một commit mỗi task; không tạo remote/push.

---

### Task 1: Khởi tạo repo + shell giao diện tĩnh

**Files:**
- Create: `.gitignore`, `.vercelignore`, `package.json`, `tsconfig.json`, `vite.config.ts`, `vercel.json`, `index.html`, `src/styles.css`, `src/main.ts`, `public/favicon.svg`

**Interfaces:**
- Produces: các id DOM mà Task 3/4 dùng: `#app`, `#stage`, `#loader`, `#loader-pct`, `#loader-bar`, `#char-name`, `#char-index`, `#char-total`, `#btn-rotate`, `#btn-reset`, `#btn-fullscreen`, `#btn-retry`, `#error`, `#error-text`, `#veil`, `#hint`, `#fallback`, `.switch-btn[data-character]`.
- Produces: npm scripts `dev`, `build`, `preview`, `optimize`, `qa`.

- [ ] **Step 1: Khởi tạo git repo (user đã cho phép)**

Run:
```bash
cd "E:/webshowcharacter"
git init
```

- [ ] **Step 1b: Commit tài liệu thiết kế đã duyệt**

Run:
```bash
git add docs/superpowers/specs docs/superpowers/plans
git commit -m "docs: thêm spec và kế hoạch triển khai character showcase"
```

- [ ] **Step 2: Viết `.gitignore` và `.vercelignore`**

`.gitignore`:
```
node_modules/
dist/
qa/
.vercel/
*.log
```

`.vercelignore`:
```
/*.glb
/docs
/qa
/node_modules
/.vercel
/.git
```

- [ ] **Step 3: Viết `package.json`**

```json
{
  "name": "character-showcase",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=22.12" },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --port 4173 --strictPort",
    "optimize": "node scripts/optimize.mjs",
    "qa": "node scripts/qa.mjs"
  },
  "dependencies": {
    "@fontsource/be-vietnam-pro": "5.3.0",
    "@fontsource/jetbrains-mono": "5.3.0",
    "three": "0.187.0"
  },
  "devDependencies": {
    "@gltf-transform/core": "4.5.1",
    "@gltf-transform/extensions": "4.5.1",
    "@gltf-transform/functions": "4.5.1",
    "@types/three": "0.187.0",
    "meshoptimizer": "1.3.0",
    "playwright-core": "1.65.1",
    "sharp": "0.35.5",
    "typescript": "5.9.3",
    "vite": "8.3.8"
  }
}
```

- [ ] **Step 4: Viết `tsconfig.json` và `vite.config.ts`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true },
  build: { target: 'es2022' },
});
```

`vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/models/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

- [ ] **Step 5: Viết `index.html` (shell cuối cùng, chưa có logic)**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0A0B0D" />
    <meta name="description" content="A dark cinematic 3D character showcase." />
    <title>Character Showcase</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <main id="app" data-ready="false">
      <div id="stage-wrap">
        <canvas id="stage" role="img" aria-label="3D character showcase. Drag to rotate, pinch or scroll to zoom."></canvas>
        <div class="grain" aria-hidden="true"></div>
        <div class="vignette" aria-hidden="true"></div>
      </div>

      <header class="topbar">
        <p class="wordmark">CHARACTER<br />SHOWCASE</p>
        <div class="controls" role="toolbar" aria-label="Viewer controls">
          <button id="btn-rotate" class="icon-btn" type="button" aria-pressed="true" aria-label="Toggle auto-rotate">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M20 11a8 8 0 1 0-2.3 5.7" />
              <path d="M20 4v7h-7" />
            </svg>
            <span class="btn-label">AUTO</span>
          </button>
          <button id="btn-reset" class="icon-btn" type="button" aria-label="Reset view">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <circle cx="12" cy="12" r="6" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
            <span class="btn-label">RESET</span>
          </button>
          <button id="btn-fullscreen" class="icon-btn" type="button" aria-label="Toggle fullscreen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
            </svg>
            <span class="btn-label">FULL</span>
          </button>
        </div>
      </header>

      <section class="identity" aria-live="polite">
        <p class="identity-index">
          <span id="char-index">01</span><span class="identity-sep">/</span><span id="char-total">02</span>
        </p>
        <h1 id="char-name">Anime Girl</h1>
        <p class="identity-sub">STATIC CHARACTER · 2026</p>
      </section>

      <nav class="switcher" aria-label="Characters">
        <button class="switch-btn" type="button" data-character="anime" aria-pressed="true">
          <span class="switch-num">01</span><span class="switch-name">Anime Girl</span>
        </button>
        <button class="switch-btn" type="button" data-character="cow" aria-pressed="false">
          <span class="switch-num">02</span><span class="switch-name">Cow Girl</span>
        </button>
      </nav>

      <p class="hint" id="hint">DRAG TO ROTATE · SCROLL TO ZOOM</p>

      <div class="loader" id="loader" role="status" aria-live="polite">
        <p class="loader-pct" id="loader-pct">0%</p>
        <div class="loader-track"><div class="loader-bar" id="loader-bar"></div></div>
        <p class="loader-label">LOADING CHARACTER</p>
      </div>

      <div class="veil" id="veil" aria-hidden="true"></div>

      <div class="fallback" id="fallback" hidden>
        <p class="wordmark">CHARACTER SHOWCASE</p>
        <h2>WEBGL 2 IS REQUIRED</h2>
        <p>Open this page in a recent version of Chrome, Edge, or Safari.</p>
      </div>

      <div class="error" id="error" hidden>
        <p id="error-text"></p>
        <button id="btn-retry" class="icon-btn" type="button">RETRY</button>
      </div>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Viết `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#0A0B0D"/>
  <circle cx="16" cy="16" r="9" fill="none" stroke="#D9A05B" stroke-width="1.5"/>
  <circle cx="16" cy="16" r="2" fill="#D9A05B"/>
</svg>
```

- [ ] **Step 7: Viết `src/styles.css` (toàn bộ giao diện)**

```css
:root {
  --bg: #0a0b0d;
  --bg-deep: #050506;
  --ink: #ede9e2;
  --muted: #8c8a85;
  --line: rgba(237, 233, 226, 0.14);
  --line-strong: rgba(237, 233, 226, 0.34);
  --accent: #d9a05b;
  --sans: "Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "JetBrains Mono", ui-monospace, "Cascadia Mono", monospace;
  --ease: cubic-bezier(0.22, 0.61, 0.36, 1);
}

* { box-sizing: border-box; }

html, body { margin: 0; height: 100%; background: var(--bg); }

body {
  color: var(--ink);
  font-family: var(--sans);
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-font-smoothing: antialiased;
}

#app {
  position: fixed;
  inset: 0;
  height: 100dvh;
  overflow: hidden;
  user-select: none;
  background: radial-gradient(ellipse 90% 65% at 50% 38%, #16181c 0%, var(--bg) 55%, var(--bg-deep) 100%);
}

#stage-wrap { position: absolute; inset: 0; }
#stage { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
#stage:active { cursor: grabbing; }

.grain, .vignette { position: absolute; inset: 0; pointer-events: none; }

.grain {
  opacity: 0.05;
  mix-blend-mode: overlay;
  background-size: 240px 240px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
}

.vignette {
  background:
    radial-gradient(ellipse 75% 60% at 50% 42%, transparent 40%, rgba(0, 0, 0, 0.55) 100%),
    linear-gradient(to bottom, rgba(5, 6, 7, 0.5), transparent 22%, transparent 72%, rgba(5, 6, 7, 0.72));
}

.topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: calc(env(safe-area-inset-top, 0px) + 22px) 32px 0;
  pointer-events: none;
}
.topbar > * { pointer-events: auto; }

.wordmark {
  margin: 0;
  font-family: var(--mono);
  font-size: 10px;
  line-height: 1.6;
  letter-spacing: 0.34em;
  color: var(--muted);
}

.controls { display: flex; border: 1px solid var(--line); }

.icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: 0;
  border-left: 1px solid var(--line);
  color: var(--muted);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  padding: 9px 12px;
  cursor: pointer;
  transition: color 160ms var(--ease), background 160ms var(--ease);
}
.icon-btn:first-child { border-left: 0; }
.icon-btn:hover { color: var(--ink); }
.icon-btn[aria-pressed="true"] { color: var(--accent); }
.icon-btn svg { width: 14px; height: 14px; }
.btn-label { padding-top: 1px; }

.identity {
  position: absolute;
  left: 32px;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 30px);
  max-width: 60vw;
}
.identity-index {
  margin: 0 0 10px;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.28em;
  color: var(--muted);
}
#char-index { color: var(--accent); }
.identity-sep { margin: 0 6px; color: var(--line-strong); }
.identity h1 {
  margin: 0;
  font-size: clamp(26px, 3.2vw, 40px);
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1;
}
.identity-sub {
  margin: 12px 0 0;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.26em;
  color: var(--muted);
}

.switcher {
  position: absolute;
  right: 32px;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 30px);
  display: flex;
  border-top: 1px solid var(--line);
}
.switch-btn {
  display: flex;
  align-items: baseline;
  gap: 10px;
  background: transparent;
  border: 0;
  color: var(--muted);
  font-family: var(--sans);
  font-size: 12px;
  letter-spacing: 0.02em;
  padding: 14px 16px 10px;
  border-bottom: 1px solid transparent;
  cursor: pointer;
  transition: color 160ms var(--ease), border-color 160ms var(--ease);
}
.switch-btn + .switch-btn { border-left: 1px solid var(--line); }
.switch-btn:hover { color: var(--ink); }
.switch-btn[aria-pressed="true"] { color: var(--ink); border-bottom-color: var(--accent); }
.switch-num { font-family: var(--mono); font-size: 9px; letter-spacing: 0.16em; color: var(--muted); }
.switch-btn[aria-pressed="true"] .switch-num { color: var(--accent); }

.hint {
  position: absolute;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 34px);
  transform: translateX(-50%);
  margin: 0;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.22em;
  color: var(--muted);
  white-space: nowrap;
  pointer-events: none;
  transition: opacity 600ms var(--ease);
}
.hint.is-dismissed { opacity: 0; }

.loader {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-content: center;
  gap: 18px;
  background: var(--bg-deep);
  transition: opacity 500ms var(--ease);
}
.loader.is-hidden { opacity: 0; pointer-events: none; }
.loader-pct {
  margin: 0;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.3em;
  color: var(--ink);
  text-align: center;
}
.loader-track { width: min(240px, 52vw); height: 1px; background: var(--line); }
.loader-bar { height: 100%; width: 0%; background: var(--accent); transition: width 200ms linear; }
.loader-label {
  margin: 0;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.28em;
  color: var(--muted);
  text-align: center;
}

.veil {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: var(--bg-deep);
  opacity: 0;
  pointer-events: none;
  transition: opacity 240ms var(--ease);
}
.veil.is-on { opacity: 1; pointer-events: auto; }

.fallback {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: grid;
  place-content: center;
  gap: 16px;
  padding: 32px;
  text-align: center;
  background: var(--bg);
}
.fallback h2 { margin: 0; font-size: 20px; font-weight: 500; letter-spacing: 0.08em; }
.fallback p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.7; }
.fallback .wordmark { justify-self: center; }

.error {
  position: absolute;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 96px);
  z-index: 30;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #141519;
  border: 1px solid var(--line);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--ink);
  white-space: nowrap;
}
.error[hidden], .fallback[hidden] { display: none; }

:focus-visible { outline: 1px solid var(--accent); outline-offset: 3px; }

@media (max-width: 720px) {
  .topbar { padding: calc(env(safe-area-inset-top, 0px) + 16px) 18px 0; }
  .btn-label { display: none; }
  .icon-btn { padding: 10px; }
  .wordmark { font-size: 9px; }
  .identity {
    left: 18px;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 96px);
    max-width: calc(100vw - 36px);
  }
  .identity h1 { font-size: 28px; }
  .identity-sub { margin-top: 8px; }
  .switcher {
    left: 18px;
    right: 18px;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 18px);
  }
  .switch-btn { flex: 1; justify-content: space-between; padding: 12px 4px 10px; }
  .hint { display: none; }
  .error { white-space: normal; width: calc(100vw - 36px); justify-content: space-between; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 8: Viết `src/main.ts` tạm (chỉ import CSS/font để build)**

```ts
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/latin-500.css';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-500.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './styles.css';
```

- [ ] **Step 9: Cài dependency và build**

Run:
```bash
cd "E:/webshowcharacter"
npm install
npm run build
```
Expected: `tsc` không lỗi, Vite build ra `dist/`.

- [ ] **Step 10: Commit**

```bash
git add .gitignore .vercelignore package.json package-lock.json tsconfig.json vite.config.ts vercel.json index.html src/styles.css src/main.ts public/favicon.svg
git commit -m "chore: khởi tạo dự án vite three.js và shell giao diện"
```

---

### Task 2: Pipeline tối ưu GLB

**Files:**
- Create: `scripts/optimize.mjs`
- Create (output): `public/models/anime-girl.glb`, `public/models/cow-girl.glb`

**Interfaces:**
- Consumes: 2 file gốc ở root.
- Produces: 2 GLB tối ưu phục vụ tại `/models/anime-girl.glb`, `/models/cow-girl.glb`, nén Meshopt + texture WebP 2048.

- [ ] **Step 1: Viết `scripts/optimize.mjs`**

```js
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, dequantize, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCES = [
  { input: 'anime_girl_3d_model_v1.glb', output: 'anime-girl.glb' },
  { input: 'cow_girl_3d_model.glb', output: 'cow-girl.glb' },
];
const MAX_BYTES = 15 * 1024 * 1024;
const MAX_TRIANGLES = 500_000;

function countTriangles(doc) {
  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      if (indices) tris += indices.getCount() / 3;
      else tris += (prim.getAttribute('POSITION')?.getCount() ?? 0) / 3;
    }
  }
  return Math.round(tris);
}

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).setAllowNetwork(false);

for (const { input, output } of SOURCES) {
  const sourcePath = path.join(ROOT, input);
  const targetPath = path.join(ROOT, 'public', 'models', output);
  await mkdir(path.dirname(targetPath), { recursive: true });

  const doc = await io.read(sourcePath);
  const beforeBytes = (await stat(sourcePath)).size;
  const beforeTris = countTriangles(doc);

  await doc.transform(
    dedup(),
    prune(),
    weld(),
    dequantize(),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.35, error: 0.001, lockBorder: true }),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [2048, 2048],
      quality: 90,
      slots: /^(?!normalTexture).*$/,
    }),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [2048, 2048],
      quality: 95,
      slots: /normalTexture/,
    }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );

  await io.write(targetPath, doc);

  const afterBytes = (await stat(targetPath)).size;
  const afterTris = countTriangles(doc);
  const textureTypes = doc.getRoot().listTextures().map((texture) => texture.getMimeType()).join(', ');

  console.log(`${input} -> public/models/${output}`);
  console.log(`  size: ${(beforeBytes / 1048576).toFixed(1)} MB -> ${(afterBytes / 1048576).toFixed(1)} MB`);
  console.log(`  triangles: ${beforeTris.toLocaleString('en-US')} -> ${afterTris.toLocaleString('en-US')}`);
  console.log(`  textures: ${textureTypes}`);

  if (afterBytes > MAX_BYTES) throw new Error(`${output} vượt 15 MB`);
  if (afterTris > MAX_TRIANGLES) throw new Error(`${output} vượt 500k tam giác`);
}

console.log('Asset optimization hoàn tất.');
```

- [ ] **Step 2: Chạy pipeline**

Run:
```bash
cd "E:/webshowcharacter"
npm run optimize
```
Expected: mỗi file in ra dòng `size: 31.x MB -> 6–12 MB`, `triangles: 945,120 -> ~300–400k`, `textures: image/webp, image/webp, image/webp`; KHÔNG throw.

Nếu throw `vượt 500k tam giác` hoặc ảnh hưởng chất lượng: hạ `ratio` 0.35 → 0.30 rồi chạy lại. Nếu silhouette/mặt bị vỡ (kiểm tra ở Task 3): nâng `ratio` lên 0.5 và chạy lại.

- [ ] **Step 3: Kiểm tra file gốc không đổi**

Run:
```bash
cd "E:/webshowcharacter"
ls -la *.glb public/models/
```
Expected: 2 file gốc vẫn ~33 MB; 2 file mới ≤ 15 MB.

- [ ] **Step 4: Commit**

```bash
git add scripts/optimize.mjs public/models/anime-girl.glb public/models/cow-girl.glb
git commit -m "feat(assets): thêm pipeline tối ưu glb và bản nén meshopt"
```

---

### Task 3: Sân khấu studio + render nhân vật đầu tiên + QA nền tảng

**Files:**
- Create: `src/config.ts`, `src/scene.ts`, `src/character.ts`, `scripts/qa.mjs`
- Modify: `src/main.ts` (thay bản tạm bằng load nhân vật đầu tiên)

**Interfaces:**
- Produces `CHARACTERS: CharacterDef[]` với `id: 'anime' | 'cow'`, `name`, `file`, `index`, `exposure`, `envIntensity`, `cameraPadding`, `height`.
- Produces `class ShowcaseScene` với: `scene`, `camera`, `renderer`, `controls`, `maxAnisotropy`, `setStage(box, def)`, `resetView()`, `toggleAutoRotate(): boolean`, `setAutoRotate(on)`, `setRunning(on)`, `start()`.
- Produces `loadCharacter(def, { anisotropy, onProgress }): Promise<{ group, box }>`, `disposeCharacter(root)`, `countTriangles(root)`.
- Produces `qa.mjs` chạy được: `npm run build && npm run qa`, ghi `qa/desktop-anime.png`.

- [ ] **Step 1: Viết `src/config.ts`**

```ts
export type CharacterId = 'anime' | 'cow';

export type CharacterDef = {
  id: CharacterId;
  name: string;
  file: string;
  index: string;
  exposure: number;
  envIntensity: number;
  cameraPadding: number;
  height: number;
};

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'anime',
    name: 'Anime Girl',
    file: `${import.meta.env.BASE_URL}models/anime-girl.glb`,
    index: '01',
    exposure: 1.1,
    envIntensity: 0.35,
    cameraPadding: 1.65,
    height: 1.75,
  },
  {
    id: 'cow',
    name: 'Cow Girl',
    file: `${import.meta.env.BASE_URL}models/cow-girl.glb`,
    index: '02',
    exposure: 1.05,
    envIntensity: 0.35,
    cameraPadding: 1.7,
    height: 1.75,
  },
];
```

- [ ] **Step 2: Viết `src/scene.ts`**

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { CharacterDef } from './config';

const ACCENT = 0xd9a05b;

function prefersCoarsePointer(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

function createBlobTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(0,0,0,0.6)');
    gradient.addColorStop(0.55, 'rgba(0,0,0,0.24)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

export class ShowcaseScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly renderer: THREE.WebGLRenderer;

  private readonly keyLight: THREE.DirectionalLight;
  private readonly stage = new THREE.Group();
  private readonly isMobile = prefersCoarsePointer();
  private fitDistance = 3;
  private frameBox: THREE.Box3 | null = null;
  private frameDef: CharacterDef | null = null;
  private rafId = 0;
  private running = true;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !this.isMobile,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 1.5, 4);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minPolarAngle = 0.7;
    this.controls.maxPolarAngle = 1.6;
    this.controls.autoRotate = !this.isMobile;
    this.controls.autoRotateSpeed = 0.45;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    pmrem.dispose();

    this.keyLight = new THREE.DirectionalLight('#fff1e0', 2.2);
    this.keyLight.position.set(2.6, 3.8, 2.8);
    this.keyLight.castShadow = true;
    const shadowSize = this.isMobile ? 1024 : 2048;
    this.keyLight.shadow.mapSize.set(shadowSize, shadowSize);
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.02;
    this.keyLight.target.position.set(0, 0.9, 0);
    this.scene.add(this.keyLight, this.keyLight.target);

    const fill = new THREE.DirectionalLight('#9fb6d6', 0.55);
    fill.position.set(-3.2, 2.2, 1.8);

    const rim = new THREE.SpotLight('#fff7ec', 90, 12, 0.55, 0.7, 2);
    rim.position.set(-0.6, 3.4, -3.6);
    rim.target.position.set(0, 1, 0);

    this.scene.add(fill, rim, rim.target, this.stage);

    new ResizeObserver(() => this.resize()).observe(canvas);
    window.addEventListener('orientationchange', () => {
      window.setTimeout(() => {
        this.resize();
        this.resetView();
      }, 250);
    });
    this.resize();
  }

  get maxAnisotropy(): number {
    return Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
  }

  setStage(box: THREE.Box3, def: CharacterDef): void {
    this.frameBox = box;
    this.frameDef = def;
    this.renderer.toneMappingExposure = def.exposure;
    this.scene.environmentIntensity = def.envIntensity;
    this.buildPedestal(box);
    this.fitCamera(box, def);
  }

  resetView(): void {
    if (this.frameBox && this.frameDef) this.fitCamera(this.frameBox, this.frameDef);
  }

  setAutoRotate(on: boolean): void {
    this.controls.autoRotate = on;
  }

  toggleAutoRotate(): boolean {
    this.controls.autoRotate = !this.controls.autoRotate;
    return this.controls.autoRotate;
  }

  setRunning(on: boolean): void {
    if (on === this.running) return;
    this.running = on;
    if (on) this.startLoop();
    else cancelAnimationFrame(this.rafId);
  }

  start(): void {
    this.startLoop();
  }

  private startLoop(): void {
    cancelAnimationFrame(this.rafId);
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private resize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private fitCamera(box: THREE.Box3, def: CharacterDef): void {
    const size = box.getSize(new THREE.Vector3());
    const target = new THREE.Vector3(0, size.y * 0.52, 0);
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const padding = this.isMobile ? Math.max(def.cameraPadding, 1.9) : def.cameraPadding;
    const distV = size.y / 2 / Math.tan(vFov / 2);
    const distH = Math.max(size.x, size.z) / 2 / Math.tan(hFov / 2);
    this.fitDistance = Math.max(distV, distH) * padding;
    this.controls.target.copy(target);
    this.controls.minDistance = this.fitDistance * 0.45;
    this.controls.maxDistance = this.fitDistance * 2.2;
    this.applyDefaultView();
  }

  private applyDefaultView(): void {
    const distance = this.fitDistance;
    const polar = 1.36;
    const azimuth = 0.18;
    const offset = new THREE.Vector3(
      Math.sin(polar) * Math.sin(azimuth),
      Math.cos(polar),
      Math.sin(polar) * Math.cos(azimuth),
    ).multiplyScalar(distance);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  private buildPedestal(box: THREE.Box3): void {
    this.stage.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const basic = material as THREE.MeshBasicMaterial;
        basic.map?.dispose();
        material.dispose();
      }
    });
    this.stage.clear();

    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(0.72, Math.max(size.x, size.z) * 0.62 + 0.12);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 0.985, 0.06, 96, 1),
      new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.9, metalness: 0.05 }),
    );
    pedestal.position.y = -0.03;
    pedestal.receiveShadow = true;
    this.stage.add(pedestal);

    const shadowPlane = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 0.999, 64),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.38 }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.001;
    shadowPlane.receiveShadow = true;
    this.stage.add(shadowPlane);

    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 1.5, radius * 1.5),
      new THREE.MeshBasicMaterial({
        map: createBlobTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
        toneMapped: false,
      }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.002;
    this.stage.add(blob);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.965, radius * 0.975, 128),
      new THREE.MeshBasicMaterial({
        color: ACCENT,
        transparent: true,
        opacity: 0.35,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.003;
    this.stage.add(ring);

    const shadowCamera = this.keyLight.shadow.camera;
    const extent = radius + 0.8;
    shadowCamera.left = -extent;
    shadowCamera.right = extent;
    shadowCamera.top = size.y * 1.4;
    shadowCamera.bottom = -0.4;
    shadowCamera.near = 0.5;
    shadowCamera.far = 14;
    shadowCamera.updateProjectionMatrix();
  }
}
```

- [ ] **Step 3: Viết `src/character.ts`**

```ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { CharacterDef } from './config';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

export type LoadOptions = {
  anisotropy: number;
  onProgress?: (fraction: number) => void;
};

export async function loadCharacter(
  def: CharacterDef,
  options: LoadOptions,
): Promise<{ group: THREE.Group; box: THREE.Box3 }> {
  const gltf = await loader.loadAsync(def.file, (event) => {
    if (event.total > 0) options.onProgress?.(Math.min(event.loaded / event.total, 1));
  });

  const group = gltf.scene;
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const scale = def.height / Math.max(size.y, 0.0001);
  group.scale.setScalar(scale);
  group.updateMatrixWorld(true);

  box.setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.x -= center.x;
  group.position.z -= center.z;
  group.position.y -= box.min.y;
  group.updateMatrixWorld(true);
  box.setFromObject(group);

  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      const maps = [
        material.map,
        material.normalMap,
        material.metalnessMap,
        material.roughnessMap,
        material.aoMap,
        material.emissiveMap,
      ];
      for (const map of maps) {
        if (map) map.anisotropy = options.anisotropy;
      }
    }
  });

  return { group, box };
}

export function countTriangles(root: THREE.Object3D): number {
  let triangles = 0;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry;
    triangles += geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3;
  });
  return Math.round(triangles);
}

export function disposeCharacter(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const standard = material as THREE.MeshStandardMaterial;
      const maps = [
        standard.map,
        standard.normalMap,
        standard.metalnessMap,
        standard.roughnessMap,
        standard.aoMap,
        standard.emissiveMap,
      ];
      for (const map of maps) map?.dispose();
      material.dispose();
    }
  });
  root.removeFromParent();
  root.clear();
}
```

- [ ] **Step 4: Thay `src/main.ts` bằng bản load nhân vật đầu tiên**

```ts
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/latin-500.css';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-500.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './styles.css';
import { CHARACTERS } from './config';
import { ShowcaseScene } from './scene';
import { countTriangles, loadCharacter } from './character';

const app = document.querySelector<HTMLElement>('#app')!;
const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const loader = document.querySelector<HTMLElement>('#loader')!;
const loaderPct = document.querySelector<HTMLElement>('#loader-pct')!;
const loaderBar = document.querySelector<HTMLElement>('#loader-bar')!;
const name = document.querySelector<HTMLElement>('#char-name')!;
const index = document.querySelector<HTMLElement>('#char-index')!;

const scene = new ShowcaseScene(canvas);
scene.start();

const def = CHARACTERS[0];
name.textContent = def.name;
index.textContent = def.index;

void loadCharacter(def, {
  anisotropy: scene.maxAnisotropy,
  onProgress: (fraction) => {
    const percent = Math.round(fraction * 100);
    loaderPct.textContent = `${percent}%`;
    loaderBar.style.width = `${percent}%`;
  },
})
  .then(({ group, box }) => {
    scene.scene.add(group);
    scene.setStage(box, def);
    app.dataset.triangles = String(countTriangles(group));
    app.dataset.character = def.id;
    loader.classList.add('is-hidden');
    requestAnimationFrame(() => {
      app.dataset.ready = 'true';
    });
  })
  .catch((error) => {
    console.error(error);
    loader.classList.add('is-hidden');
  });
```

- [ ] **Step 5: Viết `scripts/qa.mjs` (bản nền: desktop screenshot + kiểm tra pixel/console)**

```js
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
```

- [ ] **Step 6: Build + chạy QA**

Run:
```bash
cd "E:/webshowcharacter"
npm run build
npm run qa
```
Expected: `PASS desktop canvas rendered`, `PASS desktop triangles in range` (~300–400k), `PASS desktop console clean`, `All checks passed`.

Nếu `coverage` thấp: mở `qa/desktop-anime.png` bằng Read để xem model có hiện không; nếu trắng/đen hoàn toàn, kiểm tra đường dẫn model và MeshoptDecoder.

- [ ] **Step 7: Soát screenshot bằng mắt**

Read `qa/desktop-anime.png`. Yêu cầu tối thiểu: model đứng trên bệ, không lơ lửng, không cắt đầu/chân, không quá tối; loader đã biến mất. Nếu model quá tối do metallic: thêm vào `character.ts` trong vòng lặp material:
```ts
material.metalness = 0;
```
rồi build + QA lại.

- [ ] **Step 8: Commit**

```bash
git add src/config.ts src/scene.ts src/character.ts src/main.ts scripts/qa.mjs
git commit -m "feat(scene): dựng sân khấu studio và render nhân vật đầu tiên"
```

---

### Task 4: Giao diện đầy đủ + chuyển nhân vật + xử lý lỗi

**Files:**
- Create: `src/ui.ts`
- Modify: `src/main.ts` (bản cuối)
- Modify: `scripts/qa.mjs` (bổ sung mobile, chuyển nhân vật, reduced-motion, prefix live)

**Interfaces:**
- Consumes: `ShowcaseScene`, `loadCharacter`, `disposeCharacter`, `countTriangles`, `CharacterDef`, `CHARACTERS`.
- Produces: `class ShowcaseUI` với `setCharacter(def)`, `setAutoRotate(on)`, `setLoading(fraction | null)`, `setVeil(on)`, `showError(message)`, `hideError()`; constructor nhận `ShowcaseHandlers`.

- [ ] **Step 1: Viết `src/ui.ts`**

```ts
import type { CharacterDef } from './config';

export type ShowcaseHandlers = {
  onToggleRotate: () => void;
  onReset: () => void;
  onFullscreen: () => void;
  onSelect: (id: string) => void;
  onRetry: () => void;
};

function el<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing element: ${selector}`);
  return node;
}

export class ShowcaseUI {
  private readonly name = el<HTMLElement>('#char-name');
  private readonly index = el<HTMLElement>('#char-index');
  private readonly total = el<HTMLElement>('#char-total');
  private readonly loader = el<HTMLElement>('#loader');
  private readonly loaderPct = el<HTMLElement>('#loader-pct');
  private readonly loaderBar = el<HTMLElement>('#loader-bar');
  private readonly veil = el<HTMLElement>('#veil');
  private readonly hint = el<HTMLElement>('#hint');
  private readonly rotateBtn = el<HTMLButtonElement>('#btn-rotate');
  private readonly errorBox = el<HTMLElement>('#error');
  private readonly errorText = el<HTMLElement>('#error-text');
  private readonly switchButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.switch-btn'),
  );
  private readonly canvas = el<HTMLCanvasElement>('#stage');

  constructor(handlers: ShowcaseHandlers) {
    this.rotateBtn.addEventListener('click', handlers.onToggleRotate);
    el<HTMLButtonElement>('#btn-reset').addEventListener('click', handlers.onReset);

    const fullscreenBtn = el<HTMLButtonElement>('#btn-fullscreen');
    if (!document.fullscreenEnabled) fullscreenBtn.hidden = true;
    fullscreenBtn.addEventListener('click', handlers.onFullscreen);

    for (const button of this.switchButtons) {
      button.addEventListener('click', () => handlers.onSelect(button.dataset.character ?? ''));
    }

    el<HTMLButtonElement>('#btn-retry').addEventListener('click', handlers.onRetry);
    window.addEventListener(
      'pointerdown',
      () => this.hint.classList.add('is-dismissed'),
      { once: true, passive: true },
    );

    const touch =
      window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    this.hint.textContent = touch
      ? 'DRAG TO ROTATE · PINCH TO ZOOM'
      : 'DRAG TO ROTATE · SCROLL TO ZOOM';
    this.total.textContent = String(this.switchButtons.length).padStart(2, '0');
  }

  setCharacter(def: CharacterDef): void {
    this.name.textContent = def.name;
    this.index.textContent = def.index;
    document.title = `${def.name} — Character Showcase`;
    this.canvas.setAttribute(
      'aria-label',
      `${def.name} 3D character. Drag to rotate, pinch or scroll to zoom.`,
    );
    for (const button of this.switchButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.character === def.id));
    }
    this.hideError();
  }

  setAutoRotate(on: boolean): void {
    this.rotateBtn.setAttribute('aria-pressed', String(on));
  }

  setLoading(fraction: number | null): void {
    if (fraction === null) {
      this.loader.classList.add('is-hidden');
      return;
    }
    this.loader.classList.remove('is-hidden');
    const percent = Math.round(Math.min(Math.max(fraction, 0), 1) * 100);
    this.loaderPct.textContent = `${percent}%`;
    this.loaderBar.style.width = `${percent}%`;
  }

  setVeil(on: boolean): void {
    this.veil.classList.toggle('is-on', on);
  }

  showError(message: string): void {
    this.errorText.textContent = message;
    this.errorBox.hidden = false;
  }

  hideError(): void {
    this.errorBox.hidden = true;
  }
}
```

- [ ] **Step 2: Thay `src/main.ts` bằng bản cuối**

```ts
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/latin-500.css';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-500.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './styles.css';
import * as THREE from 'three';
import { CHARACTERS, type CharacterDef } from './config';
import { ShowcaseScene } from './scene';
import { countTriangles, disposeCharacter, loadCharacter } from './character';
import { ShowcaseUI } from './ui';

const app = document.querySelector<HTMLElement>('#app');
const canvas = document.querySelector<HTMLCanvasElement>('#stage');

function hasWebGL2(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

if (!app || !canvas || !hasWebGL2()) {
  document.querySelector<HTMLElement>('#fallback')?.removeAttribute('hidden');
  document.querySelector<HTMLElement>('#loader')?.classList.add('is-hidden');
} else {
  void bootstrap(app, canvas);
}

async function bootstrap(app: HTMLElement, canvas: HTMLCanvasElement): Promise<void> {
  const scene = new ShowcaseScene(canvas);
  const coarsePointer =
    window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const autoRotateDefault = !coarsePointer && !reducedMotion;

  let current: { def: CharacterDef; group: THREE.Group } | null = null;
  let lastDef: CharacterDef = CHARACTERS[0];
  let switching = false;

  const ui = new ShowcaseUI({
    onToggleRotate: () => ui.setAutoRotate(scene.toggleAutoRotate()),
    onReset: () => {
      scene.resetView();
      scene.setAutoRotate(autoRotateDefault);
      ui.setAutoRotate(autoRotateDefault);
    },
    onFullscreen: () => void toggleFullscreen(app),
    onSelect: (id) => {
      const def = CHARACTERS.find((character) => character.id === id);
      if (def) void switchTo(def);
    },
    onRetry: () => void switchTo(lastDef, true),
  });

  scene.setAutoRotate(autoRotateDefault);
  ui.setAutoRotate(autoRotateDefault);
  scene.start();

  async function load(def: CharacterDef): Promise<void> {
    lastDef = def;
    ui.hideError();
    ui.setLoading(0);
    const { group, box } = await loadCharacter(def, {
      anisotropy: scene.maxAnisotropy,
      onProgress: (fraction) => ui.setLoading(fraction),
    });
    if (current) disposeCharacter(current.group);
    scene.scene.add(group);
    current = { def, group };
    scene.setStage(box, def);
    app.dataset.triangles = String(countTriangles(group));
    app.dataset.character = def.id;
    ui.setCharacter(def);
    ui.setLoading(null);
    requestAnimationFrame(() => {
      app.dataset.ready = 'true';
    });
  }

  async function switchTo(def: CharacterDef, force = false): Promise<void> {
    if (switching || (!force && current?.def.id === def.id)) return;
    switching = true;
    app.dataset.ready = 'false';
    ui.setVeil(true);
    await new Promise((resolve) => setTimeout(resolve, 260));
    try {
      await load(def);
    } catch (error) {
      console.error(error);
      ui.setLoading(null);
      ui.showError('FAILED TO LOAD THE CHARACTER. CHECK YOUR CONNECTION AND RETRY.');
      if (current) {
        ui.setCharacter(current.def);
        app.dataset.character = current.def.id;
      }
      app.dataset.ready = current ? 'true' : 'false';
    } finally {
      ui.setVeil(false);
      switching = false;
    }
  }

  async function toggleFullscreen(target: HTMLElement): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await target.requestFullscreen();
    } catch (error) {
      console.error(error);
    }
  }

  document.addEventListener('visibilitychange', () => {
    scene.setRunning(!document.hidden);
  });

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    ui.showError('GRAPHICS CONTEXT LOST. PLEASE RELOAD THE PAGE.');
  });

  try {
    await load(CHARACTERS[0]);
  } catch (error) {
    console.error(error);
    ui.setLoading(null);
    ui.showError('FAILED TO LOAD THE CHARACTER. CHECK YOUR CONNECTION AND RETRY.');
  }

  const other = CHARACTERS.find((character) => character.id !== CHARACTERS[0].id);
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (other && !connection?.saveData) {
    const prefetch = () => {
      void fetch(other.file).catch(() => undefined);
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(prefetch);
    else setTimeout(prefetch, 2500);
  }
}
```

- [ ] **Step 3: Thay `scripts/qa.mjs` bằng bản đầy đủ (desktop + mobile + reduced motion)**

```js
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
```

- [ ] **Step 4: Build + QA**

Run:
```bash
cd "E:/webshowcharacter"
npm run build
npm run qa
```
Expected: toàn bộ `PASS`, gồm 4 screenshot: `qa/desktop-anime.png`, `qa/desktop-cow.png`, `qa/mobile-anime.png`, `qa/mobile-cow.png`.

Nếu mobile `auto-rotate defaults off` fail: kiểm tra `autoRotateDefault` trong `main.ts` và media `(pointer: coarse)`.

- [ ] **Step 5: Soát cả 4 screenshot**

Read lần lượt 4 file PNG. Yêu cầu: cả 2 model hiện đúng, khung hình không cắt đầu/chân, UI không đè model, mobile switcher nằm dưới cùng và không tràn.

- [ ] **Step 6: Commit**

```bash
git add src/ui.ts src/main.ts scripts/qa.mjs
git commit -m "feat(ui): thêm giao diện trưng bày, chuyển nhân vật và xử lý lỗi"
```

---

### Task 5: Tinh chỉnh hình ảnh + checkpoint duyệt screenshot (DỪNG)

**Files:**
- Modify: `src/config.ts` (exposure/envIntensity/cameraPadding nếu cần)
- Modify: `src/scene.ts` (cường độ đèn, opacity accent ring/blob, vị trí camera nếu cần)

**Interfaces:**
- Không thêm interface mới; chỉ chỉnh hằng số.

- [ ] **Step 1: Đánh giá 4 screenshot hiện tại**

Read `qa/desktop-anime.png`, `qa/desktop-cow.png`, `qa/mobile-anime.png`, `qa/mobile-cow.png`. Ghi nhận cụ thể: độ sáng mặt/da, tương phản silhouette, bóng dưới chân, khung hình (đầu/chân), UI.

- [ ] **Step 2: Chỉnh có mục tiêu (tối đa các knob sau)**

- Model tối: tăng `exposure` trong `src/config.ts` từng nhân vật thêm 0.1; hoặc tăng `envIntensity` 0.35 → 0.45.
- Model cháy sáng: giảm `keyLight` intensity 2.2 → 1.9; hoặc giảm `exposure` 0.1.
- Rim chưa tách nền: tăng `rim` SpotLight intensity 90 → 130.
- Vòng accent quá gắt: giảm `opacity` ring 0.35 → 0.22.
- Bóng chân quá đậm: giảm blob `opacity` 0.55 → 0.4 hoặc `ShadowMaterial` 0.38 → 0.3.
- Mobile cắt đầu/chân: tăng `cameraPadding` nhân vật lên 1.85–2.0 (mobile đã có sàn 1.9).
- Camera quá thấp/cao: đổi `polar` 1.36 → 1.30 (thấp hơn) hoặc 1.42 (cao hơn).

Chỉ sửa các giá trị này, không đổi kiến trúc.

- [ ] **Step 3: Build + QA lại**

Run:
```bash
cd "E:/webshowcharacter"
npm run build
npm run qa
```
Expected: `All checks passed`.

- [ ] **Step 4: Commit (nếu có thay đổi số)**

```bash
git add src/config.ts src/scene.ts
git commit -m "style(viewer): tinh chỉnh ánh sáng và khung hình theo model"
```

- [ ] **Step 5: CHECKPOINT — DỪNG và xin user duyệt**

Gửi user: link 4 screenshot (`file:///E:/webshowcharacter/qa/desktop-anime.png`, ...), tóm tắt 1–2 dòng điều đã chỉnh, và câu hỏi "Duyệt để deploy Vercel?".

**Không bắt đầu Task 6 trước khi user trả lời đồng ý.**

---

### Task 6: Deploy Vercel + nghiệm thu trên link thật

**Files:**
- Không sửa code (trừ khi phát hiện lỗi production).
- Có thể tạo: `.vercel/` (gitignored).

**Interfaces:**
- Consumes: build `dist/`, `vercel.json`, `.vercelignore`.
- Produces: URL production `https://<project>.vercel.app`.

- [ ] **Step 1: Kiểm tra trạng thái đăng nhập Vercel**

Run:
```bash
cd "E:/webshowcharacter"
npm exec --yes --package=vercel@latest -- vercel whoami
```
Expected: in ra username. Nếu báo `Logged out`: chạy:
```bash
npm exec --yes --package=vercel@latest -- vercel login
```
CLI in ra URL dạng `https://vercel.com/oauth/device?user_code=...`; gửi user để họ authorize, đợi lệnh hoàn tất rồi chạy lại `whoami`. Không yêu cầu token/password.

- [ ] **Step 2: Build production**

Run:
```bash
npm run build
```
Expected: `dist/` có `index.html`, `assets/`, `models/*.glb`.

- [ ] **Step 3: Deploy production**

Run:
```bash
npm exec --yes --package=vercel@latest -- vercel deploy --prod --yes --project character-showcase --create-if-missing
```
Expected: CLI in ra `Production: https://character-showcase-....vercel.app`. Nếu tên project đã bị chiếm, dùng URL CLI cấp và ghi lại URL thật.

- [ ] **Step 4: Kiểm tra asset và cache header**

Run (thay URL thật):
```bash
curl -sI https://character-showcase.vercel.app/models/anime-girl.glb | head -12
curl -sI https://character-showcase.vercel.app/ | head -8
```
Expected: GLB trả `200`, có `cache-control: public, max-age=31536000, immutable`; trang trả `200`.

- [ ] **Step 5: QA trên production**

Run (thay URL thật):
```bash
QA_BASE=https://character-showcase.vercel.app npm run qa
```
Expected: tất cả `PASS`, screenshot `qa/live-desktop-anime.png`, `qa/live-desktop-cow.png`, `qa/live-mobile-anime.png`, `qa/live-mobile-cow.png`.

- [ ] **Step 6: Soát screenshot live**

Read 4 file `qa/live-*.png`. Xác nhận model và UI giống bản local (không bị 404 model, không lỗi console).

- [ ] **Step 7: Báo cáo và bàn giao**

Gửi user: URL production, kết quả QA (số check PASS), link screenshot live, và yêu cầu mở bằng điện thoại thật để xác nhận cảm ứng (xoay 1 ngón, pinch 2 ngón, chuyển nhân vật).

Không commit gì thêm nếu không có thay đổi code. Không push GitHub (không có remote, user chưa yêu cầu).

---

## Definition of Done

- [ ] `npm run build` xanh; `npm run qa` toàn PASS trên local và production.
- [ ] 2 nhân vật hiển thị đúng, chuyển đổi mượt, model cũ được dispose.
- [ ] Desktop: auto-rotate bật mặc định, xoay/zoom/reset/fullscreen hoạt động.
- [ ] Mobile 390×844: không tràn ngang, auto-rotate tắt mặc định, cảm ứng xoay/pinch hoạt động.
- [ ] `prefers-reduced-motion` tắt auto-rotate.
- [ ] GLB production ≤ 15 MB/file, có cache immutable.
- [ ] User đã duyệt screenshot ở Task 5 và xác nhận link trên điện thoại thật.
