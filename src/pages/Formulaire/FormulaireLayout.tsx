// Layout principal du Form Builder (Formulaire)
// Contient la structure 3 colonnes et orchestre tous les sous-composants du builder

import React, { useState } from 'react';
import FieldsPalette from '../../components/FieldsPalette';
import SectionsFormulaire from './SectionsFormulaire';
import ConfigAvancee from './ConfigAvancee';
import useCRMStore from '../../store';
import type { Field, Section, FormulaItem } from '../../store/slices/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { toast } from 'react-toastify';
import { useParams } from 'react-router-dom';
import { logger } from '../../lib/logger';

const FormulaireLayout: React.FC = () => {
  logger.debug('[FormulaireLayout] Render');
  // Centralise la sélection du champ pour la colonne de droite
  const [selectedField, setSelectedField] = useState<{ sectionId: string | number; fieldId: string | number } | null>(null);
  const { 
    blocks, 
    addBlock, 
    reorderSectionsOfBlock, 
    moveFieldToSection, 
    updateFormula,
    updateValidation,
    updateDependency,
    addItemsToFormulaSequence,
    addFieldToSection
  } = useCRMStore();
  const { blockId: selectedBlockId } = useParams<{ blockId: string }>();

  // On récupère le block de travail courant
  const block = blocks.find(b => String(b.id) === selectedBlockId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    logger.debug('[DND_END] Event:', event);

    if (!over || !block) {
      logger.debug('[DND_CANCEL] No "over" element or block not found. Aborting.');
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;
    const activeType = activeData?.type;

    logger.debug(`[DND_END] Active type: ${activeType}, Over type: ${overData?.type}`);

    // Cas: Réordonnancement d'un item dans une séquence de formule
    if (activeType === 'formula-sequence-item' && overData && (overData.type === 'formula-sequence-item' || overData.type === 'formula-drop-zone')) {
        const { id: activeId } = active;
        const { id: overId } = over;

        // Extraire l'ID de la formule à partir de l'ID de l'élément actif
        const formulaId = active.data.current?.item?.formulaId;
        
        if (!formulaId) {
            logger.warn("[DND_END] Missing formulaId in formula-sequence-item drag", active.data.current);
            toast.error("ID de formule manquant dans l'élément déplacé");
            return;
        }

        if (activeId !== overId) {
            const parentField = block?.sections.flatMap(s => s.fields).find(f => f.formulas?.some(form => form.id === formulaId));
            const formula = parentField?.formulas?.find(f => f.id === formulaId);

            if (formula?.sequence) {
                const oldIndex = formula.sequence.findIndex((item) => item.id === active.data.current?.item.id);
                
                // Si l'élément survolé est la zone de dépôt, on place l'élément à la fin
                // Sinon, on trouve l'index de l'élément survolé.
                const newIndex = overData.type === 'formula-drop-zone'
                    ? formula.sequence.length - 1
                    : formula.sequence.findIndex((item) => item.id === over.data.current?.item.id);

                if (oldIndex !== -1 && newIndex !== -1) {
                    const newSequence = arrayMove(formula.sequence, oldIndex, newIndex);
                    updateFormula(formulaId, { sequence: newSequence });
                    toast.info('Séquence de la formule mise à jour.');
                }
            }
        }
        return;
    }

    // Cas 0: Ajout d'un nouveau champ depuis la palette
    if (activeType === 'palette-field' && activeData) {
        const fieldType = activeData.fieldType as string;
        logger.debug(`[DND_END] Palette field drop detected. Type: ${fieldType}`);
        
        let targetSectionId: string | null = null;
        let targetIndex: number | null = null;

        if (overData?.type === 'section') {
            targetSectionId = over.id.toString();
            const targetSection = block.sections.find(s => s.id.toString() === targetSectionId);
            if (targetSection) {
                targetIndex = targetSection.fields.length;
            }
        } else if (overData?.type === 'form-field') {
            targetSectionId = overData.sectionId as string;
            const targetSection = block.sections.find(s => s.id.toString() === targetSectionId);
            if (targetSection) {
                const overIndex = targetSection.fields.findIndex(f => f.id === over.id);
                targetIndex = overIndex >= 0 ? overIndex : targetSection.fields.length;
            }
        }

        if (targetSectionId && targetIndex !== null && fieldType) {
            addFieldToSection(targetSectionId, {
                type: fieldType,
                label: `Nouveau champ ${fieldType}`,
                order: targetIndex,
            });
            toast.success(`Champ '${fieldType}' ajouté.`);
            logger.debug(`[DND_END] Added field '${fieldType}' to section ${targetSectionId} at index ${targetIndex}`);
        } else {
            toast.warn('Déposez le champ sur une section pour l\'ajouter.');
            logger.debug('[DND_END] Drop from palette failed: no valid target section.');
        }
        return;
    }

    // Cas: Déposer un champ (depuis le formulaire) dans une zone de construction (formule, validation, dépendance)
    if (activeType === 'form-field' && activeData && overData?.type?.endsWith('-drop-zone')) {
        const field = activeData.field as Field;
        const { itemData } = overData;
        logger.debug(`[DND_END] 🔄 Field dropped into a build zone. Field: ${field.label}, Zone: ${overData.type}`);
        logger.debug(`[DND_END] 🧩 Données complètes:`, { active: activeData, over: overData, itemData });
        logger.debug(`[DND_END] 🧩 Over ID:`, over.id);

        // S'assurer que l'item à ajouter a un ID valide
        const newItem: FormulaItem = { 
          type: 'field', 
          id: `field-${field.id}-${Date.now()}`, // Garantir un ID unique avec timestamp
          label: field.label,
          value: field.id
        };
        logger.debug(`[DND_END] 📦 Nouvel item créé:`, newItem);

        if (overData.type === 'formula-drop-zone') {
            // Extraction de l'ID de la formule avec vérifications renforcées
            let formulaId = itemData?.formulaId;
            let formulaName = itemData?.formulaName || 'Sans nom';
            
            logger.debug(`[DND_END] 🔍 Extraction de l'ID de formule: initial=${formulaId}`);
            
            // Si l'ID de la formule n'est pas disponible dans itemData, essayons de l'extraire du dropZoneId
            if (!formulaId) {
                logger.warn(`[DND_END] ⚠️ Formula ID is undefined or null in itemData`);
                
                // Extraction à partir de l'ID de la zone de dépôt
                const dropZoneId = String(over?.id || '');
                const formulaIdMatch = dropZoneId.match(/formula-drop-zone-(.*)/);
                
                if (formulaIdMatch && formulaIdMatch[1]) {
                    formulaId = formulaIdMatch[1];
                    logger.debug(`[DND_END] 🎯 Extracted formula ID from drop zone ID: ${formulaId}`);
                }
            }
            
            // Si nous n'avons toujours pas d'ID de formule, affichons une erreur
            if (!formulaId) {
                toast.error("Impossible d'identifier la formule cible. Veuillez réessayer.");
                logger.error(`[DND_END] ❌ Could not determine formula ID from drop zone or item data`);
                return;
            }
            
            // Vérifier que l'ID est une chaîne valide
            if (typeof formulaId !== 'string' || formulaId.trim() === '') {
                toast.error("L'ID de la formule cible n'est pas valide.");
                logger.error(`[DND_END] ❌ Invalid formula ID: ${formulaId} (type: ${typeof formulaId})`);
                return;
            }
            
            // À ce stade, nous avons un ID de formule valide
            logger.debug(`[DND_END] ✅ Using formula ID: ${formulaId}, name: ${formulaName}`);
            
            // Recherche dans tous les blocs pour trouver le champ parent
            let fieldFound = null;
            
            logger.debug(`[DND_END] 🔎 Recherche du champ parent pour la formule ${formulaId}...`);
            for (const b of blocks) {
                for (const s of b.sections) {
                    for (const f of s.fields) {
                        if (f.formulas?.some(form => form && form.id === formulaId)) {
                            fieldFound = f;
                            logger.debug(`[DND_END] ✅ Champ parent trouvé: ${f.id} (${f.label || 'sans label'})`);
                            break;
                        }
                    }
                    if (fieldFound) break;
                }
                if (fieldFound) break;
            }
            
            if (!fieldFound) {
                logger.debug(`[DND_END] 🔬 Recherche avancée avec toutes les formules...`);
                // Recherche de secours : afficher toutes les formules de tous les champs
                blocks.forEach((b, bi) => {
                    b.sections.forEach((s, si) => {
                        s.fields.forEach((f, fi) => {
                            if (f.formulas && f.formulas.length > 0) {
                                logger.debug(`[DND_END] 📋 Bloc ${bi}, Section ${si}, Champ ${fi} (${f.id}): Formules:`, 
                                    f.formulas.map(form => ({ id: form?.id || 'MISSING', type: typeof form?.id })));
                            }
                        });
                    });
                });
            }
            
            if (fieldFound) {
                logger.debug(`[DND_END] 🚀 Ajout du champ ${field.id} à la formule ${formulaId}...`);
                
                try {
                    addItemsToFormulaSequence(fieldFound.id, formulaId, [newItem]);
                    toast.success(`Champ "${field.label}" ajouté à la formule.`);
                    logger.debug(`[DND_END] ✅ Added field ${field.id} to formula ${formulaId}`);
                } catch (error) {
                    logger.error(`[DND_END] ❌ ERREUR lors de l'ajout à la formule:`, error);
                    toast.error(`Erreur lors de l'ajout: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
                }
            } else {
                toast.error("Champ parent de la formule introuvable.");
                logger.error(`[DND_END] ❌ Could not find parent field for formula ${formulaId}`);
            }
        } else if (overData.type === 'validation-drop-zone') {
            // TODO: Implémenter la logique pour les validations
            toast.warn("Logique de validation à implémenter.");
        } else if (overData.type === 'dependency-condition-drop-zone') {
            // TODO: Implémenter la logique pour les dépendances
            toast.warn("Logique de dépendance à implémenter.");
        }

        return;
    }

    const droppableId = over.data.current?.droppableId as string | undefined;

    if (droppableId?.startsWith('formula-editor-drop-zone-')) {
      if (active.data.current?.type === 'form-field') {
        const field = active.data.current.field as Field;
        const formulaId = droppableId.replace('formula-editor-drop-zone-', '');
        
        const allFormulas = block.sections.flatMap((s: Section) => s.fields.flatMap((f: Field) => f.formulas || []));
        const targetFormula = allFormulas.find(f => f.id === formulaId);

        if (targetFormula) {
          const newSequence = [...(targetFormula.sequence || []), { type: 'field' as const, id: field.id, label: field.label }];
          updateFormula(formulaId, { sequence: newSequence });
          toast.info(`Champ "${field.label}" ajouté à la formule.`);
        } else {
            toast.error("Erreur: Impossible de trouver la formule cible.");
        }
      }
      return;
    }

    if (droppableId?.startsWith('validation-drop-area-')) {
      if (active.data.current?.type === 'form-field') {
        const field = active.data.current.field as Field;
        const validationData = over.data.current;
        const validationId = validationData?.validationId;
        const sequencePart = validationData?.sequencePart as 'validationSequence' | 'comparisonSequence';
        
        if (validationId && sequencePart) {
          const allValidations = block.sections.flatMap((s: Section) => s.fields.flatMap((f: Field) => f.validations || []));
          const targetValidation = allValidations.find(v => v.id === validationId);

          if (targetValidation) {
            const defaultSequence = { validationSequence: [], operator: 'equals' as const, comparisonSequence: [], errorMessage: '' };
            const currentSequence = targetValidation.sequence || defaultSequence;
            const currentPart = currentSequence[sequencePart] || [];
            const newPart = [...currentPart, { type: 'field' as const, id: field.id, label: field.label }];
            
            const newSequence = {
                ...currentSequence,
                [sequencePart]: newPart,
            };
            
            updateValidation(validationId, { sequence: newSequence });
            toast.info(`Champ "${field.label}" ajouté à la validation.`);
          } else {
            toast.error("Erreur: Impossible de trouver la validation cible.");
          }
        }
      }
      return;
    }

    if (droppableId?.startsWith('dependency-drop-area-')) {
      if (active.data.current?.type === 'form-field') {
        const field = active.data.current.field as Field;
        const dependencyData = over.data.current;
        const dependencyId = dependencyData?.dependencyId;
        const conditionIndex = dependencyData?.conditionIndex as number | undefined;
        
        if (dependencyId && typeof conditionIndex === 'number') {
          const allDependencies = block.sections.flatMap((s: Section) => s.fields.flatMap((f: Field) => f.dependencies || []));
          const targetDependency = allDependencies.find(d => d.id === dependencyId);

          if (targetDependency) {
            const defaultSequence = { conditions: [[]], action: 'show' as const, targetFieldId: targetDependency.targetFieldId };
            const currentSequence = targetDependency.sequence || defaultSequence;
            const newConditions = [...currentSequence.conditions];
            
            while (newConditions.length <= conditionIndex) {
                newConditions.push([]);
            }

            const conditionToUpdate = [...newConditions[conditionIndex]];
            conditionToUpdate.push({ type: 'field' as const, id: field.id, label: field.label });
            newConditions[conditionIndex] = conditionToUpdate;
            
            const newSequence = { ...currentSequence, conditions: newConditions };
            
            updateDependency(dependencyId, { sequence: newSequence });
            toast.info(`Champ "${field.label}" ajouté à la dépendance.`);
          } else {
            toast.error("Erreur: Impossible de trouver la dépendance cible.");
          }
        }
      }
      return;
    }

    // Cas 1: Déplacement d'un champ
    if (activeType === 'form-field' && activeData) {
      const field = activeData.field as Field;
      const sourceSectionId = activeData.sectionId as string;
      
      const targetSectionId = overData?.type === 'section' 
        ? over.id.toString() 
        : overData?.sectionId as string;
      
      if (!targetSectionId) {
        return;
      }

      const sourceSection = block.sections.find((s: Section) => s.id.toString() === sourceSectionId);
      const targetSection = block.sections.find((s: Section) => s.id.toString() === targetSectionId);

      if (!sourceSection || !targetSection) {
        return;
      }

      const oldIndex = sourceSection.fields.findIndex((f: Field) => f.id === field.id);
      
      let newIndex;
      if (over.data.current?.type === 'form-field') {
        newIndex = targetSection.fields.findIndex((f: Field) => f.id === over.id);
      } 
      else if (over.data.current?.type === 'section') {
        newIndex = targetSection.fields.length;
      } 
      else {
        const targetIsSection = block.sections.some(s => String(s.id) === String(over.id));
        if (targetIsSection) {
            newIndex = targetSection.fields.length;
        } else {
            newIndex = targetSection.fields.findIndex((f: Field) => f.id === over.id);
            if (newIndex === -1) {
                newIndex = targetSection.fields.length;
            }
        }
      }

      if (oldIndex !== -1) {
        moveFieldToSection(field.id, sourceSectionId, targetSectionId, newIndex);
      }
      return;
    }

    // Cas 2: Déplacement d'une section
    if (active.data.current?.type === 'section' && over.data.current?.type === 'section' && active.id !== over.id) {
        const oldIndex = block.sections.findIndex((s: Section) => String(s.id) === active.id.toString());
        const newIndex = block.sections.findIndex((s: Section) => String(s.id) === over.id.toString());

        if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedSections = arrayMove(block.sections, oldIndex, newIndex);
            
            useCRMStore.setState(state => ({
              blocks: state.blocks.map(b => 
                String(b.id) === selectedBlockId 
                    ? { ...b, sections: reorderedSections.map((s: Section, idx) => ({ ...s, order: idx })) } 
                    : b
              )
            }));

            reorderSectionsOfBlock(block.id, reorderedSections.map((s: Section) => ({ id: s.id as string, order: s.order })));
        }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="form-builder-layout">
        {/* Colonne 1: Palette de champs */}
        <div className="fields-palette">
          <FieldsPalette />
        </div>

        {/* Colonne 2: Sections du formulaire */}
        <div className="form-sections">
          <SectionsFormulaire 
            selectedField={selectedField}
            setSelectedField={setSelectedField}
          />
        </div>

        {/* Colonne 3: Configuration avancée */}
        <div className="advanced-config">
          {selectedField && (
            <ConfigAvancee 
              selectedField={selectedField} // Passer l'objet complet
              onClose={() => setSelectedField(null)}
            />
          )}
        </div>
      </div>
    </DndContext>
  );
};

export default FormulaireLayout;
