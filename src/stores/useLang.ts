import { create } from 'zustand'

export type Lang = 'fr' | 'en'

const STORAGE_KEY = 'petit-jardin:lang'

/** Langue mémorisée, sinon celle de l'appareil : français s'il est en français, anglais sinon */
function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'fr' || saved === 'en') return saved
  } catch {
    // stockage indisponible (navigation privée) : on suit l'appareil
  }
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

type LangState = {
  lang: Lang
  toggleLang: () => void
}

export const useLang = create<LangState>()((set, get) => ({
  lang: initialLang(),
  toggleLang: () => {
    const lang: Lang = get().lang === 'fr' ? 'en' : 'fr'
    set({ lang })
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // la langue vaut pour la visite en cours
    }
  },
}))
