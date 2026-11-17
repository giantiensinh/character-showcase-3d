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
      if (current) {
        ui.setCharacter(current.def);
        app.dataset.character = current.def.id;
      }
      ui.showError('FAILED TO LOAD THE CHARACTER. CHECK YOUR CONNECTION AND RETRY.');
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
