// Extrait les plans du site depuis Linkedin/Jardin.mp4 vers public/footage (ffmpeg requis dans le PATH).
// node render/extract-footage.mjs [chemin/vers/Jardin.mp4]
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const video = process.argv[2] ?? '../../Linkedin/Jardin.mp4'
// nom, début (s), durée (s) : voir CLIPS dans src/data.js
const CLIPS = [
  ['sow', 3.5, 3.0],
  ['water', 18.6, 3.4],
  ['grow', 29.5, 15],
  ['harvest', 47.0, 4.5],
]
for (const [name, ss, t] of CLIPS) {
  mkdirSync(`public/footage/${name}`, { recursive: true })
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(ss), '-t', String(t), '-i', video, '-vf', 'crop=1200:1080:360:0', '-q:v', '3', `public/footage/${name}/%04d.jpg`], { stdio: 'inherit' })
  console.log('ok', name)
}
