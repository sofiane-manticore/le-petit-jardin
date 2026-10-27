import type { Step } from '../../stores/useGarden.ts'

// les textes eux-mêmes, en français et en anglais, sont dans i18n/strings.ts

/** Texte affiché à chaque étape ; l'écran de fin n'en a pas */
export const TEXT_FOR_STEP: Record<Step, number | null> = {
  intro: 0,
  sow: 0,
  water: 1,
  wait: 2,
  harvest: 3,
  end: null,
}
