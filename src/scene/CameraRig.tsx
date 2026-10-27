import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { useGarden } from '../stores/useGarden.ts'
import { useUi } from '../stores/useUi.ts'
import { shot } from './cinema.ts'

// Vue fixe de biais : la caméra tourne autour du jardin (azimut, depuis la gauche) et plonge.
// En portrait, l'azimut est plus fort : la ligne graines → pots → arrosoir part en profondeur
// et occupe la hauteur de l'écran au lieu d'être écrasée dans la largeur.
const VIEW_LANDSCAPE = { azimuth: -30, elevation: 38 }
const VIEW_PORTRAIT = { azimuth: -72, elevation: 48 }
// Centre visé et boîte englobante du jardin (tas de graines → arrosoir), en mètres
const TARGET = new Vector3(0.02, 0.04, 0)
const CONTENT_MIN = new Vector3(-0.56, 0, -0.24)
const CONTENT_MAX = new Vector3(0.6, 0.21, 0.24)
// Part de l'écran que le jardin peut occuper : le haut est réservé au texte, le bas à la timeline
const FILL_X = 0.9
const FILL_Y = 0.62
// Décalage vertical de l'image (fraction de la hauteur) : le jardin descend sous le texte
const SHIFT_Y = 0.06

const CORNERS = Array.from({ length: 8 }, (_, i) =>
  new Vector3(
    i & 1 ? CONTENT_MAX.x : CONTENT_MIN.x,
    i & 2 ? CONTENT_MAX.y : CONTENT_MIN.y,
    i & 4 ? CONTENT_MAX.z : CONTENT_MIN.z,
  ).sub(TARGET),
)

function viewDirection({ azimuth, elevation }: { azimuth: number; elevation: number }, out = new Vector3()) {
  const az = MathUtils.degToRad(azimuth)
  const el = MathUtils.degToRad(elevation)
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
}

/**
 * Distance minimale pour que tous les coins de la boîte tiennent dans le champ.
 * Pour un point q (relatif à la cible), avec f la direction caméra → cible : sa profondeur vaut
 * d − q·dir, et il faut |q·right| ≤ profondeur × tanX (idem en Y). D'où d ≥ |q·right| / tanX + q·dir.
 */
const _right = new Vector3()
const _up = new Vector3()
function fitDistance(dir: Vector3, tanX: number, tanY: number) {
  const right = _right.set(0, 1, 0).cross(dir).normalize()
  const up = _up.copy(dir).cross(right).normalize()
  let d = 0
  for (const q of CORNERS) {
    d = Math.max(d, Math.abs(q.dot(right)) / tanX + q.dot(dir), Math.abs(q.dot(up)) / tanY + q.dot(dir))
  }
  return d
}

// Zoom léger : ±20 % autour du cadrage de base
const ZOOM_MIN = 0.8
const ZOOM_MAX = 1.2
const WHEEL_SPEED = 0.0012
// Pendant l'acte 3, la caméra fait un tour complet du jardin : l'azimut avance avec la pousse
// (0 → 1 sur les 15 jours), elle revient donc exactement à son angle de départ au 15e jour
const ORBIT_FOLLOW = 6
const _dir = new Vector3()

export default function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  const dom = useThree((s) => s.gl.domElement)

  const zoom = useRef({ current: 1, target: 1 })

  // vue de base et champ utile, recalculés quand le ratio d'écran change
  const view = useMemo(() => {
    const tanY = Math.tan(MathUtils.degToRad(camera.fov) / 2)
    const tanX = tanY * (width / height)
    return { base: width < height ? VIEW_PORTRAIT : VIEW_LANDSCAPE, tanX: tanX * FILL_X, tanY: tanY * FILL_Y }
  }, [camera, width, height])
  const orbit = useRef(0)
  const wasCinema = useRef(false)

  // décale l'image vers le bas sans changer l'angle de vue
  useEffect(() => {
    camera.setViewOffset(width, height, 0, -SHIFT_Y * height, width, height)
    return () => camera.clearViewOffset()
  }, [camera, width, height])

  useEffect(() => {
    const z = zoom.current
    const clamp = (v: number) => MathUtils.clamp(v, ZOOM_MIN, ZOOM_MAX)

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      // molette vers soi (deltaY < 0) = zoom avant = caméra plus proche
      z.target = clamp(z.target * Math.exp(e.deltaY * WHEEL_SPEED))
    }

    // pinch : écart entre les deux doigts posés sur le canvas
    const touches = new Map<number, { x: number; y: number }>()
    let pinchStart = 0
    let zoomAtPinch = 1
    const spread = () => {
      const [a, b] = [...touches.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size === 2) {
        pinchStart = spread()
        zoomAtPinch = z.target
      }
    }
    const onMove = (e: PointerEvent) => {
      if (!touches.has(e.pointerId)) return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size === 2 && pinchStart > 0) {
        z.target = clamp(zoomAtPinch * (pinchStart / Math.max(1, spread())))
      }
    }
    const onUp = (e: PointerEvent) => {
      touches.delete(e.pointerId)
      if (touches.size < 2) pinchStart = 0
    }

    dom.addEventListener('wheel', onWheel, { passive: false })
    dom.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      dom.removeEventListener('wheel', onWheel)
      dom.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dom])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20)

    const cinema = useUi.getState().cinema
    // le décalage d'image (place pour le texte) n'a pas lieu d'être en plein écran cinématique
    if (cinema === !!camera.view?.enabled) {
      if (cinema) camera.clearViewOffset()
      else camera.setViewOffset(width, height, 0, -SHIFT_Y * height, width, height)
    }

    if (cinema) {
      // plan rapproché : la caméra colle au travelling (linéaire, sans lissage qui l'adoucirait)
      camera.position.copy(shot.position)
      camera.lookAt(shot.look)
      wasCinema.current = true
      return
    }

    // tour du jardin : un tour par cycle de pousse ; amorti pour absorber les sauts (panneau dev)
    const target = useGarden.getState().growth * 360
    orbit.current = wasCinema.current ? target : MathUtils.damp(orbit.current, target, ORBIT_FOLLOW, dt)
    wasCinema.current = false
    const dir = viewDirection({ azimuth: view.base.azimuth + orbit.current, elevation: view.base.elevation }, _dir)
    // le cadrage est recalculé pour chaque angle : vu de côté, le jardin est moins large
    const distance = fitDistance(dir, view.tanX, view.tanY)

    const z = zoom.current
    z.current = MathUtils.damp(z.current, z.target, 8, delta)
    camera.position.copy(dir).multiplyScalar(distance * z.current).add(TARGET)
    camera.lookAt(TARGET)
  })

  return null
}
