import { useSound } from '../stores/useSound.ts'

/**
 * Moteur audio : un seul AudioContext, créé et débloqué au premier geste (iOS et Chrome refusent
 * de jouer du son avant). Tous les sons du site sont synthétisés ici, sans fichier audio.
 *
 *   sources → sfx ──┐
 *   sources → amb ──┴→ master (coupure du son) → compresseur → sortie
 */

/** Volume général ; le compresseur rattrape les cumuls (pluie de gouttes + oiseaux + note) */
const MASTER_GAIN = 0.85

type Engine = {
  ctx: AudioContext
  master: GainNode
  sfx: GainNode
  amb: GainNode
  noise: AudioBuffer
}

let engine: Engine | null = null

function create(): Engine {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AC({ latencyHint: 'interactive' })
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.knee.value = 12
  comp.ratio.value = 3
  comp.attack.value = 0.004
  comp.release.value = 0.25
  comp.connect(ctx.destination)
  // dev : un analyseur en sortie, pour mesurer les niveaux depuis la console
  if (import.meta.env.DEV) {
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    comp.connect(analyser)
    Object.assign(window, { __audio: { ctx, analyser } })
  }

  const master = ctx.createGain()
  master.gain.value = useSound.getState().muted ? 0 : MASTER_GAIN
  master.connect(comp)
  const sfx = ctx.createGain()
  sfx.connect(master)
  const amb = ctx.createGain()
  amb.connect(master)

  // 2 s de bruit blanc, partagé par tous les sons de souffle, d'eau et de terre
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  return { ctx, master, sfx, amb, noise }
}

/** À appeler dans un gestionnaire de geste : crée le contexte au besoin et le relance */
function unlock() {
  if (document.hidden) return
  if (!engine) engine = create()
  const { ctx } = engine
  if (ctx.state === 'running') return
  void ctx.resume()
  // iOS : un buffer muet joué pendant le geste achève le déblocage
  const src = ctx.createBufferSource()
  src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
  src.connect(ctx.destination)
  src.start()
}

/**
 * Le moteur, seulement s'il joue vraiment et que le son n'est pas coupé : sinon les sons ne sont
 * même pas programmés (rien ne s'accumule pour sortir d'un coup au retour du son).
 */
export function live(): Engine | null {
  if (!engine || engine.ctx.state !== 'running' || useSound.getState().muted) return null
  return engine
}

/** Écoute les gestes, l'onglet caché et la coupure du son ; renvoie le nettoyage */
export function installEngine() {
  const events = ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const
  events.forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }))

  // onglet caché : le contexte se met en pause (batterie), il repart au retour
  const onVisibility = () => {
    if (!engine) return
    if (document.hidden) void engine.ctx.suspend()
    else void engine.ctx.resume()
  }
  document.addEventListener('visibilitychange', onVisibility)

  const unsubscribe = useSound.subscribe((s, prev) => {
    if (!engine || s.muted === prev.muted) return
    engine.master.gain.setTargetAtTime(s.muted ? 0 : MASTER_GAIN, engine.ctx.currentTime, 0.06)
  })

  return () => {
    events.forEach((e) => window.removeEventListener(e, unlock, { capture: true }))
    document.removeEventListener('visibilitychange', onVisibility)
    unsubscribe()
  }
}

// ——— briques de synthèse ———

/** Panoramique stéréo (absent des vieux Safari : on s'en passe alors) */
function panned(e: Engine, dest: AudioNode, pan: number): AudioNode {
  if (!pan || !e.ctx.createStereoPanner) return dest
  const p = e.ctx.createStereoPanner()
  p.pan.value = pan
  p.connect(dest)
  return p
}

/** Enveloppe attaque linéaire → décroissance exponentielle sur `g.gain` */
function envelope(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

export type ToneOptions = {
  freq: number
  /** Fréquence d'arrivée (glissando exponentiel sur toute la note) */
  to?: number
  type?: OscillatorType
  at?: number
  peak?: number
  attack?: number
  decay?: number
  pan?: number
  bus?: 'sfx' | 'amb'
}

export function tone(e: Engine, o: ToneOptions) {
  const t = o.at ?? e.ctx.currentTime
  const attack = o.attack ?? 0.005
  const decay = o.decay ?? 0.3
  const osc = e.ctx.createOscillator()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(o.freq, t)
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + attack + decay * 0.6)
  const g = e.ctx.createGain()
  envelope(g, t, o.peak ?? 0.2, attack, decay)
  osc.connect(g).connect(panned(e, e[o.bus ?? 'sfx'], o.pan ?? 0))
  osc.start(t)
  osc.stop(t + attack + decay + 0.05)
}

export type NoiseOptions = {
  filter?: BiquadFilterType
  freq: number
  to?: number
  q?: number
  at?: number
  peak?: number
  attack?: number
  decay?: number
  pan?: number
  bus?: 'sfx' | 'amb'
}

/** Bouffée de bruit filtré : souffle, terre, clic, impact de goutte */
export function noise(e: Engine, o: NoiseOptions) {
  const t = o.at ?? e.ctx.currentTime
  const attack = o.attack ?? 0.002
  const decay = o.decay ?? 0.05
  const src = e.ctx.createBufferSource()
  src.buffer = e.noise
  const f = e.ctx.createBiquadFilter()
  f.type = o.filter ?? 'bandpass'
  f.frequency.setValueAtTime(o.freq, t)
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + attack + decay)
  f.Q.value = o.q ?? 1
  const g = e.ctx.createGain()
  envelope(g, t, o.peak ?? 0.2, attack, decay)
  src.connect(f).connect(g).connect(panned(e, e[o.bus ?? 'sfx'], o.pan ?? 0))
  // départ au hasard dans le buffer : deux bouffées voisines ne se ressemblent pas
  src.start(t, Math.random() * 1.5)
  src.stop(t + attack + decay + 0.05)
}

/** Boucle de bruit filtré au volume piloté (vent, filet d'eau) */
export function noiseLoop(e: Engine, filter: BiquadFilterType, freq: number, q: number, bus: 'sfx' | 'amb') {
  const src = e.ctx.createBufferSource()
  src.buffer = e.noise
  src.loop = true
  const f = e.ctx.createBiquadFilter()
  f.type = filter
  f.frequency.value = freq
  f.Q.value = q
  const g = e.ctx.createGain()
  g.gain.value = 0
  src.connect(f).connect(g).connect(e[bus])
  src.start(e.ctx.currentTime, Math.random() * 1.5)
  return { filter: f, gain: g, stop: () => src.stop() }
}

/** Gamme pentatonique de ré majeur (ré mi fa# la si), degré 0 = ré 4 */
export function pentatonic(degree: number) {
  const steps = [0, 2, 4, 7, 9]
  const octave = Math.floor(degree / 5)
  const semi = steps[((degree % 5) + 5) % 5] + 12 * octave
  return 293.66 * 2 ** (semi / 12)
}

/** Note pincée façon kalimba : fondamentale ronde, partiel aigu bref, petit clic d'attaque */
export function pluck(e: Engine, freq: number, at?: number, peak = 0.16, pan = 0) {
  const t = at ?? e.ctx.currentTime
  tone(e, { freq, at: t, peak, attack: 0.004, decay: 0.9, pan })
  tone(e, { freq: freq * 4.02, at: t, peak: peak * 0.22, attack: 0.002, decay: 0.12, pan })
  tone(e, { freq: freq * 2, type: 'triangle', at: t, peak: peak * 0.18, attack: 0.002, decay: 0.25, pan })
}
