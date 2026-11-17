import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';

const GradeShader = {
  name: 'GradeShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTexel: { value: new THREE.Vector2(1, 1) },
    uContrast: { value: 1.06 },
    uSaturation: { value: 1.08 },
    uLift: { value: new THREE.Vector3(0.006, 0.003, 0) },
    uGain: { value: new THREE.Vector3(1.03, 1, 0.96) },
    uVignette: { value: 0.42 },
    uSharpen: { value: 0.35 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform vec2 uTexel;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uVignette;
    uniform float uSharpen;
    uniform vec3 uLift;
    uniform vec3 uGain;
    varying vec2 vUv;

    void main() {
      vec4 src = texture2D(tDiffuse, vUv);
      vec3 color = src.rgb;

      vec3 blur = (
        texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb +
        texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb +
        texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb +
        texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb
      ) * 0.25;
      color += (color - blur) * uSharpen;

      color = max(color, 0.0) * uGain + uLift;

      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, uSaturation);
      color = (color - 0.18) * uContrast + 0.18;

      vec2 centered = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
      color *= 1.0 - smoothstep(0.3, 1.1, length(centered)) * uVignette;

      gl_FragColor = vec4(max(color, 0.0), src.a);
    }
  `,
};

export class ShowcaseEffects {
  private readonly composer: EffectComposer;
  private readonly grade: ShaderPass;
  private readonly gtao: GTAOPass;
  private readonly bloom: UnrealBloomPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    mobile: boolean,
  ) {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));

    this.gtao = new GTAOPass(scene, camera, 1, 1);
    this.gtao.updateGtaoMaterial({
      radius: 0.14,
      distanceExponent: 1.2,
      thickness: 0.9,
      scale: 1,
      samples: mobile ? 6 : 8,
      distanceFallOff: 1,
    });
    this.gtao.updatePdMaterial({
      lumaPhi: 10,
      depthPhi: 2,
      normalPhi: 3,
      radius: 4,
      radiusExponent: 1,
      rings: 2,
      samples: mobile ? 6 : 8,
    });
    this.gtao.output = GTAOPass.OUTPUT.Default;
    this.gtao.blendIntensity = 0.8;

    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.1, 0.25, 1.3);

    this.grade = new ShaderPass(GradeShader);
    this.grade.uniforms.uSharpen.value = mobile ? 0.25 : 0.35;

    this.composer.addPass(this.gtao);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(new FXAAPass());
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    const w = Math.max(1, Math.round(width * pixelRatio));
    const h = Math.max(1, Math.round(height * pixelRatio));
    this.grade.uniforms.uResolution.value.set(w, h);
    this.grade.uniforms.uTexel.value.set(1 / w, 1 / h);
    this.gtao.setSize(Math.max(1, Math.round(w * 0.5)), Math.max(1, Math.round(h * 0.5)));
    this.bloom.setSize(Math.max(1, Math.round(w * 0.5)), Math.max(1, Math.round(h * 0.5)));
  }

  render(): void {
    this.composer.render();
  }
}
