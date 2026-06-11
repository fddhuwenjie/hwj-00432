import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer'
import { FrequencyBars } from '@/visualizations/FrequencyBars'
import { WaveformSphere } from '@/visualizations/WaveformSphere'
import { ParticleNebula } from '@/visualizations/ParticleNebula'
import { PostProcessing } from '@/visualizations/PostProcessing'
import { themes } from '@/themes/themes'
import type { ThemeColors } from '@/themes/themes'

type VisualizationInstance = FrequencyBars | WaveformSphere | ParticleNebula

export default function VisualizerCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const currentVizRef = useRef<VisualizationInstance | null>(null)
  const postProcessingRef = useRef<PostProcessing | null>(null)
  const animFrameRef = useRef<number>(0)
  const cameraBasePos = useRef(new THREE.Vector3(0, 5, 12))
  const cameraShakeOffset = useRef(new THREE.Vector3())
  const bgHue = useRef(0)
  const prevBeatRef = useRef(false)
  const lastTimeRef = useRef(performance.now())
  const fpsFrames = useRef(0)
  const fpsTime = useRef(0)

  const mode = useStore((s) => s.mode)
  const theme = useStore((s) => s.theme)
  const setFps = useStore((s) => s.setFps)
  const audio = useStore((s) => s.audio)

  const { analyze } = useAudioAnalyzer()

  const createVisualization = (scene: THREE.Scene, renderer: THREE.WebGLRenderer, modeStr: string, themeColors: ThemeColors): VisualizationInstance => {
    switch (modeStr) {
      case 'A':
        return new FrequencyBars(scene, themeColors)
      case 'B':
        return new WaveformSphere(scene, renderer, themeColors)
      case 'C':
        return new ParticleNebula(scene, themeColors)
      default:
        return new FrequencyBars(scene, themeColors)
    }
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(themes[theme].background)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.copy(cameraBasePos.current)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0x222244, 0.5)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0xffffff, 1, 50)
    pointLight.position.set(5, 10, 5)
    scene.add(pointLight)

    const pointLight2 = new THREE.PointLight(0x4488ff, 0.8, 50)
    pointLight2.position.set(-5, 5, -5)
    scene.add(pointLight2)

    const themeColors = themes[theme]
    const viz = createVisualization(scene, renderer, mode, themeColors)
    currentVizRef.current = viz

    const postProc = new PostProcessing(renderer, scene, camera)
    postProcessingRef.current = postProc

    const onResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      postProc.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)

      const now = performance.now()
      const deltaTime = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now

      fpsFrames.current++
      fpsTime.current += deltaTime
      if (fpsTime.current >= 1) {
        setFps(Math.round(fpsFrames.current / fpsTime.current))
        fpsFrames.current = 0
        fpsTime.current = 0
      }

      analyze()

      const currentAudio = useStore.getState().audio
      const currentTheme = themes[useStore.getState().theme]
      const currentMode = useStore.getState().mode

      if (currentVizRef.current) {
        const viz = currentVizRef.current
        if (viz instanceof FrequencyBars) {
          viz.update(currentAudio.frequencyData, currentAudio.volume, currentAudio.beat, currentTheme, deltaTime)
        } else if (viz instanceof WaveformSphere) {
          viz.update(currentAudio.timeDomainData, currentAudio.volume, currentAudio.beat, currentTheme)
        } else if (viz instanceof ParticleNebula) {
          viz.update(currentAudio.frequencyData, currentAudio.volume, currentAudio.beat, currentTheme)
        }
      }

      if (currentAudio.beat && !prevBeatRef.current) {
        cameraShakeOffset.current.set(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.3,
        )
      }
      prevBeatRef.current = currentAudio.beat

      cameraShakeOffset.current.multiplyScalar(0.92)
      camera.position.copy(cameraBasePos.current).add(cameraShakeOffset.current)
      camera.lookAt(0, 0, 0)

      bgHue.current += currentAudio.dominantFrequency * 0.001
      if (bgHue.current > 1) bgHue.current -= 1
      const bgColor = new THREE.Color().setHSL(bgHue.current, 0.15, 0.02 + currentAudio.volume * 0.03)
      scene.background = bgColor

      postProc.update(currentAudio.volume, currentAudio.beat, deltaTime)
      postProc.render()
    }

    animate()

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(animFrameRef.current)
      currentVizRef.current?.dispose()
      postProc.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    const renderer = rendererRef.current
    if (!scene || !renderer) return

    if (currentVizRef.current) {
      currentVizRef.current.dispose()
      currentVizRef.current = null
    }

    const themeColors = themes[theme]
    const viz = createVisualization(scene, renderer, mode, themeColors)
    currentVizRef.current = viz
  }, [mode, theme])

  return (
    <div ref={containerRef} className="fixed inset-0 z-0" />
  )
}
