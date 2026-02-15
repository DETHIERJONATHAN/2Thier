// Sections du formulaire (FormSections) - gestion drag & drop, ajout/suppression/édition de section et de champ
import useCRMStore from '../../store';
import type { Section, Field } from '../../store/slices/types';
import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
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
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { GripVertical } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { Input, Select, Button, Space, Typography, Card, Switch, Tooltip, Dropdown } from 'antd';
import { PlusOutlined, DeleteOutlined, DownOutlined, MoreOutlined, MenuOutlined, ExclamationCircleOutlined, EditOutlined } from '@ant-design/icons';

// Types de section de base; la liste finale peut être enrichie dynamiquement
const BUILTIN_SECTION_TYPES = [
  { value: 'normal', label: 'Section' },
  { value: 'activity', label: 'Activité' },
];

import { iconForFieldType } from '../../utils/fieldTypeIcons';

type SelectedFieldRef = { sectionId: string | number; fieldId: string | number };

// Composant pour une section "sortable"
const SortableSection = ({ section, children, handleEditSectionName, editingSectionId, editingSectionName, setEditingSectionName, handleSaveSectionName, handleToggleSectionActive, toggleSection, openSections, handleRemoveSection, isSectionValid, onChangeType, onRenameType, onDeleteType, availableTypes, isBuiltinType }: { section: Section, children: React.ReactNode, handleEditSectionName: (id: string, name: string) => void, editingSectionId: string | null, editingSectionName: string, setEditingSectionName: (name: string) => void, handleSaveSectionName: (id: string) => void, handleToggleSectionActive: (id: string, active: boolean | undefined) => void, toggleSection: (id: string) => void, openSections: Record<string, boolean>, handleRemoveSection: (id: string) => void, isSectionValid: (s: Section) => boolean, onChangeType: (id: string, type: string) => void, onRenameType: (oldType: string) => void, onDeleteType: (type: string) => void, availableTypes: Array<{ value: string; label: string }>, isBuiltinType: (t?: string | null) => boolean }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(section.id), data: { type: 'section', section } });

  // Zone explicite de dépose pour l'ajout de champs (palette)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `section-drop-${section.id}`,
    data: { type: 'section', sectionId: String(section.id) },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 200 : 'auto',
  };

  const typeMenu = {
    items: [
      {
        key: 'rename',
        label: 'Renommer ce type',
        disabled: isBuiltinType(section.sectionType),
      },
      {
        key: 'delete',
        label: 'Supprimer ce type',
        danger: true,
        disabled: isBuiltinType(section.sectionType),
      },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'rename' && section.sectionType) onRenameType(section.sectionType);
      if (key === 'delete' && section.sectionType) onDeleteType(section.sectionType);
    },
  } as const;

  return (
    <div ref={setNodeRef} style={style} className={`sortable-section ${isDragging ? 'dragging' : ''}`}>
      <Card
        size="small"
        className="section-card"
        title={
          <Space size={8} align="center" wrap>
            <Button type="text" size="small" icon={<MenuOutlined />} {...attributes} {...listeners} style={{ cursor: 'grab' }} />
            {editingSectionId === String(section.id) ? (
              <Input
                size="small"
                value={editingSectionName}
                onChange={(e) => setEditingSectionName(e.target.value)}
                onBlur={() => handleSaveSectionName(String(section.id))}
                onPressEnter={() => handleSaveSectionName(String(section.id))}
                style={{ width: 220 }}
              />
            ) : (
              <>
                <Typography.Text strong className="section-title" onClick={(e) => { e.stopPropagation(); handleEditSectionName(String(section.id), section.name); }}>
                  {section.name}
                </Typography.Text>
                <span className="section-count-badge" aria-label={`Nombre de champs: ${(section.fields || []).length}`}>
                  {(section.fields || []).length}
                </span>
              </>
            )}
            {!isSectionValid(section) && (
              <Tooltip title="Certains champs obligatoires ne sont pas remplis">
                <ExclamationCircleOutlined style={{ color: '#f59e0b' }} />
              </Tooltip>
            )}
            <Select
              size="small"
              value={section.sectionType || 'normal'}
              onChange={(v) => onChangeType(String(section.id), v)}
              style={{ width: 160 }}
              options={[
                ...availableTypes.map(t => ({ label: t.label, value: t.value })),
                { label: '+ Nouveau type…', value: '__new__' },
              ]}
            />
            <Dropdown menu={typeMenu} trigger={['click']}>
              <Button size="small" type="text" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        }
        extra={
          <Space size={6}>
            <Tooltip title={section.active ? 'Désactiver' : 'Activer'}>
              <Switch size="small" checked={!!section.active} onChange={() => handleToggleSectionActive(String(section.id), section.active)} />
            </Tooltip>
            <Tooltip title="Supprimer la section">
              <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleRemoveSection(String(section.id)); }} />
            </Tooltip>
            <Button size="small" type="text" onClick={() => toggleSection(String(section.id))} icon={<DownOutlined rotate={openSections[String(section.id)] ? 180 : 0} />} />
          </Space>
        }
        styles={{
          header: { padding: '6px 10px' },
          body: {
            padding: openSections[String(section.id)] ? 10 : 0,
            display: openSections[String(section.id)] ? 'block' : 'none',
          },
        }}
      >
        <div ref={setDropRef} className={`section-drop-target ${isOver ? 'active' : ''}`}>
          {children}
          {section.fields.length === 0 && (
            <div className={`text-center text-gray-500 py-4 border-2 border-dashed rounded-md ${isOver ? 'bg-blue-50 border-blue-400' : ''}`}>
              Déposez des champs ici
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// Composant pour un champ "sortable"
const SortableField = ({ field, sectionId, isSelected, setSelectedField, onRemove }: { field: Field, sectionId: string, isSelected: boolean, setSelectedField: (f: SelectedFieldRef | null) => void, onRemove: (fieldId: string) => void }) => {
  // Accès aux compteurs méta pour ce champ
  const { fieldMetaCounts } = useCRMStore();
  const meta = fieldMetaCounts[field.id] || { formulas: field.formulas?.length || 0, validations: field.validations?.length || 0, dependencies: field.dependencies?.length || 0 };
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

  // Helpers d'affichage
  const widthLabel = (() => {
    const raw = field.width || '';
    if (!raw) return '1/1';
    // Normaliser quelques formats connus
    if (raw.startsWith('w-')) return raw.replace('w-', ''); // w-1/2 => 1/2
    if (['1/1','1/2','1/3','2/3','1/4','3/4'].includes(raw)) return raw;
    // Largeurs textuelles possibles
    const map: Record<string, string> = {
      full: '1/1',
      half: '1/2',
      quarter: '1/4',
      three_quarters: '3/4',
    };
    return map[raw] || raw;
  })();

  const typeIcon = iconForFieldType(field.type);

  const hasFormulas = meta.formulas > 0;
  const hasValidations = meta.validations > 0;
  const hasDependencies = meta.dependencies > 0;
  const isOptionsType = ['select', 'advanced_select', 'radio', 'checkbox', 'checkboxes'].includes(field.type);
  const hasOptions = isOptionsType && Array.isArray(field.options) && field.options.length > 0;
  const hasTableConfigured = field.type === 'tableau' && (
    (Array.isArray(field.options) && field.options.length > 0) ||
    (field.advancedConfig && Object.keys(field.advancedConfig).length > 0)
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`palette-field-item section-palette-item ${isSelected ? 'selected' : ''}`}
      data-type={field.type}
      onClick={() => setSelectedField({ sectionId, fieldId: field.id })}
      draggable="true"
      onDragStart={(e) => {
        e.dataTransfer.setData('field-id', field.id);
        e.dataTransfer.setData('field-label', field.label || field.id);
        e.dataTransfer.setData('field-value', field.id);
        e.dataTransfer.setData('formula-element-type', 'field');
        e.dataTransfer.setData('text/plain', `${field.label || field.id} (${field.type})`);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <div {...attributes} {...listeners} className="drag-handle" aria-label="Déplacer le champ">
        <Tooltip title="Déplacer le champ">
          <span><GripVertical size={14} /></span>
        </Tooltip>
      </div>
      <span className="field-icon" aria-hidden title={field.type}>{typeIcon}</span>
      <div className="section-field-main">
        <div className="section-field-title">
          <span className="field-label" title={field.label}>{field.label}</span>
          {field.required && <span className="field-required-asterisk">*</span>}
        </div>
        <div className="section-field-sub">
          <span className="field-type-text">{field.type}</span>
          <span className="field-dot">•</span>
          <span className="field-width">Largeur: {widthLabel}</span>
        </div>
      </div>
      <div className="field-indicators">
        {hasFormulas && (
          <Tooltip title={`${meta.formulas} formule(s)`}>
            <div className="field-indicator has-formulas">Σ</div>
          </Tooltip>
        )}
        {hasValidations && (
          <Tooltip title={`${meta.validations} validation(s)`}>
            <div className="field-indicator has-validations">✓</div>
          </Tooltip>
        )}
        {hasDependencies && (
          <Tooltip title={`${meta.dependencies} dépendance(s)`}>
            <div className="field-indicator has-dependencies">⇄</div>
          </Tooltip>
        )}
        {hasOptions && (
          <Tooltip title={`${field.options?.length ?? 0} option(s) définie(s)`}>
            <div className="field-indicator has-options">O</div>
          </Tooltip>
        )}
        {hasTableConfigured && (
          <Tooltip title="Tableau configuré">
            <div className="field-indicator has-table">T</div>
          </Tooltip>
        )}
        {field.required && (
          <Tooltip title="Champ requis">
            <div className="field-indicator required">!</div>
          </Tooltip>
        )}
      </div>
      <Tooltip title="Modifier le champ">
        <Button
          size="small"
          type="text"
          icon={<EditOutlined />}
          onClick={(e) => { e.stopPropagation(); setSelectedField({ sectionId, fieldId: field.id }); }}
        />
      </Tooltip>
      {field.isProtected ? (
        <Tooltip title="Champ protégé — suppression impossible">
          <span className="text-orange-500 text-sm px-1 cursor-not-allowed">🔒</span>
        </Tooltip>
      ) : (
        <Tooltip title="Supprimer le champ">
          <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); onRemove(field.id); }} />
        </Tooltip>
      )}
    </div>
  );
};


// Le bloc de test a été supprimé pour ne charger que les données réelles.

// Ajout des props pour la sélection de champ
const FormSections = ({ selectedField, setSelectedField }: { selectedField: SelectedFieldRef | null, setSelectedField: (f: SelectedFieldRef | null) => void }) => {
  const { blocks, addSectionToBlock, removeSectionFromBlock, updateSection, removeBlock, fetchBlocks, removeField, fetchFieldMetaCounts } = useCRMStore();
  const { currentOrganization } = useAuth();
  const { blockId: blockIdFromUrl } = useParams<{ blockId: string }>();
  const navigate = useNavigate(); // Ajout du hook de navigation
  const { get } = useAuthenticatedApi();

  // Icônes dynamiques depuis FieldType.config.icon
  const [typeIcons, setTypeIcons] = useState<Record<string, ReactNode>>({});
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await get<{ success?: boolean; data?: Array<{ name: string; config?: Record<string, unknown> }> } | Array<{ name: string; config?: Record<string, unknown> }>>('/api/field-types');
        let list: Array<{ name: string; config?: Record<string, unknown> }> = [];
        if (Array.isArray(resp)) list = resp;
        else if (resp && typeof resp === 'object' && 'data' in resp) list = (resp as { data?: Array<{ name: string; config?: Record<string, unknown> }> }).data || [];
        const icons: Record<string, ReactNode> = {};
        list.forEach(t => {
          const icon = t?.config && typeof t.config === 'object' ? (t.config as Record<string, unknown>)['icon'] as string : undefined;
          if (t.name) icons[t.name] = icon || iconForFieldType(t.name);
        });
        if (mounted) setTypeIcons(icons);
      } catch {
        // silencieux
      }
    })();
    return () => { mounted = false; };
  }, [get]);

  // L'état selectedBlockId est maintenant directement piloté par l'URL.
  const selectedBlockId = blockIdFromUrl;

  const [newSectionType, setNewSectionType] = useState('normal');
  const [newSectionName, setNewSectionName] = useState('');
  // pas de sous-type custom distinct; le comportement personnalisé est piloté par menuFieldId
  const [availableSectionTypes, setAvailableSectionTypes] = useState<Array<{ value: string; label: string }>>(BUILTIN_SECTION_TYPES);

  // Déterminer le block sélectionné le plus tôt possible pour éviter les accès avant initialisation
  const block = blocks.find(b => String(b.id) === selectedBlockId);

  console.log('[SectionsFormulaire] selectedBlockId:', selectedBlockId);
  console.log('[SectionsFormulaire] blocks.length:', blocks.length);
  console.log('[SectionsFormulaire] block found:', !!block);
  if (block) {
    console.log('[SectionsFormulaire] block sections:', block.sections?.length || 0);
  }

  // Synchroniser la liste avec les types déjà présents dans le block (sans doublons)
  useEffect(() => {
    const extras = (block?.sections || [])
      .map(s => (s.sectionType || '').trim())
      .filter(Boolean) as string[];
    setAvailableSectionTypes((prev) => {
      const base = [...prev];
      for (const v of extras) {
        if (!base.some(t => t.value === v)) base.push({ value: v, label: v });
      }
      // Dédupe par value
      const seen = new Set<string>();
      return base.filter(t => (seen.has(t.value) ? false : (seen.add(t.value), true)));
    });
  }, [block]);
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

  // Préchargement des meta-counts pour afficher immédiatement les badges formules/validations/dépendances
  useEffect(() => {
    if (!block) return;
    try {
      const fieldIds = block.sections.flatMap(s => s.fields.map(f => f.id));
      if (fieldIds.length === 0) return;
      const { fieldMetaCounts } = useCRMStore.getState();
      // Détecter si certains champs n'ont pas encore de meta ou si on veut rafraîchir globalement
      const missing = fieldIds.filter(id => !fieldMetaCounts[id]);
      if (missing.length > 0) {
        fetchFieldMetaCounts(fieldIds).catch(() => {/* silencieux */});
      }
    } catch { /* noop */ }
  }, [block, fetchFieldMetaCounts]);

  // L'ancien useEffect qui sélectionnait le premier block par défaut est supprimé.

  // Conserve l'état d'ouverture des sections lors d'un update du block
  useEffect(() => {
    if (block && Array.isArray(block.sections)) {
      setOpenSections(prev => {
        const next: Record<string, boolean> = { ...prev };
        // Ajoute les nouvelles sections, garde l'état des existantes
        block.sections.forEach(s => {
          if (!(String(s.id) in next)) next[String(s.id)] = false; // Par défaut fermées si nouvelles
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
  const handleRemoveField = async (fieldId: string) => {    // Vérifier si le champ est protégé
    const allFields = blocks.flatMap(b => (b.sections ?? []).flatMap(s => s.fields ?? []));
    const targetField = allFields.find(f => String(f.id) === String(fieldId));
    if (targetField?.isProtected) {
      toast.error('Ce champ est protégé et ne peut pas être supprimé. Retirez d\'abord la protection dans les paramètres du champ.');
      return;
    }
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

  const handleAddSection = useCallback(async () => {
    if (!block) return;
    let type = newSectionType;
    if (type === '__new__') {
      const typed = window.prompt('Nom du nouveau type de section :', '');
      if (!typed) return;
      type = typed.trim();
      setAvailableSectionTypes(prev => (prev.some(t => t.value === type) ? prev : [...prev, { value: type, label: type }]));
    }
    if (!type || !newSectionName.trim()) return alert('Type et nom requis');
    // On s'assure que l'ordre est bien défini
    const newOrder = block.sections.length;
    await addSectionToBlock(block.id, { name: newSectionName.trim(), type, order: newOrder });
    setNewSectionName('');
  }, [addSectionToBlock, block, newSectionName, newSectionType]);

  // Suppression d'une section
  const handleRemoveSection = async (sectionId: string) => {
    if (!block) return;

    const sectionToDelete = block.sections.find(s => String(s.id) === String(sectionId));
    if (!sectionToDelete) return;

    const confirmation = window.confirm(
      `Êtes-vous sûr de vouloir supprimer la section "${sectionToDelete.name}" ? ` +
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

  const handleChangeSectionType = async (sectionId: string, type: string) => {
    if (type === '__new__') {
      const typed = window.prompt('Nom du nouveau type de section :', '');
      if (!typed) return;
      const finalType = typed.trim();
      await updateSection(sectionId, { sectionType: finalType });
      setAvailableSectionTypes(prev => (prev.some(t => t.value === finalType) ? prev : [...prev, { value: finalType, label: finalType }]));
      return;
    }
    await updateSection(sectionId, { sectionType: type });
  };

  // Déterminer si un type est natif (non supprimable/renommable)
  const isBuiltinType = (t?: string | null) => !!t && BUILTIN_SECTION_TYPES.some(b => b.value === t);

  // Renommer un type personnalisé: applique à toutes les sections du block
  const handleRenameCustomType = async (oldType: string) => {
    if (!block) return;
    const proposed = window.prompt(`Nouveau nom pour le type « ${oldType} » :`, oldType);
    if (!proposed) return;
    const newType = proposed.trim();
    if (!newType) return;
    if (isBuiltinType(newType)) {
      alert('Ce nom est réservé à un type système.');
      return;
    }
    // Mettre à jour toutes les sections correspondantes
    const targets = (block.sections || []).filter(s => (s.sectionType || '') === oldType);
    for (const s of targets) {
      await updateSection(String(s.id), { sectionType: newType });
    }
    // Mettre à jour la liste des types dispo
    setAvailableSectionTypes(prev => {
      const withoutOld = prev.filter(t => t.value !== oldType);
      return withoutOld.some(t => t.value === newType) ? withoutOld : [...withoutOld, { value: newType, label: newType }];
    });
  };

  // Supprimer un type personnalisé: remplace par 'normal' sur toutes les sections
  const handleDeleteCustomType = async (type: string) => {
    if (!block) return;
    if (isBuiltinType(type)) return; // Sécurité
    const confirm = window.confirm(
      `Supprimer le type « ${type} » ?\nToutes les sections de ce type seront replacées en « Section ».`
    );
    if (!confirm) return;
    const targets = (block.sections || []).filter(s => (s.sectionType || '') === type);
    for (const s of targets) {
      await updateSection(String(s.id), { sectionType: 'normal' });
    }
    setAvailableSectionTypes(prev => prev.filter(t => t.value !== type));
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
                          <span className="mr-2">{typeIcons[field.type] || iconForFieldType(field.type)}</span>
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

          <div className="mb-3">
            <Typography.Text strong style={{ display: 'block', marginBottom: 6 }}>Créer une section</Typography.Text>
            <Space.Compact block size="small">
              <Input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Nom de la section"
                allowClear
                onPressEnter={() => handleAddSection()}
              />
              <Select
                value={newSectionType}
                onChange={setNewSectionType}
                style={{ width: 180 }}
                options={[
                  ...availableSectionTypes.map(t => ({ label: t.label, value: t.value })),
                  { label: '+ Nouveau type…', value: '__new__' },
                ]}
                size="small"
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSection} size="small">
                Ajouter section
              </Button>
            </Space.Compact>
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
                    onChangeType={handleChangeSectionType}
                    onRenameType={handleRenameCustomType}
                    onDeleteType={handleDeleteCustomType}
                    isBuiltinType={isBuiltinType}
                    availableTypes={availableSectionTypes}
                  >
                    <SortableContext items={(section.fields || []).map(f => f.id)} strategy={verticalListSortingStrategy}>
                      <ul className="space-y-1 mt-4 list-none p-0 m-0">
                        {(section.fields || []).map(field => (
                          <li key={field.id} className={deletingFieldId === field.id ? 'opacity-30' : ''}>
                            <SortableField 
                              field={field} 
                              sectionId={String(section.id)}
                              isSelected={selectedField?.fieldId === field.id}
                              setSelectedField={setSelectedField}
                              onRemove={handleRemoveField}
                            />
                          </li>
                        ))}
                      </ul>
                    </SortableContext>
                    {(section.fields || []).length === 0 && (
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
