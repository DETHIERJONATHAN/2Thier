/**
 * 🎨 COMPOSANT EMAIL COMPOSER RÉVOLUTIONNAIRE
 * 
 * Design de fou avec :
 * ✨ Animations fluides et micro-interactions
 * 🌈 Gradients et effets glass morphism
 * 🎯 Interface ultra-moderne et intuitive
 * 🔥 Rendu HTML spectaculaire
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, Button, message, Space, Tooltip, Typography, Upload, Collapse } from 'antd';
import { SaveOutlined, SendOutlined, LoadingOutlined, CloseOutlined, UploadOutlined } from '@ant-design/icons';
import { useDrafts, CreateDraftData, DraftData } from '../hooks/useDrafts';

const { TextArea } = Input;
const { Text } = Typography;

// 🎨 STYLES CSS RÉVOLUTIONNAIRES
const injectStyles = () => {
  if (typeof document !== 'undefined' && !document.getElementById('email-composer-revolutionary-styles')) {
    const style = document.createElement('style');
    style.id = 'email-composer-revolutionary-styles';
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.05); }
      }
      
      @keyframes shine {
        0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
        100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
      }
      
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
        50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.6); }
      }
      
      .revolutionary-email-composer {
        animation: fadeInUp 0.6s ease-out;
      }
      
      .revolutionary-email-composer .ant-input:focus,
      .revolutionary-email-composer .ant-input-focused {
        animation: glow 2s infinite;
      }
      
      .glass-effect {
        backdrop-filter: blur(20px);
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .gradient-text {
        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      /* Scrollbar personnalisée */
      .revolutionary-scroll::-webkit-scrollbar {
        width: 8px;
      }
      
      .revolutionary-scroll::-webkit-scrollbar-track {
        background: rgba(148, 163, 184, 0.1);
        border-radius: 10px;
      }
      
      .revolutionary-scroll::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
        border-radius: 10px;
        border: 2px solid rgba(255, 255, 255, 0.2);
      }
      
      .revolutionary-scroll::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      }
    `;
    document.head.appendChild(style);
  }
};

// Composant d'édition RÉVOLUTIONNAIRE avec design de FOU
const RevolutionaryHtmlEditor: React.FC<{
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}> = ({ value = '', onChange, placeholder }) => {
  const [userInput, setUserInput] = useState('');
  const [originalMessage, setOriginalMessage] = useState('');
  const [isOriginalMessageLocked, setIsOriginalMessageLocked] = useState(false);
  
  // Injection des styles révolutionnaires
  useEffect(() => {
    injectStyles();
  }, []);
  
  // CRUCIAL: Initialisation UNIQUE qui préserve le message original DÉFINITIVEMENT
  useEffect(() => {
    // Si le message original est déjà verrouillé, NE PLUS LE TOUCHER
    if (isOriginalMessageLocked) {
      console.log('[RevolutionaryHtmlEditor] 🔒 Message original verrouillé - pas de réinitialisation');
      return;
    }
    
    if (!value || value.trim() === '') {
      // Nouveau message vide
      setUserInput('');
      setOriginalMessage('');
      return;
    }
    
    console.log('[RevolutionaryHtmlEditor] 🚀 Initialisation avec value:', value?.substring(0, 100));
    
    // Détection HTML STRICTE - Si c'est un email complet, c'est du HTML
    const isComplexHtml = value.includes('DOCTYPE') || 
                         value.includes('<html') || 
                         value.includes('<body') ||
                         value.includes('<table') ||
                         value.length > 1000;
    
    if (isComplexHtml) {
      // Email reçu = TOUT dans message original, input vide pour réponse
      setOriginalMessage(value);
      setUserInput('');
      setIsOriginalMessageLocked(true); // VERROUILLER le message original POUR TOUJOURS
      console.log('[RevolutionaryHtmlEditor] 🎨 Email HTML détecté - message original VERROUILLÉ DÉFINITIVEMENT');
    } else {
      // Texte simple = input utilisateur uniquement
      setUserInput(value);
      console.log('[RevolutionaryHtmlEditor] ✍️ Texte simple - input utilisateur rempli');
    }
  }, [value, isOriginalMessageLocked]);

  const handleUserInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newUserText = e.target.value;
    
    // PROTECTION ABSOLUE: Seulement l'input utilisateur change
    setUserInput(newUserText);
    
    // IMPORTANT: onChange ne renvoie QUE le texte de l'utilisateur
    onChange?.(newUserText);
  };

  return (
    <div className="revolutionary-email-composer" style={{ 
      backgroundColor: 'white',
      borderRadius: '24px',
      overflow: 'hidden',
      border: '1px solid rgba(148, 163, 184, 0.1)',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12), 0 8px 32px rgba(0, 0, 0, 0.08)',
      background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
      position: 'relative'
    }}>
      {/* 🎨 ZONE D'ÉCRITURE ULTRA-FUTURISTE */}
      <div style={{ 
        padding: '32px',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* 🌟 Effet de brillance subtile animée */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.6) 50%, transparent 100%)',
          animation: 'shine 3s infinite'
        }} />
        
        {/* 🚀 Titre ultra-stylé */}
        <div style={{ 
          fontSize: '18px', 
          marginBottom: '20px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <span style={{
            display: 'inline-block',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '16px',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
            animation: 'pulse 3s infinite',
            transform: 'rotate(-2deg)'
          }}>
            ✍️
          </span>
          <span className="gradient-text">
            Composez votre message
          </span>
          <div style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#16a34a',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            🟢 Séparé & Protégé
          </div>
        </div>
        
        {/* 🎯 TextArea révolutionnaire */}
        <TextArea
          value={userInput}
          onChange={handleUserInputChange}
          placeholder={placeholder || "✨ Tapez votre magnifique message ici..."}
          rows={10}
          className="revolutionary-scroll"
          style={{ 
            border: '3px solid transparent',
            borderRadius: '20px',
            padding: '24px',
            fontSize: '17px',
            lineHeight: '1.8',
            resize: 'vertical',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.95) 100%)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1), inset 0 2px 0 rgba(255, 255, 255, 0.6)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "SF Pro Display", sans-serif',
            color: '#1e293b',
            minHeight: '240px',
            fontWeight: '400'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.boxShadow = '0 12px 40px rgba(59, 130, 246, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.6), 0 0 0 6px rgba(59, 130, 246, 0.15)';
            e.target.style.transform = 'translateY(-4px) scale(1.01)';
            e.target.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.98) 100%)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'transparent';
            e.target.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.1), inset 0 2px 0 rgba(255, 255, 255, 0.6)';
            e.target.style.transform = 'translateY(0) scale(1)';
            e.target.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.95) 100%)';
          }}
          showCount={{
            style: {
              color: '#64748b',
              fontSize: '13px',
              fontWeight: '600',
              background: 'rgba(100, 116, 139, 0.1)',
              padding: '4px 8px',
              borderRadius: '8px',
              backdropFilter: 'blur(8px)'
            }
          }}
        />
      </div>

      {/* 🎭 MESSAGE ORIGINAL - DESIGN SPATIAL */}
      {originalMessage && (
        <div style={{ 
          margin: '24px 32px 32px 32px',
          borderRadius: '24px',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #f1f5f9 0%, #e2e8f0 100%)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: '0 16px 60px rgba(0, 0, 0, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.8)',
          position: 'relative'
        }}>
          {/* 🌈 Header avec design spatial */}
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            padding: '20px 28px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* ✨ Particules flottantes */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `
                radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 1px, transparent 1px),
                radial-gradient(circle at 60% 70%, rgba(255,255,255,0.2) 1px, transparent 1px),
                radial-gradient(circle at 80% 30%, rgba(255,255,255,0.3) 1px, transparent 1px)
              `,
              animation: 'shine 4s infinite'
            }} />
            
            <div style={{ 
              fontSize: '16px', 
              color: 'white', 
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
              position: 'relative',
              zIndex: 1
            }}>
              <span style={{
                display: 'inline-block',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.25)',
                borderRadius: '16px',
                backdropFilter: 'blur(16px)',
                fontSize: '18px',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}>
                📧
              </span>
              <span style={{ fontSize: '18px' }}>Message original</span>
              <span style={{
                marginLeft: 'auto',
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '24px',
                fontSize: '13px',
                fontWeight: '600',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ fontSize: '12px' }}>✨</span>
                Permanent & Magnifique
              </span>
            </div>
          </div>
          
          {/* 📖 Zone de contenu avec effet glass */}
          <div 
            className="revolutionary-scroll"
            style={{
              maxHeight: '600px',
              overflow: 'auto',
              padding: '32px',
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(24px)'
            }}
          >
            {/* 💬 Badge de contenu */}
            <div style={{ 
              fontSize: '14px', 
              color: '#64748b', 
              marginBottom: '20px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              background: 'rgba(100, 116, 139, 0.08)',
              borderRadius: '16px',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(100, 116, 139, 0.1)'
            }}>
              <span style={{ fontSize: '16px' }}>💬</span>
              Contenu du message d'origine
            </div>
            
            {/* 🎨 RENDU HTML RÉVOLUTIONNAIRE */}
            <div 
              style={{
                background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                padding: '32px',
                borderRadius: '20px',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255, 255, 255, 0.9)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "SF Pro Display", sans-serif',
                lineHeight: '1.9',
                color: '#1e293b',
                fontSize: '17px',
                position: 'relative',
                overflow: 'hidden'
              }}
              dangerouslySetInnerHTML={{ 
                __html: originalMessage
                  // 🔒 NETTOYAGE SÉCURITAIRE MINIMAL SEULEMENT
                  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Supprimer les scripts pour la sécurité
                  .replace(/<link[^>]*rel=["']?stylesheet["']?[^>]*>/gi, '') // Supprimer les CSS externes
                  // ✨ GARDER TOUT LE RESTE TEL QUEL - LE HTML EST DÉJÀ PARFAIT !
              }}
            />
            
            {/* 🎯 Message d'aide RÉVOLUTIONNAIRE */}
            <div style={{
              marginTop: '24px',
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
              borderRadius: '16px',
              border: '1px solid rgba(59, 130, 246, 0.15)',
              fontSize: '14px',
              color: '#475569',
              textAlign: 'center',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              backdropFilter: 'blur(12px)'
            }}>
              <span style={{ 
                fontSize: '20px',
                animation: 'pulse 2s infinite' 
              }}>💡</span>
              <span>Ce message reste visible en permanence pendant que vous rédigez votre réponse</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevolutionaryHtmlEditor;
