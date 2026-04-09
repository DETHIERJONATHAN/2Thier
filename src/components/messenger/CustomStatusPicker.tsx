/**
 * 🟢 CustomStatusPicker — Set your custom status (sur chantier, en déplacement, etc.)
 */
import React, { useState } from 'react';
import { Modal, Input, Select, Button } from 'antd';

interface CustomStatusPickerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (status: string, emoji: string, expiresInMinutes?: number) => void;
  currentStatus?: string | null;
  currentEmoji?: string | null;
}

const PRESET_STATUSES = [
  { emoji: '🏗️', label: 'Sur chantier' },
  { emoji: '🚗', label: 'En déplacement' },
  { emoji: '☕', label: 'En pause' },
  { emoji: '🏠', label: 'Télétravail' },
  { emoji: '📞', label: 'En appel' },
  { emoji: '🤒', label: 'Absent - maladie' },
  { emoji: '🌴', label: 'En congé' },
  { emoji: '🔨', label: 'En travaux' },
  { emoji: '📐', label: 'En mesure' },
  { emoji: '💼', label: 'En réunion' },
  { emoji: '🍽️', label: 'Pause déjeuner' },
  { emoji: '🔇', label: 'Ne pas déranger' },
];

const DURATION_OPTIONS = [
  { value: 0, label: 'Indéfini' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 heure' },
  { value: 120, label: '2 heures' },
  { value: 240, label: '4 heures' },
  { value: 480, label: 'Aujourd\'hui' },
  { value: 1440, label: '24 heures' },
];

export const CustomStatusPicker: React.FC<CustomStatusPickerProps> = ({
  open,
  onClose,
  onSubmit,
  currentStatus,
  currentEmoji,
}) => {
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji || '🟢');
  const [statusText, setStatusText] = useState(currentStatus || '');
  const [duration, setDuration] = useState(0);

  const handlePreset = (emoji: string, label: string) => {
    setSelectedEmoji(emoji);
    setStatusText(label);
  };

  const handleSubmit = () => {
    onSubmit(statusText, selectedEmoji, duration || undefined);
    onClose();
  };

  const handleClear = () => {
    onSubmit('', '', undefined);
    onClose();
  };

  return (
    <Modal
      open={open}
      title="🟢 Définir un statut"
      onCancel={onClose}
      footer={[
        <Button key="clear" onClick={handleClear} danger>
          Effacer le statut
        </Button>,
        <Button key="cancel" onClick={onClose}>
          Annuler
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          Enregistrer
        </Button>,
      ]}
      destroyOnClose
    >
      <div className="space-y-4 mt-4">
        {/* Preset statuses */}
        <div>
          <p className="text-sm text-gray-500 mb-2">Statuts prédéfinis :</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_STATUSES.map(({ emoji, label }) => (
              <button
                key={label}
                onClick={() => handlePreset(emoji, label)}
                className={`px-3 py-1.5 rounded-full text-sm border cursor-pointer transition-all ${
                  statusText === label
                    ? 'bg-blue-50 border-blue-300 text-blue-600'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom status */}
        <div>
          <p className="text-sm text-gray-500 mb-2">Ou personnalisé :</p>
          <div className="flex gap-2">
            <Input
              value={selectedEmoji}
              onChange={e => setSelectedEmoji(e.target.value)}
              style={{ width: 60, textAlign: 'center', fontSize: 20 }}
              maxLength={4}
            />
            <Input
              value={statusText}
              onChange={e => setStatusText(e.target.value)}
              placeholder="Votre statut..."
              maxLength={100}
              className="flex-1"
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <p className="text-sm text-gray-500 mb-2">Durée :</p>
          <Select
            value={duration}
            onChange={setDuration}
            options={DURATION_OPTIONS}
            className="w-full"
          />
        </div>
      </div>
    </Modal>
  );
};

export default CustomStatusPicker;
