import { useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import gsap from 'gsap'
import type { Group } from 'three'
import { Hand, HandGrab } from 'lucide-react'
import { POTS, SEED_LIFT, SEED_PILES, SOIL_HEIGHT } from '../../scene/layout.ts'
import { availablePile } from '../../scene/pileRegistry.ts'
import { REDUCED_MOTION } from '../../lib/gsapSetup.ts'
import { useGarden } from '../../stores/useGarden.ts'
import { useUi } from '../../stores/useUi.ts'

/**
 * Sans geste depuis ce délai (ms) pendant l'acte 1, une main montre le drag d'un tas vers un pot.
 * Bien avant les 20 s du mode cinématique, qui la masque ; au réveil, le délai repart de zéro.
 */
const HINT_DELAY = 5000
/** La main flotte un peu au-dessus de ce qu'elle tient */
const HAND_Y = 0.035

/**
 * Indice de l'acte 1 : une main ouverte se pose sur un tas encore à prendre, se referme, le
 * glisse jusqu'à un pot libre et se rouvre. Elle s'efface dès qu'un tas est saisi ; chaque tas
 * semé relance le délai.
 */
export default function SowHint() {
  const step = useGarden((s) => s.step)
  const seeded = useGarden((s) => s.pots.filter((p) => p.seeded).length)
  const seedHeld = useUi((s) => s.seedHeld)
  const cinema = useUi((s) => s.cinema)
  /** Le délai s'est écoulé sans geste */
  const [idle, setIdle] = useState(false)

  const group = useRef<Group>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const open = useRef<HTMLDivElement>(null)
  const grab = useRef<HTMLDivElement>(null)

  const active = step === 'sow' && !seedHeld && !cinema

  // le délai repart à chaque changement : tas saisi ou relâché, pot semé, mode cinématique
  useEffect(() => {
    if (!active) return
    const id = window.setTimeout(() => setIdle(true), HINT_DELAY)
    return () => {
      window.clearTimeout(id)
      setIdle(false)
    }
  }, [active, seeded])

  const show = active && idle

  useEffect(() => {
    const g = group.current
    const w = wrap.current
    if (!show || !g || !w || !open.current || !grab.current) return
    let tl: gsap.core.Timeline | null = null

    // un cycle : tas et pot choisis à nouveau à chaque fois (un tas a pu partir entre-temps)
    const cycle = () => {
      const pile = availablePile()
      const pot = useGarden.getState().pots.findIndex((p) => !p.seeded)
      if (pile < 0 || pot < 0) return
      const [px, , pz] = SEED_PILES[pile]
      const [tx, , tz] = POTS[pot].position
      g.position.set(px, HAND_Y + 0.02, pz)
      tl = gsap
        .timeline({ onComplete: cycle })
        .set(open.current, { opacity: 1, scale: 1 })
        .set(grab.current, { opacity: 0, scale: 1 })
        .to(w, { opacity: 1, duration: 0.3, ease: 'power1.out' })
        .to(g.position, { y: HAND_Y, duration: 0.3, ease: 'power2.out' }, '<')
        // la main se referme sur le tas
        .to(open.current, { opacity: 0, scale: 0.9, duration: 0.18 }, '+=0.15')
        .to(grab.current, { opacity: 1, scale: 0.9, duration: 0.18 }, '<')
      if (!REDUCED_MOTION) {
        // levée, glissé jusqu'au pot, puis posée sur la terre
        tl.to(g.position, { x: tx, z: tz, duration: 1.1, ease: 'power2.inOut' }, '+=0.1')
          .to(g.position, { y: SEED_LIFT + HAND_Y * 0.5, duration: 0.45, ease: 'sine.out' }, '<')
          .to(g.position, { y: SOIL_HEIGHT + HAND_Y, duration: 0.55, ease: 'sine.in' }, '>')
      }
      // la main se rouvre : les graines sont lâchées
      tl.to(grab.current, { opacity: 0, scale: 1, duration: 0.18 }, '+=0.1')
        .to(open.current, { opacity: 1, scale: 1, duration: 0.18 }, '<')
        .to(w, { opacity: 0, duration: 0.35, ease: 'power1.in' }, '+=0.25')
        .to({}, { duration: 0.6 })
    }
    cycle()

    return () => {
      tl?.kill()
      gsap.to(w, { opacity: 0, duration: 0.2, overwrite: true })
    }
  }, [show])

  return (
    <group ref={group}>
      <Html center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
        <div
          ref={wrap}
          aria-hidden
          className="relative h-11 w-11 select-none rounded-full bg-cream/95 text-accent shadow-sm"
          style={{ opacity: 0 }}
        >
          <div ref={open} className="absolute inset-0 grid place-items-center">
            <Hand size={26} strokeWidth={2.25} />
          </div>
          <div ref={grab} className="absolute inset-0 grid place-items-center" style={{ opacity: 0 }}>
            <HandGrab size={26} strokeWidth={2.25} />
          </div>
        </div>
      </Html>
    </group>
  )
}
