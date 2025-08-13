// Sections du formulaire (FormSections) - gestion drag & drop, ajout/suppression/édition de section et de champ
import useCRMStore from '../../store';
import type { Section, Field } from '../../store/slices/types';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useParams, useNavigate } from 'react-router-dom';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CSS } from '@dnd-kit/utilities';
import { Bars3Icon } from '@heroicons/react/24/solid';
import { GripVertical, Trash2 } from 'lucide-react'; // Ajout de l'icône de poubelle

const SECTION_TYPES = [
  { value: 'normal', label: 'Section' },
  { value: 'activity', label: 'Activité' },
  // Possibilité d’ajouter d’autres genres dynamiquement
];

const FIELD_ICONS: Record<string, string> = {
  text: '🅰️',
  number: '🔢',
  date: '📅',
  select: '🔽',
};

// Composant pour une section "sortable"
const SortableSection = ({ section, children, handleEditSectionName, editingSectionId, editingSectionName, setEditingSectionName, handleSaveSectionName, handleToggleSectionActive, toggleSection, openSections, handleRemoveSection, isSectionValid }: { section: Section, children: React.ReactNode, handleEditSectionName: (id: string, name: string) => void, editingSectionId: string | null, editingSectionName: string, setEditingSectionName: (name: string) => void, handleSaveSectionName: (id: string) => void, handleToggleSectionActive: (id: string, active: boolean | undefined) => void, toggleSection: (id: string) => void, openSections: Record<string, boolean>, handleRemoveSection: (id: string) => void, isSectionValid: (s: Section) => boolean }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(section.id), data: { type: 'section', section } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 200 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className={`bg-gray-100 p-4 rounded-lg shadow-md ${isDragging ? 'shadow-2xl' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-grow gap-2">
            <button {...attributes} {...listeners} className="cursor-grab p-1 text-gray-500">
                <Bars3Icon className="h-6 w-6" />
            </button>
            {editingSectionId === String(section.id) ? (
                <input
                    type="text"
                    value={editingSectionName}
                    onChange={(e) => setEditingSectionName(e.target.value)}
                    onBlur={() => handleSaveSectionName(String(section.id))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveSectionName(String(section.id))}
                    className="input input-bordered input-sm"
                    autoFocus
                    onClick={e => e.stopPropagation()}
                />
            ) : (
                <h3 className="font-semibold text-lg cursor-pointer" onClick={(e) => { e.stopPropagation(); handleEditSectionName(String(section.id), section.name); }}>
                    {section.name}
                </h3>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full ${section.sectionType === 'activity' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
                {SECTION_TYPES.find(t => t.value === section.sectionType)?.label || section.sectionType}
            </span>
            {!isSectionValid(section) && <span className="ml-2 text-yellow-500" title="Certains champs obligatoires ne sont pas remplis">⚠️</span>}
        </div>
        <div className="flex items-center gap-1">
            <button
                className={`p-1 rounded text-white text-xs ${section.active ? 'bg-green-500' : 'bg-gray-400'}`}
                onClick={(e) => { e.stopPropagation(); handleToggleSectionActive(String(section.id), section.active); }}
                title={section.active ? "Désactiver" : "Activer"}
            >
                {section.active ? 'Actif' : 'Inactif'}
            </button>
            <button className="btn btn-sm btn-ghost text-red-500" onClick={(e) => { e.stopPropagation(); handleRemoveSection(String(section.id)); }}>
                <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={() => toggleSection(String(section.id))} className="p-1">
              <span className="transition-transform duration-200 transform" style={{ display: 'inline-block', transform: openSections[String(section.id)] ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>
        </div>
      </div>

      {openSections[String(section.id)] && (
        <div className="border-t pt-4 mt-4 min-h-[50px]">
          {children}
        </div>
      )}
    </div>
  );
};

// Composant pour un champ "sortable"
const SortableField = ({ field, sectionId, isSelected, setSelectedField, onRemove }: { field: Field, sectionId: string, isSelected: boolean, setSelectedField: (f: any) => void, onRemove: (fieldId: string) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: field.id, // Correction: Utiliser directement field.id
    data: {
      type: 'form-field',
      field: field,
      sectionId: sectionId, // On ajoute sectionId ici pour un accès plus simple
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`field-container p-2 border rounded-md mb-2 flex items-center ${isSelected ? 'bg-blue-100 border-blue-400' : 'bg-white'}`}
      onClick={() => setSelectedField({ sectionId, fieldId: field.id })}
      draggable="true"
      onDragStart={(e) => {
        console.log(`[FIELD_DRAG] Starting drag for field: ${field.id} (${field.label})`);
        // Stocker les données du champ pour le système de drag natif
        e.dataTransfer.setData('field-id', field.id);
        e.dataTransfer.setData('field-label', field.label || field.id);
        e.dataTransfer.setData('field-value', field.id); // Ajouter cette ligne
        e.dataTransfer.setData('formula-element-type', 'field'); // Ajouter cette ligne
        e.dataTransfer.setData('text/plain', `${field.label || field.id} (${field.type})`);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <div {...attributes} {...listeners} className="drag-handle cursor-move p-2">
        <GripVertical size={16} />
      </div>
      <div className="flex-grow">
        <label className="font-bold">{field.label}</label>
        <p className="text-sm text-gray-500">Type: {field.type} | ID: {field.id}</p>
      </div>
      <button 
        onClick={(e) => { 
          e.stopPropagation(); // Empêche la sélection du champ lors du clic sur la poubelle
          onRemove(field.id);
        }}
        className="btn btn-ghost btn-sm text-red-500 hover:bg-red-100 p-1 ml-2"
        title="Supprimer le champ"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};


// Le bloc de test a été supprimé pour ne charger que les données réelles.

// Ajout des props pour la sélection de champ
const FormSections = ({ selectedField, setSelectedField }: { selectedField: any, setSelectedField: (f: any) => void }) => {
  const { blocks, addSectionToBlock, removeSectionFromBlock, updateSection, removeBlock, fetchBlocks, removeField } = useCRMStore();
  const { currentOrganization } = useAuth();
  const { blockId: blockIdFromUrl } = useParams<{ blockId: string }>();
  const navigate = useNavigate(); // Ajout du hook de navigation

  // L'état selectedBlockId est maintenant directement piloté par l'URL.
  const selectedBlockId = blockIdFromUrl;

  const [newSectionType, setNewSectionType] = useState('normal');
  const [newSectionName, setNewSectionName] = useState('');
  const [customSectionType, setCustomSectionType] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [showDeleteFormModal, setShowDeleteFormModal] = useState(false);
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null); // ID du champ en cours de suppression
  const [isDeleting, setIsDeleting] = useState(false); // Nouvel état pour le verrouillage

  // Ajout : état d'ouverture/fermeture des sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Chargement dynamique des formulaires au montage et à chaque changement d'organisation
  useEffect(() => {
    const orgIdFromAuth = currentOrganization?.id;
    const orgIdFromStorage = localStorage.getItem('organizationId');

    // On vide les blocks existants pour éviter d'afficher les données d'une autre organisation
    useCRMStore.setState({ blocks: [] });

    // Priorité à l'ID du contexte d'authentification
    if (orgIdFromAuth && orgIdFromAuth !== 'all') {
      // Si le localStorage n'est pas synchronisé, on le met à jour.
      if (orgIdFromAuth !== orgIdFromStorage) {
        localStorage.setItem('organizationId', orgIdFromAuth);
      }
      fetchBlocks();
    } else {
      // Les blocks sont déjà vidés au début de l'effet.
    }
  }, [currentOrganization, fetchBlocks]);

  // L'ancien useEffect qui sélectionnait le premier block par défaut est supprimé.

  const block = blocks.find(b => String(b.id) === selectedBlockId);

  // Conserve l'état d'ouverture des sections lors d'un update du block
  useEffect(() => {
    if (block && Array.isArray(block.sections)) {
      setOpenSections(prev => {
        const next: Record<string, boolean> = { ...prev };
        // Ajoute les nouvelles sections, garde l'état des existantes
        block.sections.forEach(s => {
          if (!(String(s.id) in next)) next[String(s.id)] = true; // Par défaut ouvertes si nouvelles
        });
        // Supprime les sections disparues
        Object.keys(next).forEach(id => {
          if (!block.sections.some(s => String(s.id) === id)) {
            delete next[id];
          }
        });
        return next;
      });
    } else {
      setOpenSections({});
    }
  }, [block]);

  // Sélectionne le premier champ par défaut si aucun n'est sélectionné
  useEffect(() => {
    // Si aucun champ n'est sélectionné et qu'on a un bloc avec des sections et des champs
    if (!selectedField && block && block.sections && block.sections.length > 0) {
        const firstSectionWithFields = block.sections.find(s => s.fields && s.fields.length > 0);
        if (firstSectionWithFields) {
            const firstField = firstSectionWithFields.fields[0];
            // On met à jour l'état dans le composant parent
            setSelectedField({ sectionId: firstSectionWithFields.id, fieldId: firstField.id });
        }
    }
    // On ne veut exécuter ceci que lorsque le bloc change, et seulement si aucun champ n'est sélectionné.
  }, [block, selectedField, setSelectedField]);


  // La création de block est gérée ailleurs
  // const handleCreateBlock = async () => { ... };

  // Le sélecteur de block n'est plus dans ce composant
  // const handleSelectBlock = (e: React.ChangeEvent<HTMLSelectElement>) => { ... };

  // SUPPRESSION du DndContext local. Il est maintenant géré par FormulaireLayout.tsx
  /*
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    // ... toute la logique est maintenant dans FormulaireLayout.tsx
  }
  */


  // Suppression d’un champ
  const handleRemoveField = async (fieldId: string) => {
    const confirmed = window.confirm('Voulez-vous vraiment supprimer ce champ ? Cette action est irréversible.');
    if (!confirmed) {
      return;
    }

    // 1. Verrouiller l'UI et marquer le champ pour suppression
    setIsDeleting(true);
    setDeletingFieldId(fieldId);

    // On désélectionne le champ pour éviter un crash de rendu du panneau de détails.
    if (selectedField && selectedField.fieldId === fieldId) {
      setSelectedField(null);
    }

    // 2. Laisser React mettre à jour l'UI (passer en mode statique) avant de supprimer l'élément du store.
    // requestAnimationFrame est plus fiable que setTimeout(0) pour cela.
    requestAnimationFrame(async () => {
      try {
        await removeField(fieldId);
        toast.success('Champ supprimé avec succès !');
      } catch (error) {
        console.error(`Erreur lors de la suppression du champ ID: ${fieldId}`, error);
        toast.error('Erreur lors de la suppression du champ.');
      } finally {
        // 3. Déverrouiller l'UI à la fin
        setDeletingFieldId(null);
        setIsDeleting(false);
      }
    });
  };

  /* Suppression de l'ancienne logique de drop, maintenant gérée par dnd-kit dans le layout
  const handleSectionFieldDrop = async (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    const fieldType = e.dataTransfer.getData('fieldType');
    if (!fieldType || !block) return;

    const targetSection = block.sections.find(s => String(s.id) === sectionId);
    if (!targetSection) return;

    // Définir le nouvel ordre à la fin de la liste des champs existants
    const newOrder = targetSection.fields.length;

    try {
      await addFieldToSection(sectionId, { 
        type: fieldType, 
        label: `Nouveau champ ${fieldType}`,
        order: newOrder, // On envoie l'ordre au backend
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout du champ", error);
      alert("Impossible d'ajouter le champ.");
    }
  };
  */

  const handleAddSection = async () => {
    if (!block) return;
    const type = newSectionType === 'custom' ? customSectionType : newSectionType;
    if (!type || !newSectionName.trim()) return alert('Type et nom requis');
    // On s'assure que l'ordre est bien défini
    const newOrder = block.sections.length;
    await addSectionToBlock(block.id, { name: newSectionName.trim(), type, order: newOrder });
    setNewSectionName('');
    setCustomSectionType('');
  };

  // Suppression d'une section
  const handleRemoveSection = async (sectionId: string) => {
    if (!block) return;

    const sectionToDelete = block.sections.find(s => String(s.id) === String(sectionId));
    if (!sectionToDelete) return;

    const confirmation = window.confirm(
      `Êtes-vous sûr de vouloir supprimer la section \"${sectionToDelete.name}\" ? ` +
      `Cela supprimera également tous les champs, formules et validations associés de manière irréversible.`
    );

    if (confirmation) {
      try {
        await removeSectionFromBlock(block.id, sectionId);
        toast.success('Section supprimée avec succès !');
        // Optionnel: si le champ sélectionné appartenait à la section supprimée, le désélectionner
        if (selectedField && selectedField.sectionId === sectionId) {
          setSelectedField(null);
        }
      } catch (error) {
        console.error("Erreur lors de la suppression de la section:", error);
        toast.error('Erreur lors de la suppression de la section.');
        // L'erreur est déjà notifiée par le store
      }
    }
  };

  // Edition du nom de section
  const handleEditSectionName = (sectionId: string, currentName: string) => {
    setEditingSectionId(sectionId);
    setEditingSectionName(currentName);
  };
  const handleSaveSectionName = async (sectionId: string) => {
    await updateSection(sectionId, { name: editingSectionName });
    setEditingSectionId(null);
    setEditingSectionName('');
  };

  const handleToggleSectionActive = async (sectionId: string, currentStatus: boolean | undefined) => {
    await updateSection(sectionId, { active: !currentStatus });
  };

  const handleDeleteForm = async () => {
    if (!block) return;
    try {
      await removeBlock(String(block.id));
      setShowDeleteFormModal(false);
      navigate('/formulaires'); // Redirection après suppression
    } catch (error) {
      console.error("Erreur lors de la suppression du formulaire:", error);
      // La notification d'erreur est déjà gérée dans le store
    }
  };

  // Fonction pour toggle l'ouverture d'une section
  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Fonction pour savoir si une section est validée (tous les champs obligatoires sont présents ET (en mode builder) ont un label non vide)
  const isSectionValid = (section: Section) => {
    if (!Array.isArray(section.fields)) return false;
    // En mode builder, on considère qu'un champ est "rempli" s'il a un label non vide
    return section.fields.filter((f: Field) => f.required).every((f: Field) => f.label && f.label.trim() !== '');
  };

  // Vérifie si le champ sélectionné existe toujours dans le block courant
  useEffect(() => {
    if (selectedField && block && block.sections) {
      const section = block.sections.find(s => s.id === selectedField.sectionId);
      if (!section || !section.fields.find(f => f.id === selectedField.fieldId)) {
        setSelectedField(null);
      }
    }
  }, [selectedField, block, setSelectedField]);

  const renderStaticForm = () => (
    <div className="p-4 h-full overflow-y-auto opacity-50 pointer-events-none">
      {block && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{block.name}</h2>
            </div>
          </div>
          <div className="space-y-6">
            {block.sections?.map(section => (
              <div key={section.id} className="bg-gray-100 p-4 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{section.name}</h3>
                </div>
                <div className="border-t pt-4 mt-4">
                  <ul className="space-y-2 mt-4">
                    {section.fields?.map(field => (
                      <li
                        key={field.id}
                        className={`flex items-center justify-between p-2 rounded bg-white`}
                      >
                        <div className="flex items-center flex-grow gap-2">
                          <span className="mr-2">{FIELD_ICONS[field.type] || '📝'}</span>
                          <span>{field.label}</span>
                          {field.required && <span className="text-red-500 ml-2">*</span>}
                        </div>
                        {field.id === deletingFieldId && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="loading loading-spinner loading-xs"></div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const renderInteractiveForm = () => (
    <div className="p-4 h-full overflow-y-auto">
      {showDeleteFormModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Confirmation de suppression</h3>
            <p className="text-sm text-gray-700 mb-4">
              Êtes-vous sûr de vouloir supprimer ce formulaire ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteFormModal(false)}
                className="px-4 py-2 text-sm rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteForm}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {block ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{block?.name}</h2>
            </div>
          </div>

          <div className="mb-4">
            <label className="label">
              <span className="label-text">Nom de la section</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                className="input input-bordered flex-grow"
                placeholder="Entrez le nom de la section"
              />
              <select
                value={newSectionType}
                onChange={(e) => setNewSectionType(e.target.value)}
                className="select select-bordered w-32"
              >
                <option value="normal">Section</option>
                <option value="activity">Activité</option>
                <option value="custom">Personnalisé</option>
              </select>
              <button className="btn btn-primary" onClick={handleAddSection}>Ajouter Section</button>
            </div>
          </div>

          <div className="space-y-6">
            {block ? (
              <SortableContext items={block.sections.map(s => String(s.id))} strategy={verticalListSortingStrategy}>
                {block.sections.map(section => (
                  <SortableSection 
                    key={section.id} 
                    section={section}
                    handleEditSectionName={handleEditSectionName}
                    editingSectionId={editingSectionId}
                    editingSectionName={editingSectionName}
                    setEditingSectionName={setEditingSectionName}
                    handleSaveSectionName={handleSaveSectionName}
                    handleToggleSectionActive={handleToggleSectionActive}
                    toggleSection={toggleSection}
                    openSections={openSections}
                    handleRemoveSection={handleRemoveSection}
                    isSectionValid={isSectionValid}
                  >
                    <SortableContext items={section.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                      <ul className="space-y-2 mt-4">
                        {section.fields.map(field => (
                          <li key={field.id} className={deletingFieldId === field.id ? 'opacity-30' : ''}>
                            <SortableField 
                              field={field} 
                              sectionId={String(section.id)}
                              isSelected={selectedField?.fieldId === field.id}
                              setSelectedField={setSelectedField}
                              onRemove={handleRemoveField} // On passe la fonction ici
                            />
                          </li>
                        ))}
                      </ul>
                    </SortableContext>
                    {section.fields.length === 0 && (
                      <div className="text-center text-gray-500 py-4 border-2 border-dashed rounded-md">
                        Déposez des champs ici
                      </div>
                    )}
                  </SortableSection>
                ))}
              </SortableContext>
            ) : (
              <div className="text-center text-gray-500 py-10">
                <p>Aucun formulaire sélectionné.</p>
                <p>Veuillez sélectionner un formulaire dans la liste ou en créer un nouveau.</p>
              </div>
            )}
          </div>

        </>
      ) : (
        <div className="p-4 text-center text-gray-500">
          <p>Sélectionnez un formulaire pour commencer ou créez-en un nouveau.</p>
        </div>
      )}
    </div>
  );

  if (!block) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Sélectionnez un formulaire pour commencer ou créez-en un nouveau.</p>
      </div>
    );
  }

  return isDeleting ? renderStaticForm() : renderInteractiveForm();
};

export default FormSections;
