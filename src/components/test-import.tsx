import React from 'react';
// Test d'importation
import FieldFormulasEditorNew from './formulas/FieldFormulasEditorNew';

const TestImport: React.FC = () => {
  return (
    <div>
      <h1>Test d'importation</h1>
      <FieldFormulasEditorNew fieldId="test-id" />
    </div>
  );
};

export default TestImport;
