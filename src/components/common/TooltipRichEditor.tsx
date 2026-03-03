import React, { useRef, useCallback, useEffect } from 'react';
import { Button, Tooltip } from 'antd';
import { BoldOutlined, ItalicOutlined, UnderlineOutlined } from '@ant-design/icons';

interface TooltipRichEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * 🎨 Éditeur WYSIWYG pour les tooltips
 * Le texte est directement mis en forme (gras, italique, souligné)
 * Stocke le résultat en HTML
 */
export const TooltipRichEditor: React.FC<TooltipRichEditorProps> = ({
  value = '',
  onChange,
  rows = 4,
  placeholder = "Entrez le texte explicatif...",
  disabled = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Synchroniser la valeur externe → éditeur (seulement si changement externe)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // 🔧 Appliquer un formatage
  const applyFormat = useCallback((command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    // Récupérer le HTML mis à jour
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange?.(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange?.(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    // Coller en texte brut pour éviter les styles externes
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  const minHeight = (rows || 4) * 22;

  return (
    <div>
      {/* 🎨 Barre d'outils */}
      <div style={{ 
        display: 'flex', 
        gap: 4, 
        padding: '2px 4px',
        background: disabled ? '#f5f5f5' : '#fafafa',
        borderRadius: '4px 4px 0 0',
        border: '1px solid #d9d9d9',
        borderBottom: '1px solid #eee'
      }}>
        <Tooltip title="Gras">
          <Button 
            type="text" 
            size="small" 
            icon={<BoldOutlined />} 
            onClick={() => applyFormat('bold')}
            disabled={disabled}
            style={{ fontWeight: 700, minWidth: 28 }}
          />
        </Tooltip>
        <Tooltip title="Italique">
          <Button 
            type="text" 
            size="small" 
            icon={<ItalicOutlined />} 
            onClick={() => applyFormat('italic')}
            disabled={disabled}
            style={{ minWidth: 28 }}
          />
        </Tooltip>
        <Tooltip title="Souligné">
          <Button 
            type="text" 
            size="small" 
            icon={<UnderlineOutlined />} 
            onClick={() => applyFormat('underline')}
            disabled={disabled}
            style={{ minWidth: 28 }}
          />
        </Tooltip>
      </div>
      
      {/* 📝 Zone d'édition WYSIWYG */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        style={{ 
          minHeight,
          padding: '4px 11px',
          border: '1px solid #d9d9d9',
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          outline: 'none',
          fontSize: 14,
          lineHeight: 1.5,
          color: disabled ? '#00000040' : '#000000e0',
          backgroundColor: disabled ? '#f5f5f5' : '#fff',
          cursor: disabled ? 'not-allowed' : 'text',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
        className="tooltip-rich-editor"
      />
      <style>{`
        .tooltip-rich-editor:empty:before {
          content: attr(data-placeholder);
          color: #bfbfbf;
          pointer-events: none;
        }
        .tooltip-rich-editor:focus {
          border-color: #4096ff;
          box-shadow: 0 0 0 2px rgba(5,145,255,0.1);
        }
      `}</style>
    </div>
  );
};

export default TooltipRichEditor;
