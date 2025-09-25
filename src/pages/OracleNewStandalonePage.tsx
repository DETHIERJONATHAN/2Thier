import React from 'react';
import OracleNewHeader from '../components/oraclenew/OracleNewHeader';
import OracleNewDashboard from '../components/oraclenew/OracleNewDashboard';

const OracleNewStandalonePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#2B3E49]">
      <OracleNewHeader />
      <div className="max-w-7xl mx-auto">
        <OracleNewDashboard />
      </div>
    </div>
  );
};

export default OracleNewStandalonePage;
