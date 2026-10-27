import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import './lib/gsapSetup.ts'
import Experience from './scene/Experience.tsx'
import DevPanel from './components/ui/DevPanel.tsx'
import IntroCurtain from './components/ui/IntroCurtain.tsx'
import StoryText from './components/ui/StoryText.tsx'
import TimeBar from './components/ui/TimeBar.tsx'
import PourButton from './components/ui/PourButton.tsx'
import HarvestCounter from './components/ui/HarvestCounter.tsx'
import EndPopup from './components/ui/EndPopup.tsx'
import KeyboardAssist from './components/ui/KeyboardAssist.tsx'
import TopControls from './components/ui/TopControls.tsx'
import { useUi } from './stores/useUi.ts'
import { useCinemaControl } from './hooks/useCinemaControl.ts'
import { startSound } from './audio/director.ts'
import { BACKGROUND } from './scene/lighting.ts'

export default function App() {
  // résolution plafonnée à 2, et ramenée à 1 si l'appareil peine (bloom et grain coûtent cher en mobile)
  const [maxDpr, setMaxDpr] = useState(2)
  const cinema = useUi((s) => s.cinema)

  // son synthétisé, débloqué au premier geste
  useEffect(() => startSound(), [])
  useCinemaControl()

  return (
    <div className="relative h-full w-full">
      {/* touch-none : le pinch zoome la scène, pas la page ; pas de menu contextuel (clic droit = verser) */}
      <div className="absolute inset-0 touch-none" onContextMenu={(e) => e.preventDefault()}>
        <Canvas
          dpr={[1, maxDpr]}
          flat
          shadows="percentage"
          camera={{ fov: 30, near: 0.05, far: 50, position: [0, 1, 1.5] }}
          gl={{ antialias: true }}
        >
          <PerformanceMonitor flipflops={3} onDecline={() => setMaxDpr(1)} onIncline={() => setMaxDpr(2)} onFallback={() => setMaxDpr(1)} />
          <color attach="background" args={[BACKGROUND]} />
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        </Canvas>
      </div>

      {/* mode cinématique : un voile invisible recouvre la scène, aucun clic ni drag ne l'atteint */}
      {cinema && <div aria-hidden className="absolute inset-0 touch-none" onContextMenu={(e) => e.preventDefault()} />}

      {/* Overlay UI : transparent aux clics sauf sur les contrôles */}
      <div className="pointer-events-none absolute inset-0">
        <IntroCurtain />
        {/* l'interface du récit s'efface pendant le mode cinématique (et n'est plus atteignable) */}
        <div inert={cinema} className={`absolute inset-0 transition-opacity duration-500 ${cinema ? 'opacity-0' : ''}`}>
          <StoryText />
          <TimeBar />
          <PourButton />
          <HarvestCounter />
          <KeyboardAssist />
        </div>
        <TopControls />
        <EndPopup />
        {import.meta.env.DEV && <DevPanel />}
      </div>
    </div>
  )
}
