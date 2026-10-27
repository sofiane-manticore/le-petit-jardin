import { Layers, Sun, Type, Sprout, Droplets, Leaf, Apple, Volume2 } from 'lucide-react'

export const W = 1080
export const H = 1350
/** La timeline est écrite sur 15 s (« temps du récit ») puis jouée deux fois plus lentement : 30 s */
export const STORY = 15
export const STRETCH = 2
export const DURATION = STORY * STRETCH
export const FPS = 60

/** Les 8 phases du plan (WEB/docs/phase1…phase8) */
export const PHASES = [
  { icon: Layers, name: 'Socle', note: 'Vite, R3F, chargement des GLB' },
  { icon: Sun, name: 'Scène & rendu', note: 'matériaux peints, soleil, grain' },
  { icon: Type, name: 'UI & récit', note: 'textes, barre du temps' },
  { icon: Sprout, name: 'Semis', note: 'glisser les graines dans les pots' },
  { icon: Droplets, name: 'Arrosage', note: 'verser, la terre fonce' },
  { icon: Leaf, name: 'Pousse', note: '15 jours en accéléré' },
  { icon: Apple, name: 'Récolte', note: 'cueillir les 8 fruits' },
  { icon: Volume2, name: 'Son', note: 'ambiance et bruitages' },
]

/** Échanges Claude ⇄ Blender (phase 0 : inventaire et export, .blend en lecture seule) */
export const TERMINAL = [
  { cmd: 'get_scene_info()', res: '12 objets' },
  { cmd: 'inspect("Pot")', res: '2 986 faces · UV ok' },
  { cmd: 'export_glb("jardin.glb")', res: '1,5 Mo · WebP' },
]

/** Code tapé à l'écran : chaque composant fait apparaître sa partie du jardin */
export const CODE = [
  [['t', '<'], ['c', 'Canvas'], ['a', ' camera'], ['p', '={{ '], ['a', 'fov'], ['p', ': '], ['n', '30'], ['p', ' }}'], ['t', '>']],
  [['p', '  '], ['t', '<'], ['c', 'Ground'], ['t', ' />']],
  [['p', '  '], ['t', '<'], ['c', 'Pots'], ['a', ' count'], ['p', '={'], ['n', '4'], ['p', '}'], ['t', ' />']],
  [['p', '  '], ['t', '<'], ['c', 'SeedPiles'], ['t', ' />']],
  [['p', '  '], ['t', '<'], ['c', 'WateringCan'], ['t', ' />']],
  [['p', '  '], ['t', '<'], ['c', 'PostFX'], ['a', ' grain bloom'], ['t', ' />']],
  [['t', '</'], ['c', 'Canvas'], ['t', '>']],
]

export const CHAPTERS = ['Making-of', '01 — Modéliser', '02 — Exporter', '03 — Planifier', '04 — Construire', '05 — Jouer', 'Making-of']

export const VERBS = ['Semer', 'Arroser', 'Patienter', 'Récolter']

/**
 * Plans tirés de l'enregistrement du site (Linkedin/Jardin.mp4, extraits dans public/footage).
 * src0/src1 : instants dans l'extrait (s) ; crop : centre et hauteur du cadre 4:5 dans l'image 1200×1080.
 */
export const CLIPS = [
  { name: 'sow', frames: 90, start: 10.0, end: 10.85, src0: 0.3, src1: 2.8, crop0: [420, 650, 820], crop1: [450, 650, 720] },
  { name: 'water', frames: 102, start: 10.85, end: 11.7, src0: 0.4, src1: 3.3, crop0: [720, 520, 780], crop1: [660, 520, 660] },
  { name: 'grow', frames: 450, start: 11.7, end: 12.55, src0: 1.0, src1: 14.5, crop0: [600, 590, 840], crop1: [600, 570, 760] },
  { name: 'harvest', frames: 135, start: 12.55, end: 13.4, src0: 0.8, src1: 4.2, crop0: [600, 540, 820], crop1: [600, 500, 680] },
]
