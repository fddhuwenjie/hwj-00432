import * as THREE from 'three'
import type { ThemeColors } from '@/themes/themes'

const PARTICLE_COUNT = 4000
const TRAIL_FRAMES = 3
const BURST_VELOCITY = 3.0
const DAMPING = 0.95
const LERP_FACTOR = 0.02
const LOW_FREQ_RANGE = 64
const HIGH_FREQ_START = 64
const HIGH_FREQ_END = 192

const vertexShader = `
  attribute float aOpacity;
  varying float vOpacity;
  void main() {
    vOpacity = aOpacity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (80.0 * aOpacity) / -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying float vOpacity;
  uniform vec3 uColor;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, dist) * vOpacity;
    gl_FragColor = vec4(uColor, alpha);
  }
`

export class ParticleNebula {
  private scene: THREE.Scene
  private geometry: THREE.BufferGeometry
  private material: THREE.ShaderMaterial
  private points: THREE.Points
  private positions: Float32Array
  private velocities: Float32Array
  private opacities: Float32Array
  private basePositions: Float32Array
  private trailGeometries: THREE.BufferGeometry[] = []
  private trailMaterials: THREE.ShaderMaterial[] = []
  private trailPoints: THREE.Points[] = []
  private trailPositionArrays: Float32Array[] = []
  private trailOpacityArrays: Float32Array[] = []

  constructor(scene: THREE.Scene, theme: ThemeColors) {
    this.scene = scene
    this.positions = new Float32Array(PARTICLE_COUNT * 3)
    this.velocities = new Float32Array(PARTICLE_COUNT * 3)
    this.opacities = new Float32Array(PARTICLE_COUNT)
    this.basePositions = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 2 + Math.random() * 3

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      this.basePositions[i * 3] = x
      this.basePositions[i * 3 + 1] = y
      this.basePositions[i * 3 + 2] = z
      this.positions[i * 3] = x
      this.positions[i * 3 + 1] = y
      this.positions[i * 3 + 2] = z
      this.velocities[i * 3] = 0
      this.velocities[i * 3 + 1] = 0
      this.velocities[i * 3 + 2] = 0
      this.opacities[i] = 0.6 + Math.random() * 0.4
    }

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage))
    this.geometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.opacities, 1).setUsage(THREE.DynamicDrawUsage))

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColor: { value: new THREE.Color(theme.accent) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.scene.add(this.points)

    for (let t = 0; t < TRAIL_FRAMES; t++) {
      const trailPositions = new Float32Array(PARTICLE_COUNT * 3)
      const trailOpacities = new Float32Array(PARTICLE_COUNT)
      trailPositions.set(this.positions)

      const fadeFactor = (TRAIL_FRAMES - t) / (TRAIL_FRAMES + 1)
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        trailOpacities[i] = this.opacities[i] * fadeFactor * 0.5
      }

      this.trailPositionArrays.push(trailPositions)
      this.trailOpacityArrays.push(trailOpacities)

      const trailGeo = new THREE.BufferGeometry()
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3).setUsage(THREE.DynamicDrawUsage))
      trailGeo.setAttribute('aOpacity', new THREE.BufferAttribute(trailOpacities, 1).setUsage(THREE.DynamicDrawUsage))

      const trailMat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uColor: { value: new THREE.Color(theme.accent) },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })

      const trailPts = new THREE.Points(trailGeo, trailMat)
      this.scene.add(trailPts)

      this.trailGeometries.push(trailGeo)
      this.trailMaterials.push(trailMat)
      this.trailPoints.push(trailPts)
    }
  }

  update(frequencyData: Uint8Array, volume: number, beat: boolean, theme: ThemeColors): void {
    let lowSum = 0
    const lowEnd = Math.min(LOW_FREQ_RANGE, frequencyData.length)
    for (let i = 0; i < lowEnd; i++) {
      lowSum += frequencyData[i]
    }
    const lowFreqEnergy = lowEnd > 0 ? lowSum / lowEnd / 255 : 0

    let highSum = 0
    const highEnd = Math.min(HIGH_FREQ_END, frequencyData.length)
    for (let i = HIGH_FREQ_START; i < highEnd; i++) {
      highSum += frequencyData[i]
    }
    const highFreqEnergy = highEnd > HIGH_FREQ_START ? highSum / (highEnd - HIGH_FREQ_START) / 255 : 0

    for (let t = TRAIL_FRAMES - 1; t > 0; t--) {
      this.trailPositionArrays[t].set(this.trailPositionArrays[t - 1])
    }
    this.trailPositionArrays[0].set(this.positions)

    const expansion = lowFreqEnergy * 2.0
    const cosA = Math.cos(highFreqEnergy * 0.05)
    const sinA = Math.sin(highFreqEnergy * 0.05)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3
      const iy = i * 3 + 1
      const iz = i * 3 + 2

      const bx = this.basePositions[ix]
      const by = this.basePositions[iy]
      const bz = this.basePositions[iz]

      const radius = Math.max(Math.sqrt(bx * bx + by * by + bz * bz), 0.001)
      const nx = bx / radius
      const ny = by / radius
      const nz = bz / radius

      const targetX = bx * (1 + expansion) * cosA - bz * (1 + expansion) * sinA
      const targetY = by * (1 + expansion)
      const targetZ = bx * (1 + expansion) * sinA + bz * (1 + expansion) * cosA

      if (beat) {
        this.velocities[ix] += nx * BURST_VELOCITY
        this.velocities[iy] += ny * BURST_VELOCITY
        this.velocities[iz] += nz * BURST_VELOCITY
      }

      this.positions[ix] += this.velocities[ix]
      this.positions[iy] += this.velocities[iy]
      this.positions[iz] += this.velocities[iz]

      this.positions[ix] += (targetX - this.positions[ix]) * LERP_FACTOR
      this.positions[iy] += (targetY - this.positions[iy]) * LERP_FACTOR
      this.positions[iz] += (targetZ - this.positions[iz]) * LERP_FACTOR

      this.velocities[ix] *= DAMPING
      this.velocities[iy] *= DAMPING
      this.velocities[iz] *= DAMPING
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.aOpacity.needsUpdate = true

    for (let t = 0; t < TRAIL_FRAMES; t++) {
      const fadeFactor = (TRAIL_FRAMES - t) / (TRAIL_FRAMES + 1)
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        this.trailOpacityArrays[t][i] = this.opacities[i] * fadeFactor * 0.5
      }
      this.trailGeometries[t].attributes.position.needsUpdate = true
      this.trailGeometries[t].attributes.aOpacity.needsUpdate = true
    }

    this.material.uniforms.uColor.value.set(theme.accent)
    for (let t = 0; t < TRAIL_FRAMES; t++) {
      this.trailMaterials[t].uniforms.uColor.value.set(theme.accent)
    }
  }

  dispose(): void {
    this.scene.remove(this.points)
    this.geometry.dispose()
    this.material.dispose()

    for (let t = 0; t < TRAIL_FRAMES; t++) {
      this.scene.remove(this.trailPoints[t])
      this.trailGeometries[t].dispose()
      this.trailMaterials[t].dispose()
    }
  }
}
