import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import type { Material, Mesh, MeshStandardMaterial } from 'three'
import CameraRig from './CameraRig.tsx'
import Sun from './Sun.tsx'
import PostFX from './PostFX.tsx'
import Cinematic from './Cinematic.tsx'
import Ground from '../components/three/Ground.tsx'
import Pots from '../components/three/Pots.tsx'
import SeedPiles from '../components/three/SeedPiles.tsx'
import WateringCan from '../components/three/WateringCan.tsx'
import Water from '../components/three/Water.tsx'
import Plants from '../components/three/Plants.tsx'
import SowHint from '../components/ui/SowHint.tsx'
import { createPaintedMaterial } from '../materials/paintedMaterial.ts'
import { useUi } from '../stores/useUi.ts'
import { JARDIN_URL, PLANTES_URL } from './assets.ts'

// en dev, ?nofx coupe le post-process pour comparer avec les textures brutes
const NO_FX = import.meta.env.DEV && new URLSearchParams(location.search).has('nofx')

export default function Experience() {
  const { nodes, materials } = useGLTF(JARDIN_URL)
  const { nodes: plantNodes } = useGLTF(PLANTES_URL)

  // une version peinte (quasi unlit) de chaque matériau, sauf le sol qui a la sienne
  const painted = useMemo(() => {
    const out: Record<string, Material> = {}
    for (const [name, m] of Object.entries(materials)) {
      if (name !== 'Sol') out[name] = createPaintedMaterial(m as MeshStandardMaterial)
    }
    return out
  }, [materials])

  // monté seulement une fois les GLB chargés (Suspense) : le rideau de l'intro peut se lever
  useEffect(() => useUi.getState().setSceneReady(true), [])

  return (
    <>
      <CameraRig />
      <Cinematic />
      <Sun />

      <Ground mesh={nodes.Sol as Mesh} />
      <Pots pot={nodes.Pot} materials={painted} />
      <SeedPiles mesh={nodes.Graine as Mesh} material={painted.Graine} />
      <SowHint />
      <WateringCan mesh={nodes.Arrosoir as Mesh} material={painted.Arrosoir} />
      <Water mesh={nodes.Goute_d_eau as Mesh} material={painted.Goutte} />
      <Plants nodes={plantNodes} fruit={nodes.Fruit as Mesh} fruitMaterial={painted.Fruit} />

      {!NO_FX && <PostFX />}
    </>
  )
}

useGLTF.preload(JARDIN_URL)
useGLTF.preload(PLANTES_URL)
