import { Vector3 } from 'three'
import { POT_COUNT } from '../stores/useGarden.ts'

/** Secondes d'eau qu'un pot doit recevoir (jet complet) pour passer à `watered` */
export const WATER_NEEDED = 1.2
/** Gouttes émises par seconde, jet complet */
export const DROP_RATE = 110
/** Vitesse de sortie de l'eau (m/s) et gravité, adoucie pour un jet lisible à cette échelle */
export const DROP_SPEED = 0.38
export const GRAVITY = 6.5

/**
 * Temps de chute d'une goutte lancée à la vitesse verticale `vy` depuis `height` au-dessus de la
 * surface visée : racine positive de height + vy t − g t² / 2 = 0.
 */
export function fallTime(height: number, vy: number) {
  return (vy + Math.sqrt(vy * vy + 2 * GRAVITY * Math.max(height, 0))) / GRAVITY
}

/**
 * Canal temps réel entre l'arrosoir, les gouttes et les pots, mis à jour à chaque image.
 * Ces valeurs changent des dizaines de fois par seconde : elles restent hors du store (pas de
 * re-rendu React), le store ne reçoit que le résultat (`waterPot` au passage du seuil).
 */
export const pour = {
  /** Débit, 0 → 1 (suit l'inclinaison de l'arrosoir) */
  flow: 0,
  /** Centre de la pomme, en coordonnées monde */
  origin: new Vector3(),
  /** Direction de sortie de l'eau (unitaire) */
  dir: new Vector3(0, 0, 1),
}

/** Eau reçue par chaque pot, en secondes de jet complet */
export const waterReceived: number[] = Array.from({ length: POT_COUNT }, () => 0)

export function resetWater() {
  waterReceived.fill(0)
  pour.flow = 0
}
