import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, type DirectionalLight, MathUtils, Vector3 } from 'three'
import { SUNRISE, useGarden } from '../stores/useGarden.ts'
import { paintUniforms } from '../materials/paintedMaterial.ts'
import { BACKGROUND, lightAt, sampleTint } from './lighting.ts'

const BG = new Color(BACKGROUND)
const target = new Color()
const tint = new Color()
const dir = new Vector3()
// La teinte rattrape sa cible en douceur : quand le temps est très accéléré (un cycle en moins
// d'une seconde), la lumière se lisse au lieu de clignoter. Sans effet visible au rythme normal.
const TINT_DAMPING = 5
let first = true
/**
 * Le 15ᵉ jour se termine au lever, dans la lumière rosée de l'aube : à l'acte 4, le soleil monte
 * doucement jusqu'à la matinée, pour une récolte en plein jour (09:30, en HARVEST_GLIDE secondes).
 */
const HARVEST_MINUTE = 9 * 60 + 30
const HARVEST_GLIDE = 5

/** Soleil puis lune (directional light) qui suivent l'heure du store et teintent toute la scène */
export default function Sun() {
  const light = useRef<DirectionalLight>(null)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    let tween: gsap.core.Tween | null = null
    const unsubscribe = useGarden.subscribe((s, prev) => {
      // la montée continue si la récolte se termine avant la fin
      if (s.step === prev.step || s.step === 'end') return
      tween?.kill()
      tween = null
      if (s.step !== 'harvest' || prev.step !== 'wait') return
      const clock = { minute: Math.max(s.minute, SUNRISE) }
      tween = gsap.to(clock, {
        minute: HARVEST_MINUTE,
        duration: HARVEST_GLIDE,
        delay: 0.6,
        ease: 'power1.inOut',
        onUpdate: () => useGarden.setState({ minute: clock.minute }),
      })
    })
    return () => {
      unsubscribe()
      tween?.kill()
    }
  }, [])

  useFrame((_, delta) => {
    const l = light.current
    if (!l) return
    const minute = useGarden.getState().minute

    l.shadow.intensity = lightAt(minute, dir)
    l.position.copy(dir).multiplyScalar(2)

    sampleTint(minute, target)
    if (first) {
      tint.copy(target)
      first = false
    } else {
      tint.r = MathUtils.damp(tint.r, target.r, TINT_DAMPING, delta)
      tint.g = MathUtils.damp(tint.g, target.g, TINT_DAMPING, delta)
      tint.b = MathUtils.damp(tint.b, target.b, TINT_DAMPING, delta)
    }
    paintUniforms.uLightTint.value.copy(tint)
    // le fond suit la même lumière, et le sol se mélange à ce même fond
    paintUniforms.uBackground.value.copy(BG).multiply(tint)
    if (scene.background instanceof Color) scene.background.copy(paintUniforms.uBackground.value)
  })

  return (
    <directionalLight
      ref={light}
      castShadow
      intensity={1}
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-0.8}
      shadow-camera-right={0.8}
      shadow-camera-top={0.8}
      shadow-camera-bottom={-0.8}
      shadow-camera-near={0.5}
      shadow-camera-far={4}
      shadow-bias={-0.0004}
      shadow-normalBias={0.003}
      shadow-radius={4}
    />
  )
}
