import gsap from 'gsap'
import * as THREE from 'three'
import { advance } from '@react-three/fiber'
import { S } from './world.js'
import { CLIPS, CODE, H, STORY, STRETCH, TERMINAL, W } from './data.js'

/**
 * Le film entier est une seule timeline GSAP en pause. Chaque image est rendue par
 * renderAt(t) : seek de la timeline, mise à jour des valeurs dérivées (caméra, plans du site,
 * compteur, grain), puis un rendu R3F synchrone. Rien ne dépend de l'horloge : le rendu image
 * par image (render/render.mjs) donne exactement la même chose que l'aperçu.
 */

let tl = null

// valeurs pilotées par la timeline et appliquées dans update()
const P = {
  az: 0, // caméra en coordonnées sphériques autour de la cible (degrés)
  el: 7,
  r: 4.1,
  tx: 0,
  ty: 0.1,
  tz: 0,
  fov: 30,
  punch: CLIPS.map(() => 1),
  day: 1,
  grain: 0.07,
}

const $ = (s) => document.querySelector(s)
const $$ = (s) => [...document.querySelectorAll(s)]

const R_HERO = 0.5
const R_CAROUSEL = 0.2
const R_FRUIT = 0.2

/** Pose de caméra (sphérique) d'un plan, pour les coupes franches */
function cam(t, v) {
  tl.set(P, v, t)
}

function typeIn(el, t, perChar = 0.02) {
  const n = el.textContent.length
  tl.fromTo(el, { clipPath: 'inset(0% 100% -20% 0%)' }, { clipPath: 'inset(0% 0% -20% 0%)', duration: n * perChar, ease: `steps(${n})`, immediateRender: false }, t)
  return t + n * perChar
}

function linesIn(sel, t, stagger = 0.08) {
  tl.fromTo($$(`${sel} .ln`), { yPercent: 112 }, { yPercent: 0, duration: 0.62, ease: 'expo.out', stagger, immediateRender: false }, t)
}
function linesOut(sel, t, stagger = 0.04) {
  tl.to($$(`${sel} .ln`), { yPercent: -112, duration: 0.26, ease: 'power3.in', stagger }, t)
}
function swipe(sel, t, d = 0.42) {
  tl.fromTo(sel, { backgroundSize: '0% 42%' }, { backgroundSize: '100% 42%', duration: d, ease: 'power3.out', immediateRender: false }, t)
}

/** Un asset présenté seul : filaire → argile → peint, comme dans le viewport */
function showcase(a, { tIn, tOut, clay, paint, tex, last = false }) {
  tl.set(a.outer, { visible: true }, tIn)
  tl.fromTo(a.outer.position, { x: 2.7 }, { x: 0, duration: 0.42, ease: 'expo.out', immediateRender: false }, tIn)
  tl.fromTo(a.outer.rotation, { y: -2.2, x: 0.16 }, { y: 0.9, duration: tOut - tIn + 0.2, ease: 'none', immediateRender: false }, tIn)
  tl.fromTo(a.outer.scale, { x: R_HERO * 1.5, y: R_HERO * 0.75, z: R_HERO }, { x: R_HERO, y: R_HERO, z: R_HERO, duration: 0.5, ease: 'elastic.out(1, 0.5)', immediateRender: false }, tIn + 0.06)
  tl.fromTo(a.wireMat, { opacity: 1 }, { opacity: 0.22, duration: 0.25, immediateRender: false }, clay)
  tl.fromTo(a.u.uClay, { value: 0 }, { value: 1, duration: 0.3, ease: 'power2.inOut', immediateRender: false }, clay)
  tl.fromTo(a.u.uPaint, { value: 0 }, { value: 1, duration: 0.36, ease: 'power2.inOut', immediateRender: false }, paint)
  tl.to(a.wireMat, { opacity: 0, duration: 0.18 }, paint + 0.22)
  // mode du viewport et carte de texture
  tl.set('#modeRoll', { y: 0 }, tIn)
  tl.to('#modeRoll', { y: -46, duration: 0.22, ease: 'back.out(2)' }, clay)
  tl.to('#modeRoll', { y: -92, duration: 0.22, ease: 'back.out(2)' }, paint)
  const img = $$('.tex')[tex]
  tl.fromTo(img, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.36, ease: 'power2.inOut', immediateRender: false }, paint)
  tl.fromTo('#brush', { left: 0, opacity: 1 }, { left: 220, duration: 0.36, ease: 'power2.inOut', immediateRender: false }, paint)
  tl.to('#brush', { opacity: 0, duration: 0.08 }, paint + 0.36)
  tl.set('#texName', { textContent: ['Pot_Base_Texture.png', 'Arrosoir_Base_Texture.png', 'Fruit_base_texture.png'][tex] }, paint)
  tl.to('#statRoll', { y: -34 * tex, duration: 0.25, ease: 'back.out(2)' }, tIn)
  if (!last) {
    tl.to(a.outer.position, { x: -2.7, duration: 0.24, ease: 'power3.in' }, tOut - 0.24)
    tl.set(a.outer, { visible: false }, tOut)
  }
}

/** Point du plan z=0 sous un pixel de l'écran, pour une pose de caméra donnée */
function screenToWorld(px, py, pose) {
  const c = new THREE.PerspectiveCamera(pose.fov ?? 30, W / H, 0.01, 60)
  placeCamera(c, { ...P, ...pose })
  c.updateMatrixWorld()
  const ndc = new THREE.Vector3((px / W) * 2 - 1, -(py / H) * 2 + 1, 0.5).unproject(c)
  const dir = ndc.sub(c.position).normalize()
  const k = -c.position.z / dir.z
  return c.position.clone().addScaledVector(dir, k)
}

const target = new THREE.Vector3()
function placeCamera(c, p) {
  const az = THREE.MathUtils.degToRad(p.az)
  const el = THREE.MathUtils.degToRad(p.el)
  target.set(p.tx, p.ty, p.tz)
  c.position.set(target.x + p.r * Math.cos(el) * Math.sin(az), target.y + p.r * Math.sin(el), target.z + p.r * Math.cos(el) * Math.cos(az))
  c.lookAt(target)
  if (c.fov !== p.fov) {
    c.fov = p.fov
    c.updateProjectionMatrix()
  }
}

// poses de caméra
const HERO = { az: 0, el: 7, r: 4.1, tx: 0, ty: 0.12, tz: 0, fov: 30 }
const CAROUSEL = { az: 0, el: 18, r: 4.7, tx: 0, ty: -0.14, tz: 0, fov: 30 }
const GARDEN = { az: -32, el: 45, r: 3.15, tx: 0.03, ty: -0.12, tz: 0.04, fov: 30 }
const END = { az: 0, el: 5, r: 4.1, tx: 0, ty: 0.02, tz: 0, fov: 30 }

export function buildTimeline() {
  tl?.kill()
  tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } })
  const stage = $('.stage')

  // ——— état initial ———
  tl.set(P, { ...HERO }, 0)
  tl.set(stage, { '--hud': '#3b2a1e' }, 0)
  tl.set('#bgDark', { clipPath: 'circle(0% at 50% 58%)', opacity: 1 }, 0)
  for (const a of [S.seed, S.pot, S.can, S.fruit]) {
    tl.set(a.outer, { visible: false }, 0)
    tl.set(a.u.uClay, { value: 0 }, 0)
    tl.set(a.u.uPaint, { value: 0 }, 0)
    tl.set(a.wireMat, { opacity: 1 }, 0)
  }
  tl.set(S.seed.u.uClay, { value: 1 }, 0)
  tl.set(S.seed.u.uPaint, { value: 1 }, 0)
  tl.set(S.seed.wireMat, { opacity: 0 }, 0)
  tl.set([S.carousel, S.garden, S.harvest], { visible: false }, 0)
  tl.set(S.grid.mat.uniforms.uOpacity, { value: 0 }, 0)
  tl.set('#bUi, #texCard', { opacity: 0 }, 0)
  tl.set('#term', { y: 640 }, 0)
  tl.set('#chip', { opacity: 0, scale: 0.6 }, 0)
  tl.set('#wipe', { clipPath: 'circle(0px at 525px 1171px)', opacity: 1 }, 0)
  tl.set('#cardBg', { left: 70, top: 410, width: 940, height: 860, backgroundColor: '#fbf6ee', opacity: 0 }, 0)
  tl.set('#code', { opacity: 0, y: 0 }, 0)
  tl.set('#threeWrap', { filter: 'saturate(1) contrast(1)', scale: 1, zIndex: 'auto' }, 0)
  tl.set('#footage', { opacity: 0 }, 0)
  tl.set('#day', { opacity: 0 }, 0)
  tl.set($$('.ln'), { yPercent: 140 }, 0)
  tl.set('#verbs', { autoAlpha: 0 }, 0)
  tl.set('#verbs', { autoAlpha: 1 }, 9.98)
  tl.set($$('.hl'), { backgroundSize: '0% 42%' }, 0)
  tl.set($$('.type'), { clipPath: 'inset(0% 100% -20% 0%)' }, 0)
  tl.set($$('.tex'), { clipPath: 'inset(0% 100% 0% 0%)' }, 0)
  tl.set('#chapRoll', { y: 0 }, 0)
  tl.fromTo('#prog', { scaleX: 0 }, { scaleX: 1, duration: STORY, ease: 'none', immediateRender: false }, 0)

  const chapter = (i, t) => tl.to('#chapRoll', { y: -30 * i, duration: 0.4, ease: 'expo.out' }, t)

  // ——— 0. accroche : une graine tombe (0 → 1,5 s) ———
  const seed = S.seed
  tl.set(seed.outer, { visible: true }, 0)
  tl.set(seed.outer.scale, { x: 0.46, y: 0.46, z: 0.46 }, 0)
  tl.fromTo(seed.outer.position, { x: 0, y: 2.2 }, { y: -0.2, duration: 0.24, ease: 'power2.in', immediateRender: false }, 0.06)
  tl.to(seed.outer.scale, { x: 0.6, y: 0.3, z: 0.6, duration: 0.04, ease: 'power2.out' }, 0.3)
  tl.to(seed.outer.scale, { x: 0.46, y: 0.46, z: 0.46, duration: 0.45, ease: 'elastic.out(1.1, 0.32)' }, 0.34)
  tl.fromTo(seed.outer.rotation, { y: -0.6, x: 1.2, z: 0.3 }, { y: 4.2, x: 1.05, duration: 1.7, ease: 'none', immediateRender: false }, 0)
  linesIn('#hook', 0.1, 0.1)
  swipe('#hook .hl', 0.5)
  // retour aux sources : la peinture s'efface, l'argile aussi, il reste le filaire
  tl.to(seed.u.uPaint, { value: 0, duration: 0.26, ease: 'power1.in' }, 0.98)
  tl.to(seed.wireMat, { opacity: 0.95, duration: 0.16 }, 1.06)
  tl.to(seed.u.uClay, { value: 0, duration: 0.24, ease: 'power1.in' }, 1.18)
  linesOut('#hook', 1.0, 0.05)
  tl.to('#bgDark', { clipPath: 'circle(120% at 50% 58%)', duration: 0.48, ease: 'power3.in' }, 1.02)
  tl.to(stage, { '--hud': '#e9e2d8', duration: 0.2 }, 1.3)
  tl.to(P, { fov: 24, duration: 0.5, ease: 'power2.in' }, 1.0)
  tl.to(seed.outer.position, { x: -2.4, duration: 0.2, ease: 'power3.in' }, 1.42)
  tl.set(seed.outer, { visible: false }, 1.62)

  // ——— 1. Blender (1,5 → 4,2 s) ———
  cam(1.5, { ...HERO })
  chapter(1, 1.5)
  tl.to(S.grid.mat.uniforms.uOpacity, { value: 1, duration: 0.35 }, 1.48)
  tl.fromTo('#bUi', { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.35, immediateRender: false }, 1.55)
  tl.fromTo('#texCard', { opacity: 0, y: 30, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.6)', immediateRender: false }, 2.0)
  showcase(S.pot, { tIn: 1.46, tOut: 2.62, clay: 1.74, paint: 2.08, tex: 0 })
  showcase(S.can, { tIn: 2.58, tOut: 3.22, clay: 2.7, paint: 2.88, tex: 1 })
  showcase(S.fruit, { tIn: 3.18, tOut: 3.7, clay: 3.27, paint: 3.4, tex: 2, last: true })
  linesIn('#bTitle', 1.62, 0.09)
  swipe('#bTitle .hl', 2.05)
  tl.to(P, { fov: 28, duration: 2.2, ease: 'none' }, 1.5)

  // carrousel de tous les assets
  tl.to(S.fruit.outer.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.2, ease: 'power3.in' }, 3.6)
  tl.set(S.fruit.outer, { visible: false }, 3.8)
  tl.set(S.carousel, { visible: true }, 3.66)
  tl.set(S.carousel.position, { y: 0 }, 0)
  const carouselEnd = 5.3
  const carouselSpin = Math.PI * 1.2
  tl.fromTo(S.carousel.rotation, { y: -0.5 }, { y: carouselSpin - 0.5, duration: carouselEnd - 3.66, ease: 'power2.inOut', immediateRender: false }, 3.66)
  S.carouselItems.forEach((it, i) => {
    tl.set(it.outer.scale, { x: 0.001, y: 0.001, z: 0.001 }, 0)
    tl.fromTo(it.slot.position, { x: 0, y: 0, z: 0 }, { ...vec(it.slot.userData.slot), duration: 0.6, ease: 'expo.out', immediateRender: false }, 3.68 + i * 0.03)
    tl.to(it.outer.scale, { x: R_CAROUSEL, y: R_CAROUSEL, z: R_CAROUSEL, duration: 0.5, ease: 'back.out(2.2)' }, 3.68 + i * 0.03)
    tl.fromTo(it.outer.rotation, { y: 0, x: 0.2 }, { y: 5, duration: 2.6, ease: 'none', immediateRender: false }, 3.66)
  })
  tl.to(P, { ...CAROUSEL, duration: 0.6, ease: 'expo.inOut' }, 3.62)
  tl.to('#statRoll', { y: -34 * 3, duration: 0.25, ease: 'back.out(2)' }, 3.7)
  tl.to('#modeRoll', { y: -92, duration: 0.2 }, 3.7)
  linesOut('#bTitle', 3.92)
  tl.to('#texCard', { opacity: 0, y: 30, duration: 0.25, ease: 'power2.in' }, 3.9)

  // ——— 2. Claude × Blender via MCP (4,2 → 6,4 s) ———
  chapter(2, 4.2)
  tl.to('#bUi', { opacity: 0, y: -16, duration: 0.25, ease: 'power2.in' }, 4.05)
  linesIn('#cTitle', 4.2, 0.09)
  swipe('#cTitle .hl', 4.55)
  tl.to('#term', { y: 0, duration: 0.5, ease: 'expo.out' }, 4.26)
  tl.fromTo('.pulse', { left: '-5%' }, { left: '102%', duration: 0.62, ease: 'power1.inOut', stagger: 0.2, repeat: 2, immediateRender: false }, 4.5)
  const tls = $$('.tl')
  const tres = $$('.tres')
  const typeStarts = [4.58, 4.94, 5.2]
  TERMINAL.forEach((_, i) => {
    const end = typeIn(tls[i], typeStarts[i], 0.016)
    tl.fromTo(tres[i], { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.2, immediateRender: false }, end + 0.04)
  })
  tl.to('#chip', { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.4)' }, 5.24)

  // les assets plongent dans le fichier exporté
  const chipWorld = screenToWorld(525, 1171, CAROUSEL)
  S.carouselItems.forEach((it, i) => {
    const t = 5.34 + i * 0.055
    const local = chipWorld.clone().sub(S.carousel.position).applyAxisAngle(new THREE.Vector3(0, 1, 0), -(carouselSpin - 0.5))
    tl.to(it.slot.position, { x: local.x, y: local.y, z: local.z, duration: 0.34, ease: 'power3.in' }, t)
    tl.to(it.outer.scale, { x: 0.02, y: 0.02, z: 0.02, duration: 0.34, ease: 'power4.in' }, t)
    tl.fromTo('#chip', { scale: 1.1 }, { scale: 1, duration: 0.2, ease: 'power2.out', immediateRender: false }, t + 0.34)
  })
  tl.set(S.carousel, { visible: false }, 5.92)
  // la 3D passe devant le terminal le temps que les assets entrent dans le fichier
  tl.to(S.grid.mat.uniforms.uOpacity, { value: 0, duration: 0.2 }, 5.12)
  tl.set('#threeWrap', { zIndex: 2 }, 5.32)
  tl.set('#threeWrap', { zIndex: 'auto' }, 5.95)

  // le fichier s'ouvre sur le plan
  tl.to('#wipe', { clipPath: 'circle(1700px at 525px 1171px)', duration: 0.46, ease: 'power3.in' }, 5.9)
  tl.to(stage, { '--hud': '#3b2a1e', duration: 0.15 }, 6.15)
  tl.set('#bgDark', { opacity: 0 }, 6.38)
  tl.set('#term', { opacity: 0 }, 6.38)
  tl.set('#cTitle', { opacity: 0 }, 6.38)
  tl.set('#wipe', { opacity: 0 }, 6.38)

  // ——— 3. un plan en 8 phases (6,4 → 8,4 s) ———
  chapter(3, 6.4)
  linesIn('#dTitle', 6.34, 0.08)
  swipe('#dTitle .hl', 6.7, 0.5)
  tl.fromTo('#cardBg', { opacity: 0, y: 100 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', immediateRender: false }, 6.38)
  tl.fromTo($$('#plan .row'), { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out', stagger: 0.04, immediateRender: false }, 6.44)
  const chk = $$('#plan .chk')
  const rows = $$('#plan .row')
  chk.forEach((c, i) => {
    const t = 6.84 + i * 0.1
    tl.to(c, { scale: 1, duration: 0.32, ease: 'back.out(3)' }, t)
    tl.fromTo(rows[i], { backgroundColor: 'rgba(232,198,144,0)' }, { backgroundColor: 'rgba(232,198,144,0.42)', duration: 0.08, immediateRender: false }, t)
    tl.to(rows[i], { backgroundColor: 'rgba(232,198,144,0.12)', duration: 0.4 }, t + 0.1)
    tl.to('#digitRoll', { yPercent: (-(i + 1) * 100) / 9, duration: 0.2, ease: 'power3.out' }, t)
  })
  tl.to($$('#plan .row'), { opacity: 0, y: -24, duration: 0.18, ease: 'power2.in', stagger: 0.012 }, 7.98)
  linesOut('#dTitle', 8.0)
  tl.to('#cardBg', { left: 60, top: 870, width: 960, height: 420, backgroundColor: '#2a1f18', borderRadius: 30, duration: 0.42, ease: 'expo.inOut' }, 8.02)

  // ——— 4. React Three Fiber monte la scène (8,4 → 10 s) ———
  chapter(4, 8.4)
  tl.set(S.garden, { visible: true }, 8.3)
  cam(8.3, { ...GARDEN })
  tl.to(P, { az: -18, duration: 1.4, ease: 'none' }, 8.3)
  tl.set(S.ground.mat.uniforms.uReveal, { value: 0 }, 0)
  S.gardenPots.forEach((p) => tl.set(p.group, { visible: false }, 0))
  S.piles.forEach((p) => tl.set(p.scale, { x: 0.001, y: 0.001, z: 0.001 }, 0))
  tl.set(S.gardenCan.group, { visible: false }, 0)
  tl.set('#threeWrap', { filter: 'saturate(0.7) contrast(0.96) brightness(1.03)' }, 8.3)
  linesIn('#eTitle', 8.4, 0.08)
  swipe('#eTitle .hl', 8.78)
  tl.to('#code', { opacity: 1, duration: 0.14 }, 8.38)
  const cl = $$('.cl')
  const codeTimes = [8.44, 8.62, 8.8, 9.0, 9.18, 9.36, 9.56]
  codeTimes.forEach((t, i) => {
    typeIn(cl[i], t, 0.012)
    tl.to('#codeBar', { top: 16 + i * 44, opacity: 1, duration: 0.12, ease: 'power2.out' }, t)
  })
  // <Ground />
  tl.to(S.ground.mat.uniforms.uReveal, { value: 1, duration: 0.55, ease: 'power2.out' }, 8.68)
  // <Pots />
  S.gardenPots.forEach((p, i) => {
    const t = 8.9 + i * 0.06
    tl.set(p.group, { visible: true }, t)
    tl.fromTo(p.body.position, { y: 0.5 }, { y: 0, duration: 0.14, ease: 'power2.in', immediateRender: false }, t)
    tl.fromTo(p.body.scale, { x: 1, y: 1, z: 1 }, { x: 1.12, y: 0.8, z: 1.12, duration: 0.04, ease: 'power2.out', immediateRender: false }, t + 0.14)
    tl.to(p.body.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'elastic.out(1, 0.35)' }, t + 0.18)
  })
  // <SeedPiles />
  S.piles.forEach((p, i) => tl.to(p.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(2.6)' }, 9.08 + i * 0.05))
  // <WateringCan />
  tl.set(S.gardenCan.group, { visible: true }, 9.26)
  tl.fromTo(S.gardenCan.body.position, { y: 0.55 }, { y: 0, duration: 0.15, ease: 'power2.in', immediateRender: false }, 9.26)
  tl.fromTo(S.gardenCan.body.rotation, { z: 0.5 }, { z: 0, duration: 0.15, ease: 'power2.in', immediateRender: false }, 9.26)
  tl.fromTo(S.gardenCan.body.scale, { x: 1, y: 1, z: 1 }, { x: 1.12, y: 0.82, z: 1.12, duration: 0.04, immediateRender: false }, 9.41)
  tl.to(S.gardenCan.body.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'elastic.out(1, 0.35)' }, 9.45)
  // <PostFX />
  tl.to('#threeWrap', { filter: 'saturate(1.14) contrast(1.05) brightness(1.04) sepia(0.1)', duration: 0.2 }, 9.46)
  tl.fromTo('#flash', { opacity: 0.45 }, { opacity: 0, duration: 0.3, immediateRender: false }, 9.46)
  tl.fromTo(P, { grain: 0.07 }, { grain: 0.11, duration: 0.2, immediateRender: false }, 9.46)
  tl.to($$('.stk'), { scale: 1, duration: 0.3, ease: 'back.out(3)', stagger: 0.04 }, 9.5)
  // poussée dans le jardin, jusque dans le site
  linesOut('#eTitle', 9.7)
  tl.to(['#code', '#cardBg'], { y: 560, duration: 0.3, ease: 'power3.in' }, 9.7)
  tl.to(P, { r: 1.2, el: 50, az: -16, duration: 0.3, ease: 'power3.in' }, 9.7)

  // ——— 5. le site, en vrai (10 → 13,4 s) ———
  chapter(5, 10.0)
  tl.set('#footage', { opacity: 1 }, 10.0)
  tl.set(S.garden, { visible: false }, 10.0)
  tl.set('#threeWrap', { filter: 'none' }, 10.0)
  tl.set(P, { grain: 0.08 }, 10.0)
  CLIPS.forEach((c, i) => {
    tl.fromTo(P.punch, { [i]: 1.22 }, { [i]: 1, duration: 0.45, ease: 'expo.out', immediateRender: false }, c.start)
    tl.fromTo('#flash', { opacity: i === 0 ? 0.55 : 0.3 }, { opacity: 0, duration: 0.2, immediateRender: false }, c.start)
    const verb = `.verb:nth-child(${i + 1})`
    linesIn(verb, c.start + 0.02, 0.05)
    swipe(`${verb} .hl`, c.start + 0.2, 0.32)
    linesOut(verb, c.end - 0.14, 0.02)
  })
  tl.fromTo('#day', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.2, immediateRender: false }, CLIPS[2].start + 0.05)
  tl.fromTo(P, { day: 1 }, { day: 15, duration: 0.72, ease: 'none', immediateRender: false }, CLIPS[2].start + 0.06)
  tl.to('#day', { opacity: 0, y: -10, duration: 0.12 }, CLIPS[2].end - 0.1)

  // ——— fin : jusqu'au fruit (13,4 → 15 s) ———
  chapter(6, 13.4)
  tl.set('#footage', { opacity: 0 }, 13.4)
  tl.fromTo('#flash', { opacity: 0.5 }, { opacity: 0, duration: 0.3, immediateRender: false }, 13.4)
  tl.set(P, { grain: 0.07 }, 13.4)
  cam(13.4, { ...END })
  tl.set(S.harvest, { visible: true }, 13.38)
  S.fruits.forEach((f, i) => {
    const k = (i - 3.5) / 3.5
    const x = k * 0.64
    const y = -0.12 + 0.2 * k * k
    const t = 13.42 + [3, 4, 2, 5, 1, 6, 0, 7].indexOf(i) * 0.05
    tl.set(f.outer.scale, { x: R_FRUIT, y: R_FRUIT, z: R_FRUIT }, 0)
    tl.set(f.outer.position, { x, y: 2.4, z: Math.abs(k) * -0.15 }, 0)
    tl.to(f.outer.position, { y, duration: 0.2, ease: 'power2.in' }, t)
    tl.to(f.outer.scale, { x: R_FRUIT * 1.25, y: R_FRUIT * 0.7, z: R_FRUIT * 1.25, duration: 0.04 }, t + 0.2)
    tl.to(f.outer.scale, { x: R_FRUIT, y: R_FRUIT, z: R_FRUIT, duration: 0.45, ease: 'elastic.out(1.1, 0.3)' }, t + 0.24)
    tl.fromTo(f.outer.rotation, { y: i * 0.8, z: k * 0.25, x: 0.1 }, { y: i * 0.8 + 1.6, duration: 1.7, ease: 'power1.out', immediateRender: false }, 13.38)
  })
  linesIn('#endText', 13.46, 0.09)
  swipe('#endText .hl', 13.86)
  linesIn('#credits', 14.0, 0.07)
  tl.to(P, { r: 3.85, duration: 1.6, ease: 'power1.out' }, 13.4)

  tl.set({}, {}, STORY)
  return tl
}

function vec(v) {
  return { x: v.x, y: v.y, z: v.z }
}

// ——— plans du site ———
const cache = new Map()
function frameImage(name, idx) {
  const url = `/footage/${name}/${String(idx).padStart(4, '0')}.jpg`
  let p = cache.get(url)
  if (!p) {
    const img = new Image()
    img.src = url
    p = img.decode().then(() => img)
    cache.set(url, p)
    if (cache.size > 160) cache.delete(cache.keys().next().value)
  }
  return p
}

const easeOut = (x) => 1 - (1 - x) ** 2
async function drawFootage(t) {
  const c = CLIPS.find((c) => t >= c.start && t < c.end)
  if (!c || t >= 13.4) return
  const i = CLIPS.indexOf(c)
  const k = (t - c.start) / (c.end - c.start)
  const src = c.src0 + (c.src1 - c.src0) * k
  const idx = Math.min(c.frames, Math.max(1, Math.round(src * 30) + 1))
  const img = await frameImage(c.name, idx)
  const e = easeOut(k)
  const cx = c.crop0[0] + (c.crop1[0] - c.crop0[0]) * e
  const cy = c.crop0[1] + (c.crop1[1] - c.crop0[1]) * e
  const h = Math.min(1080, (c.crop0[2] + (c.crop1[2] - c.crop0[2]) * e) / P.punch[i])
  const w = h * (W / H)
  const sx = Math.min(1200 - w, Math.max(0, cx - w / 2))
  const sy = Math.min(1080 - h, Math.max(0, cy - h / 2))
  const ctx = $('#footage').getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, w, h, 0, 0, W, H)
}

// ——— grain animé (déterministe) ———
let grainData = null
function drawGrain(frame) {
  const cv = $('#grain')
  const g = cv.getContext('2d')
  if (!grainData) grainData = g.createImageData(cv.width, cv.height)
  const d = grainData.data
  let s = (frame * 2654435761) >>> 0
  for (let i = 0; i < d.length; i += 4) {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    const v = 128 + ((s >>> 0) % 256 - 128) * 0.9
    d[i] = d[i + 1] = d[i + 2] = v
    d[i + 3] = 255
  }
  g.putImageData(grainData, 0, 0)
  cv.style.opacity = P.grain
}

export async function renderAt(t) {
  if (!tl) return
  const ts = t / STRETCH // temps du récit
  tl.seek(Math.min(ts, STORY - 1e-4), true)
  placeCamera(S.camera, P)
  $('#dayNum').textContent = String(Math.round(P.day)).padStart(2, '0')
  await drawFootage(ts)
  drawGrain(Math.floor(t * 60))
  advance(performance.now(), true)
}
