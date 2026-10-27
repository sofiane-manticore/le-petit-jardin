import { Color, MathUtils, type Vector3 } from 'three'
import { NEXT_SUNRISE, SUNRISE, SUNSET } from '../stores/useGarden.ts'

// Lumière du jardin sur un cycle complet : fond, teinte, ombre et direction de la lumière
// selon `minute` (dans [SUNRISE, NEXT_SUNRISE[, donc de 06:00 à 06:00 le lendemain).

export const BACKGROUND = '#efe6d6'

/** Teinte appliquée aux matériaux et au fond : chaude le jour, bleutée et plus sombre la nuit */
const TINT_KEYS: [number, Color][] = [
  [SUNRISE, new Color('#e9c3b8')], // 06:00, aube rosée
  [400, new Color('#ffd6b8')], // 06:40, lever doré
  [480, new Color('#fff0e0')],
  [780, new Color('#fffaf2')], // 13:00, midi
  [1080, new Color('#ffefdc')],
  [1160, new Color('#ffcea6')], // 19:20, heure dorée
  [SUNSET, new Color('#e6aa9a')], // 20:00, coucher
  // la nuit ne descend pas plus bas que l'ambiance de 20:45 : écart de luminosité limité,
  // pour éviter les flashes quand le temps est accéléré
  [1245, new Color('#9799c3')], // 20:45, nuit bleutée (palier le plus sombre)
  [1710, new Color('#9799c3')], // 04:30
  [1770, new Color('#c2b2c4')], // 05:30, avant l'aube
  [NEXT_SUNRISE, new Color('#e9c3b8')],
]

// Ombre très légère : 0 = aucune ombre, 1 = ombre noire. Le soleil s'efface autour du coucher et
// du lever (la direction bascule alors du soleil à la lune sans saut visible).
export const SHADOW_SUN = 0.32
export const SHADOW_SUN_LOW = 0.24
export const SHADOW_MOON = 0.14

export function sampleTint(minute: number, out: Color) {
  for (let i = 1; i < TINT_KEYS.length; i++) {
    const [m1, c1] = TINT_KEYS[i]
    const [m0, c0] = TINT_KEYS[i - 1]
    if (minute <= m1) return out.copy(c0).lerp(c1, (minute - m0) / (m1 - m0))
  }
  return out.copy(TINT_KEYS[TINT_KEYS.length - 1][1])
}

/** Arc commun au soleil et à la lune : départ à gauche, arrivée à droite, un peu derrière la scène */
function arc(t: number, out: Vector3) {
  const a = Math.PI * t
  return out.set(-Math.cos(a) * 0.9, 0.35 + Math.sin(a) * 0.75, -0.55).normalize()
}

/** Direction de la lumière et force de l'ombre à cette minute */
export function lightAt(minute: number, dir: Vector3) {
  const FADE = 35
  if (minute < SUNSET + FADE) {
    // jour : le soleil, dont l'ombre disparaît dans les 35 min autour du lever et du coucher
    const t = MathUtils.clamp((minute - SUNRISE) / (SUNSET - SUNRISE), 0, 1)
    arc(t, dir)
    const strength = MathUtils.lerp(SHADOW_SUN_LOW, SHADOW_SUN, MathUtils.smoothstep(dir.y, 0.3, 0.8))
    const fade = Math.min(
      MathUtils.smoothstep(minute, SUNRISE, SUNRISE + FADE),
      1 - MathUtils.smoothstep(minute, SUNSET - FADE, SUNSET + FADE),
    )
    return strength * fade
  }
  // nuit : la lune, plus pâle, sur le même arc
  const t = MathUtils.clamp((minute - SUNSET - FADE) / (NEXT_SUNRISE - SUNSET - 2 * FADE), 0, 1)
  arc(t, dir)
  const fade = Math.min(
    MathUtils.smoothstep(minute, SUNSET + FADE, SUNSET + 3 * FADE),
    1 - MathUtils.smoothstep(minute, NEXT_SUNRISE - 3 * FADE, NEXT_SUNRISE - FADE),
  )
  return SHADOW_MOON * fade
}
