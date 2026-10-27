import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { S, buildWorld } from './world.js'

/** Charge les deux GLB exportés de Blender et monte le monde du film */
export default function Scene({ onReady }) {
  const jardin = useGLTF('/models/jardin.glb')
  const plantes = useGLTF('/models/plantes.glb')
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const root = useMemo(() => buildWorld(jardin.scene, plantes.scene), [jardin, plantes])

  useEffect(() => {
    S.camera = camera
    S.gl = gl
    onReady()
  }, [camera, gl, onReady])

  return <primitive object={root} />
}
