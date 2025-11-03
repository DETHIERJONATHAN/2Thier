# 🎯 Guide : Personnaliser les boutons Repeater

## ✅ PROBLÈME RÉSOLU

### ❌ Avant
- Le bouton affichait toujours "Ajouter une entrée"
- Impossible de le rendre plus petit
- Pas d'option pour afficher juste un "+"

### ✅ Maintenant
- Le bouton affiche automatiquement **"Ajouter [Nom du champ]"** (ex: "Ajouter Versant")
- 4 tailles disponibles : **Très petit**, **Petit**, **Moyen**, **Grand**
- Mode **icône seule** pour afficher juste un "+" compact

---

## 📍 Comment configurer le bouton ?

### Étape 1 : Sélectionner votre Repeater
1. Ouvrez votre arbre TreeBranchLeaf dans l'éditeur
2. Cliquez sur votre repeater (ex: "Versant", "Toiture", "Pignon")
3. Le panneau **Paramètres** s'ouvre à droite

### Étape 2 : Ouvrir la section Apparence
1. Dans le panneau Paramètres
2. Cliquez sur **📐 Apparence** pour l'ouvrir
3. Vous verrez maintenant **5 nouveaux paramètres** :

#### 📝 **Texte du bouton d'ajout (optionnel)**
- **Laissez vide** → Le bouton affichera "Ajouter [Nom du champ]"
  - Exemple : Si votre repeater s'appelle "Versant" → "Ajouter Versant"
- **Remplissez** → Le bouton affichera votre texte personnalisé
  - Exemple : "Ajouter un nouveau versant"

#### 📏 **Taille du bouton**
- **Très petit (icône)** ⭐ RECOMMANDÉ pour mode icône seule
  - Hauteur : 28-30px
  - Parfait pour un bouton "+" compact
- **Petit**
  - Hauteur : 32px
  - Texte : 13px
- **Moyen** (par défaut)
  - Hauteur : 40px
  - Texte : 14px
- **Grand**
  - Hauteur : 48px
  - Texte : 16px

#### 🎨 **Affichage**
- **Texte + icône** (par défaut)
  - Affiche le libellé complet avec l'icône "+"
  - Exemple : "➕ Ajouter Versant"
  
- **Icône seule (+)** ⭐ NOUVEAU !
  - Affiche UNIQUEMENT l'icône "+"
  - Bouton carré compact (28x28px, 32x32px, etc.)
  - Parfait si vous voulez un bouton discret

#### 📐 **Largeur du bouton**
- **Automatique (responsive)** (par défaut)
  - Mobile : pleine largeur
  - Tablette : 1/2 largeur
  - Desktop : 1/3 largeur
  - Grand écran : 1/4 largeur
  
- **Moitié de la largeur**
  - Toujours 50% sur tous les écrans
  
- **Pleine largeur**
  - Toujours 100% sur tous les écrans

---

## 🎯 Exemples de configuration

### Configuration 1 : Bouton très petit avec icône seule (RECOMMANDÉ)
```
Taille du bouton : Très petit (icône)
Affichage : Icône seule (+)
Largeur : Automatique
Texte du bouton : [vide]
```
**Résultat** : Un petit bouton "+" de 28x28px qui affiche "Ajouter Versant" au survol

### Configuration 2 : Bouton compact avec texte
```
Taille du bouton : Petit
Affichage : Texte + icône
Largeur : Automatique
Texte du bouton : [vide]
```
**Résultat** : "➕ Ajouter Versant" en petit (32px)

### Configuration 3 : Bouton personnalisé
```
Taille du bouton : Moyen
Affichage : Texte + icône
Largeur : Pleine largeur
Texte du bouton : Ajouter un nouveau versant
```
**Résultat** : "➕ Ajouter un nouveau versant" sur toute la largeur

### Configuration 4 : Bouton minimal (le plus petit possible)
```
Taille du bouton : Très petit (icône)
Affichage : Icône seule (+)
Largeur : Automatique
```
**Résultat** : Juste un petit "+" de 28x28px

---

## 🔧 Modifications techniques effectuées

### Base de données
✅ Nouvelle colonne : `repeater_iconOnly` (Boolean, défaut: false)
✅ Nouvelle colonne : `repeater_buttonSize` (String, défaut: "middle")
✅ Nouvelle colonne : `repeater_buttonWidth` (String, défaut: "auto")
✅ Suppression de la valeur par défaut "Ajouter une entrée"

### Backend
✅ Sauvegarde automatique des paramètres
✅ Lecture depuis la base de données
✅ Support des valeurs par défaut intelligentes

### Frontend
✅ Interface de configuration dans Paramètres > Apparence
✅ Rendu dynamique selon les paramètres
✅ Mode icon-only avec taille adaptative
✅ Utilisation automatique du nom du champ

---

## 🚀 Pour tester immédiatement

1. **Rechargez votre page** (Ctrl+R ou F5)
2. Sélectionnez un repeater existant
3. Allez dans **Paramètres > Apparence**
4. Changez **"Taille du bouton"** à **"Très petit (icône)"**
5. Changez **"Affichage"** à **"Icône seule (+)"**
6. Cliquez ailleurs pour sauvegarder
7. Regardez votre formulaire → vous devriez voir un petit "+" ! 🎉

---

## 🐛 Dépannage

### Le bouton affiche toujours "Ajouter une entrée"
**Solution** : Le nom du champ n'est pas défini. Vérifiez :
1. Le champ repeater a bien un **Label** défini (ex: "Versant")
2. Rechargez la page pour forcer le rechargement des métadonnées

### Je ne vois pas les nouvelles options
**Solution** : 
1. Vérifiez que vous êtes bien sur un nœud de type **leaf_repeater**
2. Rechargez complètement la page (Ctrl+Shift+R)
3. Si ça ne marche toujours pas, vérifiez la console (F12) pour voir les erreurs

### Le bouton est trop petit / trop grand
**Solution** : Changez la **"Taille du bouton"** dans Paramètres > Apparence

---

## 📊 Valeurs par défaut

Si vous ne configurez rien, voici ce qui s'affiche :
- **Libellé** : "Ajouter [Nom du champ]" (ex: "Ajouter Versant")
- **Taille** : Moyen (40px)
- **Affichage** : Texte + icône
- **Largeur** : Automatique (responsive)

---

**Date de mise à jour** : 21 octobre 2025
**Version** : 2.0 - Support icon-only et taille tiny
