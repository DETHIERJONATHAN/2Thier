import React from 'react';
import { Input, Select, DatePicker, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface LeadsFiltersProps {
  filters: any;
  setFilters: (filters: any) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const LeadsFilters: React.FC<LeadsFiltersProps> = ({
  filters,
  setFilters,
  searchTerm,
  setSearchTerm
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
      <Space wrap size="middle" className="w-full">
        {/* Recherche intelligente */}
        <Input
          placeholder="Recherche intelligente (nom, société, email...)"
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: 300 }}
        />
        
        {/* Filtre par statut */}
        <Select
          placeholder="Statut"
          style={{ width: 150 }}
          value={filters.status}
          onChange={(value) => setFilters({ ...filters, status: value })}
          allowClear
        >
          <Option value="nouveau">Nouveau</Option>
          <Option value="contacte">Contacté</Option>
          <Option value="rendez-vous">RDV</Option>
          <Option value="propose">Proposition</Option>
          <Option value="gagne">Gagné</Option>
          <Option value="perdu">Perdu</Option>
        </Select>
        
        {/* Filtre par commercial */}
        <Select
          placeholder="Commercial"
          style={{ width: 150 }}
          value={filters.assignedTo}
          onChange={(value) => setFilters({ ...filters, assignedTo: value })}
          allowClear
        >
          <Option value="jonathan">Jonathan</Option>
          <Option value="marie">Marie</Option>
          <Option value="pierre">Pierre</Option>
        </Select>
        
        {/* Filtre par source */}
        <Select
          placeholder="Source"
          style={{ width: 150 }}
          value={filters.source}
          onChange={(value) => setFilters({ ...filters, source: value })}
          allowClear
        >
          <Option value="site-web">Site Web</Option>
          <Option value="facebook">Facebook</Option>
          <Option value="linkedin">LinkedIn</Option>
          <Option value="salon">Salon</Option>
          <Option value="referral">Référence</Option>
        </Select>
        
        {/* Filtre par date */}
        <RangePicker
          placeholder={['Date début', 'Date fin']}
          onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
        />
      </Space>
    </div>
  );
};
