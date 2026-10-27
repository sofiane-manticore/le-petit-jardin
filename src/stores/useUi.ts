import { create } from 'zustand'

/** Commandes qui font verser l'arrosoir : clic droit, touche Espace, bouton « verser » (mobile) */
export type PourSource = 'mouse' | 'key' | 'button'

/** État propre à l'interface (séparé de la machine d'étapes du jardin) */
type UiState = {
  /** Les GLB sont chargés et la scène est montée : le rideau de l'intro peut se lever */
  sceneReady: boolean
  /** Le texte 1 a fini de s'écrire sur le fond uni */
  introWritten: boolean
  /** Pot libre survolé par un tas de graines en cours de drag (il se met en valeur), sinon null */
  seedTarget: number | null
  /** Un tas de graines est tenu (drag en cours) : l'indice de la main s'efface */
  seedHeld: boolean
  /** Pot pas encore arrosé visé par l'arrosoir en cours de drag (il se met en valeur), sinon null */
  waterTarget: number | null
  /** L'arrosoir est tenu (drag en cours) : le picto « verser » s'affiche au-dessus */
  canHeld: boolean
  /** Commandes de versement enfoncées en ce moment */
  pourSources: PourSource[]
  /** Au moins une commande de versement est enfoncée */
  pouring: boolean
  /** Mode cinématique : plans rapprochés automatiques, interface masquée, aucune action possible */
  cinema: boolean
  /** Le mode cinématique s'est lancé tout seul (inactivité) : le moindre geste le quitte */
  cinemaAuto: boolean
  setSceneReady: (v: boolean) => void
  setIntroWritten: (v: boolean) => void
  setSeedTarget: (pot: number | null) => void
  setWaterTarget: (pot: number | null) => void
  setSeedHeld: (v: boolean) => void
  setCanHeld: (v: boolean) => void
  setPour: (source: PourSource, on: boolean) => void
  stopPour: () => void
  setCinema: (v: boolean, auto?: boolean) => void
}

export const useUi = create<UiState>()((set, get) => ({
  sceneReady: false,
  introWritten: false,
  seedTarget: null,
  waterTarget: null,
  seedHeld: false,
  canHeld: false,
  pourSources: [],
  pouring: false,
  cinema: false,
  cinemaAuto: false,
  setSceneReady: (sceneReady) => set({ sceneReady }),
  setIntroWritten: (introWritten) => set({ introWritten }),
  setSeedTarget: (seedTarget) => {
    if (get().seedTarget !== seedTarget) set({ seedTarget })
  },
  setWaterTarget: (waterTarget) => {
    if (get().waterTarget !== waterTarget) set({ waterTarget })
  },
  setSeedHeld: (seedHeld) => {
    if (get().seedHeld !== seedHeld) set({ seedHeld })
  },
  setCanHeld: (canHeld) => {
    if (get().canHeld !== canHeld) set({ canHeld })
  },
  setPour: (source, on) => {
    const current = get().pourSources
    if (current.includes(source) === on) return
    const pourSources = on ? [...current, source] : current.filter((s) => s !== source)
    set({ pourSources, pouring: pourSources.length > 0 })
  },
  stopPour: () => {
    if (get().pourSources.length) set({ pourSources: [], pouring: false })
  },
  setCinema: (cinema, auto = false) => {
    if (get().cinema !== cinema) set({ cinema, cinemaAuto: cinema && auto })
  },
}))
