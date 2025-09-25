# DIAGNOSTIC - Vérifiez ceci dans pgAdmin

## 1. VÉRIFIER SI L'UTILISATEUR EXISTE :
```sql
SELECT id, email, "firstName", "lastName", role, status 
FROM "User" 
WHERE email = 'dethier.jls@gmail.com';
```

## 2. VÉRIFIER LES MODULES :
```sql
SELECT id, key, label, "organizationId" 
FROM "Module";
```

## 3. VÉRIFIER L'ORGANISATION :
```sql
SELECT id, name, status 
FROM "Organization";
```

---

## SI L'UTILISATEUR N'EXISTE PAS, REFAITES JUSTE CETTE PARTIE :

```sql
-- Créer votre utilisateur
INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", role, status, address, "phoneNumber", "createdAt", "updatedAt") 
VALUES ('c8eba369-99f4-4c1a-9d71-85e582787590', 'dethier.jls@gmail.com', '$2b$10$GVoVAPfEIsg7bvuCts/svOSBAtg99nMha5.PsGuABxq2oKDvxRc5y', 'Jonathan', 'Dethier', 'super_admin', 'active', 'Rue de floreffe 37, 5150 Franiere (Floreffe)', '0470/29.50.77', NOW(), NOW());
```

---

## OU ESSAYEZ DE CRÉER UN NOUVEL UTILISATEUR :

```sql
-- Utilisateur de test avec mot de passe simple
INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", role, status, "createdAt", "updatedAt") 
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'admin@test.com', 
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password = "password"
  'Admin', 
  'Test', 
  'super_admin', 
  'active', 
  NOW(), 
  NOW()
);
```

**Puis essayez de vous connecter avec :**
- Email : `admin@test.com`
- Mot de passe : `password`

---

**EXÉCUTEZ D'ABORD LA VÉRIFICATION ET DITES-MOI CE QUE VOUS VOYEZ !**
