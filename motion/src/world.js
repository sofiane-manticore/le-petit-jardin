import * as THREE from 'three'

/**
 * Tout le monde 3D du film, construit une fois à partir des GLB du site.
 * Le registre `S` est lu par la timeline GSAP (timeline.js), qui anime directement
 * positions, échelles et uniforms : aucun état React, donc chaque image est reproductible.
 */
export const S = {}

const LIGHT = new THREE.Vector3(0.45, 1, 0.7).normalize()

const paintVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vP;
  varying vec3 vWN;
  varying vec3 vVN;
  void main() {
    vUv = uv;
    vP = position;
    vWN = normalize(mat3(modelMatrix) * normal);
    vVN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Trois états d'un asset, comme dans Blender : filaire (lignes à part), argile (Solid), peint (Texture Paint).
// uClay et uPaint balaient l'objet le long de uAxis avec un front bruité et un liseré lumineux.
const paintFragment = /* glsl */ `
  uniform sampler2D map;
  uniform float uHasMap;
  uniform vec3 uBase;
  uniform float uClay;
  uniform float uPaint;
  uniform float uOpacity;
  uniform float uShade;
  uniform float uAlphaTest;
  uniform float uNoise;
  uniform vec3 uAxis;
  uniform vec2 uRange;
  uniform vec3 uClayCol;
  uniform vec3 uEdgeCol;
  uniform vec3 uLight;
  uniform vec3 uTint;
  varying vec2 vUv;
  varying vec3 vP;
  varying vec3 vWN;
  varying vec3 vVN;

  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  void main() {
    if (uOpacity < 0.003) discard;
    float d = (dot(vP, uAxis) - uRange.x) / (uRange.y - uRange.x);
    d += (noise(vP * uNoise) - 0.5) * 0.22 + (noise(vP * uNoise * 3.1) - 0.5) * 0.08;
    float w = 0.16;
    float fc = uClay * (1.0 + 2.0 * w) - w;
    float fp = uPaint * (1.0 + 2.0 * w) - w;
    if (d > fc) discard;

    vec4 tex = uHasMap > 0.5 ? texture2D(map, vUv) : vec4(1.0);
    if (tex.a < uAlphaTest) discard;

    vec3 n = normalize(vWN);
    float wrap = dot(n, uLight) * 0.5 + 0.5;
    float rim = pow(1.0 - abs(normalize(vVN).z), 3.0);

    vec3 clay = uClayCol * (0.42 + 0.7 * wrap) + rim * 0.12;
    vec3 painted = tex.rgb * uBase * uTint * (1.0 - uShade * (1.0 - wrap));
    float paintM = 1.0 - smoothstep(fp - 0.012, fp + 0.012, d);
    vec3 col = mix(clay, painted, paintM);

    float live = step(0.001, uPaint) * step(uPaint, 0.999);
    float edgeP = (1.0 - smoothstep(0.0, 0.035, abs(d - fp))) * live;
    float liveC = step(0.001, uClay) * step(uClay, 0.999);
    float edgeC = (1.0 - smoothstep(0.0, 0.03, abs(d - fc))) * liveC;
    col += uEdgeCol * edgeP * 1.4 + vec3(0.9, 0.95, 1.0) * edgeC * 0.9;

    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }
`

function makeUniforms() {
  return {
    uClay: { value: 1 },
    uPaint: { value: 1 },
    uOpacity: { value: 1 },
    uShade: { value: 0.32 },
    uNoise: { value: 20 },
    uAxis: { value: new THREE.Vector3(1, 0.55, 0.25).normalize() },
    uRange: { value: new THREE.Vector2(-1, 1) },
    uClayCol: { value: new THREE.Color('#a9a9a9') },
    uEdgeCol: { value: new THREE.Color('#ffb347') },
    uLight: { value: LIGHT },
    uTint: { value: new THREE.Color(1, 1, 1) },
  }
}

function paintMaterial(src, u, alphaTest = 0) {
  const map = src.map ?? null
  const m = new THREE.ShaderMaterial({
    uniforms: {
      ...u,
      map: { value: map },
      uHasMap: { value: map ? 1 : 0 },
      uBase: { value: src.color ? src.color.clone() : new THREE.Color(1, 1, 1) },
      uAlphaTest: { value: alphaTest },
    },
    vertexShader: paintVertex,
    fragmentShader: paintFragment,
    transparent: true,
    side: src.side ?? THREE.FrontSide,
  })
  m.polygonOffset = true
  m.polygonOffsetFactor = 1
  m.polygonOffsetUnits = 1
  return m
}

/**
 * Clone un nœud du GLB avec le matériau « peint » à trois états.
 * center: recentre et normalise (rayon 1) pour les plans de présentation ; sinon échelle réelle.
 */
function makeAsset(node, { center = false, wire = false, wireColor = '#e6e6e6', alphaTest = 0 } = {}) {
  const inner = node.clone(true)
  inner.position.set(0, 0, 0)
  inner.rotation.set(0, 0, 0)
  inner.updateMatrixWorld(true)
  const u = makeUniforms()
  const meshes = []
  inner.traverse((o) => o.isMesh && meshes.push(o))

  // étendue de l'objet le long de l'axe de balayage, dans le repère du mesh
  let min = Infinity
  let max = -Infinity
  const v = new THREE.Vector3()
  for (const m of meshes) {
    const p = m.geometry.attributes.position
    for (let i = 0; i < p.count; i++) {
      const d = v.fromBufferAttribute(p, i).dot(u.uAxis.value)
      min = Math.min(min, d)
      max = Math.max(max, d)
    }
  }
  u.uRange.value.set(min, max)
  u.uNoise.value = 7 / (max - min)

  const wireMat = new THREE.LineBasicMaterial({ color: wireColor, transparent: true, opacity: 0, depthWrite: false })
  for (const m of meshes) {
    m.material = paintMaterial(m.material, u, alphaTest)
    if (wire) {
      const lines = new THREE.LineSegments(new THREE.WireframeGeometry(m.geometry), wireMat)
      lines.raycast = () => {}
      m.add(lines)
    }
  }

  const outer = new THREE.Group()
  outer.add(inner)
  let radius = 1
  if (center) {
    const box = new THREE.Box3().setFromObject(inner)
    const c = box.getCenter(new THREE.Vector3())
    radius = box.getBoundingSphere(new THREE.Sphere()).radius
    inner.scale.multiplyScalar(1 / radius)
    inner.position.copy(c).multiplyScalar(-1 / radius)
  }
  return { outer, inner, u, wireMat, radius }
}

/** Sol peint du site : alpha de la texture, fondu des bords, apparition radiale */
function makeGround(node) {
  const src = node.material
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: src.map }, uReveal: { value: 1 }, uOpacity: { value: 0.62 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform float uReveal; uniform float uOpacity; varying vec2 vUv;
      void main(){
        vec4 t = texture2D(map, vUv);
        vec2 e = smoothstep(0.0, 0.14, vUv) * smoothstep(0.0, 0.14, 1.0 - vUv);
        float r = length(vUv - 0.5) * 2.0;
        float rev = 1.0 - smoothstep(uReveal * 1.5 - 0.35, uReveal * 1.5, r + t.a * 0.0);
        gl_FragColor = vec4(t.rgb * 1.08, t.a * e.x * e.y * uOpacity * rev);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(node.geometry, mat)
  mesh.renderOrder = -2
  return { mesh, mat }
}

/** Ombre de contact douce (le site pose une ombre très légère) */
let blobTex = null
function blob(w, h, opacity = 0.28) {
  if (!blobTex) {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grd.addColorStop(0, 'rgba(40,24,10,1)')
    grd.addColorStop(0.55, 'rgba(40,24,10,0.45)')
    grd.addColorStop(1, 'rgba(40,24,10,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, 128, 128)
    blobTex = new THREE.CanvasTexture(c)
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity, depthWrite: false }),
  )
  m.rotation.x = -Math.PI / 2
  m.position.y = 0.001
  m.renderOrder = -1
  return m
}

/** Grille du viewport Blender : lignes fines, axes X rouge et Y vert, fondu radial */
function makeGrid() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uCell: { value: 0.25 } },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; uniform float uCell; varying vec3 vW;
      void main(){
        vec2 c = vW.xz / uCell;
        vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
        float line = 1.0 - min(min(g.x, g.y), 1.0);
        vec2 c2 = vW.xz / (uCell * 4.0);
        vec2 g2 = abs(fract(c2 - 0.5) - 0.5) / fwidth(c2);
        float major = 1.0 - min(min(g2.x, g2.y), 1.0);
        float ax = 1.0 - min(abs(vW.z) / fwidth(vW.z) / 1.4, 1.0);
        float az = 1.0 - min(abs(vW.x) / fwidth(vW.x) / 1.4, 1.0);
        float fade = 1.0 - smoothstep(0.6, 3.6, length(vW.xz));
        vec3 col = vec3(0.36);
        float a = max(line * 0.35, major * 0.55);
        col = mix(col, vec3(0.86, 0.26, 0.3), ax);
        col = mix(col, vec3(0.45, 0.68, 0.18), az * (1.0 - ax));
        a = max(a, max(ax, az) * 0.9);
        gl_FragColor = vec4(col, a * fade * uOpacity);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), mat)
  m.rotation.x = -Math.PI / 2
  return { mesh: m, mat }
}

// Composition du site (WEB/src/scene/layout.ts)
const POTS = [
  { position: [-0.162, 0, -0.102], rotationY: 0.06 },
  { position: [0.152, 0, -0.118], rotationY: -0.09 },
  { position: [-0.141, 0, 0.098], rotationY: -0.05 },
  { position: [0.174, 0, 0.112], rotationY: 0.08 },
]
const SEED_PILES = [
  [-0.468, 0, -0.17],
  [-0.492, 0, -0.058],
  [-0.474, 0, 0.056],
  [-0.498, 0, 0.17],
]
const CAN = { position: [0.5, 0, 0.01], rotationY: -Math.PI / 2 - 0.45 }

function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

export function buildWorld(jardin, plantes) {
  const node = (name) => jardin.getObjectByName(name) ?? plantes.getObjectByName(name)
  const root = new THREE.Group()

  // ——— plateau « Blender » : objets recentrés, grille ———
  const studio = new THREE.Group()
  root.add(studio)
  const grid = makeGrid()
  grid.mesh.position.y = -0.47
  studio.add(grid.mesh)
  S.grid = grid

  const hero = (name, opts) => {
    const a = makeAsset(node(name), { center: true, wire: true, ...opts })
    a.outer.visible = false
    studio.add(a.outer)
    return a
  }
  S.seed = hero('Graine')
  S.pot = hero('Pot', { wireColor: '#ffad4d' })
  S.can = hero('Arrosoir', { wireColor: '#ffad4d' })
  S.fruit = hero('Fruit', { wireColor: '#ffad4d' })

  // carrousel des assets exportés
  const carousel = new THREE.Group()
  carousel.visible = false
  studio.add(carousel)
  S.carousel = carousel
  S.carouselItems = ['Pot', 'Arrosoir', 'Fruit', 'Graine', 'Goute_d_eau', 'Feuille_1'].map((name, i, all) => {
    const a = makeAsset(node(name), { center: true, alphaTest: name.startsWith('Feuille') ? 0.5 : 0 })
    const slot = new THREE.Group()
    const ang = (i / all.length) * Math.PI * 2
    slot.userData.slot = new THREE.Vector3(Math.sin(ang) * 0.72, 0, Math.cos(ang) * 0.72)
    slot.add(a.outer)
    carousel.add(slot)
    return { ...a, slot }
  })

  // ——— jardin du site, à l'échelle réelle ———
  const garden = new THREE.Group()
  garden.visible = false
  root.add(garden)
  S.garden = garden
  S.ground = makeGround(node('Sol'))
  garden.add(S.ground.mesh)

  S.gardenPots = POTS.map((p) => {
    const a = makeAsset(node('Pot'))
    a.u.uShade.value = 0.18
    const g = new THREE.Group()
    g.position.set(...p.position)
    g.rotation.y = p.rotationY
    const body = new THREE.Group()
    body.add(a.outer)
    g.add(blob(0.36, 0.17, 0.32), body)
    garden.add(g)
    return { ...a, group: g, body }
  })

  const seedAsset = makeAsset(node('Graine'))
  seedAsset.u.uShade.value = 0.2
  const seedMeshes = []
  seedAsset.outer.traverse((o) => o.isMesh && seedMeshes.push(o))
  S.piles = SEED_PILES.map((pos, k) => {
    const r = rng(11 + k * 7)
    const pile = new THREE.Group()
    pile.position.set(...pos)
    for (let i = 0; i < 34; i++) {
      const a = r() * Math.PI * 2
      const d = Math.sqrt(r()) * 0.034
      const s = new THREE.Mesh(seedMeshes[0].geometry, seedMeshes[0].material)
      s.scale.setScalar(0.48)
      s.position.set(Math.cos(a) * d, 0.004 + (1 - (d / 0.034) ** 2) * 0.016 + r() * 0.004, Math.sin(a) * d)
      s.rotation.set(r() * 6, r() * 6, r() * 6)
      pile.add(s)
    }
    pile.add(blob(0.1, 0.1, 0.25))
    garden.add(pile)
    return pile
  })

  const can = makeAsset(node('Arrosoir'))
  can.u.uShade.value = 0.2
  S.gardenCan = { ...can, group: new THREE.Group(), body: new THREE.Group() }
  S.gardenCan.group.position.set(...CAN.position)
  S.gardenCan.group.rotation.y = CAN.rotationY
  S.gardenCan.body.add(can.outer)
  S.gardenCan.group.add(blob(0.22, 0.14, 0.3), S.gardenCan.body)
  garden.add(S.gardenCan.group)

  // ——— fin : la récolte ———
  const harvest = new THREE.Group()
  harvest.visible = false
  root.add(harvest)
  S.harvest = harvest
  S.fruits = Array.from({ length: 8 }, (_, i) => {
    const a = makeAsset(node('Fruit'), { center: true })
    a.u.uShade.value = 0.28
    harvest.add(a.outer)
    return a
  })

  return root
}
