import { live, noiseLoop, tone } from './engine.ts'
import { pour } from '../scene/watering.ts'
import { NEXT_SUNRISE, SUNRISE, SUNSET, useGarden } from '../stores/useGarden.ts'

/**
 * Sons continus, mis à jour à chaque image : vent léger (qui forcit quand on accélère le temps),
 * oiseaux le jour, grillons la nuit, filet d'eau de l'arrosoir. L'heure vient du store : à l'acte 3,
 * l'ambiance suit le jour et la nuit qui défilent.
 */

const rand = (a: number, b: number) => a + Math.random() * (b - a)

type Loops = { wind: ReturnType<typeof noiseLoop>; stream: ReturnType<typeof noiseLoop> }
let loops: Loops | null = null

const state = {
  /** 1 en plein jour, 0 la nuit, lissé */
  day: 1,
  nextBird: 0,
  nextCricket: 0,
  /** Accélération du temps à l'acte 3, 0 → 1 (écrite par TimeBar) */
  speed: 0,
}

/** TimeBar transmet l'accélération en cours (0 au repos, 1 à ×40) */
export function setTimeSpeed(speed: number) {
  state.speed = speed
}

/** Part de jour selon l'heure : nuit de 20:00 à 06:00, transitions d'environ 40 min */
function daylight(minute: number) {
  if (minute < SUNRISE + 40) return 0.5 + 0.5 * ((minute - SUNRISE) / 40)
  if (minute < SUNSET - 40) return 1
  if (minute < SUNSET) return (SUNSET - minute) / 40
  // le chœur de l'aube démarre dans la dernière heure de nuit
  if (minute > NEXT_SUNRISE - 60) return ((minute - (NEXT_SUNRISE - 60)) / 60) * 0.5
  return 0
}

type Engine = NonNullable<ReturnType<typeof live>>

/** Trois chants simples : sifflets descendants, trille, appel à deux notes */
function bird(e: Engine, gain: number) {
  const t = e.ctx.currentTime + 0.02
  const pan = rand(-0.75, 0.75)
  const kind = Math.random()
  if (kind < 0.45) {
    const base = rand(3000, 4200)
    const n = 2 + Math.floor(Math.random() * 4)
    for (let i = 0; i < n; i++) {
      tone(e, { freq: base * rand(1.05, 1.2), to: base * rand(0.7, 0.85), at: t + i * rand(0.09, 0.14), peak: gain, attack: 0.008, decay: 0.06, pan, bus: 'amb' })
    }
  } else if (kind < 0.75) {
    const base = rand(3600, 4400)
    const n = 6 + Math.floor(Math.random() * 5)
    for (let i = 0; i < n; i++) {
      tone(e, { freq: base, to: base * 1.22, at: t + i * 0.048, peak: gain * 0.7, attack: 0.004, decay: 0.028, pan, bus: 'amb' })
    }
  } else {
    const base = rand(2700, 3300)
    tone(e, { freq: base * 1.2, to: base * 1.12, at: t, peak: gain, attack: 0.03, decay: 0.2, pan, bus: 'amb' })
    tone(e, { freq: base, to: base * 0.94, at: t + 0.28, peak: gain, attack: 0.03, decay: 0.24, pan, bus: 'amb' })
  }
}

/** Un grillon : trois impulsions pures vers 4,5 kHz */
function cricket(e: Engine, gain: number) {
  const t = e.ctx.currentTime + 0.02
  const freq = Math.random() < 0.5 ? 4300 : 4750
  const pan = freq > 4500 ? -0.45 : 0.4
  for (let i = 0; i < 3; i++) tone(e, { freq, at: t + i * 0.034, peak: gain, attack: 0.004, decay: 0.022, pan, bus: 'amb' })
}

export function tickAmbience() {
  const e = live()
  if (!e) return
  if (!loops) {
    loops = {
      wind: noiseLoop(e, 'lowpass', 400, 0.5, 'amb'),
      stream: noiseLoop(e, 'bandpass', 1500, 0.7, 'sfx'),
    }
  }
  const now = e.ctx.currentTime
  const { step, minute } = useGarden.getState()

  // l'ambiance s'installe quand le jardin apparaît, et s'efface à moitié sous le popup de fin
  const level = step === 'intro' ? 0 : step === 'end' ? 0.5 : 1
  // acte 4 : l'horloge reste au lever, mais le soleil monte jusqu'à 09:30 (Sun.tsx) : plein jour
  const target = step === 'harvest' || step === 'end' ? 1 : daylight(minute)
  state.day += (target - state.day) * 0.08
  const speed = state.speed

  // vent : deux sinus lents de périodes différentes font des rafales irrégulières
  const gust = 0.5 + 0.25 * Math.sin(now * 0.9) + 0.25 * Math.sin(now * 0.37 + 1.3)
  // retour de Sofiane : le vent de l'accélération était bien trop fort ; il forcit à peine désormais
  loops.wind.gain.gain.setTargetAtTime(level * (0.05 + 0.03 * gust + 0.03 * speed), now, 0.4)
  loops.wind.filter.frequency.setTargetAtTime(330 + 250 * gust + 450 * speed, now, 0.4)

  // filet d'eau : suit le débit de l'arrosoir ; le filtre qui tremble donne le glouglou
  loops.stream.gain.gain.setTargetAtTime(pour.flow * 0.06, now, 0.06)
  loops.stream.filter.frequency.setTargetAtTime(rand(1100, 2100), now, 0.04)

  if (now >= state.nextBird) {
    // matin de la récolte : chœur plus dense
    const busy = step === 'harvest' || step === 'end'
    state.nextBird = now + (busy ? rand(1, 3) : rand(2.5, 6.5))
    if (level > 0 && Math.random() < state.day) bird(e, rand(0.025, 0.05) * level)
  }
  if (now >= state.nextCricket) {
    state.nextCricket = now + rand(0.45, 0.8)
    const night = (1 - state.day) * level
    if (night > 0.08) cricket(e, 0.03 * night)
  }
}
