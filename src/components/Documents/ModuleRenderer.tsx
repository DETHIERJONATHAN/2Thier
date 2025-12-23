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
