import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { Color, type Material, MathUtils, type Mesh, type MeshLambertMaterial, type MeshStandardMaterial, type Object3D } from 'three'
import { POTS } from '../../scene/layout.ts'
import { WATER_NEEDED, waterReceived } from '../../scene/watering.ts'
import { createPaintedMaterial } from '../../materials/paintedMaterial.ts'
import { useHighlight } from '../../hooks/useHighlight.ts'
import { useGarden } from '../../stores/useGarden.ts'
import { useUi } from '../../stores/useUi.ts'
import { SUCTION_DURATION } from './SeedPiles.tsx'
import { potObjects } from '../../scene/potObjects.ts'

// Terre mouillée : teinte multipliée à la texture (linéaire), et vitesse à laquelle elle fonce
const DRY = new Color(1, 1, 1)
const WET = new Color(0.3, 0.24, 0.23)
const WETTING_SPEED = 3

type PotClone = { object: Object3D; soil: MeshLambertMaterial | null }

/**
 * Un pot : mis en valeur quand un tas de graines ou l'arrosoir le vise, il « avale » les graines
 * au semis, et sa terre fonce à mesure qu'elle reçoit de l'eau.
 */
function Pot({ clone: { object, soil }, index }: { clone: PotClone; index: number }) {
  const targeted = useUi((s) => s.seedTarget === index || s.waterTarget === index)
  const seeded = useGarden((s) => s.pots[index].seeded)
  const watered = useGarden((s) => s.pots[index].watered)
  useHighlight(object, targeted)

  // les graines posées sur la terre suivent les rebonds du pot (SeedPiles)
  useEffect(() => {
    potObjects[index] = object
    return () => {
      potObjects[index] = null
    }
  }, [object, index])

  // les graines arrivent : petit écrasement (squash) puis retour élastique
  useEffect(() => {
    if (!seeded) return
    const tl = gsap
      .timeline({ delay: SUCTION_DURATION * 0.6 })
      .to(object.scale, { x: 1.06, y: 0.92, z: 1.06, duration: 0.12, ease: 'power2.out' })
      .to(object.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'elastic.out(1, 0.35)' })
    return () => {
      tl.kill()
    }
  }, [seeded, object])

  // assez d'eau : le pot se gonfle un instant, comme s'il buvait
  useEffect(() => {
    if (!watered) return
    const tl = gsap
      .timeline()
      .to(object.scale, { x: 0.97, y: 1.07, z: 0.97, duration: 0.16, ease: 'power2.out' })
      .to(object.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'elastic.out(1, 0.3)' })
    return () => {
      tl.kill()
    }
  }, [watered, object])

  // la terre fonce avec l'eau reçue (toute mouillée une fois le pot arrosé, panneau dev compris)
  const wet = useRef(0)
  useFrame((_, delta) => {
    if (!soil) return
    const level = watered ? 1 : Math.min(1, waterReceived[index] / WATER_NEEDED)
    if (Math.abs(level - wet.current) < 1e-4) return
    wet.current = MathUtils.damp(wet.current, level, WETTING_SPEED, Math.min(delta, 1 / 20))
    if (level === 0 && wet.current < 1e-3) wet.current = 0
    soil.color.copy(DRY).lerp(WET, wet.current)
  })

  return <primitive object={object} name={`Pot_${index + 1}`} position={POTS[index].position} rotation-y={POTS[index].rotationY} />
}

/**
 * Les 4 pots : clones du groupe `Pot` (PotDeFleur + Terre) aux emplacements de la composition.
 * Chaque pot a sa propre terre (matériau peint à part), pour qu'elle fonce indépendamment.
 */
export default function Pots({ pot, materials }: { pot: Object3D; materials: Record<string, Material> }) {
  const clones = useMemo(
    () =>
      POTS.map((): PotClone => {
        const object = pot.clone()
        let soil: MeshLambertMaterial | null = null
        object.traverse((child) => {
          const mesh = child as Mesh
          if (!mesh.isMesh) return
          // les meshes du pot gardent le nom FBX : on passe par le nom du matériau
          const source = mesh.material as MeshStandardMaterial
          if (source.name === 'Terre') {
            soil = createPaintedMaterial(source)
            mesh.material = soil
          } else {
            mesh.material = materials[source.name]
          }
          mesh.castShadow = true
          mesh.receiveShadow = true
        })
        return { object, soil }
      }),
    [pot, materials],
  )
  useEffect(() => () => clones.forEach((c) => c.soil?.dispose()), [clones])

  return (
    <>
      {clones.map((clone, i) => (
        <Pot key={i} clone={clone} index={i} />
      ))}
    </>
  )
}
