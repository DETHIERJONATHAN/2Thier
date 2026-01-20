# 📄 Génération des PDFs pour les formulaires publics

## Problème identifié

Lorsqu'un utilisateur remplit le formulaire public "Simulateur Aides Rénovation", **le PDF avec toutes ses réponses n'était pas généré correctement** pour les leads existants.

### Cause principale

Le code tentait de sauvegarder les PDFs dans `./uploads/form-responses`, mais le répertoire correct est `./public/uploads/form-responses` (statique servi par le frontend).

**Fichier concerné:** [src/routes/public-forms.ts](src/routes/public-forms.ts#L591-L595)

### Erreurs silencieuses

Le code avait une clause `try-catch` qui avalait les erreurs sans bloquer la soumission du formulaire :
```typescript
} catch (pdfError) {
  console.error('⚠️ [PublicForms] PDF generation failed (non-blocking):', pdfError);
  // Ne pas bloquer la soumission si le PDF échoue
}
```

Cela signifiait que :
- ✅ Le lead était créé correctement
- ❌ Mais le PDF n'était jamais généré
- ❌ Et le lien PDF n'était pas sauvegardé dans `lead.data.formPdfUrl`

---

## Solution implémentée

### 1. **Correction du chemin du répertoire**

✅ Modifié [src/routes/public-forms.ts](src/routes/public-forms.ts#L592)

```typescript
// ❌ AVANT - Mauvais chemin
const uploadsDir = path.join(process.cwd(), 'uploads', 'form-responses');

// ✅ APRÈS - Chemin correct
const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'form-responses');
```

### 2. **Création d'un script de régénération**

✅ Créé [scripts/regenerate-missing-pdfs.ts](scripts/regenerate-missing-pdfs.ts)

Ce script :
- Cherche tous les leads créés depuis un formulaire public qui n'ont pas de PDF
- Régénère le PDF pour chacun d'eux
- Sauvegarde le fichier dans le bon répertoire
- Met à jour `lead.data.formPdfUrl`

**Utilisation:**
```bash
npx tsx scripts/regenerate-missing-pdfs.ts
```

---

## Résultats

### Leads corrigés
- ✅ **Heloise Despontin** (LEAD-00004) - PDF généré le 2026-01-20
- ✅ **Autre utilisateur** (LEAD-00003) - PDF généré le 2026-01-20

### Fichiers créés
```
/workspaces/2Thier/public/uploads/form-responses/
├── formulaire-simulateur-aides-505c6bf7-1768657915200.pdf (2.2K)
└── formulaire-simulateur-aides-4304a5c4-1768600539344.pdf (2.2K)
```

---

## Structure du PDF généré

Le PDF récapitulatif contient :

1. **En-tête**
   - Nom du formulaire
   - Date et heure de soumission
   - Numéro de référence du lead

2. **Informations de contact**
   - Prénom, nom
   - Email, téléphone
   - Civilité

3. **Réponses au questionnaire**
   - Chaque question avec son icône
   - La réponse de l'utilisateur
   - Format lisible avec les labels des options sélectionnées

4. **Pied de page**
   - Crédit "Généré automatiquement par 2Thier CRM"
   - Date et formulaire

---

## Pour les nouveaux formulaires

À partir de maintenant, quand un utilisateur soumet le formulaire "Simulateur Aides Rénovation" :

1. ✅ Le lead est créé
2. ✅ Un PDF avec toutes les réponses est généré
3. ✅ Le PDF est stocké dans `/public/uploads/form-responses/`
4. ✅ Le lien est sauvegardé dans `lead.data.formPdfUrl`
5. ✅ Les commerciaux peuvent accéder au PDF depuis la page lead

---

## Accès aux PDFs

Les PDFs sont accessibles via :
- **URL publique:** `https://app.2thier.be/uploads/form-responses/formulaire-simulateur-aides-505c6bf7-1768657915200.pdf`
- **Stockage serveur:** `/workspaces/2Thier/public/uploads/form-responses/`
- **Champ lead:** `lead.data.formPdfUrl`

---

## Service de génération PDF

La génération du PDF utilise le service [src/services/formResponsePdfGenerator.ts](src/services/formResponsePdfGenerator.ts)

- Bibliothèque: `pdfkit`
- Format: PDF/A4
- Charset: UTF-8 complet (français, accents)
- Taille moyenne: ~2-3 KB par PDF

---

*Document créé le 20 janvier 2026 après correction des PDFs manquants.*
