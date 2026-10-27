# Phase 4 — Acte 1, semer

Projet « Le petit jardin » (R3F) · 2026-10-25

> **Phase validée par Sofiane le 2026-10-25.** Les 9 graines visibles sur la terre après le semis sont conservées (valeur par défaut, aucune autre demandée).

L'acte 1 se joue pour de vrai. On saisit un tas de graines à la souris ou au doigt, il décolle et suit le pointeur, et ses 70 graines ballottent derrière lui. Le pot visé gonfle légèrement. Au lâcher sur un pot libre, les graines sont aspirées dans la terre, le pot les « avale » et passe à `seeded`. Un lâcher dans le vide ou sur un pot déjà semé renvoie le tas à sa place. Quand les 4 pots sont semés, le texte 2 (« abreuver ») prend le relais.

**Le fichier Blender n'a pas été ouvert ni modifié pendant cette phase.**

À voir sur http://localhost:5173 (serveur de dev toujours lancé).

## Ce qu'il te reste à décider

| # | Question | Ce que j'ai mis par défaut |
|---|---|---|
| 1 | **Graines visibles après le semis.** Le plan dit « aspirées ». | 61 graines sur 70 s'enfouissent sous la terre. Les 9 autres restent posées à la surface, éparpillées dans le bac, pour qu'on voie quels pots sont semés (`z7-seme.png`). Si tu préfères un bac nu, il suffit de passer `SEEDS_KEPT` à 0 dans `SeedPiles.tsx`. |

## 4.1 Hook `useDrag`

`src/hooks/useDrag.ts`

- Renvoie le handler `onPointerDown` à poser sur l'objet saisissable. Le suivi se fait ensuite sur `window`, si bien que le drag ne se perd pas quand le pointeur sort de l'objet ou du canvas.
- À chaque mouvement, le pointeur est converti en rayon caméra (le décalage d'image de `CameraRig` est pris en compte), puis projeté sur un **plan horizontal** à la hauteur demandée. Le rayon est aussi transmis, pour d'autres projections (sur la terre des pots, voir 4.3).
- Pointer Events : la même logique couvre la **souris et le tactile**. Le bouton gauche seul déclenche le drag, puisque le clic droit servira à verser en phase 5.
- Aucune allocation pendant le drag : raycaster, plan et vecteurs sont créés une fois puis réutilisés.

## 4.2 Tas de graines et petite physique

`src/components/three/SeedPiles.tsx`

| Réglage | Valeur |
|---|---|
| Graines par tas | 70, comme décidé |
| Hauteur de vol pendant le drag | 9 cm (le bord des pots est à 6,5 cm) |
| Suivi du pointeur | amorti (`damp` à 22/s), montée à 12/s |
| Ressort par graine | raideur 260/s² × (0,6 à 1,2, au hasard), amortissement relatif 0,32 |
| Haut du tas | jusqu'à 45 % plus souple que la base : il ballotte davantage |
| Inclinaison | chaque graine penche dans le sens de sa vitesse (au plus 0,9 rad) |

- **Chaque graine est un élément à part** : elle a sa position, sa vitesse et son propre ressort vers sa place dans le tas. Quand le tas bouge, elles le suivent avec du retard, se dispersent un peu, puis se ressoudent en oscillant. C'est un simple ressort par graine, calculé dans `useFrame` en sous-pas de 1/240 s, sans moteur physique (plan A du tableau des risques).
- **Rendu** : un `InstancedMesh` par tas, où chaque graine est une instance avec sa propre matrice. Le résultat à l'écran est identique à 70 meshes séparés, mais on passe de 280 appels de dessin à 4.
- La simulation ne tourne que pendant le drag et le retour. Un tas au repos ne coûte rien.
- **Zone de saisie** : un cylindre invisible de 8,4 cm de diamètre, plus large que le tas (4,6 cm), pour une cible tactile confortable. Le curseur passe en main ouverte (`grab`) au survol, puis en main fermée (`grabbing`) pendant le drag.
- Le drag n'est actif qu'à l'étape `sow`. N'importe quel tas peut aller dans n'importe quel pot.

## 4.3 Drop, aspiration et retour

`src/scene/potHit.ts`, `src/components/three/Pots.tsx`, `src/hooks/useHighlight.ts`

**Pot visé.** Le tas flotte au-dessus du sol : selon la perspective, on vise soit avec le tas, soit avec le pointeur. Le test accepte donc le pot situé à l'aplomb du tas, puis, à défaut, le pot dont la terre est sous le pointeur, avec 2,5 cm de tolérance autour du pot. Pendant le drag, seul un **pot libre** se met en valeur : il gonfle de 8 % avec un léger rebond (GSAP, `back.out`), puis revient à sa taille.

**Lâcher sur un pot libre.** Le store est mis à jour aussitôt (`seedPot`), puis l'animation GSAP joue :

1. les graines les plus proches partent en premier, avec un peu de désordre (étalement de 0,4 s) ;
2. chacune est aspirée en accélérant vers un point au-dessus du centre du bac (0,32 s, `power2.in`) ;
3. puis elle plonge vers un point de la terre réparti dans le bac (0,22 s). 61 graines s'enfouissent en rétrécissant, et 9 restent posées en surface ;
4. le pot les « avale » : il s'écrase légèrement puis revient avec un rebond élastique.

L'aspiration dure environ 0,95 s au total.

**Lâcher dans le vide ou sur un pot déjà semé.** Le tas revient chez lui en arc (petit rebond vers le haut, puis descente), en 0,45 à 0,9 s selon la distance (GSAP, `power3.out`). Les ressorts reposent ensuite les graines, puis la simulation s'arrête.

**Fin de l'acte.** Au 4ᵉ pot semé, `checkStep()` passe à `water` et le texte 2 s'écrit pendant que les dernières graines finissent de tomber.

`useUi` porte maintenant `seedTarget`, le pot libre survolé. La mise en valeur passe par le store, et la scène ne se parle jamais directement.

## Panneau dev

- Les boutons **Semer** du panneau restent utilisables. Un pot semé depuis le panneau aspire le premier tas encore disponible, pour que l'image reste fidèle au store (`10-panneau-dev-pot4.png`).
- **Reset** remet les 4 tas en place (`11-apres-reset.png`).

## Captures

Dans `docs/phase4/` (desktop 1440 × 900), `docs/phase4/mobile/` (390 × 844, tactile), panneau dev masqué :

| Fichier | Moment |
|---|---|
| `01-acte1.png` | acte 1, tas au repos |
| `02-drag-en-vol.png` | tas saisi, en vol vers le pot |
| `03-pot-vise.png` | tas au-dessus d'un pot libre, pot mis en valeur |
| `04-aspiration.png` | aspiration en cours |
| `05-pot-seme.png` | pot semé |
| `06-retour.png` | lâché dans le vide, le tas rentre |
| `07-pot-deja-seme.png` | tas au-dessus du pot déjà semé : pas de mise en valeur |
| `08-trois-pots.png` | 3 pots semés |
| `09-acte2.png` | 4ᵉ pot semé, texte 2 |
| `z1` à `z7` | gros plans (×2) : repos, saisie, mouvement, pot visé, aspiration, semé |
| `mobile/01` à `03` | acte 1, drag au doigt avec pot visé, texte 2 |

## Vérifications

| Test | Résultat |
|---|---|
| `npm run build` (tsc + vite) | ✅ sans erreur |
| `npm run lint` (oxlint) | ✅ 0 problème |
| Drag souris d'un tas sur un pot libre : aspiration, `seeded` | ✅ |
| Lâcher dans le vide : retour, store inchangé | ✅ |
| Lâcher sur un pot déjà semé : retour, store inchangé | ✅ |
| 4 pots semés : passage à `water` et texte 2 | ✅ desktop et mobile |
| Drag tactile (événements tactiles réels via Chrome DevTools) | ✅ 4 pots, retour depuis le vide |
| Curseur `grab` au survol, `grabbing` pendant le drag | ✅ |
| Semis via le panneau dev, puis reset | ✅ |
| Console desktop et mobile (dev) | ✅ aucune erreur ni warning |
| Build de prod (`vite preview`) : acte 1 complet, panneau dev absent | ✅ aucune erreur ni warning |
| Serveur de dev localhost:5173 | ✅ toujours lancé |

## Points relevés pour la suite

| # | Constat | Traitement prévu |
|---|---|---|
| 1 | En dev sur mobile, le panneau dev (en bas à gauche) recouvre les tas : un doigt posé dessus touche le panneau. Le build de prod n'est pas concerné. | Pour tester sur téléphone en dev, je peux rendre le panneau repliable. |
| 2 | Sur mobile, le doigt cache le tas pendant le drag. La mise en valeur du pot reste visible, et c'est elle qui guide. | Phase 7.3 : décaler le tas un peu au-dessus du doigt si besoin. |
| 3 | Les tas sont petits à l'écran (environ 30 px en desktop). La zone de saisie est 2 fois plus large que le tas, ce qui suffit en test. | À ton avis, après essai à la main. |
| 4 | L'aspiration ne tient pas encore compte de `prefers-reduced-motion`. | Phase 7.3 (accessibilité). |
| 5 | Après un retour du tas, le curseur reste neutre tant que la souris n'est pas ressortie puis revenue sur le tas. C'est purement cosmétique. | Phase 7.3 (curseurs). |
| 6 | Bundle JS : 1,37 Mo (392 Ko gzip), soit +8 Ko gzip. | Phase 7.4. |

## Fichiers

```
WEB/src/
  hooks/useDrag.ts                  pointeur → plan 3D, souris et tactile (nouveau)
  hooks/useHighlight.ts             mise en valeur GSAP d'un objet (nouveau)
  scene/potHit.ts                   pot sous le tas ou le pointeur, points de la terre (nouveau)
  scene/layout.ts                   + emprise des pots et de la terre, hauteur de vol
  stores/useUi.ts                   + seedTarget (pot libre survolé)
  components/three/SeedPiles.tsx    drag, ressorts par graine, aspiration, retour
  components/three/Pots.tsx         un composant par pot : mise en valeur et « gorgée »
WEB/docs/phase4-semis.md            ce compte rendu
WEB/docs/phase4/                    captures
```
