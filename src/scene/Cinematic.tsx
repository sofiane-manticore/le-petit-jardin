import { useEffect } from 'react'
import gsap from 'gsap'
import { buildShots, orbitPoint, shot } from './cinema.ts'
import { useUi } from '../stores/useUi.ts'

/** Durée d'un plan (s) */
const SHOT_DURATION = 4.2

/**
 * Pilote du mode cinématique : enchaîne les plans de cinema.ts (coupe franche entre deux plans,
 * travelling linéaire pendant chacun) tant que le mode est actif. CameraRig et PostFX lisent `shot`.
 */
export default function Cinematic() {
  const active = useUi((s) => s.cinema)

  useEffect(() => {
    if (!active) return
    let tl: gsap.core.Timeline | null = null
    let queue = buildShots()

    const next = () => {
      // la liste est refaite à chaque tour : les plans suivent la pousse
      if (!queue.length) queue = buildShots()
      const s = queue.shift()!
      const p = { ...s.from }
      const place = () => orbitPoint(s.look, p.azimuth, p.elevation, p.distance, shot.position)
      shot.look.copy(s.look)
      shot.focus.copy(s.look)
      place()
      // travelling à vitesse constante, sans accélération ni ralenti
      tl = gsap.timeline({ onComplete: next }).to(p, { ...s.to, duration: SHOT_DURATION, ease: 'none', onUpdate: place })
    }
    next()

    return () => void tl?.kill()
  }, [active])

  return null
}
