// Ajoute une marge (edge padding) autour des îlots UV de chaque texture, puis encode en WebP.
// Usage : node dilate.cjs <glbcheck_dir> in.glb out.glb [padding_px]
const path = require('node:path')
const [dir, inp, out, padArg] = process.argv.slice(2)
const req = require('node:module').createRequire(path.join(dir, 'package.json'))
const { NodeIO } = req('@gltf-transform/core')
const { ALL_EXTENSIONS, EXTTextureWebP } = req('@gltf-transform/extensions')
const sharp = req('sharp')
const PAD = Number(padArg ?? 48)

// rasterise un triangle UV dans le masque (test barycentrique, élargi d'un demi-pixel)
function rasterTri(mask, w, h, a, b, c) {
  const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]) - 1)), maxX = Math.min(w - 1, Math.ceil(Math.max(a[0], b[0], c[0]) + 1))
  const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]) - 1)), maxY = Math.min(h - 1, Math.ceil(Math.max(a[1], b[1], c[1]) + 1))
  const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  if (Math.abs(area) < 1e-12) return
  const edge = (p, q, x, y) => ((q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0])) / Math.hypot(q[0] - p[0], q[1] - p[1])
  const s = Math.sign(area)
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const px = x + 0.5, py = y + 0.5
    if (s * edge(a, b, px, py) >= -0.71 && s * edge(b, c, px, py) >= -0.71 && s * edge(c, a, px, py) >= -0.71) mask[y * w + x] = 1
  }
}

;(async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  const doc = await io.read(inp)
  doc.createExtension(EXTTextureWebP).setRequired(true)
  const report = []
  for (const tex of doc.getRoot().listTextures()) {
    const src = Buffer.from(tex.getImage())
    const meta = await sharp(src).metadata()
    const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const w = info.width, h = info.height
    // primitives qui utilisent cette texture
    const prims = []
    for (const mat of doc.getRoot().listMaterials()) if (mat.getBaseColorTexture() === tex)
      for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) if (p.getMaterial() === mat) prims.push(p)
    const mask = new Uint8Array(w * h)
    let tris = 0
    for (const p of prims) {
      const uv = p.getAttribute('TEXCOORD_0'), idx = p.getIndices()
      const n = idx ? idx.getCount() : uv.getCount()
      const t = [], get = (i) => { uv.getElement(i, t); return [t[0] * w, t[1] * h] }
      for (let i = 0; i < n; i += 3) {
        const i0 = idx ? idx.getScalar(i) : i, i1 = idx ? idx.getScalar(i + 1) : i + 1, i2 = idx ? idx.getScalar(i + 2) : i + 2
        rasterTri(mask, w, h, get(i0), get(i1), get(i2)); tris++
      }
    }
    const covered = mask.reduce((s, v) => s + v, 0) / (w * h)
    // le sol couvre tout son UV : rien à faire
    if (covered > 0.98) { report.push({ name: tex.getName(), w, covered: +covered.toFixed(3), skipped: true }); }
    else {
      // dilatation par anneaux : chaque pixel vide prend la moyenne de ses voisins déjà remplis
      const filled = mask.slice()
      for (let r = 0; r < PAD; r++) {
        const next = []
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = y * w + x
          if (filled[i]) continue
          let n = 0, R = 0, G = 0, B = 0
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy
            if (xx < 0 || yy < 0 || xx >= w || yy >= h || !filled[yy * w + xx]) continue
            const j = (yy * w + xx) * 4; R += data[j]; G += data[j + 1]; B += data[j + 2]; n++
          }
          if (n) next.push(i, R / n, G / n, B / n)
        }
        if (!next.length) break
        for (let k = 0; k < next.length; k += 4) { const i = next[k], j = i * 4; data[j] = next[k + 1]; data[j + 1] = next[k + 2]; data[j + 2] = next[k + 3]; filled[i] = 1 }
      }
      const img = sharp(data, { raw: { width: w, height: h, channels: 4 } })
      const webp = await (meta.hasAlpha ? img : img.removeAlpha()).webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer()
      tex.setImage(new Uint8Array(webp)).setMimeType('image/webp')
      report.push({ name: tex.getName(), w, tris, covered: +covered.toFixed(3), webpBytes: webp.length })
      if (process.env.DUMP) await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(process.env.DUMP, tex.getName() + '.png'))
      continue
    }
    // texture non traitée : encodage WebP identique à la phase 0
    const webp = await sharp(src).webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer()
    tex.setImage(new Uint8Array(webp)).setMimeType('image/webp')
    report[report.length - 1].webpBytes = webp.length
  }
  await io.write(out, doc)
  console.log(JSON.stringify(report, null, 1))
})()
