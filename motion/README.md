# Le petit jardin — motion design (30 s)

Making-of du site en 30 secondes, au format 4:5 (1080×1350, 60 i/s) pour LinkedIn et X.
Tout est codé avec la stack du projet : React Three Fiber pour la 3D (les vrais GLB exportés de Blender),
GSAP pour la timeline, Tailwind pour la mise en page et Lucide pour les pictogrammes.

## Découpage

La timeline est écrite sur 15 s de « temps du récit » puis jouée deux fois plus lentement (`STRETCH` dans `src/data.js`). Les temps ci-dessous sont ceux du récit ; en vidéo, ils sont doublés.

| Temps (récit) | Plan |
|---|---|
| 0 → 1,5 s | « D'une graine… » : la graine tombe, puis se « dé-peint » jusqu'au filaire |
| 1,5 → 4,2 s | 01 Modéliser : pot, arrosoir, fruit passent de filaire à argile puis à la texture peinte, carte de texture à côté |
| 4,2 → 6,4 s | 02 Exporter : Claude × Blender via MCP, les assets plongent dans `jardin.glb` |
| 6,4 → 8,4 s | 03 Planifier : les 8 phases se cochent |
| 8,4 → 10 s | 04 Construire : chaque ligne de JSX tapée fait apparaître sa partie du jardin, puis le post-process |
| 10 → 13,4 s | 05 Jouer : semer, arroser, patienter, récolter (plans de `Linkedin/Jardin.mp4`) |
| 13,4 → 15 s | « …jusqu'au fruit. » et le générique |

## Lancer

```bash
npm install
node render/extract-footage.mjs   # une fois : extrait les plans de Linkedin/Jardin.mp4 (ffmpeg requis)
npm run dev          # aperçu en boucle dans le navigateur
```

## Rendre la vidéo

```bash
npm i -D playwright && npx playwright install chromium
npm run build && npm run preview                       # http://localhost:4317
node render/render.mjs --fps 60 --out render/frames    # images PNG, rendu déterministe image par image
python audio/make_audio.py audio/jardin-motion.wav     # habillage sonore synthétisé (numpy)
ffmpeg -framerate 60 -i render/frames/%05d.png -i audio/jardin-motion.wav \
  -af loudnorm=I=-14:TP=-1.5 -c:v libx264 -pix_fmt yuv420p -crf 16 -preset slow -c:a aac -b:a 192k -shortest jardin-motion.mp4
```

`render.mjs` accepte `--from`/`--to` pour découper le rendu en plusieurs processus, et `--times 1.2,4.5` pour sortir des images fixes.

## Fichiers

- `src/timeline.js` : toute l'animation, une seule timeline GSAP en pause ; `renderAt(t)` rend n'importe quel instant
- `src/world.js` : la scène 3D construite à partir de `public/models/*.glb` (copies de `WEB/public/models`), matériau filaire → argile → peint
- `src/App.jsx` : calques HTML (titres, terminal, plan, code, HUD, grain)
- `src/data.js` : textes, phases, code affiché, plans du site
- `public/footage/` : images extraites de `Linkedin/Jardin.mp4` par `render/extract-footage.mjs` (non versionnées)
- `audio/make_audio.py` : la bande son, synthétisée et calée sur les temps de la timeline
