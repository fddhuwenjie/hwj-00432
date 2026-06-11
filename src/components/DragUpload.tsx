import { useState, useCallback } from 'react'
import { Upload, Mic } from 'lucide-react'
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer'

interface DragUploadProps {
  onFileLoaded?: () => void
}

export default function DragUpload({ onFileLoaded }: DragUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const { loadFile, startMicrophone } = useAudioAnalyzer()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('audio/')) {
        await loadFile(file)
        onFileLoaded?.()
      }
    },
    [loadFile, onFileLoaded],
  )

  const handleMicClick = useCallback(async () => {
    try {
      await startMicrophone()
      onFileLoaded?.()
    } catch (err) {
      console.error('Microphone access denied:', err)
    }
  }, [startMicrophone, onFileLoaded])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        await loadFile(file)
        onFileLoaded?.()
      }
    },
    [loadFile, onFileLoaded],
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        fixed inset-0 z-20 flex items-center justify-center pointer-events-none
        transition-all duration-300
        ${isDragging ? 'bg-black/40' : ''}
      `}
    >
      <div
        className={`
          flex flex-col items-center gap-6 transition-all duration-300
          ${isDragging ? 'scale-110' : ''}
        `}
      >
        <div
          className={`
            w-64 h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3
            transition-all duration-300 pointer-events-auto cursor-pointer
            ${isDragging
              ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_30px_rgba(0,255,255,0.3)]'
              : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
            }
          `}
          onClick={() => document.getElementById('audio-file-input')?.click()}
        >
          <Upload className={`w-8 h-8 ${isDragging ? 'text-cyan-400' : 'text-white/40'}`} />
          <p className={`text-sm ${isDragging ? 'text-cyan-400' : 'text-white/40'}`}>
            拖拽音频文件到此处
          </p>
          <p className="text-xs text-white/20">支持 MP3 / WAV / OGG / FLAC</p>
        </div>

        <button
          onClick={handleMicClick}
          className="
            flex items-center gap-2 px-5 py-2.5 rounded-full
            bg-white/5 border border-white/15
            text-white/50 text-sm
            hover:bg-white/10 hover:text-white/70 hover:border-white/30
            transition-all duration-200 pointer-events-auto
          "
        >
          <Mic className="w-4 h-4" />
          使用麦克风
        </button>

        <input
          id="audio-file-input"
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  )
}
