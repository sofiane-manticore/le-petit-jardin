import { Plane, type Ray, Vector3 } from 'three'
import { POT_HALF, POTS, SOIL_HALF, SOIL_HEIGHT } from './layout.ts'

/** Tolérance autour du pot pour accepter un drop, en mètres */
const DROP_MARGIN = 0.025

const soilPlane = new Plane(new Vector3(0, 1, 0), -SOIL_HEIGHT)
const onSoil = new Vector3()

/** Point x, z exprimé dans le repère du pot `pot` (rotation inverse autour de Y) */
function toPot(pot: number, x: number, z: number): [number, number] {
  const { position, rotationY } = POTS[pot]
  const dx = x - position[0]
  const dz = z - position[2]
  const c = Math.cos(rotationY)
  const s = Math.sin(rotationY)
  return [c * dx - s * dz, s * dx + c * dz]
}

/** Index du pot dont l'emprise (au sol, marge comprise) contient le point x, z, sinon null */
export function potAt(x: number, z: number, margin = DROP_MARGIN): number | null {
  for (let i = 0; i < POTS.length; i++) {
    const [lx, lz] = toPot(i, x, z)
    if (Math.abs(lx) <= POT_HALF[0] + margin && Math.abs(lz) <= POT_HALF[1] + margin) return i
  }
  return null
}

/** Le point x, z (pris dans l'emprise du pot `pot`) tombe-t-il sur la terre plutôt que sur le bord ? */
export function onSoilOf(pot: number, x: number, z: number): boolean {
  const [lx, lz] = toPot(pot, x, z)
  return Math.abs(lx) <= SOIL_HALF[0] && Math.abs(lz) <= SOIL_HALF[1]
}

/**
 * Pot visé par un tas en drag. D'abord le pot sous le tas (aplomb), puis, à défaut, le pot dont la
 * terre est sous le pointeur : le tas flotte au-dessus du sol, et la perspective peut faire viser
 * l'un ou l'autre.
 */
export function potUnderDrag(pile: Vector3, ray: Ray): number | null {
  const below = potAt(pile.x, pile.z)
  if (below !== null) return below
  return ray.intersectPlane(soilPlane, onSoil) ? potAt(onSoil.x, onSoil.z) : null
}

/** Point de la terre du pot `pot`, à partir de coordonnées locales normalisées u, v ∈ [-1, 1] */
export function soilPoint(pot: number, u: number, v: number, out: Vector3): Vector3 {
  const { position, rotationY } = POTS[pot]
  const lx = u * SOIL_HALF[0]
  const lz = v * SOIL_HALF[1]
  const c = Math.cos(rotationY)
  const s = Math.sin(rotationY)
  return out.set(position[0] + c * lx + s * lz, SOIL_HEIGHT, position[2] - s * lx + c * lz)
}
