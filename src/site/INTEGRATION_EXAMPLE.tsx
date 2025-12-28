/**
 * 📝 EXEMPLE D'INTÉGRATION - NoCodeBuilder
 * 
 * Ce fichier montre comment intégrer le système universel
 * dans le NoCodeBuilder existant.
 * 
 * ÉTAPES D'INTÉGRATION :
 * 1. Importer le UniversalSectionEditor
 * 2. Remplacer le SectionEditor actuel
 * 3. Mettre à jour les handlers
 * 
 * @example
 */

import React, { useState } from 'react';
import { UniversalSectionEditor, getSectionSchema } from '@/site';
import type { SectionInstance } from '@/site';

/**
 * 🎨 Exemple d'intégration dans NoCodeBuilder
 */
const NoCodeBuilderWithUniversalEditor: React.FC = () => {
  const [sections, setSections] = useState<SectionInstance[]>([
    {
      id: '1',
      type: 'header',
      name: 'Header Principal',
      content: {
        logo: {
          type: 'text-emoji',
          text: '2THIER ENERGY',
          emoji: '⚡',
          color: '#10b981'
        },
        menuItems: [
          { label: 'Accueil', url: '/' },
          { label: 'Services', url: '/services' }
        ]
      },
      order: 0,
      isActive: true,
      websiteId: 'website-1',
      metadata: {}
    },
    {
      id: '2',
      type: 'hero',
      name: 'Hero Section',
      content: {
        content: {
          title: 'Passez à l\'énergie solaire',
          subtitle: 'Économisez jusqu\'à 70% sur vos factures'
        }
      },
      order: 1,
      isActive: true,
      websiteId: 'website-1',
      metadata: {}
    }
  ]);
  
  const [selectedSection, setSelectedSection] = useState<SectionInstance | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  
  /**
   * 🎯 Handler : Éditer une section
   */
  const handleEditSection = (section: SectionInstance) => {
    setSelectedSection(section);
    setEditorVisible(true);
  };
  
  /**
   * 💾 Handler : Sauvegarder les modifications
   */
  const handleSaveSection = (newContent: any) => {
    if (!selectedSection) return;
    
    setSections(prev => 
      prev.map(s => 
        s.id === selectedSection.id
          ? { ...s, content: newContent }
          : s
      )
    );
    
    setEditorVisible(false);
    setSelectedSection(null);
  };
  
  /**
   * 🎨 Rendu
   */
  return (
    <div>
      {/* Canvas avec les sections */}
      <div className="canvas">
        {sections.map(section => (
          <div
            key={section.id}
            onClick={() => handleEditSection(section)}
            style={{ cursor: 'pointer', border: '2px dashed #ccc', padding: 16, margin: 8 }}
          >
            <strong>{section.name}</strong> ({section.type})
            <div style={{ fontSize: 12, color: '#999' }}>
              Cliquez pour éditer
            </div>
          </div>
        ))}
      </div>
      
      {/* Éditeur Universel (Drawer Modal) */}
      {selectedSection && (
        <UniversalSectionEditor
          sectionType={selectedSection.type}
          content={selectedSection.content}
          onChange={handleSaveSection}
          visible={editorVisible}
          onClose={() => {
            setEditorVisible(false);
            setSelectedSection(null);
          }}
          mode="drawer"
        />
      )}
    </div>
  );
};

export default NoCodeBuilderWithUniversalEditor;

/**
 * 📋 AVANT / APRÈS
 * 
 * AVANT (avec SectionEditor.tsx) :
 * ```tsx
 * // 3353 lignes, switch statement géant
 * case 'header': return renderHeaderFields();
 * case 'hero': return renderHeroFields();
 * case 'services': return renderServicesFields();
 * // ... 20+ cases
 * ```
 * 
 * APRÈS (avec UniversalSectionEditor) :
 * ```tsx
 * // UNE ligne, fonctionne pour TOUTES les sections
 * <UniversalSectionEditor sectionType={section.type} ... />
 * ```
 * 
 * Pour ajouter une nouvelle section :
 * - AVANT : Écrire 200+ lignes de JSX, tester, debug
 * - APRÈS : Créer un fichier schema (50 lignes JSON), c'est tout !
 */

/**
 * 🔄 MIGRATION STEP-BY-STEP
 * 
 * 1. Dans NoCodeBuilder.tsx :
 * 
 *    REMPLACER :
 *    ```tsx
 *    import SectionEditor from './SectionEditor';
 *    ```
 * 
 *    PAR :
 *    ```tsx
 *    import { UniversalSectionEditor } from '@/site';
 *    ```
 * 
 * 2. Remplacer le composant SectionEditor :
 * 
 *    AVANT (ligne ~445-458) :
 *    ```tsx
 *    <SectionEditor
 *      section={selectedSection}
 *      visible={sectionEditorVisible}
 *      onClose={handleCloseSectionEditor}
 *      onSave={handleSaveSectionEdits}
 *    />
 *    ```
 * 
 *    APRÈS :
 *    ```tsx
 *    {selectedSection && (
 *      <UniversalSectionEditor
 *        sectionType={selectedSection.type}
 *        content={selectedSection.content}
 *        onChange={handleSaveSectionEdits}
 *        visible={sectionEditorVisible}
 *        onClose={handleCloseSectionEditor}
 *      />
 *    )}
 *    ```
 * 
 * 3. Supprimer PropertyEditor (colonne de droite) :
 * 
 *    SUPPRIMER les lignes 342-346 :
 *    ```tsx
 *    <div style={{ width: 400, ... }}>
 *      <PropertyEditor ... />
 *    </div>
 *    ```
 * 
 * 4. Tester avec sections existantes :
 *    - Ouvrir un site
 *    - Cliquer sur une section header/hero
 *    - Vérifier que l'éditeur s'ouvre
 *    - Modifier des valeurs
 *    - Sauvegarder
 *    - Vérifier le rendu
 * 
 * 5. Migrer les données si nécessaire :
 *    - Vérifier que la structure `content` est compatible
 *    - Créer un script de migration si besoin
 */
