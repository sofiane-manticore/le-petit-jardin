# Phase 0 — Inventaire, export et vérification des assets 3D

Projet « Le petit jardin » (R3F) · 2026-10-25

Fichier source : `3D Work/Jardiniere_Test.blend` (Blender 5.2.3 LTS, exporteur Khronos glTF Blender I/O v5.2.41)

> **Le fichier Blender est resté en lecture seule.** Aucune modification, aucun renommage, aucun transform appliqué et aucune sauvegarde. `bpy.data.is_dirty` valait `False` avant et après les exports. Seule la sélection a été changée le temps de l'export (`use_selection`), puis restaurée à l'identique, objet actif compris. Les ajustements qui me semblent utiles sont listés en §5 : ce sont des propositions, rien n'a été appliqué.

---

## 1. Inventaire (0.1)

### 1.1 Scène

| Paramètre | Valeur |
|---|---|
| Unités | Métrique, scale_length = 1 (1 BU = 1 m) |
| Moteur | EEVEE |
| FPS / plage | 30 fps, frames 1–250 (aucune animation) |
| Collections | `Scene Collection` → `Collection` (Camera, Sun) et `Meshes` (12 objets) |
| Geometry Nodes | Aucun node group dans le fichier |
| Actions / shape keys / contraintes | Aucune |
| Parentage | Aucun : tous les objets sont à la racine |

**Tous les objets sont empilés à l'origine (0,0,0).** Ce sont des assets « bibliothèque », pas une scène composée. La mise en place (pots alignés, tiges plantées dans la terre, feuilles et fruits accrochés aux tiges) se fera dans le code R3F.

### 1.2 Objets

Légende : **Transf. appliqués** = loc 0, rot 0, scale 1, c'est-à-dire matrice monde identité. Les vertices sont ceux du mesh Blender. Dimensions en mètres (X × Y × Z, Blender Z-up).

| Objet | Type | Data | Collection | Location | Rotation | Scale | Transf. appliqués | Vertices / faces | Dimensions | Origine | Modifiers | Matériaux |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Sol** | MESH | `Plane` | Meshes | 0,0,0 | 0,0,0 | 1 | ✅ | 4 v / 1 f | 1.753 × 1.753 × 0 | Centre du plan | — | `Sol` |
| **Pot** (pot + terre) | MESH | `Aset_misc__S_ucdlbh2iw_LOD2` | Meshes | 0,0,0 | 0,0,0 | 1 | ✅ | 1 611 v / 2 986 f | 0.260 × 0.099 × 0.064 | Centre, au ras du fond (z min ≈ 0) | — | `PotDeFleur` (2 798 f), `Terre` (188 f) |
| **Graine** | MESH | `Sphere.001` | Meshes | 0,0,0 | 0,0,0 | 1 | ✅ | 85 v / 147 f | 0.013 × 0.029 × 0.013 | Centre de la graine | — | `Graine` |
| **Arrosoir** | MESH | `Cylinder` | Meshes | 0,0,0 | 0,0,0 | 1 | ✅ | 2 921 v / 2 910 f | 0.087 × 0.262 × 0.205 | Au sol, sous le corps (bec vers −Y) | `WeightedNormal` | `Arrosoir` |
| **Fruit** | MESH | `Sphere.002` | Meshes | 0,0,0 | 0,0,0 | 1 | ✅ | 218 v / 322 f (2 n-gones) | 0.034 × 0.035 × 0.064 | **Au sommet** (point d'attache, le fruit pend vers −Z) | — | `Fruit` |
| **Goute_d_eau** | MESH | `Sphere` | Meshes | 0,0,0 | 0,0,0 | 1 | ✅ | 24 v / 43 f | 0.011 × 0.011 × 0.025 | Dans le bas de la goutte | — | `Goutte` |
| **Feuille_1** | MESH | `Plane.001` | Meshes | 0,0,0 | 0,0,0 | **0.37654** | ❌ (scale) | 34 v / 28 f | 0.019 × 0.025 × 0.005 | **À la base de la feuille** (pétiole), feuille vers −Y | — | `Feuille` |
| **Feuille_2** | MESH | `Plane.002` | Meshes | 0,0,0 | 0,0,0 | **0.37654** | ❌ (scale) | 34 v / 28 f | 0.020 × 0.021 × 0.005 | Idem | — | `Feuille` |
| **Feuille_3** | MESH | `Plane.003` | Meshes | 0,0,0 | 0,0,0 | **0.27059** | ❌ (scale) | 34 v / 28 f | 0.013 × 0.013 × 0.010 | Idem | — | `Feuille` |
| **Curve_TigePlante_1** | CURVE | `BézierCurve` | Meshes | 0,0,0 | 0,0,0 | 1 | ✅ | 4 splines, 21 pts de contrôle (208 v évalués) | 0.154 × 0.074 × 0.174 | Pied de la tige (spline 1, point 0 = origine) | — | aucun |
| **Curve_TigePlante_2** | CURVE | `BézierCurve.001` | Meshes | 0,0,0 | 0,0,0 | 1 | ✅ | 3 splines, 22 pts (231 v évalués) | 0.134 × 0.051 × 0.199 | Idem | — | aucun |
| **Curve_TigePlante_3** | CURVE | `BézierCurve.002` | Meshes | 0,0,0 | 0,0,0 | 1 | ✅ | 3 splines, 16 pts (159 v évalués) | 0.099 × 0.054 × 0.266 | Idem | — | aucun |
| Camera | CAMERA | `Camera` | Collection | 4.94, 8.82, 5.24 | 63.6°, 0°, 150.7° | 1 | — | — | — | — | — | — (non exportée) |
| Sun | LIGHT | `Sun` | Collection | 0, 0, 0.636 | 54.3°, 3.3°, 212.5° | 1 | — | — | — | — | — | — (non exportée) |

Autres attributs mesh :
- **Pot** : 2 UV maps. `uv` est l'UV active et de rendu, c'est celle que les textures utilisent. `UVMap` n'est pas utilisée. Le mesh porte des custom normals (`custom_normal`) et un `material_index`.
- **Arrosoir** : attribut `sharp_edge`, normales retravaillées par `WeightedNormal`.
- **Feuilles et Fruit** : `sharp_face` (shading flat sur une partie des faces), ce qui duplique des vertices à l'export.
- Aucun objet caché, aucun objet désactivé au rendu. Aucune data partagée entre objets (users = 1).

### 1.3 Curves (tiges)

Les trois tiges ont le même réglage :

| Paramètre | Valeur |
|---|---|
| Type de spline | **Bézier** (handles `ALIGNED`, sauf un point `FREE` sur Tige_3 spline 1 point 5) |
| Dimensions | 3D, twist `MINIMUM` |
| Résolution | `resolution_u` = 12 (render = 0, donc identique) |
| **Bevel** | `bevel_mode` ROUND, **`bevel_depth` = 0**, `bevel_resolution` 4, ni bevel object ni taper, extrude 0 → **aucune épaisseur, les tiges sont de simples lignes** |
| Rayon / tilt des points | 1.0 / 0 partout |
| Cyclique | Non |

Chaque objet tige contient une **tige principale**, toujours la spline 0, qui part de l'origine, et des **rameaux** qui démarrent le long de la tige principale :

| Objet | Spline | Points de contrôle | Points évalués (= (n−1)×12+1) |
|---|---|---|---|
| Tige_1 | 0 (principale) | 6 | 61 |
|  | 1, 2, 3 (rameaux) | 5, 5, 5 | 49, 49, 49 |
| Tige_2 | 0 (principale) | 11 | 121 |
|  | 1, 2 (rameaux) | 6, 5 | 61, 49 |
| Tige_3 | 0 (principale) | 8 | 85 |
|  | 1, 2 (rameaux) | 4, 4 | 37, 37 |

Les coordonnées des points de contrôle (co, handles) ont été relevées pendant l'inventaire. Elles peuvent servir à recréer des `CubicBezierCurve3` côté three si on veut une courbe paramétrique exacte plutôt que la polyligne exportée.

### 1.4 Matériaux

Tous les matériaux suivent le même schéma : `Image Texture (Color)` → `Principled BSDF.Base Color` → `Material Output`. Il n'y a pas de normal map ni de roughness map. Metallic = 0, roughness = 0.5 (0.553 pour `PotDeFleur`), backface culling désactivé, blend method `HASHED` / render method `DITHERED`.

| Matériau | Utilisé par | Texture (chemin) | Résolution | Canal alpha |
|---|---|---|---|---|
| `Sol` | Sol | `//Sol_base_texture.png` → Base Color | 2048² | **Oui** : `//Sol_alpha_texture.png` (image séparée, 1024², niveaux de gris, colorspace **sRGB**) **Color → Alpha** |
| `PotDeFleur` | Pot (slot 0) | `//Pot_Base_Texture.png` | 1024² | Non (spec 0.4 → `KHR_materials_specular` à l'export) |
| `Terre` | Pot (slot 1) | `//Terre_Base_Texture.png` (image nommée `Terre_BaseColor`) | 1024² | Non |
| `Graine` | Graine | `//Graine_base_texture.png` | 1024² | Non |
| `Arrosoir` | Arrosoir | `//Arrosoir_Base_Texture.png` | 2048² | Non |
| `Fruit` | Fruit | `//Fruit_base_texture.png` | 512² | Non |
| `Goutte` | Goute_d_eau | `//Goutte_base_texture.png` | 64² | Non |
| `Feuille` | Feuille_1/2/3 | `//Feuille_Base_Texture.png` | 256² | Non (la feuille est un mesh découpé, pas une découpe alpha) |

Toutes les textures sont externes, avec des chemins relatifs à `3D Work/`, et aucune ne manque.

**Détail du sol** (`Sol_alpha_texture`) : R = G = B, de 0 à 0.992, moyenne 0.551, et son propre canal A est à 1. Le masque n'atteint **jamais 1.0**, donc aucun pixel du sol n'est totalement opaque.

### 1.5 Contenu parasite du .blend

Le .blend pèse **652 Mo** alors que la géométrie fait quelques milliers de vertices. Ce poids vient de **100 textures de brush packées** (`Sampled Brush N.TEXTURE`, PNG RGBA 32 bits d'environ 4 300 à 7 000 px, de 2 à 15 Mo chacune), liées à 100 brushes et 100 textures. Elles ne servent à aucun matériau et **ne sont pas exportées**.

### 1.6 Écarts avec ce qui était attendu

| Attendu | Constaté dans le .blend |
|---|---|
| « pots » (plusieurs) | **1 seul objet `Pot`** → il faudra l'instancier côté R3F. |
| « terre » | **Pas d'objet séparé.** C'est le slot matériau `Terre` du mesh `Pot` (188 faces). À l'export, elle devient une primitive distincte : on peut l'adresser séparément dans three. |
| « graines (1 mesh = 1 graine) » | **1 seul mesh `Graine`**, donc 1 graine. À instancier côté R3F. |
| « fruits » | **1 seul `Fruit`** |
| — | Un objet **`Goute_d_eau`** existe, nommé avec cette orthographe (« Goute »). Je l'ai inclus dans `jardin.glb` parce qu'il sert à l'arrosage. |

---

## 2. Exports (0.3 et 0.4)

Les deux fichiers ont été exportés par script (`bpy.ops.export_scene.gltf`) dans `WEB/public/models/`. Le .blend n'a pas été sauvegardé.

Options communes : `GLB`, `use_selection`, `export_yup=True` (+Y vers le haut), `export_apply=True` (modifiers appliqués **à l'export seulement**), `export_image_format='AUTO'` (PNG d'origine embarqués), `export_materials='EXPORT'`, normales et UV, sans caméra, lumière ni animation.

| Fichier | Objets | Option spécifique | Taille |
|---|---|---|---|
| `jardin.glb` | Sol, Pot (+ Terre), Graine, Arrosoir, Fruit, Goute_d_eau | — | **9.55 Mo** (10 011 640 o) |
| `plantes.glb` | Curve_TigePlante_1/2/3, Feuille_1/2/3 | `use_mesh_edges=True` (Loose Edges) | **106 Ko** (108 520 o) |

L'exporteur a converti les curves en mesh **à la volée** (mesh évalué temporaire), sans toucher à la scène. Tous les éléments ont pu être exportés, aucun n'a été écarté.

Un seul avertissement de l'exporteur : *« More than one shader node tex image used for a texture »* sur le Sol. Il est normal : l'exporteur **fusionne** `Sol_base_texture` (RGB) et `Sol_alpha_texture` (dans A) en une seule image RGBA `Sol_base_texture-Sol_alpha_texture`. Le sampler est celui de la première image, et les deux sont en Linear/Repeat, donc il n'y a aucun impact.

---

## 3. Vérification (0.5)

J'ai installé three@0.180.0 dans un dossier temporaire hors du projet (scratchpad de session) et chargé les deux fichiers avec `GLTFLoader.parse()` sous Node 22. Le DOM est simulé pour décoder les PNG, ce qui permet de lire leurs dimensions et leurs pixels alpha.

### 3.1 `jardin.glb` — 9 777 Ko

```
Group "Scene"
  Mesh "Arrosoir"
  Mesh "Fruit"
  Mesh "Goute_d_eau"
  Mesh "Graine"
  Group "Pot"
    Mesh "Aset_misc__S_ucdlbh2iw_LOD2"    ← matériau PotDeFleur
    Mesh "Aset_misc__S_ucdlbh2iw_LOD2_1"  ← matériau Terre
  Mesh "Sol"
```
Tous les nœuds sont en pos 0, rot 0, scale 1.

| Nœud | Type three | Vertices (après split) | Index | Attributs | BBox Y-up (min → max) |
|---|---|---|---|---|---|
| Arrosoir | Mesh | 4 493 | 17 448 | position, normal, uv | (−0.044, 0, −0.088) → (0.044, 0.205, 0.175) |
| Fruit | Mesh | 437 | 1 284 | position, normal, uv | (−0.019, −0.064, −0.022) → (0.015, 0.000, 0.014) |
| Goute_d_eau | Mesh | 47 | 132 | position, normal, uv | (−0.006, −0.006, −0.006) → (0.006, 0.020, 0.005) |
| Graine | Mesh | 135 | 498 | position, normal, uv | (−0.005, −0.007, −0.014) → (0.008, 0.006, 0.015) |
| Pot / PotDeFleur | Mesh | 1 732 | 8 394 | position, normal, uv, **uv1** | (−0.130, 0, −0.050) → (0.130, 0.065, 0.050) |
| Pot / Terre | Mesh | 210 | 1 128 | position, normal, uv, **uv1** | (−0.122, 0.049, −0.045) → (0.122, 0.059, 0.044) |
| Sol | Mesh | 4 | 6 | position, normal, uv | (−0.876, 0, −0.876) → (0.876, 0, 0.876) |

La conversion Z-up → Y-up est correcte. Le sol est à y = 0, le pot et l'arrosoir reposent dessus, et la surface de terre est à y ≈ 0.049–0.059 (bord du pot à 0.065). C'est là que se plantent graines et tiges.

| Matériau | Type three | Texture | PNG | Alpha | Transparence three |
|---|---|---|---|---|---|
| Arrosoir | MeshStandardMaterial | 2048², 2.8 Mo | RGB | Non | opaque |
| Fruit | MeshStandardMaterial | 512², 246 Ko | RGB | Non | opaque |
| Goutte | MeshStandardMaterial | 64², 4 Ko | RGB | Non | opaque |
| Graine | MeshStandardMaterial | 1024², 705 Ko | RGB | Non | opaque |
| PotDeFleur | **MeshPhysicalMaterial** (KHR_materials_specular) | 1024², 641 Ko | RGB | Non | opaque |
| Terre | MeshStandardMaterial | 1024², 396 Ko | RGB | Non | opaque |
| **Sol** | MeshStandardMaterial | 2048², **4.9 Mo** | **RGBA** | **Oui**, min 0, max 253, moyenne 140.5 ; 5.3 % des pixels à 0, **0 % à 255** | `alphaMode: BLEND` → `transparent: true`, `depthWrite: false` |

Tous les matériaux sont `doubleSided`. Les textures sont en sRGB, avec `flipY: false` (convention glTF), utilisent l'UV channel 0, et sont en mode Repeat.

### 3.2 `plantes.glb` — 106 Ko

```
Group "Scene"
  LineSegments "Curve_TigePlante_1"
  LineSegments "Curve_TigePlante_2"
  LineSegments "Curve_TigePlante_3"
  Mesh "Feuille_1"   scale 0.3765
  Mesh "Feuille_2"   scale 0.3765
  Mesh "Feuille_3"   scale 0.2706
```

**Tiges.** Ce sont des `LineSegments` (primitive glTF `mode 1` = LINES), avec l'attribut `position` seul et un `LineBasicMaterial` blanc par défaut (pas de matériau Blender).

| Tige | Vertices | Segments | Chaînes reconstruites | Points par chaîne | Départ chaîne 0 |
|---|---|---|---|---|---|
| Tige_1 | 208 | 204 | 4 | 61 · 49 · 49 · 49 | (0,0,0) |
| Tige_2 | 231 | 228 | 3 | 121 · 61 · 49 | (0,0,0) |
| Tige_3 | 159 | 156 | 3 | 85 · 37 · 37 | (0,0,0) |

**Peut-on reconstruire une courbe à partir de l'ordre des points ? Oui, sans ambiguïté.**
- Tous les segments sont de la forme (i, i+1). L'ordre des vertices dans le buffer suit le sens de la spline, sans doublon ni réindexation (vertices uniques = vertices totaux).
- Un saut d'index (i+1 ≠ début du segment suivant) marque le passage à la spline suivante. On retrouve exactement le découpage Blender : la chaîne 0 est la tige principale, qui part du pied (0,0,0) et monte vers +Y, et les chaînes suivantes sont les rameaux, dans l'ordre des splines.
- Le nombre de points de chaque chaîne vaut (points de contrôle − 1) × 12 + 1, ce qui confirme qu'aucun point n'a été perdu.
- Côté code, on parcourt `index` deux par deux et on coupe la chaîne à chaque rupture. On obtient alors des tableaux de `Vector3` à passer à `CatmullRomCurve3` / `TubeGeometry`, ou à animer avec un `drawRange` pour faire « pousser » la tige.

**Feuilles.** Ce sont des `Mesh` de 104 vertices chacun : 34 dans Blender, dupliqués par le shading flat et les seams UV. Matériau `Feuille`, MeshStandardMaterial, texture 256² RGB sans alpha, double face. Le scale non appliqué est conservé sur le nœud. En Y-up, la feuille part de l'origine (son pétiole) et s'étend vers **+Z**.

---

## 4. Problèmes identifiés

| # | Gravité | Problème | Conséquence |
|---|---|---|---|
| P1 | 🟠 | **Sol en `alphaMode: BLEND`** (Blender `HASHED`/`DITHERED`) | Dans three, `transparent: true` et `depthWrite: false` : risque de tri incorrect avec d'autres objets transparents, et ombres non reçues correctement. |
| P2 | 🟠 | **Le masque alpha du sol n'atteint jamais 1** (max 253/255) | Même le centre du sol est légèrement transparent : le fond de page transparaît à environ 1 %. |
| P3 | 🟠 | **`Sol_alpha_texture` en colorspace sRGB** branchée sur Alpha | Blender linéarise le gris avant de l'utiliser comme alpha, alors que l'export glTF copie les valeurs brutes dans A. **Le bord du sol est donc plus opaque dans three que dans le viewport Blender** : par exemple un gris 0.5 donne un alpha d'environ 0.21 dans Blender et de 0.5 dans three. |
| P4 | 🟡 | `jardin.glb` pèse **9.5 Mo**, dont 4.9 Mo pour le sol (RGBA 2048²) et 2.8 Mo pour l'arrosoir (2048²) | Chargement lent sur mobile pour un one-page. |
| P5 | 🟡 | **Pot : UV map `UVMap` inutilisée**, exportée en `TEXCOORD_1` (`uv1`) | Poids inutile (environ 15 Ko). Pas d'erreur. |
| P6 | 🟡 | **Feuilles : scale non appliqué** (0.377 / 0.271) | Sans conséquence pour le rendu, puisque le scale est porté par le nœud. Mais si on clone `geometry` seule (instancing), la feuille sera 2,7 à 3,7× trop grande. Il faut utiliser le nœud, ou multiplier par `node.scale`. |
| P7 | 🟡 | **Tiges sans épaisseur ni matériau** (`bevel_depth = 0`) | Elles s'affichent en lignes de 1 px blanches. C'est voulu ici : la géométrie (tube) et la couleur seront générées en R3F à partir des points. |
| P8 | ℹ️ | Tous les assets sont empilés à l'origine, et les feuilles et le fruit ne sont pas positionnés sur les tiges | La composition (positions des pots, des tiges dans la terre, des feuilles le long des rameaux) est à faire dans le code. Les origines sont bien placées pour cela : pied de tige, pétiole de feuille, attache du fruit. |
| P9 | ℹ️ | 1 seul pot, 1 seule graine, 1 seul fruit | Il faudra les instancier (`<Clone>` / `<Instances>` de drei). |
| P10 | ℹ️ | Nom `Goute_d_eau` (« Goute » avec un seul t) | À garder tel quel côté code (`nodes.Goute_d_eau`), sauf si Sofiane le renomme. |
| P11 | ℹ️ | 100 textures de brush packées dans le .blend (environ 650 Mo) | Pas d'impact sur l'export. Le .blend est simplement très lourd. |
| P12 | ℹ️ | Fruit : 2 n-gones | Triangulés automatiquement à l'export, sans problème. |
| P13 | ℹ️ | Les meshes glTF du pot gardent le nom de la data FBX (`Aset_misc__S_ucdlbh2iw_LOD2`, `…_1`) | Côté code, il faut passer par le groupe `Pot` et filtrer par nom de matériau (`PotDeFleur` / `Terre`). |

Aucun bloquant : tous les éléments demandés ont été exportés sans modifier la scène.

---

## 5. Ajustements proposés (non appliqués)

### À faire dans Blender, par Sofiane, au choix

1. **Passer `Sol_alpha_texture` en colorspace `Non-Color`** (P3). C'est la convention pour un masque, et Blender et le web afficheront alors le même alpha. *Justification :* l'export glTF n'applique pas la linéarisation sRGB au canal alpha, donc aujourd'hui le rendu Blender ne correspond pas au rendu web.
2. **Corriger le masque alpha du sol pour que l'intérieur soit à 255 (blanc pur)** (P2), ou ajouter un `Math > Greater Than` sur l'alpha pour obtenir un détourage net. *Justification :* un sol opaque au centre et fondu seulement sur les bords évite le léger voile transparent. Avec un seuil, l'exporteur produit `alphaMode: MASK`, ce qui est plus simple à gérer dans three (pas de tri, `depthWrite` actif).
3. **Supprimer l'UV map `UVMap` inutilisée du Pot** (P5). *Justification :* elle alourdit le fichier pour rien. Il faut d'abord confirmer qu'elle ne sert à rien d'autre, par exemple à un bake.
4. *(Optionnel)* **Appliquer le scale des feuilles** (P6). *Justification :* cela simplifie l'instanciation des géométries dans R3F. Ce n'est pas nécessaire si on travaille à partir des nœuds.
5. *(Optionnel)* **Purger les 100 brushes et textures packées** (P11), si elles ne servent plus. *Justification :* le .blend passerait de 650 Mo à quelques Mo. Ça ne change rien au site.

### Côté export ou code, sans toucher au .blend

6. **Réduire le poids de `jardin.glb`** (P4) : réexporter avec `export_image_format='WEBP'`, ou passer le GLB dans `gltf-transform` (resize 1024 + WebP/KTX2). On peut viser environ 1 à 2 Mo. *Justification :* le temps de chargement d'un one-page. Ça peut se faire en phase suivante sans modifier la scène. J'ai gardé les PNG d'origine dans cette phase pour rester fidèle aux sources.
7. **Matériau du sol côté R3F** : si (2) n'est pas fait, forcer `material.alphaTest = 0.5` et `depthWrite = true` (ou `transparent` + `renderOrder` négatif). *Justification :* cela évite les artefacts de tri (P1).
8. **Tiges** : reconstruire les polylignes à partir des index (méthode en §3.2), puis générer un `TubeGeometry` animé (GSAP sur `drawRange` ou sur un rayon de tube). Les rameaux démarrent sur la tige principale : on peut les faire apparaître en différé.

---

## 5 bis. Modifications validées (2026-10-25)

Sofiane a validé les points 1 et 3 du §5, et **refusé le point 2** : le masque alpha du sol n'a pas été touché. Je n'ai rien modifié d'autre.

| # | Modification | Contrôle préalable | État |
|---|---|---|---|
| 0 | Sauvegarde du fichier d'origine : `3D Work/Jardiniere_Test_backup_avant_phase0.blend` (copie de fichier, 652 264 661 octets, en-tête zstd identique à l'original) | Le fichier sur disque n'avait pas encore été sauvegardé avec les modifications, donc la copie correspond bien à l'état d'avant | ✅ |
| 1 | `Sol_alpha_texture` : colorspace `sRGB` → **`Non-Color`** | — | ✅ |
| 2 | Pot : suppression de l'UV map **`UVMap`** | Aucun node `UV Map` ni `Normal Map` ne la référence, le Pot n'a aucun modifier, et le bake (cible `IMAGE_TEXTURES`) utilise l'UV active. `uv` reste la seule UV, active et de rendu | ✅ |
| 3 | Sauvegarde du .blend (`save_mainfile`, même chemin, `compress=False`, sans repack) | — | ✅ |
| 4 | Réexport de `jardin.glb` avec les mêmes options | — | ✅ |

**Effets de la sauvegarde à connaître :**
- **Le .blend passe de 652 Mo à 762 Mo.** L'original était compressé (zstd). La sauvegarde a été faite sans compression, comme demandé. Le contenu est le même, à ces deux modifications près. Pour retrouver la taille d'origine, il suffit de réenregistrer avec *Compress* coché.
- Blender a fait tourner sa sauvegarde automatique : `Jardiniere_Test.blend1` contient maintenant la version d'avant les modifications, identique à la copie de sauvegarde. L'ancien `.blend1`, d'environ 2 h plus tôt, a été remplacé.

**Vérification three du nouveau `jardin.glb`** (9 995 804 octets, soit −15,8 Ko) :
- Pot (PotDeFleur et Terre) : attributs `position, normal, uv`. **`uv1` a disparu.**
- Alpha du sol **inchangé** : min 0, max 253, moyenne 140.5, image RGBA de 4 889 953 octets, identique au premier export. L'exporteur copiait déjà les valeurs brutes du masque. **Seul le rendu Blender change** : le viewport affiche maintenant le même alpha que le web, et le problème P3 est résolu.
- Le reste du fichier est identique (mêmes nœuds, mêmes vertices, mêmes matériaux). `plantes.glb` n'est pas concerné et n'a pas été réexporté.

Les problèmes P2 (masque < 255) et P1 (`alphaMode: BLEND`) restent ouverts. Ils seront traités côté R3F (§5, point 7).

---

## 5 ter. Compression WebP (2026-10-25)

Sofiane a validé la compression WebP des textures. Le .blend n'a pas été touché : tout s'est fait hors de Blender, sur le GLB.

**Source conservée.** Le GLB PNG (export Blender après les modifications validées) a été déplacé vers `WEB/assets-source/jardin.png.glb`, hors de `public/`, pour ne pas être servi par le site.

**Outil.** La commande `gltf-transform webp` (CLI 4.2.1) a planté : deux versions de `sharp`/libvips étaient chargées en même temps (erreur `colourspace: parameter space not set`). J'ai donc écrit un script équivalent avec `@gltf-transform/core` et `extensions`, plus `sharp` 0.34.5 (libwebp 1.6.0), installés dans un dossier temporaire hors du projet. Paramètres WebP : `quality: 90`, `alphaQuality: 100`, `effort: 6`, `smartSubsample`. L'extension `EXT_texture_webp` est déclarée *required*, sans fallback PNG. Pas de Draco ni de meshopt.

**Résolution.** **Aucun redimensionnement.** La cible de 1 à 2 Mo est atteinte en pleine résolution, donc toutes les textures gardent leur taille d'origine.

| Texture | Résolution | PNG | WebP q90 | Ratio | Écart moyen R/G/B (/255) | PSNR RGB | Écart max (1 pixel) |
|---|---|---|---|---|---|---|---|
| Sol (base + alpha fusionnés) | 2048² RGBA | 4 889 953 o | 1 003 686 o | ×4.9 | 0.72 / 0.52 / 0.61 · **alpha 0** | 48.8 dB | 23 |
| Arrosoir | 2048² | 2 821 279 o | 177 738 o | ×15.9 | 0.65 / 0.65 / 0.76 | 45.2 dB | 100 |
| Graine | 1024² | 705 252 o | 39 220 o | ×18.0 | 0.85 / 0.49 / 0.59 | 45.1 dB | 44 |
| Pot | 1024² | 641 345 o | 46 078 o | ×13.9 | 0.82 / 0.60 / 0.70 | 43.9 dB | 46 |
| Terre | 1024² | 396 164 o | 18 792 o | ×21.1 | 0.37 / 0.27 / 0.33 | 49.6 dB | 23 |
| Fruit | 512² | 245 737 o | 41 314 o | ×5.9 | 1.44 / 1.05 / 1.66 | 39.4 dB | 41 |
| Goutte | 64² | 4 284 o | 1 546 o | ×2.8 | 1.89 / 1.71 / 2.40 | 37.7 dB | 29 |

Méthode de comparaison : chaque PNG d'origine et le WebP décodé sont comparés pixel par pixel, en moyenne de l'écart absolu par canal et en PSNR.
- Un écart moyen inférieur à 2/255 et un PSNR supérieur à 37 dB sont invisibles à l'œil sur des textures peintes.
- Les écarts max isolés viennent du sous-échantillonnage de la chroma de WebP sur des contours colorés très nets. Sur l'arrosoir, ils restent ponctuels : PSNR global de 45 dB.
- Le fruit et la goutte ont les PSNR les plus bas, mais restent excellents. Leurs textures sont petites, donc chaque pixel pèse plus dans la moyenne.

**Résultat :**

| Fichier | Avant | Après |
|---|---|---|
| `public/models/jardin.glb` | 9 995 804 o (9.5 Mo) | **1 619 792 o (1.54 Mo)**, soit −84 % |

**Vérification three** (GLTFLoader, les WebP sont décodés) :
- Hiérarchie, noms de nœuds, noms de matériaux, vertices, index et attributs : **identiques** à la source PNG, comparés automatiquement.
- Les 7 textures sont en `image/webp`, se décodent, ont les mêmes résolutions et restent en sRGB. `PotDeFleur` reste en MeshPhysicalMaterial (specular).
- **Alpha du sol présent et exact** : min 0, max 253, moyenne 140.5, 5.3 % de pixels transparents. Valeurs identiques à la source, puisque l'alpha est compressé sans perte (`alphaQuality 100`). Le matériau reste `transparent: true`.
- Compatibilité : WebP est supporté par tous les navigateurs actuels (Safari ≥ 14). Comme l'extension est *required*, un viewer glTF sans support WebP refusera le fichier. Ce n'est pas un problème pour three/R3F.

**`plantes.glb` laissé tel quel.** La seule texture est celle de la feuille (256², 83 Ko). En WebP, le fichier passerait de 106 à 35 Ko, soit −71 Ko. C'est négligeable face aux 1.5 Mo de `jardin.glb`, et ça ne justifie pas d'ajouter une extension *required* à ce fichier.

---

## 6. Fichiers produits

- `WEB/public/models/jardin.glb` — 1 619 792 octets (textures WebP, voir §5 ter)
- `WEB/assets-source/jardin.png.glb` — 9 995 804 octets (source PNG, non servie)
- `WEB/public/models/plantes.glb` — 108 520 octets
- `WEB/docs/phase0-inventaire.md` — ce rapport

Le script de vérification (`check.mjs`) et l'installation temporaire de three sont dans le scratchpad de session, hors du projet.
