import { create } from 'zustand'

export const STEPS = ['intro', 'sow', 'water', 'wait', 'harvest', 'end'] as const
export type Step = (typeof STEPS)[number]

export const POT_COUNT = 4
export const PLANTS_PER_POT = 2
export const DAYS_TO_GROW = 15

// Cycle d'une journée : lever 06:00 (360) → coucher 20:00 (1200) → nuit → lever suivant (1800).
// `minute` reste dans [SUNRISE, NEXT_SUNRISE[ ; départ 07:40.
export const SUNRISE = 360
export const SUNSET = 1200
export const NEXT_SUNRISE = SUNRISE + 24 * 60
export const START_MINUTE = 7 * 60 + 40
/** La nuit défile plus vite que le jour, pour ne pas allonger l'acte 3 */
export const NIGHT_SPEED = 3
/** Minutes « au rythme du jour » qu'il faut pour un cycle complet (840 de jour + 600 / 3 de nuit) */
export const CYCLE_MINUTES = SUNSET - SUNRISE + (NEXT_SUNRISE - SUNSET) / NIGHT_SPEED
const CYCLE_LENGTH = NEXT_SUNRISE - SUNRISE

export type PotState = {
  seeded: boolean
  watered: boolean
  fruitsLeft: number
}

export type Harvested = { pot: number; plant: number }

type GardenState = {
  step: Step
  pots: PotState[]
  minute: number
  day: number
  /** Avancée de la pousse, 0 → 1 sur 15 jours (fraction de journée comprise) */
  growth: number
  harvested: Harvested[]

  /** Fin de l'intro : le texte 1 a révélé la scène */
  start: () => void
  /** Renvoie false si le pot refuse les graines (le tas retourne alors à sa place) */
  seedPot: (pot: number) => boolean
  waterPot: (pot: number) => void
  /** Fait avancer l'horloge de `minutes` au rythme du jour (la nuit va NIGHT_SPEED fois plus vite) ; sans effet hors de l'acte 3 */
  advanceTime: (minutes: number) => void
  harvestFruit: (pot: number, plant: number) => void
  reset: () => void
}

const freshPots = (): PotState[] =>
  Array.from({ length: POT_COUNT }, () => ({ seeded: false, watered: false, fruitsLeft: 0 }))

const initial = () => ({
  step: 'intro' as Step,
  pots: freshPots(),
  minute: START_MINUTE,
  day: 0,
  growth: 0,
  harvested: [] as Harvested[],
})

const growthOf = (day: number, minute: number) =>
  Math.min(1, (day + (minute - SUNRISE) / CYCLE_LENGTH) / DAYS_TO_GROW)

/** Condition de sortie de chaque étape (l'intro se termine via start()) */
function isStepDone(s: Pick<GardenState, 'step' | 'pots' | 'day'>): boolean {
  switch (s.step) {
    case 'sow':
      return s.pots.every((p) => p.seeded)
    case 'water':
      return s.pots.every((p) => p.watered)
    case 'wait':
      return s.day >= DAYS_TO_GROW
    case 'harvest':
      return s.pots.every((p) => p.fruitsLeft === 0)
    default:
      return false
  }
}

function nextStep(step: Step): Step {
  const i = STEPS.indexOf(step)
  return STEPS[Math.min(i + 1, STEPS.length - 1)]
}

export const useGarden = create<GardenState>()((set, get) => {
  /** Passe à l'étape suivante dès que la condition de l'étape courante est remplie */
  const checkStep = () => {
    const s = get()
    if (!isStepDone(s)) return
    const step = nextStep(s.step)
    // au jour 15, un fruit apparaît sur chaque plante
    const pots = step === 'harvest' ? s.pots.map((p) => ({ ...p, fruitsLeft: PLANTS_PER_POT })) : s.pots
    set({ step, pots })
  }

  return {
    ...initial(),

    start: () => {
      if (get().step === 'intro') set({ step: 'sow' })
    },

    seedPot: (pot) => {
      const s = get()
      if (s.step !== 'sow' || s.pots[pot]?.seeded !== false) return false
      set({ pots: s.pots.map((p, i) => (i === pot ? { ...p, seeded: true } : p)) })
      checkStep()
      return true
    },

    waterPot: (pot) => {
      const s = get()
      if (s.step !== 'water' || s.pots[pot]?.watered !== false) return
      set({ pots: s.pots.map((p, i) => (i === pot ? { ...p, watered: true } : p)) })
      checkStep()
    },

    advanceTime: (minutes) => {
      const s = get()
      if (s.step !== 'wait' || minutes <= 0) return
      let minute = s.minute
      let day = s.day
      let budget = minutes
      // on consomme le budget par tranches : jour au rythme normal, nuit NIGHT_SPEED fois plus vite ;
      // au lever suivant, la journée reboucle et compte un jour
      while (budget > 0 && day < DAYS_TO_GROW) {
        const speed = minute >= SUNSET ? NIGHT_SPEED : 1
        const segmentEnd = minute >= SUNSET ? NEXT_SUNRISE : SUNSET
        const step = Math.min(budget * speed, segmentEnd - minute)
        minute += step
        budget -= step / speed
        if (minute >= NEXT_SUNRISE) {
          minute = SUNRISE
          day += 1
        }
      }
      if (day >= DAYS_TO_GROW) {
        day = DAYS_TO_GROW
        minute = SUNRISE
      }
      set({ minute, day, growth: growthOf(day, minute) })
      checkStep()
    },

    harvestFruit: (pot, plant) => {
      const s = get()
      const p = s.pots[pot]
      if (s.step !== 'harvest' || !p || p.fruitsLeft === 0) return
      if (s.harvested.some((h) => h.pot === pot && h.plant === plant)) return
      set({
        pots: s.pots.map((q, i) => (i === pot ? { ...q, fruitsLeft: q.fruitsLeft - 1 } : q)),
        harvested: [...s.harvested, { pot, plant }],
      })
      checkStep()
    },

    reset: () => set(initial()),
  }
})
