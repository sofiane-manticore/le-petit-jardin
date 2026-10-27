import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  InstancedBufferAttribute,
  type InstancedMesh,
  type Material,
  type Mesh,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three'
import { POT_RIM_HEIGHT, SOIL_HEIGHT } from '../../scene/layout.ts'
import { onSoilOf, potAt } from '../../scene/potHit.ts'
import { DROP_RATE, DROP_SPEED, GRAVITY, pour, resetWater, WATER_NEEDED, waterReceived } from '../../scene/watering.ts'
import { useGarden } from '../../stores/useGarden.ts'
import { dropLanded } from '../../audio/sfx.ts'

const MAX_DROPS = 360
const MAX_RIPPLES = 120

// Gouttes : dispersion de la vitesse de sortie et rayon de la pomme. La gravité est adoucie
// (scene/watering.ts) : avec 9,8 m/s², les 20 cm de chute durent moins de 0,2 s
const DROP_SPEED_JITTER = 0.15
const DROP_SPREAD = 0.06
const ROSE_RADIUS = 0.013
// Goutte de Blender (2,5 cm) ramenée à 1,5 cm, et étirée selon sa vitesse
const DROP_SCALE = 0.6
const DROP_STRETCH = 0.4
// Ripples : durée de vie (s) et diamètre final (m), sur le sol et sur la terre des pots
const RIPPLE_LIFE = 0.65
const RIPPLE_SIZE_GROUND = 0.05
const RIPPLE_SIZE_SOIL = 0.034
// au-dessus des bosses de la terre (0,049 à 0,059) et du sol, pour ne pas être masqués
const SOIL_SURFACE = SOIL_HEIGHT + 0.004
const GROUND_SURFACE = 0.0015

/** Où une goutte va finir sa chute, décidé quand elle passe sous le bord des pots */
const FLOOR_UNKNOWN = -3
const FLOOR_GROUND = -2
const FLOOR_RIM = -1
// 0 à 3 : terre du pot correspondant

const UP = new Vector3(0, 1, 0)
const _m = new Matrix4()
const _q = new Quaternion()
const _p = new Vector3()
const _v = new Vector3()
const _s = new Vector3()
const _a = new Vector3()
const _b = new Vector3()

const rippleVertex = /* glsl */ `
  attribute float aAge;
  varying float vAge;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vAge = aAge;
    vec4 p = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * p;
  }
`

// deux anneaux qui s'ouvrent (le second un peu en retard) et s'effacent
const rippleFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAge;
  varying vec2 vUv;
  float ring(float r, float radius, float width) {
    return 1.0 - smoothstep(0.0, width, abs(r - radius));
  }
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    if (r > 1.0) discard;
    float t = 1.0 - pow(1.0 - vAge, 2.2);
    float outer = ring(r, mix(0.12, 1.0, t), mix(0.2, 0.06, vAge));
    float inner = ring(r, mix(0.0, 0.55, t), mix(0.16, 0.05, vAge)) * step(0.12, vAge) * 0.6;
    float a = max(outer, inner) * pow(1.0 - vAge, 1.3) * uOpacity;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`

type Ripple = { x: number; y: number; z: number; size: number; age: number }

/**
 * L'eau de l'arrosoir : gouttes en trajectoire balistique (une instance chacune) et ripples à
 * l'impact. Chaque goutte tombée sur la terre d'un pot compte pour 1 / DROP_RATE seconde
 * d'eau ; au-delà de WATER_NEEDED, le pot passe à `watered`.
 */
export default function Water({ mesh, material }: { mesh: Mesh; material: Material }) {
  const dropsRef = useRef<InstancedMesh>(null)
  const ripplesRef = useRef<InstancedMesh>(null)

  const simRef = useRef({
    pos: new Float32Array(MAX_DROPS * 3),
    vel: new Float32Array(MAX_DROPS * 3),
    floor: new Int8Array(MAX_DROPS),
    alive: 0,
    spawn: 0,
    ripples: [] as Ripple[],
  })

  const ripple = useMemo(() => {
    const geometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
    geometry.setAttribute('aAge', new InstancedBufferAttribute(new Float32Array(MAX_RIPPLES), 1))
    const mat = new ShaderMaterial({
      vertexShader: rippleVertex,
      fragmentShader: rippleFragment,
      uniforms: { uColor: { value: new Color('#e9e4d6') }, uOpacity: { value: 0.42 } },
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
    return { geometry, material: mat }
  }, [])
  useEffect(
    () => () => {
      ripple.geometry.dispose()
      ripple.material.dispose()
    },
    [ripple],
  )

  // reset (dev) : plus d'eau en vol, compteurs remis à zéro
  useEffect(
    () =>
      useGarden.subscribe((s, prev) => {
        if (s.step === 'intro' && prev.step !== 'intro') {
          const sim = simRef.current
          sim.alive = 0
          sim.ripples.length = 0
          resetWater()
        }
      }),
    [],
  )

  const addRipple = (x: number, y: number, z: number, size: number) => {
    const sim = simRef.current
    if (sim.ripples.length >= MAX_RIPPLES) sim.ripples.shift()
    sim.ripples.push({ x, y, z, size: size * (0.8 + Math.random() * 0.4), age: 0 })
  }

  /** Une goutte touche le sol, le bord ou la terre d'un pot */
  const land = (x: number, z: number, floor: number) => {
    dropLanded(floor === FLOOR_RIM ? 'rim' : floor === FLOOR_GROUND ? 'ground' : 'soil', x * 2)
    if (floor === FLOOR_RIM) return
    if (floor === FLOOR_GROUND) return addRipple(x, GROUND_SURFACE, z, RIPPLE_SIZE_GROUND)
    addRipple(x, SOIL_SURFACE, z, RIPPLE_SIZE_SOIL)
    const garden = useGarden.getState()
    if (garden.step !== 'water' || garden.pots[floor].watered) return
    waterReceived[floor] += 1 / DROP_RATE
    if (waterReceived[floor] >= WATER_NEEDED) garden.waterPot(floor)
  }

  useFrame((_, delta) => {
    const drops = dropsRef.current
    const ripples = ripplesRef.current
    if (!drops || !ripples) return
    const dt = Math.min(delta, 1 / 20)
    const sim = simRef.current
    const { pos, vel, floor } = sim

    // émission depuis la pomme : disque perpendiculaire à la sortie, vitesse un peu dispersée
    sim.spawn += pour.flow * DROP_RATE * dt
    if (pour.flow === 0) sim.spawn = 0
    _a.crossVectors(pour.dir, UP).normalize()
    _b.crossVectors(_a, pour.dir).normalize()
    while (sim.spawn >= 1 && sim.alive < MAX_DROPS) {
      sim.spawn -= 1
      const i = sim.alive++
      const r = ROSE_RADIUS * Math.sqrt(Math.random())
      const t = Math.random() * Math.PI * 2
      _p.copy(pour.origin).addScaledVector(_a, Math.cos(t) * r).addScaledVector(_b, Math.sin(t) * r)
      const speed = DROP_SPEED * (1 + (Math.random() - 0.5) * 2 * DROP_SPEED_JITTER)
      _v.copy(pour.dir).multiplyScalar(speed)
      _v.x += (Math.random() - 0.5) * 2 * DROP_SPREAD
      _v.y += (Math.random() - 0.5) * 2 * DROP_SPREAD
      _v.z += (Math.random() - 0.5) * 2 * DROP_SPREAD
      // sortie étalée sur l'image : pas de « paquets » de gouttes au même point
      const head = Math.random() * dt
      _p.addScaledVector(_v, head)
      const o = i * 3
      pos[o] = _p.x
      pos[o + 1] = _p.y
      pos[o + 2] = _p.z
      vel[o] = _v.x
      vel[o + 1] = _v.y
      vel[o + 2] = _v.z
      floor[i] = FLOOR_UNKNOWN
    }
    sim.spawn = Math.min(sim.spawn, 1)

    // trajectoire balistique (Euler semi-implicite) ; une goutte qui atterrit est remplacée par la
    // dernière vivante, la liste reste compacte et sert telle quelle d'instances
    let i = 0
    while (i < sim.alive) {
      const o = i * 3
      vel[o + 1] -= GRAVITY * dt
      pos[o] += vel[o] * dt
      pos[o + 1] += vel[o + 1] * dt
      pos[o + 2] += vel[o + 2] * dt
      const x = pos[o]
      const y = pos[o + 1]
      const z = pos[o + 2]

      if (floor[i] === FLOOR_UNKNOWN && y < POT_RIM_HEIGHT) {
        const pot = potAt(x, z, 0)
        floor[i] = pot === null ? FLOOR_GROUND : onSoilOf(pot, x, z) ? pot : FLOOR_RIM
      }
      const surface =
        floor[i] === FLOOR_UNKNOWN ? -1 : floor[i] === FLOOR_GROUND ? 0 : floor[i] === FLOOR_RIM ? POT_RIM_HEIGHT : SOIL_HEIGHT
      if (y <= surface) {
        land(x, z, floor[i])
        const last = --sim.alive
        if (i !== last) {
          pos.copyWithin(o, last * 3, last * 3 + 3)
          vel.copyWithin(o, last * 3, last * 3 + 3)
          floor[i] = floor[last]
        }
        continue
      }

      // la goutte pointe à l'opposé de sa vitesse (pointe en arrière), étirée quand elle va vite
      _v.set(vel[o], vel[o + 1], vel[o + 2])
      const speed = _v.length()
      _q.setFromUnitVectors(UP, _v.divideScalar(-Math.max(speed, 1e-6)))
      _s.set(DROP_SCALE, DROP_SCALE * (1 + speed * DROP_STRETCH), DROP_SCALE)
      drops.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q, _s))
      i++
    }
    drops.count = sim.alive
    drops.instanceMatrix.needsUpdate = true

    // ripples : vieillissent, puis disparaissent
    const age = ripples.geometry.getAttribute('aAge') as InstancedBufferAttribute
    const list = sim.ripples
    let k = 0
    for (let j = 0; j < list.length; j++) {
      const rp = list[j]
      rp.age += dt / RIPPLE_LIFE
      if (rp.age >= 1) continue
      list[k] = rp
      _s.setScalar(rp.size)
      ripples.setMatrixAt(k, _m.compose(_p.set(rp.x, rp.y, rp.z), _q.identity(), _s))
      age.setX(k, rp.age)
      k++
    }
    list.length = k
    ripples.count = k
    ripples.instanceMatrix.needsUpdate = true
    age.needsUpdate = true
  })

  return (
    <>
      <instancedMesh
        ref={dropsRef}
        name="Gouttes"
        args={[mesh.geometry, material, MAX_DROPS]}
        count={0}
        // instances en coordonnées monde, n'importe où dans la scène : pas de culling ni de raycast
        frustumCulled={false}
        raycast={() => null}
      />
      <instancedMesh
        ref={ripplesRef}
        name="Ripples"
        args={[ripple.geometry, ripple.material, MAX_RIPPLES]}
        count={0}
        frustumCulled={false}
        raycast={() => null}
        renderOrder={1}
      />
    </>
  )
}
