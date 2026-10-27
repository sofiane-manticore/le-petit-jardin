import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import {
  Euler,
  type InstancedMesh,
  type Material,
  type Mesh,
  MathUtils,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import { SEED_LIFT, SEED_PILES, SEED_SCALE, SEEDS_PER_PILE, SOIL_HEIGHT } from '../../scene/layout.ts'
import { potUnderDrag, soilPoint } from '../../scene/potHit.ts'
import { useDrag } from '../../hooks/useDrag.ts'
import { useGarden } from '../../stores/useGarden.ts'
import { useUi } from '../../stores/useUi.ts'
import { seedGrab } from '../../audio/sfx.ts'
import { potDeformation } from '../../scene/potObjects.ts'
import { mulberry32 } from '../../lib/random.ts'
import { pileHandles } from '../../scene/pileRegistry.ts'
import { REDUCED_MOTION } from '../../lib/gsapSetup.ts'

const PILE_RADIUS = 0.023
const PILE_HEIGHT = 0.02
// demi-épaisseur de la graine couchée (bbox phase 0 : 0,013 m sur l'axe le plus court, à l'échelle)
const SEED_REST = 0.0065 * SEED_SCALE

// Ressorts : raideur de base (1/s²) et amortissement relatif (< 1 = ça rebondit un peu)
const STIFFNESS = 260
const DAMPING_RATIO = 0.32
// Suivi du pointeur par le tas (damp, 1/s) et montée à SEED_LIFT
const FOLLOW = 22
const LIFT_SPEED = 12
// Inclinaison des graines selon leur vitesse (rad par m/s) et plafond
const TILT_PER_SPEED = 7
const TILT_MAX = 0.9
/** Durée totale de l'aspiration dans le pot (dernière graine arrivée), pour synchroniser le pot */
export const SUCTION_DURATION = 0.95
// Petits sauts des tas au repos pendant l'acte 1, pour inviter à les prendre : une vague de
// gauche à droite toutes les HOP_PERIOD secondes, chaque graine reçoit une impulsion vers le haut
const HOP_PERIOD = 2.6
const HOP_STAGGER = 0.12
const HOP_SPEED = 0.22
const HOP_SIDE = 0.06
/** Graines laissées visibles sur la terre après l'aspiration (les autres s'enfouissent) */
const SEEDS_KEPT = 9

type Seed = {
  /** Position au repos, relative à l'ancre du tas */
  rest: Vector3
  restQuat: Quaternion
  restScale: number
  pos: Vector3
  vel: Vector3
  /** Échelle courante, relative à restScale (animée pendant l'aspiration) */
  scale: { value: number }
  stiffness: number
  damping: number
}

type Mode = 'idle' | 'drag' | 'return' | 'settle' | 'suck' | 'planted'

export type SeedPileHandle = {
  /** Fait aspirer le tas par le pot (utilisé aussi quand le pot est semé depuis le panneau dev) */
  suckInto: (pot: number) => void
  isAvailable: () => boolean
  reset: () => void
}

/** Pots déjà réservés par un drop, pour que le panneau dev ne leur envoie pas un second tas */
const claimedPots = new Set<number>()
/** Un tas est en cours de drag : les autres tas survolés ne touchent pas au curseur */
let dragging = false

// objets de travail de la boucle d'animation (aucune allocation par image)
const _m = new Matrix4()
const _q = new Quaternion()
const _tilt = new Quaternion()
const _axis = new Vector3()
const _s = new Vector3()
const _target = new Vector3()
const _acc = new Vector3()
const _p = new Vector3()
const _deform = new Matrix4()

function buildSeeds(index: number): Seed[] {
  const random = mulberry32(1000 + index * 97)
  const e = new Euler()
  return Array.from({ length: SEEDS_PER_PILE }, () => {
    // répartition en disque (racine pour une densité uniforme), graines réparties dans un dôme en cos
    const r = PILE_RADIUS * Math.sqrt(random())
    const a = random() * Math.PI * 2
    const dome = Math.cos((r / PILE_RADIUS) * (Math.PI / 2))
    const height = dome * PILE_HEIGHT * Math.sqrt(random())
    const rest = new Vector3(Math.cos(a) * r, SEED_REST + height, Math.sin(a) * r)
    // graines plutôt couchées : petite inclinaison, rotation libre autour de Y
    e.set((random() - 0.5) * 1.6, random() * Math.PI * 2, (random() - 0.5) * 1.6)
    const restScale = SEED_SCALE * (0.85 + random() * 0.3)
    // le haut du tas est plus souple que la base : il ballotte davantage
    const stiffness = STIFFNESS * (0.6 + random() * 0.6) * (1 - 0.45 * (height / PILE_HEIGHT))
    return {
      rest,
      restQuat: new Quaternion().setFromEuler(e),
      restScale,
      pos: new Vector3(),
      vel: new Vector3(),
      scale: { value: 1 },
      stiffness,
      damping: 2 * DAMPING_RATIO * Math.sqrt(stiffness),
    }
  })
}

// une fois pour toutes : la forme de chaque tas et son point de départ
const PILE_SEEDS = SEED_PILES.map((_, i) => buildSeeds(i))
const PILE_HOMES = SEED_PILES.map((p) => new Vector3(...p))

/** Remet chaque graine à sa place dans le tas, au repos */
function placeAtRest(seeds: Seed[], home: Vector3) {
  for (const seed of seeds) {
    seed.pos.copy(seed.rest).add(home)
    seed.vel.set(0, 0, 0)
    seed.scale.value = 1
  }
}

type PileProps = { mesh: Mesh; material: Material; index: number }

/**
 * Un tas de 70 graines. Chaque graine est une instance indépendante, avec sa propre position,
 * sa vitesse et son ressort vers sa place dans le tas : pendant le drag, elles suivent l'ancre
 * avec du retard et s'agitent, sans moteur physique.
 */
const SeedPile = forwardRef<SeedPileHandle, PileProps>(function SeedPile({ mesh, material, index }, ref) {
  const meshRef = useRef<InstancedMesh>(null)
  const hitRef = useRef<Mesh>(null)
  const canSow = useGarden((s) => s.step === 'sow')

  const home = PILE_HOMES[index]
  const seeds = PILE_SEEDS[index]
  const state = useRef({
    mode: 'idle' as Mode,
    anchor: home.clone(),
    dragTarget: new Vector3(),
    tweens: [] as gsap.core.Animation[],
    dirty: true,
    /** Pot qui a reçu le tas : les graines suivent ses rebonds (null tant qu'il n'est pas semé) */
    pot: null as number | null,
    /** Le pot était déformé à l'image précédente : il faut encore une mise à jour pour revenir au repos */
    deformed: false,
    /** Dernière vague de sauts reçue (numéro de période) */
    hop: -1,
  })

  const killTweens = () => {
    const st = state.current
    st.tweens.forEach((t) => t.kill())
    st.tweens = []
  }

  const rest = () => {
    placeAtRest(seeds, home)
    state.current.anchor.copy(home)
    state.current.dirty = true
  }

  /** Retour au point de départ, en arc, puis les ressorts reposent le tas */
  const goHome = () => {
    const st = state.current
    st.mode = 'return'
    killTweens()
    const a = st.anchor
    const duration = MathUtils.clamp(a.distanceTo(home) * 1.6, 0.45, 0.9)
    st.tweens.push(
      gsap
        .timeline({ onComplete: () => (st.mode = 'settle') })
        .to(a, { x: home.x, z: home.z, duration, ease: 'power3.out' }, 0)
        .to(a, { y: SEED_LIFT * 0.6, duration: duration * 0.35, ease: 'sine.out' }, 0)
        .to(a, { y: home.y, duration: duration * 0.65, ease: 'power2.in' }, duration * 0.35),
    )
  }

  const suckInto = (pot: number) => {
    const st = state.current
    st.mode = 'suck'
    st.pot = pot
    killTweens()
    const random = mulberry32(5000 + index * 31 + pot * 7)
    const funnel = soilPoint(pot, 0, 0, new Vector3())
    funnel.y += 0.06
    const tl = gsap.timeline({ onComplete: () => (st.mode = 'planted') })
    // les graines les plus proches du pot partent en premier, avec un peu de désordre
    const order = seeds
      .map((seed, i) => ({ i, d: seed.pos.distanceToSquared(funnel) }))
      .sort((a, b) => a.d - b.d)
    const SPREAD = 0.4
    order.forEach(({ i }, rank) => {
      const seed = seeds[i]
      seed.vel.set(0, 0, 0)
      const kept = i < SEEDS_KEPT
      // point d'arrivée réparti sur la terre (ellipse dans le bac), enfoui sauf pour quelques-unes
      const rr = Math.sqrt(random()) * 0.85
      const aa = random() * Math.PI * 2
      const end = soilPoint(pot, Math.cos(aa) * rr, Math.sin(aa) * rr, new Vector3())
      end.y = kept ? SOIL_HEIGHT + SEED_REST * 0.3 : SOIL_HEIGHT - 0.012
      const at = (rank / SEEDS_PER_PILE) * SPREAD + random() * 0.08
      // 1) aspirées vers l'entonnoir au-dessus du pot (accélération), 2) plongée vers la terre
      const jitter = () => (random() - 0.5) * 0.03
      tl.to(seed.pos, { x: funnel.x + jitter(), y: funnel.y + jitter(), z: funnel.z + jitter(), duration: 0.32, ease: 'power2.in' }, at)
        .to(seed.pos, { x: end.x, y: end.y, z: end.z, duration: 0.22, ease: 'power1.out' }, at + 0.32)
        .to(seed.scale, { value: kept ? 0.85 : 0.0, duration: 0.22, ease: 'power1.in' }, at + 0.32)
    })
    st.tweens.push(tl)
  }

  const reset = () => {
    killTweens()
    state.current.mode = 'idle'
    state.current.pot = null
    rest()
  }

  /** Le tas est encore à prendre (pas en vol vers un pot, pas déjà semé) */
  const isAvailable = () => ['idle', 'settle', 'return'].includes(state.current.mode)

  useImperativeHandle(ref, () => ({ suckInto, isAvailable, reset }))

  // place initiale (aussi après un rechargement à chaud), et nettoyage des tweens au démontage
  useEffect(() => {
    const st = state.current
    placeAtRest(seeds, home)
    st.anchor.copy(home)
    st.dirty = true
    return () => st.tweens.forEach((t) => t.kill())
  }, [seeds, home])

  const onPointerDown = useDrag(
    SEED_LIFT,
    {
      onStart: ({ point }) => {
        killTweens()
        dragging = true
        useUi.getState().setSeedHeld(true)
        state.current.mode = 'drag'
        state.current.dragTarget.copy(point)
        document.body.style.cursor = 'grabbing'
        seedGrab()
      },
      onMove: ({ point, ray }) => {
        state.current.dragTarget.copy(point)
        const pot = potUnderDrag(point, ray)
        // seul un pot libre se met en valeur
        useUi.getState().setSeedTarget(pot !== null && !useGarden.getState().pots[pot].seeded ? pot : null)
      },
      onEnd: ({ point, ray }) => {
        dragging = false
        useUi.getState().setSeedHeld(false)
        useUi.getState().setSeedTarget(null)
        const pot = potUnderDrag(point, ray)
        if (pot !== null && !claimedPots.has(pot)) {
          claimedPots.add(pot)
          if (useGarden.getState().seedPot(pot)) {
            document.body.style.cursor = ''
            suckInto(pot)
            return
          }
          claimedPots.delete(pot)
        }
        // le tas repart chez lui, sous le pointeur ou non : curseur neutre
        document.body.style.cursor = ''
        goHome()
      },
    },
    canSow,
  )

  useFrame(({ clock }, delta) => {
    const st = state.current
    const mesh = meshRef.current
    if (!mesh) return
    const dt = Math.min(delta, 1 / 20)

    // tas au repos pendant l'acte 1 : un petit saut à chaque vague, les ressorts le reposent
    const hop = Math.floor((clock.elapsedTime - index * HOP_STAGGER) / HOP_PERIOD)
    if (hop !== st.hop) {
      st.hop = hop
      if (canSow && !dragging && !REDUCED_MOTION && (st.mode === 'idle' || st.mode === 'settle')) {
        const random = mulberry32(hop * 13 + index)
        for (const seed of seeds) {
          // le haut du tas saute plus que la base
          const lift = 0.4 + seed.rest.y / (SEED_REST + PILE_HEIGHT)
          _acc.set((random() - 0.5) * HOP_SIDE, HOP_SPEED * lift * (0.7 + random() * 0.6), (random() - 0.5) * HOP_SIDE)
          seed.vel.add(_acc)
        }
        st.mode = 'settle'
      }
    }

    if (st.mode === 'drag') {
      const a = st.anchor
      a.x = MathUtils.damp(a.x, st.dragTarget.x, FOLLOW, dt)
      a.z = MathUtils.damp(a.z, st.dragTarget.z, FOLLOW, dt)
      a.y = MathUtils.damp(a.y, SEED_LIFT, LIFT_SPEED, dt)
    }

    // ressorts : graine → (ancre + place au repos), en sous-pas pour rester stable
    const springs = st.mode === 'drag' || st.mode === 'return' || st.mode === 'settle'
    if (springs) {
      const steps = Math.ceil(dt / (1 / 240))
      const h = dt / steps
      let energy = 0
      for (const seed of seeds) {
        _target.copy(st.anchor).add(seed.rest)
        for (let k = 0; k < steps; k++) {
          // a = k (cible − x) − c v, intégration d'Euler semi-implicite
          _acc.copy(_target).sub(seed.pos).multiplyScalar(seed.stiffness).addScaledVector(seed.vel, -seed.damping)
          seed.vel.addScaledVector(_acc, h)
          seed.pos.addScaledVector(seed.vel, h)
        }
        energy = Math.max(energy, seed.vel.lengthSq(), seed.pos.distanceToSquared(_target) * 100)
      }
      // tas revenu et immobile : on fige et on arrête la simulation
      if (st.mode === 'settle' && energy < 1e-8) {
        st.mode = 'idle'
        rest()
      }
      st.dirty = true
    }

    // pot semé qui rebondit (graines qui arrivent, eau bue, mise en valeur) : la terre monte et
    // descend, les graines posées dessus suivent la même déformation
    let deformed = false
    if (st.pot !== null) {
      const m = potDeformation(st.pot, _deform).elements
      deformed = Math.abs(m[0] - 1) + Math.abs(m[5] - 1) + Math.abs(m[10] - 1) > 1e-5
    }
    const follow = deformed || st.deformed
    st.deformed = deformed

    if (!springs && st.mode !== 'suck' && !st.dirty && !follow) return
    st.dirty = false

    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i]
      // inclinaison dans le sens du mouvement : la graine « traîne » derrière l'ancre
      const speed = Math.hypot(seed.vel.x, seed.vel.z)
      if (springs && speed > 1e-5) {
        _axis.set(seed.vel.z, 0, -seed.vel.x).divideScalar(speed)
        _tilt.setFromAxisAngle(_axis, Math.min(speed * TILT_PER_SPEED, TILT_MAX))
        _q.multiplyQuaternions(_tilt, seed.restQuat)
      } else {
        _q.copy(seed.restQuat)
      }
      _s.setScalar(seed.restScale * seed.scale.value)
      _p.copy(seed.pos)
      if (deformed) _p.applyMatrix4(_deform)
      mesh.setMatrixAt(i, _m.compose(_p, _q, _s))
    }
    mesh.instanceMatrix.needsUpdate = true

    // zone de saisie : suit le tas
    hitRef.current?.position.copy(st.anchor)
  })

  return (
    <>
      <instancedMesh
        ref={meshRef}
        name={`SeedPile_${index + 1}`}
        args={[mesh.geometry, material, SEEDS_PER_PILE]}
        // instances en coordonnées monde, qui voyagent jusqu'aux pots : pas de culling ni de raycast
        frustumCulled={false}
        raycast={() => null}
        castShadow
        receiveShadow
      />
      {/* zone de saisie invisible, plus large que le tas (cible tactile confortable) */}
      <mesh
        ref={hitRef}
        position={home}
        onPointerDown={(e) => isAvailable() && onPointerDown(e)}
        onPointerOver={() => {
          if (canSow && !dragging && isAvailable()) document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          if (!dragging) document.body.style.cursor = ''
        }}
      >
        <cylinderGeometry args={[0.042, 0.042, 0.06, 16]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
    </>
  )
})

/**
 * Les 4 tas de graines, sur la gauche. N'importe quel tas va dans n'importe quel pot libre ; un
 * pot semé autrement (panneau dev) aspire le premier tas disponible, pour que l'image reste
 * fidèle au store.
 */
export default function SeedPiles({ mesh, material }: { mesh: Mesh; material: Material }) {
  const piles = useRef<(SeedPileHandle | null)[]>([])

  useEffect(
    () =>
      useGarden.subscribe((s, prev) => {
        // reset (dev) : retour à l'intro, tous les tas reviennent
        if (s.step === 'intro' && prev.step !== 'intro') {
          claimedPots.clear()
          piles.current.forEach((p) => p?.reset())
          return
        }
        s.pots.forEach((p, i) => {
          if (!p.seeded || prev.pots[i].seeded || claimedPots.has(i)) return
          claimedPots.add(i)
          piles.current.find((pile) => pile?.isAvailable())?.suckInto(i)
        })
      }),
    [],
  )

  return (
    <>
      {SEED_PILES.map((_, i) => (
        <SeedPile
          key={i}
          ref={(h) => {
            piles.current[i] = h
            pileHandles[i] = h
          }}
          mesh={mesh}
          material={material}
          index={i}
        />
      ))}
    </>
  )
}
