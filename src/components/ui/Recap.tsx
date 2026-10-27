import { type ReactNode, type Ref, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Check, Sparkles } from 'lucide-react'
import { type RecapStep, type Strings, useStrings } from '../../i18n/strings.ts'
import { REDUCED_MOTION } from '../../lib/gsapSetup.ts'

const IMG = `${import.meta.env.BASE_URL}recap/`
const TEXTURES = ['arrosoir_base_texture', 'pot_base_texture', 'fruit_base_texture', 'feuille_base_texture']
// couleurs de la maquette (tokens de index.css)
const SWATCHES = ['#efe6d6', '#e8c690', '#b5702a', '#9c5b20', '#3b2a1e']

type Visuals = Strings['recap']['visuals']

/** Cadre commun des illustrations : même format pour toutes les étapes */
function Frame({ label, children, className = '' }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <figure
      role={label ? 'img' : undefined}
      aria-label={label}
      className={`m-0 mb-4 aspect-[16/10] overflow-hidden rounded-2xl bg-cream ring-1 ring-track ${className}`}
    >
      {children}
    </figure>
  )
}

/** 1. Direction artistique : la palette et les deux typographies de la maquette */
function PaletteVisual({ v }: { v: Visuals }) {
  return (
    <Frame label={v.palette} className="flex flex-col justify-center gap-4 px-5">
      <div className="flex gap-2">
        {SWATCHES.map((c) => (
          <span key={c} className="h-10 flex-1 rounded-lg ring-1 ring-ink/10" style={{ background: c }} />
        ))}
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="font-story text-[44px] italic leading-none text-ink">Aa</span>
        <span className="text-right text-[12px] font-semibold leading-snug text-label">
          Fraunces
          <br />
          <span className="font-ui font-bold text-accent">Nunito</span>
        </span>
      </div>
    </Frame>
  )
}

/** 2. Textures peintes à la main, telles qu'elles sortent de Blender (dépliage UV) */
function TexturesVisual({ v }: { v: Visuals }) {
  return (
    <Frame className="grid grid-cols-2 grid-rows-2 gap-1 bg-ink p-1">
      {TEXTURES.map((name, i) => (
        <img key={name} src={`${IMG}${name}.jpg`} alt={v.textures[i]} loading="lazy" className="size-full rounded-xl object-cover" />
      ))}
    </Frame>
  )
}

/** 3. Le plan : les 9 phases, toutes cochées */
function PlanVisual({ v }: { v: Visuals }) {
  return (
    <Frame className="px-4 py-3">
      <ol className="m-0 grid h-full list-none grid-cols-2 content-center gap-x-3 gap-y-1.5 p-0">
        {v.phases.map((name, i) => (
          <li key={name} className="flex min-w-0 items-center gap-1.5 text-[11.5px] leading-tight text-ink/80">
            <span className="flex size-4 flex-none items-center justify-center rounded-[5px] bg-progress text-cream-light">
              <Check aria-hidden size={11} strokeWidth={3} />
            </span>
            <span className="truncate">
              <span className="font-bold text-accent">{i}</span> · {name}
            </span>
          </li>
        ))}
      </ol>
    </Frame>
  )
}

/** 4. Blender MCP : extrait de l'inventaire et des exports de la phase 0 */
function TerminalVisual({ v }: { v: Visuals }) {
  return (
    <Frame className="flex flex-col bg-ink! ring-ink">
      <div className="flex gap-1.5 px-3 pt-2.5" aria-hidden>
        {['#e8c690', '#b5702a', '#7e5a2e'].map((c) => (
          <span key={c} className="size-2 rounded-full" style={{ background: c }} />
        ))}
      </div>
      <ul className="m-0 flex flex-1 list-none flex-col justify-center gap-1 px-4 py-2 font-mono text-[11.5px] leading-snug text-cream/85">
        {v.terminal.map((line, i) => (
          <li key={line} className={i === v.terminal.length - 1 ? 'text-mark' : ''}>
            <span className="text-progress">{i === 0 ? 'blender ›' : '›'}</span> {line}
          </li>
        ))}
      </ul>
    </Frame>
  )
}

/** 5. Une description explicite : une vraie demande, et la réponse de Claude */
function PromptVisual({ v }: { v: Visuals }) {
  return (
    <Frame className="flex flex-col justify-center gap-2 px-4">
      <p className="m-0 ml-6 self-end rounded-2xl rounded-br-md bg-accent px-3 py-2 text-[12px] leading-snug text-cream-light">
        <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-cream-light/70">{v.me}</span>
        {v.prompt}
      </p>
      <p className="m-0 mr-6 flex gap-1.5 self-start rounded-2xl rounded-bl-md bg-cream-light px-3 py-2 text-[12px] leading-snug text-ink ring-1 ring-track">
        <Sparkles aria-hidden size={13} strokeWidth={2.25} className="mt-0.5 flex-none text-accent" />
        <span>
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-label">Claude</span>
          {v.reply}
        </span>
      </p>
    </Frame>
  )
}

/** 6. Validation : le site testé sur ordinateur et sur téléphone */
function ScreensVisual({ v }: { v: Visuals }) {
  return (
    <Frame label={v.screens} className="relative">
      <img src={`${IMG}site-desktop.jpg`} alt="" loading="lazy" className="size-full object-cover" />
      <img
        src={`${IMG}site-mobile.jpg`}
        alt=""
        loading="lazy"
        className="absolute bottom-2 right-3 h-[82%] w-auto rounded-xl border-[3px] border-ink shadow-lg"
      />
    </Frame>
  )
}

const VISUALS: Record<RecapStep['icon'], (p: { v: Visuals }) => ReactNode> = {
  palette: PaletteVisual,
  brush: TexturesVisual,
  plan: PlanVisual,
  mcp: TerminalVisual,
  prompt: PromptVisual,
  check: ScreensVisual,
}

/**
 * Récap du workflow, sous le popup de fin : de la maquette au site, étape par étape, chacune avec
 * son illustration. Chaque étape entre en fondu quand elle arrive à l'écran.
 */
export default function Recap({ ref }: { ref: Ref<HTMLElement> }) {
  const t = useStrings().recap
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const list = listRef.current
    if (!list || REDUCED_MOTION) return
    const items = [...list.children] as HTMLElement[]
    gsap.set(items, { autoAlpha: 0, y: 18 })
    const io = new IntersectionObserver(
      (entries) => {
        const shown = entries.filter((e) => e.isIntersecting).map((e) => e.target)
        if (!shown.length) return
        gsap.to(shown, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'rise' })
        shown.forEach((el) => io.unobserve(el))
      },
      { threshold: 0.2 },
    )
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      aria-labelledby="recap-title"
      className="w-full max-w-[760px] scroll-mt-6 rounded-[28px] bg-cream-light px-5 py-8 text-left shadow-xl ring-1 ring-track sm:px-10 sm:py-10"
    >
      <h2 id="recap-title" className="m-0 text-balance font-story-soft text-[clamp(24px,5vw,32px)] leading-tight text-ink">
        {t.title}
      </h2>
      <p className="mb-8 mt-3 text-[15px] leading-relaxed text-ink/80">{t.lead}</p>

      <ol ref={listRef} className="m-0 grid list-none gap-x-8 gap-y-9 p-0 sm:grid-cols-2">
        {t.steps.map((step, i) => {
          const Visual = VISUALS[step.icon]
          return (
            <li key={step.icon}>
              <Visual v={t.visuals} />
              <h3 className="m-0 text-[15px] font-bold leading-snug text-ink">
                <span className="mr-1.5 tabular-nums text-progress">{i + 1}.</span>
                {step.title}
              </h3>
              <p className="m-0 mt-1 text-[14px] leading-relaxed text-ink/75">{step.body}</p>
            </li>
          )
        })}
      </ol>

      <p className="mb-0 mt-9 border-t border-track pt-5 text-[12px] font-semibold leading-relaxed text-label">{t.stack}</p>
    </section>
  )
}
