import React from 'react';
import { Card, Statistic, Col } from 'antd';

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  color?: string;
  suffix?: string;
  precision?: number;
  loading?: boolean;
  span?: number;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  color = '#1890ff',
  suffix,
  precision,
  loading = false,
  span = 6
}) => {
  return (
    <Col span={span}>
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Statistic
              title={title}
              value={value}
              suffix={suffix}
              precision={precision}
              loading={loading}
              valueStyle={{ 
                color: color,
                fontSize: '24px',
                fontWeight: 'bold'
              }}
            />
          </div>
          {icon && (
            <div 
              className="flex items-center justify-center w-12 h-12 rounded-lg opacity-80"
              style={{ 
                backgroundColor: `${color}15`,
                color: color 
              }}
            >
              <div className="text-2xl">
                {icon}
              </div>
            </div>
          )}
        </div>
      </Card>
    </Col>
  );
};

export default StatCard;
