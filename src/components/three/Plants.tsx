import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  type InstancedMesh,
  type LineSegments,
  type Material,
  MathUtils,
  Matrix3,
  Matrix4,
  type Mesh,
  MeshDepthMaterial,
  MeshStandardMaterial,
  type Object3D,
  Quaternion,
  RGBADepthPacking,
  TubeGeometry,
  Vector3,
  type WebGLProgramParametersWithUniforms,
} from 'three'
import { createPaintedMaterial } from '../../materials/paintedMaterial.ts'
import {
  buildTemplate,
  LEAF_GROW,
  type PlantInstance,
  placePlants,
  plantTime,
  type Template,
  TUBE_SIDES,
  tubeSegments,
} from '../../scene/plants.ts'
import { plantGrowth } from '../../scene/growth.ts'
import { useGarden } from '../../stores/useGarden.ts'
import Fruits, { type FruitAnchor } from './Fruits.tsx'

const STEM_NAMES = ['Curve_TigePlante_1', 'Curve_TigePlante_2', 'Curve_TigePlante_3']
const LEAF_NAMES = ['Feuille_1', 'Feuille_2', 'Feuille_3']

// Couleur de la tige (sRGB) : plus sombre au pied, plus tendre vers la pointe, prise sur la feuille
const STEM_BASE = new Color('#55782a')
const STEM_TIP = new Color('#8db248')
/** Longueur de la pointe effilée qui avance avec la pousse, en temps de plante */
const TIP = 0.035
/** Les tiges s'épaississent avec l'âge : rayon à la naissance, relatif au rayon adulte */
const YOUNG_RADIUS = 0.5
/** La pousse affichée rattrape celle du store en douceur (1/s) */
const GROWTH_DAMPING = 4
/**
 * Taille des feuilles par rapport aux modèles de Blender. À l'échelle 1 (2,5 cm), elles se
 * perdaient à la distance de la caméra face à des tiges de 20 cm et à un fruit de 4,6 cm.
 */
const LEAF_SCALE = 1.5
/** Angle d'une feuille qui vient d'éclore, plaquée contre la tige, avant de s'ouvrir (rad) */
const LEAF_FOLDED = 1.3

/**
 * Le tube grandit dans le vertex shader : chaque sommet connaît le temps de plante où la pousse
 * l'atteint (aReach). Avant, son rayon est nul et il reste invisible sur l'axe de la tige ;
 * juste après, il s'élargit, ce qui fait une pointe effilée qui monte le long de la courbe.
 */
const stemVertex = /* glsl */ `
  attribute vec3 aOffset;
  attribute float aRadius;
  attribute float aReach;
  attribute float aPlant;
  uniform float uGrow[8];
  uniform float uTip;
  uniform float uYoung;
`
const stemBegin = /* glsl */ `
  float plantU = uGrow[int(aPlant + 0.5)];
  float reached = clamp((plantU - aReach) / uTip, 0.0, 1.0);
  vec3 transformed = position + aOffset * aRadius * reached * mix(uYoung, 1.0, plantU);
`

/** Temps de plante de chacune des 8 plantes, partagé par le matériau de la tige et son ombre */
const stemUniforms = {
  uGrow: { value: new Array<number>(8).fill(0) },
  uTip: { value: TIP },
  uYoung: { value: YOUNG_RADIUS },
}

function growStem(shader: WebGLProgramParametersWithUniforms, uniforms: Record<string, { value: unknown }>) {
  Object.assign(shader.uniforms, uniforms)
  shader.vertexShader = shader.vertexShader
    .replace('void main() {', `${stemVertex}\nvoid main() {`)
    .replace('#include <begin_vertex>', stemBegin)
}

/** Fusionne les tubes de toutes les chaînes des 8 plantes en une seule géométrie (un seul draw call) */
function buildStems(templates: Template[], plants: PlantInstance[]) {
  const positions: number[] = []
  const normals: number[] = []
  const offsets: number[] = []
  const colors: number[] = []
  const radius: number[] = []
  const reach: number[] = []
  const plantIndex: number[] = []
  const indices: number[] = []
  const center = new Vector3()
  const normal = new Vector3()
  const color = new Color()
  const normalMatrix = new Matrix3()

  plants.forEach((plant, p) => {
    const scale = new Vector3().setFromMatrixScale(plant.matrix).x
    normalMatrix.getNormalMatrix(plant.matrix)
    templates[plant.template].chains.forEach((chain, c) => {
      const segments = tubeSegments(chain)
      // tube de rayon 1 : position − normale donne le point de l'axe
      const tube = new TubeGeometry(chain.curve, segments, 1, TUBE_SIDES, false)
      const pos = tube.getAttribute('position')
      const nor = tube.getAttribute('normal')
      const first = positions.length / 3
      for (let v = 0; v < pos.count; v++) {
        const t = Math.floor(v / (TUBE_SIDES + 1)) / segments
        normal.fromBufferAttribute(nor, v)
        center.fromBufferAttribute(pos, v).sub(normal).applyMatrix4(plant.matrix)
        normal.applyMatrix3(normalMatrix).normalize()
        positions.push(center.x, center.y, center.z)
        normals.push(normal.x, normal.y, normal.z)
        offsets.push(normal.x, normal.y, normal.z)
        radius.push(MathUtils.lerp(chain.radius[0], chain.radius[1], t) * scale)
        reach.push(chain.start + t * chain.duration)
        plantIndex.push(p)
        // dégradé : du pied de la plante à la pointe des rameaux
        color.copy(STEM_BASE).lerp(STEM_TIP, c === 0 ? t * 0.7 : 0.5 + t * 0.5)
        colors.push(color.r, color.g, color.b)
      }
      const index = tube.getIndex()!
      for (let i = 0; i < index.count; i++) indices.push(first + index.getX(i))
      tube.dispose()
    })
  })

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3))
  geometry.setAttribute('aOffset', new BufferAttribute(new Float32Array(offsets), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
  geometry.setAttribute('aRadius', new BufferAttribute(new Float32Array(radius), 1))
  geometry.setAttribute('aReach', new BufferAttribute(new Float32Array(reach), 1))
  geometry.setAttribute('aPlant', new BufferAttribute(new Float32Array(plantIndex), 1))
  geometry.setIndex(indices)
  // l'axe des tubes suffit pour le culling : les rayons font quelques millimètres
  geometry.computeBoundingSphere()
  geometry.boundingSphere!.radius += 0.01
  return geometry
}

// objets de travail de la boucle d'animation
const _local = new Matrix4()
const _basis = new Matrix4()
const _m = new Matrix4()
const _p = new Vector3()
const _t = new Vector3()
const _n0 = new Vector3()
const _b0 = new Vector3()
const _d = new Vector3()
const _x = new Vector3()
const _y = new Vector3()
const _z = new Vector3()
const _s = new Vector3()
const _q = new Quaternion()
const _roll = new Quaternion()
const UP = new Vector3(0, 1, 0)
const X_AXIS = new Vector3(1, 0, 0)
const ZERO = new Matrix4().makeScale(0, 0, 0)

/** Petite sortie élastique : la feuille dépasse un peu sa taille puis revient */
function easeOutBack(x: number) {
  const c = 1.6
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2
}

/**
 * Repère d'une feuille dans le repère de la plante : pétiole sur la tige, limbe (+Z de Blender)
 * vers l'extérieur et relevé vers le haut, face (+Y) tournée vers le ciel.
 */
function leafBasis(template: Template, leaf: PlantInstance['leaves'][number], t: number, open: number, out: Matrix4) {
  const curve = template.chains[leaf.chain].curve
  curve.getPointAt(t, _p)
  curve.getTangentAt(t, _t)
  if (leaf.terminal) {
    // dans le prolongement de la pointe, un peu relevée
    _z.copy(_t).addScaledVector(UP, 0.35).normalize()
  } else {
    _n0.crossVectors(_t, Math.abs(_t.y) < 0.9 ? UP : X_AXIS).normalize()
    _b0.crossVectors(_t, _n0)
    _d.copy(_n0).multiplyScalar(Math.cos(leaf.azimuth)).addScaledVector(_b0, Math.sin(leaf.azimuth))
    // en s'ouvrant, la feuille passe de plaquée contre la tige à son angle final
    const lift = MathUtils.lerp(LEAF_FOLDED, leaf.lift, open)
    _z.copy(_d).multiplyScalar(Math.cos(lift)).addScaledVector(_t, Math.sin(lift)).normalize()
  }
  _y.copy(UP).addScaledVector(_z, -UP.dot(_z))
  if (_y.lengthSq() < 1e-6) _y.copy(_t)
  _y.normalize()
  _q.setFromRotationMatrix(_basis.makeBasis(_x.crossVectors(_y, _z), _y, _z))
  _q.multiply(_roll.setFromAxisAngle(_z.set(0, 0, 1), leaf.roll))
  return out.compose(_p, _q, _s.set(1, 1, 1))
}

type LeafSlot = { plant: number; leaf: number }

/**
 * Les 8 plantes de l'acte 3 (2 par pot) : tiges de Blender en tubes qui s'allongent, feuilles
 * qui éclosent le long de la tige et s'ouvrent. Tout suit la pousse du store (jours écoulés).
 */
export default function Plants({
  nodes,
  fruit,
  fruitMaterial,
}: {
  nodes: Record<string, Object3D>
  fruit: Mesh
  fruitMaterial: Material
}) {
  const templates = useMemo(() => STEM_NAMES.map((n) => buildTemplate((nodes[n] as LineSegments).geometry)), [nodes])
  const plants = useMemo(() => placePlants(templates), [templates])

  // le fruit pend sous son rameau, à la verticale quelle que soit l'inclinaison de la plante
  const fruitAnchors = useMemo(
    () =>
      plants.map((plant, i): FruitAnchor => {
        const { chain, t } = templates[plant.template].fruit
        const position = templates[plant.template].chains[chain].curve.getPointAt(t, new Vector3()).applyMatrix4(plant.matrix)
        // un peu sous l'axe du rameau, pour que l'attache ne flotte pas au-dessus
        position.y -= 0.002
        const scale = new Vector3().setFromMatrixScale(plant.matrix).x
        return { pot: plant.pot, plant: plant.plant, position, scale, rotationY: i * 2.1 }
      }),
    [plants, templates],
  )

  const stems = useMemo(() => {
    const uniforms = stemUniforms
    const material = createPaintedMaterial(new MeshStandardMaterial({ color: 0xffffff, side: DoubleSide }))
    material.vertexColors = true
    const painted = material.onBeforeCompile
    material.onBeforeCompile = (shader, renderer) => {
      painted(shader, renderer)
      growStem(shader, uniforms)
    }
    material.customProgramCacheKey = () => 'painted-stem'
    const depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking })
    depth.onBeforeCompile = (shader) => growStem(shader, uniforms)
    return { geometry: buildStems(templates, plants), material, depth }
  }, [templates, plants])
  useEffect(
    () => () => {
      stems.geometry.dispose()
      stems.material.dispose()
      stems.depth.dispose()
    },
    [stems],
  )

  // feuilles : un InstancedMesh par modèle de feuille, pour les 8 plantes
  const leaves = useMemo(() => {
    const slots: LeafSlot[][] = LEAF_NAMES.map(() => [])
    plants.forEach((plant, p) => plant.leaves.forEach((leaf, l) => slots[leaf.variant].push({ plant: p, leaf: l })))
    const source = (nodes[LEAF_NAMES[0]] as Mesh).material as MeshStandardMaterial
    const material = createPaintedMaterial(source)
    return { slots, material }
  }, [plants, nodes])
  useEffect(() => () => leaves.material.dispose(), [leaves])
  const leafRefs = useRef<(InstancedMesh | null)[]>([])

  const shown = useRef(-1)
  useFrame((_, delta) => {
    const target = useGarden.getState().growth
    plantGrowth.value = MathUtils.damp(plantGrowth.value, target, GROWTH_DAMPING, Math.min(delta, 1 / 20))
    if (Math.abs(plantGrowth.value - target) < 1e-4) plantGrowth.value = target
    if (plantGrowth.value === shown.current) return
    shown.current = plantGrowth.value

    const u = plants.map((plant) => plantTime(plantGrowth.value, plant.delay))
    for (let i = 0; i < u.length; i++) stemUniforms.uGrow.value[i] = u[i]

    leaves.slots.forEach((slots, variant) => {
      const mesh = leafRefs.current[variant]
      if (!mesh) return
      const node = nodes[LEAF_NAMES[variant]]
      slots.forEach(({ plant: p, leaf: l }, i) => {
        const plant = plants[p]
        const leaf = plant.leaves[l]
        const age = (u[p] - leaf.birth) / LEAF_GROW
        if (age <= 0) {
          mesh.setMatrixAt(i, ZERO)
          return
        }
        const open = Math.min(1, age)
        // chaque feuille reste à l'endroit où elle est née : seule son ouverture l'anime
        leafBasis(templates[plant.template], leaf, leaf.t, open, _local)
        const size = node.scale.x * LEAF_SCALE * leaf.size * easeOutBack(open)
        _m.copy(plant.matrix).multiply(_local).multiply(_basis.makeScale(size, size, size))
        mesh.setMatrixAt(i, _m)
      })
      mesh.instanceMatrix.needsUpdate = true
    })
  })

  return (
    <group name="Plantes">
      <mesh
        name="Tiges"
        geometry={stems.geometry}
        material={stems.material}
        customDepthMaterial={stems.depth}
        castShadow
        receiveShadow
      />
      {leaves.slots.map((slots, variant) => (
        <instancedMesh
          key={variant}
          ref={(m) => {
            leafRefs.current[variant] = m
          }}
          name={LEAF_NAMES[variant]}
          args={[(nodes[LEAF_NAMES[variant]] as Mesh).geometry, leaves.material as Material, slots.length]}
          frustumCulled={false}
          castShadow
          receiveShadow
        />
      ))}
      <Fruits anchors={fruitAnchors} mesh={fruit} material={fruitMaterial} />
    </group>
  )
}
