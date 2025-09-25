import React from 'react';

export interface Field {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  width?: string;
  options?: Array<{ id: string; label: string; value?: string }>;
  config?: Record<string, unknown> | null;
  advancedConfig?: Record<string, unknown> | null; // Compatibilité
}

export interface Section {
  id: string;
  label: string;
  fields: Field[];
}

interface DevisSectionProps {
  section: Section;
  formData: Record<string, unknown>;
  onFieldChange: (fieldId: string, value: unknown) => void;
  children: React.ReactNode;
}

export const DevisSection: React.FC<DevisSectionProps> = ({ 
  section, 
  children 
}) => {
  return (
    <div className="devis-section p-4">
      <div className="grid">
        {children}
      </div>
    </div>
  );
};
