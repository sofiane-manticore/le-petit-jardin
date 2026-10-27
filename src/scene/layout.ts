// Composition de la scène, en mètres (Y vers le haut, la caméra regarde depuis +Z).
// Le sol fait 1,75 m de côté et est centré sur l'origine.

export type Placement = { position: [number, number, number]; rotationY: number }

/** 4 pots en grille 2 × 2, volontairement un peu de travers (index = index du store) */
export const POTS: Placement[] = [
  { position: [-0.162, 0, -0.102], rotationY: 0.06 },
  { position: [0.152, 0, -0.118], rotationY: -0.09 },
  { position: [-0.141, 0, 0.098], rotationY: -0.05 },
  { position: [0.174, 0, 0.112], rotationY: 0.08 },
]

/** Hauteur de la surface de terre dans le pot (phase 0 : 0,049 à 0,059) */
export const SOIL_HEIGHT = 0.055
/** Demi-dimensions du pot (X, Z dans son repère) et de la surface de terre (phase 0) */
export const POT_HALF: [number, number] = [0.13, 0.05]
export const SOIL_HALF: [number, number] = [0.122, 0.045]

/** 4 tas de graines alignés sur la gauche, un par pot */
export const SEED_PILES: [number, number, number][] = [
  [-0.468, 0, -0.17],
  [-0.492, 0, -0.058],
  [-0.474, 0, 0.056],
  [-0.498, 0, 0.17],
]
export const SEEDS_PER_PILE = 70
/** Échelle des graines par rapport au mesh Blender (2,9 cm de long → environ 1,4 cm) */
export const SEED_SCALE = 0.48
/** Hauteur à laquelle flotte un tas pendant le drag (le bord des pots est à 0,065) */
export const SEED_LIFT = 0.09

/** Arrosoir posé à droite, le bec tourné vers les pots */
export const WATERING_CAN: Placement = { position: [0.5, 0, 0.01], rotationY: -Math.PI / 2 - 0.45 }

/** Hauteur du bord des pots (phase 0) : une goutte qui tombe sur le bord n'arrose pas */
export const POT_RIM_HEIGHT = 0.065

/**
 * Repères de l'arrosoir, dans le repère du mesh (bec vers +Z, mesuré sur jardin.glb) :
 * - la poignée du dessus, où la main le tient (pivot du drag et de l'inclinaison) ;
 * - le centre de la pomme, d'où sort l'eau, et sa direction de sortie au repos.
 */
export const CAN_GRIP: [number, number, number] = [0, 0.19, -0.01]
export const CAN_ROSE: [number, number, number] = [0, 0.13, 0.168]
export const CAN_ROSE_DIR: [number, number, number] = [0, 0.35, 0.94]
/** Hauteur de la poignée pendant le drag : la pomme reste au-dessus du bord des pots en versant */
export const CAN_LIFT = 0.27
