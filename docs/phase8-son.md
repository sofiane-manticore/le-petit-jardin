# Phase 8 — Le son

Projet « Le petit jardin » (R3F) · 2026-10-25

Le site a maintenant du son : l'eau, les graines, le pop des fruits, une ambiance qui suit le jour et la nuit, et un bouton pour couper le son en haut à droite. **Tous les sons sont synthétisés dans le navigateur (Web Audio), sans aucun fichier audio** : rien à télécharger, aucune question de licence, et le poids du site ne bouge presque pas.

**Le fichier Blender n'a pas été ouvert ni modifié pendant cette phase.**

À écouter sur http://localhost:5173 (dev) et http://192.168.1.57:4173 (build de prod refait, pour l'iPad et l'iPhone).

## Ce qu'il te reste à décider

| # | Question | Ce que j'ai mis par défaut |
|---|---|---|
| 1 | **Sons synthétisés ou enregistrés ?** | Synthétisés, pour rester léger et cohérent avec le style peint. Si un son te paraît trop « électronique », on peut le remplacer par un vrai enregistrement (CC0) au cas par cas : il suffit de me dire lequel. |
| 2 | **Son activé au départ.** | Oui. Les navigateurs interdisent le son avant le premier geste : il démarre donc au premier clic, tap ou touche, c'est-à-dire en général quand on attrape le premier tas de graines. Le choix « coupé » est mémorisé d'une visite à l'autre. |
| 3 | **Petite mélodie.** | Chaque geste réussi (pot semé, pot arrosé, nouveau jour, fruit au compteur) joue une note de la même gamme pentatonique (ré majeur), qui monte au fil de l'acte. Le popup de fin conclut par un arpège. On peut la retirer si tu préfères des bruitages seuls. |
| 4 | **iPhone en mode silencieux.** | Sur iOS, le son Web suit l'interrupteur silencieux : si l'iPhone est en silencieux, on n'entend rien. C'est le comportement normal des sites, je ne l'ai pas forcé. |

## 8.1 Ce qu'on entend

| Moment | Son |
|---|---|
| Arrivée du jardin (fin de l'intro) | Ambiance : vent léger en rafales irrégulières, oiseaux de temps en temps (trois chants différents, placés à gauche ou à droite) |
| Acte 1 : attraper un tas de graines | Petit froissement sec |
| Acte 1 : le pot avale les graines | Pluie de petits clics calée sur l'arrivée des graines, toc mat de terre, puis la note du pot |
| Acte 2 : attraper l'arrosoir | « Tonk » de fer-blanc |
| Acte 2 : verser | Filet d'eau qui suit le débit de l'arrosoir, avec un glouglou ; impacts des gouttes : tapotis mat sur la terre, « tic » clair sur le bord en céramique, « plic » sur le sol |
| Acte 2 : un pot a assez bu | « Gloup » rond, puis la note du pot |
| Acte 3 : maintenir le bouton | Le vent forcit avec la vitesse du temps, élan du relâché compris ; une note douce à chaque nouveau jour |
| Acte 3 : la nuit | Les oiseaux se taisent, les grillons prennent le relais ; le chœur des oiseaux revient dans la dernière heure avant l'aube |
| Acte 4 : les 8 fruits éclosent | Une petite bulle qui éclate par fruit, calée sur leur apparition |
| Acte 4 : cueillir | Le rameau tire, « pop » du détachement, souffle du vol, puis une note claire quand le fruit tombe dans sa case (plus aiguë du 1er au 8e) |
| Acte 4 : matinée | Oiseaux plus nombreux |
| Popup de fin | Arpège montant, et l'ambiance baisse de moitié |

Le son est spatialisé légèrement : les pots de gauche sonnent à gauche, ceux de droite à droite, et les gouttes suivent l'endroit où elles tombent.

## Bouton pour couper le son

- Pictogramme Lucide `Volume2` / `VolumeX`, pastille crème de 44 px en haut à droite, dans le style des autres contrôles. Il apparaît avec le jardin et reste cliquable par-dessus le popup de fin.
- Touche **M** pour couper ou remettre le son. Le libellé lu par un lecteur d'écran change (« Couper le son (M) » / « Remettre le son (M) »).
- Le choix est mémorisé dans le navigateur (en navigation privée, il vaut pour la visite en cours).
- Sur mobile (375 px), le bouton tient à côté du texte sans le toucher (`02`).

## Détails techniques

- Un seul `AudioContext`, créé et débloqué au premier geste (avec l'astuce du buffer muet pour iOS). Il se met en pause quand l'onglet est caché, pour la batterie.
- Tout passe par un compresseur en sortie : les cumuls (pluie de gouttes + oiseaux + note) ne saturent pas.
- Les étapes réussies sont lues dans le store : le son suit aussi bien la souris que le bouton clavier de la phase 7 ou le panneau dev.
- Quand le son est coupé, aucun son n'est même programmé : rien ne ressort d'un coup quand on le remet.
- Sur 110 gouttes par seconde, 26 au plus font un son, le filet d'eau fait le reste.

## Vérifications

J'ai mesuré les niveaux en sortie dans le navigateur, en jouant les actes (crêtes en valeur absolue, 1 = saturation) :

| Moment | Crête | Niveau moyen (RMS) |
|---|---|---|
| Ambiance seule, le jour | 0,07 | 0,02 |
| Un pot semé | 0,16 | 0,07 |
| Trois pots semés coup sur coup | 0,30 | 0,11 |
| Arrosage en continu | 0,20 | 0,06 |
| Pot qui finit de boire (gloup) | 0,28 | 0,09 |
| Temps à ×40 (vent fort) | 0,20 | 0,066 |
| Éclosion des 8 fruits | 0,14 | 0,04 |
| Cueillette + arrivée au compteur | 0,35 au plus | 0,12 |
| Arpège de fin | 0,22 | 0,07 |
| Son coupé | 0,000001 | 0 |

Rien ne sature, l'ambiance reste discrète sous les bruitages, et le moment le plus fort est la cueillette. Je n'ai pas d'oreille : ces chiffres disent que l'équilibre est sain, pas que les sons te plairont. **Ton écoute est le vrai test**, surtout pour le timbre des oiseaux et du filet d'eau.

Testé en dev : semis, arrosage réel jusqu'au seuil du pot, maintien du temps sur 6 jours, éclosion, 8 cueillettes au bouton clavier, popup de fin, bouton et touche M, préférence mémorisée, mobile 375 px. Console sans erreur ni warning. `tsc`, `oxlint` et `npm run build` passent. Le froissement du tas de graines n'a pas été déclenché pendant le test (les tas étaient hors cadre dans la fenêtre du navigateur), il utilise les mêmes briques que les autres.

**Build réseau :** refait et vérifié par requête (la nouvelle version, avec le son, est servie sur 192.168.1.57:4173 ; l'analyseur de dev n'y est pas). Je n'ai pas pu l'ouvrir dans le navigateur intégré, l'autorisation a été refusée. Le contrôle sur ton iPad et ton iPhone reste donc à faire de ton côté.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/audio/engine.ts` | AudioContext, déblocage au premier geste, coupure, briques de synthèse (nouveau) |
| `src/audio/sfx.ts` | Sons ponctuels : graines, arrosoir, gouttes, gloup, jours, fruits, arpège (nouveau) |
| `src/audio/ambience.ts` | Vent, oiseaux, grillons, filet d'eau, mis à jour à chaque image (nouveau) |
| `src/audio/director.ts` | Branche les sons sur le store, touche M (nouveau) |
| `src/stores/useSound.ts` | État « son coupé », mémorisé (nouveau) |
| `src/components/ui/SoundToggle.tsx` | Bouton Lucide pour couper le son (nouveau) |
| `src/components/three/Fruits.tsx`, `SeedPiles.tsx`, `WateringCan.tsx`, `Water.tsx` | Déclenchent leurs sons au bon moment de l'animation |
| `src/components/ui/TimeBar.tsx` | Transmet la vitesse du temps au vent |
| `src/scene/harvest.ts`, `src/components/ui/EndPopup.tsx` | Délai d'ouverture du popup partagé avec l'arpège |
| `src/App.tsx` | Monte le son et le bouton |

Captures dans `docs/phase8/` : `01-bouton-son-desktop` et `02-bouton-son-mobile`.

C'était la dernière phase du plan.
