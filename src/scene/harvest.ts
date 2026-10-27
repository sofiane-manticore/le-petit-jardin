/** Cueillette de chaque fruit encore sur sa plante, rangée dans l'ordre des plantes (pour le clavier) */
export const fruitPickers: { order: number; pick: () => boolean }[] = []

/** Cueille le prochain fruit encore accroché ; false s'il n'y en a plus */
export function pickNextFruit() {
  return [...fruitPickers].sort((a, b) => a.order - b.order).some((p) => p.pick())
}

/** Pause entre l'arrivée du dernier fruit au compteur et l'ouverture du popup de fin (s) */
export const OPEN_DELAY = 0.9
