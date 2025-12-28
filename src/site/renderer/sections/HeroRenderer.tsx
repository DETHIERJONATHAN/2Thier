import React, { useCallback, useMemo, useRef } from 'react';
import { Button, Space } from 'antd';
import { RocketOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { RenderText } from '../components/RenderText';
import { renderIconNode } from '../utils/icon';
import WebsiteFormModal from '../../components/WebsiteFormModal';
import usePublicFormModal from '../../hooks/usePublicFormModal';
import '../../../styles/site-responsive.css';

/**
 * 🎨 HERO RENDERER - 100% MOBILE RESPONSIVE
 * Reproduction exacte du site vitrine 2Thier avec optimisations mobile-first
 */

type HeroActionType =
  | 'contact-form'
  | 'scroll-to-section'
  | 'internal-page'
  | 'external-url'
  | 'phone'
  | 'email'
  | 'none';

interface HeroButtonConfig {
  text: string;
  actionType: HeroActionType;
  formTarget?: string | string[];
  formAnchor?: string | string[];
  sectionAnchor?: string | string[];
  pageSlug?: string | string[];
  customUrl?: string;
  openInNewTab?: boolean;
  phoneNumber?: string;
  emailAddress?: string;
  href?: string;
  icon?: any;
  style?: Record<string, any> | null;
}

interface NormalizedHeroButton {
  text: string;
  href?: string;
  target?: string;
  rel?: string;
  actionType: HeroActionType;
  icon?: any;
  style?: Record<string, any> | null;
  formId?: string;
  anchor?: string;
}

interface HeroRendererProps {
  content: any;
  mode: 'preview' | 'edit';
}

const pickFirst = (value: string | string[] | undefined | null): string | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

const resolveFormTarget = (raw?: string): { formId?: string; anchor?: string } => {
  if (!raw) return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith('form:')) {
    const id = trimmed.slice(5).trim();
    return id ? { formId: id } : {};
  }
  if (trimmed.startsWith('#')) {
    return { anchor: trimmed };
  }
  if (/^[a-z0-9-]{6,}$/i.test(trimmed)) {
    return { formId: trimmed };
  }
  return { anchor: trimmed };
};

const sanitizeTel = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.replace(/^tel:\/?/i, '') : undefined;
};

const sanitizeEmail = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.replace(/^mailto:\/?/i, '') : undefined;
};

const determineHeroAction = (button: HeroButtonConfig, legacyHref?: string): HeroActionType => {
  if (button.actionType && button.actionType !== 'none') return button.actionType;
  if (button.formTarget || button.formAnchor) return 'contact-form';
  if (button.sectionAnchor) return 'scroll-to-section';
  if (button.pageSlug) return 'internal-page';
  if (button.customUrl) return 'external-url';
  if (button.phoneNumber) return 'phone';
  if (button.emailAddress) return 'email';

  const candidate = button.href || legacyHref || '';

  if (/^tel:/i.test(candidate)) return 'phone';
  if (/^mailto:/i.test(candidate)) return 'email';
  if (/^https?:/i.test(candidate)) return 'external-url';
  if (candidate.startsWith('#')) return 'scroll-to-section';
  if (candidate.startsWith('/')) return 'internal-page';

  return 'contact-form';
};

const normalizeHeroButton = (button: any): NormalizedHeroButton | null => {
  if (!button) return null;

  const text = button.text || button.label || '';
  if (!text) return null;

  const legacyHref: string | undefined = button.href || button.url;

  const resolvedStyle = button.style && typeof button.style === 'object' ? button.style : undefined;

  const rawFormTarget = pickFirst(button.formTarget) || pickFirst(button.formAnchor);
  const { formId, anchor } = resolveFormTarget(rawFormTarget);

  const baseConfig: HeroButtonConfig = {
    text,
    actionType: button.actionType || 'contact-form',
    formTarget: button.formTarget,
    formAnchor: button.formAnchor,
    sectionAnchor: button.sectionAnchor,
    pageSlug: button.pageSlug,
    customUrl: button.customUrl,
    openInNewTab: typeof button.openInNewTab === 'boolean' ? button.openInNewTab : undefined,
    phoneNumber: button.phoneNumber,
    emailAddress: button.emailAddress,
    href: legacyHref,
    icon: button.icon,
    style: resolvedStyle || null
  };

  const actionType = determineHeroAction(baseConfig, legacyHref);

  let href: string | undefined;
  let target: string | undefined;
  let rel: string | undefined;

  switch (actionType) {
    case 'contact-form':
      href = anchor || pickFirst(baseConfig.formAnchor) || '#contact';
      break;
    case 'scroll-to-section':
      href = pickFirst(baseConfig.sectionAnchor) || legacyHref;
      break;
    case 'internal-page':
      href = pickFirst(baseConfig.pageSlug) || legacyHref || '/';
      break;
    case 'external-url': {
      const custom = baseConfig.customUrl || legacyHref || '';
      const resolved = custom.trim();
      if (resolved) {
        href = resolved;
        const openNew = baseConfig.openInNewTab ?? true;
        if (openNew) {
          target = '_blank';
          rel = 'noreferrer';
        }
      }
      break;
    }
    case 'phone': {
      const phone = sanitizeTel(baseConfig.phoneNumber) || sanitizeTel(legacyHref);
      if (phone) href = `tel:${phone}`;
      break;
    }
    case 'email': {
      const email = sanitizeEmail(baseConfig.emailAddress) || sanitizeEmail(legacyHref);
      if (email) href = `mailto:${email}`;
      break;
    }
    case 'none':
      return null;
    default:
      href = legacyHref;
      break;
  }

  return {
    text,
    href,
    target,
    rel,
    actionType,
    icon: baseConfig.icon,
    style: baseConfig.style || undefined,
    formId,
    anchor: anchor || pickFirst(baseConfig.formAnchor)
  };
};

// 🔧 Helper: Ajouter 'px' si valeur numérique sans unité
const ensureUnit = (value: string | number | undefined, defaultValue: string): string => {
  if (!value) return defaultValue;
  const str = String(value);
  // Si c'est juste un nombre, ajouter 'px'
  if (/^\d+$/.test(str)) return `${str}px`;
  return str;
};

export const HeroRenderer: React.FC<HeroRendererProps> = ({ content }) => {
  const containerRef = useRef(null);
  const { openFormModal, modalProps } = usePublicFormModal();

  const {
    title = null,
    subtitle = null,
    primaryButton: rawPrimaryButton = null,
    secondaryButton: rawSecondaryButton = null,
    footer = null,
    style = {}
  } = content;

  const primaryButton = useMemo(() => normalizeHeroButton(rawPrimaryButton), [rawPrimaryButton]);
  const secondaryButton = useMemo(() => normalizeHeroButton(rawSecondaryButton), [rawSecondaryButton]);

  const handleHeroButtonClick = useCallback(
    (event: React.MouseEvent<HTMLElement>, button: NormalizedHeroButton) => {
      // 🔥 Gestion du scroll vers une section
      if (button.actionType === 'scroll-to-section') {
        if (button.href && typeof document !== 'undefined') {
          event.preventDefault();
          const targetElement = document.querySelector(button.href);
          if (targetElement instanceof HTMLElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        return;
      }

      // 🔥 Gestion des formulaires de contact
      if (button.actionType === 'contact-form') {
        if (button.formId) {
          event.preventDefault();
          openFormModal(button.formId);
          return;
        }

        if (button.anchor && typeof document !== 'undefined') {
          event.preventDefault();
          const targetElement = document.querySelector(button.anchor);
          if (targetElement instanceof HTMLElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    },
    [openFormModal]
  );

  const primaryButtonIconNode = primaryButton
    ? renderIconNode(primaryButton.icon, {
        size: ensureUnit(primaryButton.style?.fontSize, '18px'),
        color: primaryButton.style?.color
      })
    : null;

  const footerIconNode = footer
    ? renderIconNode(footer.icon, {
        size: ensureUnit(footer.fontSize, '16px'),
        color: footer.color
      })
    : null;

  return (
    <>
      <div
      className="hero-renderer"
      ref={containerRef}
      style={{
        background: style.background || 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
        minHeight: style.minHeight || 'clamp(400px, 60vh, 700px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: style.padding || 'clamp(40px, 8vw, 100px) clamp(16px, 4vw, 40px)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div className="site-container" style={{ 
        maxWidth: ensureUnit(style.maxWidth, '1200px'),
        width: '100%', 
        textAlign: style.textAlign || 'center', 
        position: 'relative', 
        zIndex: 1,
        padding: '0 clamp(16px, 3vw, 32px)'
      }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* TITLE - 100% RESPONSIVE */}
          {title && title.text && (
            <h1 className="hero-title" style={{
              color: title.color || 'white',
              fontSize: ensureUnit(title.fontSize, 'clamp(28px, 6vw, 56px)'),
              margin: 0,
              fontWeight: title.fontWeight || 'bold',
              lineHeight: 1.2,
              marginBottom: 'clamp(12px, 2vw, 16px)'
            }}>
              <RenderText value={title.text} />
            </h1>
          )}

          {/* SUBTITLE - 100% RESPONSIVE */}
          {subtitle && subtitle.text && (
            <p className="hero-subtitle" style={{
              color: subtitle.color || 'rgba(255,255,255,0.95)',
              fontSize: ensureUnit(subtitle.fontSize, 'clamp(16px, 3vw, 20px)'),
              maxWidth: '800px',
              margin: '0 auto',
              whiteSpace: 'pre-line',
              lineHeight: 1.6,
              marginBottom: 'clamp(24px, 4vw, 32px)'
            }}>
              <RenderText value={subtitle.text} />
            </p>
          )}

          {/* BUTTONS - 100% RESPONSIVE */}
          <div className="hero-buttons">
            {primaryButton && (
              <Button
                type="primary"
                size="large"
                className="hero-button touchable"
                icon={primaryButtonIconNode ?? (primaryButton.icon === 'RocketOutlined' ? <RocketOutlined /> : null)}
                href={primaryButton.href}
                target={primaryButton.target}
                rel={primaryButton.rel}
                onClick={
                  (primaryButton.actionType === 'contact-form' || primaryButton.actionType === 'scroll-to-section')
                    ? (event) => handleHeroButtonClick(event, primaryButton)
                    : undefined
                }
                style={{
                  height: 'auto',
                  minHeight: '48px',
                  padding: primaryButton.style?.padding || 'clamp(12px, 2vw, 16px) clamp(24px, 4vw, 32px)',
                  fontSize: ensureUnit(primaryButton.style?.fontSize, 'clamp(16px, 2.5vw, 18px)'),
                  backgroundColor: primaryButton.style?.backgroundColor || 'white',
                  borderColor: primaryButton.style?.borderColor || 'white',
                  color: primaryButton.style?.color || '#10b981',
                  fontWeight: primaryButton.style?.fontWeight || 'bold',
                  borderRadius: primaryButton.style?.borderRadius || '8px',
                  width: '100%',
                  maxWidth: '300px',
                  ...primaryButton.style
                }}
              >
                <RenderText value={primaryButton.text} />
              </Button>
            )}

            {secondaryButton && (
              <Button
                size="large"
                className="hero-button touchable"
                href={secondaryButton.href}
                target={secondaryButton.target}
                rel={secondaryButton.rel}
                onClick={
                  (secondaryButton.actionType === 'contact-form' || secondaryButton.actionType === 'scroll-to-section')
                    ? (event) => handleHeroButtonClick(event, secondaryButton)
                    : undefined
                }
                style={{
                  height: 'auto',
                  minHeight: '48px',
                  padding: secondaryButton.style?.padding || 'clamp(12px, 2vw, 16px) clamp(24px, 4vw, 32px)',
                  fontSize: ensureUnit(secondaryButton.style?.fontSize, 'clamp(16px, 2.5vw, 18px)'),
                  borderColor: secondaryButton.style?.borderColor || 'white',
                  color: secondaryButton.style?.color || 'white',
                  background: secondaryButton.style?.backgroundColor || 'rgba(255,255,255,0.1)',
                  borderRadius: secondaryButton.style?.borderRadius || '8px',
                  width: '100%',
                  maxWidth: '300px',
                  ...secondaryButton.style
                }}
              >
                <RenderText value={secondaryButton.text} />
              </Button>
            )}
          </div>

          {/* FOOTER (Stats) - 100% RESPONSIVE */}
          {footer && footer.text && (
            <div style={{ marginTop: 'clamp(32px, 5vw, 40px)' }}>
              <span style={{
                color: footer.color || 'rgba(255,255,255,0.9)',
                fontSize: ensureUnit(footer.fontSize, 'clamp(14px, 2.5vw, 16px)'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                {footerIconNode ?? (footer.icon === 'CheckCircleOutlined' && <CheckCircleOutlined />)}
                <RenderText value={footer.text} />
              </span>
            </div>
          )}
        </Space>
      </div>
      </div>

      <WebsiteFormModal
        visible={modalProps.visible}
        loading={modalProps.loading}
        formConfig={modalProps.formConfig}
        onCancel={modalProps.onCancel}
        onSubmit={modalProps.onSubmit}
      />
    </>
  );
};
