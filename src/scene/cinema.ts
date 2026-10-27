import { MathUtils, Vector3 } from 'three'
import { POTS, SEED_PILES, SOIL_HEIGHT, WATERING_CAN } from './layout.ts'
import { useGarden } from '../stores/useGarden.ts'

/**
 * Mode cinématique : des plans rapprochés qui s'enchaînent sur les objets de la scène, avec une
 * profondeur de champ marquée. Canal temps réel lu par CameraRig (position et visée de la caméra)
 * et par PostFX (point de netteté) ; Cinematic.tsx l'anime avec GSAP.
 */
export const shot = {
  position: new Vector3(),
  look: new Vector3(),
  /** Point net de la profondeur de champ (le sujet du plan) */
  focus: new Vector3(),
}

export type Shot = {
  look: Vector3
  /** Départ et arrivée du travelling, en coordonnées sphériques autour du sujet */
  from: { azimuth: number; elevation: number; distance: number }
  to: { azimuth: number; elevation: number; distance: number }
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** Position caméra autour de `look` : azimut et élévation en degrés, distance en mètres */
export function orbitPoint(look: Vector3, azimuth: number, elevation: number, distance: number, out: Vector3) {
  const az = MathUtils.degToRad(azimuth)
  const el = MathUtils.degToRad(elevation)
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(distance).add(look)
}

/** Un travelling lent : léger panoramique autour du sujet, en s'en approchant un peu */
function makeShot(look: Vector3, distance: number, elevation: number): Shot {
  const azimuth = rand(-80, 80)
  const sweep = rand(14, 26) * (Math.random() < 0.5 ? -1 : 1)
  return {
    look,
    from: { azimuth, elevation, distance },
    to: { azimuth: azimuth + sweep, elevation: elevation + rand(-4, 4), distance: distance * rand(0.78, 0.9) },
  }
}

/**
 * Les plans possibles selon l'avancée du jardin, mélangés. Les distances restent assez grandes
 * pour que les textures peintes (2048 px) tiennent à l'écran : plus près, elles deviennent floues.
 */
export function buildShots(): Shot[] {
  const { step, growth } = useGarden.getState()
  const shots: Shot[] = []
  const pots = POTS.map((p) => new Vector3(p.position[0], SOIL_HEIGHT, p.position[2]))

  // les pots, en plongée légère sur la terre
  for (const pot of pots) shots.push(makeShot(pot.clone().setY(SOIL_HEIGHT + 0.01), 0.34, rand(22, 34)))
  // l'arrosoir, posé à sa place
  const [cx, , cz] = WATERING_CAN.position
  shots.push(makeShot(new Vector3(cx, 0.1, cz), 0.42, rand(10, 20)))
  // les tas de graines, tant qu'il en reste
  if (step === 'intro' || step === 'sow') {
    const [sx, , sz] = SEED_PILES[1 + Math.floor(Math.random() * 2)]
    shots.push(makeShot(new Vector3(sx, 0.012, sz), 0.24, rand(25, 35)))
  }
  // les plantes qui poussent, puis les fruits au sommet
  if (growth > 0.15) {
    for (const pot of pots.slice(0, 3)) {
      const height = SOIL_HEIGHT + 0.03 + 0.12 * growth
      shots.push(makeShot(pot.clone().setY(height), 0.28 + 0.1 * growth, rand(8, 20)))
    }
  }
  // un plan large au ras du sol, sur toute la rangée
  shots.push(makeShot(new Vector3(0, 0.05, 0), 0.62, rand(6, 12)))

  // mélange de Fisher-Yates
  for (let i = shots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shots[i], shots[j]] = [shots[j], shots[i]]
  }
  return shots
}
