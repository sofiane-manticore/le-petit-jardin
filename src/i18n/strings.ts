import { useLang, type Lang } from '../stores/useLang.ts'

/** Un morceau de ligne : texte simple, ou mot clé surligné */
export type Chunk = string | { mark: string }
/** Un texte du récit : une ligne par phrase ou demi-phrase */
export type StoryLines = Chunk[][]

export type RecapStep = { icon: 'palette' | 'brush' | 'plan' | 'mcp' | 'prompt' | 'check'; title: string; body: string }

const fr = {
  title: 'Le petit jardin',
  // espace insécable avant « ! » (typographie française)
  story: [
    [['La créativité, c’est comme un potager.'], ['Il suffit de commencer par planter une ', { mark: 'graine' }, '.']],
    [['Mais les idées doivent s’entretenir.'], ['Il faut les ', { mark: 'abreuver' }, '.']],
    [['Rome ne s’est pas bâtie en un jour.'], ['Il faut savoir laisser le temps au ', { mark: 'temps' }, '.']],
    [['Un long processus, mais quel plaisir'], ['de récolter le ', { mark: 'fruit' }, ' de nos efforts !']],
  ] as StoryLines[],
  time: {
    section: 'Passage du temps',
    bar: 'Heure de la journée, de 06:00 à 06:00',
    day: 'Jour',
    daySr: (day: number, total: number) => `Jour ${day} sur ${total}`,
    hold: 'Maintenir pour faire passer le temps',
  },
  pour: { aria: 'Maintenir pour verser l’eau', label: 'verser' },
  hint: { rightClick: 'Clic droit maintenu pour verser', or: 'ou', space: 'Espace' },
  harvest: {
    section: 'Récolte',
    sr: (n: number, total: number) => `${n} fruit${n > 1 ? 's' : ''} récolté${n > 1 ? 's' : ''} sur ${total}`,
  },
  keyboard: { sow: 'Semer le pot suivant', water: 'Arroser le pot suivant', harvest: 'Cueillir le fruit suivant' },
  end: {
    before: 'Bravo, ils sont ',
    mark: 'magnifiques',
    after: ' !',
    count: (n: number) => `${n} fruit${n > 1 ? 's' : ''} récolté${n > 1 ? 's' : ''}`,
    linkedin: 'Me retrouver sur LinkedIn',
    scroll: 'Découvrir mon workflow',
  },
  recap: {
    title: 'Comment ce jardin a poussé',
    lead: 'Ce site est né d’un workflow hybride : je fais la 3D et les textures à la main, je décris précisément à Claude ce que le code doit faire, et on avance phase par phase.',
    steps: [
      { icon: 'palette', title: 'Direction artistique', body: 'L’interface est d’abord maquettée dans Claude Design : tons crème et terre cuite, typographies, récit en quatre textes, bouton pour accélérer le temps.' },
      { icon: 'brush', title: 'Modélisation et textures à la main', body: 'Pots, arrosoir, graines, tiges, feuilles et fruits sont modélisés dans Blender, puis texturés à la main pour garder un rendu illustré, presque peint.' },
      { icon: 'plan', title: 'Un plan séquencé', body: 'Avant la première ligne de code, un plan de construction en 9 phases et une trentaine de tâches, relu et commenté ensemble, phase par phase.' },
      { icon: 'mcp', title: 'Blender MCP', body: 'Claude se connecte directement à ma scène Blender via MCP : inventaire en lecture seule, export des modèles en GLB. Il ne touche jamais au fichier sans me le demander et le justifier.' },
      { icon: 'prompt', title: 'Une description explicite', body: 'Pour chaque phase, je décris l’intention : les gestes, les sensations, le rythme. Claude programme en React Three Fiber, GSAP, Tailwind et Lucide.' },
      { icon: 'check', title: 'Validation phase par phase', body: 'Chaque phase se termine par un compte rendu détaillé, testé sur ordinateur, iPad et iPhone. Je valide ou je corrige, puis on passe à la suivante.' },
    ] as RecapStep[],
    stack: 'Blender · Blender MCP · Claude · React Three Fiber · three.js · GSAP · Tailwind · Lucide · Web Audio',
    visuals: {
      palette: 'Palette et typographies de la maquette',
      textures: ['Texture peinte de l’arrosoir', 'Texture peinte du pot', 'Texture peinte du fruit', 'Texture peinte des feuilles'],
      phases: ['Inventaire Blender', 'Socle du site', 'Scène et rendu', 'Interface et récit', 'Semis', 'Arrosage', 'Pousse', 'Récolte', 'Son'],
      phase: 'Phase',
      terminal: ['inventaire de la scène · 12 objets', 'Pot · Arrosoir · Graine · Fruit · Sol…', 'export → jardin.glb · 9,5 Mo', 'export → plantes.glb · 106 Ko', '.blend non modifié ✓'],
      // une de mes vraies demandes à Claude, pendant les retours finaux
      prompt: 'En mobile, je veux que le doigt de l’utilisateur se trouve sur l’anse, pour éviter qu’il cache le bec de l’arrosoir.',
      reply: 'C’est fait : au doigt, l’anse vient sous le doigt et le jet reste visible.',
      me: 'Moi',
      screens: 'Le site testé sur ordinateur et sur téléphone',
    },
  },
  sound: { mute: 'Couper le son (M)', unmute: 'Remettre le son (M)' },
  cinema: { start: 'Mode cinématique (C)', stop: 'Quitter le mode cinématique (C)' },
  lang: { label: 'Switch to English', short: 'EN' },
}

export type Strings = typeof fr

const en: Strings = {
  title: 'The little garden',
  story: [
    [['Creativity is like a vegetable garden.'], ['All it takes is planting a ', { mark: 'seed' }, '.']],
    [['But ideas need tending.'], ['You have to ', { mark: 'water' }, ' them.']],
    [['Rome wasn’t built in a day.'], ['Good things take ', { mark: 'time' }, '.']],
    [['A long process, but what a joy'], ['to reap the ', { mark: 'fruit' }, ' of our efforts!']],
  ],
  time: {
    section: 'Passing of time',
    bar: 'Time of day, from 06:00 to 06:00',
    day: 'Day',
    daySr: (day, total) => `Day ${day} of ${total}`,
    hold: 'Hold to make time pass',
  },
  pour: { aria: 'Hold to pour the water', label: 'pour' },
  hint: { rightClick: 'Hold right-click to pour', or: 'or', space: 'Space' },
  harvest: {
    section: 'Harvest',
    sr: (n, total) => `${n} fruit${n > 1 ? 's' : ''} harvested out of ${total}`,
  },
  keyboard: { sow: 'Sow the next pot', water: 'Water the next pot', harvest: 'Pick the next fruit' },
  end: {
    before: 'Well done, they look ',
    mark: 'gorgeous',
    after: '!',
    count: (n) => `${n} fruit${n > 1 ? 's' : ''} harvested`,
    linkedin: 'Find me on LinkedIn',
    scroll: 'Discover my workflow',
  },
  recap: {
    title: 'How this garden grew',
    lead: 'This site comes from a hybrid workflow: I make the 3D and the textures by hand, I describe precisely to Claude what the code should do, and we move forward one phase at a time.',
    steps: [
      { icon: 'palette', title: 'Art direction', body: 'The interface is first mocked up in Claude Design: cream and terracotta tones, typefaces, a story in four lines, a button to speed up time.' },
      { icon: 'brush', title: 'Hand-made models and textures', body: 'Pots, watering can, seeds, stems, leaves and fruits are modelled in Blender, then textured by hand to keep an illustrated, almost painted look.' },
      { icon: 'plan', title: 'A sequenced plan', body: 'Before the first line of code: a build plan in 9 phases and about thirty tasks, reviewed and commented together, phase by phase.' },
      { icon: 'mcp', title: 'Blender MCP', body: 'Claude connects straight to my Blender scene through MCP: read-only inventory, GLB export of the models. It never touches the file without asking me and explaining why.' },
      { icon: 'prompt', title: 'Explicit descriptions', body: 'For each phase, I describe the intent: the gestures, the feel, the rhythm. Claude writes the code in React Three Fiber, GSAP, Tailwind and Lucide.' },
      { icon: 'check', title: 'Phase-by-phase sign-off', body: 'Each phase ends with a detailed report, tested on desktop, iPad and iPhone. I sign it off or ask for changes, then we move to the next one.' },
    ],
    stack: fr.recap.stack,
    visuals: {
      palette: 'Mock-up palette and typefaces',
      textures: ['Hand-painted watering can texture', 'Hand-painted pot texture', 'Hand-painted fruit texture', 'Hand-painted leaf texture'],
      phases: ['Blender inventory', 'Site foundations', 'Scene and rendering', 'Interface and story', 'Sowing', 'Watering', 'Growing', 'Harvest', 'Sound'],
      phase: 'Phase',
      terminal: ['scene inventory · 12 objects', 'Pot · Watering can · Seed · Fruit · Ground…', 'export → jardin.glb · 9.5 MB', 'export → plantes.glb · 106 KB', '.blend left untouched ✓'],
      prompt: 'On mobile, I want the user’s finger on the handle, so it doesn’t hide the spout of the watering can.',
      reply: 'Done: on touch screens, the handle sits under the finger and the water stays visible.',
      me: 'Me',
      screens: 'The site tested on desktop and on a phone',
    },
  },
  sound: { mute: 'Mute (M)', unmute: 'Unmute (M)' },
  cinema: { start: 'Cinematic mode (C)', stop: 'Exit cinematic mode (C)' },
  lang: { label: 'Passer en français', short: 'FR' },
}

export const STRINGS: Record<Lang, Strings> = { fr, en }

/** Textes de l'interface dans la langue choisie */
export function useStrings() {
  return STRINGS[useLang((s) => s.lang)]
}
