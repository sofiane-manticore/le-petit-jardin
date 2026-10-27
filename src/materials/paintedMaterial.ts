import { Color, MeshLambertMaterial, type MeshStandardMaterial } from 'three'

/**
 * Uniforms partagés par tous les matériaux peints, pilotés par le soleil (scene/Sun.tsx).
 * - uLightTint : teinte globale de la lumière selon l'heure
 * - uShade : part du modelé N·L (0 = unlit pur, 1 = Lambert complet)
 * - uBackground : couleur du fond (linéaire), sur laquelle le sol se fond
 * - uGroundOpacity : opacité globale du sol, multipliée à son alpha peint
 */
export const paintUniforms = {
  uLightTint: { value: new Color(1, 1, 1) },
  uShade: { value: 0.14 },
  uBackground: { value: new Color(1, 1, 1) },
  uGroundOpacity: { value: 0.5 },
}

type PaintedOptions = {
  /** Fondu de l'alpha vers 0 sur les bords UV (fraction de la texture), pour le sol */
  edgeFade?: number
  /**
   * Mélange l'alpha avec le fond directement dans le shader, en espace sRGB, et rend la surface
   * opaque. Pour le sol, qui n'a que le fond derrière lui : même rendu qu'un mélange sRGB
   * classique, quel que soit le post-process, et plus aucun problème de tri de transparence.
   */
  blendOverBackground?: boolean
}

/**
 * Matériau quasi unlit : la texture peinte est affichée telle quelle, multipliée seulement par
 * la teinte du soleil, un très léger modelé et l'ombre portée du soleil.
 * Base Lambert pour profiter de la chaîne d'ombres de three (shadow map, getShadowMask) ;
 * l'éclairage Lambert calculé est ignoré à la sortie.
 */
export function createPaintedMaterial(
  source: MeshStandardMaterial,
  { edgeFade, blendOverBackground = false }: PaintedOptions = {},
) {
  const material = new MeshLambertMaterial({
    name: source.name,
    map: source.map,
    color: source.color,
    side: source.side,
    transparent: blendOverBackground ? false : source.transparent,
    opacity: source.opacity,
    alphaTest: source.alphaTest,
    depthWrite: blendOverBackground ? true : source.depthWrite,
  })

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLightTint = paintUniforms.uLightTint
    shader.uniforms.uShade = paintUniforms.uShade
    shader.uniforms.uBackground = paintUniforms.uBackground
    shader.uniforms.uGroundOpacity = paintUniforms.uGroundOpacity

    let frag = shader.fragmentShader
      .replace(
        '#include <shadowmap_pars_fragment>',
        `#include <shadowmap_pars_fragment>
         #include <shadowmask_pars_fragment>
         uniform vec3 uLightTint;
         uniform float uShade;
         uniform vec3 uBackground;
         uniform float uGroundOpacity;`,
      )
      .replace(
        'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
        // modelé adouci : N·L ramené dans [0, 1] (wrap), dont on ne garde qu'une petite part
        // l'ombre portée n'est appliquée que sur les faces tournées vers le soleil : les faces
        // à contre-jour restent peintes, sans quoi tout l'avant des objets s'assombrirait
        `float paintShade = 1.0;
         float paintShadow = getShadowMask();
         #if NUM_DIR_LIGHTS > 0
           float ndl = dot(normal, directionalLights[0].direction);
           paintShade = 1.0 - uShade * (1.0 - (ndl * 0.5 + 0.5));
           paintShadow = mix(1.0, paintShadow, smoothstep(-0.05, 0.25, ndl));
         #endif
         vec3 outgoingLight = diffuseColor.rgb * uLightTint * paintShade * paintShadow;`,
      )

    if (blendOverBackground) {
      frag = frag.replace(
        '#include <opaque_fragment>',
        `vec3 bgSrgb = sRGBTransferOETF(vec4(uBackground, 1.0)).rgb;
         vec3 litSrgb = sRGBTransferOETF(vec4(outgoingLight, 1.0)).rgb;
         outgoingLight = sRGBTransferEOTF(vec4(mix(bgSrgb, litSrgb, diffuseColor.a * uGroundOpacity), 1.0)).rgb;
         diffuseColor.a = 1.0;
         #include <opaque_fragment>`,
      )
    }

    if (edgeFade !== undefined) {
      shader.uniforms.uEdgeFade = { value: edgeFade }
      frag = frag
        .replace('void main() {', 'uniform float uEdgeFade;\nvoid main() {')
        .replace(
          '#include <alphatest_fragment>',
          // distance UV au bord le plus proche → 0 sur le bord, 1 à partir de uEdgeFade
          `vec2 edgeUv = min(vMapUv, 1.0 - vMapUv);
           diffuseColor.a *= smoothstep(0.0, uEdgeFade, min(edgeUv.x, edgeUv.y));
           #include <alphatest_fragment>`,
        )
    }
    shader.fragmentShader = frag
  }
  material.customProgramCacheKey = () =>
    `painted${edgeFade !== undefined ? '-edge-fade' : ''}${blendOverBackground ? '-over-bg' : ''}`

  return material
}
