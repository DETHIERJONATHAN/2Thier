import React, { useState } from 'react';
import OracleHeader from './OracleHeader';
import OracleSidebar from './OracleSidebar';
import OracleContent from './OracleContent';

const OracleLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header sombre style Oracle */}
      <OracleHeader onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <div className="flex-1 flex">
        {/* Sidebar style Oracle avec animation */}
        <div 
          className={`
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'w-64' : 'w-0'}
            bg-[#312D2A]
            overflow-hidden
          `}
        >
          <OracleSidebar />
        </div>

        {/* Zone de contenu principale */}
        <div className="flex-1 overflow-hidden">
          <OracleContent />
        </div>
      </div>
    </div>
  );
};

export default OracleLayout;
