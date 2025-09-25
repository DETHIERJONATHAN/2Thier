# 🚀 DEVIS1MINUTE - Système d'accès aux organisations

## 📋 **Organisation du sidebar - SÉPARATION INTELLIGENTE**

### 🎯 **Logique d'organisation :**

**Section "Devis1Minute - Admin"** (Super Admin seulement)
- Pages de **gestion globale** de la plateforme
- Supervision de **tous les partenaires**
- Configuration **système-wide**

**Section "Devis1Minute"** (Organizations)  
- Pages d'**utilisation quotidienne** par les partenaires
- Fonctionnalités **métier** pour les organisations
- Accès selon les **modules activés**

---

## 🔐 **Système d'accès aux organisations**

### **Niveau 1 : Super Admin (👑)**
```typescript
// Accès COMPLET à tout
isSuperAdmin = true
// Voit TOUTES les organisations
// Peut gérer la plateforme globalement
```

**Pages accessibles :**
- ✅ **Marketplace Global** - Vue d'ensemble de tous les leads
- ✅ **Analytics Plateforme** - Métriques globales
- ✅ **Gestion Partenaires** - Administration des partenaires
- ✅ **PLUS** toutes les pages organisations

---

### **Niveau 2 : Admin Organisation (🏢)**
```typescript
// Accès limité à SON organisation
user.role = 'admin'
user.organizationId = 'org-xyz'
```

**Pages accessibles selon modules activés :**
- ✅ **Marketplace** - Acheter/vendre ses leads
- ✅ **Portail Partenaire** - Dashboard organisation
- ✅ **Mes Leads** - Leads achetés par l'organisation
- ✅ **Facturation** - Crédits et factures de l'organisation
- ✅ **Campagnes** - Créer des campagnes pub
- ✅ **Analytics** - Performances de l'organisation
- ✅ **Formulaires Publics** - Créer des formulaires de capture
- ✅ **Landing Pages** - Pages de destination

---

### **Niveau 3 : Utilisateur Standard (👤)**
```typescript
// PAS d'accès aux modules Devis1Minute
user.role = 'user'
```

**Pages accessibles :**
- ❌ **Aucune page Devis1Minute**

---

## ⚙️ **Configuration des accès - Comment faire ?**

### **1. Activation globale (Super Admin)**
```sql
-- Le Super Admin active le module dans la table Module
UPDATE "Module" SET active = true WHERE key = 'marketplace';
```

### **2. Activation par organisation (Super Admin)**
```javascript
// Via l'interface d'administration des modules
// /admin/modules → Activer pour l'organisation
```

### **3. Attribution des rôles (Admin Org)**
```javascript
// L'admin de l'organisation attribue les rôles à ses utilisateurs
// Seuls admin et super_admin voient les modules Devis1Minute
```

---

## 🏗️ **Architecture technique**

### **Sécurisation Backend**
```typescript
// Tous les routes Devis1Minute utilisent requireRole
router.use(requireRole(['admin', 'super_admin']));

// Filtrage par organisation
const organizationId = req.user?.organizationId;
if (!organizationId && !isSuperAdmin) {
  return res.status(403).json({ error: 'Accès refusé' });
}
```

### **Filtrage Frontend**
```typescript
// Dans Sidebar_new.tsx
const visibleDevis1minuteOrganizationPages = useMemo(() => 
  devis1minuteOrganizationPages.filter(page => 
    isSuperAdmin || hasFeature(page.feature)
  ), [devis1minuteOrganizationPages, isSuperAdmin, hasFeature]
);
```

---

## 🎯 **Cas d'usage typiques**

### **Partenaire Pro (Organisation)**
1. **Activé par Super Admin** → Module marketplace actif globalement
2. **Organisation inscrite** → Features attribuées à l'organisation  
3. **Utilisateur admin org** → Peut utiliser marketplace, facturation, etc.

### **Agence Marketing (Organisation)**
1. **Modules campagnes activés** → Peut créer des campagnes Google/Meta
2. **Analytics disponibles** → Suivi performances
3. **Landing pages activées** → Création de pages de destination

---

## 📊 **Monitoring et contrôle**

### **Super Admin peut surveiller :**
- **Toutes les organisations** et leur utilisation
- **Métriques globales** de la plateforme
- **Gestion des partenaires** et leurs performances
- **Configuration globale** des modules

### **Organisation peut gérer :**
- **Ses propres leads** et achats
- **Ses campagnes** et performances
- **Sa facturation** et crédits
- **Ses utilisateurs** (via admin org)

---

## ✅ **Avantages de cette architecture**

1. **🔒 Séparation claire** : Super Admin vs Organisations
2. **🎯 Accès granulaire** : Par feature et par rôle
3. **📈 Scalabilité** : Ajouter des organisations facilement
4. **🛡️ Sécurité** : Double vérification backend/frontend
5. **🔧 Flexibilité** : Modules activables à la demande

---

**🚀 La plateforme Devis1Minute est prête pour une adoption massive !**
