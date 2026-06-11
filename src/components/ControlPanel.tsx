import { useStore } from '@/store/useStore'
import type { VisualizationMode } from '@/store/useStore'
import type { ThemeName } from '@/themes/themes'
import { Maximize, Minimize } from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'

const MODES: { key: VisualizationMode; label: string }[] = [
  { key: 'A', label: '频率柱状' },
  { key: 'B', label: '波形球体' },
  { key: 'C', label: '粒子星云' },
]

const THEMES: { key: ThemeName; label: string; color: string }[] = [
  { key: 'neon', label: '霓虹', color: '#ff00ff' },
  { key: 'aurora', label: '极光', color: '#88ffdd' },
  { key: 'flame', label: '火焰', color: '#ff4400' },
  { key: 'ocean', label: '海洋', color: '#00bbff' },
]

export default function ControlPanel() {
  const mode = useStore((s) => s.mode)
  const sensitivity = useStore((s) => s.sensitivity)
  const theme = useStore((s) => s.theme)
  const fps = useStore((s) => s.fps)
  const setMode = useStore((s) => s.setMode)
  const setSensitivity = useStore((s) => s.setSensitivity)
  const setTheme = useStore((s) => s.setTheme)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  return (
    <div className="fixed bottom-5 left-5 z-30">
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="w-10 h-10 rounded-lg bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
        >
          ▸
        </button>
      ) : (
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 p-4 min-w-[260px] shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/30 font-mono">
              控制面板
            </span>
            <button
              onClick={() => setCollapsed(true)}
              className="text-white/30 hover:text-white/60 transition-colors text-xs"
            >
              ▾
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-white/25 uppercase tracking-wider block mb-2">
                可视化模式
              </label>
              <div className="flex gap-1.5">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    className={`
                      flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                      ${mode === m.key
                        ? 'bg-white/15 text-white shadow-[0_0_12px_rgba(255,255,255,0.1)]'
                        : 'bg-white/5 text-white/35 hover:bg-white/10 hover:text-white/60'
                      }
                    `}
                  >
                    {m.key}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-white/20 mt-1">
                {MODES.find((m) => m.key === mode)?.label}
              </p>
            </div>

            <div>
              <label className="text-[10px] text-white/25 uppercase tracking-wider block mb-2">
                灵敏度 {sensitivity.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="w-full h-1 rounded-full appearance-none bg-white/10 accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] text-white/25 uppercase tracking-wider block mb-2">
                配色主题
              </label>
              <div className="flex gap-1.5">
                {THEMES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTheme(t.key)}
                    className={`
                      flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200
                      ${theme === t.key
                        ? 'bg-white/15 text-white'
                        : 'bg-white/5 text-white/35 hover:bg-white/10 hover:text-white/60'
                      }
                    `}
                    style={theme === t.key ? { boxShadow: `0 0 12px ${t.color}40` } : {}}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/20 font-mono">
                  {fps} FPS
                </span>
              </div>
              <button
                onClick={toggleFullscreen}
                className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-all"
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
