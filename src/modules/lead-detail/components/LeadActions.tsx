import React from 'react';
import { Card, Button, Space } from 'antd';
import { PhoneOutlined, CalendarOutlined, MailOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface LeadActionsProps {
  leadId?: string;
}

export const LeadActions: React.FC<LeadActionsProps> = ({ leadId }) => {
  const navigate = useNavigate();

  const handleCall = () => {
    navigate(`/leads/${leadId}/call`);
  };

  const handleSchedule = () => {
    navigate(`/leads/${leadId}/calendar`);
  };

  const handleEmail = () => {
    navigate(`/leads/${leadId}/email`);
  };

  const handleEdit = () => {
    navigate(`/leads/${leadId}/edit`);
  };

  return (
    <Card title="Actions rapides">
      <Space direction="vertical" size="middle" className="w-full">
        <Button 
          type="primary" 
          icon={<PhoneOutlined />} 
          size="large"
          block
          onClick={handleCall}
        >
          📞 Appeler
        </Button>
        
        <Button 
          icon={<CalendarOutlined />} 
          size="large"
          block
          onClick={handleSchedule}
        >
          📅 Planifier RDV
        </Button>
        
        <Button 
          icon={<MailOutlined />} 
          size="large"
          block
          onClick={handleEmail}
        >
          ✉️ Envoyer Email
        </Button>
        
        <Button 
          icon={<EditOutlined />} 
          size="large"
          block
          onClick={handleEdit}
        >
          ✏️ Modifier
        </Button>
      </Space>
    </Card>
  );
};
