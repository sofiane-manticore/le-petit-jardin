import { create } from 'zustand'

const STORAGE_KEY = 'petit-jardin:muted'

/** Préférence mémorisée d'une visite à l'autre (navigation privée : la valeur peut manquer) */
function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

type SoundState = {
  /** Son coupé par le bouton (ou la touche M) */
  muted: boolean
  toggleMuted: () => void
}

export const useSound = create<SoundState>()((set, get) => ({
  muted: readMuted(),
  toggleMuted: () => {
    const muted = !get().muted
    set({ muted })
    try {
      localStorage.setItem(STORAGE_KEY, muted ? '1' : '0')
    } catch {
      // stockage indisponible : la préférence vaut pour la visite en cours
    }
  },
}))
