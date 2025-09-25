import React from 'react';
import { Button } from 'antd';
import { PlusOutlined, BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export const LeadsHeader: React.FC = () => {
  const navigate = useNavigate();

  const handleCreateLead = () => {
    navigate('/leads/new');
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
        <p className="text-gray-600 mt-1">Gestion des prospects et pipeline commercial</p>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Badge notifications */}
        <div className="relative">
          <BellOutlined className="text-xl text-gray-600" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1">
            3
          </span>
        </div>
        
        {/* Bouton créer lead */}
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleCreateLead}
          size="large"
        >
          Nouveau Lead
        </Button>
      </div>
    </div>
  );
};
