import React, { useState } from 'react';
import type { HTMLAttributes } from 'react';
import { Card, Badge } from 'antd';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';

export type DragHandleProps = {
  attributes?: HTMLAttributes<HTMLDivElement>;
  listeners?: HTMLAttributes<HTMLDivElement>;
};

type SectionCardProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badgeCount?: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  dragHandle?: DragHandleProps;
};

export default function SectionCard({
  title,
  description,
  icon,
  badgeCount,
  actions,
  children,
  defaultOpen = true,
  className,
  dragHandle
}: SectionCardProps) {
  const [open, setOpen] = useState<boolean>(defaultOpen);

  return (
    <Card className={className} styles={{ body: { paddingTop: open ? 16 : 0 } }}>
      {/* Header enrichi */}
      <div
        className="flex items-center justify-between cursor-pointer select-none flex-nowrap"
        onClick={() => setOpen(!open)}
        {...(dragHandle?.attributes || {})}
        {...(dragHandle?.listeners || {})}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center" onClick={(e)=>e.stopPropagation()}>
            {icon}
          </span>
          <div className="leading-tight">
            <div className="font-semibold text-lg">{title}</div>
            {description && (
              <div className="text-sm text-gray-500">{description}</div>
            )}
          </div>
          {typeof badgeCount === 'number' && (
            <Badge count={badgeCount} style={{ backgroundColor: '#52c41a' }} />
          )}
        </div>
        <div className="flex items-center gap-2" onClick={(e)=>e.stopPropagation()}>
          {actions}
          {open ? <CaretDownOutlined /> : <CaretRightOutlined />}
        </div>
      </div>

      {/* Contenu */}
      {open && (
        <div className="mt-4">{children}</div>
      )}
    </Card>
  );
}
