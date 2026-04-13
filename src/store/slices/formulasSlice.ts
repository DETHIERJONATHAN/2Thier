import { StateCreator } from 'zustand';
import { toast } from 'react-toastify';
import { CRMState } from './types';
import { fetchWithAuth } from './api';
import { logger } from '../../lib/logger';

export interface FormulasSlice {
  // Actions pour les formules
  updateFormula: (formulaId: string, data: unknown) => Promise<void>;
  createFormula: (fieldId: string, formulaData: unknown) => Promise<unknown>;
  deleteFormula: (formulaId: string) => Promise<void>;
  reorderFormulaSequence: (formulaId: string, oldIndex: number, newIndex: number) => Promise<void>;
  addItemsToFormulaSequence: (fieldId: string, formulaId: string, items: unknown[], index: number) => Promise<void>;
  moveFormulaItem: (fieldId: string, formulaId: string, fromIndex: number, toIndex: number) => Promise<void>;
  deleteFormulaSequenceItem: (fieldId: string, formulaId: string, index: number) => Promise<void>;
}

// Helper function pour s'assurer que le fieldId est présent dans une formule
const ensureFormulasHaveFieldId = (formulas: unknown[], fieldId: string): unknown[] => {
  return formulas.map((formula: Record<string, unknown>) => {
    if (!formula.fieldId && fieldId) {
      return { ...formula, fieldId };
    }
    return formula;
  });
};

export const createFormulasSlice: StateCreator<
  CRMState,
  [],
  [],
  FormulasSlice
> = (set, get) => ({
  updateFormula: async (formulaId, data) => {
    logger.debug(`[CRMStore][updateFormula] 🚀 DÉBUT - Mise à jour de la formule ${formulaId}`, {
      id: data.id,
      name: data.name,
      namePresent: data.name !== undefined,
      nameType: typeof data.name,
      sequenceLength: data.sequence?.length || 0
    });
    
    logger.debug(`[CRMStore][updateFormula] 🔍 TRACE - Stack:`, new Error().stack?.split('\n').slice(0, 10).join('\n'));
    
    let fieldId: string | null = null;
    let originalFormula: unknown | undefined;

    const stateBeforeUpdate = get();
    
    // ⚠️ VALIDATION CRITIQUE: Vérifier que l'ID de formule est valide avant tout traitement
    if (!formulaId || typeof formulaId !== 'string' || formulaId.trim() === '') {
      const errorMsg = "ID de formule invalide pour la mise à jour";
      logger.error(`[CRMStore][updateFormula] 🚨 ${errorMsg}`);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // ⚠️ VALIDATION CRITIQUE: Ne jamais laisser un ID null ou undefined être envoyé dans les données
    if (data.id === null || data.id === undefined) {
      logger.debug(`[CRMStore][updateFormula] ⚠️ ID manquant dans les données de mise à jour, utilisation de l'ID fourni: ${formulaId}`);
      data = { ...data, id: formulaId };
    } else if (data.id !== formulaId) {
      logger.warn(`[CRMStore][updateFormula] ⚠️ Incohérence d'ID - Paramètre: ${formulaId}, Données: ${data.id}. Correction...`);
      data = { ...data, id: formulaId };
    }
    
    // 🔍 SUPER DEBUG: Vérifier si la séquence contient des éléments invalides
    if (data.sequence) {
      logger.debug(`[CRMStore][updateFormula] 🔍 Vérification de la séquence (${data.sequence.length} items)...`);
      const invalidItems = data.sequence.filter((item: Record<string, unknown>) => !item || !item.id || typeof item.id !== 'string');
      if (invalidItems.length > 0) {
        logger.warn(`[CRMStore][updateFormula] ⚠️ La séquence contient ${invalidItems.length} items invalides!`);
      }
    }
    
    // Recherche exhaustive de la formule et du champ associé
    logger.debug(`[CRMStore][updateFormula] 🔎 Recherche de la formule ${formulaId} dans les blocs...`);
    
    stateBeforeUpdate.blocks.forEach((b, bIndex) => b.sections.forEach((s, sIndex) => s.fields.forEach((f) => {
        if (f.formulas) {
          const foundFormula = f.formulas.find(formula => formula.id === formulaId);
          if (foundFormula) {
            fieldId = f.id;
            originalFormula = foundFormula;
            logger.debug(`[CRMStore][updateFormula] ✓ Formule trouvée dans: blocks[${bIndex}].sections[${sIndex}].fields[id=${f.id}].formulas`);
          }
        }
    })));
    logger.debug("stateBeforeUpdate.blocks", JSON.parse(JSON.stringify(stateBeforeUpdate.blocks)));

    if (!fieldId || !originalFormula) {
        logger.error(`[CRMStore] Formula ${formulaId} not found in any field`);
        throw new Error("Données de formule non trouvées pour la sauvegarde.");
    }
    
    // Logs sur les données de formule avant/après mise à jour
    logger.debug(`[CRMStore] Original formula:`, JSON.stringify(originalFormula));
    // Analyse détaillée des changements dans la séquence
    if (data.sequence) {
        logger.debug(`[CRMStore] Sequence update detected: ${originalFormula?.sequence?.length || 0} items => ${data.sequence.length} items`);
        
        if (originalFormula?.sequence) {
          const oldIds = originalFormula.sequence.map((item: Record<string, unknown>) => item.id);
          const newIds = data.sequence.map((item: Record<string, unknown>) => item.id);
          
          const addedIds = newIds.filter((id: string) => !oldIds.includes(id));
          const removedIds = oldIds.filter((id: string) => !newIds.includes(id));
          
          if (addedIds.length > 0) {
            logger.debug(`[CRMStore] Added items: ${addedIds.length}`, addedIds);
          }
          if (removedIds.length > 0) {
            logger.debug(`[CRMStore] Removed items: ${removedIds.length}`, removedIds);
          }
        }
    }

    // 🔍 SUPER DEBUG: Examiner la formule originale et les données de mise à jour
    logger.debug(`[CRMStore][updateFormula] 📊 Formule originale:`, originalFormula ? {
      id: originalFormula.id,
      name: originalFormula.name,
      sequenceLength: originalFormula.sequence?.length || 0,
      targetProperty: originalFormula.targetProperty
    } : 'NON TROUVÉE');
    
    // 🔍 SUPER DEBUG: Examiner les données de mise à jour
    logger.debug(`[CRMStore][updateFormula] 📝 Données de mise à jour:`, {
      id: data.id,
      name: data.name,
      sequenceLength: data.sequence?.length || 0,
      targetProperty: data.targetProperty,
      isSequenceArray: Array.isArray(data.sequence)
    });
    
    // Création des données de formule mise à jour
    const updatedFormulaData = originalFormula ? { 
      ...originalFormula, 
      ...data,
      // CRUCIAL: S'assurer que l'ID est préservé exactement tel quel
      id: originalFormula.id 
    } : undefined;
    
    // Validation des données de formule avant mise à jour
    if (!updatedFormulaData || !updatedFormulaData.id) {
      logger.error(`[CRMStore][updateFormula] ❌ Données de formule invalides après fusion:`, updatedFormulaData);
      throw new Error("Données de formule invalides après fusion");
    }
    
    // 🔍 SUPER DEBUG: Examiner la formule après fusion
    logger.debug(`[CRMStore][updateFormula] 🔄 Formule après fusion:`, {
      id: updatedFormulaData.id,
      name: updatedFormulaData.name,
      sequenceLength: updatedFormulaData.sequence?.length || 0,
      targetProperty: updatedFormulaData.targetProperty
    });
    
    // BUGFIX: Vérification supplémentaire de la séquence après fusion
    if (updatedFormulaData.sequence) {
      logger.debug(`[CRMStore][updateFormula] 🔬 Vérification finale de la séquence fusionnée (${updatedFormulaData.sequence.length} items)`);
      // Vérifier et réparer les éventuels items sans ID
      updatedFormulaData.sequence = updatedFormulaData.sequence.map((item: unknown, idx: number) => {
        if (!item.id) {
          logger.warn(`[CRMStore][updateFormula] 🔧 Item sans ID détecté à l'index ${idx}, génération d'un ID de secours`);
          return { ...item, id: `temp-seq-item-${Date.now()}-${idx}` };
        }
        return item;
      });
    }
    
    // Si nous mettons à jour une séquence, vérifier l'intégrité
    if (data.sequence) {
      logger.debug(`[CRMStore][updateFormula] 🧩 Séquence mise à jour: ${originalFormula?.sequence?.length || 0} items => ${data.sequence.length} items`);
      
      // 🔍 SUPER DEBUG: Examiner chaque élément de la nouvelle séquence
      data.sequence.forEach((item: unknown, idx: number) => {
        // Correction automatique des items sans ID
        if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
          logger.warn(`[CRMStore][updateFormula] 🛠 Correction de l'item ${idx} sans ID valide`);
          item.id = `auto-gen-id-${Date.now()}-${idx}`;
        }
      });
    }

    // Mise à jour optimiste du state
    logger.debug(`[CRMStore][updateFormula] 🔄 Mise à jour optimiste de l'état...`);
    set(state => {
      const newBlocks = state.blocks.map(block => ({
        ...block,
        sections: block.sections.map(section => ({
          ...section,
          fields: section.fields.map((f) => {
            if (f.id === fieldId) {
              return {
                ...f,
                formulas: f.formulas ? f.formulas.map(formula =>
                  formula.id === formulaId ? { ...formula, ...data } : formula
                ) : []
              };
            }
            return f;
          }),
        })),
      }));
      return { blocks: newBlocks };
    });

    try {
      // Loggons exactement ce qui est envoyé à l'API
      logger.debug(`[CRMStore][updateFormula] 📡 ENVOI API - Données envoyées à l'API:`, {
        url: `/api/formulas/${formulaId}`,
        method: 'PUT',
        dataToSend: {
          id: updatedFormulaData.id,
          name: updatedFormulaData.name, 
          nameIncluded: updatedFormulaData.hasOwnProperty('name'),
          sequenceLength: updatedFormulaData.sequence?.length || 0,
          targetProperty: updatedFormulaData.targetProperty
        }
      });
      
      const dataToSend = JSON.stringify(updatedFormulaData);
      logger.debug(`[CRMStore][updateFormula] 📤 JSON brut envoyé:`, dataToSend);
      
      const res = await fetchWithAuth(`/api/formulas/${formulaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: dataToSend,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la mise à jour de la formule");
      }

      const finalFormulas = await res.json();
      
      logger.debug(`[CRMStore][updateFormula] ✅ Réponse API réussie:`, 
        Array.isArray(finalFormulas) ? 
          finalFormulas.map(f => ({ id: f.id, name: f.name, sequenceLength: f.sequence?.length || 0 })) : 
          finalFormulas
      );
      
      set(state => {
        const newBlocks = state.blocks.map(block => ({
          ...block,
          sections: block.sections.map(section => ({
            ...section,
            fields: section.fields.map((f) => {
              if (f.id === fieldId) {
                return {
                  ...f,
                  formulas: Array.isArray(finalFormulas) ? finalFormulas : 
                    (f.formulas ? f.formulas.map(formula =>
                      formula.id === formulaId ? { ...formula, ...data } : formula
                    ) : [])
                };
              }
              return f;
            }),
          })),
        }));
        return { blocks: newBlocks };
      });

    } catch (err: unknown) {
      toast.error(err.message);
      logger.error('[CRMStore] updateFormula API error:', err);
      
      // 🚨 RÉCUPÉRATION: Restauration complète de l'état
      logger.debug(`[CRMStore][updateFormula] 🔄 Erreur détectée, restauration de l'état précédent...`);
      
      // Analyse de l'état avant restauration
      const statePrevRestore = get();
      const fieldFormulasBeforeRestore = statePrevRestore.blocks
        .flatMap(b => b.sections)
        .flatMap(s => s.fields)
        .find(f => String(f.id) === String(fieldId))?.formulas || [];
      
      logger.debug(`[CRMStore][updateFormula] 📊 État des formules AVANT restauration:`, 
        fieldFormulasBeforeRestore.map(f => ({
          id: f?.id || 'MANQUANT', 
          typeId: typeof f?.id,
          nom: f?.name || 'SANS NOM',
          sequenceLength: f?.sequence?.length || 0,
          estLaFormuleCible: f?.id === formulaId ? '✓ OUI' : '✗ NON'
        }))
      );
      
      // Analyse de l'état qui sera restauré
      const fieldFormulasAfterRestore = stateBeforeUpdate.blocks
        .flatMap(b => b.sections)
        .flatMap(s => s.fields)
        .find(f => String(f.id) === String(fieldId))?.formulas || [];
        
      logger.debug(`[CRMStore][updateFormula] 📊 État des formules APRÈS restauration:`, 
        fieldFormulasAfterRestore.map(f => ({
          id: f?.id || 'MANQUANT', 
          typeId: typeof f?.id,
          nom: f?.name || 'SANS NOM',
          sequenceLength: f?.sequence?.length || 0,
          estLaFormuleCible: f?.id === formulaId ? '✓ OUI' : '✗ NON'
        }))
      );
      
      // Restaurer l'état
      set({ blocks: stateBeforeUpdate.blocks });
      logger.debug(`[CRMStore][updateFormula] ✅ Restauration effectuée`);
      
      throw err; 
    }
  },

  createFormula: async (fieldId, formulaData) => {
    try {
      if (!fieldId) {
        throw new Error("ID du champ manquant pour la création de la formule");
      }
      
      // S'assurer que le fieldId est inclus dans les données de la formule
      const dataToSend = { ...formulaData, fieldId };
      
      logger.debug(`[createFormula] Création de formule pour le champ ${fieldId}:`, dataToSend);
      
      const res = await fetchWithAuth(`/api/fields/${fieldId}/formulas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la création de la formule");
      }
      const updatedFormulas = await res.json();
      
      // S'assurer que toutes les formules ont leur fieldId
      const enhancedFormulas = ensureFormulasHaveFieldId(updatedFormulas, fieldId);
      const newFormula = enhancedFormulas.find((f: Record<string, unknown>) => f.name === formulaData.name); // Heuristique pour retrouver la nouvelle formule

      set(state => {
        const newBlocks = state.blocks.map(block => ({
          ...block,
          sections: block.sections.map(section => ({
            ...section,
            fields: section.fields.map((f) => {
              if (String(f.id) === String(fieldId)) {
                return { ...f, formulas: enhancedFormulas };
              }
              return f;
            }),
          })),
        }));
        return { blocks: newBlocks };
      });
      toast.success("Formule créée avec succès !");
      return newFormula || null;
    } catch (err: unknown) {
      toast.error(err.message);
      logger.error('[CRMStore] createFormula error:', err);
      return null;
    }
  },

  deleteFormula: async (formulaId) => {
    logger.debug(`[CRMStore][deleteFormula] 🚀 DÉBUT - Suppression de la formule ${formulaId}`);
    
    // On sauvegarde l'état pour pouvoir le restaurer en cas d'erreur
    const stateBeforeUpdate = get();
    let fieldId: string | null = null;

    // On cherche le fieldId AVANT toute modification
    stateBeforeUpdate.blocks.forEach((b, bIndex) => b.sections.forEach((s, sIndex) => s.fields.forEach((f) => {
        if (f.formulas?.some(form => form.id === formulaId)) {
            fieldId = f.id;
            logger.debug(`[CRMStore][deleteFormula] ✓ Formule trouvée dans: blocks[${bIndex}].sections[${sIndex}].fields[id=${f.id}].formulas`);
            
            // Debugging: Afficher la formule trouvée
            const formula = f.formulas.find(form => form.id === formulaId);
            if (formula) {
                logger.debug(`[CRMStore][deleteFormula] 📋 Détails de la formule:`, {
                    id: formula.id,
                    name: formula.name,
                    fieldId: formula.fieldId || f.id,
                    hasSequence: !!formula.sequence,
                    sequenceLength: formula.sequence?.length
                });
            }
        }
    })));

    if (!fieldId) {
        const msg = "Formule non trouvée pour ce champ. Impossible de la supprimer.";
        logger.error(`[CRMStore][deleteFormula] ❌ ${msg}`);
        
        // Analyse approfondie pour comprendre pourquoi la formule n'est pas trouvée
        logger.debug(`[CRMStore][deleteFormula] 🔍 Recherche approfondie de la formule ${formulaId}`);
        
        // Parcourir toutes les formules dans tous les champs pour trouver des indices
        type FormulaInfo = { formulaId: string; fieldId: string; formulaName: string };
        const allFormulas: FormulaInfo[] = [];
        stateBeforeUpdate.blocks.forEach(b => b.sections.forEach(s => s.fields.forEach(f => {
            if (f.formulas && f.formulas.length > 0) {
                allFormulas.push(...f.formulas.map(formula => ({ 
                    formulaId: formula.id, 
                    fieldId: f.id,
                    formulaName: formula.name
                })));
            }
        })));
        
        logger.debug(`[CRMStore][deleteFormula] 📊 Toutes les formules (${allFormulas.length}):`, 
            allFormulas.map(f => `${f.formulaId} (${f.formulaName}) - Champ: ${f.fieldId}`).join('\n')
        );
        
        // Vérifier si la formule existe dans un format légèrement différent (problème de type ou formatage)
        const similarFormulas = allFormulas.filter(f => 
            String(f.formulaId) === String(formulaId) || 
            f.formulaId.includes(formulaId) || 
            formulaId.includes(f.formulaId)
        );
        
        if (similarFormulas.length > 0) {
            logger.debug(`[CRMStore][deleteFormula] ⚠️ Formules similaires trouvées:`, similarFormulas);
            // Utiliser la première formule similaire
            fieldId = similarFormulas[0].fieldId;
            logger.debug(`[CRMStore][deleteFormula] 🔄 Utilisation du fieldId alternatif: ${fieldId}`);
        } else {
            toast.error(msg);
            return; // Terminer ici pour éviter un crash
        }
    }

    try {
      logger.debug(`[CRMStore][deleteFormula] 📡 Appel API DELETE /api/formulas/${formulaId}`);
      const res = await fetchWithAuth(`/api/formulas/${formulaId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const responseBody = await res.text();
        let errorMessage = `Erreur lors de la suppression (code: ${res.status})`;
        try {
          const err = JSON.parse(responseBody);
          errorMessage = err.error || errorMessage;
        } catch (e) {
          logger.error("Erreur non-JSON reçue du serveur:", responseBody);
          errorMessage = `Erreur du serveur: ${responseBody.substring(0, 100)}`;
        }
        throw new Error(errorMessage);
      }
      
      const updatedFormulas = await res.json();
      logger.debug(`[CRMStore][deleteFormula] ✅ Succès! Nombre de formules restantes: ${updatedFormulas.length}`);

      // On utilise le fieldId trouvé au début pour mettre à jour l'état
      const finalFieldId = fieldId; 
      set(state => {
        const newBlocks = state.blocks.map(block => ({
          ...block,
          sections: block.sections.map(section => ({
            ...section,
            fields: section.fields.map((f) => {
              if (String(f.id) === String(finalFieldId)) {
                return { ...f, formulas: updatedFormulas };
              }
              return f;
            }),
          })),
        }));
        return { blocks: newBlocks };
      });
      toast.success("Formule supprimée avec succès !");
    } catch (err: unknown) {
      toast.error(err.message);
      logger.error('[CRMStore] deleteFormula error:', err);
      // En cas d'erreur, on restaure l'état d'origine
      set({ blocks: stateBeforeUpdate.blocks });
      throw err;
    }
  },

  reorderFormulaSequence: async (formulaId, oldIndex, newIndex) => {
    const stateBeforeUpdate = get();
    let updatedFormula: unknown | undefined;
    let fieldId: string | undefined;

    // 1. Mise à jour optimiste de l'état local
    set(state => {
      const newBlocks = JSON.parse(JSON.stringify(state.blocks)); // Deep copy
      for (const block of newBlocks) {
        for (const section of block.sections) {
          for (const field of section.fields) {
            if (field.formulas) {
              const formulaIndex = field.formulas.findIndex((f: unknown) => f.id === formulaId);
              if (formulaIndex !== -1) {
                const formula = field.formulas[formulaIndex];
                if (formula.sequence) {
                  // Réorganiser la séquence
                  const item = formula.sequence.splice(oldIndex, 1)[0];
                  formula.sequence.splice(newIndex, 0, item);
                  updatedFormula = formula;
                  fieldId = field.id;
                }
              }
            }
          }
          if (updatedFormula) break;
        }
        if (updatedFormula) break;
      }
      return { blocks: newBlocks };
    });

    if (!updatedFormula) {
      logger.warn('[CRMStore] reorderFormulaSequence: Could not find formula to update in local state.');
      return;
    }

    // 2. Appel API
    try {
      const res = await fetchWithAuth(`/api/formulas/${formulaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: updatedFormula.sequence }), // On envoie seulement la séquence mise à jour
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur lors de la réorganisation de la formule" }));
        throw new Error(err.error);
      }

      const finalFormula = await res.json();

      // 3. Mise à jour finale avec la réponse du serveur (facultatif mais plus sûr)
      set(state => {
        const newBlocks = JSON.parse(JSON.stringify(state.blocks));
        if (!fieldId) return { blocks: newBlocks };

        for (const block of newBlocks) {
          for (const section of block.sections) {
            for (const field of section.fields) {
              if (field.id === fieldId && field.formulas) {
                const formulaIndex = field.formulas.findIndex((f: unknown) => f.id === formulaId);
                if (formulaIndex !== -1) {
                  field.formulas[formulaIndex] = finalFormula;
                }
              }
            }
          }
        }
        return { blocks: newBlocks };
      });

    } catch (err: unknown) {
      // 4. Rollback en cas d'erreur
      toast.error(err.message || "La réorganisation a échoué. Restauration...");
      logger.error('[CRMStore] reorderFormulaSequence API error:', err);
      set({ blocks: stateBeforeUpdate.blocks });
      throw err;
    }
  },

  addItemsToFormulaSequence: async (fieldId, formulaId, items, index) => {
    logger.debug(`[CRMStore][addItemsToFormulaSequence] 🚀 DÉBUT - Ajout d'items à la formule ${formulaId} du champ ${fieldId}`, {
      items: items.map(item => ({ id: item.id, type: item.type, label: item.label || item.value })),
      insertionIndex: index
    });
    
    // Tracer la pile d'appels pour voir d'où vient l'appel
    logger.debug(`[CRMStore][addItemsToFormulaSequence] 🔍 TRACE - Stack:`, new Error().stack?.split('\n').slice(0, 10).join('\n'));
    
    // ⚠️ VALIDATION CRITIQUE: Vérifier que l'ID de formule est valide avant tout traitement
    if (!formulaId || typeof formulaId !== 'string' || formulaId.trim() === '') {
      logger.error(`[CRMStore][addItemsToFormulaSequence] 🚨 ERREUR FATALE: ID de formule invalide: "${formulaId}" (${typeof formulaId})`);
    }
    
    const stateBeforeUpdate = get();
    let updatedFormula: unknown | undefined;
    
    // 📊 ANALYSE: Récupérer toutes les formules du champ avant modification
    const fieldFormulasBeforeUpdate = stateBeforeUpdate.blocks
      .flatMap(b => b.sections)
      .flatMap(s => s.fields)
      .find(f => String(f.id) === String(fieldId))?.formulas || [];
    
    logger.debug(`[CRMStore][addItemsToFormulaSequence] 📊 État des formules AVANT modification:`, 
      fieldFormulasBeforeUpdate.map(f => ({
        id: f?.id || 'MANQUANT', 
        typeId: typeof f?.id,
        nom: f?.name || 'SANS NOM',
        sequenceLength: f?.sequence?.length || 0,
        estLaFormuleCible: f?.id === formulaId ? '✓ OUI' : '✗ NON'
      }))
    );

    // 🔍 SUPER DEBUG: Vérifier la validité des items à ajouter et générer des IDs stables
    items.forEach((item: unknown, idx: number) => {
      if (!item.id) {
        const newId = `temp-id-${Date.now()}-${idx}`;
        logger.debug(`[CRMStore][addItemsToFormulaSequence] 🔧 Génération d'ID pour l'item ${idx}: ${newId}`);
        item.id = newId;
      }
    });

    // 1. Mise à jour optimiste de l'état local
    set(state => {
      const newBlocks = JSON.parse(JSON.stringify(state.blocks)); // Deep copy
      
      // Recherche du champ et de la formule
      for (const block of newBlocks) {
        for (const section of block.sections) {
          for (const field of section.fields) {
            if (String(field.id) === String(fieldId) && field.formulas) {
              const formulaIndex = field.formulas.findIndex((f: unknown) => f.id === formulaId);
              if (formulaIndex !== -1) {
                // Mettre à jour le fieldId explicitement dans la formule
                if (!field.formulas[formulaIndex].fieldId) {
                  field.formulas[formulaIndex].fieldId = fieldId;
                }
                
                // Initialiser la séquence si elle n'existe pas
                if (!field.formulas[formulaIndex].sequence) {
                  field.formulas[formulaIndex].sequence = [];
                }
                
                // Ajouter les items à l'index spécifié
                const sequence = field.formulas[formulaIndex].sequence;
                sequence.splice(index, 0, ...items);
                updatedFormula = field.formulas[formulaIndex];
                
                logger.debug(`[CRMStore][addItemsToFormulaSequence] ✅ Items ajoutés à la séquence, nouvelle longueur: ${sequence.length}`);
                break;
              }
            }
          }
          if (updatedFormula) break;
        }
        if (updatedFormula) break;
      }
      
      return { blocks: newBlocks };
    });

    // Si pas de formule trouvée, on termine ici
    if (!updatedFormula) {
      logger.error(`[CRMStore][addItemsToFormulaSequence] ❌ Formule non trouvée: ${formulaId}`);
      toast.error("Impossible d'ajouter les éléments à la formule (non trouvée)");
      return;
    }
    
    // S'assurer que updatedFormula a son fieldId pour la référence future
    updatedFormula.fieldId = fieldId;
    
    // 2. Mise à jour via l'API
    try {
      const res = await fetchWithAuth(`/api/formulas/${formulaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sequence: updatedFormula.sequence,
          fieldId: fieldId // Inclure explicitement le fieldId
        }),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur lors de la mise à jour de la séquence" }));
        throw new Error(err.error);
      }
      
      const finalFormula = await res.json();
      // S'assurer que la formule retournée a son fieldId
      const finalFormulaWithFieldId = { ...finalFormula, fieldId };
      
      // 3. Mise à jour finale avec la réponse du serveur
      set(state => {
        const newBlocks = state.blocks.map(block => ({
          ...block,
          sections: block.sections.map(section => ({
            ...section,
            fields: section.fields.map(f => {
              if (String(f.id) === String(fieldId)) {
                return {
                  ...f,
                  formulas: f.formulas ? f.formulas.map((formula: Record<string, unknown>) =>
                    formula.id === formulaId ? finalFormulaWithFieldId : formula
                  ) : []
                };
              }
              return f;
            }),
          })),
        }));
        return { blocks: newBlocks };
      });
      
      logger.debug(`[CRMStore][addItemsToFormulaSequence] ✅ Mise à jour API réussie pour la formule ${formulaId}`);
      
    } catch (err: unknown) {
      // Rollback en cas d'erreur
      toast.error(err.message || "L'ajout des éléments a échoué");
      logger.error('[CRMStore][addItemsToFormulaSequence] API error:', err);
      set({ blocks: stateBeforeUpdate.blocks });
    }
  },

  moveFormulaItem: async (fieldId, formulaId, fromIndex, toIndex) => {
    const stateBeforeUpdate = get();
    let updatedFormula: unknown | undefined;
    
    logger.debug(`[CRMStore][moveFormulaItem] 🚀 Déplacement de l'item de l'index ${fromIndex} vers ${toIndex} dans la formule ${formulaId} (champ: ${fieldId})`);
    
    // Mise à jour optimiste
    set(state => {
      const newBlocks = JSON.parse(JSON.stringify(state.blocks)); // Deep copy
      
      // Recherche de la formule et déplacement de l'item
      for (const block of newBlocks) {
        for (const section of block.sections) {
          for (const field of section.fields) {
            if (String(field.id) === String(fieldId) && field.formulas) {
              const formula = field.formulas.find((f: Record<string, unknown>) => f.id === formulaId);
              if (formula && formula.sequence) {
                // S'assurer que la formule a son fieldId
                formula.fieldId = fieldId;
                
                // Déplacer l'item
                const item = formula.sequence.splice(fromIndex, 1)[0];
                formula.sequence.splice(toIndex, 0, item);
                updatedFormula = formula;
                break;
              }
            }
          }
          if (updatedFormula) break;
        }
        if (updatedFormula) break;
      }
      
      return { blocks: newBlocks };
    });
    
    if (!updatedFormula) {
      logger.error(`[CRMStore][moveFormulaItem] ❌ Formule ${formulaId} non trouvée pour le champ ${fieldId}`);
      toast.error("Impossible de trouver la formule pour le déplacement");
      return;
    }
    
    try {
      // Mise à jour via l'API
      const res = await fetchWithAuth(`/api/formulas/${formulaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sequence: updatedFormula.sequence,
          fieldId // Inclure explicitement le fieldId
        }),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur lors du déplacement de l'élément" }));
        throw new Error(err.error);
      }
      
      // La mise à jour optimiste est déjà faite, pas besoin de mettre à jour à nouveau
      logger.debug(`[CRMStore][moveFormulaItem] ✅ Mise à jour API réussie pour la formule ${formulaId}`);
      
    } catch (err: unknown) {
      toast.error(err.message || "Le déplacement a échoué");
      logger.error('[CRMStore][moveFormulaItem] API error:', err);
      // Rollback en cas d'erreur
      set({ blocks: stateBeforeUpdate.blocks });
    }
  },

  deleteFormulaSequenceItem: async (fieldId, formulaId, index) => {
    logger.debug(`[CRMStore][deleteFormulaSequenceItem] 🚀 DÉBUT - Suppression de l'élément à l'index ${index} de la formule ${formulaId} (champ ${fieldId})`);
    
    // Sauvegarder l'état pour pouvoir le restaurer en cas d'erreur
    const stateBeforeUpdate = get();
    let updatedFormula: unknown | undefined;
    
    // Validation des paramètres
    if (!formulaId || typeof formulaId !== 'string') {
      logger.error(`[CRMStore][deleteFormulaSequenceItem] ❌ ID de formule invalide: ${formulaId}`);
      toast.error("ID de formule invalide");
      return;
    }

    if (!fieldId || typeof fieldId !== 'string') {
      logger.error(`[CRMStore][deleteFormulaSequenceItem] ❌ ID de champ invalide: ${fieldId}`);
      toast.error("ID de champ invalide");
      return;
    }

    if (isNaN(index) || index < 0) {
      logger.error(`[CRMStore][deleteFormulaSequenceItem] ❌ Index invalide: ${index}`);
      toast.error("Index invalide pour la suppression");
      return;
    }
    
    // Rechercher la formule et modifier sa séquence (mise à jour optimiste)
    set(state => {
      const newBlocks = JSON.parse(JSON.stringify(state.blocks)); // Deep copy
      
      // Recherche du champ et de la formule
      for (const block of newBlocks) {
        for (const section of block.sections) {
          for (const field of section.fields) {
            if (String(field.id) === String(fieldId) && field.formulas) {
              const formula = field.formulas.find((f: Record<string, unknown>) => f.id === formulaId);
              if (formula && formula.sequence) {
                // S'assurer que la formule a son fieldId
                formula.fieldId = fieldId;
                
                // Vérifier que l'index est valide
                if (index >= formula.sequence.length) {
                  logger.error(`[CRMStore][deleteFormulaSequenceItem] ❌ Index hors limites: ${index} (max: ${formula.sequence.length - 1})`);
                  return state; // Ne rien modifier
                }
                
                // Supprimer l'élément à l'index spécifié
                const itemToRemove = formula.sequence[index];
                logger.debug(`[CRMStore][deleteFormulaSequenceItem] 🗑️ Élément à supprimer:`, itemToRemove);
                
                formula.sequence = [
                  ...formula.sequence.slice(0, index),
                  ...formula.sequence.slice(index + 1)
                ];
                
                updatedFormula = formula;
                logger.debug(`[CRMStore][deleteFormulaSequenceItem] ✅ Élément supprimé localement, nouvelle séquence (${formula.sequence.length} éléments)`);
                break;
              }
            }
          }
          if (updatedFormula) break;
        }
        if (updatedFormula) break;
      }
      
      return { blocks: newBlocks };
    });
    
    // Si pas de formule trouvée, on termine ici
    if (!updatedFormula) {
      logger.error(`[CRMStore][deleteFormulaSequenceItem] ❌ Formule ${formulaId} non trouvée pour le champ ${fieldId}`);
      toast.error("Impossible de trouver la formule pour la suppression");
      return;
    }
    
    try {
      // Construction de l'URL pour l'API de suppression d'élément de séquence
      logger.debug(`[CRMStore][deleteFormulaSequenceItem] 📡 Appel API pour supprimer l'élément à l'index ${index}`);
      
      const apiUrl = `/api/fields/${fieldId}/formulas/${formulaId}/sequence/${index}`;
      logger.debug(`[CRMStore][deleteFormulaSequenceItem] 🔗 URL API: ${apiUrl}`);
      
      // Appel à l'API
      const res = await fetchWithAuth(apiUrl, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
      });
      
      if (!res.ok) {
        // Gestion des erreurs de l'API
        const errorText = await res.text();
        let errorMessage = `Erreur lors de la suppression (code: ${res.status})`;
        try {
          const err = JSON.parse(errorText);
          errorMessage = err.error || errorMessage;
        } catch (e) {
          logger.error(`[CRMStore][deleteFormulaSequenceItem] Erreur non-JSON reçue:`, errorText);
        }
        throw new Error(errorMessage);
      }
      
      // Récupérer les formules mises à jour depuis la réponse
      const updatedFormulas = await res.json();
      logger.debug(`[CRMStore][deleteFormulaSequenceItem] ✅ Succès! Réponse API reçue avec ${Array.isArray(updatedFormulas) ? updatedFormulas.length : 'N/A'} formules`);
      
      // Mise à jour finale de l'état avec les données de l'API
      set(state => {
        const newBlocks = state.blocks.map(block => ({
          ...block,
          sections: block.sections.map(section => ({
            ...section,
            fields: section.fields.map(f => {
              if (String(f.id) === String(fieldId)) {
                return {
                  ...f,
                  formulas: Array.isArray(updatedFormulas) ? updatedFormulas : 
                    (f.formulas ? f.formulas.map(formula =>
                      formula.id === formulaId ? { 
                        ...formula, 
                        sequence: updatedFormula.sequence,
                        fieldId // S'assurer que le fieldId est toujours présent
                      } : formula
                    ) : [])
                };
              }
              return f;
            }),
          })),
        }));
        return { blocks: newBlocks };
      });
      
      // Notification de succès
      toast.success("Élément supprimé avec succès");
      
    } catch (err: unknown) {
      // En cas d'erreur, restaurer l'état d'origine
      toast.error(err.message || "La suppression a échoué");
      logger.error('[CRMStore][deleteFormulaSequenceItem] error:', err);
      set({ blocks: stateBeforeUpdate.blocks });
    }
  }
});

