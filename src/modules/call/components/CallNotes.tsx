import React, { useState } from 'react';
import { Card, Input, Alert } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface CallNotesProps {
  leadId?: string;
}

export const CallNotes: React.FC<CallNotesProps> = ({ leadId }) => {
  const [notes, setNotes] = useState('');
  const [showWarning, setShowWarning] = useState(false);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNotes(value);
    setShowWarning(value.trim().length === 0);
  };

  return (
    <Card title="Notes d'appel (obligatoire)">
      {showWarning && (
        <Alert
          message="Notes obligatoires"
          description="Vous devez rédiger des notes avant de clôturer l'appel"
          type="warning"
          icon={<ExclamationCircleOutlined />}
          className="mb-4"
        />
      )}

      <div className="space-y-4">
        <TextArea
          placeholder="Notez ici le résumé de l'appel, les points importants, les objections, les prochaines étapes..."
          value={notes}
          onChange={handleNotesChange}
          rows={8}
          className={showWarning ? 'border-orange-300' : ''}
        />

        <div className="text-xs text-gray-500">
          💡 Conseils pour de bonnes notes :
          <ul className="mt-1 space-y-1">
            <li>• Résumez les besoins exprimés</li>
            <li>• Notez les objections et vos réponses</li>
            <li>• Indiquez les prochaines étapes convenues</li>
            <li>• Mentionnez l'attitude du prospect</li>
          </ul>
        </div>

        {/* Zone d'analyse IA */}
        {notes.length > 50 && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-2">
              🤖 Analyse IA en temps réel :
            </div>
            <div className="text-sm text-blue-700">
              {notes.includes('intéressé') && '✅ Sentiment positif détecté'}
              {notes.includes('budget') && ' • 💰 Budget mentionné'}
              {notes.includes('rdv') && ' • 📅 RDV évoqué'}
              {notes.includes('non') && ' • ⚠️ Objection détectée'}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
