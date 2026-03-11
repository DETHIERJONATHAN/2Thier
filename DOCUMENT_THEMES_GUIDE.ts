/**
 * 📚 GUIDE COMPLET: SYSTÈME DE THÈMES MAGNIFICOS
 * 
 * ## Vue d'ensemble
 * 
 * Le système de thèmes est un système MODULAIRE et COMPLÈTEMENT INTERCHANGEABLE
 * qui permet d'appliquer des designs magnifiques à n'importe quel template de document.
 * 
 * Chaque thème comprend:
 * - Couleurs: primaire, secondaire, accent, texte, arrière-plans
 * - Polices de caractères (families, tailles)
 * - SVG backgrounds pour headers et footers
 * - Styling personnalisé (padding, spacing, etc.)
 * 
 * ## 8 Thèmes Prédéfinis
 * 
 * 1. 🟠 **Professional Orange** - Moderne, Professionnel
 *    - Orange vibrant (#FF8C00) + Bleu marine (#1C3A4F)
 *    - Design moderne avec vagues géométriques
 * 
 * 2. 🟢 **Fresh Green** - Écologique, Minimaliste
 *    - Vert frais (#10B981) + Blanc
 *    - Design écologique et moderne
 * 
 * 3. 🔵 **Corporate Blue** - Corporatif, Confiant
 *    - Bleu professionnel (#2563EB) + Gris
 *    - Design professionnel avec points minimalistes
 * 
 * 4. 🔴 **Elegant Red** - Luxe, Premium
 *    - Rouge élégant (#DC2626) + Noir + Or
 *    - Design luxe avec accents dorés
 * 
 * 5. 🟣 **Modern Purple** - Créatif, Trendy
 *    - Violet moderne (#7C3AED) + Blanc
 *    - Design créatif avec cercles abstraits
 * 
 * 6. 🟡 **Minimal Yellow** - Épuré, Chic
 *    - Or/Jaune (#F59E0B) + Noir minimaliste
 *    - Design épuré avec géométrie simple
 * 
 * 7. ⚫ **Luxury Dark** - Premium, Sophistiqué
 *    - Noir profond (#0F0F0F) + Or luxe (#D4AF37)
 *    - Design premium avec accents dorés fins
 * 
 * 8. 🩵 **Tech Cyan** - High-tech, Innovant
 *    - Cyan futuriste (#06B6D4) + Noir
 *    - Design technologique avec patterns géométriques
 * 
 * ## Architecture du Système
 * 
 * ### Fichiers Clés
 * - `src/components/Documents/DocumentThemes.ts` - Définition des 8 thèmes
 * - `src/components/Documents/ThemeSelectorModal.tsx` - UI pour sélectionner les thèmes
 * - `src/hooks/useDocumentTheme.ts` - Hook React pour appliquer les thèmes
 * - `prisma/schema.prisma` - Modèle DocumentTheme (déjà existant)
 * - `prisma/seed.ts` - Données de seed pour les thèmes
 * 
 * ### Structure de la Base de Données
 * 
 * ```prisma
 * model DocumentTheme {
 *   id               String
 *   name             String
 *   organizationId   String
 *   primaryColor     String           // Couleur primaire (hex)
 *   secondaryColor   String           // Couleur secondaire (hex)
 *   accentColor      String?          // Couleur d'accent (hex)
 *   textColor        String           // Couleur du texte (hex)
 *   backgroundColor  String           // Couleur de fond (hex)
 *   headerBgColor    String           // Couleur du header
 *   footerBgColor    String           // Couleur du footer
 *   fontFamily       String           // Famille de police
 *   fontSize         Int              // Taille de base en px
 *   logoUrl          String?          // URL du logo
 *   headerImageUrl   String?          // URL image header
 *   footerImageUrl   String?          // URL image footer
 *   headerSvg        String?          // SVG custom header
 *   footerSvg        String?          // SVG custom footer
 *   customStyles     Json?            // Styles additionnels
 *   isDefault        Boolean          // Thème par défaut?
 *   isActive         Boolean          // Thème actif?
 *   isPublic         Boolean          // Visible partout?
 *   DocumentTemplate DocumentTemplate[]
 * }
 * 
 * model DocumentTemplate {
 *   themeId       String?              // Référence au thème
 *   DocumentTheme DocumentTheme?       // Relation au thème
 * }
 * ```
 * 
 * ## Utilisation dans les Composants
 * 
 * ### 1. Afficher le Sélecteur de Thèmes
 * 
 * ```typescript
 * import ThemeSelectorModal from '@/components/Documents/ThemeSelectorModal';
 * import { DocumentTheme } from '@/components/Documents/DocumentThemes';
 * import { useState } from 'react';
 * 
 * const MyComponent = () => {
 *   const [themeModalVisible, setThemeModalVisible] = useState(false);
 *   const [selectedThemeId, setSelectedThemeId] = useState<string>();
 * 
 *   const handleThemeSelected = (theme: DocumentTheme) => {
 *     setSelectedThemeId(theme.id);
 *     // Sauvegarder le thème pour le document
 *     // updateDocument({ themeId: theme.id });
 *   };
 * 
 *   return (
 *     <>
 *       <Button onClick={() => setThemeModalVisible(true)}>
 *         🎨 Changer le Thème
 *       </Button>
 * 
 *       <ThemeSelectorModal
 *         visible={themeModalVisible}
 *         onCancel={() => setThemeModalVisible(false)}
 *         currentThemeId={selectedThemeId}
 *         onThemeSelected={handleThemeSelected}
 *       />
 *     </>
 *   );
 * };
 * ```
 * 
 * ### 2. Utiliser le Hook useDocumentTheme
 * 
 * ```typescript
 * import { useDocumentTheme } from '@/hooks/useDocumentTheme';
 * 
 * const DocumentPreview = ({ themeId }) => {
 *   const { theme, styles } = useDocumentTheme({ themeId });
 * 
 *   return (
 *     <div style={styles.documentStyle}>
 *       <header style={styles.headerStyle}>
 *         <h1>Votre Document</h1>
 *       </header>
 *       <main>
 *         {"Contenu du document"}
 *       </main>
 *       <footer style={styles.footerStyle}>
 *         © 2026 - Tous droits réservés
 *       </footer>
 *     </div>
 *   );
 * };
 * ```
 * 
 * ### 3. Appliquer le Thème à des Éléments DOM
 * 
 * ```typescript
 * import { useDocumentTheme } from '@/hooks/useDocumentTheme';
 * import { useEffect, useRef } from 'react';
 * 
 * const DocumentRenderer = ({ themeId }) => {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   const { applyThemeToElement } = useDocumentTheme({ themeId });
 * 
 *   useEffect(() => {
 *     if (containerRef.current) {
 *       applyThemeToElement(containerRef.current);
 *     }
 *   }, [themeId, applyThemeToElement]);
 * 
 *   return <div ref={containerRef}>{"Contenu"}</div>;
 * };
 * ```
 * 
 * ## Interchangeabilité des Thèmes
 * 
 * ### Principe Clé
 * Les thèmes sont **COMPLÈTEMENT INDÉPENDANTS** des templates de documents.
 * 
 * ✅ **Tous les Thèmes** peuvent être appliqués à **Tous les Templates**:
 * 
 * - INVOICE + Professional Orange ✅
 * - INVOICE + Fresh Green ✅
 * - INVOICE + Corporate Blue ✅
 * - QUOTATION + Professional Orange ✅
 * - QUOTATION + Tech Cyan ✅
 * - PURCHASE_ORDER + Luxury Dark ✅
 * - Etc...
 * 
 * ### Structure de Relation
 * 
 * ```
 * DocumentTemplate (Structure)
 *        ↓
 *        + themeId (clé étrangère)
 *        ↓
 * DocumentTheme (Design)
 * 
 * Document Instance = Template + Theme (ANY COMBINATION)
 * ```
 * 
 * ## Personnalisation Avancée
 * 
 * ### Créer un Thème Personnalisé
 * 
 * ```typescript
 * import { DocumentTheme } from '@/components/Documents/DocumentThemes';
 * 
 * const CUSTOM_THEME: DocumentTheme = {
 *   id: 'theme_custom_company',
 *   name: 'Custom Company',
 *   description: 'Design personnalisé pour votre entreprise',
 *   primaryColor: '#custom1',
 *   secondaryColor: '#custom2',
 *   accentColor: '#custom3',
 *   textColor: '#000000',
 *   backgroundColor: '#ffffff',
 *   headerBgColor: '#custom1',
 *   footerBgColor: '#custom2',
 *   fontFamily: '"Your Font", sans-serif',
 *   fontSize: 12,
 *   // SVG personnalisé pour le header
 *   headerSvg: `
 *     <svg viewBox="0 0 1200 200" xmlns="http://www.w3.org/2000/svg">
 *       <!-- Votre SVG personnalisé -->
 *     </svg>
 *   `,
 *   footerSvg: `
 *     <svg viewBox="0 0 1200 100" xmlns="http://www.w3.org/2000/svg">
 *       <!-- Votre SVG personnalisé -->
 *     </svg>
 *   `,
 *   customStyles: {
 *     headerPadding: '50px',
 *     moduleSpacing: '20px',
 *   },
 * };
 * ```
 * 
 * ### Sauvegarder un Thème en Base de Données
 * 
 * ```typescript
 * // Via API
 * const saveTheme = async (theme: DocumentTheme) => {
 *   const response = await fetch('/api/document-themes', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       name: theme.name,
 *       organizationId: currentOrgId,
 *       primaryColor: theme.primaryColor,
 *       secondaryColor: theme.secondaryColor,
 *       // ... autres champs
 *     }),
 *   });
 *   return response.json();
 * };
 * ```
 * 
 * ## Performance et Optimisation
 * 
 * - **Caching**: Les thèmes sont cachés en mémoire après le premier chargement
 * - **CSS Variables**: Utilisation de variables CSS pour éviter les re-rendus
 * - **SVG Inline**: Les SVGs sont inlinés pour éviter les requêtes HTTP
 * - **Lazy Loading**: Les thèmes sont chargés à la demande
 * 
 * ## Seed et Initialisation
 * 
 * Lors du démarrage de l'application, le seed Prisma charge automatiquement
 * les 8 thèmes prédéfinis dans la base de données:
 * 
 * ```bash
 * npx prisma db seed
 * ```
 * 
 * Les thèmes sont créés avec:
 * - `isActive: true` - Thème actif et utilisable
 * - `isPublic: true` - Visible dans toute l'organisation
 * - `isDefault: true` - Pour Professional Orange (le premier)
 * 
 * ## Prochaines Étapes
 * 
 * 1. ✅ Créer le système de thèmes (FAIT)
 * 2. ✅ Ajouter 8 thèmes prédéfinis (FAIT)
 * 3. ✅ Créer l'interface de sélection (FAIT)
 * 4. ⏳ Intégrer au PageBuilder pour changer les thèmes en temps réel
 * 5. ⏳ Ajouter l'API pour créer/modifier des thèmes personnalisés
 * 6. ⏳ Exporter les documents avec le thème appliqué (PDF, etc.)
 * 
 * ## Support et Questions
 * 
 * Pour plus d'informations, consulter:
 * - `src/components/Documents/DocumentThemes.ts` - Code source des thèmes
 * - `src/hooks/useDocumentTheme.ts` - Logique du hook
 * - `prisma/schema.prisma` - Schéma de la base de données
 */

export const GUIDE = 'Consultez ce fichier pour comprendre le système de thèmes!';
