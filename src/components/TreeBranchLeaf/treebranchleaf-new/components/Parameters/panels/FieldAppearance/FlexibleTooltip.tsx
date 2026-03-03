import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Tooltip } from 'antd';

// 🎯 Types pour les différents contenus de tooltip
export interface TooltipConfig {
  title: string;
  content?: {
    type: 'text' | 'image' | 'both';
    text?: string | string[];
    examples?: string[];
    imageUrl?: string;
    imageAlt?: string;
  };
  maxWidth?: number;
}

// 🖼️ Composant tooltip flexible (texte, image, ou les deux)
export const FlexibleTooltip: React.FC<{
  config: TooltipConfig;
  children: React.ReactNode;
}> = ({ config, children }) => {
  const { title, content, maxWidth = 300 } = config;

  // Si pas de contenu spécial, juste le titre
  if (!content) {
    return (
      <Tooltip title={title}>
        {children}
      </Tooltip>
    );
  }

  const tooltipContent = (
    <div style={{ maxWidth }}>
      <div style={{ marginBottom: 8, fontWeight: 'bold' }}>{title}</div>
      
      {/* Contenu texte */}
      {(content.type === 'text' || content.type === 'both') && content.text && (
        <div style={{ marginBottom: content.type === 'both' ? 8 : 0 }}>
          {Array.isArray(content.text) ? (
            content.text.map((text, idx) => (
              <div key={idx} style={{ marginBottom: 4 }}>
                <ReactMarkdown
                  components={{
                    strong: ({node, ...props}) => <strong style={{ fontWeight: 700 }}>{props.children}</strong>,
                    em: ({node, ...props}) => <em style={{ fontStyle: 'italic' }}>{props.children}</em>,
                    p: ({node, ...props}) => <p style={{ margin: '2px 0' }}>{props.children}</p>,
                  }}
                >{text}</ReactMarkdown>
              </div>
            ))
          ) : (
            <div>
              <ReactMarkdown                remarkPlugins={[remarkBreaks]}                remarkPlugins={[remarkBreaks]}
                components={{
                  strong: ({node, ...props}) => <strong style={{ fontWeight: 700 }}>{props.children}</strong>,
                  em: ({node, ...props}) => <em style={{ fontStyle: 'italic' }}>{props.children}</em>,
                  p: ({node, ...props}) => <p style={{ margin: '2px 0' }}>{props.children}</p>,
                }}
              >{content.text}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
      
      {/* Exemples en code */}
      {content.examples && content.examples.length > 0 && (
        <div style={{ 
          marginBottom: content.type === 'both' || content.type === 'image' ? 8 : 0,
          fontFamily: 'monospace', 
          fontSize: 11,
          background: '#f5f5f5',
          padding: 6,
          borderRadius: 4
        }}>
          {content.examples.map((example, idx) => (
            <div key={idx}>{example}</div>
          ))}
        </div>
      )}
      
      {/* Contenu image */}
      {(content.type === 'image' || content.type === 'both') && content.imageUrl && (
        <img 
          src={content.imageUrl}
          alt={content.imageAlt || 'Image explicative'}
          style={{ 
            width: '100%', 
            height: 'auto', 
            marginTop: content.type === 'both' ? 8 : 0,
            border: '1px solid #f0f0f0', 
            borderRadius: 4 
          }}
        />
      )}
    </div>
  );

  return (
    <Tooltip 
      title={tooltipContent}
      styles={{ root: { maxWidth: maxWidth + 20 } }}
    >
      {children}
    </Tooltip>
  );
};

