import { useEffect, useMemo } from 'react'
import type { Mesh, MeshStandardMaterial } from 'three'
import { createPaintedMaterial } from '../../materials/paintedMaterial.ts'

// Largeur du fondu sur chaque bord, en fraction de la texture (0.5 = jusqu'au centre)
const EDGE_FADE = 0.14

/**
 * Sol exporté de Blender, au centre de la scène. Le masque alpha peint est mélangé au fond dans
 * le shader (sol opaque, voir blendOverBackground). Il ne tombe pas tout à fait à 0 au bord du
 * plan, ce qui laissait voir un rectangle : le fondu des bords le fait disparaître.
 */
export default function Ground({ mesh }: { mesh: Mesh }) {
  const material = useMemo(
    () => createPaintedMaterial(mesh.material as MeshStandardMaterial, { edgeFade: EDGE_FADE, blendOverBackground: true }),
    [mesh],
  )
  useEffect(() => () => material.dispose(), [material])

  return (
    <mesh
      name="Sol"
      geometry={mesh.geometry}
      material={material}
      receiveShadow
    />
  )
}
