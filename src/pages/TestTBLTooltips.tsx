import React from 'react';
import { HelpTooltip } from '../components/common/HelpTooltip';

/**
 * 🧪 PAGE DE TEST TBL TOOLTIPS
 * Pour tester rapidement si les tooltips fonctionnent
 */
const TestTBLTooltips: React.FC = () => {
  const testFields = [
    {
      id: 'test1',
      label: 'Consommation annuelle électricité',
      text_helpTooltipType: 'image',
      text_helpTooltipText: 'Ceci est un texte d\'aide pour la consommation',
      text_helpTooltipImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    },
    {
      id: 'test2', 
      label: 'Puissance compteur',
      text_helpTooltipType: 'both',
      text_helpTooltipText: 'Texte d\'aide pour la puissance du compteur',
      text_helpTooltipImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    },
    {
      id: 'test3',
      label: 'Champ sans tooltip',
      text_helpTooltipType: 'none'
    }
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">🧪 Test TBL Tooltips</h1>
      
      <div className="space-y-4">
        {testFields.map(field => (
          <div key={field.id} className="border p-4 rounded">
            <div className="flex items-center gap-2 mb-2">
              <strong>{field.label}</strong>
              
              {/* Test direct du composant HelpTooltip */}
              <HelpTooltip
                type={field.text_helpTooltipType as any}
                text={field.text_helpTooltipText}
                image={field.text_helpTooltipImage}
              />
            </div>
            
            <input 
              className="border p-2 w-full"
              placeholder={`Champ: ${field.label}`}
            />
            
            <div className="text-sm text-gray-500 mt-1">
              Tooltip: {field.text_helpTooltipType} 
              {field.text_helpTooltipType !== 'none' && ' ✅'}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-bold">Instructions :</h3>
        <ol className="list-decimal list-inside space-y-1 mt-2">
          <li>Tu devrais voir des icônes ℹ️ bleues à côté des 2 premiers champs</li>
          <li>Passe ta souris dessus pour voir le tooltip</li>
          <li>Le 3ème champ ne devrait PAS avoir d'icône (type: none)</li>
        </ol>
      </div>
    </div>
  );
};

export default TestTBLTooltips;