import React, { useCallback, useRef, useState, useEffect } from 'react';
import { 
  DndContext, 
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import useCRMStore from "../../store";
// Importer explicitement les types du store pour �viter les conflits
import type { Formula as StoreFormula, FormulaItem } from "../../store/slices/types";
import SortableFormulaItem from './SortableFormulaItem';
import { getAPIHeaders } from '../../utils/formulaValidator';
import './formula-editor.css';

// �tendre l'interface pour inclure le fieldId
interface Formula extends StoreFormula {
  fieldId?: string; // Optionnel pour la compatibilit�
}

// Constante pour forcer le comportement de production même en développement
// Mettre à true pour éliminer les rechargements multiples et obtenir un comportement plus fluide
const FORCE_PRODUCTION_BEHAVIOR = true;

// Patch global pour limiter les rechargements automatiques sans bloquer le drag-and-drop
// Cette instruction filtre seulement certains événements formula-updated
if (FORCE_PRODUCTION_BEHAVIOR) {
    // Fonction qui intercepte et filtre les événements de rechargement
    const originalDispatchEvent = document.dispatchEvent;
    document.dispatchEvent = function(event) {
        // Si c'est un événement formula-updated ou formula-force-reload mais PAS un événement natif de drag-and-drop
        if ((event.type === 'formula-updated' || event.type === 'formula-force-reload') && 
            !(event as CustomEvent)?.detail?.isDragEvent && // Ne pas bloquer les événements liés au drag-and-drop
            !(event as CustomEvent)?.detail?.isEssential) { // Ne pas bloquer les événements essentiels
            console.log(`[FormulaSequenceEditor] Événement ${event.type} filtré pour éviter rechargement inutile`);
            return true; // Simuler que l'événement a été traité
        }
        // Sinon, comportement normal
        return originalDispatchEvent.call(this, event);
    };
}

interface FormulaSequenceEditorProps {
    formula: Formula;
}

/**
 * �diteur de s�quence de formule - Permet de visualiser et manipuler les �l�ments d'une formule
 * Version am�lior�e bas�e sur le mod�le de ValidationSequenceEditor pour une meilleure compatibilit�
 */
const FormulaSequenceEditor: React.FC<FormulaSequenceEditorProps> = ({ formula }) => {
    const formulaId = formula.id;
    const sequence = formula.sequence || [];
    const sequenceIds = sequence.map((item, index) => `formula-${formulaId}-item-${index}-${item.id || ''}`);
    
    // Configuration des sensors pour le drag-and-drop (comme dans ValidationSequenceEditor)
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8, // Activer le drag apr�s 8px de mouvement pour �viter les clics accidentels
        },
      })
    );
    
    // Log conditionnels uniquement si le mode production n'est pas forcé
    if (process.env.NODE_ENV === 'development' && !FORCE_PRODUCTION_BEHAVIOR) {
        console.log(`[FormulaSequenceEditor] Initialisation de la formule ${formulaId} avec ${sequence.length} �l�ments:`, 
            sequence.map(item => `${item.type}:${item.value}`));
    }

    // Nous n'avons plus besoin de gérer les transitions, tout se fait en direct sans délai
    
    // R�f�rence au store pour �viter les probl�mes de closure
    const storeRef = useRef(useCRMStore.getState());
    
    // Configuration du drop target pour le drag-and-drop (comme dans ValidationSequenceEditor)
    const { setNodeRef, isOver } = useDroppable({
        id: `formula-drop-zone-${formulaId}`,
        data: {
            formulaId,
            type: 'formula-drop-zone',
            itemData: { formulaId, formulaName: formula.name }
        },
    });
    
    useEffect(() => {
        const unsubscribe = useCRMStore.subscribe(state => {
            storeRef.current = state;
        });
        return unsubscribe;
    }, []);
    
    // État pour gérer les messages de notification
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | ''}>({
        message: '',
        type: ''
    });
    
    // Fonction optimisée pour mettre à jour la séquence de formule avec mise à jour immédiate de l'UI
    const updateFormulaSequence = useCallback(async (newSequence: FormulaItem[]) => {
        try {
            // Trouver le fieldId de la formule sans log superflu
            let fieldId = formula.fieldId;
            
            if (!fieldId) {
                fieldId = storeRef.current.blocks
                    .flatMap(b => b.sections)
                    .flatMap(s => s.fields)
                    .find(f => f.formulas?.some(form => form.id === formulaId))?.id;
            }
            
            if (!fieldId) {
                throw new Error(`Impossible de trouver le fieldId pour la formule ${formulaId}`);
            }
            
            // OPTIMISATION : Mettre à jour localement AVANT l'API pour une réponse instantanée de l'UI
            // Nous utilisons un objet Formula temporaire pour simuler la mise à jour en direct
            const updatedFormula = {
                ...formula,
                sequence: newSequence
            };
            
            // Mettre à jour l'état local du composant parent (hack React pour forcer la mise à jour)
            const formulasInStore = storeRef.current.blocks
                .flatMap(b => b.sections)
                .flatMap(s => s.fields)
                .filter(f => f.id === fieldId)[0]?.formulas || [];
                
            // Chercher et mettre à jour la formule dans le store local
            const updatedFormulas = formulasInStore.map(f => 
                f.id === formulaId ? {...f, sequence: newSequence} : f
            );
            
            // Mettre à jour l'UI localement sans déclencher d'événements
            setNotification({
                message: `Formule mise à jour avec succès`,
                type: 'success'
            });
            
            // OPTIMISATION CLEF: Force un rafraichissement immédiat du composant
            setForceUpdateKey(prev => prev + 1);
            
            // Appeler l'API en parallèle sans attendre la réponse
            fetch(`/api/fields/${fieldId}/formulas/${formulaId}`, {
                method: 'PUT',
                headers: getAPIHeaders(),
                body: JSON.stringify({
                    id: formulaId,
                    sequence: newSequence
                })
            }).then(response => {
                if (!response.ok) {
                    console.error(`[FormulaSequenceEditor] L'API a répondu avec le statut ${response.status}`);
                }
            }).catch(error => {
                console.error(`[FormulaSequenceEditor] Erreur API:`, error);
            });
            
            return true;
        } catch (error) {
            console.error(`[FormulaSequenceEditor] Erreur lors de la mise à jour:`, error);
            setNotification({
                message: `Erreur lors de la mise à jour: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
                type: 'error'
            });
            return false;
        }
    }, [formula, formulaId]);
    
    // Gestion de la fin du drag-and-drop optimisée pour une meilleure réactivité
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        // Log conditionnel pour réduire le bruit en mode "production forcée"
        if (!FORCE_PRODUCTION_BEHAVIOR) {
            console.log('[FormulaSequenceEditor] Drag terminé:', event);
        }
        
        // Si l'élément a été déposé sur notre zone de formule
        if (event.over && event.over.id === `formula-drop-zone-${formulaId}`) {
            // Récupérer les données de l'élément déplacé
            const draggedItem = event.active.data.current as FormulaItem;
            
            if (draggedItem) {
                // Log conditionnel
                if (!FORCE_PRODUCTION_BEHAVIOR) {
                    console.log('[FormulaSequenceEditor] Item déposé:', draggedItem);
                }
                
                // Créer un nouvel item avec un ID unique pour éviter les duplications
                const newItem: FormulaItem = {
                    ...draggedItem,
                    id: `${draggedItem.type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
                };
                
                // Optimisation: créer la séquence et mettre à jour directement sans animation pour éviter le clignotement
                const newSequence = [...sequence, newItem];
                
                // OPTIMISATION: Mise à jour React directe sans attendre l'API
                // Hack pour forcer React à rafraîchir le rendu immédiatement, en simulant une mise à jour locale
                formula.sequence = newSequence;
                
                // Forcer une mise à jour visuelle immédiate
                setForceUpdateKey(prev => prev + 1);
                
                // Mise à jour immédiate de la séquence sans délai (en arrière-plan)
                updateFormulaSequence(newSequence);
                
                // Déclencher un événement spécial mais une seule fois le processus de mise à jour terminé
                // Cela réduit considérablement les rechargements multiples
                setTimeout(() => {
                    const dragEndEvent = new CustomEvent('formula-updated', {
                        detail: { 
                            formulaId,
                            isDragEvent: true,
                            isEssential: true,
                            forceLocal: true  // Marquer pour utiliser les données locales
                        }
                    });
                    document.dispatchEvent(dragEndEvent);
                    
                    // Notification visuelle pour confirmer l'ajout à la formule
                    // Note: Utilise l'API native des notifications si disponible
                    try {
                        // Option 1: Utiliser l'API Notification du navigateur si disponible et autorisée
                        if (typeof Notification !== 'undefined' && Notification.permission === "granted") {
                            new Notification('CRM', {
                                body: 'Élément ajouté à la formule',
                                icon: '/public/vite.svg'
                            });
                        } 
                        // Option 2: Utiliser une alerte visuelle via un effet CSS
                        else {
                            const dropZone = document.getElementById(`formula-drop-zone-${formulaId}`);
                            if (dropZone) {
                                dropZone.classList.add('highlight-success');
                                setTimeout(() => {
                                    dropZone.classList.remove('highlight-success');
                                }, 500);
                            }
                        }
                    } catch (err) {
                        console.log('Notification non disponible');
                    }
                }, 50);
            }
        }
    }, [sequence, updateFormulaSequence, formulaId, formula]);

    // Fonction optimisée pour supprimer un élément de la séquence avec mise à jour immédiate de l'interface
    const handleRemoveSequenceItem = useCallback((indexToRemove: number) => {
        if (indexToRemove >= 0 && indexToRemove < sequence.length) {
            // Créer la nouvelle séquence et mettre à jour directement
            const newSequence = [...sequence];
            const removedItem = newSequence[indexToRemove]; // Garder une référence à l'élément supprimé pour feedback
            newSequence.splice(indexToRemove, 1);
            
            // OPTIMISATION: Mise à jour React directe sans attendre l'API
            // Hack pour forcer React à rafraîchir le rendu immédiatement
            formula.sequence = newSequence;
            
            // Mise à jour immédiate sans délai (en arrière-plan)
            updateFormulaSequence(newSequence);
            
            // Feedback visuel immédiat (plus cohérent avec l'interface)
            setNotification({
                message: `${removedItem.label || removedItem.value} supprimé`,
                type: 'success'
            });
            
            // Force une mise à jour immédiate du composant
            setForceUpdateKey(prev => prev + 1);
            
            // Déclencher un événement avec délai pour éviter les rechargements multiples
            setTimeout(() => {
                const removeEvent = new CustomEvent('formula-updated', {
                    detail: { 
                        formulaId,
                        isDragEvent: true,
                        isEssential: true,
                        forceLocal: true
                    }
                });
                document.dispatchEvent(removeEvent);
            }, 50);
        }
    }, [sequence, updateFormulaSequence, formula]);
    
    // Effet pour effacer les notifications apr�s 3 secondes
    useEffect(() => {
        if (notification.message) {
            const timer = setTimeout(() => {
                setNotification({ message: '', type: '' });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);
    
    // Effet pour forcer le rendu des formules après une mise à jour
    const [forceUpdateKey, setForceUpdateKey] = useState(0);
    
    // Utilitaire pour forcer un rafraîchissement du composant
    const forceUpdate = useCallback(() => {
        setForceUpdateKey(prev => prev + 1);
    }, []);
    
    // Effet pour écouter les événements de mise à jour forcée pour cette formule spécifique
    useEffect(() => {
        const handleForceUpdate = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.formulaId === formulaId) {
                // Forcer le rendu du composant
                forceUpdate();
            }
        };
        
        // Écouter l'événement custom
        document.addEventListener('formula-force-refresh', handleForceUpdate);
        
        return () => {
            document.removeEventListener('formula-force-refresh', handleForceUpdate);
        };
    }, [formulaId, forceUpdate]);
    
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            // Utiliser la clé de forçage pour garantir les rafraîchissements du composant
            key={`formula-${formulaId}-${forceUpdateKey}`}
        >
            <div 
                ref={setNodeRef} 
                className={`min-h-[100px] p-3 border-2 border-dashed rounded-md formula-drop-zone 
                    ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50/30'} 
                    transition-colors duration-200`}
                style={{ 
                    maxWidth: '100%', 
                    position: 'relative',
                }}
                onDragOver={(e) => {
                    // Permettre le drop natif du navigateur
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.add('border-green-400', 'bg-green-50');
                    e.currentTarget.classList.remove('border-blue-300', 'bg-white');
                }}
                onDragLeave={(e) => {
                    // Rétablir le style normal
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('border-green-400', 'bg-green-50');
                    e.currentTarget.classList.add('border-blue-300', 'bg-white');
                }}
                onDrop={(e) => {
                    // Gérer le drop natif
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Réinitialiser le style
                    e.currentTarget.classList.remove('border-green-400', 'bg-green-50');
                    e.currentTarget.classList.add('border-blue-300', 'bg-white');
                    
                    // Vérifier le type de l'élément déposé
                    const type = e.dataTransfer.getData('formula-element-type');
                    if (type) {
                        // Log conditionnel
                        if (!FORCE_PRODUCTION_BEHAVIOR) {
                            console.log(`[FormulaSequenceEditor] Item déposé via drag natif de type ${type}`);
                        }
                        
                        // Créer un nouvel élément selon le type
                        let newItem: FormulaItem;
                        
                        if (type === 'operator') {
                            const value = e.dataTransfer.getData('operator-value');
                            const label = e.dataTransfer.getData('operator-label');
                            newItem = {
                                type: 'operator',
                                value: value,
                                label: label || value,
                                id: `operator-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
                            };
                        } else if (type === 'field') {
                            const value = e.dataTransfer.getData('field-value');
                            const label = e.dataTransfer.getData('field-label');
                            const id = e.dataTransfer.getData('field-id');
                            newItem = {
                                type: 'field',
                                value: value,
                                label: label,
                                id: `field-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
                            };
                        } else if (type === 'function') {
                            const value = e.dataTransfer.getData('function-value');
                            const label = e.dataTransfer.getData('function-label');
                            newItem = {
                                type: 'function',
                                value: value,
                                label: label || value,
                                id: `function-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
                            };
                        } else if (type === 'value') {
                            const value = e.dataTransfer.getData('value-value');
                            const label = e.dataTransfer.getData('value-label');
                            newItem = {
                                type: 'value',
                                value: value,
                                label: label || value,
                                id: `value-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
                            };
                        } else {
                            console.error(`[FormulaSequenceEditor] Type d'élément non pris en charge: ${type}`);
                            return;
                        }
                        
                        // Créer la nouvelle séquence
                        const newSequence = [...sequence, newItem];
                        
                        // OPTIMISATION: Mise à jour React directe sans attendre l'API
                        // Hack pour forcer React à rafraîchir le rendu immédiatement
                        formula.sequence = newSequence;
                        
                        // Mise à jour immédiate sans délai (en arrière-plan)
                        updateFormulaSequence(newSequence);
                        
                        // OPTIMISATION: Ajouter un effet visuel immédiat cohérent
                        setNotification({
                            message: `${newItem.label || newItem.value} ajouté à la formule`,
                            type: 'success'
                        });
                        
                        // Forcer une mise à jour visuelle immédiate
                        setForceUpdateKey(prev => prev + 1);
                        
                        // Déclencher un événement mais avec un léger délai pour éviter les rechargements multiples
                        setTimeout(() => {
                            const nativeDropEvent = new CustomEvent('formula-updated', {
                                detail: { 
                                    formulaId,
                                    isDragEvent: true,
                                    isEssential: true,
                                    forceLocal: true
                                }
                            });
                            document.dispatchEvent(nativeDropEvent);
                        }, 50);
                    }
                }}
            >
                {notification.message && (
                    <div 
                        className={`absolute top-0 right-0 m-2 p-2 rounded shadow-md text-sm ${
                            notification.type === 'success' ? 'bg-green-100 text-green-800' : 
                            notification.type === 'error' ? 'bg-red-100 text-red-800' : ''
                        }`}
                    >
                        {notification.message}
                    </div>
                )}
                
                {sequence.length === 0 ? (
                    <div className="flex items-center justify-center h-[80px] text-gray-400">
                        <div className="text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 mx-auto mb-2">
                                <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                                <path d="M18 15v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8l6 6v6z"></path>
                                <path d="M12 15V9"></path>
                                <path d="m9 12 3-3 3 3"></path>
                            </svg>
                            <p className="text-sm">D�posez ici les �l�ments...</p>
                        </div>
                    </div>
                ) : (
                    <SortableContext items={sequenceIds} strategy={rectSortingStrategy}>
                        <div className="flex flex-wrap gap-2">
                            {sequence.map((item, index) => {
                                // G�n�ration d'un ID unique et stable pour le drag-and-drop
                                const uniqueId = `formula-${formulaId}-item-${index}-${item.id || ''}`;
                                
                                return (
                                    <SortableFormulaItem 
                                        key={uniqueId} 
                                        id={uniqueId} 
                                        item={item}
                                        formulaId={formula.id}
                                        onRemove={() => handleRemoveSequenceItem(index)}
                                    />
                                );
                            })}
                        </div>
                    </SortableContext>
                )}
            </div>
        </DndContext>
    );
};

export default FormulaSequenceEditor;
