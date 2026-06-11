import * as THREE from 'three'
import type { ThemeColors } from '@/themes/themes'

export class WaveformSphere {
  private mesh: THREE.Mesh
  private geometry: THREE.IcosahedronGeometry
  private material: THREE.MeshStandardMaterial
  private originalPositions: Float32Array
  private normals: Float32Array
  private envMap: THREE.Texture | null = null
  private rotationSpeed = 0.002

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, theme: ThemeColors) {
    this.geometry = new THREE.IcosahedronGeometry(3, 4)

    this.originalPositions = new Float32Array(this.geometry.attributes.position.array)
    this.normals = new Float32Array(this.geometry.attributes.normal.array)

    this.material = new THREE.MeshStandardMaterial({
      metalness: 0.8,
      roughness: 0.2,
      color: new THREE.Color(theme.low),
      emissive: new THREE.Color(theme.lowRgb[0] / 255, theme.lowRgb[1] / 255, theme.lowRgb[2] / 255),
      emissiveIntensity: 0.3,
    })

    this.mesh = new THREE.Mesh(this.geometry, this.material)
    scene.add(this.mesh)

    this.createEnvMap(renderer)
  }

  private createEnvMap(renderer: THREE.WebGLRenderer): void {
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    pmremGenerator.compileEquirectangularShader()

    const envScene = new THREE.Scene()

    const light1 = new THREE.PointLight(0xff4400, 80, 50)
    light1.position.set(10, 10, 10)
    envScene.add(light1)

    const light2 = new THREE.PointLight(0x0044ff, 80, 50)
    light2.position.set(-10, -10, 10)
    envScene.add(light2)

    const light3 = new THREE.PointLight(0x00ff88, 80, 50)
    light3.position.set(0, 10, -10)
    envScene.add(light3)

    const ambient = new THREE.AmbientLight(0x222222, 1)
    envScene.add(ambient)

    const renderTarget = pmremGenerator.fromScene(envScene, 0.04)
    this.envMap = renderTarget.texture
    this.material.envMap = this.envMap
    this.material.needsUpdate = true

    pmremGenerator.dispose()
    light1.dispose()
    light2.dispose()
    light3.dispose()
  }

  update(timeDomainData: Uint8Array, volume: number, beat: boolean, theme: ThemeColors): void {
    this.mesh.rotation.y += this.rotationSpeed
    this.mesh.rotation.x += this.rotationSpeed * 0.3

    const positions = this.geometry.attributes.position.array as Float32Array
    const vertexCount = positions.length / 3

    for (let i = 0; i < vertexCount; i++) {
      const nx = this.normals[i * 3]
      const ny = this.normals[i * 3 + 1]
      const nz = this.normals[i * 3 + 2]

      const dataIndex = Math.floor((i / vertexCount) * timeDomainData.length)
      const sample = timeDomainData[dataIndex] / 255

      const displacement = (sample - 0.5) * 1.5

      positions[i * 3] = this.originalPositions[i * 3] + nx * displacement
      positions[i * 3 + 1] = this.originalPositions[i * 3 + 1] + ny * displacement
      positions[i * 3 + 2] = this.originalPositions[i * 3 + 2] + nz * displacement
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.computeVertexNormals()

    const clampedVolume = Math.min(1, Math.max(0, volume))

    const lowColor = new THREE.Color(theme.lowRgb[0] / 255, theme.lowRgb[1] / 255, theme.lowRgb[2] / 255)
    const accentColor = new THREE.Color(theme.accentRgb[0] / 255, theme.accentRgb[1] / 255, theme.accentRgb[2] / 255)

    const baseColor = lowColor.clone().lerp(accentColor, clampedVolume)
    this.material.color.copy(baseColor)

    if (clampedVolume < 0.33) {
      this.material.emissive.setRGB(
        theme.lowRgb[0] / 255,
        theme.lowRgb[1] / 255,
        theme.lowRgb[2] / 255,
      )
    } else if (clampedVolume < 0.66) {
      this.material.emissive.setRGB(
        theme.midRgb[0] / 255,
        theme.midRgb[1] / 255,
        theme.midRgb[2] / 255,
      )
    } else {
      this.material.emissive.setRGB(
        theme.highRgb[0] / 255,
        theme.highRgb[1] / 255,
        theme.highRgb[2] / 255,
      )
    }

    this.material.emissiveIntensity = 0.1 + clampedVolume * 1.5

    if (beat) {
      this.material.emissiveIntensity = 3.0
    }
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    if (this.envMap) {
      this.envMap.dispose()
    }
    this.mesh.parent?.remove(this.mesh)
  }
}
