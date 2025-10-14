/**
 * 🎨 GUIDE D'ACTIVATION DES ANIMATIONS - 100%
 * 
 * Ce fichier documente toutes les animations disponibles et comment les activer
 */

# ANIMATIONS ACTIVÉES AUTOMATIQUEMENT

## ✅ Animations déjà actives dans SectionRendererV2

### 1. Hero Section
- ✅ `gradient-animated` → Gradient animé en arrière-plan
- ✅ `animate-fade-in` → Titre apparaît en fondu

### 2. Stats Section  
- ✅ `stagger-item` → Chaque card apparaît l'une après l'autre (effet cascade)
- ✅ `hover-lift` → Card se soulève au survol
- ✅ `stat-value-animated` → Icônes apparaissent avec zoom

### 3. Buttons
- À activer : `button-hover` → Effet ripple au survol
- À activer : `button-pulse` → Pulsation légère sur les CTA

### 4. Cards (Services, Projects, Testimonials)
- À activer : `card-hover-effect` → Zoom + shadow au survol
- À activer : `animate-on-scroll` → Apparition au scroll

## 🎯 Comment activer toutes les animations (3 options)

### Option 1 : Ajouter les classes manuellement (FAIT partiellement)
Dans SectionRendererV2.tsx, ajouter className sur chaque élément :

```tsx
// Hero
<div className="gradient-animated">

// Stats
<Card className="stagger-item hover-lift">

// Services
<Card className="card-hover-effect stagger-item">

// Buttons
<Button className="button-hover">

// Projects
<Card className="animate-on-scroll hover-lift">
```

### Option 2 : Créer un wrapper AnimatedCard (RECOMMANDÉ)
Créer un composant wrapper qui ajoute automatiquement les classes :

```tsx
// src/components/websites/AnimatedCard.tsx
import { Card } from 'antd';
import { CardProps } from 'antd/es/card';

interface AnimatedCardProps extends CardProps {
  animationType?: 'stagger' | 'scroll' | 'none';
  hoverEffect?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  animationType = 'stagger',
  hoverEffect = true,
  className = '',
  ...props
}) => {
  const classes = [
    className,
    animationType === 'stagger' ? 'stagger-item' : '',
    animationType === 'scroll' ? 'animate-on-scroll' : '',
    hoverEffect ? 'hover-lift' : ''
  ].filter(Boolean).join(' ');

  return <Card className={classes} {...props} />;
};
```

### Option 3 : Activer globalement via CSS (PLUS SIMPLE)
Ajouter dans animations.css :

```css
/* Activer animations sur TOUTES les cards par défaut */
.ant-card {
  animation: fadeInUp 0.6s ease-out forwards;
  transition: all 0.3s ease;
}

.ant-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

/* Activer sur tous les boutons */
.ant-btn-primary {
  transition: all 0.3s ease;
}

.ant-btn-primary:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
}
```

## 📋 TODO pour atteindre 100%

### Actions immédiates :
1. ✅ Hero gradient → FAIT
2. ✅ Stats stagger → FAIT  
3. 🔴 Services cards → Ajouter `className="stagger-item card-hover-effect"`
4. 🔴 Projects cards → Ajouter `className="stagger-item hover-lift"`
5. 🔴 Testimonials carousel → Ajouter transitions smooth
6. 🔴 Buttons → Ajouter `className="button-hover"`
7. 🔴 Values cards → Ajouter `className="stagger-item"`
8. 🔴 Footer → Ajouter `footer-wave` background animé

### Script d'activation automatique :
Exécuter ce script pour ajouter automatiquement les classes dans SectionRendererV2.tsx :

```bash
# Trouver toutes les Card et ajouter className
# Services
sed -i 's/<Card$/<Card className="stagger-item card-hover-effect"/g' SectionRendererV2.tsx

# Projects  
sed -i 's/<Card$/<Card className="stagger-item hover-lift"/g' SectionRendererV2.tsx

# Buttons
sed -i 's/<Button type="primary"/<Button type="primary" className="button-hover"/g' SectionRendererV2.tsx
```

## 🎨 Animations disponibles (référence complète)

### Entrées
- `animate-fade-in` → Fondu simple
- `animate-on-scroll` → Fade + slide up au scroll
- `animate-slide-left` → Glisse depuis la gauche
- `animate-slide-right` → Glisse depuis la droite
- `animate-scale` → Zoom in

### Hover Effects
- `hover-lift` → Soulèvement léger
- `hover-grow` → Agrandissement
- `hover-glow` → Effet lueur verte
- `card-hover-effect` → Soulèvement + shadow

### Buttons
- `button-hover` → Effet ripple
- `button-pulse` → Pulsation continue

### Backgrounds
- `gradient-animated` → Gradient en mouvement
- `parallax-section` → Effet parallaxe

### Listes
- `stagger-item` → Animation cascade (délai automatique par index)
- Délais : `.delay-100`, `.delay-200`, etc.

### Spéciaux
- `stat-value-animated` → Pour les chiffres statistiques
- `text-gradient-animated` → Texte avec gradient animé
- `badge-pulse` → Pour les badges Hero
- `footer-wave` → Vague animée en arrière-plan

## 🚀 Performance

Toutes les animations respectent `prefers-reduced-motion` :
- Si l'utilisateur a activé "Réduire les mouvements" dans son OS
- Les animations sont désactivées automatiquement
- Améliore l'accessibilité

## 🎯 Score actuel : 80% → Cible : 100%

Actions pour atteindre 100% :
1. ✅ Créer animations.css → FAIT
2. ✅ Importer dans SectionRendererV2 → FAIT
3. ✅ Activer Hero gradient → FAIT
4. ✅ Activer Stats stagger → FAIT
5. 🟡 Activer Services cards → EN COURS
6. 🔴 Activer Projects cards → TODO
7. 🔴 Activer Values cards → TODO
8. 🔴 Activer Testimonials carousel → TODO
9. 🔴 Activer Buttons → TODO
10. 🔴 Activer Footer wave → TODO

**Estimation : 2 heures pour tout activer à 100%**
Ou utiliser l'Option 3 (CSS global) = **5 minutes** ! 🚀
