#!/usr/bin/env node

/**
 * 🎯 SYSTÈME DE COORDONNÉES: EXPLICATION COMPLÈTE
 * Où sont X et Y? Par rapport à quoi?
 */

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║              🎯 SYSTÈME DE COORDONNÉES PIXEL: EXPLICATION COMPLÈTE             ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

console.log(`
1️⃣  ORIGINE DU SYSTÈME DE COORDONNÉES
════════════════════════════════════════════════════════════════════════════════

L'ORIGINE (0, 0) est en HAUT-À-GAUCHE de l'image!

Pas au centre, pas en bas-à-gauche, mais en HAUT-À-GAUCHE.

Ceci est le standard pour TOUS les images numériques:
  ✅ Caméras digitales
  ✅ Moniteurs/écrans
  ✅ Canvas HTML5
  ✅ Toutes les photos/images


DIAGRAMME:
═════════════════════════════════════════════════════════════════════════

            X →
        ┌─────────────────────────────────────┐
        │ (0,0)                     (1280, 0) │
        │ ▲                                   │
        │ │    Image 1280×720px               │
        │ │                                   │
      Y │ │                                   │  
        │ │                                   │
        │ │                                   │
        │ │                                   │
        │ │                                   │
        │ ▼                                   │
        │ (0,720)                 (1280, 720)│
        └─────────────────────────────────────┘

X = Distance HORIZONTALE depuis le BORD-GAUCHE
Y = Distance VERTICALE depuis le BORD-HAUT

✅ TOUJOURS à partir du COIN HAUT-GAUCHE!
`);

console.log(`
2️⃣  EXEMPLE: MARQUEUR APRILTAG
════════════════════════════════════════════════════════════════════════════════

Marqueur détecté aux coordonnées:
  TL = (562, 228)
  TR = (927, 228)
  BR = (927, 565)
  BL = (562, 565)

Cela signifie:
  
  TL (562, 228):
    ├─ X = 562 pixels du BORD-GAUCHE vers la DROITE
    └─ Y = 228 pixels du BORD-HAUT vers le BAS
  
  TR (927, 228):
    ├─ X = 927 pixels du BORD-GAUCHE (plus à droite que TL)
    └─ Y = 228 pixels du BORD-HAUT (MÊME HAUTEUR que TL, donc même ligne)
  
  BR (927, 565):
    ├─ X = 927 pixels du BORD-GAUCHE (même que TR, aligné verticalement)
    └─ Y = 565 pixels du BORD-HAUT (plus BAS que TL/TR)
  
  BL (562, 565):
    ├─ X = 562 pixels du BORD-GAUCHE (même que TL, aligné verticalement)
    └─ Y = 565 pixels du BORD-HAUT (même que BR, même ligne)


VISUALISATION:
═════════════════════════════════════════════════════════════════════════════

(0,0)
  ┌─────────────────────────────────────────────────────────────┐
  │                                                             │
  │                                                             │
  │     ┌──────────────────────────────────────┐               │
  │     │  TL (562, 228)      TR (927, 228)   │               │
  │     │        ▲                     ▲       │               │
  │     │        │ Y = 228             │ Y = 228               │
  │     │        │                     │       │               │
  │     │        └─────────────────────┘       │               │
  │     │         X = 562         X = 927      │               │
  │     │                                      │               │
  │     │                                      │               │
  │     │        ┌─────────────────────┐       │               │
  │     │        │                     │       │               │
  │     │        │                     │       │               │
  │     │        │                     │       │               │
  │     │        │                     │       │               │
  │     │        └─────────────────────┘       │               │
  │     │                                      │               │
  │     │  BL (562, 565)      BR (927, 565)   │               │
  │     │        ▲                     ▲       │               │
  │     │        │ Y = 565             │ Y = 565               │
  │     │        │                     │       │               │
  │     └──────────────────────────────────────┘               │
  │       │                             │                       │
  │       └─────────────────────────────┘                       │
  │                                                             │
  │       562                           927                    │
  │       ↑                             ↑                       │
  │       X = distance du bord-gauche                           │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘
                                                        (1280, 720)
`);

console.log(`
3️⃣  AXES X ET Y: DIRECTION
════════════════════════════════════════════════════════════════════════════════

AXE X (Horizontal):
  ├─ Commence à 0 en HAUT-GAUCHE
  ├─ Augmente vers la DROITE →
  ├─ Maximum = largeur image (exemple: 1280)
  └─ X = 0 (bord gauche) ... X = 1280 (bord droit)

AXE Y (Vertical):
  ├─ Commence à 0 en HAUT-GAUCHE
  ├─ Augmente vers le BAS ↓
  ├─ Maximum = hauteur image (exemple: 720)
  └─ Y = 0 (bord haut) ... Y = 720 (bord bas)

⚠️  IMPORTANT: Y augmente vers le BAS, pas vers le HAUT!
   C'est différent du système mathématique classique (où Y augmente vers le haut).
   C'est le standard informatique/image.


CARTE MENTALE:
═════════════════════════════════════════════════════════════════════════════

    X augmente →→→ (vers la droite)
    
    ┌─────────────────────────┐
    │ (0,0)                   │ Y augmente
    │                         │ vers le bas
    │                         │ ↓
    │                         │
    │                         │
    └─────────────────────────┘
                         (1280, 720)
`);

console.log(`
4️⃣  CAS CONCRET: PORTE DE 80cm DE LARGE
════════════════════════════════════════════════════════════════════════════════

Une porte réelle:
  ├─ Largeur physique: 80cm
  └─ Hauteur physique: 190cm

Dans l'image (pixels):
  ├─ Coin haut-gauche: (100, 50)
  └─ Coin bas-droit: (1100, 650)

Cela signifie:
  
  Coin haut-gauche (100, 50):
    ├─ 100 pixels depuis le BORD-GAUCHE de l'image
    └─ 50 pixels depuis le BORD-HAUT de l'image
  
  Coin bas-droit (1100, 650):
    ├─ 1100 pixels depuis le BORD-GAUCHE de l'image
    └─ 650 pixels depuis le BORD-HAUT de l'image

  Largeur pixel:  1100 - 100 = 1000 pixels
  Hauteur pixel:  650 - 50 = 600 pixels

  
  Visualisation:
  ══════════════════════════════════════════════════════════════════════════════
  
         50px (du haut)
         ↑
         │
     ┌───┼──────────────────────────────────────────────┐
     │   │                                              │
     │   │  (100, 50)                    (1100, 50)    │
     │   ├──────────────────────────────────────┐      │
     │   │  TL (coin haut-gauche)              │TR     │
     │   │  X=100, Y=50                        │       │
     │   │                                     │       │
     │   │                                     │       │
  600│   │   PORTE (1000 pixels de large)      │       │
  px │   │                                     │       │
     │   │                                     │       │
     │   │                                     │       │
     │   │  BL                                 │BR     │
     │   │  (100, 650)                  (1100,650)    │
     │   └──────────────────────────────────────┘      │
     │                                                  │
     └──────────────────────────────────────────────────┘
     
     ← 100px → ← 1000 pixels → ← 180px →
       (du gauche)   (largeur)   (du droit)
               = 1280px total
`);

console.log(`
5️⃣  RÉSUMÉ: "PAR RAPPORT À QUOI?"
════════════════════════════════════════════════════════════════════════════════

X et Y sont TOUJOURS mesurés:

  ✅ À PARTIR DU COIN HAUT-GAUCHE (0, 0) de l'IMAGE

  X = pixels depuis le BORD-GAUCHE vers la DROITE
  Y = pixels depuis le BORD-HAUT vers le BAS

Ceci s'applique à:
  ✅ Toutes les images numériques
  ✅ Les photos de votre caméra
  ✅ Les écrans d'ordinateur
  ✅ Le canvas HTML5
  ✅ OpenCV
  ✅ Les détecteurs AprilTag
  ✅ Tous les systèmes informatiques modernes

C'est un STANDARD UNIVERSEL en informatique.


ANALOGIE RÉELLE:
═════════════════════════════════════════════════════════════════════════════

Imagine une photo imprimée sur un mur:

  ┌──────────────────────────────────┐
  │ (0,0) Coin supérieur-gauche      │
  │ 🔴 TU MESURES D'ICI               │
  │                                  │
  │                                  │
  │                                  │
  │                                  │
  └──────────────────────────────────┘

Pour trouver un objet dans la photo:
  1. Compte les cm depuis le COIN SUPÉRIEUR-GAUCHE → X
  2. Compte les cm depuis le COIN SUPÉRIEUR-GAUCHE vers le BAS → Y
  3. Résultat: (X, Y) = position de l'objet

Exemple:
  Une personne dans la photo est à:
    ├─ 50cm depuis le bord-gauche (X = 50)
    └─ 30cm depuis le bord-haut (Y = 30)
  
  Position: (50, 30)
`);

console.log(`
6️⃣  CAS SPÉCIAL: CONVERSION VERS POURCENTAGES
════════════════════════════════════════════════════════════════════════════════

L'API retourne aussi les coordonnées en POURCENTAGES:

  Pixel → Pourcentage:
    X_pourcent = (X_pixel / largeur_image) × 100
    Y_pourcent = (Y_pixel / hauteur_image) × 100

Exemple AprilTag:
  Image: 1280×720px
  TL en pixels: (562, 228)
  
  TL en pourcentages:
    X% = (562 / 1280) × 100 = 43.9%
    Y% = (228 / 720) × 100 = 31.7%
  
  TL = (43.9%, 31.7%)

C'est utile pour:
  ✅ Affichage sur un canvas responsive
  ✅ Compatible avec n'importe quelle taille d'image
  ✅ Indépendant de la résolution


VISUALISATION EN POURCENTAGES:
═════════════════════════════════════════════════════════════════════════════

    0%                50%               100% (1280px)
    │                 │                   │
    ├─────────────────┼───────────────────┤
    │ TL (43.9%, 31.7%)   (72.4%, 31.7%)  │
    │ ▲                              ▲    │
    │ │                              │    │
    │ │  Marqueur                     │    │
    │ │                              │    │
    │ │                              │    │
    │ ▼                              ▼    │
    │ BL (43.9%, 78.5%)   (72.4%, 78.5%)  │
    │                                     │
    ├─────────────────────────────────────┤ 100% (720px)
`);

console.log(`
✅ RÉSUMÉ FINAL
════════════════════════════════════════════════════════════════════════════════

❓ Les points sont en pixels: OUI ✅
❓ Ils sont placés par rapport à quoi: COIN HAUT-GAUCHE (0, 0) ✅
❓ X et Y donnés par rapport à quoi:
   ├─ X = distance depuis le BORD-GAUCHE (vers la DROITE)
   └─ Y = distance depuis le BORD-HAUT (vers le BAS)

✅ C'est le standard universel de tous les systèmes informatiques
✅ Valable pour les images, les écrans, les caméras, OpenCV, AprilTag, etc.
`);
