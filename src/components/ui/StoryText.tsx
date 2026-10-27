import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGarden } from '../../stores/useGarden.ts'
import { useUi } from '../../stores/useUi.ts'
import { REDUCED_MOTION } from '../../lib/gsapSetup.ts'
import { TEXT_FOR_STEP } from './storyTexts.ts'
import { useStrings } from '../../i18n/strings.ts'

// état caché d'une ligne : la maquette fait monter de 10 px avec un flou de 4 px
const HIDDEN = REDUCED_MOTION ? { opacity: 0 } : { opacity: 0, y: 10, filter: 'blur(4px)' }
const GONE = REDUCED_MOTION ? { opacity: 0 } : { opacity: 0, y: -8, filter: 'blur(4px)' }

/** Décalage vertical qui amène le bloc de texte au centre de l'écran (mesuré sans transform) */
const centerOffset = (el: HTMLElement) => window.innerHeight / 2 - (el.offsetTop + el.offsetHeight / 2)

/**
 * Texte du récit. Pendant l'intro, le texte 1 s'écrit au centre, sur le rideau uni ; il glisse
 * ensuite en haut d'écran quand la scène se révèle. À chaque étape suivante, le texte sort et le
 * suivant entre.
 */
export default function StoryText() {
  const step = useGarden((s) => s.step)
  const isIntro = step === 'intro'
  const target = TEXT_FOR_STEP[step]
  const { story } = useStrings()

  const [shown, setShown] = useState(target)
  // incrémenté pour rejouer l'entrée du même texte (retour à l'intro via reset)
  const [epoch, setEpoch] = useState(0)

  const boxRef = useRef<HTMLParagraphElement>(null)
  const targetRef = useRef(target)
  const shownRef = useRef(shown)
  const introRef = useRef(isIntro)
  // déclaré avant les autres effets : ils lisent ces refs à jour
  useLayoutEffect(() => {
    shownRef.current = shown
    introRef.current = isIntro
  })

  // changement d'étape : le texte affiché sort, puis le suivant entre
  useEffect(() => {
    targetRef.current = target
    const box = boxRef.current
    if (!box || target === shownRef.current) return
    const lines = box.querySelectorAll('[data-line]')
    if (!lines.length) {
      setShown(target)
      return
    }
    const tween = gsap.to(lines, {
      ...GONE,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power2.in',
      overwrite: true,
      // l'étape a pu encore changer pendant la sortie : on affiche la plus récente
      onComplete: () => setShown(targetRef.current),
    })
    return () => {
      tween.kill()
    }
  }, [target])

  // entrée ou sortie de l'intro
  const wasIntro = useRef(isIntro)
  useEffect(() => {
    const box = boxRef.current
    if (wasIntro.current === isIntro || !box) return
    wasIntro.current = isIntro
    if (!isIntro) {
      // même texte : il glisse du centre vers le haut pendant que le rideau se lève
      gsap.to(box, { y: 0, duration: 1.4, ease: 'power3.inOut', overwrite: 'auto' })
    } else if (shownRef.current === 0) {
      // retour à l'intro avec le texte 1 déjà affiché : on rejoue son écriture
      setEpoch((e) => e + 1)
    }
  }, [isIntro])

  // entrée d'un texte : lignes une à une (fondu, flou, montée), puis surlignage du mot clé
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box || shown === null) return
    const intro = introRef.current
    const ctx = gsap.context(() => {
      const lines = box.querySelectorAll('[data-line]')
      const marks = box.querySelectorAll('[data-mark]')
      if (intro) useUi.getState().setIntroWritten(false)
      gsap.set(box, { y: intro ? centerOffset(box) : 0 })
      gsap.set(lines, HIDDEN)
      gsap.set(marks, { backgroundSize: '0% 42%' })

      gsap
        .timeline({ delay: 0.3, onComplete: () => intro && useUi.getState().setIntroWritten(true) })
        .to(lines, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, stagger: 0.8, ease: 'rise' })
        .to(marks, { backgroundSize: '100% 42%', duration: 0.8, ease: 'mark' }, 1.8)
    }, box)
    return () => ctx.kill()
  }, [shown, epoch])

  // pendant l'intro, le texte reste centré si la fenêtre change de taille ou si les polices arrivent
  useEffect(() => {
    const recenter = () => {
      const box = boxRef.current
      if (box && introRef.current) gsap.set(box, { y: centerOffset(box) })
    }
    window.addEventListener('resize', recenter)
    document.fonts?.ready.then(recenter)
    return () => window.removeEventListener('resize', recenter)
  }, [])

  // changer de langue remplace le texte en place, sans rejouer son entrée
  const lines = shown === null ? [] : story[shown]

  return (
    <p
      ref={boxRef}
      aria-live="polite"
      className="absolute inset-x-0 top-16 z-20 sm:top-10 mx-auto max-w-[780px] px-4 text-center font-story-soft text-[clamp(24px,3vw,34px)] leading-[1.38] text-ink"
    >
      {lines.map((line, i) => (
        <span key={`${shown}-${epoch}-${i}`} data-line className="block text-balance opacity-0">
          {line.map((chunk, j) =>
            typeof chunk === 'string' ? (
              chunk
            ) : (
              <em key={j} data-mark className="story-mark">
                {chunk.mark}
              </em>
            ),
          )}
        </span>
      ))}
    </p>
  )
}
