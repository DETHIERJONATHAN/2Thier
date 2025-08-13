// src/components/FieldsPalette.tsx
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const FIELD_TYPES = [
  { type: 'text', label: 'Texte', icon: '🅰️' },
  { type: 'textarea', label: 'Zone de texte', icon: '📝' },
  { type: 'password', label: 'Mot de passe', icon: '🔒' },
  { type: 'number', label: 'Nombre', icon: '🔢' },
  { type: 'date', label: 'Date', icon: '📅' },
  { type: 'select', label: 'Liste déroulante', icon: '🔽' },
  { type: 'radio', label: 'Boutons radio', icon: '🔘' },
  { type: 'checkboxes', label: 'Cases à cocher', icon: '☑️' },
  { type: 'donnee', label: 'Donnée', icon: 'Σ' },
  { type: 'produit', label: 'Produit', icon: '🛒' },
  { type: 'image_admin', label: 'Image (admin)', icon: '🖼️' },
  { type: 'image_user', label: 'Image (utilisateur)', icon: '📷' },
  { type: 'fichier_user', label: 'Fichier (utilisateur)', icon: '📎' },
];

const DraggableField = ({ fieldType }: { fieldType: { type: string, label: string, icon: string } }) => {
  const {attributes, listeners, setNodeRef, transform} = useDraggable({
    id: `palette-field-${fieldType.type}`,
    data: {
      type: 'palette-field',
      fieldType: fieldType.type,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-2 p-2 bg-white rounded-lg shadow cursor-grab hover:bg-gray-50 transition-all"
    >
      <span className="text-xl">{fieldType.icon}</span>
      <span className="font-medium text-gray-700">{fieldType.label}</span>
    </div>
  );
};

const FieldsPalette = () => {
  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow-md h-full">
      <h3 className="mb-4 text-lg font-bold text-gray-800 border-b pb-2">Champs disponibles</h3>
      <p className="text-sm text-gray-600 mb-4">Glissez un champ et déposez-le dans une section.</p>
      <div className="space-y-3">
        {FIELD_TYPES.map(ft => (
          <DraggableField key={ft.type} fieldType={ft} />
        ))}
      </div>
    </div>
  );
};

export default FieldsPalette;
