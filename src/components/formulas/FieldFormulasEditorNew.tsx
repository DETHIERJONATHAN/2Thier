import React, { useState, useEffect, useCallback } from 'react';
import useCRMStore from '../../store';
import type { Formula as StoreFormula } from '../../store/slices/types';
import FormulaItemEditor from './FormulaItemEditor';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import { getAPIHeaders } from '../../utils/formulaValidator';
import { logger } from '../../lib/logger';

// Étendre l'interface pour inclure le fieldId
interface Formula extends StoreFormula {
  fieldId?: string; // Optionnel pour éviter les erreurs de type
}

interface FieldFormulasEditorNewProps {
  fieldId: string;
}

/**
 * Composant principal pour l'édition des formules d'un champ.
 * Gère la liste des formules, leur chargement depuis l'API et les actions CRUD.
 */
const FieldFormulasEditorNew: React.FC<FieldFormulasEditorNewProps> = ({ fieldId }) => {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openFormulaIds, setOpenFormulaIds] = useState<string[]>([]);
  
  const { fetchBlocks, createFormula: storeCreateFormula } = useCRMStore();
  
  // Recherche des formules dans le store global
  const findFieldAndFormulas = useCallback(() => {
    const blocks = useCRMStore.getState().blocks;
    logger.debug(`[DEBUG_STORE] Blocks from store:`, blocks.map(b => b.name));
    
    for (const block of blocks) {
      for (const section of block.sections) {
        const field = section.fields.find(f => f.id === fieldId);
        if (field) {
          logger.debug(`[DEBUG_STORE] Found field ${fieldId} with formulas:`, field.formulas?.length || 0);
          return field.formulas || [];
        }
      }
    }
    logger.debug(`[DEBUG_STORE] Field ${fieldId} not found in store blocks`);
    return [];
  }, [fieldId]);

  // Chargement des formules depuis l'API via le store, avec option de contournement direct de l'API
  const loadFormulas = useCallback(async (options?: { bypassStore?: boolean }): Promise<Formula[] | undefined> => {
    setLoading(true);
    setError(null);
    
    try {
      // Si demandé, contourner le store et aller directement chercher les formules via l'API
      if (options?.bypassStore) {
        logger.debug(`[FieldFormulasEditorNew] Chargement direct des formules depuis l'API pour le champ ${fieldId}`);
        
        // Utiliser l'utilitaire getAPIHeaders() du validateur de formule
        const headers = getAPIHeaders();
        
        // Essayer 2 fois avec un court délai entre les tentatives pour les suppressions
        let retries = 0;
        let formulasData: Formula[] = [];
        
        while (retries < 2) {
          try {
            const response = await fetch(`/api/fields/${fieldId}/formulas`, { 
              headers,
              // Forcer un rechargement frais depuis le serveur en ajoutant un paramètre aléatoire
              // pour éviter les problèmes de cache
              cache: 'no-cache'
            });
            
            if (!response.ok) {
              throw new Error(`Erreur HTTP ${response.status}`);
            }
            
            formulasData = await response.json() as Formula[];
            logger.debug(`[FieldFormulasEditorNew] API a retourné ${formulasData.length} formules:`, 
              formulasData.map((f: Formula) => f.id));
            
            // Si on a obtenu des données, on sort de la boucle
            break;
          } catch (apiError) {
            logger.error(`[FieldFormulasEditorNew] Tentative ${retries + 1} échouée:`, apiError);
            retries++;
            
            // Continuer sans délai pour le mode production
            if (retries < 2) {
              // Aucun délai en mode production
            }
          }
        }
        
        // Mise à jour de l'état avec les données obtenues
    type RawFormula = Formula & { fieldId?: string; targetFieldId?: string };
    const finalFormulas = (formulasData as RawFormula[])
          // Filtrage strict: ne garder que les formules explicitement liées à ce champ
          .filter(f => {
      const belongs = String(f.fieldId || f.targetFieldId) === String(fieldId);
            if(!belongs){
              if(process.env.NODE_ENV==='development'){
        logger.warn(`[FieldFormulasEditorNew] ⚠️ Formule ignorée (autre champ):`, { formulaId: f.id, fieldIdProp: f.fieldId, targetFieldId: f.targetFieldId, expected: fieldId });
              }
            }
            return belongs;
          })
          .map(formula => ({
            ...formula,
            targetProperty: formula.targetProperty || '', // **CORRECTIF : Garantir la présence de targetProperty**
            fieldId // Ajout explicite du fieldId à chaque formule
          }));
        setFormulas(finalFormulas);
        
        // Forcer également un rafraîchissement du store pour les prochaines requêtes
        try {
          await fetchBlocks();
        } catch (storeError) {
          logger.warn("[FieldFormulasEditorNew] Impossible de rafraîchir le store:", storeError);
        }
        
        return finalFormulas; // **CORRECTIF : Retourner les formules chargées**
      } else {
        logger.debug(`[FieldFormulasEditorNew] Chargement des formules via le store pour le champ ${fieldId}`);
        
        // Méthode standard via le store
        await fetchBlocks(); // Recharger les blocs pour avoir les données fraîches
        
        // Continuer sans délai en mode production
        
        const fieldFormulas = findFieldAndFormulas();
        logger.debug(`[FieldFormulasEditorNew] Store a retourné ${fieldFormulas.length} formules`, 
          fieldFormulas.map(f => ({ id: f.id, name: f.name })));
        
        // Si le store n'a pas retourné de formules, essayons directement l'API
        if (fieldFormulas.length === 0) {
          logger.warn(`[FieldFormulasEditorNew] Store vide, tentative de chargement direct depuis l'API...`);
          return loadFormulas({ bypassStore: true });
        }
        
        // Filtrage local au cas où le store contient des formules d'autres champs (défensif)
        const scoped = (fieldFormulas as (Formula & { fieldId?: string; targetFieldId?: string })[])
          .filter(f => String(f.fieldId || f.targetFieldId) === String(fieldId));
        if(scoped.length !== fieldFormulas.length){
          logger.warn(`[FieldFormulasEditorNew] ${fieldFormulas.length - scoped.length} formule(s) supprimée(s) car hors champ`, { fieldId });
        }
        setFormulas(scoped);
        return scoped; // **Retourner uniquement les formules scopées**
      }
    } catch (err) {
      setError("Impossible de charger les formules");
      logger.error(`[FieldFormulasEditorNew] Erreur de chargement des formules:`, err);
    } finally {
      setLoading(false);
    }
  }, [fieldId, fetchBlocks, findFieldAndFormulas]);

  useEffect(() => {
    const loadOnce = async () => {
      const loadedFormulas = await loadFormulas({ bypassStore: true });
      setOpenFormulaIds([]);
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[FieldFormulasEditorNew] ✅ Chargement initial formules:', loadedFormulas?.length || 0);
      }
    };
    loadOnce();
    
    // GESTION AMÉLIORÉE des événements de mise à jour de formule
  let reloadCount = 0; // compteur simple (plus de timeout en rafale)
    
    // Gestionnaire pour les événements de rechargement forcé
    const handleForceReload = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      
      // Vérifier que l'événement concerne bien notre fieldId
      const eventFieldId = detail?.fieldId;
      if (eventFieldId && eventFieldId !== fieldId) {
        logger.debug(`[AUDIT_PARENT] ⏭️ Ignorer l'événement de rechargement pour un autre champ: ${eventFieldId}`);
        return;
      }
      
      logger.debug(`[AUDIT_PARENT] 🔥 Événement formula-force-reload reçu: ${JSON.stringify(detail)}`);
      
      // Incrémenter le compteur de rechargement
      reloadCount++;
      const currentReloadCount = reloadCount;
      
      try {
        // Premier rechargement immédiat
        logger.debug(`[AUDIT_PARENT] 🔄 Premier rechargement forcé (${currentReloadCount})`);
        await loadFormulas({ bypassStore: true });
        
        // Continuer sans délai en mode production
        
        // Vérifier si un autre rechargement a été demandé entre-temps
        if (currentReloadCount === reloadCount) {
          logger.debug(`[AUDIT_PARENT] 🔄 Second rechargement forcé (${currentReloadCount})`);
          await loadFormulas({ bypassStore: true });
          logger.debug('[AUDIT_PARENT] ✅ Double rechargement forcé terminé avec succès');
        } else {
          logger.debug(`[AUDIT_PARENT] ⏩ Rechargement ${currentReloadCount} annulé, un plus récent est en cours`);
        }
      } catch (err) {
        logger.error(`[AUDIT_PARENT] ❌ Erreur lors du rechargement forcé:`, err);
      }
    };
    
    // Gestionnaire standard pour les événements de mise à jour
    const handleFormulaUpdated = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      
      logger.debug('[AUDIT_PARENT] 📣 Événement formula-updated reçu:', detail);
      
      // Traitement prioritaire pour les événements de drag-and-drop et essentiels
      if (detail?.isDragEvent || detail?.isEssential) {
        logger.debug(`[AUDIT_PARENT] ⚡ Événement prioritaire détecté (drag/essentiel)`);
        
        // Si l'événement est marqué comme forceLocal, on ne recharge pas du tout car la mise à jour est déjà faite localement
        if (detail?.forceLocal) {
          logger.debug(`[AUDIT_PARENT] ✅ Utilisation des données locales, pas de rechargement API`);
          
          // Vérifier si le formulaId est mentionné, dans ce cas s'assurer qu'il est ouvert
          if (detail?.formulaId) {
            setOpenFormulaIds(ids => {
              if (!ids.includes(detail.formulaId)) {
                logger.debug(`[AUDIT_PARENT] 📂 Ouverture automatique de la formule ${detail.formulaId}`);
                return [...ids, detail.formulaId];
              }
              return ids;
            });
          }
          
          return; // Ne pas continuer avec le traitement standard ni recharger
        }
        
        // Si on arrive ici, c'est qu'on doit recharger depuis l'API
        logger.debug(`[AUDIT_PARENT] 🔄 Rechargement depuis l'API`);
        await loadFormulas({ bypassStore: true });
        return; // Ne pas continuer avec le traitement standard
      }
      
      // Incrémenter le compteur de rechargement
      reloadCount++;
      const currentReloadCount = reloadCount;
      
      try {
        // Premier rechargement immédiat
        logger.debug(`[AUDIT_PARENT] 🔄 Premier rechargement standard (${currentReloadCount})`);
        const formulas = await loadFormulas({ bypassStore: true });
        
        // Réouvrir les formules qui étaient ouvertes avant le rechargement
        if (detail?.formulaId) {
          setOpenFormulaIds(ids => {
            if (!ids.includes(detail.formulaId)) {
              return [...ids, detail.formulaId];
            }
            return ids;
          });
        }
        
        // Vérifier les données chargées
        logger.debug(`[AUDIT_PARENT] ✓ Rechargement a retourné ${formulas?.length || 0} formules`);
        
        // Mode production: exécution immédiate sans délai
        // Vérifier si un autre rechargement a été demandé entre-temps
        if (currentReloadCount === reloadCount) {
          logger.debug(`[AUDIT_PARENT] 🔄 Second rechargement standard immédiat (${currentReloadCount})`);
          await loadFormulas({ bypassStore: true });
          logger.debug('[AUDIT_PARENT] ✅ Double rechargement standard terminé avec succès');
        } else {
          logger.debug(`[AUDIT_PARENT] ⏩ Rechargement ${currentReloadCount} annulé, un plus récent est en cours`);
        }
      } catch (err) {
        logger.error(`[AUDIT_PARENT] ❌ Erreur lors du rechargement standard:`, err);
      }
      
  // Si action=delete, traitement spécial avec mise à jour optimiste
      if (detail?.action === 'delete') {
        logger.debug('[AUDIT_PARENT] 🗑️ Suppression détectée');
        
        // Mise à jour optimiste locale pour une UI réactive
        if (detail?.formulaId && typeof detail?.index === 'number') {
          setFormulas(currentFormulas =>
            currentFormulas.map(f => {
              if (f.id === detail.formulaId) {
                // **CORRECTIF : S'assurer que sequence est un tableau avant de le manipuler**
                const currentSequence = Array.isArray(f.sequence) ? f.sequence : [];
                const newSequence = [...currentSequence];
                
                // S'assurer que l'index est valide avant de supprimer
                if (detail.index < newSequence.length) {
                  newSequence.splice(detail.index, 1);
                  logger.debug(`[AUDIT_PARENT] ✂️ Mise à jour optimiste. Nouvelle longueur: ${newSequence.length}`);
                }
                
                return { ...f, sequence: newSequence };
              }
              return f;
            })
          );
        }
        
        // Mode production: exécution immédiate sans délai
        logger.debug('[AUDIT_PARENT] 🔄 Rechargement immédiat depuis API après suppression...');
        try {
          // Recharger les formules et récupérer les données fraîches
          const reloadedFormulas = await loadFormulas({ bypassStore: true });
          
          logger.debug('[AUDIT_PARENT] ✅ Rechargement terminé.');
          
          // **CORRECTIF : Utiliser les données rechargées directement pour mettre à jour l'état ouvert**
          if (reloadedFormulas && reloadedFormulas.length > 0) {
            const reloadedFormulaIds = reloadedFormulas.map(f => f.id);
            logger.debug(`[AUDIT_PARENT] 📂 Maintien des formules ouvertes:`, reloadedFormulaIds);
            setOpenFormulaIds(reloadedFormulaIds);
          } else {
             logger.debug(`[AUDIT_PARENT] 📂 Aucune formule retournée, fermeture des éditeurs.`);
             setOpenFormulaIds([]);
          }

          } catch (err) {
            logger.error('[AUDIT_PARENT] ❌ Erreur lors du rechargement:', err);
          }
      } else {
        // Pour les autres actions (add, etc.), rechargement immédiat en mode production
        logger.debug(`[AUDIT_PARENT] 📝 Action ${detail?.action} détectée, rechargement immédiat`);
        await loadFormulas({ bypassStore: true });
      }
    };
    
    // Ajout des écouteurs d'événements
    document.addEventListener('formula-updated', handleFormulaUpdated);
    document.addEventListener('formula-force-reload', handleForceReload);
    
    return () => {
      // Nettoyage des écouteurs
      document.removeEventListener('formula-updated', handleFormulaUpdated);
      document.removeEventListener('formula-force-reload', handleForceReload);
    };
  }, [fieldId, loadFormulas]);

  // Création d'une nouvelle formule
  const handleAddFormula = async () => {
    try {
      if (!fieldId) {
        logger.error("Impossible de créer une formule: fieldId manquant");
        return;
      }
      
      const newFormulaData = {
        name: `Nouvelle formule ${formulas.length + 1}`,
        sequence: [],
        // **CORRECTIF : Initialiser targetProperty et s'assurer que fieldId est présent**
        targetProperty: '',
        fieldId: fieldId
      };

      const newFormula = await storeCreateFormula(fieldId, newFormulaData);
      
      if (newFormula) {
        // **CORRECTIF : Fusionner la réponse de l'API avec les données par défaut**
        // pour garantir que toutes les propriétés sont présentes.
        const completeFormula = {
          ...newFormulaData, // Contient targetProperty: ''
          ...newFormula,     // Contient l'ID et les autres champs de l'API
        };

        setFormulas([...formulas, completeFormula as Formula]);
        // Ouvrir automatiquement la nouvelle formule
        setOpenFormulaIds([...openFormulaIds, newFormula.id]);
      }
    } catch (err) {
      setError("Impossible de créer la formule");
      logger.error(err);
    }
  };

  // Suppression d'une formule
  const handleDeleteFormula = async (formulaId: string) => {
    try {
      // **CORRECTIF : Appel direct à l'API pour la suppression**
      const headers = getAPIHeaders();
      const response = await fetch(`/api/formulas/${formulaId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Erreur API lors de la suppression: ${response.statusText}`);
      }

      logger.debug(`[FieldFormulasEditorNew] Formule ${formulaId} supprimée avec succès via API.`);

      // Mise à jour de l'état local pour une réactivité immédiate
      setFormulas(formulas.filter(f => f.id !== formulaId));
      setOpenFormulaIds(openFormulaIds.filter(id => id !== formulaId));

      // Déclencher un rechargement global pour synchroniser le reste de l'application
      document.dispatchEvent(new CustomEvent('formula-force-reload', { detail: { fieldId } }));

    } catch (err) {
      setError("Impossible de supprimer la formule");
      logger.error(err);
    }
  };

  // Gestion de l'ouverture/fermeture des éditeurs de formule
  const toggleFormulaOpen = (formulaId: string) => {
    if (openFormulaIds.includes(formulaId)) {
      setOpenFormulaIds(openFormulaIds.filter(id => id !== formulaId));
    } else {
      setOpenFormulaIds([...openFormulaIds, formulaId]);
    }
  };

  // Mise à jour du nom d'une formule
  const handleUpdateFormula = (updatedFormula: Partial<Formula>) => {
    setFormulas(currentFormulas =>
      currentFormulas.map(f => {
        if (f.id === updatedFormula.id) {
          // **CORRECTIF : Fusionner l'ancienne et la nouvelle formule**
          // pour préserver toutes les propriétés comme targetProperty.
          return { ...f, ...updatedFormula };
        }
        return f;
      })
    );
  };

  return (
    <div className="bg-white shadow-sm rounded-md p-4">
      <h3 className="text-lg font-medium mb-4">Formules de calcul</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md mb-4 flex justify-between items-center">
          <div>{error}</div>
          <button 
            onClick={() => setError(null)} 
            className="text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {formulas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune formule n'est définie pour ce champ
            </div>
          ) : (
            formulas.map((formula) => (
              <div key={formula.id} className="border rounded-md">
                <FormulaItemEditor
                  formula={formula}
                  isExpanded={openFormulaIds.includes(formula.id)}
                  onToggleExpand={() => toggleFormulaOpen(formula.id)}
                  onDelete={() => handleDeleteFormula(formula.id)}
                  onUpdate={(updatedFormula) => handleUpdateFormula(updatedFormula as Formula)}
                  onFormulaChange={loadFormulas}
                />
              </div>
            ))
          )}
          
          <div className="mt-4">
            <button 
              onClick={handleAddFormula}
              className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 
                       rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 
                       hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <PlusCircleIcon className="h-5 w-5 mr-1" />
              Ajouter une formule
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldFormulasEditorNew;
