# 🗂️ Documentation - Récupération des champs TBL

## Vue d'ensemble

Ce système te permet de récupérer **TOUS les champs** d'une soumission TBL (TreeBranchLeaf) de façon structurée et facile à utiliser.

## 📡 Endpoint API

### GET `/api/treebranchleaf/submissions/:id/fields`

Récupère tous les champs d'une soumission avec les données du lead associé.

**Paramètres:**
- `id` (path) - ID de la soumission

**Réponse:**
```json
{
  "submissionId": "cm123...",
  "treeId": "cmf1mwoz10005gooked1j6orn",
  "leadId": "abc123",
  "lead": {
    "id": "abc123",
    "firstName": "Jonathan",
    "lastName": "Dethier",
    "fullName": "Jonathan Dethier",
    "email": "dethier.jls@gmail.com",
    "phone": "0470295077",
    "street": "Rue de Floreffe",
    "streetNumber": "37",
    "postalCode": "5150",
    "city": "Floreffe",
    "company": "2Thier",
    "fullAddress": "Rue de Floreffe, 37, 5150, Floreffe"
  },
  "status": "completed",
  "createdAt": "2025-10-16T18:00:00.000Z",
  "updatedAt": "2025-10-16T18:00:00.000Z",
  "fields": {
    "Prénom": {
      "nodeId": "node_123",
      "label": "Prénom",
      "name": "firstName",
      "type": "leaf",
      "fieldType": "text",
      "value": "Jonathan",
      "rawValue": "Jonathan"
    },
    "Nom": {
      "nodeId": "node_124",
      "label": "Nom",
      "name": "lastName",
      "type": "leaf",
      "fieldType": "text",
      "value": "Dethier",
      "rawValue": "Dethier"
    },
    "Email": {
      "nodeId": "node_125",
      "label": "Email",
      "type": "leaf",
      "fieldType": "email",
      "value": "dethier.jls@gmail.com",
      "rawValue": "dethier.jls@gmail.com"
    },
    "Téléphone": {
      "nodeId": "node_126",
      "label": "Téléphone",
      "type": "leaf",
      "fieldType": "tel",
      "value": "0470295077",
      "rawValue": "0470295077"
    },
    "Rue": {
      "nodeId": "node_127",
      "label": "Rue",
      "type": "leaf",
      "value": "Rue de Floreffe",
      "rawValue": "Rue de Floreffe"
    },
    "Numéro": {
      "nodeId": "node_128",
      "label": "Numéro",
      "type": "leaf",
      "value": "37",
      "rawValue": "37"
    },
    "Code postal": {
      "nodeId": "node_129",
      "label": "Code postal",
      "type": "leaf",
      "value": "5150",
      "rawValue": "5150"
    },
    "Localité": {
      "nodeId": "node_130",
      "label": "Localité",
      "type": "leaf",
      "value": "Floreffe",
      "rawValue": "Floreffe"
    }
  },
  "totalFields": 8
}
```

## 🎣 Hook React

### `useSubmissionFields(submissionId)`

Hook React pour charger automatiquement les champs d'une soumission.

**Paramètres:**
- `submissionId` (string | null | undefined) - ID de la soumission à charger

**Retour:**
```typescript
{
  // Données complètes
  data: SubmissionFieldsResponse | null,
  
  // Raccourcis pratiques
  fields: Record<string, SubmissionField> | null,
  lead: SubmissionLead | null,
  submissionId: string,
  treeId: string,
  status: string,
  totalFields: number,
  
  // États
  loading: boolean,
  error: Error | null,
  
  // Helpers
  getField: (key: string) => SubmissionField | null,
  getFieldValue: (key: string) => any,
  hasField: (key: string) => boolean
}
```

## 💡 Cas d'usage

### 1. Afficher les données du lead

```tsx
import { useSubmissionFields } from '../hooks/useSubmissionFields';

function LeadCard({ submissionId }) {
  const { lead, loading } = useSubmissionFields(submissionId);
  
  if (loading) return <Spinner />;
  
  return (
    <div>
      <h2>{lead.fullName}</h2>
      <p>📧 {lead.email}</p>
      <p>📱 {lead.phone}</p>
      <p>🏠 {lead.fullAddress}</p>
    </div>
  );
}
```

### 2. Récupérer des champs spécifiques

```tsx
function ProjectDetails({ submissionId }) {
  const { fields, getFieldValue } = useSubmissionFields(submissionId);
  
  // Méthode 1 : Accès direct
  const prenom = fields?.['Prénom']?.value;
  const nom = fields?.['Nom']?.value;
  
  // Méthode 2 : Helper
  const email = getFieldValue('Email');
  const telephone = getFieldValue('Téléphone');
  
  return (
    <div>
      <p>Client : {prenom} {nom}</p>
      <p>Contact : {email} / {telephone}</p>
    </div>
  );
}
```

### 3. Générer un document (PDF, Email, etc.)

```tsx
async function generateDevis(submissionId: string) {
  const api = useAuthenticatedApi();
  const response = await api.get(`/api/treebranchleaf/submissions/${submissionId}/fields`);
  
  // Données du client
  const client = {
    nom: response.lead.fullName,
    email: response.lead.email,
    telephone: response.lead.phone,
    adresse: response.lead.fullAddress
  };
  
  // Données du projet
  const projet = {
    surface: response.fields['Surface habitable']?.value,
    typeToiture: response.fields['Type de toiture']?.value,
    orientation: response.fields['Orientation']?.value,
    puissanceSouhaitée: response.fields['Puissance souhaitée']?.value
  };
  
  // Générer le PDF
  await generatePDF({ client, projet });
  
  // Envoyer l'email
  await sendEmail({
    to: client.email,
    subject: 'Votre devis personnalisé',
    body: `Bonjour ${client.nom}, ...`,
    attachments: [pdfFile]
  });
}
```

### 4. Export Excel/CSV

```tsx
import * as XLSX from 'xlsx';

function exportToExcel(submissionId: string) {
  const { data } = useSubmissionFields(submissionId);
  
  if (!data) return;
  
  // Créer les lignes du fichier Excel
  const rows = [
    // Ligne d'en-tête
    ['Champ', 'Valeur'],
    
    // Données du lead
    ['Prénom Lead', data.lead?.firstName],
    ['Nom Lead', data.lead?.lastName],
    ['Email', data.lead?.email],
    ['Téléphone', data.lead?.phone],
    ['Adresse', data.lead?.fullAddress],
    
    // Tous les champs du formulaire
    ...Object.entries(data.fields).map(([key, field]) => [
      field.label || key,
      field.value
    ])
  ];
  
  // Créer le workbook Excel
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Données');
  
  // Télécharger
  XLSX.writeFile(wb, `soumission_${submissionId}.xlsx`);
}
```

### 5. Intégration avec d'autres systèmes

```tsx
async function syncToExternalCRM(submissionId: string) {
  const api = useAuthenticatedApi();
  const { lead, fields } = await api.get(`/api/treebranchleaf/submissions/${submissionId}/fields`);
  
  // Envoyer à Salesforce, HubSpot, etc.
  await externalAPI.createContact({
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    customFields: {
      surfaceHabitable: fields['Surface habitable']?.value,
      typeToiture: fields['Type de toiture']?.value,
      // ... tous les autres champs
    }
  });
}
```

### 6. Validation et contrôles

```tsx
function validateSubmission(submissionId: string) {
  const { fields, hasField } = useSubmissionFields(submissionId);
  
  // Vérifier les champs obligatoires
  const required = ['Prénom', 'Nom', 'Email', 'Téléphone'];
  const missing = required.filter(field => !hasField(field));
  
  if (missing.length > 0) {
    alert(`Champs manquants : ${missing.join(', ')}`);
    return false;
  }
  
  // Vérifier le format email
  const email = fields?.['Email']?.value;
  if (email && !email.includes('@')) {
    alert('Email invalide');
    return false;
  }
  
  return true;
}
```

### 7. Calculs et formules

```tsx
function calculatePrice(submissionId: string) {
  const { fields } = useSubmissionFields(submissionId);
  
  const surface = parseFloat(fields?.['Surface habitable']?.value || '0');
  const puissance = parseFloat(fields?.['Puissance souhaitée']?.value || '0');
  const orientation = fields?.['Orientation']?.value;
  
  // Calcul du prix
  let basePrice = surface * 150; // 150€/m²
  let panelPrice = puissance * 300; // 300€/kWc
  
  // Bonus orientation sud
  if (orientation === 'Sud') {
    panelPrice *= 0.95; // 5% de réduction
  }
  
  const totalPrice = basePrice + panelPrice;
  
  return {
    basePrice,
    panelPrice,
    totalPrice,
    savings: totalPrice * 0.05 // 5% d'économies estimées
  };
}
```

## 🔒 Sécurité

- ✅ Contrôle d'accès par organisation
- ✅ Authentification requise
- ✅ Super Admin peut accéder à toutes les soumissions
- ✅ Utilisateurs normaux : accès limité à leur organisation

## ⚡ Performance

- Requête optimisée avec `include` Prisma
- Champs triés par `createdAt`
- Données structurées en un seul appel API
- Pas de N+1 query

## 🎯 Points clés

1. **Un seul endpoint** suffit pour récupérer TOUTES les données
2. **Données du lead** incluses automatiquement
3. **Champs mappés** par nom/label pour accès facile
4. **Type-safe** avec TypeScript
5. **Hook React** prêt à l'emploi
6. **Exemples complets** fournis

## 📚 Fichiers importants

- **API Endpoint**: `src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts` (ligne ~5845)
- **Hook React**: `src/hooks/useSubmissionFields.ts`
- **Exemples**: `EXEMPLES-useSubmissionFields.tsx`
- **Documentation**: `DOCUMENTATION-TBL-FIELDS.md` (ce fichier)

## 🚀 Pour aller plus loin

Tu peux maintenant :
- ✅ Récupérer n'importe quel champ d'une soumission
- ✅ Générer des documents (PDF, DOCX)
- ✅ Envoyer des emails avec les données
- ✅ Exporter vers Excel/CSV
- ✅ Synchroniser avec des CRM externes
- ✅ Créer des rapports et statistiques
- ✅ Automatiser des workflows

**Besoin de quelque chose de plus spécifique ?** Dis-moi ce que tu veux faire ! 🎯
