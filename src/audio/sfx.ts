import { live, noise, pentatonic, pluck, tone } from './engine.ts'
import { POTS } from '../scene/layout.ts'

/**
 * Sons ponctuels. Chaque geste réussi joue aussi une note de la même gamme pentatonique, qui monte
 * au fil de l'acte : le jardin « répond » avec une petite mélodie qui se construit.
 */

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** Position stéréo d'un pot (grille 2 × 2 : deux à gauche, deux à droite) */
const potPan = (pot: number) => POTS[pot].position[0] * 2

/** On attrape un tas de graines : petit froissement sec */
export function seedGrab() {
  const e = live()
  if (!e) return
  const t = e.ctx.currentTime
  for (let i = 0; i < 4; i++) {
    noise(e, { filter: 'bandpass', freq: rand(3500, 6000), q: 1.4, at: t + i * rand(0.018, 0.04), peak: rand(0.05, 0.09), decay: rand(0.02, 0.04) })
  }
}

/**
 * Le pot avale les graines : une pluie de petits clics (les graines arrivent sur la terre entre
 * 0,5 et 1 s après le lâcher, cf. SeedPiles), un toc mat de terre, puis la note du pot.
 */
export function sow(pot: number) {
  const e = live()
  if (!e) return
  const t = e.ctx.currentTime
  const pan = potPan(pot)
  for (let i = 0; i < 14; i++) {
    const at = t + 0.5 + (i / 14) * 0.48 + rand(0, 0.04)
    noise(e, { filter: 'highpass', freq: rand(2200, 3800), q: 0.7, at, peak: rand(0.04, 0.1), decay: rand(0.008, 0.02), pan })
  }
  noise(e, { filter: 'lowpass', freq: 320, q: 0.8, at: t + 1.0, peak: 0.22, attack: 0.004, decay: 0.14, pan })
  pluck(e, pentatonic(5 + pot), t + 1.05, 0.13, pan)
}

/** On attrape l'arrosoir : « tonk » de fer-blanc (deux partiels inharmoniques) */
export function canGrab() {
  const e = live()
  if (!e) return
  const t = e.ctx.currentTime
  tone(e, { freq: 610, at: t, peak: 0.07, attack: 0.002, decay: 0.28 })
  tone(e, { freq: 1475, at: t, peak: 0.04, attack: 0.002, decay: 0.16 })
  noise(e, { filter: 'bandpass', freq: 2400, q: 2, at: t, peak: 0.05, decay: 0.02 })
}

/** Où tombe une goutte : terre d'un pot, bord du pot (céramique), sol du jardin */
export type DropSurface = 'soil' | 'rim' | 'ground'

let dropBudget = 0
let dropClock = 0
/** Impacts de gouttes audibles par seconde, au plus (au-delà, le filet d'eau suffit) */
const DROP_RATE = 14

/**
 * Une goutte atterrit. Sur 110 gouttes par seconde, une partie seulement fait un son (budget
 * limité) : tapotis mat sur la terre, « tic » clair sur la céramique, « plic » sur le sol.
 */
export function dropLanded(surface: DropSurface, pan = 0) {
  const e = live()
  if (!e) return
  const now = e.ctx.currentTime
  dropBudget = Math.min(3, dropBudget + (now - dropClock) * DROP_RATE)
  dropClock = now
  if (dropBudget < 1) return
  dropBudget -= 1
  const at = now + rand(0, 0.03)
  if (surface === 'soil') {
    noise(e, { filter: 'bandpass', freq: rand(700, 1300), q: 1.2, at, peak: rand(0.02, 0.045), decay: rand(0.02, 0.04), pan })
    // de temps en temps, une goutte tombe dans une flaque naissante
    if (Math.random() < 0.18) tone(e, { freq: rand(900, 1300), to: rand(1700, 2400), at, peak: 0.015, attack: 0.002, decay: 0.05, pan })
  } else if (surface === 'rim') {
    tone(e, { freq: rand(2600, 3400), at, peak: 0.016, attack: 0.001, decay: 0.06, pan })
  } else {
    tone(e, { freq: rand(1000, 1500), to: rand(1900, 2800), at, peak: 0.018, attack: 0.002, decay: 0.045, pan })
  }
}

/** Le pot a bu assez : « gloup » rond, puis la note du pot */
export function watered(pot: number) {
  const e = live()
  if (!e) return
  const t = e.ctx.currentTime
  const pan = potPan(pot)
  tone(e, { freq: 260, to: 120, at: t, peak: 0.2, attack: 0.01, decay: 0.22, pan })
  tone(e, { freq: 520, to: 900, at: t + 0.07, peak: 0.05, attack: 0.004, decay: 0.08, pan })
  pluck(e, pentatonic(5 + pot), t + 0.12, 0.13, pan)
}

/** Nouveau jour à l'acte 3 : une note douce, qui monte de jour en jour */
export function dayTick(day: number) {
  const e = live()
  if (!e) return
  pluck(e, pentatonic(day % 10), undefined, 0.07, rand(-0.3, 0.3))
}

/** Un fruit éclot au bout de son rameau : petite bulle qui éclate */
export function fruitAppear(order: number) {
  const e = live()
  if (!e) return
  const t = e.ctx.currentTime
  const pan = ((order % 4) - 1.5) * 0.25
  tone(e, { freq: rand(320, 420), to: rand(900, 1200), at: t, peak: 0.14, attack: 0.003, decay: 0.07, pan })
  noise(e, { filter: 'bandpass', freq: 1800, q: 1.5, at: t, peak: 0.04, decay: 0.015, pan })
}

/**
 * Cueillette (synchronisée avec l'animation de Fruits) : le rameau tire (0,16 s), « pop » du
 * détachement, puis le souffle du vol vers le compteur (0,75 s).
 */
export function fruitPick() {
  const e = live()
  if (!e) return
  const t = e.ctx.currentTime
  tone(e, { freq: 180, to: 240, type: 'triangle', at: t, peak: 0.03, attack: 0.05, decay: 0.12 })
  tone(e, { freq: 720, to: 170, at: t + 0.17, peak: 0.24, attack: 0.002, decay: 0.09 })
  noise(e, { filter: 'bandpass', freq: 1400, q: 1, at: t + 0.17, peak: 0.08, decay: 0.02 })
  noise(e, { filter: 'bandpass', freq: 500, to: 2600, q: 1.6, at: t + 0.22, peak: 0.05, attack: 0.3, decay: 0.45 })
}

/** Le fruit tombe dans sa case : note claire, de plus en plus haute du 1er au 8e */
export function fruitArrive(count: number) {
  const e = live()
  if (!e) return
  pluck(e, pentatonic(4 + count), undefined, 0.15)
}

/** Ouverture du popup de fin : arpège montant de ré majeur, un peu égrené */
export function finale(delay: number) {
  const e = live()
  if (!e) return
  const t = e.ctx.currentTime + delay
  ;[0, 2, 3, 5, 7, 10].forEach((deg, i) => pluck(e, pentatonic(deg), t + i * 0.11 + rand(0, 0.02), 0.12, (i - 2.5) * 0.12))
}
