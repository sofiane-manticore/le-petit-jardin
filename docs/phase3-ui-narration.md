# Phase 3 — UI et narration

Projet « Le petit jardin » (R3F) · 2026-10-25

> **Phase validée par Sofiane le 2026-10-25.** Fond de l'intro en crème et surlignage du second « temps » conservés (valeurs par défaut, aucune autre demandée).

Le récit est en place de bout en bout. Le texte 1 s'écrit sur un fond uni, puis le fond se lève sur le jardin pendant que le texte glisse en haut d'écran. Chaque fois qu'une étape est remplie, le texte sort et le suivant s'écrit, mot clé surligné. À l'acte 3, la timeline 06:00 → 06:00 et le bouton « maintenir » de la maquette apparaissent en bas et font réellement passer les jours. La console est vide en dev comme en prod, desktop et mobile.

**Le fichier Blender n'a pas été ouvert ni modifié pendant cette phase.**

À voir sur http://localhost:5173. Les actions des actes 1, 2 et 4 (semer, arroser, récolter) arrivent en phases 4 à 7 : pour l'instant, on passe d'une étape à l'autre avec le panneau dev (en bas à gauche). L'acte 3 se joue déjà pour de vrai avec le bouton.

## Révision 1 : tes retours

| Retour | Ce que j'ai fait |
|---|---|
| Le bouton du temps est peu lisible sur le sol, pictogrammes illisibles | Après deux essais (fond crème clair, puis fond calé sur la couleur de la scène), tu as choisi la solution ci-dessous. |
| **Toute la timeline dans une barre unie, fine et minimaliste, à la couleur fixe du fond de départ** | La timeline, les pictos et le bouton sont regroupés dans une barre en pilule, crème du design (`#EFE6D6`, la couleur du fond au lancement), qui ne varie pas avec l'heure. Elle fait 40 px de haut, avec une ombre très légère pour la détacher du sol. Le soleil (13 px, terre cuite) ouvre la barre à gauche. La lune est posée sur la piste, à 20:00, et l'interrompt sur le fond de la barre. Le bouton passe de 44 à 32 px pour tenir dans la barre, mais sa zone tactile reste de 44 px. Au repos, il est crème avec le contour terre cuite ; pendant le maintien, il se remplit de terre cuite et gonfle hors de la barre, comme dans la maquette. La sonde de couleur de l'essai précédent est retirée. |
| Opacité du sol à 50 % par défaut | Fait (`uGroundOpacity` à 0,5 dans `src/materials/paintedMaterial.ts`). Le curseur **Sol** du panneau dev part maintenant de 50 %. |

Captures : `phase3/revision1/barre-matin.png`, `barre-nuit.png`, `barre-mobile-maintien.png`. Build, lint et console toujours propres (desktop et mobile).

## Ce qu'il te reste à décider

| # | Question | Ce que j'ai mis par défaut |
|---|---|---|
| 1 | **Couleur du fond uni de l'intro.** Le plan dit « fond uni coloré ». | La crème du design (`#EFE6D6`), la même que le fond de la scène : le jardin semble apparaître sur la page. Changer la couleur revient à modifier un seul token (`--color-curtain` dans `src/index.css`). Si tu veux une vraie couleur (sable, terre cuite…), dis-moi laquelle ; sur un fond foncé, je passerai le texte en crème clair. |
| 2 | **Mot surligné du texte 3.** « laisser le temps au temps » contient deux fois « temps ». | Le second (« au *temps* »), celui qui clôt la phrase. |

## 3.1 StoryText

`src/components/ui/StoryText.tsx`, textes dans `src/components/ui/storyTexts.ts`.

| Texte | Étape | Lignes (mot surligné en *italique*) |
|---|---|---|
| 1 | `intro`, `sow` | La créativité, c'est comme une plante. / Il suffit de commencer par planter une *graine*. |
| 2 | `water` | Mais les idées ne suffisent pas, / il faut les *abreuver*. |
| 3 | `wait` | Rome ne s'est pas bâtie en un jour. / Il faut savoir laisser le temps au *temps*. |
| 4 | `harvest` | Un long processus, mais quel plaisir / de récolter le *fruit* de nos efforts ! |
| — | `end` | aucun texte (le popup de fin vient en phase 7) |

- **Animation reprise de la maquette, en GSAP** : chaque ligne entre par un fondu, un flou de 4 px qui se résorbe et une montée de 10 px (1,2 s, courbe `rise` de la maquette), avec 0,8 s d'écart entre les lignes. Le mot clé se surligne ensuite de gauche à droite (0,8 s, courbe `mark`), comme un coup de surligneur posé au bas du mot.
- Les courbes `rise` et `mark` sont les mêmes que les tokens CSS de la phase 1, déclarées pour GSAP avec `CustomEase` (`src/lib/gsapSetup.ts`).
- **Typographie** : Fraunces SOFT 350, de 24 px (mobile) à 34 px (desktop), comme la maquette. Apostrophes typographiques, espace insécable avant « ! ». J'ai corrigé « fuit » en « fruit » dans le texte 4 (coquille du brief). J'ai gardé le point final du brief après « graine », que la maquette avait omis.
- **Largeur** : 780 px au lieu des 640 px de la maquette. À 640 px, « graine. » passait seul sur une troisième ligne en desktop. Les lignes sont équilibrées (`text-wrap: balance`) pour éviter un mot isolé en bout de ligne sur mobile.
- **Accessibilité** : le texte est dans une zone `aria-live="polite"`, donc lu par les lecteurs d'écran à chaque changement. Si le système demande moins d'animations (`prefers-reduced-motion`), les lignes apparaissent en simple fondu, sans flou ni montée.

## 3.2 TimeBar

`src/components/ui/TimeBar.tsx`. Le comportement du bouton reprend le code de la maquette à l'identique, réglages compris :

| Réglage maquette | Valeur |
|---|---|
| Vitesse de base | 30 min de jeu par seconde |
| Accélération | ×1 → ×40, en `1 + 2,5 × t²` (t = secondes de maintien) |
| Inertie au relâché | le temps glisse encore puis s'arrête (décroissance de 0,35 s) |
| Ressort du bouton | squash & stretch sur deux axes, avec des pichenettes alternées X puis Y de plus en plus serrées pendant l'appui, un rebond vertical au relâché, et un gonflement jusqu'à +58 % à pleine vitesse |
| Anneau | se remplit avec la vitesse atteinte |

Ce qui change par rapport à la maquette :

- **Barre de 06:00 à 06:00**, comme tu l'as demandé : la journée occupe les 58 % de gauche (06:00 → 20:00) en sable, la nuit les 42 % de droite en bleu gris (`--color-night`, la teinte de nuit de la scène mêlée à la piste). Deux petits pictogrammes Lucide, un soleil et une lune, marquent le lever et la tombée de la nuit.
- La barre est graduée en **heures d'horloge**. Comme la nuit défile 3 fois plus vite (phase 2), le curseur accélère visiblement sur la partie nuit : la nuit passe vite, et ça se voit.
- **Branchée sur le store** : le bouton appelle `advanceTime()`, qui gère la nuit accélérée, compte un jour à chaque lever et fait passer à l'acte 4 au jour 15. Le soleil et la lumière de la scène suivent donc le maintien en direct.
- **Visible seulement à l'acte 3** : elle apparaît 2,4 s après l'entrée du texte 3 (fondu et montée), puis disparaît au jour 15. Cachée, elle est `inert` : ni clic ni tabulation possibles.
- **Tactile** : l'appui capture le doigt, donc glisser hors du bouton n'interrompt pas le maintien. Le menu contextuel (appui long) est bloqué. Le bouton fait 44 px, la taille tactile minimale recommandée.
- **Clavier** : Espace ou Entrée maintenus sur le bouton font la même chose que la souris. L'icône est `FastForward` de Lucide, remplie, ce qui reproduit le pictogramme de la maquette.
- La boucle d'animation tourne sur le ticker de GSAP et modifie le DOM directement, sans rendu React à chaque image.

Pas encore de compteur « Jour n / 15 » visible : c'est la tâche 6.1.

## 3.3 Intro et transitions

`src/components/ui/IntroCurtain.tsx`, `src/stores/useUi.ts`.

1. **Au chargement**, un fond uni couvre tout l'écran et le texte 1 s'écrit au centre. Ce fond masque aussi le chargement des modèles 3D.
2. Le fond se lève quand **deux conditions** sont réunies : le texte est entièrement écrit (surlignage compris) et la scène est chargée. On ne voit donc jamais une scène à moitié chargée. Si le chargement est plus long que l'écriture, le texte attend sur le fond uni.
3. Après **1,2 s de lecture**, l'acte 1 commence. Le fond s'efface en 1,4 s pendant que le texte glisse du centre vers le haut de l'écran, au même rythme.
4. **Entre deux actes** : le texte sortant monte légèrement en se floutant (0,6 s, lignes décalées de 80 ms), puis le suivant s'écrit. Si plusieurs étapes s'enchaînent très vite, seul le dernier texte s'affiche, sans empiler les animations.

Durée de l'intro mesurée : environ 4 s entre l'ouverture de la page et le début de l'acte 1, sur un chargement local.

`useUi` est un petit store séparé pour l'état propre à l'interface (`sceneReady`, `introWritten`), pour ne pas mêler l'UI à la machine d'étapes du jardin.

## Captures

Dans `docs/phase3/` (desktop 1440 × 900) et `docs/phase3/mobile/` (390 × 844), le panneau dev masqué :

| Fichier | Moment |
|---|---|
| `01-intro-ecriture.png` | le texte 1 s'écrit sur le fond uni |
| `02-intro-ecrit.png` | texte 1 écrit, mot surligné |
| `03-revelation.png` | le fond se lève, le texte remonte |
| `04-acte1.png` | acte 1 |
| `05-sortie-texte1.png` | le texte 1 sort |
| `06-acte2.png` | acte 2 |
| `07-acte3.png` | acte 3, timeline apparue |
| `08-maintien.png` | bouton maintenu, anneau et bouton remplis |
| `09-relache.png` | après relâché, la nuit est tombée |
| `10-sortie-timebar.png` | jour 15 : la timeline disparaît, le texte 3 sort |
| `11-acte4.png` | acte 4 |
| `12-fin.png` | étape de fin : plus de texte |
| `13-reset.png` | retour à l'intro (reset du panneau dev) |

## Vérifications

Parcours complet automatisé dans Chrome (Playwright), sur le serveur de dev, en desktop et en mobile tactile :

| Test | Résultat |
|---|---|
| `npm run build` (tsc + vite) | ✅ sans erreur |
| `npm run lint` (oxlint) | ✅ 0 problème |
| Intro : écriture, attente de la scène, révélation, passage à `sow` | ✅ desktop et mobile |
| Bon texte à chaque étape, sortie puis entrée | ✅ 4 textes, aucun à l'étape `end` |
| Maintien souris 2,5 s | ✅ 07:40 → 19:10 le premier jour, accélération visible |
| Inertie au relâché | ✅ le temps continue quelques instants puis s'arrête |
| Maintien au clavier (Espace) | ✅ |
| Jour 15 : passage à `harvest`, timeline masquée | ✅ |
| Reset vers l'intro, puis nouvelle intro complète | ✅ |
| Console desktop et mobile (dev) | ✅ aucune erreur ni warning |
| Build de prod (`vite preview`) : intro jusqu'à la scène, panneau dev absent | ✅ aucune erreur ni warning |
| Serveur de dev localhost:5173 | ✅ toujours lancé |

## Points relevés pour la suite

| # | Constat | Traitement prévu |
|---|---|---|
| 1 | Le surlignage (`#E8C690`) ressort moins sur le fond pêche du matin (07:40) que sur la crème de l'intro, parce que les deux teintes sont proches. Il reste lisible. | À ton avis ; on peut foncer légèrement le surlignage. |
| 2 | Au jour 15, l'horloge s'arrête à 06:00 : l'acte 4 se joue donc dans la lumière rosée de l'aube (`11-acte4.png`). | Phase 6 : si tu préfères une récolte en plein jour, faire glisser l'heure vers la matinée au passage à l'acte 4. |
| 3 | En portrait, le texte prend 4 lignes et descend jusqu'au haut du jardin. | Phase 7.3 (responsive) : ajuster le cadrage portrait avec l'UI réelle. |
| 4 | Pas de compteur de jours visible. | Phase 6.1. |
| 5 | Bundle JS : 1,36 Mo (384 Ko gzip), soit +90 Ko (+31 Ko gzip) avec GSAP, CustomEase et l'UI. | Phase 7.4 : découpage du bundle. |

## Fichiers

```
WEB/src/
  App.tsx                           + rideau, texte et timeline dans l'overlay
  index.css                         + tokens night et curtain, utilitaire story-mark
  lib/gsapSetup.ts                  CustomEase : courbes rise et mark de la maquette
  stores/useUi.ts                   état de l'UI (scène prête, texte 1 écrit)
  scene/Experience.tsx              + signale que la scène est chargée
  components/ui/storyTexts.ts       les 4 textes et le texte de chaque étape
  components/ui/StoryText.tsx       apparition, surlignage, sortie, glissement de l'intro
  components/ui/TimeBar.tsx         timeline 06:00 → 06:00 et bouton maintenir
  components/ui/IntroCurtain.tsx    fond uni de l'intro
  components/ui/DevPanel.tsx        passé au-dessus du rideau
WEB/docs/phase3-ui-narration.md     ce compte rendu
WEB/docs/phase3/                    captures
```
