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
