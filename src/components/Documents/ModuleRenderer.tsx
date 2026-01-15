/**
 * 🎨 MODULE RENDERER - Rendu visuel des différents types de modules
 */

import { useMemo } from 'react';
import { ModuleInstance } from './types';
import { ModuleDefinition } from './ModuleRegistry';
import { ConditionalConfig, ConditionRule } from './ConditionEditorModal';

interface ModuleRendererProps {
  module: ModuleInstance;
  moduleDef: ModuleDefinition;
  globalTheme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontSize: number;
  };
  isEditing?: boolean;
  /**
   * Données pour l'interpolation des variables
   * Format: { lead: {...}, quote: {...}, org: {...}, tbl: {...} }
   */
  documentData?: {
    lead?: Record<string, any>;
    quote?: Record<string, any>;
    org?: Record<string, any>;
    tbl?: Record<string, any>;
  };
}

/**
 * Évalue une condition et retourne true/false
 */
const evaluateCondition = (
  rule: ConditionRule,
  documentData?: ModuleRendererProps['documentData']
): boolean => {
  if (!documentData) return true; // Sans données, on affiche toujours
  
  // Extraire la valeur du champ
  let fieldValue: any = null;
  const fieldRef = rule.fieldRef;
  
  // Format {lead.xxx}, {quote.xxx}, {org.xxx}
  const curlyMatch = fieldRef.match(/^\{(lead|quote|org)\.([a-zA-Z0-9_.]+)\}$/);
  if (curlyMatch) {
    const [, source, key] = curlyMatch;
    const data = documentData[source as 'lead' | 'quote' | 'org'];
    if (data) {
      const keys = key.split('.');
      fieldValue = data;
      for (const k of keys) {
        fieldValue = fieldValue?.[k];
      }
    }
  }
  
  // Format @value.xxx ou @select.xxx (TBL)
  const tblMatch = fieldRef.match(/^@(value|select)\.([a-zA-Z0-9_.-]+)$/);
  if (tblMatch) {
    const [, , key] = tblMatch;
    fieldValue = documentData.tbl?.[key];
  }
  
  const compareValue = rule.compareValue;
  
  // Évaluer l'opérateur
  switch (rule.operator) {
    case 'IS_EMPTY':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    case 'IS_NOT_EMPTY':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    case 'EQUALS':
      return String(fieldValue) === String(compareValue);
    case 'NOT_EQUALS':
      return String(fieldValue) !== String(compareValue);
    case 'CONTAINS':
      return String(fieldValue || '').toLowerCase().includes(String(compareValue).toLowerCase());
    case 'NOT_CONTAINS':
      return !String(fieldValue || '').toLowerCase().includes(String(compareValue).toLowerCase());
    case 'GREATER_THAN':
      return Number(fieldValue) > Number(compareValue);
    case 'LESS_THAN':
      return Number(fieldValue) < Number(compareValue);
    case 'GREATER_OR_EQUAL':
      return Number(fieldValue) >= Number(compareValue);
    case 'LESS_OR_EQUAL':
      return Number(fieldValue) <= Number(compareValue);
    default:
      return true;
  }
};

/**
 * Évalue un ensemble de conditions avec AND/OR
 */
const evaluateConditions = (
  config: ConditionalConfig | undefined,
  documentData?: ModuleRendererProps['documentData']
): { shouldRender: boolean; content?: string } => {
  if (!config || !config.enabled || config.rules.length === 0) {
    return { shouldRender: true };
  }
  
  // Évaluer toutes les règles
  let result = evaluateCondition(config.rules[0], documentData);
  
  for (let i = 1; i < config.rules.length; i++) {
    const rule = config.rules[i];
    const ruleResult = evaluateCondition(rule, documentData);
    
    if (rule.logicOperator === 'AND') {
      result = result && ruleResult;
    } else if (rule.logicOperator === 'OR') {
      result = result || ruleResult;
    }
  }
  
  // Déterminer le comportement selon l'action
  const action = config.rules[0]?.action || 'SHOW';
  
  if (action === 'SHOW') {
    return {
      shouldRender: result,
      content: result ? config.showContent : config.hideContent,
    };
  } else if (action === 'HIDE') {
    return {
      shouldRender: !result,
      content: !result ? config.showContent : config.hideContent,
    };
  } else if (action === 'ADD_CONTENT') {
    return {
      shouldRender: true,
      content: result ? config.addContent : config.hideContent,
    };
  }
  
  return { shouldRender: true };
};

/**
 * Interpoler toutes les variables dans un texte:
 * - {lead.xxx} -> données du lead
 * - {quote.xxx} -> données du devis
 * - {org.xxx} -> données de l'organisation
 * - @value.xxx -> données TBL
 */
const interpolateVariables = (
  text: string, 
  documentData?: ModuleRendererProps['documentData'],
  isEditing?: boolean
): string => {
  if (!text) return text;
  
  // En mode édition sans données, on garde le texte tel quel
  if (isEditing || !documentData) {
    return text;
  }
  
  let result = text;
  
  // Pattern pour {lead.xxx}, {quote.xxx}, {org.xxx}
  const curlyPattern = /\{(lead|quote|org)\.([a-zA-Z0-9_.]+)\}/g;
  result = result.replace(curlyPattern, (match, source, key) => {
    const data = documentData[source as 'lead' | 'quote' | 'org'];
    if (data) {
      // Gérer les clés imbriquées (ex: lead.address.street)
      const keys = key.split('.');
      let value: any = data;
      for (const k of keys) {
        value = value?.[k];
      }
      if (value !== undefined && value !== null) {
        return String(value);
      }
    }
    return match;
  });
  
  // Pattern pour @value.xxx ou @select.xxx (TBL)
  const tblPattern = /@(value|select)\.([a-zA-Z0-9_.-]+)/g;
  result = result.replace(tblPattern, (match, _type, key) => {
    const value = documentData.tbl?.[key];
    if (value !== undefined && value !== null) {
      return String(value);
    }
    return match;
  });
  
  return result;
};

const ModuleRenderer = ({
  module,
  moduleDef,
  globalTheme,
  isEditing = false,
  documentData,
}: ModuleRendererProps) => {
  const config = module.config || {};
  
  // Récupérer le thème appliqué
  const theme = useMemo(() => {
    return moduleDef.themes.find(t => t.id === module.themeId) || moduleDef.themes[0];
  }, [moduleDef.themes, module.themeId]);

  const themeStyles = theme?.styles || {};

  // ============== ÉVALUATION DES CONDITIONS ==============
  const conditionalConfig = config._conditionalDisplay as ConditionalConfig | undefined;
  const conditionResult = useMemo(() => {
    // Debug: afficher la config conditionnelle
    if (conditionalConfig?.enabled) {
      console.log('🔍 [ModuleRenderer] Condition trouvée:', {
        moduleId: module.moduleId,
        isEditing,
        conditionalConfig,
        documentData: documentData ? Object.keys(documentData) : 'none',
      });
    }
    
    // En mode édition, on montre un indicateur visuel mais on évalue quand même
    // pour le preview
    if (isEditing) {
      // Même en édition, si une condition est configurée, on peut montrer qu'elle existe
      return { shouldRender: true, hasCondition: conditionalConfig?.enabled };
    }
    
    const result = evaluateConditions(conditionalConfig, documentData);
    console.log('🔍 [ModuleRenderer] Résultat évaluation:', result);
    return result;
  }, [conditionalConfig, documentData, isEditing, module.moduleId]);
  
  // Si la condition dit de ne pas rendre le module
  if (!conditionResult.shouldRender) {
    console.log('🚫 [ModuleRenderer] Module masqué par condition:', module.moduleId);
    // Si un contenu alternatif est défini, on l'affiche
    if (conditionResult.content) {
      return (
        <div style={{ 
          fontFamily: globalTheme.fontFamily || 'Arial',
          fontSize: globalTheme.fontSize || 14,
        }}>
          {interpolateVariables(conditionResult.content, documentData, isEditing)}
        </div>
      );
    }
    return null;
  }

  // ============== TITLE ==============
  if (module.moduleId === 'TITLE') {
    const Tag = (config.level || 'h1') as keyof JSX.IntrinsicElements;
    const fontSizes: Record<string, string> = { h1: '32px', h2: '24px', h3: '20px' };
    
    // Déterminer le texte à afficher: dataBinding prioritaire sur text statique
    let displayText = config.text || 'Titre';
    const hasDataBinding = config.dataBinding && (config.dataBinding.startsWith('@') || config.dataBinding.startsWith('{'));
    
    if (hasDataBinding) {
      if (documentData && !isEditing) {
        // Mode preview avec données: interpoler
        displayText = interpolateVariables(config.dataBinding, documentData, false);
      } else {
        // Mode édition: afficher la variable de manière visible
        displayText = (
          <span>
            {config.text && `${config.text} `}
            <span style={{
              backgroundColor: '#1d4ed8',
              color: '#93c5fd',
              padding: '2px 8px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.8em',
            }}>
              📊 {config.dataBinding}
            </span>
          </span>
        ) as any;
      }
    }
    
    return (
      <Tag style={{
        textAlign: config.alignment || 'center',
        color: config.color || '#000',
        fontSize: config.fontSize ? `${config.fontSize}px` : fontSizes[config.level || 'h1'],
        margin: 0,
        padding: '8px 0',
        ...themeStyles,
      }}>
        {displayText}
      </Tag>
    );
  }

  // ============== SUBTITLE ==============
  if (module.moduleId === 'SUBTITLE') {
    // Déterminer le texte à afficher: dataBinding prioritaire sur text statique
    let displayText: React.ReactNode = config.text || 'Sous-titre';
    const hasDataBinding = config.dataBinding && (config.dataBinding.startsWith('@') || config.dataBinding.startsWith('{'));
    
    if (hasDataBinding) {
      if (documentData && !isEditing) {
        // Mode preview avec données: interpoler
        displayText = interpolateVariables(config.dataBinding, documentData, false);
      } else {
        // Mode édition: afficher la variable de manière visible
        displayText = (
          <span>
            {config.text && `${config.text} `}
            <span style={{
              backgroundColor: '#1d4ed8',
              color: '#93c5fd',
              padding: '2px 8px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.85em',
            }}>
              📊 {config.dataBinding}
            </span>
          </span>
        );
      }
    }
    
    return (
      <p style={{
        textAlign: config.alignment || 'center',
        color: config.color || '#666',
        fontSize: config.fontSize ? `${config.fontSize}px` : '18px',
        margin: 0,
        padding: '4px 0',
        ...themeStyles,
      }}>
        {displayText}
      </p>
    );
  }

  // ============== TEXT_BLOCK ==============
  if (module.moduleId === 'TEXT_BLOCK') {
    // Pour TEXT_BLOCK, interpoler les variables dans le contenu HTML
    let content = config.content || '<p>Entrez votre texte ici...</p>';
    const hasDataBinding = config.dataBinding && (config.dataBinding.startsWith('@') || config.dataBinding.startsWith('{'));
    
    // Si dataBinding est défini, l'ajouter au contenu ou le remplacer
    if (hasDataBinding) {
      if (documentData && !isEditing) {
        // Mode preview avec données: interpoler toutes les variables
        content = interpolateVariables(content, documentData, false);
        // Interpoler aussi le dataBinding si présent séparément
        const bindingValue = interpolateVariables(config.dataBinding, documentData, false);
        if (bindingValue !== config.dataBinding) {
          content = `<p>${bindingValue}</p>` + content;
        }
      } else {
        // Mode édition: afficher le badge dataBinding
        content = `<div style="background:#1d4ed8;color:#93c5fd;padding:4px 12px;border-radius:4px;font-family:monospace;display:inline-block;margin-bottom:8px;">📊 ${config.dataBinding}</div>` + content;
      }
    }
    
    return (
      <div 
        style={{
          fontSize: config.fontSize ? `${config.fontSize}px` : '14px',
          lineHeight: config.lineHeight || 1.6,
          ...themeStyles,
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // ============== IMAGE ==============
  if (module.moduleId === 'IMAGE') {
    if (!config.src) {
      return (
        <div style={{
          backgroundColor: '#f0f0f0',
          padding: '40px',
          textAlign: 'center',
          borderRadius: themeStyles.borderRadius || '0',
          color: '#999',
        }}>
          🖼️ Aucune image sélectionnée
        </div>
      );
    }
    
    return (
      <img
        src={config.src}
        alt={config.alt || 'Image'}
        style={{
          width: '100%',
          maxWidth: '100%',
          objectFit: config.objectFit || 'contain',
          opacity: config.opacity ? config.opacity / 100 : 1,
          ...themeStyles,
        }}
      />
    );
  }

  // ============== BACKGROUND ==============
  if (module.moduleId === 'BACKGROUND') {
    // Le fond est un module spécial qui définit le fond de la page
    // En mode aperçu, on affiche une représentation visuelle
    const bgType = module.themeId || 'solid';
    
    let backgroundPreview = '';
    let backgroundStyle: React.CSSProperties = {
      minHeight: '80px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '8px',
      border: '2px dashed #d9d9d9',
      position: 'relative',
      overflow: 'hidden',
    };

    if (bgType === 'solid' || bgType === 'default') {
      backgroundStyle.backgroundColor = config.color || '#ffffff';
      backgroundPreview = `Couleur: ${config.color || '#ffffff'}`;
    } else if (bgType === 'gradient') {
      // Les champs sont gradientStart et gradientEnd dans ModuleRegistry
      const gradientStart = config.gradientStart || '#1890ff';
      const gradientEnd = config.gradientEnd || '#52c41a';
      const gradientAngle = config.gradientAngle || 45;
      backgroundStyle.background = `linear-gradient(${gradientAngle}deg, ${gradientStart}, ${gradientEnd})`;
      backgroundPreview = 'Dégradé';
    } else if (bgType === 'image') {
      // Le champ est 'image' dans ModuleRegistry, pas 'imageUrl'
      if (config.image) {
        backgroundStyle.backgroundImage = `url(${config.image})`;
        backgroundStyle.backgroundSize = config.backgroundSize || 'cover';
        backgroundStyle.backgroundPosition = config.backgroundPosition || 'center';
        backgroundPreview = 'Image de fond';
      } else {
        backgroundStyle.backgroundColor = '#f5f5f5';
        backgroundPreview = 'Aucune image sélectionnée';
      }
    }

    return (
      <div style={backgroundStyle}>
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: '4px',
          fontSize: '12px',
          textAlign: 'center',
        }}>
          🎨 Fond de page
          <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>
            {backgroundPreview}
          </div>
        </div>
      </div>
    );
  }

  // ============== DATE_BLOCK ==============
  if (module.moduleId === 'DATE_BLOCK') {
    const formatDate = (format: string) => {
      const date = config.value === 'custom' && config.customDate 
        ? new Date(config.customDate) 
        : new Date();
      
      const options: Intl.DateTimeFormatOptions = {
        short: { day: '2-digit', month: '2-digit', year: 'numeric' },
        long: { day: 'numeric', month: 'long', year: 'numeric' },
        full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
      }[format] || { day: 'numeric', month: 'long', year: 'numeric' };
      
      return date.toLocaleDateString('fr-FR', options);
    };

    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        ...themeStyles,
      }}>
        {config.prefix && <span style={{ color: '#666' }}>{config.prefix}</span>}
        <span>{formatDate(config.format || 'long')}</span>
      </div>
    );
  }

  // ============== PRICING_TABLE ==============
  if (module.moduleId === 'PRICING_TABLE') {
    // 🆕 Support des nouvelles pricingLines ET des anciennes rows
    const pricingLines = config.pricingLines || [];
    const legacyRows = config.rows || [];
    
    // Fonction pour extraire un label lisible d'une référence TBL
    const extractTblLabel = (ref: string) => {
      if (!ref) return null;
      // Extraire le nom après le @ : @value.xxx -> "Valeur TBL"
      // Ou extraire la dernière partie significative
      const parts = ref.split('.');
      const lastPart = parts[parts.length - 1];
      // Tronquer si trop long
      return lastPart.length > 20 ? `${lastPart.substring(0, 17)}...` : lastPart;
    };
    
    // Convertir pricingLines en format rows pour l'affichage
    const rows = pricingLines.length > 0 
      ? pricingLines.map((line: any) => ({
          // 🔧 Utiliser labelSource si label est vide
          designation: line.label || (line.labelSource ? `📊 ${extractTblLabel(line.labelSource)}` : 'Sans désignation'),
          quantity: typeof line.quantity === 'number' ? line.quantity : 1,
          unitPrice: typeof line.unitPrice === 'number' ? line.unitPrice : 0,
          // Indicateurs visuels pour les sources TBL
          hasLabelSource: !!line.labelSource,
          labelSource: line.labelSource,
          hasQuantitySource: !!line.quantitySource,
          hasUnitPriceSource: !!line.unitPriceSource,
          quantitySource: line.quantitySource,
          unitPriceSource: line.unitPriceSource,
          type: line.type,
        }))
      : legacyRows;
    
    const currency = config.currency || '€';
    const tvaRate = config.tvaRate || config.vatRate || 21;
    
    const totalHT = rows.reduce((sum: number, row: any) => sum + ((row.quantity || 0) * (row.unitPrice || 0)), 0);
    const tva = totalHT * (tvaRate / 100);
    const totalTTC = totalHT + tva;

    return (
      <div style={{ ...themeStyles, backgroundColor: '#ffffff', borderRadius: '8px', padding: '12px' }}>
        {config.title && (
          <h3 style={{ marginBottom: '16px', color: globalTheme.primaryColor }}>
            {config.title}
          </h3>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff' }}>
          <thead>
            <tr style={{ backgroundColor: globalTheme.primaryColor, color: '#fff' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Désignation</th>
              <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>Qté</th>
              <th style={{ padding: '12px', textAlign: 'right', width: '100px' }}>P.U.</th>
              <th style={{ padding: '12px', textAlign: 'right', width: '100px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#999', backgroundColor: '#fff' }}>
                  Aucune ligne ajoutée
                </td>
              </tr>
            ) : (
              rows.map((row: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e8e8e8', backgroundColor: '#fff' }}>
                  <td style={{ padding: '12px', color: '#333' }}>
                    {row.hasLabelSource ? (
                      <span style={{ color: '#fa8c16', fontWeight: 500 }} title={row.labelSource}>
                        {row.designation}
                      </span>
                    ) : (
                      <span style={{ color: '#333' }}>{row.designation || '-'}</span>
                    )}
                    {row.type === 'dynamic' && !row.hasLabelSource && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '10px', 
                        padding: '2px 6px', 
                        backgroundColor: '#e6f7ff', 
                        borderRadius: '4px',
                        color: '#1890ff'
                      }}>
                        🔗 TBL
                      </span>
                    )}
                    {row.type === 'repeater' && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '10px', 
                        padding: '2px 6px', 
                        backgroundColor: '#f9f0ff', 
                        borderRadius: '4px',
                        color: '#722ed1'
                      }}>
                        🔁 Repeater
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#333' }}>
                    {row.hasQuantitySource ? (
                      <span style={{ color: '#1890ff', fontSize: '11px', fontWeight: 500 }} title={row.quantitySource}>
                        📊 {row.quantity || '?'}
                      </span>
                    ) : (
                      row.quantity || 0
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#333' }}>
                    {row.hasUnitPriceSource ? (
                      <span style={{ color: '#52c41a', fontSize: '11px', fontWeight: 500 }} title={row.unitPriceSource}>
                        📊 {(row.unitPrice || 0).toFixed(2)} {currency}
                      </span>
                    ) : (
                      <>{(row.unitPrice || 0).toFixed(2)} {currency}</>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#333' }}>
                    {((row.quantity || 0) * (row.unitPrice || 0)).toFixed(2)} {currency}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {config.showTotal && (
            <tfoot>
              <tr style={{ borderTop: '2px solid #e8e8e8' }}>
                <td colSpan={3} style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>
                  Total HT
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>
                  {totalHT.toFixed(2)} {currency}
                </td>
              </tr>
              {config.showTVA && (
                <tr>
                  <td colSpan={3} style={{ padding: '12px', textAlign: 'right' }}>
                    TVA ({tvaRate}%)
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {tva.toFixed(2)} {currency}
                  </td>
                </tr>
              )}
              {config.showTVA && (
                <tr style={{ backgroundColor: globalTheme.primaryColor, color: '#fff' }}>
                  <td colSpan={3} style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>
                    Total TTC
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontSize: '18px' }}>
                    {totalTTC.toFixed(2)} {currency}
                  </td>
                </tr>
              )}
            </tfoot>
          )}
        </table>
      </div>
    );
  }

  // ============== SIGNATURE_BLOCK ==============
  if (module.moduleId === 'SIGNATURE_BLOCK') {
    const isStacked = config.layout === 'stacked';
    
    const signatureBox = (label: string) => (
      <div style={{ 
        flex: 1,
        padding: '20px',
        border: '1px solid #e8e8e8',
        borderRadius: '8px',
        ...(isStacked ? { marginBottom: '16px' } : {}),
      }}>
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>{label}</div>
        {config.showDate && (
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
            Date: ____/____/________
          </div>
        )}
        {config.showMention && (
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontStyle: 'italic' }}>
            "{config.mention || 'Lu et approuvé'}"
          </div>
        )}
        <div style={{ 
          height: '80px', 
          borderBottom: '1px dashed #ccc',
          marginTop: '20px',
        }}>
          <span style={{ fontSize: '11px', color: '#999' }}>Signature</span>
        </div>
      </div>
    );

    return (
      <div style={{ 
        display: isStacked ? 'block' : 'flex', 
        gap: '24px',
        ...themeStyles,
      }}>
        {signatureBox(config.clientLabel || 'Le Client')}
        {signatureBox(config.companyLabel || 'Pour l\'entreprise')}
      </div>
    );
  }

  // ============== CONTACT_INFO ==============
  if (module.moduleId === 'CONTACT_INFO') {
    return (
      <div style={{ ...themeStyles }}>
        {config.title && <h4 style={{ marginBottom: '12px' }}>{config.title}</h4>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {config.showPhone && config.phone && (
            <div>📞 {config.phone}</div>
          )}
          {config.showEmail && config.email && (
            <div>✉️ {config.email}</div>
          )}
          {config.showAddress && config.address && (
            <div>📍 {config.address}</div>
          )}
          {config.showWebsite && config.website && (
            <div>🌐 {config.website}</div>
          )}
        </div>
      </div>
    );
  }

  // ============== TERMS_CONDITIONS ==============
  if (module.moduleId === 'TERMS_CONDITIONS') {
    return (
      <div style={{ ...themeStyles }}>
        {config.title && (
          <h4 style={{ marginBottom: '12px', borderBottom: '1px solid #e8e8e8', paddingBottom: '8px' }}>
            {config.title}
          </h4>
        )}
        <div 
          style={{ 
            fontSize: config.fontSize ? `${config.fontSize}px` : '10px',
            columnCount: config.columns || 1,
            columnGap: '24px',
            lineHeight: 1.4,
          }}
          dangerouslySetInnerHTML={{ __html: config.content || 'Conditions générales...' }}
        />
      </div>
    );
  }

  // ============== SPACER ==============
  if (module.moduleId === 'SPACER') {
    return (
      <div style={{ 
        height: config.height ? `${config.height}px` : '40px',
        ...themeStyles,
      }} />
    );
  }

  // ============== DIVIDER ==============
  if (module.moduleId === 'DIVIDER') {
    return (
      <hr style={{
        border: 'none',
        borderTop: `${config.thickness || 1}px ${theme?.id || 'solid'} ${config.color || '#e8e8e8'}`,
        margin: `${config.margin || 20}px 0`,
        width: `${config.width || 100}%`,
        ...themeStyles,
      }} />
    );
  }

  // ============== PAGE_BREAK ==============
  if (module.moduleId === 'PAGE_BREAK') {
    return (
      <div style={{
        pageBreakAfter: 'always',
        borderTop: isEditing ? '2px dashed #1890ff' : 'none',
        margin: '20px 0',
        position: 'relative',
      }}>
        {isEditing && (
          <span style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1890ff',
            color: '#fff',
            padding: '2px 12px',
            borderRadius: '4px',
            fontSize: '11px',
          }}>
            📃 Saut de page
          </span>
        )}
      </div>
    );
  }

  // ============== TIMELINE ==============
  if (module.moduleId === 'TIMELINE') {
    const steps = config.steps || [];
    
    return (
      <div style={{ ...themeStyles }}>
        {config.title && <h4 style={{ marginBottom: '16px' }}>{config.title}</h4>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {steps.map((step: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: globalTheme.primaryColor,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {idx + 1}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{step.label || `Étape ${idx + 1}`}</div>
                {step.date && <div style={{ fontSize: '12px', color: '#666' }}>{step.date}</div>}
                {step.description && <div style={{ fontSize: '13px', marginTop: '4px' }}>{step.description}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============== TESTIMONIAL ==============
  if (module.moduleId === 'TESTIMONIAL') {
    return (
      <div style={{
        textAlign: 'center',
        padding: '24px',
        ...themeStyles,
      }}>
        <div style={{ fontSize: '48px', color: globalTheme.primaryColor, marginBottom: '8px' }}>"</div>
        <p style={{ fontSize: '16px', fontStyle: 'italic', marginBottom: '16px' }}>
          {config.quote || 'Témoignage...'}
        </p>
        <div style={{ fontWeight: 600 }}>{config.author || 'Auteur'}</div>
        {config.company && <div style={{ color: '#666', fontSize: '14px' }}>{config.company}</div>}
      </div>
    );
  }

  // ============== COMPANY_PRESENTATION ==============
  if (module.moduleId === 'COMPANY_PRESENTATION') {
    return (
      <div style={{ ...themeStyles }}>
        {config.title && <h3 style={{ marginBottom: '16px' }}>{config.title}</h3>}
        {config.description && (
          <div 
            style={{ marginBottom: '20px' }}
            dangerouslySetInnerHTML={{ __html: config.description }}
          />
        )}
        {config.showStats && config.stats && (
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
            {config.stats.map((stat: any, idx: number) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: globalTheme.primaryColor }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============== FAQ ==============
  if (module.moduleId === 'FAQ') {
    const items = config.items || [];
    
    return (
      <div style={{ ...themeStyles }}>
        {config.title && <h4 style={{ marginBottom: '16px' }}>{config.title}</h4>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map((item: any, idx: number) => (
            <div key={idx} style={{ 
              padding: '16px',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px',
              borderLeft: `4px solid ${globalTheme.primaryColor}`,
            }}>
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                ❓ {item.question || `Question ${idx + 1}`}
              </div>
              <div style={{ color: '#666' }}>
                {item.answer || 'Réponse...'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============== COMPANY_HEADER ==============
  if (module.moduleId === 'COMPANY_HEADER') {
    const logoSize = config.logoSize || 80;
    const layout = config.layout || 'horizontal';
    const logoPosition = config.logoPosition || 'left';
    
    // Interpoler les données
    const companyName = interpolateVariables(config.companyName || config.companyNameBinding || '{org.name}', documentData, isEditing);
    const address = interpolateVariables(config.address || config.addressBinding || '{org.address}', documentData, isEditing);
    const phone = interpolateVariables(config.phone || '{org.phone}', documentData, isEditing);
    const email = interpolateVariables(config.email || '{org.email}', documentData, isEditing);
    const tva = interpolateVariables(config.tva || '{org.tva}', documentData, isEditing);
    const website = interpolateVariables(config.website || '{org.website}', documentData, isEditing);
    
    const LogoBlock = config.showLogo !== false && config.logo && (
      <img 
        src={config.logo} 
        alt="Logo" 
        style={{ 
          width: logoSize, 
          height: 'auto', 
          objectFit: 'contain',
          maxHeight: logoSize,
        }} 
      />
    );
    
    const InfoBlock = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {config.showName !== false && (
          <div style={{ fontWeight: 700, fontSize: '16px', color: globalTheme.primaryColor }}>
            {companyName}
          </div>
        )}
        {config.showAddress !== false && address && (
          <div style={{ fontSize: '13px', color: '#444', whiteSpace: 'pre-line' }}>{address}</div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#666', marginTop: '4px' }}>
          {config.showPhone !== false && phone && <span>📞 {phone}</span>}
          {config.showEmail !== false && email && <span>✉️ {email}</span>}
          {config.showWebsite !== false && config.showWebsite && website && <span>🌐 {website}</span>}
        </div>
        {config.showTVA !== false && tva && (
          <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>TVA: {tva}</div>
        )}
      </div>
    );
    
    if (layout === 'vertical' || logoPosition === 'top') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', ...themeStyles }}>
          {LogoBlock}
          {InfoBlock}
        </div>
      );
    }
    
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '16px',
        flexDirection: logoPosition === 'right' ? 'row-reverse' : 'row',
        ...themeStyles 
      }}>
        {LogoBlock}
        {InfoBlock}
      </div>
    );
  }

  // ============== CLIENT_HEADER ==============
  if (module.moduleId === 'CLIENT_HEADER') {
    const title = config.title || 'À l\'attention de:';
    
    // Interpoler les données client
    const clientName = interpolateVariables(
      config.clientName || config.clientNameBinding || '{lead.firstName} {lead.lastName}', 
      documentData, isEditing
    );
    const clientCompany = interpolateVariables(
      config.clientCompany || config.clientCompanyBinding || '{lead.company}', 
      documentData, isEditing
    );
    const clientAddress = interpolateVariables(
      config.clientAddress || config.clientAddressBinding || '{lead.address}', 
      documentData, isEditing
    );
    const clientEmail = interpolateVariables(config.clientEmail || '{lead.email}', documentData, isEditing);
    const clientPhone = interpolateVariables(config.clientPhone || '{lead.phone}', documentData, isEditing);
    const clientTVA = interpolateVariables(config.clientTVA || '{lead.tva}', documentData, isEditing);
    
    return (
      <div style={{ ...themeStyles }}>
        {config.showTitle !== false && (
          <div style={{ 
            fontSize: '12px', 
            color: '#888', 
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {title}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {config.showName !== false && clientName && (
            <div style={{ fontWeight: 600, fontSize: '15px' }}>{clientName}</div>
          )}
          {config.showCompany !== false && clientCompany && (
            <div style={{ fontSize: '14px', color: '#333' }}>{clientCompany}</div>
          )}
          {config.showAddress !== false && clientAddress && (
            <div style={{ fontSize: '13px', color: '#555', whiteSpace: 'pre-line' }}>{clientAddress}</div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {config.showEmail !== false && clientEmail && <span>✉️ {clientEmail}</span>}
            {config.showPhone !== false && config.showPhone && clientPhone && <span>📞 {clientPhone}</span>}
          </div>
          {config.showTVA !== false && config.showTVA && clientTVA && (
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>TVA: {clientTVA}</div>
          )}
        </div>
      </div>
    );
  }

  // ============== DOCUMENT_HEADER (Combiné) ==============
  if (module.moduleId === 'DOCUMENT_HEADER') {
    const layout = config.layout || 'side-by-side';
    
    // Entreprise
    const companyName = interpolateVariables(config.companyName || '{org.name}', documentData, isEditing);
    const companyAddress = interpolateVariables(config.companyAddress || '{org.address}', documentData, isEditing);
    const companyPhone = interpolateVariables(config.companyPhone || '{org.phone}', documentData, isEditing);
    const companyEmail = interpolateVariables(config.companyEmail || '{org.email}', documentData, isEditing);
    const companyTVA = interpolateVariables(config.companyTVA || '{org.tva}', documentData, isEditing);
    
    // Client
    const clientTitle = config.clientTitle || 'Client:';
    const clientName = interpolateVariables(config.clientName || '{lead.firstName} {lead.lastName}', documentData, isEditing);
    const clientCompany = interpolateVariables(config.clientCompany || '{lead.company}', documentData, isEditing);
    const clientAddress = interpolateVariables(config.clientAddress || '{lead.address}', documentData, isEditing);
    const clientEmail = interpolateVariables(config.clientEmail || '{lead.email}', documentData, isEditing);
    
    const CompanySection = (
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {config.showLogo !== false && config.logo && (
            <img 
              src={config.logo} 
              alt="Logo" 
              style={{ width: config.logoSize || 60, height: 'auto', objectFit: 'contain' }} 
            />
          )}
          {config.showCompanyInfo !== false && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: globalTheme.primaryColor }}>{companyName}</div>
              <div style={{ fontSize: '12px', color: '#555', whiteSpace: 'pre-line' }}>{companyAddress}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                {companyPhone && <span>📞 {companyPhone} </span>}
                {companyEmail && <span>✉️ {companyEmail}</span>}
              </div>
              {companyTVA && <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>TVA: {companyTVA}</div>}
            </div>
          )}
        </div>
      </div>
    );
    
    const ClientSection = config.showClientInfo !== false && (
      <div style={{ flex: 1, textAlign: layout === 'side-by-side' ? 'right' : 'left' }}>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase' }}>{clientTitle}</div>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>{clientName}</div>
        {clientCompany && <div style={{ fontSize: '13px', color: '#444' }}>{clientCompany}</div>}
        <div style={{ fontSize: '12px', color: '#555', whiteSpace: 'pre-line' }}>{clientAddress}</div>
        {clientEmail && <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>✉️ {clientEmail}</div>}
      </div>
    );
    
    if (layout === 'stacked') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', ...themeStyles }}>
          {CompanySection}
          {ClientSection}
        </div>
      );
    }
    
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', ...themeStyles }}>
        {CompanySection}
        {ClientSection}
      </div>
    );
  }

  // ============== DOCUMENT_INFO ==============
  if (module.moduleId === 'DOCUMENT_INFO') {
    const layout = config.layout || 'inline';
    const docType = config.documentType || 'DEVIS';
    
    const reference = interpolateVariables(config.reference || config.referenceBinding || '{quote.reference}', documentData, isEditing);
    const date = interpolateVariables(config.date || config.dateBinding || '{quote.date}', documentData, isEditing);
    const validUntil = interpolateVariables(config.validUntil || config.validUntilBinding || '{quote.validUntil}', documentData, isEditing);
    const object = interpolateVariables(config.object || config.objectBinding || '', documentData, isEditing);
    
    // Style pour les badges
    const badgeStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      backgroundColor: '#f5f5f5',
      borderRadius: '4px',
      fontSize: '13px',
    };
    
    if (module.themeId === 'header') {
      return (
        <div style={{ textAlign: 'center', ...themeStyles }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: globalTheme.primaryColor, marginBottom: '8px' }}>
            {docType !== 'custom' ? docType : (config.customDocType || 'DOCUMENT')}
          </div>
          {config.showReference !== false && reference && (
            <div style={{ fontSize: '16px', color: '#666' }}>{config.referencePrefix} {reference}</div>
          )}
          {config.showDate !== false && date && (
            <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>{config.datePrefix} {date}</div>
          )}
        </div>
      );
    }
    
    if (layout === 'table') {
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', ...themeStyles }}>
          <tbody>
            {config.showReference !== false && (
              <tr>
                <td style={{ padding: '8px', fontWeight: 600, width: '120px', backgroundColor: '#f9f9f9' }}>{config.referencePrefix}</td>
                <td style={{ padding: '8px' }}>{reference}</td>
              </tr>
            )}
            {config.showDate !== false && (
              <tr>
                <td style={{ padding: '8px', fontWeight: 600, backgroundColor: '#f9f9f9' }}>{config.datePrefix}</td>
                <td style={{ padding: '8px' }}>{date}</td>
              </tr>
            )}
            {config.showValidUntil !== false && validUntil && (
              <tr>
                <td style={{ padding: '8px', fontWeight: 600, backgroundColor: '#f9f9f9' }}>{config.validUntilPrefix}</td>
                <td style={{ padding: '8px' }}>{validUntil}</td>
              </tr>
            )}
            {config.showObject !== false && object && (
              <tr>
                <td style={{ padding: '8px', fontWeight: 600, backgroundColor: '#f9f9f9' }}>{config.objectPrefix}</td>
                <td style={{ padding: '8px' }}>{object}</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    }
    
    if (layout === 'stacked') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', ...themeStyles }}>
          {config.showReference !== false && (
            <div><strong>{config.referencePrefix}</strong> {reference}</div>
          )}
          {config.showDate !== false && (
            <div><strong>{config.datePrefix}</strong> {date}</div>
          )}
          {config.showValidUntil !== false && validUntil && (
            <div><strong>{config.validUntilPrefix}</strong> {validUntil}</div>
          )}
          {config.showObject !== false && object && (
            <div><strong>{config.objectPrefix}</strong> {object}</div>
          )}
        </div>
      );
    }
    
    // Layout inline (default)
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', ...themeStyles }}>
        {config.showReference !== false && (
          <div style={badgeStyle}>
            <span style={{ fontWeight: 600 }}>{config.referencePrefix}</span> {reference}
          </div>
        )}
        {config.showDate !== false && (
          <div style={badgeStyle}>
            <span style={{ fontWeight: 600 }}>{config.datePrefix}</span> {date}
          </div>
        )}
        {config.showValidUntil !== false && validUntil && (
          <div style={badgeStyle}>
            <span style={{ fontWeight: 600 }}>{config.validUntilPrefix}</span> {validUntil}
          </div>
        )}
        {config.showObject !== false && object && (
          <div style={{ width: '100%', marginTop: '8px' }}>
            <span style={{ fontWeight: 600 }}>{config.objectPrefix}</span> {object}
          </div>
        )}
      </div>
    );
  }

  // ============== DOCUMENT_FOOTER ==============
  if (module.moduleId === 'DOCUMENT_FOOTER') {
    const layout = config.layout || 'centered';
    const fontSize = config.fontSize || 10;
    
    const companyName = interpolateVariables(config.companyName || '{org.name}', documentData, isEditing);
    const phone = interpolateVariables(config.companyPhone || '{org.phone}', documentData, isEditing);
    const email = interpolateVariables(config.companyEmail || '{org.email}', documentData, isEditing);
    const website = interpolateVariables(config.companyWebsite || '{org.website}', documentData, isEditing);
    const tva = interpolateVariables(config.companyTVA || '{org.tva}', documentData, isEditing);
    const iban = interpolateVariables(config.bankIBAN || '{org.iban}', documentData, isEditing);
    const bic = interpolateVariables(config.bankBIC || '{org.bic}', documentData, isEditing);
    
    const companyInfo = config.showCompanyInfo !== false && (
      <span>
        {companyName}
        {phone && ` | 📞 ${phone}`}
        {email && ` | ✉️ ${email}`}
        {website && ` | 🌐 ${website}`}
      </span>
    );
    
    const bankInfo = config.showBankInfo !== false && (iban || bic) && (
      <span>
        {tva && `TVA: ${tva}`}
        {iban && ` | IBAN: ${iban}`}
        {bic && ` | BIC: ${bic}`}
      </span>
    );
    
    const pageNumber = config.showPageNumber !== false && (
      <span style={{ color: '#888' }}>Page 1 / 1</span>
    );
    
    if (layout === 'spread') {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          fontSize: `${fontSize}px`,
          color: '#666',
          ...themeStyles 
        }}>
          <div>{companyInfo}</div>
          <div>{pageNumber}</div>
        </div>
      );
    }
    
    if (layout === 'minimal') {
      return (
        <div style={{ 
          textAlign: 'center',
          fontSize: `${fontSize}px`,
          color: '#888',
          ...themeStyles 
        }}>
          {companyName} {pageNumber && `— ${pageNumber}`}
        </div>
      );
    }
    
    // Layout centered (default)
    return (
      <div style={{ 
        textAlign: 'center',
        fontSize: `${fontSize}px`,
        color: '#666',
        lineHeight: 1.6,
        ...themeStyles 
      }}>
        <div>{companyInfo}</div>
        {bankInfo && <div style={{ marginTop: '4px' }}>{bankInfo}</div>}
        {config.showLegalMention && config.legalMention && (
          <div style={{ marginTop: '4px', fontStyle: 'italic', fontSize: `${fontSize - 1}px` }}>
            {config.legalMention}
          </div>
        )}
        {pageNumber && <div style={{ marginTop: '4px' }}>{pageNumber}</div>}
      </div>
    );
  }

  // ============== PAYMENT_INFO ==============
  if (module.moduleId === 'PAYMENT_INFO') {
    const title = config.title || 'Modalités de paiement';
    
    const iban = interpolateVariables(config.iban || '{org.iban}', documentData, isEditing);
    const bic = interpolateVariables(config.bic || '{org.bic}', documentData, isEditing);
    const bankName = interpolateVariables(config.bankName || '{org.bankName}', documentData, isEditing);
    const communication = interpolateVariables(config.communication || '{quote.reference}', documentData, isEditing);
    
    return (
      <div style={{ ...themeStyles }}>
        {config.showTitle !== false && (
          <div style={{ 
            fontWeight: 600, 
            fontSize: '14px', 
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            💳 {title}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
          {config.showIBAN !== false && iban && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontWeight: 500, minWidth: '100px', color: '#666' }}>IBAN:</span>
              <span style={{ fontFamily: 'monospace' }}>{iban}</span>
            </div>
          )}
          {config.showBIC !== false && bic && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontWeight: 500, minWidth: '100px', color: '#666' }}>BIC:</span>
              <span style={{ fontFamily: 'monospace' }}>{bic}</span>
            </div>
          )}
          {config.showBankName && bankName && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontWeight: 500, minWidth: '100px', color: '#666' }}>Banque:</span>
              <span>{bankName}</span>
            </div>
          )}
          {config.showCommunication !== false && communication && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontWeight: 500, minWidth: '100px', color: '#666' }}>Communication:</span>
              <span style={{ fontWeight: 600 }}>{communication}</span>
            </div>
          )}
          {config.showPaymentTerms !== false && config.paymentTerms && (
            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
              ⏱️ {config.paymentTerms}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============== VALIDITY_NOTICE ==============
  if (module.moduleId === 'VALIDITY_NOTICE') {
    const template = config.template || 'standard';
    const validUntilDate = interpolateVariables(config.validUntilDate || '{quote.validUntil}', documentData, isEditing);
    const validityDays = config.validityDays || 30;
    
    let noticeText = '';
    if (template === 'standard') {
      noticeText = `Ce devis est valable ${validityDays} jours à compter de sa date d'émission.`;
    } else if (template === 'date') {
      noticeText = `Ce devis est valable jusqu'au ${validUntilDate}.`;
    } else {
      noticeText = config.customText || 'Mention de validité personnalisée.';
    }
    
    const additionalNote = config.additionalNote || '';
    
    return (
      <div style={{ 
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        fontSize: '13px',
        ...themeStyles 
      }}>
        {config.showIcon !== false && (
          <span style={{ fontSize: '20px' }}>⚠️</span>
        )}
        <div>
          <div style={{ fontWeight: 500 }}>{noticeText}</div>
          {additionalNote && (
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#666' }}>
              {additionalNote}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============== TOTALS_SUMMARY ==============
  if (module.moduleId === 'TOTALS_SUMMARY') {
    const currency = config.currency || '€';
    const alignment = config.alignment || 'right';
    
    const totalHT = interpolateVariables(config.totalHT || config.totalHTBinding || '{quote.totalHT}', documentData, isEditing);
    const tvaAmount = interpolateVariables(config.tvaAmount || config.tvaBinding || '{quote.tva}', documentData, isEditing);
    const totalTTC = interpolateVariables(config.totalTTC || config.totalTTCBinding || '{quote.total}', documentData, isEditing);
    const discount = interpolateVariables(config.discount || '{quote.discount}', documentData, isEditing);
    const tvaRate = config.tvaRate || 21;
    
    const rowStyle = {
      display: 'flex',
      justifyContent: alignment === 'right' ? 'flex-end' : alignment === 'center' ? 'center' : 'flex-start',
      gap: '24px',
      padding: '8px 0',
      borderBottom: '1px solid #f0f0f0',
    };
    
    const labelStyle = { 
      minWidth: '120px', 
      color: '#666',
      textAlign: 'right' as const,
    };
    
    const valueStyle = { 
      minWidth: '100px', 
      textAlign: 'right' as const,
      fontWeight: 500,
    };
    
    return (
      <div style={{ ...themeStyles }}>
        {config.showDiscount && discount && (
          <div style={rowStyle}>
            <span style={labelStyle}>Remise:</span>
            <span style={{ ...valueStyle, color: '#52c41a' }}>-{discount} {currency}</span>
          </div>
        )}
        {config.showTotalHT !== false && (
          <div style={rowStyle}>
            <span style={labelStyle}>Total HT:</span>
            <span style={valueStyle}>{totalHT} {currency}</span>
          </div>
        )}
        {config.showTVA !== false && (
          <div style={rowStyle}>
            <span style={labelStyle}>TVA ({tvaRate}%):</span>
            <span style={valueStyle}>{tvaAmount} {currency}</span>
          </div>
        )}
        {config.showTotalTTC !== false && (
          <div style={{ 
            ...rowStyle, 
            borderBottom: 'none',
            borderTop: '2px solid #333',
            paddingTop: '12px',
            marginTop: '4px',
          }}>
            <span style={{ ...labelStyle, fontWeight: 700, color: '#000' }}>Total TTC:</span>
            <span style={{ ...valueStyle, fontWeight: 700, fontSize: '18px', color: globalTheme.primaryColor }}>
              {totalTTC} {currency}
            </span>
          </div>
        )}
      </div>
    );
  }

  // ============== DEFAULT / UNKNOWN ==============
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f0f0f0',
      borderRadius: '8px',
      textAlign: 'center',
      color: '#666',
    }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{moduleDef.icon}</div>
      <div style={{ fontWeight: 600 }}>{moduleDef.name}</div>
      <div style={{ fontSize: '12px' }}>Module en cours de développement...</div>
    </div>
  );
};

export default ModuleRenderer;
