import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, DepthOfField, EffectComposer } from '@react-three/postprocessing'
import { BlendFunction, type DepthOfFieldEffect, Effect } from 'postprocessing'
import { Uniform } from 'three'
import { useUi } from '../stores/useUi.ts'
import { shot } from './cinema.ts'

// Étalonnage chaud, vignette douce et grain animé, en une seule passe
const gradeFragment = /* glsl */ `
uniform float uWarmth;
uniform float uContrast;
uniform float uSaturation;
uniform float uVignette;
uniform float uGrain;

// hash 3D sans motif visible (Dave Hoskins, « Hash without Sine ») : un tirage indépendant
// par pixel et par image, contrairement à rand() qui glisse en diagonale quand on décale son entrée
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // l'étalonnage se fait en espace perceptuel (≈ sRGB), plus prévisible qu'en linéaire
  vec3 c = pow(max(inputColor.rgb, 0.0), vec3(1.0 / 2.2));
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));

  // saturation légèrement remontée, pour compenser le voile du bloom
  c = mix(vec3(luma), c, 1.0 + uSaturation);

  // chaleur : on pousse le rouge, on retire du bleu, surtout dans les tons moyens et sombres
  vec3 warm = c * vec3(1.0 + 0.06 * uWarmth, 1.0 + 0.012 * uWarmth, 1.0 - 0.09 * uWarmth);
  c = mix(c, warm, 1.0 - 0.5 * luma);

  // courbe en S légère
  c = clamp(c, 0.0, 1.0);
  c = mix(c, c * c * (3.0 - 2.0 * c), uContrast);

  // vignette, un peu plus large que haute
  vec2 d = (uv - 0.5) * vec2(1.0, 0.85);
  c *= 1.0 - uVignette * smoothstep(0.25, 0.75, length(d));

  // grain : renouvelé 12 fois par seconde, plus visible dans les tons moyens
  float frame = mod(floor(time * 12.0), 512.0);
  float n = hash13(vec3(floor(uv * resolution / 1.5), frame)) - 0.5;
  c += n * uGrain * (1.0 - abs(luma - 0.5) * 1.2);

  outputColor = vec4(pow(max(c, 0.0), vec3(2.2)), inputColor.a);
}
`

class GradeEffect extends Effect {
  constructor({ warmth = 1, contrast = 0.1, saturation = 0.1, vignette = 0.2, grain = 0.045 } = {}) {
    super('GradeEffect', gradeFragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['uWarmth', new Uniform(warmth)],
        ['uContrast', new Uniform(contrast)],
        ['uSaturation', new Uniform(saturation)],
        ['uVignette', new Uniform(vignette)],
        ['uGrain', new Uniform(grain)],
      ]),
    })
  }
}

/** Post-process : bloom marqué et chaleureux, puis étalonnage et grain */
export default function PostFX() {
  const grade = useMemo(() => new GradeEffect(), [])
  const cinema = useUi((s) => s.cinema)
  const dof = useRef<DepthOfFieldEffect>(null)
  // la prop `target` n'est copiée qu'une fois : le point net suit le sujet du plan à chaque image
  useFrame(() => void dof.current?.target?.copy(shot.focus))

  return (
    // la profondeur de champ lit le tampon de profondeur, incompatible avec le MSAA du composer
    // (blit refusé par WebGL) : en mode cinématique, le composer est recréé sans multisampling
    <EffectComposer key={cinema ? 'cinema' : 'jeu'} multisampling={cinema ? 0 : 4}>
      {/* mode cinématique : profondeur de champ prononcée, netteté sur le sujet du plan (6 cm) */}
      {cinema && <DepthOfField ref={dof} target={shot.focus} worldFocusRange={0.06} bokehScale={5} resolutionScale={0.5} />}
      <Bloom mipmapBlur intensity={1.6} luminanceThreshold={0.7} luminanceSmoothing={0.3} radius={0.72} />
      <primitive object={grade} />
    </EffectComposer>
  )
}
