import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { CharacterDef } from './config';
import { ShowcaseEffects } from './effects';

const ACCENT = 0xd9a05b;

function createBackdropTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#1c2026';
    context.fillRect(0, 0, size, size);
    context.save();
    context.translate(size * 0.5, size * 0.38);
    context.scale(1, 0.65 / 0.9);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, size * 0.9);
    gradient.addColorStop(0, '#292f35');
    gradient.addColorStop(0.55, '#21262c');
    gradient.addColorStop(1, '#1c2026');
    context.fillStyle = gradient;
    context.fillRect(-size * 2, -size * 2, size * 4, size * 4);
    context.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

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
  private readonly effects: ShowcaseEffects;
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
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 1.5, 4);

    this.effects = new ShowcaseEffects(this.renderer, this.scene, this.camera, this.isMobile);
    const backdrop = createBackdropTexture();
    (window as unknown as Record<string, unknown>).__bg = backdrop.image;
    this.scene.background = backdrop;

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

    this.keyLight = new THREE.DirectionalLight('#fff1e0', 1.9);
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

    const rim = new THREE.SpotLight('#fff7ec', 130, 12, 0.55, 0.7, 2);
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
      this.effects.render();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private resize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.effects.setSize(width, height, pixelRatio);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private fitCamera(box: THREE.Box3, def: CharacterDef): void {
    const size = box.getSize(new THREE.Vector3());
    const target = new THREE.Vector3(0, size.y * 0.55, 0);
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const padding = this.isMobile ? Math.max(def.cameraPadding, 1.68) : def.cameraPadding;
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
    const polar = 1.38;
    const azimuth = 1.75;
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
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.32 }),
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
        opacity: 0.48,
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
