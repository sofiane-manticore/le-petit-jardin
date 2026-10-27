# Retours finaux — 12 points

Projet « Le petit jardin » (R3F) · 2026-10-25

Les 12 points de ta liste sont traités, sur http://localhost:5173 (dev) et http://192.168.1.57:4173 (build de prod refait pour l'iPad et l'iPhone). **Le fichier Blender n'a pas été ouvert ni modifié.**

## Ce qu'il te reste à décider

| # | Question | Ce que j'ai mis par défaut |
|---|---|---|
| 1 | **3ᵉ ligne « Changement texte 2 » vide.** Sans doute le texte 3 ? | Texte 3 inchangé (« Rome ne s'est pas bâtie en un jour… »). Donne-moi le nouveau texte si tu veux le changer. |
| 2 | **Langue de départ.** | Celle de l'appareil : français s'il est en français, anglais sinon. Ton choix est ensuite mémorisé. |
| 3 | **Traductions anglaises.** | Elles sont de moi, à relire (tableau plus bas). |
| 4 | **Texte du récap.** | Rédigé à partir de ce que je connais du projet, à reprendre si tu veux le formuler autrement (dans `src/i18n/strings.ts`). |
| 5 | **Raccourcis clavier.** | C lance ou quitte le mode cinématique, Échap le quitte, M coupe le son. |

## Les 12 points

| # | Retour | Ce qui a changé |
|---|---|---|
| 1 | Texte 1 | « La créativité, c'est comme un potager. Il suffit de commencer par planter une *graine*. » |
| 2 | Texte 2 | « Mais les idées doivent s'entretenir. Il faut les *abreuver*. » |
| 3 | Ligne vide | Voir la question 1. |
| 4 | Mobile : doigt sur l'anse | Au doigt, c'est maintenant l'anse qui vient sous le doigt (le point est projeté à la hauteur de l'arrosoir tenu), et non plus le point de chute de l'eau. Le bec et le jet restent visibles. La souris garde l'ancien réglage, qui vise la terre. Le pot visé se met toujours en valeur. |
| 5 | Caméra à 360° pendant le temps | Pendant l'acte 3, la caméra fait un tour complet du jardin. L'angle suit directement la pousse (0 → 1 sur les 15 jours), donc au 15ᵉ jour elle est **exactement** revenue à son angle de départ. Le cadrage est recalculé à chaque angle pour que tout le jardin reste à l'écran. Le tour suit le maintien et son élan, et s'arrête quand on relâche (`04`). |
| 6 | Graines immobiles quand les pots rebondissent | Les graines posées sur la terre suivent maintenant la déformation du pot : l'écrasement à l'arrivée des graines, le gonflement quand il a bu et la mise en valeur quand l'arrosoir le vise. |
| 7 | Bouton pixelisé en grossissant | Le bouton est dessiné 1,75 fois plus grand (56 px), puis réduit à 32 px au repos. Quand il gonfle (×1,6 environ), il est donc rendu à sa taille réelle au lieu d'agrandir une image de 32 px. Vérifié net au maximum de l'appui. |
| 8 | Mode cinématique | Un bouton Lucide `Clapperboard` en haut à droite (ou la touche C) lance une suite de plans rapprochés : pots, arrosoir, tas de graines, plantes qui poussent, et un plan large au ras du sol. Les coupes sont franches et chaque plan est un travelling lent de 4,2 s, avec une profondeur de champ prononcée (net sur 6 cm autour du sujet). L'interface s'efface et le jardin n'est plus cliquable. Le bouton devient une croix, et Échap ou C ramènent au jeu, exactement où on en était (`02`, `03`). Les plans changent selon l'avancée du jardin. |
| 9 | Arrosage trop fort | Le filet d'eau est 3,3 fois moins fort (−10 dB), et les impacts de gouttes 2,5 fois moins forts et deux fois moins nombreux. |
| 10 | Vent trop fort en accélérant | La montée du vent est divisée par 4 et il reste plus sourd : à ×40, il n'est plus que légèrement au-dessus du vent de fond. |
| 11 | Version anglaise | Tous les textes passent en anglais : le récit, la timeline, le bouton « verser », l'aide au clic droit, le compteur, le bouton clavier, le popup, le récap, les libellés lus par les lecteurs d'écran, le titre de l'onglet et l'attribut `lang` de la page. Le bouton `Languages` + « EN » / « FR » en haut à droite bascule à tout moment, et le texte affiché change sur place sans rejouer son animation. |
| 12 | Récap du workflow | Sous le popup de fin, le voile défile. Une invite « Découvrir comment ce jardin a poussé » descend au récap : une intro, puis 6 étapes avec leurs pictos Lucide (direction artistique dans Claude Design, modélisation et textures à la main dans Blender, plan séquencé, Blender MCP, description explicite à Claude, validation phase par phase), et la stack en pied. Chaque étape entre en fondu quand elle arrive à l'écran (`06`, `06b`). |

## Textes anglais

| Français | Anglais |
|---|---|
| La créativité, c'est comme un potager. Il suffit de commencer par planter une *graine*. | Creativity is like a vegetable garden. All it takes is planting a *seed*. |
| Mais les idées doivent s'entretenir. Il faut les *abreuver*. | But ideas need tending. You have to *water* them. |
| Rome ne s'est pas bâtie en un jour. Il faut savoir laisser le temps au *temps*. | Rome wasn't built in a day. Good things take *time*. |
| Un long processus, mais quel plaisir de récolter le *fruit* de nos efforts ! | A long process, but what a joy to reap the *fruit* of our efforts! |
| Bravo, ils sont *magnifiques* ! | Well done, they look *gorgeous*! |
| Me retrouver sur LinkedIn | Find me on LinkedIn |

## Détails techniques

- **Contrôles en haut à droite** : langue, cinéma et son, en pastilles de 44 px. Ils restent au-dessus du popup de fin, sauf le cinéma qui y est masqué. Sur mobile, le texte du récit descend de 24 px pour passer sous eux (`07`).
- **Profondeur de champ** : elle lit le tampon de profondeur, que WebGL refuse de copier avec l'anticrénelage MSAA du post-process. En mode cinématique, le post-process est donc recréé sans MSAA, puis il le retrouve au retour au jeu. Sans ça, l'image se figeait en sortant du mode.
- **Distances des plans** : les textures peintes font 2048 px. Trop près, elles deviennent floues même sans profondeur de champ. Les plans restent donc entre 24 et 62 cm du sujet.
- **Bouton du temps** : même rendu, même ressort, même zone tactile de 44 px ; seul le dessin est fait en grand puis réduit.

## Vérifications

Testé en dev : texte 1 et contrôles (`01`), bascule FR/EN avant le jeu et sur le récap, mode cinématique (entrée, plans, sortie par Échap et C), semis, arrosage, tour de caméra pendant le maintien puis retour à l'angle exact au 15ᵉ jour, bouton net à l'appui, 8 cueillettes, popup et récap en anglais puis en français, mobile 375 px. Plus d'erreur WebGL dans la console depuis la correction du MSAA. `tsc`, `oxlint` et `npm run build` passent, et le build est servi sur 192.168.1.57:4173 (vérifié par requête).

**Pas testé :** l'anse sous le doigt demande un vrai écran tactile, que le navigateur de test n'a pas. C'est à vérifier sur ton iPhone. Je n'ai pas remesuré les niveaux sonores après la baisse, les écarts ci-dessus sont ceux des réglages.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/i18n/strings.ts`, `src/stores/useLang.ts` | Tous les textes FR/EN, langue mémorisée (nouveaux) |
| `src/components/ui/TopControls.tsx` | Langue, cinéma, son, raccourcis C et Échap (nouveau, remplace `SoundToggle.tsx`) |
| `src/components/ui/Recap.tsx` | Récap du workflow (nouveau) |
| `src/scene/cinema.ts`, `src/scene/Cinematic.tsx` | Plans du mode cinématique (nouveaux) |
| `src/scene/potObjects.ts` | Déformation des pots, suivie par les graines (nouveau) |
| `src/scene/CameraRig.tsx` | Tour à 360° pendant la pousse, plans cinématiques |
| `src/scene/PostFX.tsx` | Profondeur de champ en mode cinématique |
| `src/components/three/SeedPiles.tsx`, `Pots.tsx` | Graines qui suivent les rebonds |
| `src/components/three/WateringCan.tsx` | Anse sous le doigt sur écran tactile |
| `src/components/ui/TimeBar.tsx` | Bouton dessiné en grand, textes traduits |
| `src/components/ui/EndPopup.tsx` | Voile qui défile, invite vers le récap, textes traduits |
| `src/audio/ambience.ts`, `src/audio/sfx.ts` | Arrosage et vent baissés |
| `StoryText.tsx`, `storyTexts.ts`, `PourButton.tsx`, `RightClickHint.tsx`, `HarvestCounter.tsx`, `KeyboardAssist.tsx`, `App.tsx` | Textes traduits, interface masquée en mode cinématique |

Captures dans `docs/retours-finaux/`.

## Révision 1 (2026-10-25) — mode cinématique et récap

| Retour | Ce qui a changé |
|---|---|
| Aucune action pendant le mode cinématique | Un voile invisible recouvre la scène : aucun clic, drag ou zoom ne l'atteint. Le canvas de R3F forçait `pointer-events: auto`, c'est pourquoi le premier réglage laissait passer les clics. Le clavier est aussi bloqué : seules C, Échap et M (son) restent actives. Les boutons du haut (quitter, langue, son) restent cliquables. |
| Mode cinématique après 20 s d'inactivité | Sans aucun geste pendant 20 s (souris, doigt, clavier, molette) pendant les actes, le mode se lance tout seul. Il ne démarre pas pendant un appui maintenu (bouton du temps, arrosoir tenu), ni sur l'intro ou l'écran de fin. Lancé ainsi, le moindre geste le quitte, et ce geste ne déclenche rien d'autre dans le jeu. Lancé à la main, il ne se quitte que par la croix, C ou Échap. |
| Mouvements linéaires | Les travellings ont une vitesse constante (plus d'accélération ni de ralenti), et la caméra colle au travelling sans lissage. |
| Images dans le récap | Chaque étape a son illustration (`08`, `09`) : 1. la palette et les typographies de la maquette ; 2. tes vraies textures peintes (arrosoir, pot, fruit, feuilles), en dépliage UV ; 3. les 9 phases du plan, cochées ; 4. un terminal avec les vrais chiffres de la phase 0 (12 objets, jardin.glb 9,5 Mo, plantes.glb 106 Ko, .blend non modifié) ; 5. ta vraie demande sur l'anse de l'arrosoir et la réponse de Claude ; 6. le site sur ordinateur et sur téléphone. |
| « Découvrir mon workflow » | Invite renommée (en anglais : « Discover my workflow »). |

**Images :** 6 JPEG dans `public/recap/` (133 Ko en tout), réduits depuis `3D Work/` et les captures des phases 7. Les sources n'ont pas été modifiées. Blender n'était pas ouvert : je n'ai donc pas pu faire de capture de ta scène, et l'étape « Blender MCP » est illustrée par le terminal plutôt que par une capture.

**Testé en dev :** lancement automatique après 20 s, sortie au clic sans action dans le jeu, mode lancé à la main qui ignore les clics sur la scène, sortie par Échap, récap avec ses images (FR). Build refait et servi sur 192.168.1.57:4173 (vérifié par requête).
