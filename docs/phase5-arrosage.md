# Phase 5 — Acte 2, arroser

Projet « Le petit jardin » (R3F) · 2026-10-25

> **Phase validée par Sofiane le 2026-10-25.** Les choix par défaut sont conservés : Espace verse aussi, le pointeur vise le point de chute de l'eau, et l'eau ne coule que pendant le drag.

L'acte 2 se joue pour de vrai. On saisit l'arrosoir à la souris ou au doigt : il décolle, suit le pointeur et se balance sous la main. Clic droit maintenu (ou Espace) sur desktop, bouton « verser » sur mobile : il s'incline et l'eau sort de la pomme en gouttes, qui font des ronds à l'impact. La terre d'un pot fonce à mesure qu'elle boit. Après 1,2 s d'eau reçue, le pot passe à `watered` et se gonfle un instant. Quand les 4 pots sont arrosés, le texte 3 et la timeline prennent le relais. Au relâché, l'arrosoir rentre se poser à sa place en ease-out.

**Le fichier Blender n'a pas été ouvert ni modifié pendant cette phase.** Toutes les mesures de l'arrosoir ont été lues dans `jardin.glb`.

À voir sur http://localhost:5173 (serveur de dev toujours lancé).

## Ce qu'il te reste à décider

| # | Question | Ce que j'ai mis par défaut |
|---|---|---|
| 1 | **Touche Espace.** Le plan la gardait en plan B si le clic droit posait problème. Or sur un trackpad, tenir l'arrosoir en cliquant tout en faisant un clic droit est presque impossible. | Je l'ai activée dès maintenant, et elle est mentionnée dans le picto. Pour la retirer, il suffit d'enlever deux écouteurs clavier dans `PourButton.tsx`. |
| 2 | **Verser sans tenir l'arrosoir.** | Non, conformément au brief (clic droit « en plus du clic gauche ») : l'eau ne coule que pendant le drag. J'avais d'abord permis de verser au repos ; c'est retiré (`09-espace-repos.png` : Espace au repos, rien ne coule). |
| 3 | **Ce que vise le pointeur.** | C'est le point de chute de l'eau qui suit le pointeur, pas la poignée (voir 5.1). On pointe un pot, l'eau tombe dedans, et l'arrosoir flotte un peu au-dessus, à droite. |

## 5.1 Drag de l'arrosoir

`src/components/three/WateringCan.tsx`, `src/hooks/useDrag.ts`

- **Repères mesurés sur le GLB** (`scene/layout.ts`) : poignée du dessus en (0 ; 0,19 ; −0,01), centre de la pomme en (0 ; 0,13 ; 0,168), sortie de l'eau orientée vers l'avant et un peu vers le haut au repos. L'arrosoir pivote autour de sa poignée, comme dans la main.
- **Saisie** : zone invisible un peu plus large que l'arrosoir (12 × 23 × 30 cm). Le curseur passe en `grab` au survol, puis en `grabbing` pendant le drag. Le drag n'est actif qu'à l'étape `water`, à la souris comme au doigt (même hook `useDrag` qu'en phase 4).
- **Hauteur** : la poignée monte à 27 cm, pour que la pomme reste au-dessus du bord des pots même inclinée.
- **Visée** : l'arrosoir tenu flotte haut, et à l'écran sa position trompe d'environ 15 cm (parallaxe de la caméra plongeante). J'ai d'abord essayé « la poignée suit le pointeur » : on visait un pot et l'eau tombait devant. Maintenant, le pointeur est projeté sur le plan de la terre, et c'est **le point de chute du jet** qui le suit. L'écart entre la poignée et ce point de chute est calculé une fois, par la trajectoire balistique. À la saisie, l'arrosoir ne saute pas : l'écart glisse vers la visée en un tiers de seconde environ.
- **Pot visé** : un pot pas encore arrosé gonfle de 8 % quand le jet va tomber dedans. C'est le même `useHighlight` qu'en phase 4, via `useUi.waterTarget`.
- **Inclinaison** (rotations amorties, sans allocation par image) :

| Réglage | Valeur |
|---|---|
| Suivi du pointeur | `damp` à 14/s, montée à 9/s |
| Balancement | ressort vers 0,55 rad par m/s de vitesse (plafond 0,45 rad), raideur 90/s², amortissement relatif 0,38. Le bas traîne derrière le mouvement, comme un objet suspendu à la main. |
| Tenu sans verser | inclinaison légère de 0,07 rad |
| Versement | 0,78 rad (45°) bec vers le bas, atteint en `damp` à 7/s |

- **Retour au relâché** : GSAP, 0,55 à 1,1 s selon la distance, `power3.out` à plat et `power2.inOut` pour la descente. Il part vite puis se pose en douceur exactement à sa place d'origine.
- **`useDrag`, petite correction** : avec un clic droit maintenu, le navigateur n'envoie `pointerup` qu'au relâché du dernier bouton. Si on lâchait le bouton gauche en premier, l'arrosoir restait collé au pointeur. Le hook détecte désormais le relâché du gauche dans `pointermove` (`10-gauche-relache.png`). L'acte 1 a été retesté avec le script de la phase 4 et fonctionne à l'identique.

## 5.2 Verser

`src/components/ui/PourButton.tsx`, `src/components/ui/RightClickHint.tsx`, `src/stores/useUi.ts`

- **Desktop, clic droit maintenu** : le menu contextuel est coupé sur la scène. Pendant le drag, l'appui du bouton droit n'émet pas de `pointerdown` mais un `pointermove` : il est donc lu dans `buttons` des Pointer Events, qui marche que l'arrosoir soit tenu ou non.
- **Desktop, Espace maintenu** : alternative pour les trackpads (voir décision 1). Elle est sans effet quand le focus est sur un bouton ou un champ.
- **Picto Lucide au-dessus de l'arrosoir tenu** (`<Html>` de drei, qui suit l'arrosoir) : pastille crème avec `MouseRight`, « Clic droit maintenu pour verser », « ou », `Space` puis « Espace ». Elle entre en fondu et montée, et s'efface pendant que l'eau coule. Elle n'est pas affichée sur écran tactile.
- **Mobile, bouton « verser »** : pastille crème au contour terre cuite, avec `Droplets`, en bas au centre. Il apparaît après le texte 2, comme la timeline à l'acte 3. Au maintien, il se remplit de terre cuite et gonfle. Il se tient d'une main pendant que l'autre doigt tient l'arrosoir. La capture du pointeur garantit le relâché même si le doigt glisse hors du bouton.
- Les trois commandes alimentent `useUi.pourSources`, et l'arrosoir tenu verse tant que l'une d'elles est enfoncée. Au repos, elles sont sans effet. Toutes sont relâchées à la fin de l'acte et quand la fenêtre perd le focus.
- **Débit** : l'eau commence à couler à 45 % de l'inclinaison et le jet est complet à 85 %. Le jet démarre et s'arrête donc avec le mouvement.

## 5.3 Gouttes et ripples

`src/components/three/Water.tsx`, `src/scene/watering.ts`

| Réglage | Valeur |
|---|---|
| Gouttes | mesh `Goute_d_eau` de Blender, matériau peint `Goutte`, un `InstancedMesh` (360 au plus, 1 appel de dessin) |
| Débit | 110 gouttes/s, sorties au hasard sur le disque de la pomme (1,3 cm de rayon) |
| Vitesse de sortie | 0,38 m/s ± 15 %, dispersion de ±0,06 m/s par axe |
| Gravité | 6,5 m/s², adoucie : avec 9,8 m/s², les 20 cm de chute durent moins de 0,2 s et le jet ne se lit pas |
| Forme | goutte ramenée à 1,5 cm, pointe tournée à l'opposé de la vitesse, étirée selon la vitesse (+40 % par m/s) |
| Ripples | un `InstancedMesh` (120 au plus), shader maison : deux anneaux qui s'ouvrent (le second en retard) et s'effacent en 0,65 s. Diamètre 5 cm sur le sol, 3,4 cm sur la terre |

- **Trajectoire** : chaque goutte a sa position et sa vitesse, intégrées dans `useFrame` (Euler semi-implicite). Une goutte qui atterrit est remplacée par la dernière vivante. La liste reste ainsi compacte et sert telle quelle d'instances, sans allocation.
- **Impact** : quand une goutte passe sous le bord des pots (6,5 cm), on regarde au-dessus de quoi elle est. Sur la terre d'un pot, elle tombe jusqu'à la terre. Sur le bord du pot, elle disparaît sans ripple. Ailleurs, elle tombe jusqu'au sol. Les ripples sont posés juste au-dessus des bosses de la terre pour ne pas y être masqués.
- Couleur des ripples : crème grisée à 42 % d'opacité. Plus clairs, ils déclenchaient le bloom et faisaient une tache blanche.

## 5.4 Détection et terre qui fonce

`src/components/three/Pots.tsx`, `src/scene/watering.ts`

- **Seuil** : chaque goutte tombée sur la terre d'un pot compte pour 1/110 s d'eau. À **1,2 s d'eau reçue**, `waterPot` passe le pot à `watered`. Un jet complet bien visé arrose donc un pot en un peu plus d'une seconde, et un jet à moitié dans le pot met plus longtemps. Les gouttes qui tombent à côté ou sur le bord ne comptent pas.
- Ces compteurs changent des dizaines de fois par seconde. Ils vivent dans `scene/watering.ts` et non dans le store, pour éviter un re-rendu React à chaque goutte. Le store ne reçoit que le résultat (`waterPot`), et c'est `checkStep()` qui passe à `wait` au 4ᵉ pot.
- **Terre qui fonce** : chaque pot a désormais son propre matériau de terre (peint, comme avant), dont la teinte va du blanc (texture telle quelle) à (0,30 ; 0,24 ; 0,23) en linéaire, au prorata de l'eau reçue et amortie à 3/s. Un pot arrosé depuis le panneau dev fonce aussi (`11-panneau-dev.png`), et un reset le sèche.
- **Retour au passage du seuil** : le pot s'étire un instant vers le haut puis revient avec un rebond élastique, comme s'il buvait.

## Panneau dev

- Les boutons **Arroser** restent utilisables : le pot fonce et se gonfle comme s'il avait reçu l'eau.
- **Reset** vide l'eau en vol, remet les compteurs à zéro, sèche la terre et repose l'arrosoir (`12-apres-reset.png`).

## Captures

Dans `docs/phase5/` (desktop 1440 × 900), `docs/phase5/mobile/` (390 × 844, tactile), panneau dev masqué :

| Fichier | Moment |
|---|---|
| `01-acte2.png` | acte 2, arrosoir au repos |
| `02-drag-balance.png` | arrosoir saisi, en vol, avec le picto |
| `03-pot-vise.png` | jet visé sur le pot 1, pot mis en valeur |
| `04-verse.png` | clic droit : l'arrosoir verse dans le pot 1 |
| `05-arrose.png` | pot 1 arrosé |
| `06-trois.png` | 3 pots arrosés, le 4ᵉ encore clair |
| `07-retour.png` | relâché : l'arrosoir rentre |
| `08-acte3.png` | 4 pots arrosés, texte 3 et timeline |
| `09-espace-repos.png` | Espace sans tenir l'arrosoir : rien ne coule |
| `10-gauche-relache.png` | bouton gauche relâché avant le droit : l'arrosoir est bien lâché |
| `11-panneau-dev.png` | 2 pots arrosés depuis le panneau dev |
| `12-apres-reset.png` | après reset puis semis dev, acte 2 à neuf |
| `z1` à `z3` | gros plans : visée, versement, terre mouillée |
| `mobile/01` à `04` | acte 2 et bouton « verser », arrosoir tenu au doigt, versement à deux doigts, texte 3 |

## Vérifications

| Test | Résultat |
|---|---|
| `npm run build` (tsc + vite) | ✅ sans erreur |
| `npm run lint` (oxlint) | ✅ 0 problème |
| Drag souris de l'arrosoir, curseur `grab` puis `grabbing` | ✅ |
| Clic droit maintenu pendant le drag : versement, pot arrosé | ✅ |
| Espace maintenu pendant le drag : versement, pot arrosé | ✅ |
| 4 pots arrosés : passage à `wait`, texte 3 et timeline | ✅ desktop et mobile |
| Bouton gauche relâché avant le droit : l'arrosoir rentre et l'eau s'arrête | ✅ |
| Espace ou clic droit sans tenir l'arrosoir : pas d'eau | ✅ |
| Drag au doigt et bouton « verser » tenu d'un second doigt (événements tactiles réels via Chrome DevTools) | ✅ 4 pots |
| Arrosage et reset depuis le panneau dev | ✅ |
| Acte 1 rejoué avec le script de la phase 4 (après la correction de `useDrag`) | ✅ identique |
| Console desktop et mobile (dev) | ✅ aucune erreur ni warning |
| Build de prod (`vite preview`) : actes 1 et 2 joués à la souris jusqu'au texte 3 | ✅ aucune erreur ni warning |
| Serveur de dev localhost:5173 | ✅ toujours lancé |

## Points relevés pour la suite

| # | Constat | Traitement prévu |
|---|---|---|
| 1 | Sur mobile, le doigt cache le point de chute (c'est lui qui vise). L'arrosoir et le jet restent visibles au-dessus, et le pot visé gonfle. | Phase 7.3 : décaler la visée un peu au-dessus du doigt si besoin, comme pour les tas. |
| 2 | En dev sur mobile, le panneau dev recouvre encore une partie de l'écran (bas gauche). Le bouton « verser » est au centre, mais le panneau peut gêner les pots du bas. Le build de prod n'est pas concerné. | Panneau repliable si tu testes sur téléphone. |
| 3 | Le versement ne tient pas encore compte de `prefers-reduced-motion` (le balancement surtout). | Phase 7.3 (accessibilité). |
| 4 | L'arrosoir tenu passe parfois devant un pot à l'écran. C'est cohérent avec la perspective, mais ça cache un peu le pot du fond. | À ton avis, après essai à la main. On peut baisser la hauteur de vol, au prix d'un arrosoir qui frôle les bords. |
| 5 | Le seuil de 1,2 s et le débit sont des valeurs de départ. | À régler à la main : `WATER_NEEDED` et `DROP_RATE` dans `scene/watering.ts`. |
| 6 | Bundle JS : 1,39 Mo (399 Ko gzip), soit +7 Ko gzip. | Phase 7.4. |

## Fichiers

```
WEB/src/
  scene/watering.ts                 canal temps réel arrosoir → gouttes → pots, seuil, trajectoire (nouveau)
  components/three/WateringCan.tsx  drag, visée, balancement, inclinaison, retour
  components/three/Water.tsx        gouttes balistiques instanciées, ripples, détection (nouveau)
  components/three/Pots.tsx         terre propre à chaque pot, qui fonce ; gorgée à l'arrosage
  components/ui/PourButton.tsx      bouton « verser » mobile, clic droit et Espace (nouveau)
  components/ui/RightClickHint.tsx  picto au-dessus de l'arrosoir tenu (nouveau)
  lib/device.ts                     détection écran tactile (nouveau)
  hooks/useDrag.ts                  fin du drag si le gauche est relâché avant le droit
  scene/potHit.ts                   + marge réglable, test terre / bord
  scene/layout.ts                   + repères de l'arrosoir, hauteur de vol, bord des pots
  stores/useUi.ts                   + waterTarget, canHeld, pourSources / pouring
  scene/Experience.tsx, App.tsx     branchements, menu contextuel coupé sur la scène
WEB/docs/phase5-arrosage.md         ce compte rendu
WEB/docs/phase5/                    captures
```
