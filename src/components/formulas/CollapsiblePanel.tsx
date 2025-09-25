import React, { useState, PropsWithChildren } from 'react';
import { CaretRightFilled } from '@ant-design/icons';

interface CollapsiblePanelProps {
  title: string;
  defaultOpen?: boolean;
  small?: boolean;
}

const CollapsiblePanel: React.FC<PropsWithChildren<CollapsiblePanelProps>> = ({ title, defaultOpen = false, small, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-md bg-white shadow-xs w-full">
      <button
        type="button"
        onClick={() => setOpen(o=>!o)}
        className={`flex items-center justify-start w-full ${small? 'px-2 py-1' : 'px-3 py-2'} text-left bg-gray-50 hover:bg-gray-100 rounded-t-md`}
      >
        <span className="font-semibold text-xs text-gray-700 flex items-center gap-1">
          <CaretRightFilled className={`transition-transform ${open? 'rotate-90' : ''}`} style={{ fontSize: 10, lineHeight: 1 }} />
          {title}
        </span>
      </button>
      {open && (
        <div className={`p-2 ${small? 'text-[11px]' : 'text-sm'} overflow-x-auto`}> {children} </div>
      )}
    </div>
  );
};

export default CollapsiblePanel;
