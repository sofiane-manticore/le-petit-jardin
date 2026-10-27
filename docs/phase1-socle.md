# Phase 1 — Socle du site

Projet « Le petit jardin » (R3F) · 2026-10-25

Le socle tourne : le projet compile, la scène charge `jardin.glb` (WebP), la caméra est fixe avec un zoom limité à la molette et au pinch, et la machine d'étapes parcourt intro → sow → water → wait → harvest → end sans accroc. La console est vide en dev comme en prod, sur desktop et sur mobile.

## Lancer le projet

```bash
cd WEB
npm install        # une seule fois
npm run dev        # http://localhost:5173
npm run build      # build statique dans WEB/dist (chemins relatifs)
npm run preview    # sert le build pour le vérifier
```

## 1.1 Projet et versions

Projet Vite `react-ts` créé dans `WEB/` (config reprise du template officiel `create-vite`, sans son contenu de démo). Versions vérifiées avec `npm view` le 2026-10-25 :

| Paquet | Version | Rôle |
|---|---|---|
| vite | 8.3.5 | bundler |
| react / react-dom | 19.3.1 | UI |
| typescript | 6.0.3 | version du template Vite (TS 7 existe mais le template reste en 6) |
| three | **0.182.0** | 3D (voir note) |
| @react-three/fiber | 9.8.2 | React ↔ three |
| @react-three/drei | 10.7.9 | helpers (`useGLTF`…) |
| @react-three/postprocessing / postprocessing | 3.2.2 / 6.39.5 | bloom, grain (phase 2) |
| gsap / @gsap/react | 3.15.0 / 2.1.2 | animations (phases 3+) |
| tailwindcss / @tailwindcss/vite | 4.3.3 | styles |
| lucide-react | 1.61.0 | pictogrammes |
| zustand | 5.0.16 | état partagé |
| oxlint | 1.89 | lint (template Vite) |

**Note sur three.** J'ai d'abord installé la dernière (0.186). R3F 9.8.2 utilise encore `THREE.Clock`, dépréciée depuis r183, ce qui affichait un warning dans la console à chaque chargement. J'ai fixé three à `~0.182.0`, la dernière version sans ce warning. Compatible avec R3F, drei et postprocessing (peer deps vérifiées). On pourra remonter quand R3F passera à `THREE.Timer`.

## 1.2 Tailwind et tokens du design

Tailwind v4 via son plugin Vite. Les tokens de `design/README.md` sont déclarés dans `src/index.css` (`@theme`) :

| Token Tailwind | Valeur | Usage maquette |
|---|---|---|
| `cream` / `cream-light` | `#EFE6D6` / `#FBF4E6` | fond, texte sur accent |
| `ink` | `#3B2A1E` | texte |
| `label` | `#A8957B` | labels |
| `accent` (+ `-dark`, `-warm`, `-olive`) | `#9C5B20` (`#8A4F1C`, `#A0612B`, `#7E5A2E`) | terre cuite |
| `progress` / `track` | `#B5702A` / `#DDCDB2` | timeline |
| `mark` / `mark-text` | `#E8C690` / `#7A4A1A` | mot surligné |
| `font-story`, utilitaire `font-story-soft` | Fraunces, SOFT 100, poids 350 | récit |
| `font-ui` | Nunito 600/700 | UI |
| `ease-rise` / `ease-mark` | courbes de la maquette | apparitions du texte |

Polices chargées depuis Google Fonts dans `index.html` (Caveat retirée, elle n'est plus utilisée par la maquette).

## 1.3 Canvas, caméra et zoom

- Canvas plein écran, `dpr={[1, 2]}`, fond crème, ombres activées pour la phase 2. L'overlay UI est en `pointer-events: none`, seuls les contrôles captent les clics.
- **Caméra fixe** (`src/scene/CameraRig.tsx`) : plongée d'environ 40°, de face, centrée sur le sol. Pas de rotation ni de déplacement possibles. La distance est recalculée à chaque redimensionnement pour cadrer 1,6 × 0,9 m quel que soit le ratio d'écran : en portrait, la caméra recule pour garder la largeur.
- **Zoom limité à ±20 %**, lissé (amortissement exponentiel) :
  - desktop : molette ;
  - mobile : pinch à deux doigts, avec `touch-action: none` pour que le navigateur ne zoome pas la page.
- Je n'ai pas utilisé `OrbitControls` : même bridé, il capte le pointeur à un doigt, ce qui gênerait le drag des graines et de l'arrosoir en phases 4 et 5.

Le cadrage et l'angle sont provisoires : ils seront ajustés en phase 2 avec la composition réelle (4 pots, tas de graines à gauche, arrosoir).

La scène affiche pour l'instant le sol et le pot **tels qu'exportés**, avec deux lumières basiques, pour valider le chargement du GLB WebP. Les matériaux quasi unlit, le soleil, l'ombre et le post-process sont en phase 2.

## 1.4 Store `useGarden` et machine d'étapes

`src/stores/useGarden.ts` (zustand), conforme au plan :

| Clé | Contenu |
|---|---|
| `step` | `intro` → `sow` → `water` → `wait` → `harvest` → `end` |
| `pots[4]` | `seeded`, `watered`, `fruitsLeft` |
| `minute`, `day` | 360–1200 (départ 07:40), 0–15 |
| `growth` | 0 → 1 sur 15 jours, fraction de journée comprise (le lissage visuel se fera côté plantes) |
| `harvested[]` | `{ pot, plant }` récoltés, pour le popup de fin |

Actions : `start()` (fin de l'intro), `seedPot(i)`, `waterPot(i)`, `advanceTime(minutes)`, `harvestFruit(pot, plant)`, `reset()`. Une fonction interne `checkStep()` passe à l'étape suivante dès que la condition est remplie :

| Étape | Condition de sortie |
|---|---|
| intro | appel de `start()` (la phase 3 l'appellera à la fin du texte 1) |
| sow | 4 pots semés |
| water | 4 pots arrosés |
| wait | `day >= 15` ; à ce moment, chaque pot reçoit 2 fruits (un par plante) |
| harvest | `fruitsLeft == 0` partout |

Garde-fous du brief déjà en place :
- un pot déjà semé refuse les graines (`seedPot` renvoie `false`, le tas pourra retourner à sa place) ;
- chaque action est ignorée hors de son étape (pas d'arrosage pendant les semis, pas de temps qui passe hors de l'acte 3) ;
- au coucher, la journée reboucle au lever et compte un jour ; au jour 15, l'horloge s'arrête.

**Panneau de test (dev uniquement)** en bas à gauche : il affiche l'étape, les pots, le jour et l'heure, et permet de déclencher chaque action à la main. Il n'existe qu'avec `npm run dev` ; j'ai vérifié qu'il est absent du build de prod.

## Vérifications

Tests automatisés dans Chrome (Playwright), sur le serveur de dev et sur le build de prod :

| Test | Résultat |
|---|---|
| `npm run build` (tsc + vite) | ✅ sans erreur |
| `npm run lint` (oxlint) | ✅ 0 problème |
| Console desktop 1440×900 (dev et prod) | ✅ aucune erreur ni warning |
| Console mobile 390×844, tactile (dev) | ✅ aucune erreur ni warning |
| Chargement de `jardin.glb` WebP | ✅ sol et pot affichés avec leurs textures |
| Zoom molette, au-delà des bornes | ✅ zoom avant et arrière, bloqué à ±20 % |
| Pinch à deux doigts (événements tactiles simulés) | ✅ la scène zoome |
| Machine d'étapes, parcours complet via le panneau | ✅ intro → sow → water → wait → harvest → end |
| Panneau dev absent du build de prod | ✅ |
| Build avec chemins relatifs (`./assets/…`) | ✅ déposable sur un hébergement statique |

Captures : `docs/phase1/desktop.png`, `desktop-zoom-in.png`, `desktop-zoom-out.png`, `mobile.png`, `mobile-pinch.png`.

## Points relevés pour la suite

| # | Constat | Traitement prévu |
|---|---|---|
| 1 | Le bord du plan du sol se devinait (léger rectangle) : le masque alpha n'atteint pas tout à fait 0 sur les bords. | **Corrigé** à la demande de Sofiane : `src/components/three/Ground.tsx` multiplie l'alpha par un fondu doux sur 14 % de chaque bord (shader patché, .blend non touché). Capture : `docs/phase1/sol-fondu-bords.png`. Le tri de transparence (`alphaMode: BLEND`, P1) reste pour la phase 2. |
| 2 | Le bundle JS fait 1,18 Mo (≈ 330 Ko gzip), principalement three et drei. Vite affiche un avertissement de taille. | Phase 7 (7.4, performances) : découpage du bundle. |
| 3 | En portrait, la scène est petite car le cadrage garde toute la largeur. | Phase 2 pour le cadrage, phase 7 (7.3) pour le responsive. |

## Fichiers

```
WEB/
  index.html                  polices, favicon, viewport mobile
  vite.config.ts              base './', React, Tailwind
  package.json                scripts dev / build / lint / preview
  public/favicon.svg          pousse Lucide (Sprout) en terre cuite
  src/
    main.tsx
    App.tsx                   Canvas plein écran + overlay UI
    index.css                 Tailwind + tokens du design
    scene/Experience.tsx      racine de la scène, chargement des GLB
    scene/CameraRig.tsx       caméra fixe, zoom molette et pinch
    stores/useGarden.ts       store et machine d'étapes
    components/ui/DevPanel.tsx  panneau de test (dev uniquement)
  docs/phase1-socle.md        ce compte rendu
  docs/phase1/*.png           captures
```

Aucun fichier Blender n'a été ouvert ni modifié pendant cette phase.
