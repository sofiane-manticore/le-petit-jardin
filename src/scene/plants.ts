import { type BufferGeometry, CatmullRomCurve3, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { PLANTS_PER_POT } from '../stores/useGarden.ts'
import { mulberry32 } from '../lib/random.ts'
import { POTS, SOIL_HEIGHT } from './layout.ts'

// Plantes procédurales : chaque tige de plantes.glb (LineSegments) est relue comme une suite de
// chaînes (la tige principale, puis les rameaux), et toute la pousse est décrite en « temps de
// plante » u, de 0 (graine) à 1 (plante adulte, au jour 15).

/**
 * Fin de la tige principale (en u) avant mise à l'échelle ; les rameaux poussent à la même vitesse
 * à partir de leur point d'attache. Le calendrier est ensuite étiré pour que la dernière feuille
 * finisse de s'ouvrir exactement à u = 1, c'est-à-dire à la fin du 15ᵉ jour.
 */
const MAIN_END = 0.62
/** Durée de croissance d'une feuille, en u */
export const LEAF_GROW = 0.1

/** Rayons de la tige, en mètres (pied, pointe), et des rameaux par rapport à leur point d'attache */
const MAIN_RADIUS: [number, number] = [0.0031, 0.0012]
const BRANCH_RADIUS_RATIO = 0.75
const BRANCH_TIP_RADIUS = 0.0008

/** Pas d'échantillonnage du tube le long de la courbe (m) et nombre de côtés */
const TUBE_STEP = 0.004
export const TUBE_SIDES = 6

/**
 * Retard de germination maximal, en part de la pousse globale (0,2 = 3 jours). Une plante qui
 * part en retard pousse un peu plus vite : toutes finissent ensemble à la fin du 15ᵉ jour.
 */
const MAX_DELAY = 0.2

/** Où sont les 2 plantes dans la jardinière, le long de son grand axe (repère du pot) */
const SLOT_X = 0.062

export type Chain = {
  curve: CatmullRomCurve3
  length: number
  /** u auquel la chaîne commence à pousser, et durée de sa pousse */
  start: number
  duration: number
  /** Rayon au pied et à la pointe */
  radius: [number, number]
}

export type LeafSpec = {
  chain: number
  /** Position le long de la chaîne (0 → 1) */
  t: number
  /** u de naissance de la feuille */
  birth: number
  variant: number
  /** Taille relative (1 = feuille de Blender) */
  size: number
  /** Azimut autour de la tige (rad), relève vers le haut (rad) et roulis */
  azimuth: number
  lift: number
  roll: number
  /** Feuille du bout : elle prolonge la pointe au lieu de partir de côté */
  terminal: boolean
}

export type Template = {
  chains: Chain[]
  /** Chaîne et position où pend le fruit */
  fruit: { chain: number; t: number }
}

/** Découpe un LineSegments indexé (i, i+1) en chaînes de points, à chaque rupture d'index */
function readChains(geometry: BufferGeometry): Vector3[][] {
  const pos = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const pairs: number[] = []
  if (index) for (let i = 0; i < index.count; i++) pairs.push(index.getX(i))
  else for (let i = 0; i < pos.count; i++) pairs.push(i)

  const chains: number[][] = []
  let current: number[] | null = null
  for (let k = 0; k < pairs.length; k += 2) {
    const [a, b] = [pairs[k], pairs[k + 1]]
    if (!current || current[current.length - 1] !== a) {
      current = [a]
      chains.push(current)
    }
    current.push(b)
  }
  return chains.map((c) => c.map((i) => new Vector3().fromBufferAttribute(pos, i)))
}

/** Paramètre (0 → 1, en longueur) du point de `curve` le plus proche de `p` */
function nearestT(curve: CatmullRomCurve3, p: Vector3) {
  let best = 0
  let bestD = Infinity
  const q = new Vector3()
  for (let i = 0; i <= 200; i++) {
    const d = curve.getPointAt(i / 200, q).distanceToSquared(p)
    if (d < bestD) {
      bestD = d
      best = i / 200
    }
  }
  return best
}

/** Prépare une tige de Blender : courbes, calendrier de pousse et point du fruit */
export function buildTemplate(geometry: BufferGeometry): Template {
  const raw = readChains(geometry)
  const curves = raw.map((points) => new CatmullRomCurve3(points, false, 'centripetal'))
  const main = curves[0]
  const mainLength = main.getLength()

  const chains: Chain[] = curves.map((curve, i) => {
    const length = curve.getLength()
    if (i === 0) return { curve, length, start: 0, duration: MAIN_END, radius: MAIN_RADIUS }
    // un rameau démarre quand la tige principale atteint son point d'attache, et pousse à la même vitesse
    const attach = nearestT(main, raw[i][0])
    const start = attach * MAIN_END + 0.04
    const duration = Math.max((length / mainLength) * MAIN_END, 0.15)
    const base = MAIN_RADIUS[0] + (MAIN_RADIUS[1] - MAIN_RADIUS[0]) * attach
    return { curve, length, start, duration, radius: [base * BRANCH_RADIUS_RATIO, BRANCH_TIP_RADIUS] }
  })

  // étire le calendrier : la dernière chaîne finit, puis sa feuille du bout s'ouvre pile à u = 1
  const lastEnd = Math.max(...chains.map((c) => c.start + c.duration))
  const k = (1 - LEAF_GROW) / lastEnd
  for (const chain of chains) {
    chain.start *= k
    chain.duration *= k
  }

  // le fruit pend juste avant la pointe du rameau qui finit le plus haut (assez de place dessous)
  let fruitChain = chains.length > 1 ? 1 : 0
  for (let i = 1; i < chains.length; i++) {
    if (chains[i].curve.getPointAt(1).y > chains[fruitChain].curve.getPointAt(1).y) fruitChain = i
  }
  return { chains, fruit: { chain: fruitChain, t: 0.9 } }
}

/** Feuilles réparties sur les chaînes, avec une phyllotaxie de 137,5° sur la tige principale */
export function buildLeaves(template: Template, rand: () => number): LeafSpec[] {
  const leaves: LeafSpec[] = []
  const GOLDEN = 2.39996
  template.chains.forEach((chain, c) => {
    const isMain = c === 0
    const count = isMain
      ? Math.min(7, Math.max(3, Math.round(chain.length / 0.075)))
      : Math.max(1, Math.round(chain.length / 0.08))
    // tige principale : spirale ; rameau : feuilles alternées à gauche et à droite (azimut 0 = côté)
    let azimuth = isMain ? rand() * Math.PI * 2 : 0
    for (let i = 0; i < count; i++) {
      const t = isMain ? 0.16 + (0.74 * (i + 0.5)) / count : 0.3 + (0.55 * (i + 0.5)) / count
      azimuth += isMain ? GOLDEN : Math.PI
      leaves.push({
        chain: c,
        t,
        birth: chain.start + t * chain.duration,
        variant: rand() < 0.5 ? 0 : 1,
        // les feuilles du bas sont les plus grandes
        size: (isMain ? 1.15 - 0.35 * t : 0.95 - 0.2 * t) * (0.85 + rand() * 0.3),
        azimuth: azimuth + (rand() - 0.5) * 0.5,
        lift: 0.45 + rand() * 0.35,
        roll: (rand() - 0.5) * 0.6,
        terminal: false,
      })
    }
    // une petite feuille (Feuille_3) au bout de chaque chaîne, qui éclot quand la pointe y arrive
    leaves.push({
      chain: c,
      t: 1,
      birth: chain.start + chain.duration,
      variant: 2,
      size: 0.9 + rand() * 0.25,
      azimuth: rand() * Math.PI * 2,
      lift: 0,
      roll: (rand() - 0.5) * 0.6,
      terminal: true,
    })
  })
  return leaves
}

export type PlantInstance = {
  pot: number
  plant: number
  template: number
  /** Repère monde de la plante (pied sur la terre) */
  matrix: Matrix4
  /** Retard de germination (fraction de la pousse globale) */
  delay: number
  leaves: LeafSpec[]
}

/** Les 8 plantes : tige de Blender, rotation, échelle, inclinaison et décalage propres à chacune */
export function placePlants(templates: Template[]): PlantInstance[] {
  const rand = mulberry32(1507)
  const plants: PlantInstance[] = []
  // ordre des tiges choisi pour que deux voisines ne soient jamais identiques
  const order = [0, 1, 2, 0, 1, 2, 1, 0]
  // germination échelonnée : les 8 retards sont répartis entre 0 et MAX_DELAY, dans un ordre mêlé
  // (avec son propre générateur, pour ne pas toucher à la forme des plantes)
  const jitter = mulberry32(2203)
  const delays = [0, 5, 2, 7, 4, 1, 6, 3].map((r) => ((r + 0.2 + jitter() * 0.6) / 8) * MAX_DELAY)
  POTS.forEach((pot, p) => {
    for (let j = 0; j < PLANTS_PER_POT; j++) {
      const template = order[p * PLANTS_PER_POT + j] % templates.length
      const side = j === 0 ? -1 : 1
      // position dans le pot (repère du pot), puis dans le monde
      const local = new Vector3(side * SLOT_X + (rand() - 0.5) * 0.016, 0, (rand() - 0.5) * 0.016)
      local.applyAxisAngle(new Vector3(0, 1, 0), pot.rotationY)
      const position = new Vector3(pot.position[0] + local.x, SOIL_HEIGHT - 0.003, pot.position[2] + local.z)
      const quaternion = new Quaternion().setFromEuler(
        new Euler((rand() - 0.5) * 0.14, rand() * Math.PI * 2, (rand() - 0.5) * 0.14, 'YXZ'),
      )
      const s = 0.82 + rand() * 0.28
      // tirage inutilisé, gardé : le retirer décalerait la suite et changerait la forme de toutes les plantes
      rand()
      plants.push({
        pot: p,
        plant: j,
        template,
        matrix: new Matrix4().compose(position, quaternion, new Vector3(s, s, s)),
        delay: delays[p * PLANTS_PER_POT + j],
        leaves: buildLeaves(templates[template], rand),
      })
    }
  })
  return plants
}

/** Temps de plante u à partir de la pousse globale (0 → 1 sur 15 jours) */
export const plantTime = (growth: number, delay: number) => Math.min(1, Math.max(0, (growth - delay) / (1 - delay)))

/** Nombre de tronçons du tube d'une chaîne */
export const tubeSegments = (chain: Chain) => Math.max(8, Math.ceil(chain.length / TUBE_STEP))
