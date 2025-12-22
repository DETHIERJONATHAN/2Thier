# 🔍 DIAGNOSTIC - Variantes Visuelles et Images

## ✅ CORRECTIONS APPORTÉES

### 1. **Fonction getVariantStyles AJOUTÉE**
**Problème** : La fonction était appelée mais n'existait pas, causant une erreur silencieuse.  
**Solution** : Création de la fonction complète avec 6 variantes pour COVER_PAGE.

**Fichier** : `PDFPreview.tsx` lignes 82-219

**Variantes disponibles** :
1. **Modern** (par défaut) : Titre 56px bold, fond gris clair, date bleu/blanc
2. **Classic** : Titre 48px uppercase, espacement large, date avec bordure noire
3. **Minimal** : Titre 64px léger (300), fond blanc, date simple
4. **Bold** : Titre 72px ULTRA bold (900), fond noir, date jaune fluo
5. **Corporate** : Titre 52px, fond bleu marine (#001529), date bleu corporate
6. **Creative** : Titre 60px, fond dégradé violet, date glassmorphism

### 2. **Logs de Diagnostic AJOUTÉS**
**Fichier** : `PDFPreview.tsx` ligne 222-225

```typescript
console.log('[PDFPreview] Section X - styleVariant:', config.styleVariant);
console.log('[PDFPreview] Section X - Variant styles applied:', variantStyles);
```

### 3. **Style de Date CORRIGÉ**
**Problème** : La date utilisait un style fixe au lieu du style de variante.  
**Solution** : Remplacement par `variantStyles.dateStyle`.

**Fichier** : `PDFPreview.tsx` lignes 308-325

### 4. **Gestion d'Erreur Image AMÉLIORÉE**
**Fichier** : `PDFPreview.tsx` lignes 270-286

**Ajouts** :
- `onLoad` : Log de succès ✅
- `onError` : Message d'erreur VISIBLE dans la prévisualisation ⚠️
- Création dynamique d'un div rouge si le logo ne charge pas

## 🧪 TESTS À EFFECTUER

### Test 1 : Changement de Variante
1. Ouvrir l'éditeur de template
2. Ajouter une section "Page de couverture"
3. Sélectionner la variante "Bold" dans le dropdown
4. **Résultat attendu** :
   - Titre en MAJUSCULES, énorme (72px)
   - Fond noir
   - Date avec fond jaune et bordure noire
5. Changer pour "Minimal"
6. **Résultat attendu** :
   - Titre fin (font-weight 300), très grand (64px)
   - Fond blanc
   - Date grise simple avec ligne en bas

### Test 2 : Logo Entreprise
1. Dans les champs de configuration de COVER_PAGE
2. Chercher le champ "Logo entreprise"
3. Entrer une URL d'image valide (ex: `https://via.placeholder.com/200x80`)
4. **Résultat attendu** :
   - Logo apparaît immédiatement dans la prévisualisation
   - Console affiche : `✅ Logo chargé avec succès: https://...`
5. Tester avec URL invalide (ex: `https://invalid-url-xyz.com/logo.png`)
6. **Résultat attendu** :
   - Message rouge dans la prévisualisation : "⚠️ Erreur de chargement du logo"
   - Console affiche : `❌ Erreur chargement logo: https://...`

### Test 3 : Image de Fond
1. Chercher le champ "Image de fond"
2. Entrer une URL d'image (ex: `https://images.unsplash.com/photo-1557683316-973673baf926`)
3. **Résultat attendu** :
   - L'image apparaît en background
   - Le fond devient transparent pour laisser voir l'image
4. Vérifier dans la console :
   ```
   [PDFPreview] Section 0 - backgroundImage: https://images.unsplash.com/...
   ```

### Test 4 : Combinaison Variante + Style Personnalisé
1. Sélectionner variante "Corporate"
2. Cliquer sur le bouton "Style" à côté du champ "Titre (FR)"
3. Choisir couleur violette (#9c27b0)
4. **Résultat attendu** :
   - La variante Corporate s'applique (fond bleu marine)
   - MAIS le titre est violet (style personnalisé override)
   - Console affiche :
     ```
     [PDFPreview] Applying variant 'corporate' for section type 'COVER_PAGE'
     [PDFPreview] Section 0 - _fieldStyles: { "title.fr": { color: "#9c27b0" } }
     ```

## 🐛 PROBLÈMES POSSIBLES

### Problème A : "La variante ne change toujours rien"
**Causes possibles** :
1. Le formulaire ne propage pas `styleVariant` dans `section.config`
2. Cache du navigateur

**Solution** :
1. Ouvrir la console DevTools (F12)
2. Chercher les logs `[PDFPreview] Applying variant '...'`
3. Si absent → le formulaire ne sauvegarde pas le champ
4. Vérifier dans SectionConfigPanel.tsx ligne 249-262 (renderStyleVariantSelector)
5. Le `name="styleVariant"` doit être présent dans Form.Item

### Problème B : "Les images ne s'affichent pas"
**Causes possibles** :
1. URL invalide ou CORS bloqué
2. Champ vide ou non sauvegardé

**Solution** :
1. Vérifier la console : chercher `companyImage:` et `backgroundImage:`
2. Si vide → le formulaire ne sauvegarde pas les champs
3. Si URL présente mais pas d'image → problème de chargement
4. Chercher dans la console : `❌ Erreur chargement logo`
5. Tester avec une URL publique simple : `https://via.placeholder.com/200`

### Problème C : "Style personnalisé ne s'applique pas"
**Vérifications** :
1. Console : `[PDFPreview] Section X - _fieldStyles: {...}`
2. Si vide → le bouton Style ne sauvegarde pas
3. Vérifier SectionConfigPanel.tsx ligne 173-180 (handleSaveStyle)
4. Ordre d'application : Variante → Thème Global → Style Perso
   - Style Perso doit être le dernier (spread operator `...getFieldStyle()`)

## 📊 FLUX DE DONNÉES

```
User sélectionne variante "Bold"
         ↓
Form.Item name="styleVariant" capture la valeur
         ↓
onValuesChange déclenché (SectionConfigPanel.tsx:110)
         ↓
handleValuesChange met à jour section.config
         ↓
onUpdate(updatedSection) appelle DocumentTemplateEditor
         ↓
handleUpdateSection met à jour le state sections
         ↓
setSections(newSections) déclenche re-render
         ↓
PDFPreview reçoit nouveau prop sections
         ↓
renderSection lit config.styleVariant
         ↓
getVariantStyles('COVER_PAGE', 'bold') retourne styles
         ↓
Styles appliqués au JSX (fontSize, backgroundColor, etc.)
         ↓
Prévisualisation mise à jour ✅
```

## 🎯 CHECKLIST DE VÉRIFICATION

- [ ] Ouvrir la console (F12)
- [ ] Ajouter une section COVER_PAGE
- [ ] Vérifier log : `[PDFPreview] Rendering section 0 (COVER_PAGE)`
- [ ] Changer la variante → Vérifier log : `Applying variant '...'`
- [ ] Observer le changement visuel IMMÉDIAT
- [ ] Ajouter une URL de logo → Vérifier log : `✅ Logo chargé`
- [ ] Ajouter une URL de fond → Observer l'image en background
- [ ] Cliquer sur Style → Choisir une couleur → Observer l'override
- [ ] Sauvegarder le template → Recharger → Vérifier que tout est conservé

## 🔧 COMMANDES DE DEBUG

### Inspecter le state des sections
Ouvrir la console et taper :
```javascript
// Voir toutes les sections
console.log(document.querySelector('[data-sections]'));

// Forcer un re-render (si nécessaire)
window.location.reload();
```

### Tester une variante manuellement
Dans la console :
```javascript
const config = { styleVariant: 'bold' };
const variantStyles = getVariantStyles('COVER_PAGE', config.styleVariant);
console.log(variantStyles);
```

## ✨ RÉSUMÉ DES FICHIERS MODIFIÉS

1. **PDFPreview.tsx** (6 modifications)
   - Ajout getVariantStyles (138 lignes)
   - Logs de diagnostic (2 ajouts)
   - Application du style de date
   - Gestion d'erreur améliorée pour logo

2. **SectionConfigPanel.tsx** (déjà OK)
   - renderStyleVariantSelector existe
   - handleValuesChange propage les changements

3. **DocumentTemplateEditor.tsx** (déjà OK)
   - handleUpdateSection met à jour le state
   - Prévisualisation en direct activée

## 🚀 PROCHAINES ÉTAPES

Si tout fonctionne :
1. ✅ Tester toutes les 6 variantes
2. ✅ Tester avec images réelles
3. ✅ Tester combinaison variante + style perso
4. 🔜 Ajouter variantes pour les autres types de sections
5. 🔜 Créer des templates pré-configurés avec variantes

Si problèmes persistent :
1. Partager les logs de la console (screenshot)
2. Vérifier le Network tab pour les requêtes d'images
3. Tester avec l'inspecteur React DevTools
