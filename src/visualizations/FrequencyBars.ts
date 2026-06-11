import * as THREE from 'three'
import type { ThemeColors } from '@/themes/themes'

const BAR_COUNT = 128
const CIRCLE_RADIUS = 5
const MAX_HEIGHT = 8
const PARTICLE_POOL_SIZE = 500
const PARTICLE_LIFETIME = 1.5
const GRAVITY = -9.8

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  color: THREE.Color
}

export class FrequencyBars {
  private scene: THREE.Scene
  private barMesh: THREE.InstancedMesh
  private dummy: THREE.Object3D
  private barColors: THREE.Color[]
  private prevHeights: Float32Array
  private particlePoints: THREE.Points
  private particleGeometry: THREE.BufferGeometry
  private particles: Particle[]
  private nextParticleIdx: number
  private particlePositions: Float32Array
  private particleColors: Float32Array
  private particleSizes: Float32Array

  constructor(scene: THREE.Scene, theme: ThemeColors) {
    this.scene = scene
    this.dummy = new THREE.Object3D()
    this.prevHeights = new Float32Array(BAR_COUNT)
    this.barColors = []
    this.particles = []
    this.nextParticleIdx = 0

    const geometry = new THREE.BoxGeometry(0.15, 1, 0.15)
    geometry.translate(0, 0.5, 0)

    const material = new THREE.MeshStandardMaterial({
      metalness: 0.3,
      roughness: 0.4,
    })

    this.barMesh = new THREE.InstancedMesh(geometry, material, BAR_COUNT)
    this.barMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    const instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(BAR_COUNT * 3),
      3,
    )
    instanceColor.setUsage(THREE.DynamicDrawUsage)
    this.barMesh.instanceColor = instanceColor

    this.scene.add(this.barMesh)

    for (let i = 0; i < BAR_COUNT; i++) {
      const angle = (i / BAR_COUNT) * Math.PI * 2
      const x = Math.cos(angle) * CIRCLE_RADIUS
      const z = Math.sin(angle) * CIRCLE_RADIUS
      const t = i / BAR_COUNT
      const color = this.getBarColor(t, theme)
      this.barColors.push(color)

      this.dummy.position.set(x, 0, z)
      this.dummy.scale.set(1, 0.01, 1)
      this.dummy.rotation.set(0, -angle, 0)
      this.dummy.updateMatrix()
      this.barMesh.setMatrixAt(i, this.dummy.matrix)

      instanceColor.setXYZ(i, color.r, color.g, color.b)
    }

    instanceColor.needsUpdate = true
    this.barMesh.instanceMatrix.needsUpdate = true

    this.particlePositions = new Float32Array(PARTICLE_POOL_SIZE * 3)
    this.particleColors = new Float32Array(PARTICLE_POOL_SIZE * 3)
    this.particleSizes = new Float32Array(PARTICLE_POOL_SIZE)

    this.particleGeometry = new THREE.BufferGeometry()
    this.particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.particlePositions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    )
    this.particleGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.particleColors, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    )
    this.particleGeometry.setAttribute(
      'size',
      new THREE.BufferAttribute(this.particleSizes, 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    )

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })

    this.particlePoints = new THREE.Points(this.particleGeometry, particleMaterial)
    this.scene.add(this.particlePoints)

    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        position: new THREE.Vector3(0, -100, 0),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0,
        color: new THREE.Color(),
      })
      this.particleSizes[i] = 0
    }
  }

  private getBarColor(t: number, theme: ThemeColors): THREE.Color {
    const low = new THREE.Color(theme.lowRgb[0] / 255, theme.lowRgb[1] / 255, theme.lowRgb[2] / 255)
    const mid = new THREE.Color(theme.midRgb[0] / 255, theme.midRgb[1] / 255, theme.midRgb[2] / 255)
    const high = new THREE.Color(theme.highRgb[0] / 255, theme.highRgb[1] / 255, theme.highRgb[2] / 255)

    if (t < 0.5) {
      return low.clone().lerp(mid, t * 2)
    }
    return mid.clone().lerp(high, (t - 0.5) * 2)
  }

  private emitParticle(x: number, y: number, z: number, color: THREE.Color) {
    const p = this.particles[this.nextParticleIdx]
    p.position.set(x, y, z)
    p.velocity.set(
      (Math.random() - 0.5) * 3,
      Math.random() * 4 + 2,
      (Math.random() - 0.5) * 3,
    )
    p.life = PARTICLE_LIFETIME
    p.maxLife = PARTICLE_LIFETIME
    p.color.copy(color)
    this.nextParticleIdx = (this.nextParticleIdx + 1) % PARTICLE_POOL_SIZE
  }

  update(frequencyData: Uint8Array, volume: number, beat: boolean, theme: ThemeColors, deltaTime: number = 1 / 60): void {
    const instanceColor = this.barMesh.instanceColor!

    for (let i = 0; i < BAR_COUNT; i++) {
      const angle = (i / BAR_COUNT) * Math.PI * 2
      const x = Math.cos(angle) * CIRCLE_RADIUS
      const z = Math.sin(angle) * CIRCLE_RADIUS

      const freqIdx = Math.floor((i / BAR_COUNT) * frequencyData.length)
      const amplitude = frequencyData[freqIdx] / 255
      const height = Math.max(0.01, amplitude * MAX_HEIGHT)

      const prevHeight = this.prevHeights[i]
      const jumpDelta = height - prevHeight

      this.dummy.position.set(x, 0, z)
      this.dummy.scale.set(1, height, 1)
      this.dummy.rotation.set(0, -angle, 0)
      this.dummy.updateMatrix()
      this.barMesh.setMatrixAt(i, this.dummy.matrix)

      const t = i / BAR_COUNT
      const color = this.getBarColor(t, theme)
      instanceColor.setXYZ(i, color.r, color.g, color.b)

      if (jumpDelta > 0.3) {
        const topY = height
        const emitCount = Math.min(Math.floor(jumpDelta * 3), 5)
        for (let e = 0; e < emitCount; e++) {
          this.emitParticle(x, topY, z, color)
        }
      }

      if (beat && amplitude > 0.6) {
        this.emitParticle(x, height, z, color)
      }

      this.prevHeights[i] = height
    }

    instanceColor.needsUpdate = true
    this.barMesh.instanceMatrix.needsUpdate = true

    const posAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute
    const colAttr = this.particleGeometry.getAttribute('color') as THREE.BufferAttribute
    const sizeAttr = this.particleGeometry.getAttribute('size') as THREE.BufferAttribute

    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.particles[i]

      if (p.life > 0) {
        p.life -= deltaTime
        p.velocity.y += GRAVITY * deltaTime
        p.position.add(p.velocity.clone().multiplyScalar(deltaTime))

        const lifeRatio = Math.max(0, p.life / p.maxLife)

        posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z)
        colAttr.setXYZ(i, p.color.r * lifeRatio, p.color.g * lifeRatio, p.color.b * lifeRatio)
        sizeAttr.setX(i, 0.2 * lifeRatio)
      } else {
        posAttr.setXYZ(i, 0, -100, 0)
        sizeAttr.setX(i, 0)
      }
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
  }

  dispose(): void {
    this.barMesh.geometry.dispose()
    ;(this.barMesh.material as THREE.Material).dispose()
    this.scene.remove(this.barMesh)

    this.particleGeometry.dispose()
    ;(this.particlePoints.material as THREE.Material).dispose()
    this.scene.remove(this.particlePoints)
  }
}
