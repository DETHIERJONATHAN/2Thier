import React from 'react';

interface DevisLayoutProps {
  children: React.ReactNode;
  saving?: boolean;
  errors?: Record<string, string | null>;
}

export const DevisLayout: React.FC<DevisLayoutProps> = ({ 
  children, 
  saving = false, 
  errors = {} 
}) => {
  const hasErrors = Object.entries(errors).some(([, msg]) => msg);

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white">
      <div className="space-y-4">
        {children}
      </div>
      
      {/* Affichage des erreurs */}
      {hasErrors && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <div className="text-sm text-red-600 font-medium mb-2">Erreurs détectées :</div>
          {Object.entries(errors).map(([fid, msg]) => msg ? (
            <div key={fid} className="text-sm text-red-600">• {msg}</div>
          ) : null)}
        </div>
      )}
      
      {/* Indicateur de sauvegarde */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        {saving ? 'Sauvegarde en cours...' : 'Autosave activé'}
      </div>
    </div>
  );
};
