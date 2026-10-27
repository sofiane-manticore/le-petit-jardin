import gsap from 'gsap'
import { installEngine } from './engine.ts'
import { tickAmbience } from './ambience.ts'
import { dayTick, finale, fruitArrive, sow, watered } from './sfx.ts'
import { DAYS_TO_GROW, useGarden } from '../stores/useGarden.ts'
import { useSound } from '../stores/useSound.ts'
import { OPEN_DELAY } from '../scene/harvest.ts'

/** Les cibles de saisie gardent leurs touches */
const isField = (t: EventTarget | null) => t instanceof HTMLElement && t.closest('input, select, textarea') !== null

/**
 * Branche le son sur l'expérience. Les étapes réussies sont lues dans le store, donc les sons
 * suivent aussi bien la souris que le bouton clavier ou le panneau dev. Renvoie le nettoyage.
 */
export function startSound() {
  const stopEngine = installEngine()
  gsap.ticker.add(tickAmbience)

  const unsubscribe = useGarden.subscribe((s, prev) => {
    s.pots.forEach((p, i) => {
      const q = prev.pots[i]
      if (p.seeded && !q.seeded) sow(i)
      if (p.watered && !q.watered) watered(i)
    })
    // le 15e lever passe à l'acte 4 : ce sont les fruits qui sonnent, pas une note de jour
    if (s.step === 'wait' && s.day > prev.day && s.day < DAYS_TO_GROW) dayTick(s.day)
    if (s.harvested.length > prev.harvested.length) fruitArrive(s.harvested.length)
    // l'arpège accompagne la carte du popup, qui monte 0,15 s après l'ouverture
    if (s.step === 'end' && prev.step !== 'end') finale(OPEN_DELAY + 0.15)
  })

  // touche M : couper ou remettre le son
  const onKey = (e: KeyboardEvent) => {
    if (e.code !== 'KeyM' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || isField(e.target)) return
    useSound.getState().toggleMuted()
  }
  window.addEventListener('keydown', onKey)

  return () => {
    stopEngine()
    gsap.ticker.remove(tickAmbience)
    unsubscribe()
    window.removeEventListener('keydown', onKey)
  }
}
