import React from 'react';
import { Typography } from 'antd';

const { Title, Text } = Typography;

// Étendu pour couvrir les usages existants (description, actions, tags)
export interface PageHeaderProps {
  title: string;
  subtitle?: string; // alias historique
  description?: string; // certains écrans utilisent description
  icon?: React.ReactNode;
  extra?: React.ReactNode; // boutons / actions principales
  actions?: React.ReactNode; // zone actions dédiée
  tags?: React.ReactNode; // labels / badges
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  subtitle, 
  description,
  icon, 
  extra,
  actions,
  tags
}) => {
  return (
    <div className="mb-6 pb-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {icon && (
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg text-blue-600">
              {icon}
            </div>
          )}
          <div>
            <Title level={2} className="!mb-0">
              {title}
            </Title>
            {(subtitle || description) && (
              <Text type="secondary" className="text-base">
                {subtitle || description}
              </Text>
            )}
            {tags && <div className="mt-2 flex flex-wrap gap-2">{tags}</div>}
          </div>
        </div>
        {(extra || actions) && (
          <div className="flex items-center gap-3">
            {actions}
            {extra}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
