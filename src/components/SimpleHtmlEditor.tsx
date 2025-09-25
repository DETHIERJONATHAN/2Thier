/**
 * 📝 SimpleHtmlEditor
 * Éditeur HTML simple et sobre pour la composition d'emails
 * JUSTE la zone d'écriture utilisateur - pas de mélange avec le message original !
 */

import React from 'react';
import { Input } from 'antd';

const { TextArea } = Input;

interface SimpleHtmlEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const SimpleHtmlEditor: React.FC<SimpleHtmlEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Tapez votre message...'
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <TextArea
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      autoSize={{ minRows: 6, maxRows: 12 }}
      style={{
        fontSize: '14px',
        lineHeight: '1.6'
      }}
    />
  );
};

export default SimpleHtmlEditor;
