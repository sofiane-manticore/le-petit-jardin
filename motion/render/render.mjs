// Rendu image par image du film : node render/render.mjs [--fps 60] [--out frames] [--times 0.5,2,4] [--from 0 --to 15]
// Lance d'abord `npm run build && npm run preview` ; l'URL se change avec --url.
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

// playwright : dépendance de dev (npm i -D playwright), résolue aussi en global
const { chromium } = createRequire(import.meta.url)('playwright')

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
)
const url = args.url ?? 'http://localhost:4317/?render'
const fps = Number(args.fps ?? 60)
const out = args.out ?? 'render/frames'
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 })
page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()))
page.on('pageerror', (e) => console.error('[pageerror]', e.message))
await page.goto(url)
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 })

const times = args.times
  ? args.times.split(',').map(Number)
  : Array.from({ length: Math.round((Number(args.to ?? 30) - Number(args.from ?? 0)) * fps) }, (_, i) => Number(args.from ?? 0) + i / fps)

const t0 = Date.now()
for (let i = 0; i < times.length; i++) {
  const t = times[i]
  await page.evaluate((t) => window.__renderAt(t), t)
  // deux images d'affichage : toutes les tuiles sont recomposées avant la capture (sinon déchirures)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  const name = args.times ? `t${t.toFixed(2)}.png` : `${String(Math.round(t * fps)).padStart(5, '0')}.png`
  await page.screenshot({ path: join(out, name), type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1350 } })
  if (i % 60 === 0) console.log(`${i}/${times.length} t=${t.toFixed(2)} ${((Date.now() - t0) / 1000).toFixed(0)}s`)
}
await browser.close()
