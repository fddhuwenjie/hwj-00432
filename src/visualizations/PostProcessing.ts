import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { ThemeColors } from '@/themes/themes'

const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uOffset: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uOffset;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - vec2(0.5);
      float dist = length(dir);
      vec2 offset = dir * dist * uOffset;
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
}

const NoiseShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uIntensity: { value: 0.0 },
    uTime: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    uniform float uTime;
    varying vec2 vUv;
    float random(vec2 st) {
      return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float noise = random(vUv + uTime) * uIntensity;
      gl_FragColor = vec4(color.rgb + noise, color.a);
    }
  `,
}

const FlashShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uFlash: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uFlash;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      gl_FragColor = vec4(color.rgb + uFlash, color.a);
    }
  `,
}

export class PostProcessing {
  private composer: EffectComposer
  private bloomPass: UnrealBloomPass
  private chromaPass: ShaderPass
  private noisePass: ShaderPass
  private flashPass: ShaderPass
  private flashIntensity = 0
  private time = 0

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.composer = new EffectComposer(renderer)

    const renderPass = new RenderPass(scene, camera)
    this.composer.addPass(renderPass)

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5,
      0.4,
      0.85,
    )
    this.composer.addPass(this.bloomPass)

    this.chromaPass = new ShaderPass(ChromaticAberrationShader)
    this.composer.addPass(this.chromaPass)

    this.noisePass = new ShaderPass(NoiseShader)
    this.composer.addPass(this.noisePass)

    this.flashPass = new ShaderPass(FlashShader)
    this.composer.addPass(this.flashPass)
  }

  triggerFlash(): void {
    this.flashIntensity = 0.8
  }

  update(volume: number, beat: boolean, deltaTime: number): void {
    this.time += deltaTime

    this.bloomPass.strength = 0.5 + volume * 1.5

    this.chromaPass.uniforms.uOffset.value = volume * 0.003

    this.noisePass.uniforms.uIntensity.value = volume * 0.08
    this.noisePass.uniforms.uTime.value = this.time

    if (beat) {
      this.flashIntensity = 0.8
    }
    this.flashIntensity *= 0.9
    this.flashPass.uniforms.uFlash.value = this.flashIntensity
  }

  render(): void {
    this.composer.render()
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height)
  }

  dispose(): void {
    this.composer.dispose()
  }
}
