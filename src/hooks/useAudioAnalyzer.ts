import { useRef, useCallback } from 'react'
import { useStore } from '@/store/useStore'

export function useAudioAnalyzer() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const volumeHistoryRef = useRef<number[]>([])
  const setAudio = useStore((s) => s.setAudio)
  const sensitivity = useStore((s) => s.sensitivity)

  const initContext = useCallback(() => {
    if (!audioContextRef.current) {
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.8
      analyser.connect(ctx.destination)
      audioContextRef.current = ctx
      analyserRef.current = analyser
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
  }, [])

  const loadFile = useCallback(
    async (file: File) => {
      initContext()
      const ctx = audioContextRef.current!
      const analyser = analyserRef.current!

      if (sourceRef.current) {
        sourceRef.current.disconnect()
        sourceRef.current = null
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause()
        audioElementRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      const audio = new Audio()
      audio.crossOrigin = 'anonymous'
      audio.src = URL.createObjectURL(file)
      audioElementRef.current = audio

      const source = ctx.createMediaElementSource(audio)
      source.connect(analyser)
      analyser.connect(ctx.destination)
      sourceRef.current = source

      await audio.play()
      setAudio({ isActive: true })
    },
    [initContext, setAudio],
  )

  const startMicrophone = useCallback(async () => {
    initContext()
    const ctx = audioContextRef.current!
    const analyser = analyserRef.current!

    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    const source = ctx.createMediaStreamSource(stream)
    source.connect(analyser)
    sourceRef.current = source
    analyser.disconnect()
    setAudio({ isActive: true })
  }, [initContext, setAudio])

  const analyze = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return

    const freqData = new Uint8Array(analyser.frequencyBinCount)
    const timeData = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(freqData)
    analyser.getByteTimeDomainData(timeData)

    const scaledFreq = new Uint8Array(256)
    for (let i = 0; i < 256; i++) {
      scaledFreq[i] = Math.min(255, Math.round(freqData[i] * sensitivity))
    }

    let sum = 0
    let maxVal = 0
    let maxIdx = 0
    for (let i = 0; i < scaledFreq.length; i++) {
      sum += scaledFreq[i]
      if (scaledFreq[i] > maxVal) {
        maxVal = scaledFreq[i]
        maxIdx = i
      }
    }
    const volume = sum / scaledFreq.length / 255
    const dominantFrequency = maxIdx / scaledFreq.length

    const history = volumeHistoryRef.current
    history.push(volume)
    if (history.length > 30) history.shift()
    const avgVolume = history.reduce((a, b) => a + b, 0) / history.length
    const beat = volume > avgVolume * 1.5 && volume > 0.15

    setAudio({
      frequencyData: scaledFreq,
      timeDomainData: timeData,
      volume,
      beat,
      dominantFrequency,
    })
  }, [sensitivity, setAudio])

  const cleanup = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
      analyserRef.current = null
    }
  }, [])

  return { loadFile, startMicrophone, analyze, cleanup }
}
