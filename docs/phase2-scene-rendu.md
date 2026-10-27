# Phase 2 — Scène et rendu

Projet « Le petit jardin » (R3F) · 2026-10-25

> **Phase validée par Sofiane le 2026-10-25.** Opacité du sol conservée à 75 % (valeur par défaut, aucune autre demandée).

La scène statique est composée et rendue : sol peint au centre, 4 pots en grille imparfaite, 4 tas de graines à gauche, l'arrosoir à droite. Les matériaux sont quasi unlit, un soleil tourne avec l'heure et pose une ombre très légère, et le post-process ajoute bloom, étalonnage chaud et grain animé. La console est vide en dev comme en prod, desktop et mobile.

**Le fichier Blender n'a pas été modifié.** Je n'ai fait qu'une capture d'écran de la fenêtre Blender (lecture seule) ; aucun export, aucune sauvegarde. La marge des îlots UV (révision 1) est appliquée au GLB, à partir de la source PNG `assets-source/jardin.png.glb`.

À voir sur http://localhost:5173. Dans le panneau dev (en bas à gauche), le curseur **Heure** force l'heure (06:00 → 06:00) à n'importe quelle étape, et le curseur **Sol** règle l'opacité du sol. L'adresse `http://localhost:5173/?nofx` coupe le post-process pour comparer avec les textures brutes (dev uniquement).

## Révision 1 : tes retours

| Retour | Ce que j'ai fait |
|---|---|
| Caméra de biais, penser au mobile | Vue en biais depuis la gauche : azimut −30°, plongée 38°. En portrait, l'azimut passe à −72° (plongée 48°) : la ligne graines → pots → arrosoir part en profondeur et remplit la hauteur de l'écran au lieu d'être écrasée dans la largeur. Le cadrage est maintenant calculé pour que la boîte englobante du jardin tienne dans 90 % de la largeur et 62 % de la hauteur, et l'image est décalée de 6 % vers le bas pour laisser la place au texte. |
| Réduire l'opacité globale du sol | Opacité globale à **75 %** par défaut (uniform `uGroundOpacity`). Le panneau dev a un curseur **Sol** (30 à 100 %) pour essayer en direct ; dis-moi la valeur qui te plaît et je la fixe. |
| Seams visibles (liseré sur l'arrosoir) | **Cause :** les îlots UV de tes textures n'ont presque pas de marge, et l'espace entre eux est noir. Vu de loin, le GPU lit les mipmaps (versions réduites de la texture) : chaque pixel y mélange le bord de l'îlot et le noir voisin, d'où un liseré sombre le long des coutures. Blender filtre ses textures autrement à l'affichage, d'où l'absence du souci chez toi (déduction, pas vérifié dans Blender). **Correction, sans toucher au .blend ni à tes PNG :** un script (`WEB/assets-source/dilate.cjs`) rastérise les UV de chaque mesh, étend la couleur du bord de chaque îlot sur 48 px dans le vide, puis réencode en WebP. Le sol, qui couvre toute sa texture, n'est pas concerné. `jardin.glb` passe de 1,62 à 1,54 Mo. Avant / après : `phase2/seams/avant.png`, `phase2/seams/apres.png`. |
| Le grain va très vite, en biais | **Cause :** la fonction `rand()` de postprocessing, décalée à chaque image, faisait glisser un motif en diagonale. Je l'ai remplacée par un hash sans motif (Hoskins), tiré indépendamment par pixel et par image, et ralenti à **12 images par seconde**. |
| Accentuer le bloom | Intensité 1,1 → **1,6**, rayon 0,55 → 0,72, seuil 0,72 → 0,70. J'ai essayé 1,8 avec un seuil de 0,62 : le fond crème virait au blanc et perdait la couleur du design, j'ai donc gardé un cran en dessous. |
| Une phase de nuit bleutée | Le cycle couvre maintenant **24 h** : lever 06:00 → coucher 20:00 → nuit → lever suivant. La nuit défile **3 fois plus vite** que le jour, pour que l'acte 3 ne s'allonge que d'environ 24 %. Un jour est compté au lever suivant. Teintes : aube rosée, lever doré, midi blanc chaud, heure dorée, coucher, puis nuit bleutée. La nuit, une lune pâle prend le relais du soleil, avec une ombre à 14 %. Captures `h1160` à `h1400`. |
| Le plus sombre de la nuit = l'ambiance de 20:45, pas de flashes en accéléré | La teinte de 20:45 (`#9799c3`) est devenue le palier de toute la nuit, jusqu'à 04:30 : l'écart de luminosité entre midi et la nuit passe d'environ 50 % à 38 % (luminance perçue de la teinte). En plus, la teinte rattrape sa cible avec un amortissement (constante 0,2 s) : à vitesse maximale, quand un cycle complet passe en moins d'une seconde, la lumière se lisse au lieu de clignoter. Au rythme normal, le retard est imperceptible. |

**Conséquence pour la phase 3** : la timeline du design va du lever au coucher. Avec la nuit, je propose qu'elle couvre le cycle complet de 06:00 à 06:00, avec la nuit dessinée sur la barre. À valider en phase 3.

## 2.1 Sol et composition

**Sol (alpha).** Le sol reste au centre, à sa taille d'export (1,75 m). Pour l'alpha, j'ai écarté les deux options prévues au plan :
- `alphaTest` aurait découpé le fondu peint en bord dur ;
- la transparence classique (`alphaMode: BLEND`) donne un sol nettement plus gris et délavé une fois le post-process actif, parce que le mélange se fait alors en espace linéaire au lieu de sRGB (constaté en test). Elle garde aussi les risques de tri avec les gouttes et ripples à venir (P1).

**Solution retenue** : le sol est rendu **opaque**, et son alpha est mélangé au fond **dans le shader**, en espace sRGB, avec la même couleur de fond que le canvas (`blendOverBackground` dans `src/materials/paintedMaterial.ts`). C'est possible parce que le sol n'a rien d'autre que le fond derrière lui. Résultat : le dégradé peint est rendu exactement comme un mélange sRGB classique, quel que soit le post-process, et le sol écrit la profondeur, donc plus aucun problème de tri (P1 résolu). Le fondu des bords de la phase 1 est conservé (14 %).

**Composition** (`src/scene/layout.ts`, en mètres, caméra depuis +Z) :

| Élément | Position | Détail |
|---|---|---|
| Pot 1 (arrière gauche) | −0,162 · −0,102 | rotation 3,4° |
| Pot 2 (arrière droit) | 0,152 · −0,118 | −5,2° |
| Pot 3 (avant gauche) | −0,141 · 0,098 | −2,9° |
| Pot 4 (avant droit) | 0,174 · 0,112 | 4,6° |
| 4 tas de graines | x ≈ −0,47 à −0,50, z de −0,17 à 0,17 | légèrement désalignés |
| Arrosoir | 0,50 · 0,01 | bec tourné vers les pots |

- Les pots sont des clones du groupe `Pot` (PotDeFleur + Terre), nommés `Pot_1` à `Pot_4`, dans l'ordre des pots du store.
- Chaque tas compte 70 graines réduites à 48 % de la taille du mesh Blender (environ 1,4 cm de long), à ta demande (`InstancedMesh`, un draw call par tas). Elles remplissent un dôme compact de 2,3 cm de rayon, avec des inclinaisons et des rotations variées, tirées d'un générateur pseudo-aléatoire fixe : la forme des tas est toujours la même. Les graines restent des instances individuelles, ce qui servira à la petite physique de la phase 4.
- L'arrosoir et les tas sont **posés à leur place de repos**, sans interaction (phases 4 et 5).

**Cadrage** (`src/scene/CameraRig.tsx`) : voir la révision 1 (vue de biais, calcul par boîte englobante). Le haut de l'écran reste libre pour le texte et le bas pour la timeline. Zoom ±20 % inchangé.

## 2.2 Matériau quasi unlit

`createPaintedMaterial()` (`src/materials/paintedMaterial.ts`) remplace tous les matériaux du GLB. Il part d'un `MeshLambertMaterial` pour profiter de la chaîne d'ombres de three, mais ignore son éclairage. La couleur de sortie est :

```
texture peinte × teinte du soleil × modelé léger × ombre portée
```

| Terme | Valeur | Rôle |
|---|---|---|
| Teinte du soleil | 35 % de la couleur du soleil | réchauffe le matin et le soir |
| Modelé | 14 % de N·L adouci | un soupçon de volume, sans écraser la peinture |
| Ombre portée | 26 % (soleil bas) à 32 % (midi) | ombre très légère |

L'ombre n'est appliquée que sur les faces tournées vers le soleil. Sans ce garde-fou, l'avant des pots, à contre-jour, s'assombrissait entièrement (constaté en test avec une ombre forcée à 100 %).

Le plan B (`ShadowMaterial` sur un plan séparé) n'a pas été nécessaire.

## 2.3 Soleil

`src/scene/Sun.tsx` et `src/scene/lighting.ts`. Une directional light suit `minute` du store à chaque image :

- **trajectoire** : lever à gauche, coucher à droite, toujours un peu derrière la scène pour que les ombres tombent vers le spectateur et restent lisibles. Élévation d'environ 18° au lever et au coucher, 63° à midi. La lune suit le même arc la nuit ;
- **teinte globale** (`src/scene/lighting.ts`) : 9 clés sur 24 h, avec un amortissement de la teinte contre les flashes en accéléré, appliquées aux matériaux et au fond, pour que le sol continue de se fondre dans le fond à toute heure. L'ombre s'efface autour du lever et du coucher, ce qui permet de passer du soleil à la lune sans saut ;
- **ombres** : shadow map 2048 px, PCF adouci, cadrée sur le sol. `shadows="percentage"` sur le Canvas, car le mode doux par défaut de R3F est déprécié dans three 0.182 et afficherait un warning.

## 2.4 Post-process

`src/scene/PostFX.tsx`, avec `@react-three/postprocessing` :

| Effet | Réglage |
|---|---|
| Bloom (mipmap) | intensité 1,6, seuil 0,7, lissage 0,3, rayon 0,72 : halo chaud autour du fond clair, des bords de pots et de l'eau de l'arrosoir |
| Étalonnage chaud (effet maison, une passe) | +10 % de saturation pour compenser le voile du bloom, rouges poussés et bleus retirés dans les tons moyens et sombres, courbe en S légère (10 %) |
| Vignette | 20 %, douce |
| Grain | 4,5 %, hash sans motif, renouvelé 12 fois par seconde, plus présent dans les tons moyens |

L'étalonnage travaille en espace perceptuel (≈ sRGB), plus prévisible sur des textures peintes. Le tone mapping est désactivé (`flat`) : les couleurs peintes ne sont pas recompressées.

## Point de contrôle : comparaison avec Blender

Le .blend ne contient **pas de scène composée** : tous les assets sont empilés à l'origine (phase 0, §1.1). Je n'ai donc pas pu produire de rendu Blender comparable plan pour plan, et je n'ai pas voulu modifier la scène pour en fabriquer un. La comparaison porte sur la fidélité des textures :

- `phase2/nofx/h780.png` : la scène sans post-process, c'est-à-dire les textures peintes presque brutes (teinte du soleil et ombre seulement) ;
- `phase2/h780.png` : la même vue avec le post-process.

**À toi de juger** en ouvrant ces deux captures à côté de tes rendus Blender. Si tu en as une de référence, envoie-la et j'ajuste les réglages pour m'en rapprocher.

## Captures

| Fichier | Contenu |
|---|---|
| `docs/phase2/h460.png` | 07:40, heure de départ de l'expérience |
| `docs/phase2/h780.png` | 13:00, midi |
| `docs/phase2/h1160.png` | 19:20, heure dorée |
| `docs/phase2/h1245.png` | 20:45, début de la nuit (palier le plus sombre) |
| `docs/phase2/h1400.png` | 23:20, nuit |
| `docs/phase2/nofx/h780.png` | midi sans post-process |
| `docs/phase2/mobile/h780.png`, `h1400.png` | mobile 390 × 844, midi et nuit |
| `docs/phase2/graines.png` | tas de graines, zoomés |
| `docs/phase2/seams/avant.png`, `apres.png` | arrosoir zoomé, avant et après la marge des îlots UV |

## Vérifications

| Test | Résultat |
|---|---|
| `npm run build` (tsc + vite) | ✅ sans erreur |
| `npm run lint` (oxlint) | ✅ 0 problème |
| Console desktop 1440 × 900, dev, 5 heures de la journée | ✅ aucune erreur ni warning |
| Console desktop, build de prod (`vite preview`) | ✅ aucune erreur ni warning |
| Console mobile 390 × 844, tactile, dev | ✅ aucune erreur ni warning |
| Ombres visibles à toutes les heures, sans acné | ✅ (contrôlé avec une ombre forcée à 100 %, puis remis aux valeurs finales) |
| Serveur de dev localhost:5173 | ✅ toujours lancé |

## Points relevés pour la suite

| # | Constat | Traitement prévu |
|---|---|---|
| 1 | En portrait, la vue de biais occupe mieux l'écran, mais la mise en page reste à affiner avec l'UI réelle. | Phase 7.3. |
| 2 | Les feuilles (`plantes.glb`) auront peut-être le même souci de marge d'îlots UV. | Phase 6 : même script si besoin. |
| 3 | La terre des pots a la même valeur que le sol, ce qui la rend peu lisible de loin. | Phase 5.4 : la terre fonce à l'arrosage ; on pourra aussi l'éclaircir légèrement avant. |
| 4 | Le bundle JS fait 1,27 Mo (353 Ko gzip), +90 Ko avec postprocessing. | Phase 7.4 : découpage du bundle. |
| 5 | Bloom et grain plein écran sur mobile. | Phase 7.4 : `PerformanceMonitor`, comme prévu au plan. |

## Fichiers

```
WEB/src/
  App.tsx                           flat, shadows="percentage", fond partagé
  materials/paintedMaterial.ts      matériau quasi unlit (+ mélange au fond pour le sol)
  scene/layout.ts                   composition : pots, tas, arrosoir
  scene/lighting.ts                 cycle de 24 h : teintes, ombre, soleil et lune
  scene/Sun.tsx                     directional light, ombre, teinte globale
  scene/PostFX.tsx                  bloom + étalonnage, vignette et grain
  scene/Experience.tsx              assemblage, ?nofx en dev
  scene/CameraRig.tsx               nouveau cadrage
  components/three/Ground.tsx       sol opaque mélangé au fond
  components/three/Pots.tsx         4 clones du pot
  components/three/SeedPiles.tsx    4 tas de 70 graines instanciées
  components/three/WateringCan.tsx  arrosoir au repos
  components/ui/DevPanel.tsx        + curseur Heure (dev)
  stores/useGarden.ts               cycle de 24 h, nuit 3× plus rapide
WEB/assets-source/dilate.cjs        marge des îlots UV + WebP (Node, gltf-transform + sharp)
WEB/public/models/jardin.glb        réencodé avec la marge
WEB/docs/phase2-scene-rendu.md      ce compte rendu
WEB/docs/phase2/                    captures
```
