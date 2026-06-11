import { create } from 'zustand'
import type { ThemeName } from '@/themes/themes'

export type VisualizationMode = 'A' | 'B' | 'C'

interface AudioState {
  isActive: boolean
  frequencyData: Uint8Array
  timeDomainData: Uint8Array
  volume: number
  beat: boolean
  dominantFrequency: number
}

interface AppState {
  mode: VisualizationMode
  sensitivity: number
  theme: ThemeName
  isFullscreen: boolean
  fps: number
  audio: AudioState
  setMode: (mode: VisualizationMode) => void
  setSensitivity: (s: number) => void
  setTheme: (t: ThemeName) => void
  setIsFullscreen: (f: boolean) => void
  setFps: (f: number) => void
  setAudio: (a: Partial<AudioState>) => void
}

export const useStore = create<AppState>((set) => ({
  mode: 'A',
  sensitivity: 1.0,
  theme: 'neon',
  isFullscreen: false,
  fps: 0,
  audio: {
    isActive: false,
    frequencyData: new Uint8Array(256),
    timeDomainData: new Uint8Array(256),
    volume: 0,
    beat: false,
    dominantFrequency: 0,
  },
  setMode: (mode) => set({ mode }),
  setSensitivity: (sensitivity) => set({ sensitivity }),
  setTheme: (theme) => set({ theme }),
  setIsFullscreen: (isFullscreen) => set({ isFullscreen }),
  setFps: (fps) => set({ fps }),
  setAudio: (a) =>
    set((state) => ({ audio: { ...state.audio, ...a } })),
}))
