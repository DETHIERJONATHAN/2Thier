# 🎯 Guide Rapide: Où lier un site à un domaine Cloud Run

## 📍 Accès direct

### Étape 1: Ouvrir la page de gestion
1. **Connectez-vous** au CRM
2. Dans le menu latéral, cliquez sur **"Admin"**
3. Cliquez sur **"Gestion des Sites Web"**

### Étape 2a: Pour un NOUVEAU site
1. Cliquez sur le bouton **"➕ Nouveau site"** (en haut à droite)
2. Remplissez les informations de base :
   - **Nom du site** : Ex: "2Thier Energy"
   - **Type de site** : Choisissez "Site Vitrine"
   - **Slug** : Ex: "2thier"
3. **Descendez** jusqu'à voir la section **"☁️ Mapping Cloud Run"**
4. Cliquez sur le **sélecteur de domaine**
5. Choisissez parmi :
   - `2thier.be`
   - `devis1minute.be`
6. Cliquez sur **"Vérifier"** (bouton bleu avec icône ✓)
7. Cliquez sur **"➕ Créer le site"**

### Étape 2b: Pour un site EXISTANT
1. Dans la liste des sites, trouvez votre site
2. Cliquez sur **"Éditer"** (à droite de la ligne du site)
3. Le builder s'ouvre avec plusieurs onglets en haut :
   - Builder
   - Aperçu
   - Thème
   - SEO
   - **⚙️ Paramètres** ← C'EST ICI !
4. Cliquez sur l'onglet **"⚙️ Paramètres"**
5. Vous verrez la section **"Configuration du domaine Cloud Run"**
6. Utilisez le sélecteur pour choisir votre domaine
7. Cliquez sur **"Vérifier"** pour tester
8. Cliquez sur **"Sauvegarder"** (bouton en haut à droite de la carte)

## 🎯 Capture d'écran visuelle

```
┌─────────────────────────────────────────────────────────────┐
│  CRM 2Thier                                                  │
├─────────────────────────────────────────────────────────────┤
│  Menu:                                                       │
│  📊 Dashboard                                                │
│  👥 Contacts                                                 │
│  📋 Leads                                                    │
│  ⚡ Devis                                                    │
│  ───────────────────────────                                │
│  🔧 Admin ◄── CLIQUEZ ICI                                   │
│    ├─ Utilisateurs                                          │
│    ├─ Organisations                                         │
│    └─ 🌐 Gestion des Sites Web ◄── PUIS ICI                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🌐 Gestion des Sites Web                                   │
│  ┌────────────────────────────┐                             │
│  │ [➕ Nouveau site]          │ ◄── POUR UN NOUVEAU SITE    │
│  └────────────────────────────┘                             │
│                                                              │
│  Liste des sites:                                            │
│  ┌───────────────────────────────────────────────────┐      │
│  │ 2Thier Energy  │ vitrine │ /2thier  │ [Éditer] │ ◄─ OU ICI│
│  │ Devis1Minute   │ landing │ /devis   │ [Éditer]  │       │
│  └───────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ✏️ Éditer le site: 2Thier Energy                          │
│  ┌─────────────────────────────────────────────────┐        │
│  │ [Builder] [Aperçu] [Thème] [SEO] [⚙️ Paramètres] │ ◄─ ICI│
│  └─────────────────────────────────────────────────┘        │
│                                                              │
│  ⚙️ Paramètres du site              [Sauvegarder] ◄── ET ICI│
│  ┌───────────────────────────────────────────────┐          │
│  │ ☁️ Configuration du domaine Cloud Run         │          │
│  │                                                │          │
│  │ Domaine Cloud Run:                             │          │
│  │ ┌────────────────────────────────┐             │          │
│  │ │ [Sélectionner un domaine ▼]   │ [🔄] [✓]   │ ◄── ICI  │
│  │ └────────────────────────────────┘             │          │
│  │                                                │          │
│  │ Options disponibles:                           │          │
│  │ • 2thier.be                                    │          │
│  │ • devis1minute.be                              │          │
│  └───────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## ✅ Résultat attendu

Après avoir lié le site au domaine:
- Le site sera accessible via `https://2thier.be` (ou le domaine choisi)
- Les informations du mapping seront sauvegardées dans la base de données
- Vous pourrez vérifier que le domaine est bien accessible

## 🚀 Raccourcis

- **URL directe** : `http://localhost:5173/admin/websites`
- **Après connexion** : Menu Admin → Gestion des Sites Web
- **Édition rapide** : Cliquez sur "Éditer" puis onglet "⚙️ Paramètres"

---

**Note** : Le serveur doit être lancé (`npm run dev`) et vous devez être connecté en tant que Super Admin.
