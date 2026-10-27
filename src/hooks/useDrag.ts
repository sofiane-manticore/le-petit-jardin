import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { type ThreeEvent, useThree } from '@react-three/fiber'
import { Plane, Raycaster, type Ray, Vector2, Vector3 } from 'three'

export type DragPoint = {
  /** Pointeur projeté sur le plan horizontal de drag */
  point: Vector3
  /** Rayon caméra → pointeur, pour d'autres projections (sur la terre des pots par exemple) */
  ray: Ray
}

export type DragHandlers = {
  onStart?: (p: DragPoint) => void
  onMove?: (p: DragPoint) => void
  onEnd?: (p: DragPoint) => void
}

// objets de travail, créés au premier drag et réutilisés ensuite
const createTools = () => ({
  raycaster: new Raycaster(),
  ndc: new Vector2(),
  plane: new Plane(new Vector3(0, 1, 0), 0),
  drag: { point: new Vector3(), ray: null as unknown as Ray } as DragPoint,
})

/**
 * Drag d'un objet 3D sur un plan horizontal à la hauteur `planeY`, à la souris comme au doigt.
 * Renvoie le handler `onPointerDown` à poser sur l'objet saisissable ; le suivi se fait ensuite
 * sur window, pour ne pas perdre le pointeur s'il sort de l'objet ou du canvas.
 * Les objets passés aux callbacks sont réutilisés d'un appel à l'autre : les copier si besoin.
 */
export function useDrag(planeY: number, handlers: DragHandlers, enabled = true) {
  const camera = useThree((s) => s.camera)
  const dom = useThree((s) => s.gl.domElement)

  const handlersRef = useRef(handlers)
  useLayoutEffect(() => {
    handlersRef.current = handlers
  })

  const toolsRef = useRef<ReturnType<typeof createTools> | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      // souris : bouton gauche seulement (le droit sert à verser)
      if (!enabled || e.button !== 0 || stopRef.current) return
      e.stopPropagation()
      const id = e.pointerId
      toolsRef.current ??= createTools()
      const { raycaster, ndc, plane, drag } = toolsRef.current
      plane.constant = -planeY

      const project = (ev: PointerEvent) => {
        const rect = dom.getBoundingClientRect()
        ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1)
        // la matrice de projection inclut le décalage de vue de CameraRig : le rayon suit l'image
        raycaster.setFromCamera(ndc, camera)
        drag.ray = raycaster.ray
        // rayon parallèle au plan (impossible avec la caméra plongeante) : on garde le point précédent
        raycaster.ray.intersectPlane(plane, drag.point)
        return drag
      }

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return
        // souris : le bouton gauche a été relâché alors qu'un autre (le droit, pour verser) reste
        // enfoncé ; pointerup n'arrive qu'au relâché du dernier bouton, on termine donc ici
        if (ev.pointerType === 'mouse' && (ev.buttons & 1) === 0) return onUp(ev)
        handlersRef.current.onMove?.(project(ev))
      }
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return
        stop()
        handlersRef.current.onEnd?.(project(ev))
      }
      const stop = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        stopRef.current = null
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      stopRef.current = stop
      handlersRef.current.onStart?.(project(e.nativeEvent))
    },
    [enabled, planeY, dom, camera],
  )

  useEffect(() => () => stopRef.current?.(), [])

  return onPointerDown
}
