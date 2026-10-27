import { useEffect, useMemo, useRef } from 'react'
import { type ThreeEvent, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { type Camera, type Group, type Material, MathUtils, type Mesh, Sphere, Vector3 } from 'three'
import { useGarden } from '../../stores/useGarden.ts'
import { COARSE_POINTER } from '../../lib/device.ts'
import { fruitPickers } from '../../scene/harvest.ts'
import { fruitAppear, fruitPick } from '../../audio/sfx.ts'

/** Fruit de Blender (6,4 cm de haut) ramené à la taille des plantes */
const FRUIT_SCALE = 0.72
/** Délai après la fin du jour 15, puis écart entre deux fruits, en secondes */
const POP_DELAY = 0.35
const POP_STAGGER = 0.11
/** Zone cliquable autour du fruit, relative à sa sphère englobante (plus large au doigt) */
const HIT_SCALE = COARSE_POINTER ? 2.4 : 1.35
/** Distance caméra → point d'arrivée du vol, devant le compteur de récolte (m) */
const FLIGHT_DEPTH = 0.45
/** Hauteur de la cloche du vol au-dessus du point de départ (m) */
const FLIGHT_ARC = 0.1
const FLIGHT_DURATION = 0.75

export type FruitAnchor = {
  pot: number
  plant: number
  /** Point d'attache sur le rameau (monde) ; le fruit pend dessous */
  position: Vector3
  scale: number
  rotationY: number
}

/** Fruits en vol vers le compteur : chacun vise la case suivante du compteur */
let flying = 0

const _ndc = new Vector3()
const _end = new Vector3()
const _ctrl = new Vector3()

/** Point du monde devant la case `slot` du compteur de récolte (HTML), à FLIGHT_DEPTH de la caméra */
function slotTarget(camera: Camera, dom: HTMLElement, slot: number, out: Vector3) {
  const el = document.querySelector(`[data-harvest-slot="${slot}"]`)
  const rect = dom.getBoundingClientRect()
  let x = rect.width / 2
  let y = rect.height - 60
  if (el) {
    const r = el.getBoundingClientRect()
    x = r.left + r.width / 2 - rect.left
    y = r.top + r.height / 2 - rect.top
  }
  // unproject suit la matrice de projection, décalage de vue de CameraRig compris
  _ndc.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1, 0.5).unproject(camera)
  return out.copy(_ndc).sub(camera.position).normalize().multiplyScalar(FLIGHT_DEPTH).add(camera.position)
}

type FruitProps = { anchor: FruitAnchor; order: number; mesh: Mesh; material: Material; hit: Sphere }

function Fruit({ anchor, order, mesh, material, hit }: FruitProps) {
  const ref = useRef<Group>(null)
  const camera = useThree((s) => s.camera)
  const dom = useThree((s) => s.gl.domElement)
  const ripe = useGarden((s) => s.step === 'harvest' || s.step === 'end')
  const picked = useGarden((s) => s.harvested.some((h) => h.pot === anchor.pot && h.plant === anchor.plant))
  const visible = ripe && !picked

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const pickingRef = useRef(false)

  useEffect(() => {
    const g = ref.current
    if (!g) return
    const size = FRUIT_SCALE * anchor.scale
    tlRef.current?.kill()
    if (pickingRef.current) {
      pickingRef.current = false
      flying = Math.max(0, flying - 1)
    }
    g.position.copy(anchor.position)
    g.rotation.set(0, 0, 0)
    if (!visible) {
      g.visible = false
      g.scale.setScalar(0)
      return
    }
    // pop : il gonfle depuis son attache avec un rebond, puis se balance un instant au bout du rameau
    g.visible = true
    const delay = POP_DELAY + order * POP_STAGGER
    tlRef.current = gsap
      .timeline({ delay })
      .call(fruitAppear, [order], 0)
      .fromTo(g.scale, { x: 0, y: 0, z: 0 }, { x: size, y: size, z: size, duration: 0.7, ease: 'elastic.out(1, 0.45)' })
      .fromTo(g.rotation, { z: 0.45 }, { z: 0, duration: 1.6, ease: 'elastic.out(1, 0.25)' }, 0)
    return () => {
      tlRef.current?.kill()
    }
  }, [visible, order, anchor])

  // cueillette : le fruit tire sur son rameau, se détache, puis vole en cloche jusqu'au compteur
  const pick = () => {
    const g = ref.current
    if (!g || !g.visible || pickingRef.current || useGarden.getState().step !== 'harvest') return false
    pickingRef.current = true
    const slot = useGarden.getState().harvested.length + flying++
    const size = FRUIT_SCALE * anchor.scale
    const start = g.position.clone()
    const flight = { t: 0 }
    fruitPick()
    tlRef.current?.kill()
    tlRef.current = gsap
      .timeline({
        onComplete: () => {
          pickingRef.current = false
          flying = Math.max(0, flying - 1)
          g.visible = false
          useGarden.getState().harvestFruit(anchor.pot, anchor.plant)
        },
      })
      // il s'étire vers le bas en résistant, puis lâche d'un coup
      .to(g.scale, { x: size * 0.86, y: size * 1.18, z: size * 0.86, duration: 0.16, ease: 'power2.out' })
      .to(g.rotation, { z: 0, duration: 0.16 }, 0)
      .to(g.scale, { x: size * 1.12, y: size * 0.9, z: size * 1.12, duration: 0.12, ease: 'power2.in' })
      .to(
        flight,
        {
          t: 1,
          duration: FLIGHT_DURATION,
          ease: 'power2.inOut',
          onUpdate: () => {
            const t = flight.t
            // la cible est recalculée à chaque image : le vol suit le zoom et le redimensionnement
            slotTarget(camera, dom, slot, _end)
            _ctrl.copy(start).lerp(_end, 0.35)
            _ctrl.y = Math.max(start.y, _end.y) + FLIGHT_ARC
            // courbe de Bézier quadratique départ → sommet → case du compteur
            const a = (1 - t) * (1 - t)
            const b = 2 * (1 - t) * t
            const c = t * t
            g.position.set(
              a * start.x + b * _ctrl.x + c * _end.x,
              a * start.y + b * _ctrl.y + c * _end.y,
              a * start.z + b * _ctrl.z + c * _end.z,
            )
            g.scale.setScalar(MathUtils.lerp(size * 1.05, size * 0.35, t * t))
            g.rotation.set(t * 2.4, t * 5.5, t * 1.2)
          },
        },
        '>',
      )
    return true
  }
  const pickRef = useRef(pick)
  useEffect(() => {
    pickRef.current = pick
  })

  useEffect(() => {
    const entry = { order, pick: () => pickRef.current() }
    fruitPickers.push(entry)
    return () => void fruitPickers.splice(fruitPickers.indexOf(entry), 1)
  }, [order])

  const canPick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    return useGarden.getState().step === 'harvest' && !pickingRef.current
  }

  return (
    <group ref={ref} name={`Fruit_${anchor.pot + 1}_${anchor.plant + 1}`} position={anchor.position} visible={false}>
      <group rotation-y={anchor.rotationY}>
        <mesh geometry={mesh.geometry} material={material} castShadow receiveShadow />
      </group>
      {/* zone cliquable invisible, plus large que le fruit (il ne fait que 4,6 cm) */}
      <mesh
        position={hit.center}
        scale={hit.radius * HIT_SCALE}
        onPointerDown={(e) => {
          if (e.button !== 0 || !canPick(e)) return
          pick()
          document.body.style.cursor = ''
        }}
        onPointerOver={(e) => {
          if (canPick(e)) document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  )
}

/** Un fruit par plante, qui apparaît au jour 15 (passage à l'acte 4) et se cueille au clic ou au tap */
export default function Fruits({ anchors, mesh, material }: { anchors: FruitAnchor[]; mesh: Mesh; material: Material }) {
  const hit = useMemo(() => {
    mesh.geometry.computeBoundingSphere()
    return mesh.geometry.boundingSphere!.clone()
  }, [mesh])

  return (
    <group name="Fruits">
      {anchors.map((anchor, i) => (
        <Fruit key={i} anchor={anchor} order={i} mesh={mesh} material={material} hit={hit} />
      ))}
    </group>
  )
}
