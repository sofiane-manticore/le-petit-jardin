import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)

// courbes de la maquette (tokens --ease-rise et --ease-mark de index.css)
CustomEase.create('rise', '0.2, 0.7, 0.2, 1')
CustomEase.create('mark', '0.3, 0.7, 0.2, 1')

export const REDUCED_MOTION =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
