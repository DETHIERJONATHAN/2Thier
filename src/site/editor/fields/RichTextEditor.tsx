/**
 * ✍️ RICH TEXT EDITOR - Éditeur de texte riche
 * 
 * Éditeur WYSIWYG pour formater le texte :
 * - Gras, italique, souligné
 * - Listes à puces/numérotées
 * - Liens
 * - Couleurs
 * - Insertion de variables dynamiques
 * 
 * Peut être remplacé par un éditeur plus complet comme :
 * - Quill
 * - TinyMCE
 * - Draft.js
 * - Lexical (Facebook)
 * 
 * @module site/editor/fields/RichTextEditor
 * @author 2Thier CRM Team
 */

import React, { useState } from 'react';
import { Input, Space, Button, Tooltip } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  LinkOutlined,
  BgColorsOutlined
} from '@ant-design/icons';

const { TextArea } = Input;

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * ✍️ RichTextEditor Component (Version Simple)
 * 
 * Pour le moment, c'est un textarea basique avec boutons de formatage.
 * À remplacer par un vrai éditeur WYSIWYG si besoin.
 */
const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange
}) => {
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  
  const wrapSelection = (tag: string) => {
    if (!selection || selection.start === selection.end) return;
    
    const before = value.substring(0, selection.start);
    const selected = value.substring(selection.start, selection.end);
    const after = value.substring(selection.end);
    
    const newValue = `${before}<${tag}>${selected}</${tag}>${after}`;
    onChange?.(newValue);
  };
  
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      {/* Barre d'outils */}
      <Space size="small">
        <Tooltip title="Gras">
          <Button
            size="small"
            icon={<BoldOutlined />}
            onClick={() => wrapSelection('strong')}
          />
        </Tooltip>
        <Tooltip title="Italique">
          <Button
            size="small"
            icon={<ItalicOutlined />}
            onClick={() => wrapSelection('em')}
          />
        </Tooltip>
        <Tooltip title="Souligné">
          <Button
            size="small"
            icon={<UnderlineOutlined />}
            onClick={() => wrapSelection('u')}
          />
        </Tooltip>
        <Tooltip title="Lien">
          <Button
            size="small"
            icon={<LinkOutlined />}
            onClick={() => {
              const url = prompt('URL du lien :');
              if (url && selection) {
                const before = value.substring(0, selection.start);
                const selected = value.substring(selection.start, selection.end);
                const after = value.substring(selection.end);
                const newValue = `${before}<a href="${url}">${selected}</a>${after}`;
                onChange?.(newValue);
              }
            }}
          />
        </Tooltip>
        <Tooltip title="Couleur">
          <Button
            size="small"
            icon={<BgColorsOutlined />}
            onClick={() => {
              const color = prompt('Couleur (ex: #10b981) :');
              if (color && selection) {
                const before = value.substring(0, selection.start);
                const selected = value.substring(selection.start, selection.end);
                const after = value.substring(selection.end);
                const newValue = `${before}<span style="color:${color}">${selected}</span>${after}`;
                onChange?.(newValue);
              }
            }}
          />
        </Tooltip>
      </Space>
      
      {/* Zone de texte */}
      <TextArea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onSelect={(e: any) => {
          setSelection({
            start: e.target.selectionStart,
            end: e.target.selectionEnd
          });
        }}
        rows={6}
        placeholder="Tapez votre texte... Utilisez les boutons ci-dessus pour formater."
      />
      
      {/* Aperçu HTML */}
      <div
        style={{
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 4,
          backgroundColor: '#fafafa',
          minHeight: 60
        }}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </Space>
  );
};

export default RichTextEditor;
