import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  DevisLayout, 
  DevisSection, 
  DevisField, 
  useDevisLogic,
  type Section 
} from '../components/devis';

const DevisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const devisId = searchParams.get('id') || undefined;
  
  const {
    sections,
    formData,
    errors,
    saving,
    loading,
    handleFieldChange
  } = useDevisLogic({ devisId });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <DevisLayout saving={saving} errors={errors}>
      {sections.map((section: Section) => (
        <DevisSection 
          key={section.id} 
          section={section} 
          formData={formData}
          onFieldChange={handleFieldChange}
        >
          {section.fields.map((field) => (
            <DevisField
              key={field.id}
              field={field}
              value={formData[field.id]}
              onChange={(value) => handleFieldChange(field.id, value)}
            />
          ))}
        </DevisSection>
      ))}
    </DevisLayout>
  );
};

export default DevisPage;
