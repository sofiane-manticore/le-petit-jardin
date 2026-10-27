import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Droplets } from 'lucide-react'
import { COARSE_POINTER } from '../../lib/device.ts'
import { useGarden } from '../../stores/useGarden.ts'
import { useUi } from '../../stores/useUi.ts'
import { useStrings } from '../../i18n/strings.ts'

/** Les cibles de saisie (DevPanel, boutons…) gardent la touche Espace pour elles */
const isControl = (t: EventTarget | null) => t instanceof HTMLElement && t.closest('button, input, select, textarea') !== null

/**
 * Commandes de versement de l'acte 2.
 * - Desktop : clic droit maintenu sur la scène (le menu contextuel est coupé sur le canvas), ou
 *   Espace maintenu pour les trackpads. Le bouton droit est lu dans `buttons` des Pointer Events :
 *   pendant le drag (gauche enfoncé), son appui n'émet pas de pointerdown mais un pointermove.
 * - Mobile : un bouton « verser » à maintenir, de l'autre main pendant que le doigt tient l'arrosoir.
 */
export default function PourButton() {
  const active = useGarden((s) => s.step === 'water')
  const pressed = useUi((s) => s.pourSources.includes('button'))
  const rootRef = useRef<HTMLDivElement>(null)
  const t = useStrings().pour

  useEffect(() => {
    if (!active) return
    const { setPour, stopPour } = useUi.getState()

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const right = (e.buttons & 2) !== 0
      // l'appui commence sur la scène ; le relâché compte où qu'il ait lieu
      if (right && e.type !== 'pointermove' && !(e.target instanceof HTMLCanvasElement)) return
      if (right && e.type === 'pointermove' && !useUi.getState().pourSources.includes('mouse') && !useUi.getState().canHeld) return
      setPour('mouse', right)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isControl(e.target)) return
      e.preventDefault()
      if (!e.repeat) setPour('key', true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setPour('key', false)
    }

    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('pointermove', onPointer)
    window.addEventListener('pointerup', onPointer)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', stopPour)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerup', onPointer)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', stopPour)
      stopPour()
    }
  }, [active])

  // entrée après le texte 2, comme la timeline à l'acte 3
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const tween = active
      ? gsap.fromTo(el, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9, delay: 2.4, ease: 'rise' })
      : gsap.to(el, { autoAlpha: 0, y: 14, duration: 0.5, ease: 'power2.in' })
    return () => void tween.kill()
  }, [active])

  if (!COARSE_POINTER) return null

  const release = () => useUi.getState().setPour('button', false)

  return (
    <div ref={rootRef} inert={!active} className="invisible absolute bottom-12 left-1/2 -translate-x-1/2 opacity-0">
      <button
        type="button"
        aria-label={t.aria}
        aria-pressed={pressed}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          useUi.getState().setPour('button', true)
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        onContextMenu={(e) => e.preventDefault()}
        className={`pointer-events-auto flex h-11 touch-none select-none items-center gap-2 rounded-full border-[1.5px] border-accent px-5 text-[15px] font-bold shadow-sm transition-[background-color,color,transform] duration-150 ${
          pressed ? 'scale-110 bg-accent text-cream-light' : 'bg-cream text-accent'
        }`}
      >
        <Droplets aria-hidden size={18} strokeWidth={2.25} />
        {t.label}
      </button>
    </div>
  )
}
