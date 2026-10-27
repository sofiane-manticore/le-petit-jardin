import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import gsap from 'gsap'
import { FastForward, Moon, Sun } from 'lucide-react'
import { setTimeSpeed } from '../../audio/ambience.ts'
import { useStrings } from '../../i18n/strings.ts'
import { DAYS_TO_GROW, NEXT_SUNRISE, SUNRISE, SUNSET, useGarden } from '../../stores/useGarden.ts'

// Réglages de la maquette
const MAX_SPEED = 40 // accélération maximale (×)
const MINUTES_PER_SECOND = 30 // à ×1, 30 min de jeu par seconde (au rythme du jour)
const BOUNCE = 1
const MAX_GROW = 0.5
const INERTIA = 0.35 // s : l'élan conservé au relâché retombe avec cette constante

const SPAN = NEXT_SUNRISE - SUNRISE
/** Position (0 → 1) d'une minute sur la barre, qui couvre 06:00 → 06:00 */
const toBar = (minute: number) => Math.min(1, Math.max(0, (minute - SUNRISE) / SPAN))
const NIGHT_AT = toBar(SUNSET) * 100
const RING = 81.7 // périmètre du cercle de progression (r = 13)
// Le bouton grossit jusqu'à ×1,6 environ : il est dessiné 1,75 fois plus grand (56 px) puis réduit
// au repos, pour rester net quand il gonfle au lieu d'agrandir une image de 32 px
const OVERSIZE = 1.75

/**
 * Timeline du jour et bouton « maintenir » de l'acte 3. Tant qu'on maintient, le temps accélère
 * jusqu'à ×40 ; au relâché, il glisse encore un peu (inertie). Le bouton respire avec un ressort
 * 2D (squash & stretch). Visible seulement pendant l'étape `wait`.
 */
export default function TimeBar() {
  const visible = useGarden((s) => s.step === 'wait')
  // jour en cours : le 1er dès le début de l'acte, le 15e jusqu'au lever qui le termine
  const day = useGarden((s) => Math.min(s.day + 1, DAYS_TO_GROW))
  const [holding, setHolding] = useState(false)
  const t = useStrings().time

  const rootRef = useRef<HTMLElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const ringRef = useRef<SVGCircleElement>(null)
  const dayRef = useRef<HTMLSpanElement>(null)

  // état de la boucle, muté à chaque image sans rendu React
  const sim = useRef({
    holding: false,
    holdStart: 0,
    mult: 1,
    coast: 0,
    // ressort 2D : chaque axe a sa propre échelle et sa vitesse
    sx: 1,
    sy: 1,
    vx: 0,
    vy: 0,
    nextKick: 0,
    axis: 'x' as 'x' | 'y',
  })

  // apparition à l'acte 3, après l'entrée du texte 3 ; disparition dès qu'on le quitte
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (visible) gsap.fromTo(el, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9, delay: 2.4, ease: 'rise' })
    else gsap.to(el, { autoAlpha: 0, y: 14, duration: 0.5, ease: 'power2.in' })
    if (!visible) release()
  }, [visible])

  // chaque nouveau jour : le chiffre saute un peu
  useEffect(() => {
    if (!dayRef.current || day === 1) return
    const tween = gsap.fromTo(dayRef.current, { y: -3, scale: 1.25 }, { y: 0, scale: 1, duration: 0.5, ease: 'back.out(3)' })
    return () => {
      tween.kill()
    }
  }, [day])

  useEffect(() => {
    const tick = (time: number, deltaMs: number) => {
      const p = sim.current
      const now = time * 1000
      const dt = Math.min(0.033, deltaMs / 1000)
      const { advanceTime } = useGarden.getState()

      if (p.holding) {
        const held = (now - p.holdStart) / 1000
        p.mult = Math.min(1 + held * held * 2.5, MAX_SPEED)
        advanceTime(MINUTES_PER_SECOND * p.mult * dt)
        // pichenettes alternées : X, puis Y, puis X… de plus en plus serrées
        const r = (p.mult - 1) / (MAX_SPEED - 1)
        if (now >= p.nextKick) {
          const amp = (2.2 + 1.6 * r) * BOUNCE
          if (p.axis === 'x') {
            p.vx += amp
            p.vy -= amp * 0.6
            p.axis = 'y'
          } else {
            p.vy += amp
            p.vx -= amp * 0.6
            p.axis = 'x'
          }
          p.nextKick = now + 420 - 160 * r
        }
      } else if (p.coast > 0.02) {
        // inertie : la vitesse retombe en douceur (décroissance exponentielle)
        advanceTime(MINUTES_PER_SECOND * p.coast * dt)
        p.coast *= Math.exp(-dt / INERTIA)
      } else {
        p.coast = 0
      }

      // le ressort tire chaque axe vers une taille qui grandit avec l'appui
      const r = p.holding ? (p.mult - 1) / (MAX_SPEED - 1) : 0
      // le vent de l'ambiance forcit avec la vitesse du temps, élan compris
      setTimeSpeed(p.holding ? r : Math.max(0, (p.coast - 1) / (MAX_SPEED - 1)))
      const base = p.holding ? 1.08 + MAX_GROW * r : 1
      const k = 220
      const c = 9
      p.vx += (k * (base - p.sx) - c * p.vx) * dt
      p.vy += (k * (base - p.sy) - c * p.vy) * dt
      p.sx += p.vx * dt
      p.sy += p.vy * dt

      const pct = (toBar(useGarden.getState().minute) * 100).toFixed(2) + '%'
      if (fillRef.current) fillRef.current.style.width = pct
      if (dotRef.current) dotRef.current.style.left = pct
      barRef.current?.setAttribute('aria-valuenow', String(Math.round(parseFloat(pct))))
      if (wrapRef.current) wrapRef.current.style.transform = `scale(${(p.sx / OVERSIZE).toFixed(4)}, ${(p.sy / OVERSIZE).toFixed(4)})`
      ringRef.current?.setAttribute('stroke-dashoffset', (RING * (1 - r)).toFixed(1))
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  const press = () => {
    const p = sim.current
    if (p.holding || useGarden.getState().step !== 'wait') return
    // premier écrasement : large sur X, aplati sur Y
    p.vx += 3.6 * BOUNCE
    p.vy -= 2.6 * BOUNCE
    p.axis = 'y'
    p.nextKick = performance.now() + 220
    p.coast = 0
    p.holding = true
    p.holdStart = gsap.ticker.time * 1000
    p.mult = 1
    setHolding(true)
  }

  function release() {
    const p = sim.current
    if (!p.holding) return
    // au relâché : un rebond vertical, puis le ressort ramène tout en douceur
    p.vy += 3 * BOUNCE
    p.vx -= 2 * BOUNCE
    p.coast = p.mult
    p.holding = false
    p.mult = 1
    setHolding(false)
  }

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    // capture : le doigt peut glisser hors du bouton sans interrompre l'appui
    e.currentTarget.setPointerCapture(e.pointerId)
    press()
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    if (!e.repeat) press()
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') release()
  }

  return (
    <section
      ref={rootRef}
      aria-label={t.section}
      inert={!visible}
      className="invisible pointer-events-auto absolute bottom-12 left-1/2 flex w-[min(420px,calc(100%-32px))] -translate-x-1/2 items-center gap-2.5 rounded-full bg-cream py-1 pl-3.5 pr-1 opacity-0 shadow-sm"
    >
      {/* le jour commence à 06:00 */}
      <Sun aria-hidden size={13} strokeWidth={2.25} className="flex-none text-accent" />
      <div
        ref={barRef}
        role="progressbar"
        aria-label={t.bar}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-2.5 min-w-0 flex-auto"
      >
        {/* piste : le jour en sable, la nuit en bleu gris */}
        <div
          className="absolute inset-x-0 top-1 h-0.5 rounded-sm"
          style={{
            background: `linear-gradient(to right, var(--color-track) ${NIGHT_AT}%, var(--color-night) ${NIGHT_AT}%)`,
          }}
        />
        <div ref={fillRef} className="absolute left-0 top-1 h-0.5 rounded-sm bg-progress" />
        {/* la nuit commence à 20:00 : la lune interrompt la piste, sur le fond de la barre */}
        <Moon
          aria-hidden
          size={13}
          strokeWidth={2.25}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 bg-cream px-0.5 text-accent"
          style={{ left: `${NIGHT_AT}%`, boxSizing: 'content-box' }}
        />
        <div ref={dotRef} className="absolute top-0 -ml-[5px] size-2.5 rounded-full bg-progress" />
      </div>

      {/* compteur de jours : une lecture d'écran l'annonce à chaque changement */}
      <p aria-live="polite" className="m-0 mr-1.5 flex-none whitespace-nowrap text-[11px] font-bold tabular-nums leading-none text-accent">
        <span className="sr-only">{t.daySr(day, DAYS_TO_GROW)}</span>
        <span aria-hidden>
          {t.day}{' '}
          <span ref={dayRef} className="inline-block min-w-[2ch] text-right">
            {day}
          </span>
          <span className="font-semibold text-label">/{DAYS_TO_GROW}</span>
        </span>
      </p>

      {/* emplacement de 32 px dans la barre ; le bouton de 56 px y est centré et réduit */}
      <span className="relative size-8 flex-none">
        <span
          ref={wrapRef}
          className="absolute left-1/2 top-1/2 -ml-7 -mt-7 inline-flex will-change-transform"
          style={{ transform: `scale(${1 / OVERSIZE})` }}
        >
          <button
            type="button"
            aria-label={t.hold}
            aria-pressed={holding}
            onPointerDown={onPointerDown}
            onPointerUp={release}
            onPointerCancel={release}
            onLostPointerCapture={release}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onBlur={release}
            onContextMenu={(e) => e.preventDefault()}
            // 32 px visibles dans la barre fine (56 px réduits), zone tactile étendue à 44 px par le pseudo-élément
            className={`relative flex size-14 cursor-pointer touch-none select-none items-center justify-center rounded-full border-[2.6px] border-accent p-0 transition-colors duration-150 before:absolute before:-inset-[10.5px] before:content-[''] ${
              holding ? 'bg-accent text-cream-light' : 'bg-cream text-accent'
            }`}
          >
            <svg width="56" height="56" viewBox="0 0 32 32" aria-hidden className="absolute -inset-[2.6px] -rotate-90">
              <circle
                ref={ringRef}
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="var(--color-cream-light)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray={RING}
                strokeDashoffset={RING}
              />
            </svg>
            <FastForward aria-hidden size={24} fill="currentColor" strokeWidth={0} />
          </button>
        </span>
      </span>
    </section>
  )
}
