# 🎨 Guide de Personnalisation des Sections

## ✨ Toutes les Options Disponibles

Votre éditeur de site web est maintenant **ULTRA MODULABLE** ! Chaque section (VALUES, SERVICES, etc.) peut être personnalisée dans les moindres détails.

---

## 📦 Section VALUES (Valeurs)

### 🎯 **Options Globales de Section**

#### **Couleurs & Espacement**
- **Couleur de fond** : Couleur de fond de toute la section (ex: `#f9fafb`)
- **Padding** : Espacement intérieur de la section (ex: `80px 24px`)

#### **Disposition des Cartes**
- **Largeur maximale** : Limite la largeur de chaque carte (ex: `300px`)
  - Utile pour avoir des cartes compactes et centrées
  - Laissez vide pour `100%` (pleine largeur)
- **Hauteur minimale** : Hauteur minimum de chaque carte (ex: `280px`)
  - Garantit que toutes les cartes ont la même hauteur
- **Espacement** : Distance entre les cartes (ex: `32px`)

#### **Alignement du Contenu**
- **⬅️ Gauche** : Icône, titre, description alignés à gauche
- **⬆️ Centré** : Icône, titre, description centrés (par défaut)
- **➡️ Droite** : Icône, titre, description alignés à droite

#### **Style des Cartes**
- **Bordure des cartes** : 
  - ✅ Avec bordure (par défaut)
  - ❌ Sans bordure (style flat)
- **Couleur de fond carte** : Couleur de fond de chaque carte (ex: `#ffffff`)
- **Rayon bordure** : Arrondi des coins (ex: `16px`)
- **Padding carte** : Espacement intérieur de chaque carte (ex: `32px`)
- **Ombre (box-shadow)** : Ombre portée (ex: `0 4px 12px rgba(0,0,0,0.1)`)

#### **Icônes (Options Globales)**
- **Taille icône** : Taille par défaut pour toutes les icônes (ex: `64px`)
- **Couleur icône par défaut** : Couleur par défaut pour toutes les icônes (ex: `#10b981`)

---

### 🎯 **Options Individuelles par Valeur**

Chaque valeur peut avoir ses propres paramètres qui **écrasent** les paramètres globaux :

#### **Icône**
- **Sélecteur visuel** : Cliquez et choisissez parmi 145+ icônes
- **Taille icône** (optionnel) : Taille spécifique pour cette valeur (ex: `72px`)
  - Si vide, utilise la taille globale
- **Couleur icône** (optionnel) : Couleur spécifique pour cette valeur
  - Si vide, utilise la couleur globale

#### **Contenu**
- **Titre** : Titre de la valeur (requis)
- **Description** : Description détaillée

---

## 🛠️ Section SERVICES

### 🎯 **Options Globales de Section**

#### **Couleurs & Espacement**
- **Couleur de fond** : Couleur de fond de toute la section
- **Padding** : Espacement intérieur de la section

#### **Disposition des Cartes**
- **Largeur maximale** : Limite la largeur de chaque carte service (ex: `350px`)
- **Hauteur** : Hauteur des cartes (ex: `100%` pour hauteur égale)
- **Espacement** : Distance entre les cartes (ex: `24px`)

#### **Alignement du Contenu**
- **⬅️ Gauche** : Icône, titre, description alignés à gauche (par défaut)
- **⬆️ Centré** : Icône, titre, description centrés
- **➡️ Droite** : Icône, titre, description alignés à droite

#### **Effet Visuel**
- **Effet hover** : 
  - ✅ Activé (carte se soulève au survol)
  - ❌ Désactivé

#### **Style des Cartes**
- **Rayon bordure** : Arrondi des coins (ex: `12px`)
- **Bordure** : Style de bordure (ex: `2px solid #e5e7eb`)
- **Ombre** : Ombre portée (ex: `0 2px 8px rgba(0,0,0,0.1)`)

#### **Icônes (Options Globales)**
- **Taille icône par défaut** : Taille pour tous les services (ex: `48px`)
- **Couleur icône par défaut** : Couleur pour tous les services (ex: `#10b981`)

---

### 🎯 **Options Individuelles par Service**

#### **Icône**
- **Sélecteur visuel** : Cliquez et choisissez l'icône
- **Taille icône** (optionnel) : Taille spécifique pour ce service (ex: `56px`)
- **Couleur icône** (optionnel) : Couleur spécifique pour ce service

#### **Contenu**
- **Titre** : Titre du service (requis)
- **Description** : Description détaillée
- **Caractéristiques** : Liste de points forts (tags)
- **Image** (optionnel) : Image illustrant le service
- **Bouton CTA** (optionnel) : Texte et lien du bouton

---

## 🎯 **Exemples de Configurations**

### **Style 1 : Cartes Compactes Centrées**
```
VALUES:
├─ cardStyle.maxWidth: 280px
├─ cardStyle.minHeight: 300px
├─ cardStyle.textAlign: center
├─ cardStyle.gap: 40px
├─ cardStyle.borderRadius: 20px
├─ cardStyle.boxShadow: 0 8px 24px rgba(0,0,0,0.12)
└─ cardStyle.iconSize: 72px

Résultat: Cartes élégantes, limitées à 280px de largeur, 
bien espacées avec de grandes icônes
```

### **Style 2 : Cartes Larges Sans Bordure**
```
VALUES:
├─ cardStyle.maxWidth: (vide = 100%)
├─ cardStyle.bordered: false
├─ cardStyle.textAlign: left
├─ cardStyle.gap: 24px
├─ cardStyle.backgroundColor: #f9fafb
├─ cardStyle.padding: 40px
└─ cardStyle.iconSize: 56px

Résultat: Cartes pleine largeur, style flat moderne, 
contenu aligné à gauche
```

### **Style 3 : Grille Compacte Colorée**
```
VALUES:
├─ cardStyle.maxWidth: 240px
├─ cardStyle.minHeight: 260px
├─ cardStyle.textAlign: center
├─ cardStyle.gap: 20px
├─ cardStyle.borderRadius: 16px
└─ Chaque valeur a sa propre couleur d'icône

Valeur 1: color=#10b981 (vert)
Valeur 2: color=#3b82f6 (bleu)
Valeur 3: color=#f59e0b (orange)
Valeur 4: color=#ec4899 (rose)

Résultat: Grille compacte avec des icônes de couleurs 
différentes pour chaque valeur
```

---

## 🎨 **Hiérarchie des Styles**

### **Principe de Cascade**
Les options **individuelles** écrasent les options **globales** :

```
Ordre de priorité (du plus fort au plus faible):

1. Options INDIVIDUELLES (value.iconSize, service.iconColor, etc.)
   ↓ écrase
2. Options GLOBALES (cardStyle.iconSize, cardStyle.iconColor, etc.)
   ↓ écrase
3. Valeurs PAR DÉFAUT du code (48px, #10b981, etc.)
```

### **Exemple Pratique**
```
Configuration:
- cardStyle.iconSize: 48px (global)
- cardStyle.iconColor: #10b981 (global)
- Valeur 1: iconSize vide, color vide → utilise 48px, #10b981
- Valeur 2: iconSize 64px, color vide → utilise 64px, #10b981
- Valeur 3: iconSize vide, color #3b82f6 → utilise 48px, #3b82f6
- Valeur 4: iconSize 72px, color #ec4899 → utilise 72px, #ec4899
```

---

## 💡 **Conseils d'Utilisation**

### ✅ **Bonnes Pratiques**

1. **Utilisez maxWidth pour le centrage**
   - Définissez `maxWidth: 300px` + `textAlign: center`
   - Les cartes seront limitées en largeur ET centrées

2. **Cohérence visuelle**
   - Utilisez les options **globales** pour un style uniforme
   - Utilisez les options **individuelles** seulement pour les exceptions

3. **Espacement cohérent**
   - `gap: 32px` pour un espacement aéré
   - `gap: 24px` pour un espacement standard
   - `gap: 16px` pour un espacement compact

4. **Icônes lisibles**
   - Minimum recommandé : `48px`
   - Idéal pour impact visuel : `64px`
   - Maximum conseillé : `80px`

5. **Hauteurs égales**
   - Définissez `minHeight` pour que toutes les cartes aient la même hauteur
   - Utile quand les descriptions ont des longueurs variables

### ❌ **À Éviter**

1. **Trop de variations**
   - Ne mettez pas une taille d'icône différente pour chaque valeur
   - Restez cohérent

2. **Cartes trop larges sans maxWidth**
   - Sans limite, les cartes peuvent être immenses sur grand écran
   - Utilisez `maxWidth` pour garder le contrôle

3. **Icônes trop petites**
   - En dessous de 40px, les icônes perdent leur impact visuel

4. **Trop d'ombre**
   - Une ombre légère suffit : `0 2px 8px rgba(0,0,0,0.08)`

---

## 🚀 **Workflow Recommandé**

### **Étape 1 : Configurez le Style Global**
1. Choisissez l'alignement (gauche/centre/droite)
2. Définissez la largeur max des cartes
3. Réglez l'espacement entre cartes
4. Configurez les couleurs et bordures
5. Définissez la taille d'icône par défaut

### **Étape 2 : Ajoutez Vos Valeurs/Services**
1. Sélectionnez les icônes visuellement
2. Remplissez les titres et descriptions
3. Laissez les options individuelles **vides** (utilise le global)

### **Étape 3 : Personnalisez les Exceptions**
1. Si UNE valeur doit avoir une icône plus grande → remplir `iconSize`
2. Si UNE valeur doit avoir une couleur différente → remplir `color`

### **Étape 4 : Testez et Ajustez**
1. Sauvegardez
2. Regardez le rendu
3. Ajustez les valeurs globales si besoin
4. Re-sauvegardez

---

## 📊 **Référence Rapide des Tailles**

### **Espacements Standard**
- **gap**: `16px` (compact) | `24px` (standard) | `32px` (aéré) | `48px` (large)
- **padding**: `80px 24px` (section) | `32px` (carte)
- **borderRadius**: `8px` (subtle) | `12px` (standard) | `16px` (arrondi) | `24px` (très arrondi)

### **Tailles d'Icônes**
- **Petite**: `40px` - `48px`
- **Moyenne**: `56px` - `64px`
- **Grande**: `72px` - `80px`

### **Largeurs de Cartes**
- **Compacte**: `240px` - `280px`
- **Standard**: `300px` - `350px`
- **Large**: `400px` - `500px`
- **Pleine largeur**: (laissez vide ou `100%`)

---

## 🎯 **Résultat Final**

Avec toutes ces options, vous pouvez créer :
- ✅ Des cartes compactes et centrées
- ✅ Des cartes larges pleine largeur
- ✅ Des grilles colorées avec icônes variées
- ✅ Des designs minimalistes sans bordure
- ✅ Des sections impactantes avec grandes icônes
- ✅ Et bien plus encore !

**Tout est modulable, tout est personnalisable ! 🚀**
