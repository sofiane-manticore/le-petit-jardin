import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Box, Check, FileBox, MousePointer2, Terminal, Code2 } from 'lucide-react'
import Scene from './Scene.jsx'
import { buildTimeline, renderAt } from './timeline.js'
import { CHAPTERS, CODE, DURATION, H, PHASES, TERMINAL, VERBS, W } from './data.js'

const isRender = new URLSearchParams(location.search).has('render')

function Line({ children, className = '', style }) {
  return (
    <span className="mask">
      <span className={`ln ${className}`} style={style}>
        {children}
      </span>
    </span>
  )
}

const CODE_COLORS = { t: '#e59a5c', c: '#f6d48f', a: '#c9b79c', p: '#a99a86', n: '#9fc27a' }

export default function App() {
  const stageRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [scale, setScale] = useState(1)

  // aperçu : la scène 1080×1350 tient dans la fenêtre
  useEffect(() => {
    if (isRender) return
    const fit = () => setScale(Math.min(innerWidth / W, innerHeight / H))
    fit()
    addEventListener('resize', fit)
    return () => removeEventListener('resize', fit)
  }, [])

  useEffect(() => {
    if (!ready) return
    let raf = 0
    ;(async () => {
      await document.fonts.ready
      buildTimeline()
      await renderAt(0)
      window.__renderAt = renderAt
      window.__duration = DURATION
      window.__ready = true
      if (isRender) return
      const t0 = performance.now()
      let busy = false
      const loop = async () => {
        raf = requestAnimationFrame(loop)
        if (busy) return
        busy = true
        await renderAt(((performance.now() - t0) / 1000) % DURATION)
        busy = false
      }
      loop()
    })()
    return () => cancelAnimationFrame(raf)
  }, [ready])

  return (
    <div ref={stageRef} className="stage text-encre" style={{ transform: isRender ? 'none' : `scale(${scale})` }}>
      {/* fonds */}
      <div id="bgCream" className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 42%, #f6e5c8 0%, #efe0c6 45%, #e6d3b4 100%)' }} />
      <div id="bgDark" className="absolute inset-0" style={{ background: 'radial-gradient(130% 100% at 50% 35%, #454545 0%, #323232 55%, #262626 100%)', clipPath: 'circle(0% at 50% 50%)' }} />

      {/* 3D */}
      <div id="threeWrap" className="absolute inset-0">
        <Canvas
          flat
          frameloop="never"
          dpr={1}
          gl={{ antialias: true, preserveDrawingBuffer: true, alpha: true }}
          camera={{ fov: 30, near: 0.01, far: 60, position: [0, 0.1, 4.2] }}
          style={{ width: W, height: H }}
        >
          <Suspense fallback={null}>
            <Scene onReady={() => setReady(true)} />
          </Suspense>
        </Canvas>
      </div>

      {/* plans du site */}
      <canvas id="footage" width={W} height={H} className="absolute inset-0" style={{ opacity: 0 }} />
      <div id="flash" className="absolute inset-0 bg-white" style={{ opacity: 0 }} />

      {/* ——— 0. accroche ——— */}
      <div id="hook" className="serif absolute inset-x-0 text-center" style={{ top: 150, fontSize: 148, lineHeight: 1.02, fontWeight: 330 }}>
        <Line>D’une</Line>
        <Line className="italic">
          <span className="hl">graine</span>…
        </Line>
      </div>

      {/* ——— 1. Blender ——— */}
      <div id="bUi" className="absolute font-sans text-[#d9d9d9]" style={{ left: 64, top: 128, opacity: 0 }}>
        <div className="flex items-center gap-3 text-[25px] font-bold">
          <span className="flex items-center gap-2 rounded-full bg-[#1f1f1f] px-5 py-2 ring-1 ring-white/10">
            <Box size={24} strokeWidth={2.2} className="text-[#ffad4d]" /> Blender 5.2
          </span>
          <span className="relative h-[46px] w-[250px] overflow-hidden rounded-full bg-[#1f1f1f] ring-1 ring-white/10">
            <span id="modeRoll" className="absolute inset-x-0 top-0 block">
              {['Wireframe', 'Solid', 'Texture Paint'].map((m) => (
                <span key={m} className="flex h-[46px] items-center justify-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffad4d]" />
                  {m}
                </span>
              ))}
            </span>
          </span>
        </div>
        <div className="mt-5 font-mono text-[22px] leading-[1.55] text-[#bdbdbd]">
          <div className="relative h-[34px] overflow-hidden">
            <div id="statRoll" className="absolute inset-x-0 top-0">
              {[
                ['Pot', '2 986'],
                ['Arrosoir', '2 910'],
                ['Fruit', '322'],
                ['12 objets', '7 matériaux'],
              ].map(([o, f]) => (
                <div key={o} className="h-[34px]">
                  <span className="text-[#ffad4d]">{o}</span>
                  {f.includes('mat') ? <span className="text-[#8f8f8f]">  ·  {f}</span> : <span className="text-[#8f8f8f]">  ·  {f} faces</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div id="texCard" className="absolute overflow-hidden rounded-[22px] bg-[#1b1b1b] p-3 shadow-2xl ring-1 ring-white/10" style={{ left: 770, top: 640, width: 250, opacity: 0 }}>
        <div className="mb-2 flex items-center justify-between px-1 font-mono text-[15px] text-[#9a9a9a]">
          <span id="texName">Pot_Base_Texture.png</span>
        </div>
        <div className="relative h-[226px] w-[226px] overflow-hidden rounded-xl bg-black">
          {['Pot_Base_Texture', 'Arrosoir_Base_Texture', 'Fruit_base_texture'].map((t, i) => (
            <img key={t} className="tex absolute inset-0 h-full w-full object-cover" src={`/tex/${t}.jpg`} style={{ clipPath: 'inset(0 100% 0 0)', zIndex: i }} alt="" />
          ))}
          <div id="brush" className="absolute top-0 h-full w-[6px] bg-[#ffd08a] shadow-[0_0_18px_6px_rgba(255,180,90,0.7)]" style={{ left: 0, opacity: 0, zIndex: 9 }} />
        </div>
      </div>

      <div id="bTitle" className="serif absolute text-[#f3ece2]" style={{ left: 64, top: 1010, fontSize: 104, lineHeight: 1.04, fontWeight: 320 }}>
        <Line>Modélisé & peint</Line>
        <Line className="italic" style={{ '--hl': 'rgba(255,173,77,0.55)' }}>
          <span className="hl">à la main</span>
        </Line>
      </div>

      {/* ——— 2. MCP ——— */}
      <div id="cTitle" className="serif absolute inset-x-0 text-center text-[#f3ece2]" style={{ top: 132, fontSize: 104, lineHeight: 1.04, fontWeight: 320 }}>
        <Line>Claude × Blender</Line>
        <Line className="italic" style={{ '--hl': 'rgba(255,173,77,0.55)' }}>
          via <span className="hl">MCP</span>
        </Line>
      </div>

      <div id="term" className="absolute overflow-hidden rounded-[30px] bg-[#161412] font-mono text-[25px] text-[#e9dfd1] shadow-[0_30px_80px_rgba(0,0,0,0.5)] ring-1 ring-white/10" style={{ left: 60, top: 800, width: 960, height: 470 }}>
        <div className="flex items-center gap-4 border-b border-white/10 px-8 py-5 font-sans text-[24px] font-bold">
          <Terminal size={26} className="text-[#a8957b]" />
          <span className="rounded-full bg-[#2a2622] px-4 py-1 text-[#ffad4d]">Blender</span>
          <span className="relative h-[3px] flex-1 overflow-hidden rounded bg-white/10">
            {[0, 1, 2].map((i) => (
              <span key={i} className="pulse absolute top-[-4px] h-[11px] w-[11px] rounded-full bg-[#e8c690] shadow-[0_0_12px_3px_rgba(232,198,144,0.7)]" style={{ left: '-5%' }} />
            ))}
          </span>
          <span className="rounded-full bg-[#2a2622] px-4 py-1 text-[#e8c690]">Claude</span>
        </div>
        <div className="space-y-4 px-8 pt-7">
          {TERMINAL.map((l, i) => (
            <div key={i} className="flex items-baseline justify-between">
              <span>
                <span className="text-[#a8957b]">› </span>
                <span className="type tl" style={{ width: `${l.cmd.length}ch` }}>
                  {l.cmd}
                </span>
              </span>
              <span className="tres text-[#9fc27a]" style={{ opacity: 0 }}>
                ✓ {l.res}
              </span>
            </div>
          ))}
        </div>
        <div id="chip" className="absolute flex items-center gap-4 rounded-2xl bg-[#e8c690] px-6 py-4 font-sans text-[26px] font-extrabold text-[#3b2a1e]" style={{ left: 300, top: 336, opacity: 0 }}>
          <FileBox size={34} strokeWidth={2.2} /> jardin.glb
          <span className="font-mono text-[20px] font-semibold text-[#7a4a1a]">1,5 Mo</span>
        </div>
      </div>

      <div id="wipe" className="absolute inset-0" style={{ background: '#efe0c6', clipPath: 'circle(0px at 540px 1180px)' }} />

      {/* ——— 3. plan ——— */}
      <div id="dTitle" className="serif absolute inset-x-0 text-center" style={{ top: 120, fontSize: 112, lineHeight: 1.02, fontWeight: 330 }}>
        <Line>Un plan</Line>
        <Line className="italic">
          en{' '}
          <span className="hl inline-flex items-baseline">
            <span className="relative inline-block h-[1.02em] w-[0.62em] overflow-hidden align-baseline not-italic" style={{ verticalAlign: '-0.2em' }}>
              <span id="digitRoll" className="absolute inset-x-0 top-0 block">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((d) => (
                  <span key={d} className="block h-[1.02em] text-center">
                    {d}
                  </span>
                ))}
              </span>
            </span>
            &nbsp;phases
          </span>
        </Line>
      </div>

      <div id="cardBg" className="absolute rounded-[34px] bg-[#fbf6ee] shadow-[0_30px_70px_rgba(90,60,30,0.18)]" style={{ left: 70, top: 410, width: 940, height: 860, opacity: 0 }} />
      <div id="plan" className="absolute font-sans" style={{ left: 70, top: 410, width: 940, height: 860 }}>
        <div className="flex flex-col gap-[6px] px-9 pt-9">
          {PHASES.map(({ icon: Icon, name, note }, i) => (
            <div key={name} className="row flex h-[92px] items-center gap-6 rounded-2xl px-5" style={{ opacity: 0 }}>
              <span className="font-mono text-[22px] text-[#a8957b]">{String(i + 1).padStart(2, '0')}</span>
              <span className="grid h-[56px] w-[56px] place-items-center rounded-2xl bg-[#efe3cf] text-[#9c5b20]">
                <Icon size={30} strokeWidth={2} />
              </span>
              <span className="flex-1 leading-tight">
                <span className="block text-[31px] font-extrabold text-[#3b2a1e]">{name}</span>
                <span className="block text-[21px] font-semibold text-[#a8957b]">{note}</span>
              </span>
              <span className="chk grid h-[50px] w-[50px] place-items-center rounded-full bg-[#9c5b20] text-white" style={{ transform: 'scale(0)' }}>
                <Check size={30} strokeWidth={3} />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ——— 4. R3F ——— */}
      <div id="eTitle" className="serif absolute inset-x-0 text-center" style={{ top: 96, fontSize: 96, lineHeight: 1.04, fontWeight: 330 }}>
        <Line>Construit en</Line>
        <Line className="italic">
          <span className="hl">React Three Fiber</span>
        </Line>
      </div>

      <div id="code" className="absolute font-mono text-[27px] leading-[1.62]" style={{ left: 60, top: 870, width: 960, height: 420, opacity: 0 }}>
        <div className="flex items-center justify-between border-b border-white/10 px-8 py-4 font-sans text-[22px] font-bold text-[#a99a86]">
          <span className="flex items-center gap-3">
            <Code2 size={24} className="text-[#e59a5c]" /> Experience.jsx
          </span>
          <span className="flex gap-2">
            {['R3F', 'GSAP', 'Tailwind', 'Lucide'].map((s) => (
              <span key={s} className="stk rounded-full bg-[#3b2d23] px-3 py-1 text-[19px] text-[#e8c690]" style={{ transform: 'scale(0)' }}>
                {s}
              </span>
            ))}
          </span>
        </div>
        <div className="relative px-8 pt-4">
          <div id="codeBar" className="absolute left-3 right-3 h-[44px] rounded-lg bg-white/[0.06]" style={{ top: 16, opacity: 0 }} />
          {CODE.map((line, i) => (
            <div key={i} className="relative h-[44px]">
              <span className="type cl" style={{ width: `${line.reduce((n, [, s]) => n + s.length, 0)}ch` }}>
                {line.map(([k, s], j) => (
                  <span key={j} style={{ color: CODE_COLORS[k] }}>
                    {s}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ——— 5. le site ——— */}
      <div id="verbs" className="serif absolute" style={{ left: 64, top: 112, fontSize: 132, lineHeight: 1, fontWeight: 340 }}>
        {VERBS.map((v, i) => (
          <div key={v} className="verb absolute left-0 top-0 whitespace-nowrap">
            <span className="mask text-[26px] leading-[1.3]">
              <span className="ln font-sans text-[26px] font-extrabold tracking-[0.2em] text-[#9c5b20] uppercase" style={{ fontStyle: 'normal' }}>
                {String(i + 1).padStart(2, '0')} / 04
              </span>
            </span>
            <Line className="italic">
              <span className="hl">{v}</span>.
            </Line>
          </div>
        ))}
      </div>
      <div id="day" className="absolute font-sans text-[30px] font-extrabold text-[#3b2a1e]" style={{ right: 64, top: 176, opacity: 0 }}>
        <span className="rounded-full bg-[#fbf6ee]/90 px-6 py-3 shadow-lg">
          Jour <span id="dayNum" className="font-mono">01</span>
          <span className="text-[#a8957b]">/15</span>
        </span>
      </div>
      <div id="cursorHint" className="absolute text-[#3b2a1e]" style={{ left: 0, top: 0, opacity: 0 }}>
        <MousePointer2 size={44} fill="#fbf6ee" strokeWidth={1.6} />
      </div>

      {/* ——— fin ——— */}
      <div id="endText" className="serif absolute inset-x-0 text-center" style={{ top: 150, fontSize: 148, lineHeight: 1.02, fontWeight: 330 }}>
        <Line>…jusqu’au</Line>
        <Line className="italic">
          <span className="hl">fruit</span>.
        </Line>
      </div>
      <div id="credits" className="absolute inset-x-0 text-center" style={{ top: 1000 }}>
        <Line className="serif text-[64px] font-[380]">Le petit jardin</Line>
        <Line className="mt-3 font-sans text-[27px] font-bold text-[#8a7458]">Modélisé à la main dans Blender · développé avec Claude</Line>
        <Line className="mt-1 font-sans text-[27px] font-bold text-[#8a7458]">React Three Fiber · GSAP · Tailwind · Lucide</Line>
      </div>

      {/* ——— HUD ——— */}
      <div id="hud" className="pointer-events-none absolute inset-0 z-[3] font-sans" style={{ color: 'var(--hud, #3b2a1e)' }}>
        <div className="absolute left-16 top-12 text-[22px] font-extrabold tracking-[0.22em] uppercase">Le petit jardin</div>
        <div className="absolute right-16 top-12 h-[30px] overflow-hidden text-right text-[22px] font-extrabold tracking-[0.22em] uppercase">
          <div id="chapRoll">
            {CHAPTERS.map((c, i) => (
              <div key={i} className="h-[30px] leading-[30px]">
                {c}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-[46px] left-16 right-16 flex items-center gap-6 text-[20px] font-bold tracking-[0.16em] uppercase">
          <span className="opacity-70">Sofiane Saez × Claude</span>
          <span className="relative h-[3px] flex-1 overflow-hidden rounded-full" style={{ background: 'color-mix(in srgb, var(--hud, #3b2a1e) 18%, transparent)' }}>
            <span id="prog" className="absolute inset-y-0 left-0 w-full origin-left rounded-full" style={{ background: 'var(--hud, #3b2a1e)', transform: 'scaleX(0)' }} />
          </span>
        </div>
      </div>

      <canvas id="grain" width={540} height={675} className="pointer-events-none absolute inset-0 z-[3] h-full w-full" style={{ mixBlendMode: 'overlay', opacity: 0.07 }} />
      <div className="pointer-events-none absolute inset-0 z-[3]" style={{ background: 'radial-gradient(120% 90% at 50% 50%, transparent 60%, rgba(40,25,10,0.22) 100%)' }} />
    </div>
  )
}

