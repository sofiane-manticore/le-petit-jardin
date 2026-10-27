/** Les tas de graines montés, par index : l'indice de la main montre un tas encore à prendre */
export const pileHandles: ({ isAvailable: () => boolean } | null)[] = []

/** Index du premier tas encore à prendre, ou -1 */
export const availablePile = () => pileHandles.findIndex((p) => p?.isAvailable())
