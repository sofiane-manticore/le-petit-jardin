import { useGarden } from '../../stores/useGarden.ts'
import { pickNextFruit } from '../../scene/harvest.ts'
import { useStrings } from '../../i18n/strings.ts'

/**
 * Accessibilité clavier de base : le drag des tas de graines, le drag de l'arrosoir et le clic
 * sur les fruits n'ont pas d'équivalent au clavier. Ce bouton, caché tant qu'il n'a pas le focus
 * (premier arrêt de Tab), fait l'action de l'acte en cours sur le pot ou le fruit suivant, avec
 * les mêmes animations qu'à la souris. L'acte 3 a déjà son bouton « maintenir » accessible.
 */
export default function KeyboardAssist() {
  const step = useGarden((s) => s.step)
  const t = useStrings().keyboard

  const action =
    step === 'sow'
      ? {
          label: t.sow,
          run: () => {
            const pot = useGarden.getState().pots.findIndex((p) => !p.seeded)
            if (pot >= 0) useGarden.getState().seedPot(pot)
          },
        }
      : step === 'water'
        ? {
            label: t.water,
            run: () => {
              const pot = useGarden.getState().pots.findIndex((p) => !p.watered)
              if (pot >= 0) useGarden.getState().waterPot(pot)
            },
          }
        : step === 'harvest'
          ? { label: t.harvest, run: () => void pickNextFruit() }
          : null

  if (!action) return null

  return (
    <button
      type="button"
      onClick={action.run}
      className="pointer-events-auto sr-only z-30 rounded-full bg-accent px-4 py-2 text-sm font-bold text-cream-light shadow-sm focus:not-sr-only focus:absolute focus:px-4 focus:py-2 focus:whitespace-nowrap focus:left-1/2 focus:top-[calc(100%-110px)] focus:-translate-x-1/2"
    >
      {action.label}
    </button>
  )
}
