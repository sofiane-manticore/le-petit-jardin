import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { POT_COUNT, PLANTS_PER_POT, useGarden } from '../../stores/useGarden.ts'
import { useStrings } from '../../i18n/strings.ts'

const TOTAL = POT_COUNT * PLANTS_PER_POT

/**
 * Compteur de l'acte 4 : une case par fruit. Chaque fruit cueilli vole jusqu'à la case suivante
 * (repérée par `data-harvest-slot`), qui se remplit à son arrivée.
 */
export default function HarvestCounter() {
  const visible = useGarden((s) => s.step === 'harvest')
  const count = useGarden((s) => s.harvested.length)
  const rootRef = useRef<HTMLElement>(null)
  const t = useStrings().harvest
  const slotsRef = useRef<HTMLSpanElement[]>([])

  // entrée après le texte 4, comme la timeline à l'acte 3 ; sortie avec le dernier fruit
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const tween = visible
      ? gsap.fromTo(el, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9, delay: 2.4, ease: 'rise' })
      : gsap.to(el, { autoAlpha: 0, y: 14, duration: 0.5, delay: 0.4, ease: 'power2.in' })
    return () => void tween.kill()
  }, [visible])

  // la case qui vient de recevoir son fruit rebondit
  useEffect(() => {
    const slot = slotsRef.current[count - 1]
    if (!slot) return
    const tween = gsap.fromTo(slot, { scale: 1.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' })
    return () => void tween.kill()
  }, [count])

  return (
    <section
      ref={rootRef}
      aria-label={t.section}
      inert={!visible}
      className="invisible absolute bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-cream py-2 pl-4 pr-4 opacity-0 shadow-sm"
    >
      <p aria-live="polite" className="m-0 whitespace-nowrap text-[11px] font-bold tabular-nums leading-none text-accent">
        <span className="sr-only">{t.sr(count, TOTAL)}</span>
        <span aria-hidden>
          {count}
          <span className="font-semibold text-label">/{TOTAL}</span>
        </span>
      </p>
      <span aria-hidden className="flex gap-1.5">
        {Array.from({ length: TOTAL }, (_, i) => (
          <span
            key={i}
            data-harvest-slot={i}
            ref={(el) => {
              if (el) slotsRef.current[i] = el
            }}
            className={`size-2.5 rounded-full border-[1.5px] transition-colors duration-200 ${
              i < count ? 'border-progress bg-progress' : 'border-track bg-transparent'
            }`}
          />
        ))}
      </span>
    </section>
  )
}
