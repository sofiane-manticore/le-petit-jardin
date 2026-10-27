/** Écran tactile comme pointeur principal (téléphone, tablette) : le bouton « verser » remplace le clic droit */
export const COARSE_POINTER = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
