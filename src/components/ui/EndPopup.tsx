import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import gsap from 'gsap'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { type Group, type Mesh, MeshBasicMaterial, type MeshStandardMaterial, Vector3 } from 'three'
import { useGarden } from '../../stores/useGarden.ts'
import { JARDIN_URL } from '../../scene/assets.ts'
import { OPEN_DELAY } from '../../scene/harvest.ts'
import { REDUCED_MOTION } from '../../lib/gsapSetup.ts'
import { useStrings } from '../../i18n/strings.ts'
import Recap from './Recap.tsx'

const LINKEDIN_URL = 'https://www.linkedin.com/in/sofiane-saez'
/** Rayon du manège de fruits et vitesse de rotation (rad/s) */
const RING_RADIUS = 0.105
const RING_SPEED = REDUCED_MOTION ? 0 : 0.45

/** Les fruits récoltés, en manège, chacun tournant aussi sur lui-même */
function FruitRing({ count }: { count: number }) {
  const { nodes } = useGLTF(JARDIN_URL)
  const ring = useRef<Group>(null)
  const spins = useRef<(Group | null)[]>([])

  const fruit = useMemo(() => {
    const mesh = nodes.Fruit as Mesh
    const source = mesh.material as MeshStandardMaterial
    // rendu unlit : la texture peinte telle quelle, comme dans le jardin
    const material = new MeshBasicMaterial({ map: source.map, color: source.color })
    // le fruit de Blender a son origine à l'attache : on le recentre pour qu'il tourne sur lui-même
    mesh.geometry.computeBoundingBox()
    const center = mesh.geometry.boundingBox!.getCenter(new Vector3())
    return { geometry: mesh.geometry, material, offset: center.negate() }
  }, [nodes])
  useEffect(() => () => fruit.material.dispose(), [fruit])

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    if (ring.current) ring.current.rotation.y += RING_SPEED * delta
    spins.current.forEach((g, i) => {
      if (!g || REDUCED_MOTION) return
      g.rotation.y = t * 1.1 + i
      g.position.y = Math.sin(t * 1.6 + i * 0.9) * 0.006
    })
  })

  return (
    <group ref={ring} rotation-x={0.12}>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2
        return (
          <group key={i} position={[Math.sin(a) * RING_RADIUS, 0, Math.cos(a) * RING_RADIUS]}>
            <group
              ref={(g) => {
                spins.current[i] = g
              }}
            >
              <mesh geometry={fruit.geometry} material={fruit.material} position={fruit.offset} />
            </group>
          </group>
        )
      })}
    </group>
  )
}

/** Écran de fin : les fruits récoltés tournent en 3D, avec le message de fin et le lien LinkedIn */
export default function EndPopup() {
  const ended = useGarden((s) => s.step === 'end')
  const count = useGarden((s) => s.harvested.length)
  const [ready, setReady] = useState(false)
  const open = ended && ready
  const rootRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const linkRef = useRef<HTMLAnchorElement>(null)
  const recapRef = useRef<HTMLElement>(null)
  const t = useStrings()

  useEffect(() => {
    if (!ended) return
    const call = gsap.delayedCall(OPEN_DELAY, () => setReady(true))
    return () => {
      call.kill()
      setReady(false)
    }
  }, [ended])

  // entrée : voile, puis carte qui monte avec un léger rebond, puis surlignage du mot clé
  useLayoutEffect(() => {
    const root = rootRef.current
    const card = cardRef.current
    if (!open || !root || !card) return
    const ctx = gsap.context(() => {
      gsap
        .timeline({ onComplete: () => linkRef.current?.focus({ preventScroll: true }) })
        .fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' })
        .fromTo(
          card,
          REDUCED_MOTION ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.94 },
          { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'back.out(1.6)' },
          0.15,
        )
        .fromTo('[data-mark]', { backgroundSize: '0% 42%' }, { backgroundSize: '100% 42%', duration: 0.8, ease: 'mark' }, 0.9)
        .fromTo('[data-scroll-hint]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 1.5)
    }, root)
    return () => ctx.kill()
  }, [open])

  if (!open) return null

  return (
    // le voile défile : la carte occupe le premier écran, le récap du workflow vient dessous
    <div
      ref={rootRef}
      className="pointer-events-auto invisible absolute inset-0 z-40 overflow-y-auto overscroll-contain bg-ink/25 [scrollbar-color:rgb(251_244_230/0.6)_transparent] [scrollbar-width:thin] opacity-0 backdrop-blur-[3px]"
    >
      <div role="dialog" aria-modal="true" aria-labelledby="end-title" className="flex flex-col items-center px-4 pb-16">
        <div className="flex min-h-dvh w-full flex-col items-center justify-center py-16">
          <div
            ref={cardRef}
            className="w-full max-w-[420px] rounded-[28px] bg-cream-light px-6 pb-7 pt-2 text-center shadow-xl ring-1 ring-track"
          >
            <div className="mx-auto h-[200px] w-full max-w-[320px]" aria-hidden>
              <Canvas
                dpr={[1, 2]}
                flat
                camera={{ fov: 30, near: 0.01, far: 5, position: [0, 0.11, 0.5] }}
                gl={{ antialias: true, alpha: true }}
                onCreated={({ camera }) => camera.lookAt(0, -0.004, 0)}
              >
                <Suspense fallback={null}>
                  <FruitRing count={Math.max(count, 1)} />
                </Suspense>
              </Canvas>
            </div>
            <h2 id="end-title" className="m-0 text-balance font-story-soft text-[clamp(24px,6vw,30px)] leading-tight text-ink">
              {t.end.before}
              <em data-mark className="story-mark">
                {t.end.mark}
              </em>
              {t.end.after}
            </h2>
            <p className="mx-auto mb-6 mt-2 text-sm text-label">{t.end.count(count)}</p>
            <a
              ref={linkRef}
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[15px] font-bold text-cream-light shadow-sm transition-colors duration-150 hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              {t.end.linkedin}
              <ArrowUpRight aria-hidden size={18} strokeWidth={2.25} />
            </a>
          </div>
          <button
            type="button"
            data-scroll-hint
            onClick={() => recapRef.current?.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'start' })}
            className="mt-6 flex cursor-pointer flex-col items-center gap-1 rounded-full px-4 py-2 text-[13px] font-bold text-cream-light [text-shadow:0_1px_6px_rgb(59_42_30/0.45)]"
          >
            {t.end.scroll}
            <ChevronDown aria-hidden size={20} strokeWidth={2.5} className="motion-safe:animate-bounce" />
          </button>
        </div>

        <Recap ref={recapRef} />
      </div>
    </div>
  )
}
