import { Matrix4, type Object3D, Vector3 } from 'three'
import { POT_COUNT } from '../stores/useGarden.ts'

/** Les 4 pots montés dans la scène (renseignés par Pots), pour que d'autres objets suivent leurs rebonds */
export const potObjects: (Object3D | null)[] = Array.from({ length: POT_COUNT }, () => null)

const ONE = new Vector3(1, 1, 1)
const _rest = new Matrix4()

/**
 * Déformation actuelle du pot par rapport à sa forme au repos (gonflement, écrasement…), en
 * coordonnées de la scène : identité quand le pot est à l'échelle 1. Appliquée à un point posé
 * sur la terre, elle le fait monter et descendre avec elle.
 */
export function potDeformation(pot: number, out: Matrix4): Matrix4 {
  const o = potObjects[pot]
  if (!o) return out.identity()
  _rest.compose(o.position, o.quaternion, ONE).invert()
  return out.compose(o.position, o.quaternion, o.scale).multiply(_rest)
}
