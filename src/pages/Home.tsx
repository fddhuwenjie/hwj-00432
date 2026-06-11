import { useState } from 'react'
import VisualizerCanvas from '@/components/VisualizerCanvas'
import ControlPanel from '@/components/ControlPanel'
import DragUpload from '@/components/DragUpload'

export default function Home() {
  const [audioActive, setAudioActive] = useState(false)

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0a0a0f]">
      <VisualizerCanvas />
      <ControlPanel />
      {!audioActive && <DragUpload onFileLoaded={() => setAudioActive(true)} />}
    </div>
  )
}
