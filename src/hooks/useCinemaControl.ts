import { useEffect } from 'react'
import { useGarden } from '../stores/useGarden.ts'
import { useUi } from '../stores/useUi.ts'

/** Inactivité avant que le mode cinématique se lance tout seul (ms) */
const IDLE_DELAY = 20_000

/** Touches qui restent actives en mode cinématique lancé à la main : le quitter, couper le son */
const CINEMA_KEYS = new Set(['KeyC', 'Escape', 'KeyM'])

const isField = (t: EventTarget | null) => t instanceof HTMLElement && t.closest('input, select, textarea') !== null
/** Le mode cinématique n'a de sens que pendant les actes, pas sur l'intro ni sur l'écran de fin */
const canFilm = () => !['intro', 'end'].includes(useGarden.getState().step)

/**
 * Règles du mode cinématique :
 * - aucune action de jeu pendant le mode (les touches sont bloquées, le canvas est recouvert) ;
 * - C le lance ou le quitte, Échap le quitte ;
 * - après 20 s sans aucun geste, il se lance tout seul, et le moindre geste le quitte alors,
 *   sans déclencher d'action (le geste qui réveille est avalé).
 */
export function useCinemaControl() {
  useEffect(() => {
    let lastActivity = performance.now()
    /** Doigts, boutons de souris et touches enfoncés : on n'est pas inactif en maintenant */
    const pressed = new Set<string>()
    /** Le clic qui suit le geste de réveil ne doit rien déclencher */
    let swallowClickUntil = 0

    /** Quitte le mode lancé par l'inactivité ; renvoie vrai si le geste a servi à ça */
    const wake = (e: Event) => {
      const ui = useUi.getState()
      if (!ui.cinema || !ui.cinemaAuto) return false
      ui.setCinema(false)
      e.preventDefault()
      e.stopPropagation()
      swallowClickUntil = performance.now() + 600
      return true
    }

    const onPointerDown = (e: PointerEvent) => {
      lastActivity = performance.now()
      pressed.add(`p${e.pointerId}`)
      wake(e)
    }
    const onPointerUp = (e: PointerEvent) => {
      lastActivity = performance.now()
      pressed.delete(`p${e.pointerId}`)
    }
    const onMove = (e: Event) => {
      lastActivity = performance.now()
      wake(e)
    }
    const onClick = (e: MouseEvent) => {
      if (performance.now() < swallowClickUntil) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      lastActivity = performance.now()
      pressed.add(e.code)
      if (wake(e)) return
      const ui = useUi.getState()
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isField(e.target)) {
        if (ui.cinema) e.stopPropagation()
        return
      }
      if (e.code === 'KeyC' && canFilm()) ui.setCinema(!ui.cinema)
      else if (e.code === 'Escape' && ui.cinema) ui.setCinema(false)
      // mode lancé à la main : seules les touches du mode passent, le reste ne touche pas au jeu
      if (ui.cinema && !CINEMA_KEYS.has(e.code)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      lastActivity = performance.now()
      pressed.delete(e.code)
    }
    const onBlur = () => pressed.clear()

    // capture sur window : ces écouteurs passent avant tous ceux du jeu et peuvent les court-circuiter
    const opts = { capture: true }
    window.addEventListener('pointerdown', onPointerDown, opts)
    window.addEventListener('pointerup', onPointerUp, opts)
    window.addEventListener('pointercancel', onPointerUp, opts)
    window.addEventListener('pointermove', onMove, opts)
    window.addEventListener('wheel', onMove, opts)
    window.addEventListener('click', onClick, opts)
    window.addEventListener('keydown', onKeyDown, opts)
    window.addEventListener('keyup', onKeyUp, opts)
    window.addEventListener('blur', onBlur)

    const timer = window.setInterval(() => {
      const ui = useUi.getState()
      if (ui.cinema || pressed.size || document.hidden || !canFilm()) {
        if (ui.cinema || pressed.size) lastActivity = performance.now()
        return
      }
      if (performance.now() - lastActivity > IDLE_DELAY) ui.setCinema(true, true)
    }, 500)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, opts)
      window.removeEventListener('pointerup', onPointerUp, opts)
      window.removeEventListener('pointercancel', onPointerUp, opts)
      window.removeEventListener('pointermove', onMove, opts)
      window.removeEventListener('wheel', onMove, opts)
      window.removeEventListener('click', onClick, opts)
      window.removeEventListener('keydown', onKeyDown, opts)
      window.removeEventListener('keyup', onKeyUp, opts)
      window.removeEventListener('blur', onBlur)
      window.clearInterval(timer)
    }
  }, [])
}
