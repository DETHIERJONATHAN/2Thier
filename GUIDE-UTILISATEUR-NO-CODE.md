# 📚 GUIDE UTILISATEUR - ÉDITEUR DE SITE NO-CODE 2THIER

## 🎯 Introduction

Bienvenue dans l'éditeur de site web NO-CODE ! Cet outil vous permet de modifier **TOUS les éléments** de votre site vitrine directement depuis votre navigateur, sans aucune connaissance technique.

---

## 🚀 Accéder à l'éditeur

### Étape 1 : Se connecter
1. Ouvrez votre navigateur
2. Allez sur : `http://localhost:5173` (ou votre URL de production)
3. Connectez-vous avec vos identifiants admin

### Étape 2 : Accéder aux sites web
1. Dans le menu latéral gauche, cliquez sur **"Sites Web"**
2. Vous voyez la liste de vos sites web
3. Trouvez **"Site Vitrine 2Thier"**
4. Cliquez sur le bouton **"Éditer le site"** (icône crayon)

---

## 🎨 Interface de l'éditeur

L'éditeur est divisé en **3 zones** :

### 1️⃣ Zone de gauche - Liste des sections
- Affiche toutes les sections de votre site (Hero, Services, etc.)
- Chaque section peut être :
  - ✅ **Activée** (visible sur le site)
  - ❌ **Désactivée** (masquée)
  - 🔒 **Verrouillée** (impossible à supprimer - ex: Header, Footer)

### 2️⃣ Zone centrale - Éditeurs
- Contient les outils pour modifier votre site :
  - **Éditeur Carousel** : Modifier les carrousels d'images
  - **Éditeur Steps** : Modifier les étapes de processus
  - **Éditeur Footer** : Modifier le pied de page
  - **Éditeur Header** : Modifier l'en-tête
  - **Gestionnaire de thèmes** : Changer les couleurs globales
  - Et bien d'autres...

### 3️⃣ Zone de droite - Prévisualisation
- Montre un aperçu miniature de vos sections
- Cliquez sur **"🌐 Prévisualisation plein écran"** pour voir le site complet tel qu'il apparaîtra en ligne

---

## ✏️ Modifier le contenu

### Modifier les textes
1. Dans la base de données, chaque texte est stocké avec :
   - `text` : Le contenu du texte
   - `color` : La couleur du texte (ex: `#10b981`)
   - `fontSize` : La taille (ex: `clamp(32px, 8vw, 56px)`)

**Exemple** :
```json
{
  "title": {
    "text": "🌞 Votre Partenaire en Transition Énergétique",
    "color": "white",
    "fontSize": "clamp(32px, 8vw, 56px)"
  }
}
```

### Modifier les couleurs
Votre site utilise une palette de couleurs cohérente :
- **Vert principal** : `#10b981`
- **Vert secondaire** : `#059669`
- **Vert accent** : `#047857`
- **Fond clair** : `#f9fafb`
- **Fond sombre** : `#1f2937`

Pour changer une couleur :
1. Trouvez la section concernée
2. Modifiez le champ `color` dans le JSON
3. Enregistrez
4. La preview se met à jour automatiquement

### Modifier les boutons
Chaque bouton a ces propriétés :
```json
{
  "text": "DEMANDER UN DEVIS GRATUIT",
  "icon": "RocketOutlined",
  "href": "#contact",
  "backgroundColor": "white",
  "textColor": "#10b981",
  "borderColor": "white",
  "fontSize": "18px",
  "padding": "16px 32px",
  "fontWeight": "bold"
}
```

---

## 📝 Sections disponibles

### 1. Header (En-tête sticky)
**Ce qui est stocké** :
- Logo (texte + emoji ou image)
- Liens de navigation
- Bouton CTA principal

**À quoi ça sert** :
Navigation principale du site, toujours visible en haut de page.

---

### 2. Hero (Section d'accueil)
**Ce qui est stocké** :
- Titre principal avec emoji
- Sous-titre avec description services
- 2 boutons CTA
- Badge avec nombre d'installations

**À quoi ça sert** :
Première impression du visiteur, message principal.

---

### 3. Stats (Statistiques clés)
**Ce qui est stocké** :
- 4 cartes avec :
  - Icône (ex: HomeOutlined)
  - Valeur (ex: "+500")
  - Label (ex: "Installations réalisées")
  - Couleur

**À quoi ça sert** :
Prouver la crédibilité avec des chiffres clés.

---

### 4. Services (Solutions énergétiques)
**Ce qui est stocké** :
- Heading (titre + sous-titre)
- Configuration d'affichage (grille, style cards)
- **Les services viennent de la table `WebSiteService`**

**À quoi ça sert** :
Présenter toutes vos offres (Photovoltaïque, Batteries, etc.).

**Comment ajouter un service** :
1. Allez dans la base de données
2. Table `WebSiteService`
3. Créez un nouvel enregistrement avec :
   - `key` : Identifiant unique (ex: "panneaux-photovoltaiques")
   - `title` : "Panneaux Photovoltaïques"
   - `description` : "Description du service"
   - `icon` : "ThunderboltOutlined"
   - `features` : Liste des avantages (JSON array)
   - `cta` : Texte du bouton (ex: "Demander un devis")

---

### 5. Values (Pourquoi choisir 2Thier)
**Ce qui est stocké** :
- 4 cartes avec emoji, titre, description
- Exemple : 🌱 Écologique, 💰 Économique, etc.

**À quoi ça sert** :
Mettre en avant vos valeurs et différenciateurs.

---

### 6. Projects (Réalisations)
**Ce qui est stocké** :
- Heading (titre + lien "Voir plus")
- Configuration d'affichage
- **Les projets viennent de la table `WebSiteProject`**

**À quoi ça sert** :
Montrer vos réalisations concrètes avec photos.

**Comment ajouter un projet** :
1. Base de données → Table `WebSiteProject`
2. Créez un enregistrement avec :
   - `title` : "Installation Photovoltaïque Charleroi"
   - `location` : "Charleroi, Belgique"
   - `image` : URL de la photo (à uploader)
   - `details` : Description courte
   - `tags` : ["Résidentiel", "9 kWc"] (JSON array)
   - `date` : "Janvier 2025"

---

### 7. Testimonials (Témoignages clients)
**Ce qui est stocké** :
- Heading
- Configuration carousel (autoplay, dots)
- **Les témoignages viennent de la table `WebSiteTestimonial`**

**À quoi ça sert** :
Rassurer avec des avis clients réels.

**Comment ajouter un témoignage** :
1. Base de données → Table `WebSiteTestimonial`
2. Créez un enregistrement avec :
   - `name` : "Jean Dupont"
   - `location` : "Charleroi"
   - `service` : "Panneaux Photovoltaïques"
   - `rating` : 5
   - `text` : "Texte du témoignage..."
   - `date` : "Décembre 2024"

---

### 8. Steps (Votre projet en 5 étapes)
**Ce qui est stocké** :
- Liste de 5 étapes avec :
  - Titre (Contact, Étude, Devis, Installation, Suivi)
  - Description
  - Icône

**À quoi ça sert** :
Expliquer le processus simplement.

---

### 9. CTA (Appel à l'action final)
**Ce qui est stocké** :
- Heading (titre + sous-titre)
- Boutons (téléphone + email)
- Adresse
- **NOUVEAU** : Formulaire de contact intégré

**À quoi ça sert** :
Convertir les visiteurs en prospects.

**Le formulaire de contact** :
- Champs : Nom, Email, Téléphone, Service souhaité, Message
- Soumission vers `/api/contact-form`
- Les données sont enregistrées et peuvent déclencher :
  - Email de confirmation au client
  - Email de notification à l'admin
  - Création d'un lead dans le CRM

---

### 10. Footer (Pied de page)
**Ce qui est stocké** :
- 4 colonnes avec :
  - Titre
  - Contenu (texte ou liens)
- Copyright

**À quoi ça sert** :
Navigation secondaire et informations légales.

---

## 🌐 Prévisualiser et publier

### Prévisualisation plein écran
1. Cliquez sur le bouton **"🌐 Prévisualisation plein écran"**
2. Une fenêtre modale s'ouvre
3. Vous voyez **exactement** ce que verront vos visiteurs
4. Testez :
   - Le défilement
   - Les boutons
   - Le formulaire de contact
   - Le responsive (DevTools → Toggle device toolbar)

### Publier les modifications
🚧 **À venir** : Bouton "Publier" pour déployer en production

---

## 🎨 Personnaliser les couleurs (Thèmes)

### Via le Gestionnaire de thèmes
1. Dans l'éditeur, cliquez sur **"Gestionnaire de thèmes"**
2. Vous voyez des thèmes prédéfinis :
   - Vert 2Thier (par défaut)
   - Bleu ciel
   - Orange sunset
   - Violet premium
3. Cliquez sur un thème pour l'appliquer
4. Toutes les couleurs du site changent automatiquement

### Créer un thème personnalisé
1. Dans le gestionnaire, cliquez sur **"Nouveau thème"**
2. Donnez un nom : "Mon thème"
3. Choisissez vos couleurs :
   - Couleur principale
   - Couleur secondaire
   - Couleur d'accent
   - Fond clair
   - Fond sombre
4. Enregistrez
5. Le thème est disponible pour tous vos sites

---

## 📱 Mobile Responsive

### Vérifier le responsive
1. Ouvrez la prévisualisation plein écran
2. Appuyez sur **F12** (DevTools)
3. Cliquez sur l'icône mobile/tablet (Ctrl+Shift+M)
4. Testez différents devices :
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - iPad Pro (1024px)

### Ce qui est automatique
✅ Grilles responsive (colonnes s'adaptent)
✅ Tailles de police responsive (clamp)
✅ Espacements adaptés
✅ Boutons full-width sur mobile

---

## 🆘 Résolution de problèmes

### La preview ne charge pas
1. Vérifiez que le serveur API est démarré (port 4000)
2. Ouvrez la console (F12) → onglet "Console"
3. Vérifiez qu'il n'y a pas d'erreurs 404
4. Si erreur 404, vérifiez que la migration a été exécutée :
   ```powershell
   npx tsx migrate-site-final-complete.ts
   ```

### Les images ne s'affichent pas
🚧 **Système d'upload en cours de développement**
Temporairement, utilisez des URLs d'images externes (ex: Unsplash)

### Le formulaire de contact ne fonctionne pas
1. Vérifiez que l'API route est enregistrée dans `api-server-clean.ts`
2. Vérifiez la console backend pour les logs
3. Format attendu :
   ```json
   {
     "name": "Jean Dupont",
     "email": "jean@example.com",
     "phone": "0471234567",
     "service": "Photovoltaïque",
     "message": "Je souhaite un devis"
   }
   ```

### Les modifications ne s'enregistrent pas
🚧 **Éditeurs de sections individuels en cours de développement**
Actuellement, les modifications se font via Prisma Studio :
1. Ouvrez un terminal
2. Lancez : `npx prisma studio`
3. Naviguez vers la table `WebSiteSection`
4. Modifiez le JSON dans le champ `content`
5. Sauvegardez
6. Rafraîchissez la preview (Ctrl+F5)

---

## 🚀 Prochaines fonctionnalités

### En développement
- 🎨 **Éditeurs graphiques** pour chaque section (formulaires visuels)
- 📸 **Upload d'images** direct depuis l'interface
- 🎬 **Animations** et transitions configurables
- 📱 **Preview mobile** intégrée (sans DevTools)
- 🔄 **Drag & drop** pour réordonner les sections
- 📋 **Templates** de sections pré-configurées
- ⏪ **Undo/Redo** pour annuler les modifications
- 🌍 **Multilingue** (FR, EN, NL)

---

## 📞 Support

Besoin d'aide ?
- **Documentation technique** : `RECAP-SITE-VITRINE-COMPLETE.md`
- **Fichiers clés** :
  - Migration : `migrate-site-final-complete.ts`
  - Renderer : `src/components/websites/SectionRendererV2.tsx`
  - Builder : `src/components/websites/NoCodeBuilder.tsx`
  - Animations : `src/components/websites/animations.css`

---

**Bonne édition ! 🎉**
