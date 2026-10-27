import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Clapperboard, Languages, Volume2, VolumeX, X } from 'lucide-react'
import { useGarden } from '../../stores/useGarden.ts'
import { useLang } from '../../stores/useLang.ts'
import { useSound } from '../../stores/useSound.ts'
import { useUi } from '../../stores/useUi.ts'
import { useStrings } from '../../i18n/strings.ts'

const BUTTON =
  'pointer-events-auto flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-cream/90 px-3 text-accent shadow-sm transition-colors duration-150 hover:bg-cream-light'

/**
 * Contrôles en haut à droite, dès que le jardin apparaît : langue, mode cinématique et son.
 * Ils restent au-dessus du popup de fin (sauf le mode cinématique, qui n'y a plus de sens).
 * Les raccourcis du mode cinématique sont dans useCinemaControl.
 */
export default function TopControls() {
  const t = useStrings()
  const lang = useLang((s) => s.lang)
  const muted = useSound((s) => s.muted)
  const cinema = useUi((s) => s.cinema)
  const step = useGarden((s) => s.step)
  const visible = step !== 'intro'
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const tween = visible
      ? gsap.fromTo(el, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.7, delay: 1.2, ease: 'back.out(2)' })
      : gsap.set(el, { autoAlpha: 0 })
    return () => void tween.kill()
  }, [visible])

  // la page suit la langue : attribut lang (lecteurs d'écran) et titre de l'onglet
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t.title
  }, [lang, t.title])

  // l'écran de fin interrompt le mode cinématique
  useEffect(() => {
    if (step === 'end' || step === 'intro') useUi.getState().setCinema(false)
  }, [step])

  const SoundIcon = muted ? VolumeX : Volume2

  return (
    <div ref={ref} inert={!visible} className="invisible absolute right-3 top-3 z-50 flex gap-2 opacity-0">
      <button type="button" onClick={useLang.getState().toggleLang} aria-label={t.lang.label} title={t.lang.label} className={BUTTON}>
        <Languages aria-hidden size={18} strokeWidth={2.25} />
        <span className="text-[13px] font-bold leading-none">{t.lang.short}</span>
      </button>
      {step !== 'end' && (
        <button
          type="button"
          onClick={() => useUi.getState().setCinema(!cinema)}
          aria-pressed={cinema}
          aria-label={cinema ? t.cinema.stop : t.cinema.start}
          title={cinema ? t.cinema.stop : t.cinema.start}
          className={BUTTON}
        >
          {cinema ? <X aria-hidden size={20} strokeWidth={2.25} /> : <Clapperboard aria-hidden size={19} strokeWidth={2.25} />}
        </button>
      )}
      <button
        type="button"
        onClick={useSound.getState().toggleMuted}
        aria-pressed={muted}
        aria-label={muted ? t.sound.unmute : t.sound.mute}
        title={muted ? t.sound.unmute : t.sound.mute}
        className={BUTTON}
      >
        <SoundIcon aria-hidden size={20} strokeWidth={2.25} />
      </button>
    </div>
  )
}
