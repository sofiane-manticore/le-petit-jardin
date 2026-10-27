# Phase 6 — Acte 3, laisser pousser

Projet « Le petit jardin » (R3F) · 2026-10-25

> **Phase validée par Sofiane le 2026-10-25, avec la révision 1.** Les choix par défaut sont conservés : feuilles agrandies ×1,5, et fruits qui apparaissent à l'aube.

L'acte 3 se joue pour de vrai. Pendant qu'on maintient le bouton du temps, les jours défilent et deux plantes poussent dans chaque jardinière : la tige sort de la terre en pointe fine, monte le long de la courbe de Blender, lance ses rameaux, et les feuilles éclosent une à une le long de la tige puis s'ouvrent. La timeline affiche maintenant « Jour N/15 ». Au lever qui termine le 15ᵉ jour, le texte 4 arrive et un fruit pousse au bout d'un rameau de chaque plante (8 fruits), avec un petit pop et un balancement.

**Le fichier Blender n'a pas été ouvert ni modifié pendant cette phase.** Tout est lu dans `plantes.glb` et `jardin.glb`, tels qu'exportés en phase 0.

À voir sur http://localhost:5173 (serveur de dev toujours lancé). Pour aller vite : le panneau dev sème et arrose les 4 pots, puis « +1 j » fait passer un jour.

## Révision 1 (retours de Sofiane)

| Demande | Ce qui change |
|---|---|
| Tiges un tout petit peu plus épaisses | Rayons ×1,3 : 3,1 mm au pied, 1,2 mm à la pointe, 0,8 mm au bout des rameaux. |
| Les feuilles ne doivent plus être entraînées par la tige | La feuille du bout de chaque chaîne ne suit plus la pointe : elle éclot à l'endroit où la tige s'arrête, quand celle-ci y arrive. Toutes les feuilles restent désormais là où elles sont nées ; seule leur ouverture (de plaquée contre la tige à son angle final) les anime encore. |
| La fin de la pousse doit coïncider avec la fin des 15 jours | Le calendrier de chaque tige est étiré : la dernière chaîne finit de pousser, puis sa feuille du bout finit de s'ouvrir exactement au lever qui termine le 15ᵉ jour, au moment où le texte 4 arrive. Avant, tout était fini vers le jour 13. Le lissage de l'affichage ajoute moins d'une seconde de rattrapage. |
| Départs décalés d'une plante à l'autre | Les 8 plantes germent l'une après l'autre, dans un ordre mêlé, entre le début du 1ᵉʳ jour et le 3ᵉ jour environ (`MAX_DELAY` = 20 % de la pousse). Une plante partie en retard pousse un peu plus vite, donc toutes finissent ensemble au jour 15. |

La forme des plantes que tu as validée est inchangée (même tirage aléatoire). Captures dans `phase6/revision1/` : `01-jour3-departs-decales.png` (au jour 3, seules quelques pousses sont sorties), `02-jour5`, `03-jour9`, `04-jour14` (pas encore tout à fait finies), `05-jour15-fruits`. Maintien réel de bout en bout retesté (15 jours en 15 s environ, 60 fps), build, lint et console propres.

## Ce qu'il te reste à décider

| # | Question | Ce que j'ai mis par défaut |
|---|---|---|
| 1 | **Taille des feuilles.** À l'échelle de Blender (2,5 cm), elles se perdaient à la distance de la caméra, face à des tiges de 20 cm et à un fruit de 4,6 cm. | Feuilles agrandies ×1,5 (`LEAF_SCALE` dans `Plants.tsx`). Comparer avec `01` à `05`. |
| 2 | **Lumière de l'acte 4.** Le jour 15 se termine au lever, donc les fruits apparaissent dans la lumière rosée de l'aube (déjà relevé en phase 3). | Laissé à l'aube. On peut faire glisser l'heure vers la matinée au passage à l'acte 4 si tu préfères une récolte en plein jour. |

## 6.1 Compteur de jours

- La logique existait depuis la phase 3 : `advanceTime()` compte un jour à chaque lever (un cycle 06:00 → 06:00, nuit 3× plus rapide), et l'acte 4 démarre au 15ᵉ lever.
- **Nouveau :** la barre affiche « Jour N/15 » entre la piste et le bouton (Nunito 11 px gras, chiffres tabulaires, « /15 » en beige). N est le jour en cours : « Jour 1 » dès le début de l'acte, « Jour 15 » jusqu'au lever qui le termine. Le panneau dev, lui, affiche les jours écoulés (un de moins).
- À chaque nouveau jour, le chiffre saute un peu (GSAP, `back.out`).
- Le compteur est une région `aria-live` : un lecteur d'écran annonce « Jour 5 sur 15 ».
- Le bouton gonflé pendant le maintien ne recouvre pas le compteur (`08-compteur-maintien.png`).

## 6.2 Croissance procédurale

**Tiges (plan A du plan, sans plan B).** Chaque `LineSegments` de `plantes.glb` est découpé en chaînes à chaque rupture d'index, comme prévu en phase 0 : la chaîne 0 est la tige principale, les suivantes sont les rameaux. Chaque chaîne devient une `CatmullRomCurve3`, puis un tube de 6 côtés échantillonné tous les 4 mm.

- **La pousse se fait dans le vertex shader.** Chaque sommet du tube connaît le moment où la pousse l'atteint. Avant, son rayon est nul, donc il reste invisible sur l'axe de la tige. Juste après, il s'élargit : une pointe effilée monte le long de la courbe, sans recalcul de géométrie.
- **Calendrier, en « temps de plante » u (0 → 1 sur les 15 jours) :** la tige principale pousse en premier ; chaque rameau démarre quand la tige atteint son point d'attache (retrouvé sur la courbe) et pousse à la même vitesse. Le tout est étiré pour que la dernière feuille finisse de s'ouvrir à u = 1 (révision 1).
- **Épaisseur :** 3,1 mm au pied, 1,2 mm à la pointe (révision 1) ; les rameaux partent aux trois quarts du rayon de la tige à leur point d'attache. Les tiges s'épaississent avec l'âge (moitié du rayon au départ).
- **Couleur :** les tiges n'ont pas de matériau dans Blender. J'ai pris deux verts de la texture de la feuille, plus sombre au pied (`#55782a`) et plus tendre vers les pointes (`#8db248`), en dégradé par sommet. Le matériau est le matériau peint commun (quasi unlit, teinte du soleil, ombre légère).
- **Ombres :** les tiges projettent une ombre qui suit la pousse (matériau de profondeur avec le même shader).
- Les 8 plantes et toutes leurs chaînes forment **une seule géométrie** (1 draw call).

**Feuilles.** Les 3 feuilles de Blender sont instanciées (un `InstancedMesh` par modèle, 113 feuilles au total) avec le scale de leur nœud conservé (point P6 de la phase 0).

- **Réparties sur la tige :** 3 à 7 feuilles en spirale de 137,5° sur la tige principale (les plus grandes en bas), 1 à 3 feuilles alternées à gauche et à droite sur chaque rameau, et une petite feuille (`Feuille_3`) au bout de chaque chaîne.
- **Elles éclosent et s'ouvrent :** une feuille naît quand la pointe passe à sa hauteur, grandit avec un léger dépassement (`easeOutBack`), et passe de plaquée contre la tige à son angle final. Le limbe est relevé vers le ciel. La feuille du bout éclot quand la pointe arrive au bout de la chaîne (révision 1 : elle ne suit plus la pointe).
- **Lissage :** l'affichage rattrape la pousse du store en douceur, donc « +1 j » ou un relâché donnent une pousse fluide, sans à-coup.

## 6.3 Variation entre les 8 plantes

- **Tiges :** les 3 tiges de Blender sont réparties pour que deux plantes voisines ne soient jamais identiques (Tige 1 ×3, Tige 2 ×3, Tige 3 ×2).
- **Par plante :** rotation libre autour de la verticale, échelle de 0,82 à 1,10, inclinaison de ±4°, décalage de ±8 mm autour de son emplacement, et germination décalée de 0 à 3 jours environ (révision 1).
- **Par feuille :** modèle, taille (±15 %), azimut, relève et roulis tirés au hasard.
- Les tirages sont déterministes (graine fixe) : le jardin pousse toujours de la même façon.
- Les 2 plantes sont placées sur le grand axe de la jardinière, à ±6,2 cm du centre.

## 6.4 Fruits

- **8 fruits, un par plante**, conformément au plan et au store (`fruitsLeft = 2` par pot à l'acte 4).
- Chacun pend du rameau qui finit le plus haut, juste avant sa pointe, à la verticale quelle que soit l'inclinaison de la plante. L'origine du fruit de Blender est son attache (phase 0), donc il pend naturellement.
- Taille : 72 % du fruit de Blender (4,6 cm), multipliée par l'échelle de la plante.
- **Apparition au jour 15 :** pop élastique (GSAP) depuis l'attache puis balancement, l'un après l'autre (0,11 s d'écart), 0,35 s après le passage à l'acte 4.
- Un fruit récolté depuis le panneau dev disparaît. La vraie récolte au clic arrive en phase 7.

## Panneau dev

Rien de nouveau : « +1 j » fait passer un jour, et `reset` ramène tout au début (les plantes se rétractent sous le rideau de l'intro, les fruits disparaissent).

## Captures

| Fichier | Contenu |
|---|---|
| `01-jour2-pousses.png` | jour 2 (zoom) : les pousses sortent, avec leur feuille de bout |
| `02-jour5.png` | jour 5 (zoom) : tiges qui montent, premières feuilles |
| `03-jour9.png` | jour 9 (zoom) : rameaux lancés, compteur « Jour 9/15 » |
| `04-jour13.png` | jour 13 (zoom) : plantes presque adultes |
| `05-jour15-fruits.png` | acte 4 (zoom) : les 8 fruits, texte 4 |
| `06-vue-normale-jour7.png` | jour 7 au cadrage par défaut |
| `07-vue-normale-acte4.png` | acte 4 au cadrage par défaut |
| `08-compteur-maintien.png` | barre pendant le maintien : le bouton gonflé ne couvre pas le compteur |
| `09-mobile-jour8.png`, `10-mobile-acte4.png` | mobile 390 × 844 |
| `11-recolte-dev.png` | fin (`end`) après récolte au panneau dev : plus aucun fruit |

## Vérifications

| Test | Résultat |
|---|---|
| Maintien réel du bouton (souris), de l'acte 3 à l'acte 4 | ✅ 15 jours en 15 s environ, pousse continue, texte 4 et fruits au 15ᵉ lever |
| Fluidité pendant le maintien à ×40 (Chrome, 1440 × 900) | ✅ 60 fps en moyenne |
| « +1 j » répété, heure forcée à 13:00 | ✅ pousse lissée, pas d'à-coup |
| Mobile 390 × 844 | ✅ plantes, compteur et fruits visibles |
| `reset` après l'acte 4 | ✅ retour à l'intro, plus de plantes ni de fruits |
| `tsc -b`, `oxlint`, `npm run build` | ✅ sans erreur ni warning (hors l'avertissement de taille de bundle déjà connu) |
| Console (dev, desktop et mobile) | ✅ aucune erreur ni warning |
| Serveur de dev localhost:5173 | ✅ toujours lancé |

## Points relevés pour la suite

| # | Constat | Traitement prévu |
|---|---|---|
| 1 | Les plantes débordent un peu des jardinières et se croisent entre pots voisins, surtout la Tige 2 (spirale haute). C'est la forme des courbes de Blender. | À ton avis : on peut resserrer l'emplacement ou réduire l'échelle max. |
| 2 | Quelques fruits sont en partie cachés par les feuilles au cadrage par défaut. | Phase 7 : vérifier qu'ils restent faciles à viser, et agrandir leur zone de clic si besoin. |
| 3 | La pousse ne tient pas compte de `prefers-reduced-motion` (pop et balancement des fruits). | Phase 7.3 (accessibilité). |
| 4 | Bundle JS : 1,40 Mo (397 Ko gzip), stable. | Phase 7.4. |

## Fichiers

```
WEB/src/
  scene/plants.ts                   lecture des tiges, calendrier de pousse, feuilles, placement des 8 plantes (nouveau)
  scene/growth.ts                   pousse lissée partagée hors store (nouveau)
  components/three/Plants.tsx       tubes qui poussent (shader), feuilles instanciées (nouveau)
  components/three/Fruits.tsx       8 fruits, pop au jour 15 (nouveau)
  components/ui/TimeBar.tsx         + compteur « Jour N/15 »
  lib/random.ts                     générateur déterministe, sorti de SeedPiles (nouveau)
  components/three/SeedPiles.tsx    utilise lib/random.ts
  scene/Experience.tsx              branchement des plantes
WEB/docs/phase6-pousse.md           ce compte rendu
WEB/docs/phase6/                    captures
```
