# Phase 7 — Acte 4, récolte et finitions

Projet « Le petit jardin » (R3F) · 2026-10-25

> **Phase validée par Sofiane le 2026-10-25.** Les choix par défaut sont conservés : le soleil monte de l'aube à 09:30 au début de l'acte 4, virgule et « magnifiques » surligné dans le popup, bouton « Me retrouver sur LinkedIn » sans logo, pas de bouton recommencer.

L'expérience est complète de bout en bout. À l'aube du 15ᵉ jour, le soleil monte doucement jusqu'à la matinée. On cueille chaque fruit d'un clic ou d'un tap : il tire sur son rameau, se détache et vole en cloche jusqu'au compteur de récolte en bas de l'écran. Au 8ᵉ fruit, un popup s'ouvre avec les fruits récoltés qui tournent en 3D, le message « Bravo, ils sont magnifiques ! » et un bouton vers ton LinkedIn.

**Le fichier Blender n'a pas été ouvert ni modifié pendant cette phase.** Le fruit vient de `jardin.glb`, tel qu'exporté en phase 0.

À voir sur http://localhost:5173 (serveur de dev toujours lancé). Pour aller vite : le panneau dev sème, arrose et fait passer les jours (« +1 j »). Ses boutons « récolter » cueillent sans l'animation de vol. Pour voir le vol, clique sur les fruits.

## Ce qu'il te reste à décider

| # | Question | Ce que j'ai mis par défaut |
|---|---|---|
| 1 | **Lumière de l'acte 4.** Le 15ᵉ jour se termine dans la lumière rosée de l'aube (`01`). | Le soleil monte de 06:00 à 09:30 en 5 s au début de l'acte 4 (`02`). L'ombre du soleil revient et les couleurs sont plus justes pour la récolte. Pour garder l'aube, il suffit de mettre `HARVEST_MINUTE` à 360 dans `Sun.tsx`. |
| 2 | **Texte du popup.** Le brief dit « Bravo ils sont magnifiques ! ». | J'ai ajouté la virgule (« Bravo, ils sont magnifiques ! »), avec le mot « magnifiques » surligné comme les mots clés des textes 1 à 4. |
| 3 | **Bouton LinkedIn.** | Libellé « Me retrouver sur LinkedIn » avec la flèche Lucide `ArrowUpRight`. Lucide 1.x n'a plus d'icônes de marques, donc il n'y a pas de logo LinkedIn. Le lien `linkedin.com/in/sofiane-saez` s'ouvre dans un nouvel onglet. |
| 4 | **Recommencer.** | Comme décidé dans le plan, le popup ne propose pas de recommencer. Il n'a pas non plus de bouton de fermeture : c'est l'écran final. |

## 7.1 Cueillette des fruits

- **Clic ou tap :** chaque fruit a une zone cliquable invisible plus large que lui, puisqu'il ne fait que 4,6 cm : 1,35 fois sa sphère englobante à la souris, et 2,4 fois au doigt. Au survol, le curseur devient une main (`pointer`).
- **Détachement :** le fruit s'étire vers le bas en résistant (0,16 s), puis lâche d'un coup en s'écrasant légèrement.
- **Vol :** une courbe de Bézier en cloche de 0,75 s le mène jusqu'à la case suivante du compteur. Il rapetisse et tournoie pendant le vol. La cible est recalculée à chaque image, donc le vol reste juste si l'on zoome ou si la fenêtre change de taille. On peut cueillir plusieurs fruits à la suite : chacun vise sa propre case.
- **Compteur :** une pastille en bas de l'écran, à la place de la timeline, affiche « N/8 » et 8 cases. Chaque case se remplit et rebondit quand son fruit arrive. Elle entre après le texte 4, comme la timeline à l'acte 3, puis s'efface avec le dernier fruit. Un lecteur d'écran annonce « 3 fruits récoltés sur 8 ».
- **Fin de l'acte :** le store passe à `end` quand le 8ᵉ fruit arrive au compteur, pas au moment du clic. Le texte 4 sort alors.
- **Lumière (voir la question 1) :** le soleil glisse de l'aube à 09:30 pendant les premières secondes de l'acte. Si la récolte finit avant, la montée continue jusqu'au bout.

## 7.2 Popup de fin

- **Ouverture :** 0,9 s après l'arrivée du dernier fruit. Un voile brun léger avec un flou de 3 px recouvre le jardin, puis la carte monte avec un petit rebond. Le mot « magnifiques » se surligne ensuite.
- **Fruits en 3D :** un second Canvas, petit et monté seulement à la fin, affiche les fruits récoltés (8) en manège. Le manège tourne lentement, et chaque fruit tourne aussi sur lui-même et flotte un peu. Le rendu est unlit, avec la texture peinte du fruit telle quelle, comme dans le jardin. Le fruit est recentré, car son origine dans Blender est à l'attache.
- **Accessibilité :** la carte est un `dialog` modal titré par le message. Le focus va sur le bouton LinkedIn à l'ouverture. Avec `prefers-reduced-motion`, la carte apparaît en fondu et les fruits restent immobiles.
- **Mobile :** la carte prend toute la largeur moins 16 px de chaque côté (`07`).

## 7.3 Mobile, curseurs et clavier

- **Mobile :** j'ai testé l'acte 4 en 390 × 844 avec un vrai tap sur les fruits, qui sont détectés. Le compteur et le popup tiennent dans la largeur (`06`, `07`).
- **Curseurs :** une main ouverte sur les tas de graines et l'arrosoir, une main fermée pendant le drag (phases 4 et 5), et un pointeur sur les fruits.
- **Clavier :** le drag et le clic 3D n'ont pas d'équivalent au clavier. J'ai donc ajouté un bouton invisible tant qu'il n'a pas le focus : c'est le premier arrêt de Tab (`04`). Selon l'acte, il dit « Semer le pot suivant », « Arroser le pot suivant » ou « Cueillir le fruit suivant ». Il déclenche les mêmes animations qu'à la souris : les graines sont aspirées, la terre fonce, le fruit vole. Le focus reste dessus d'un acte à l'autre, donc Entrée suffit pour enchaîner. L'acte 3 utilisait déjà le bouton « maintenir » au clavier (Espace ou Entrée). J'ai testé le parcours complet au clavier, du semis jusqu'au popup.

## 7.4 Performances et build

- **Résolution :** elle est plafonnée à 2 (`dpr`). Un `PerformanceMonitor` de drei la ramène à 1 si l'appareil peine, ce qui était le plan A pour le post-process sur mobile.
- **Draw calls :** ils sont inchangés. Les tiges forment 1 seule géométrie et les feuilles 3 `InstancedMesh`. Les 8 fruits restent des meshes simples, avec leur zone cliquable invisible (`colorWrite` désactivé).
- **Textures :** elles sont déjà en WebP dans `jardin.glb`, qui pèse 1,5 Mo. Le sol et l'arrosoir font 2048 px, les autres 1024 px ou moins. Rien ne dépasse 2048 px, donc je n'ai rien réduit.
- **Mesure :** 60 fps pendant la récolte, en desktop comme en émulation mobile.
- **Build :** `npm run build` compile sans erreur, et le lint est propre. Le JS pèse 1,41 Mo, soit 405 Ko en gzip, dont l'essentiel est three.js. Vite signale qu'un chunk dépasse 500 Ko. C'est attendu pour une page 3D unique, donc je n'ai pas découpé le bundle.
- **Déploiement :** `dist/` utilise des chemins relatifs (`base: './'`). Il se dépose tel quel sur n'importe quel hébergement statique. J'ai aussi ajouté une meta description dans `index.html`.
- **Test final sur le build de production** (`vite preview`) : j'ai tout fait avec de vrais gestes, de bout en bout. Drag des 4 tas, arrosage au clic droit des 4 pots, maintien réel du bouton du temps pendant 15 jours, puis 3 fruits cueillis à la souris et les 5 autres au clavier. Le popup s'ouvre (`08`), le panneau dev est absent et la console reste vide.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/components/three/Fruits.tsx` | Zone cliquable, curseur, détachement et vol de chaque fruit |
| `src/components/ui/HarvestCounter.tsx` | Compteur de récolte (nouveau) |
| `src/components/ui/EndPopup.tsx` | Popup de fin, avec son Canvas de fruits en manège (nouveau) |
| `src/components/ui/KeyboardAssist.tsx` | Bouton d'action au clavier, actes 1, 2 et 4 (nouveau) |
| `src/scene/harvest.ts` | « Cueillir le fruit suivant », partagé entre la scène et le clavier (nouveau) |
| `src/scene/assets.ts` | URLs des GLB, partagées entre la scène et le popup (nouveau) |
| `src/scene/Sun.tsx` | Montée du soleil jusqu'à 09:30 au début de l'acte 4 |
| `src/App.tsx` | Montage des nouveaux éléments d'UI et `PerformanceMonitor` |

Captures dans `docs/phase7/` : `01-aube-fin-jour15`, `02-matin-recolte`, `03-trois-cueillis`, `04-bouton-clavier`, `05-popup-fin`, `06-mobile-recolte`, `07-mobile-popup` et `08-fin-build-prod`.

Il reste la phase 8 (le son), prévue une fois le site finalisé. Je ne l'ai pas commencée.
