import React from 'react';
import OracleLayout from '../components/Oracle/OracleLayout';

const TestPage: React.FC = () => {
  return (
    <OracleLayout>
  {/* Page volontairement vide sous le header */}
  <div className="h-[66vh]" />
    </OracleLayout>
  );
};

export default TestPage;
