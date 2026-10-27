import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { type Group, type Material, MathUtils, type Mesh, type Object3D, Plane, Quaternion, type Ray, Vector3 } from 'three'
import { CAN_GRIP, CAN_LIFT, CAN_ROSE, CAN_ROSE_DIR, SOIL_HEIGHT, WATERING_CAN } from '../../scene/layout.ts'
import { potAt } from '../../scene/potHit.ts'
import { DROP_SPEED, fallTime, pour } from '../../scene/watering.ts'
import { useDrag } from '../../hooks/useDrag.ts'
import { useGarden } from '../../stores/useGarden.ts'
import { useUi } from '../../stores/useUi.ts'
import { canGrab } from '../../audio/sfx.ts'
import { COARSE_POINTER } from '../../lib/device.ts'
import RightClickHint from '../ui/RightClickHint.tsx'

// Suivi du pointeur par la poignée (damp, 1/s) et montée à CAN_LIFT
const FOLLOW = 14
const LIFT_SPEED = 9
// Balancement : l'arrosoir pend sous la main, le bas traîne derrière le mouvement.
// Angle visé par m/s de vitesse, plafond, puis ressort (raideur 1/s², amortissement relatif)
const SWAY_PER_SPEED = 0.55
const SWAY_MAX = 0.45
const SWAY_STIFFNESS = 90
const SWAY_DAMPING = 2 * 0.38 * Math.sqrt(SWAY_STIFFNESS)
// Inclinaison pour verser (rad, bec vers le bas) et petite inclinaison quand il est tenu
const POUR_ANGLE = 0.78
const HELD_ANGLE = 0.07
const TILT_SPEED = 7
// Part de l'inclinaison à partir de laquelle l'eau coule, puis jet complet
const FLOW_START = 0.45
const FLOW_FULL = 0.85

const GRIP = new Vector3(...CAN_GRIP)
const ROSE_DIR = new Vector3(...CAN_ROSE_DIR).normalize()
/** Position de la poignée au repos : l'arrosoir posé à sa place */
const HOME = GRIP.clone().applyAxisAngle(new Vector3(0, 1, 0), WATERING_CAN.rotationY).add(new Vector3(...WATERING_CAN.position))
/**
 * Point de chute du jet par rapport à la poignée, arrosoir tenu et incliné pour verser (calculé
 * une fois : le cap de l'arrosoir ne change pas). Sert à mettre en valeur le pot qui va recevoir l'eau.
 */
const LANDING = (() => {
  const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), WATERING_CAN.rotationY)
  const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), POUR_ANGLE)
  const q = yaw.multiply(tilt)
  const rose = new Vector3(...CAN_ROSE).sub(GRIP).applyQuaternion(q)
  const v = ROSE_DIR.clone().applyQuaternion(q).multiplyScalar(DROP_SPEED)
  const t = fallTime(CAN_LIFT + rose.y - SOIL_HEIGHT, v.y)
  return new Vector3(rose.x + v.x * t, 0, rose.z + v.z * t)
})()

// Le pointeur vise la terre : on le projette sur le plan de la terre des pots. L'arrosoir tenu
// flotte haut, et sa position à l'écran trompe (parallaxe d'environ 15 cm) : c'est donc le point
// de chute du jet qui suit le pointeur, pas la poignée. Au moment de la saisie, l'écart
// poignée → pointeur glisse vers cet écart de visée en AIM_BLEND (1/s), sans saut.
const AIM_BLEND = 5
const soilPlane = new Plane(new Vector3(0, 1, 0), -SOIL_HEIGHT)
const AIM_OFFSET = new Vector3(-LANDING.x, 0, -LANDING.z)
// Au doigt, viser le point de chute mettait le doigt sur le bec et cachait l'eau : sur écran
// tactile, c'est l'anse qui vient sous le doigt (projection sur le plan de l'arrosoir tenu)
const liftPlane = new Plane(new Vector3(0, 1, 0), -CAN_LIFT)
const GRIP_OFFSET = new Vector3()
const TARGET_OFFSET = COARSE_POINTER ? GRIP_OFFSET : AIM_OFFSET

const _q = new Quaternion()
const _prev = new Vector3()
const _aim = new Vector3()

/** Point visé par le pointeur : sur la terre des pots à la souris, à hauteur de l'anse au doigt */
const aimOf = (ray: Ray, out: Vector3) => ray.intersectPlane(COARSE_POINTER ? liftPlane : soilPlane, out) ?? out

type Mode = 'idle' | 'drag' | 'return'

/**
 * Arrosoir : on le saisit par la poignée et il suit le pointeur en se balançant. Clic droit
 * maintenu, Espace ou bouton « verser » : il s'incline et l'eau sort de la pomme (les gouttes
 * sont simulées par <Water />, qui lit `pour`). Au relâché, il rentre se poser à sa place.
 */
export default function WateringCan({ mesh, material }: { mesh: Mesh; material: Material }) {
  const canWater = useGarden((s) => s.step === 'water')
  const held = useUi((s) => s.canHeld)

  const rootRef = useRef<Group>(null)
  const swayRef = useRef<Group>(null)
  const tiltRef = useRef<Group>(null)
  const roseRef = useRef<Object3D>(null)

  const state = useRef({
    mode: 'idle' as Mode,
    anchor: HOME.clone(),
    /** Point de la terre visé par le pointeur */
    aim: new Vector3(),
    /** Écart horizontal poignée − point visé, qui glisse vers AIM_OFFSET après la saisie */
    offset: new Vector3(),
    velocity: new Vector3(),
    sway: { x: 0, z: 0, vx: 0, vz: 0 },
    tilt: 0,
    tween: null as gsap.core.Animation | null,
  })

  const goHome = () => {
    const st = state.current
    st.mode = 'return'
    st.tween?.kill()
    const a = st.anchor
    const duration = MathUtils.clamp(a.distanceTo(HOME) * 1.4, 0.55, 1.1)
    // ease-out : il part vite puis se pose en douceur
    st.tween = gsap
      .timeline({ onComplete: () => void (st.mode = 'idle') })
      .to(a, { x: HOME.x, z: HOME.z, duration, ease: 'power3.out' }, 0)
      .to(a, { y: HOME.y, duration: duration * 0.9, ease: 'power2.inOut' }, duration * 0.1)
  }

  // reset (dev) : retour immédiat à la place de repos
  useEffect(
    () =>
      useGarden.subscribe((s, prev) => {
        if (s.step === 'intro' && prev.step !== 'intro') {
          const st = state.current
          st.tween?.kill()
          st.mode = 'idle'
          st.anchor.copy(HOME)
          st.velocity.set(0, 0, 0)
          Object.assign(st.sway, { x: 0, z: 0, vx: 0, vz: 0 })
          st.tilt = 0
          useUi.getState().setCanHeld(false)
          useUi.getState().setWaterTarget(null)
        }
        // fin de l'acte : plus d'eau, les commandes de versement sont relâchées
        if (s.step !== 'water' && prev.step === 'water') useUi.getState().stopPour()
      }),
    [],
  )

  useEffect(() => () => void state.current.tween?.kill(), [])

  const onPointerDown = useDrag(
    CAN_LIFT,
    {
      onStart: ({ ray }) => {
        const st = state.current
        st.tween?.kill()
        st.mode = 'drag'
        aimOf(ray, st.aim)
        st.offset.copy(st.anchor).sub(st.aim).setY(0)
        document.body.style.cursor = 'grabbing'
        useUi.getState().setCanHeld(true)
        canGrab()
      },
      onMove: ({ ray }) => void aimOf(ray, state.current.aim),
      onEnd: () => {
        document.body.style.cursor = ''
        useUi.getState().setCanHeld(false)
        useUi.getState().setWaterTarget(null)
        goHome()
      },
    },
    canWater,
  )

  useFrame((_, delta) => {
    const st = state.current
    const root = rootRef.current
    if (!root || !swayRef.current || !tiltRef.current || !roseRef.current) return
    const dt = Math.min(delta, 1 / 20)
    const a = st.anchor

    _prev.copy(a)
    if (st.mode === 'drag') {
      st.offset.x = MathUtils.damp(st.offset.x, TARGET_OFFSET.x, AIM_BLEND, dt)
      st.offset.z = MathUtils.damp(st.offset.z, TARGET_OFFSET.z, AIM_BLEND, dt)
      _aim.copy(st.aim).add(st.offset)
      a.x = MathUtils.damp(a.x, _aim.x, FOLLOW, dt)
      a.z = MathUtils.damp(a.z, _aim.z, FOLLOW, dt)
      a.y = MathUtils.damp(a.y, CAN_LIFT, LIFT_SPEED, dt)
    }
    if (dt > 0) st.velocity.copy(a).sub(_prev).divideScalar(dt)

    // balancement : ressort vers un angle proportionnel à la vitesse (pendule sous la poignée).
    // Rotation autour de X positive → le bas part vers −Z ; autour de Z négative → vers −X.
    const sw = st.sway
    const tx = MathUtils.clamp(st.velocity.z * SWAY_PER_SPEED, -SWAY_MAX, SWAY_MAX)
    const tz = MathUtils.clamp(-st.velocity.x * SWAY_PER_SPEED, -SWAY_MAX, SWAY_MAX)
    sw.vx += (SWAY_STIFFNESS * (tx - sw.x) - SWAY_DAMPING * sw.vx) * dt
    sw.vz += (SWAY_STIFFNESS * (tz - sw.z) - SWAY_DAMPING * sw.vz) * dt
    sw.x += sw.vx * dt
    sw.z += sw.vz * dt

    // inclinaison : versement (commande enfoncée, arrosoir tenu, pendant l'acte 2), sinon légère
    // quand il est tenu. Le brief veut le clic droit « en plus du clic gauche » : pas d'eau au repos
    const ui = useUi.getState()
    const pouring = ui.pouring && st.mode === 'drag' && useGarden.getState().step === 'water'
    const target = pouring ? 1 : st.mode === 'drag' ? HELD_ANGLE / POUR_ANGLE : 0
    st.tilt = MathUtils.damp(st.tilt, target, TILT_SPEED, dt)

    root.position.copy(a)
    swayRef.current.rotation.set(sw.x, 0, sw.z)
    tiltRef.current.rotation.x = st.tilt * POUR_ANGLE
    root.updateMatrixWorld()

    // sortie de l'eau, lue par <Water />
    pour.flow = pouring ? MathUtils.smoothstep(st.tilt, FLOW_START, FLOW_FULL) : 0
    roseRef.current.getWorldPosition(pour.origin)
    roseRef.current.getWorldQuaternion(_q)
    pour.dir.copy(ROSE_DIR).applyQuaternion(_q)

    // pot visé : celui où l'eau va tomber (sous le pointeur), s'il n'est pas encore arrosé
    if (st.mode === 'drag') {
      const pot = potAt(a.x + LANDING.x, a.z + LANDING.z)
      ui.setWaterTarget(pot !== null && !useGarden.getState().pots[pot].watered ? pot : null)
    }
  })

  return (
    <group ref={rootRef} position={HOME}>
      <group ref={swayRef}>
        <group rotation-y={WATERING_CAN.rotationY}>
          <group ref={tiltRef}>
            {/* le mesh est décalé pour que la poignée soit au pivot */}
            <group position={[-CAN_GRIP[0], -CAN_GRIP[1], -CAN_GRIP[2]]}>
              <mesh
                name="Arrosoir"
                geometry={mesh.geometry}
                material={material}
                castShadow
                receiveShadow
                raycast={() => null}
              />
              <object3D ref={roseRef} position={CAN_ROSE} />
              {/* zone de saisie invisible, un peu plus large que l'arrosoir */}
              <mesh
                position={[0, 0.105, 0.04]}
                onPointerDown={onPointerDown}
                onPointerOver={() => {
                  if (canWater && state.current.mode !== 'drag') document.body.style.cursor = 'grab'
                }}
                onPointerOut={() => {
                  if (state.current.mode !== 'drag') document.body.style.cursor = ''
                }}
              >
                <boxGeometry args={[0.12, 0.23, 0.3]} />
                <meshBasicMaterial colorWrite={false} depthWrite={false} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
      {held && canWater && <RightClickHint />}
    </group>
  )
}
