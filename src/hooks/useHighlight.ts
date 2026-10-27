import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import type { Object3D } from 'three'
import { REDUCED_MOTION } from '../lib/gsapSetup.ts'

/** Gonflement d'un objet mis en valeur (pot visé par un drag…) */
const HIGHLIGHT_SCALE = 1.08

/**
 * Met en valeur un objet 3D tant que `active` est vrai : il gonfle légèrement avec un petit
 * dépassement, puis revient à sa taille au relâché. L'échelle part de l'origine de l'objet (le
 * fond du pot), il grandit donc vers le haut.
 */
export function useHighlight(object: Object3D | null, active: boolean) {
  const tween = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    if (!object) return
    tween.current?.kill()
    const s = active ? HIGHLIGHT_SCALE : 1
    tween.current = gsap.to(object.scale, {
      x: s,
      y: s,
      z: s,
      duration: REDUCED_MOTION ? 0.15 : active ? 0.35 : 0.3,
      ease: active ? 'back.out(3)' : 'power2.out',
    })
  }, [object, active])

  useEffect(() => () => void tween.current?.kill(), [])
}
