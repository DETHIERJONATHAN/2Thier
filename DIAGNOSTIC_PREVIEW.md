# 🔍 DIAGNOSTIC COMPLET - Prévisualisation Documents

## ✅ CHECKLIST DE VÉRIFICATION

### 1. Configuration des Champs (SectionConfigPanel.tsx)
- ✅ Champ `backgroundImage` existe (ligne 275)
- ✅ Champ `companyImage` existe (ligne 286)
- ✅ Champ `title.fr` avec boutons TBL/Cond./Style
- ✅ Champ `subtitle` avec boutons TBL/Cond./Style
- ✅ Switch `showDate` existe

### 2. Sauvegarde des Styles (handleSaveStyle)
**Ligne 176-183** :
```typescript
const handleSaveStyle = (style: FieldStyle) => {
  const currentValues = form.getFieldsValue();
  const fieldStyles = currentValues._fieldStyles || {};
  fieldStyles[currentStyleField] = style; // STOCKAGE: _fieldStyles['title.fr']
  const newValues = { ...currentValues, _fieldStyles: fieldStyles };
  form.setFieldsValue(newValues);
  handleValuesChange(null, newValues);
  message.success('Style appliqué');
};
```
✅ Les styles sont bien stockés dans `section.config._fieldStyles`

### 3. Lecture des Styles (getFieldStyle)
**Ligne 59-77** :
```typescript
const getFieldStyle = (section: any, fieldName: string) => {
  const customStyle = section.config?._fieldStyles?.[fieldName];
  if (!customStyle) return {};
  
  // Applique UNIQUEMENT les propriétés définies
  if (customStyle.color) style.color = customStyle.color; // ✅ COULEUR PERSONNALISÉE
  if (customStyle.fontSize) style.fontSize = `${customStyle.fontSize}px`;
  // etc...
  
  return style;
};
```
✅ Les styles personnalisés ÉCRASENT les valeurs par défaut

### 4. Application des Styles au Titre
**Ligne 120-132** :
```typescript
<h1 style={{ 
  fontSize: '56px', 
  fontWeight: 'bold',
  color: themeStyles.primaryColor, // DÉFAUT: bleu
  // ... autres styles ...
  ...getFieldStyle(section, 'title.fr') // ✅ ÉCRASE avec violet si défini
}}>
  {config.title?.fr || config.title || 'DEVIS'}
</h1>
```
✅ Le spread `...getFieldStyle()` ÉCRASE bien la couleur

### 5. Affichage du Logo
**Ligne 105-120** :
```typescript
{config.companyImage && (
  <div>
    <img 
      src={config.companyImage} // ✅ LIT BIEN LE CHAMP
      alt="Logo" 
      onError={(e) => {
        console.error('[PDFPreview] Erreur chargement logo:', config.companyImage);
        (e.target as HTMLImageElement).style.display = 'none';
      }}
      style={{ maxHeight: '100px', maxWidth: '250px', objectFit: 'contain' }}
    />
  </div>
)}
```
✅ Le logo s'affiche SI `config.companyImage` existe

### 6. Affichage du Fond
**Ligne 89-92** :
```typescript
<div style={{
  backgroundColor: config.backgroundImage ? 'transparent' : themeStyles.backgroundColor,
  backgroundImage: config.backgroundImage ? `url(${config.backgroundImage})` : 'none',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  // ...
}}>
```
✅ Le fond s'affiche SI `config.backgroundImage` existe

## 🐛 PROBLÈMES POTENTIELS

### Problème 1 : Le logo/fond ne s'affiche pas
**Causes possibles** :
1. L'URL de l'image est invalide
2. L'image est bloquée par CORS
3. Le champ n'est pas sauvegardé dans `section.config`
4. Le formulaire ne met pas à jour la config

**Solution de debug** :
```javascript
// Ouvrir la console (F12) et taper :
console.log(sections[0].config.companyImage); // Doit afficher l'URL
console.log(sections[0].config.backgroundImage); // Doit afficher l'URL
```

### Problème 2 : La couleur violette ne s'applique pas
**Causes possibles** :
1. Le style n'est pas sauvegardé dans `_fieldStyles`
2. Le nom du champ ne correspond pas (`title.fr` vs `title`)
3. La couleur n'est pas convertie correctement (doit être hex string)

**Solution de debug** :
```javascript
// Ouvrir la console (F12) et taper :
console.log(sections[0].config._fieldStyles); // Doit afficher { 'title.fr': { color: '#6b21a8' } }
```

### Problème 3 : Le sous-titre est invisible
**Cause** : `config.subtitle` est vide ou undefined

**Solution** :
Vérifier que le champ "Sous-titre" a bien été rempli dans le formulaire.

## 🔧 TESTS À EFFECTUER

### Test 1 : Logo
1. Aller dans l'éditeur de template
2. Ajouter une section "Page de couverture"
3. Remplir "Logo entreprise" avec : `https://via.placeholder.com/250x100`
4. Cliquer "Prévisualiser"
5. **RÉSULTAT ATTENDU** : Le logo apparaît en haut à gauche

### Test 2 : Fond
1. Dans la même section
2. Remplir "Image de fond" avec : `https://via.placeholder.com/1920x1080`
3. Cliquer "Prévisualiser"
4. **RÉSULTAT ATTENDU** : Le fond apparaît en plein écran

### Test 3 : Couleur du titre
1. Dans la même section
2. Cliquer sur le bouton "Style" à côté de "Titre (FR)"
3. Choisir "Couleur texte" → Violet (#6b21a8)
4. Cliquer "Appliquer"
5. Cliquer "Prévisualiser"
6. **RÉSULTAT ATTENDU** : Le titre est violet, pas bleu

### Test 4 : Sous-titre
1. Remplir "Sous-titre" avec : "Ma description personnalisée"
2. Cliquer "Prévisualiser"
3. **RÉSULTAT ATTENDU** : Le sous-titre apparaît sous le titre

## 📊 LOGS DE DEBUG

Les logs suivants devraient apparaître dans la console :

```
[PDFPreview] Rendering section 0 (COVER_PAGE): { title: {...}, subtitle: '...', companyImage: 'https://...', backgroundImage: 'https://...', _fieldStyles: {...} }
[PDFPreview] Section 0 - companyImage: https://via.placeholder.com/250x100
[PDFPreview] Section 0 - backgroundImage: https://via.placeholder.com/1920x1080
[PDFPreview] Section 0 - _fieldStyles: { 'title.fr': { color: '#6b21a8', fontSize: 56 } }
```

Si un log manque ou affiche `undefined`, c'est là qu'est le problème !

## ✅ RÉSOLUTION

**Si le problème persiste** :
1. Ouvrir la console (F12)
2. Aller dans l'onglet "Console"
3. Copier-coller TOUS les logs `[PDFPreview]`
4. Vérifier quelles valeurs sont `undefined` ou `null`
5. Remonter à la source : le champ est-il bien dans le formulaire ?
