#!/usr/bin/env node

/**
 * 🎯 CLARIFICATION: Bord haut et bord gauche de QUOI?
 * Explication ultra-claire avec exemples visuels
 */

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║     🎯 BORD HAUT ET BORD GAUCHE DE QUOI? EXPLICATION ULTRA-CLAIRE              ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

console.log(`
❓ QUESTION UTILISATEUR
════════════════════════════════════════════════════════════════════════════════

"Mais le bord haut de quoi et le bord gauche de quoi?"

RÉPONSE: C'est le bord haut et le bord gauche de L'IMAGE/PHOTO elle-même!


🖼️  DE L'IMAGE - EXPLICATION
════════════════════════════════════════════════════════════════════════════════

Quand je dis:
  ├─ "Bord haut" → Le haut de l'image/photo
  ├─ "Bord gauche" → Le gauche de l'image/photo
  ├─ "Bord bas" → Le bas de l'image/photo
  └─ "Bord droit" → Le droit de l'image/photo


VISUALISATION: Imagine une PHOTO imprimée
═════════════════════════════════════════════════════════════════════════════════

C'est une photo physique de 10cm de large et 8cm de haut.

                    BORD HAUT
                        ↓
        ┌───────────────────────────────┐
        │ (0,0)                         │  ← COIN HAUT-GAUCHE = (0, 0)
        │                               │
  BORD  │        UNE PHOTO              │  BORD
  GAUCHE│        IMPRIMÉE               │  DROIT
        │        10cm × 8cm             │
        │                               │
        │                               │
        │                               │ ← COIN BAS-DROIT = (10, 8)
        │                               │     (largeur, hauteur)
        └───────────────────────────────┘
                    ↑
                BORD BAS


L'ORIGINE (0,0) est ICI ↗️  au COIN HAUT-GAUCHE de la PHOTO


EXEMPLE RÉEL: Une photo de 1280×720 pixels
═════════════════════════════════════════════════════════════════════════════════

Tu prends une photo avec ton téléphone ou ta caméra.
Cette photo mesure: 1280 pixels de large × 720 pixels de haut.

C'est comme un rectangle:

    Bord haut = le haut de ta photo
    ↓
    ┌─────────────────────────────────────────────────────────────┐
    │ (0,0) ← COIN HAUT-GAUCHE de ta photo                        │
    │ Ta photo commence ici (en haut à gauche)                    │
    │                                                             │
    │ C'est à partir d'ICI que tu comptes X et Y                 │
    │                                                             │
    │                                                             │
    │ LARGEUR = 1280 pixels (de gauche à droite)                │
    │                                                             │
    │                                                             │
    │                                                             │
    │                                                             │
    │                                                             │
    │ HAUTEUR = 720 pixels (de haut en bas)                      │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
                                              (1280, 720)
                                              ↑
                                    COIN BAS-DROIT de ta photo
    ↑
    Bord gauche = le gauche de ta photo


SI TU VEUX TROUVER UN POINT DANS LA PHOTO:
═════════════════════════════════════════════════════════════════════════════════

Un point à (562, 228) dans une photo de 1280×720 signifie:

    "À partir du COIN HAUT-GAUCHE de ma photo (0,0):
     ├─ Je me déplace de 562 pixels vers la DROITE
     └─ Je me déplace de 228 pixels vers le BAS"

VISUALISATION:
──────────────────────────────────────────────────────────────────────────────

                    0         200        400        562        800      1280
                    │          │          │          │          │         │
      0  ┌──────────┼──────────┼──────────┼──────────┼──────────┼─────────┐
         │          │          │          │          │          │         │
         │          │          │          │          │          │         │
    100  │          │          │          │          │          │         │
         │          │          │          │          │          │         │
         │          │          │          │          │          │         │
    228  │          │          │          │●●●●●     │          │         │
         │          │          │          │●(562,228)│          │         │
         │          │          │          │●●●●●     │          │         │
         │                                           │                     │
         │                                           │                     │
    400  │                                           │                     │
         │                                           │                     │
         │                                           │                     │
    600  │                                           │                     │
         │                                           │                     │
    720  └───────────────────────────────────────────────────────────────┘
               ↑
         De ce coin (0,0)
         tu comptes:
         ├─ 562 vers la droite →
         └─ 228 vers le bas ↓


ANALOGIE: Trouver quelque chose dans une ville
═════════════════════════════════════════════════════════════════════════════════

C'est comme donner des directions dans une ville:

    "Pour trouver ma maison:
     ├─ Commence au COIN HAUT-GAUCHE de la ville (la gare)
     ├─ Avance de 500 mètres vers la DROITE (rue principale)
     └─ Puis 300 mètres vers le BAS (avenue de la paix)"

Position de ma maison: (500, 300) depuis le COIN HAUT-GAUCHE de la ville

Exactement la même chose pour une image!


CAS CONCRET: APRILTAG DANS UNE PHOTO
═════════════════════════════════════════════════════════════════════════════════

Tu prends une photo d'une porte avec un marqueur AprilTag.

La photo mesure 1280×720 pixels.

Tu détectes l'AprilTag aux coins:
  ├─ TL = (562, 228)
  ├─ TR = (927, 228)
  ├─ BR = (927, 565)
  └─ BL = (562, 565)

Cela signifie:

    TL (562, 228):
      ├─ 562 pixels depuis le BORD-GAUCHE de ta PHOTO
      └─ 228 pixels depuis le BORD-HAUT de ta PHOTO
    
    TR (927, 228):
      ├─ 927 pixels depuis le BORD-GAUCHE de ta PHOTO
      └─ 228 pixels depuis le BORD-HAUT de ta PHOTO
    
    BR (927, 565):
      ├─ 927 pixels depuis le BORD-GAUCHE de ta PHOTO
      └─ 565 pixels depuis le BORD-HAUT de ta PHOTO
    
    BL (562, 565):
      ├─ 562 pixels depuis le BORD-GAUCHE de ta PHOTO
      └─ 565 pixels depuis le BORD-HAUT de ta PHOTO


DESSIN DE LA PHOTO:
───────────────────────────────────────────────────────────────────────────

Photo 1280×720px

    (0,0) Coin haut-gauche
      │
      ├─ Bord haut (Y=0)
      │
      ┌──────────────────────────────────────────────────────────┐
      │ ◄── Bord gauche (X=0)                                    │
      │                                                          │
      │        ┌───────────────────────────────┐                │
      │        │ AprilTag                      │                │
      │        │ TL(562,228)      TR(927,228)  │                │
      │        │                               │                │
      │        │         562px       927px     │                │
      │        │         ├───────────────┤     │                │
      │        │                               │                │
      │        │                               │                │
      │        │                               │                │
      │        │ BL(562,565)      BR(927,565)  │                │
      │        └───────────────────────────────┘                │
      │                                                          │
      │                                 X = 1280px (bord droit) ─┤
      └──────────────────────────────────────────────────────────┘
                                    Y = 720px (bord bas)


RÉSUMÉ FINAL
════════════════════════════════════════════════════════════════════════════════

"Bord haut" = Le haut de la PHOTO/IMAGE (Y=0)
"Bord gauche" = Le gauche de la PHOTO/IMAGE (X=0)
"Bord droit" = Le droit de la PHOTO/IMAGE (X=largeur)
"Bord bas" = Le bas de la PHOTO/IMAGE (Y=hauteur)

Toutes les coordonnées (X, Y) se mesurent À PARTIR du COIN HAUT-GAUCHE de ta PHOTO.

Ceci s'applique à:
  ✅ Toutes les photos/images
  ✅ Toutes les images de caméra
  ✅ Tous les pixels dans le monde informatique
  ✅ OpenCV, AprilTag, détecteurs visuels, etc.

C'est UNIVERSEL! 🌍
`);

console.log(`
✅ Maintenant tu as la réponse complète!

   Bord haut et bord gauche de QUOI?
   → Réponse: De l'IMAGE/PHOTO elle-même! 📸
`);
