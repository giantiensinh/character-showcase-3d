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
