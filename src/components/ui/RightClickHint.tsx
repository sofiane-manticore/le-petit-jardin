import { useLayoutEffect, useRef } from 'react'
import { Html } from '@react-three/drei'
import gsap from 'gsap'
import { MouseRight, Space } from 'lucide-react'
import { COARSE_POINTER } from '../../lib/device.ts'
import { REDUCED_MOTION } from '../../lib/gsapSetup.ts'
import { useUi } from '../../stores/useUi.ts'
import { useStrings } from '../../i18n/strings.ts'

/**
 * Picto au-dessus de l'arrosoir tenu, sur desktop : clic droit maintenu (ou Espace) pour verser.
 * Il s'efface pendant que l'eau coule. Sur écran tactile, c'est le bouton « verser » qui guide.
 */
export default function RightClickHint() {
  const pouring = useUi((s) => s.pouring)
  const ref = useRef<HTMLDivElement>(null)
  const t = useStrings().hint

  // apparition : petite montée et fondu
  useLayoutEffect(() => {
    if (!ref.current) return
    const tween = gsap.fromTo(
      ref.current,
      REDUCED_MOTION ? { opacity: 0 } : { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.35, delay: 0.15, ease: 'rise' },
    )
    return () => void tween.kill()
  }, [])

  if (COARSE_POINTER) return null

  return (
    <Html position={[0, 0.07, 0]} center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
      <div
        className="transition-opacity duration-200"
        style={{ opacity: pouring ? 0 : 1 }}
      >
        <div
          ref={ref}
          className="flex select-none items-center gap-1.5 whitespace-nowrap rounded-full bg-cream/95 px-2.5 py-1 text-[12px] font-semibold text-accent shadow-sm"
        >
          <MouseRight aria-hidden size={15} strokeWidth={2.25} />
          <span>{t.rightClick}</span>
          <span className="text-label">{t.or}</span>
          <Space aria-hidden size={15} strokeWidth={2.25} />
          <span>{t.space}</span>
        </div>
      </div>
    </Html>
  )
}
