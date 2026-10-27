import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGarden } from '../../stores/useGarden.ts'
import { useUi } from '../../stores/useUi.ts'

/** Temps de lecture laissé au texte 1, une fois écrit, avant de révéler le jardin */
const READ_PAUSE = 1.2

/**
 * Fond uni de l'intro. Il masque le chargement de la scène pendant que le texte 1 s'écrit, puis se
 * lève quand le texte est écrit ET la scène prête : le jardin apparaît et l'acte 1 commence.
 */
export default function IntroCurtain() {
  const ref = useRef<HTMLDivElement>(null)
  const isIntro = useGarden((s) => s.step === 'intro')
  const sceneReady = useUi((s) => s.sceneReady)
  const introWritten = useUi((s) => s.introWritten)

  const wasIntro = useRef(isIntro)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // retour à l'intro (reset en dev) : le rideau revient d'un coup et attend la nouvelle écriture
    if (isIntro && !wasIntro.current) {
      wasIntro.current = true
      useUi.getState().setIntroWritten(false)
      gsap.set(el, { autoAlpha: 1, overwrite: true })
      return
    }
    wasIntro.current = isIntro
    if (isIntro && !introWritten) return
    if (!isIntro) {
      // acte 1 commencé : le rideau se lève (aussi via le bouton start du panneau dev)
      gsap.to(el, { autoAlpha: 0, duration: 1.4, ease: 'power2.inOut', overwrite: true })
      return
    }
    if (!sceneReady) return
    const tl = gsap
      .timeline({ delay: READ_PAUSE })
      // start() fait glisser le texte vers le haut ; le rideau se lève dans la branche !isIntro
      .call(() => useGarden.getState().start())
    return () => {
      tl.kill()
    }
  }, [isIntro, sceneReady, introWritten])

  return <div ref={ref} aria-hidden className="pointer-events-auto absolute inset-0 z-10 bg-curtain" />
}
