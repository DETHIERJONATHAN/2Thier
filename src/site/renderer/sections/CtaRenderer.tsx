import React, { Fragment, useCallback, useMemo } from 'react';
import { Button, Space } from 'antd';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { RenderText } from '../components/RenderText';
import WebsiteFormModal from '../../components/WebsiteFormModal';
import { renderIconNode } from '../utils/icon';
import usePublicFormModal from '../../hooks/usePublicFormModal';

/**
 * 🎨 CTA RENDERER V2 - AVEC PULSE EFFECTS & FORM MODAL
 */

interface CtaRendererProps {
  content: any;
  mode?: 'preview' | 'edit';
}

type ActionType =
  | 'contact-form'
  | 'scroll-to-section'
  | 'internal-page'
  | 'external-url'
  | 'phone'
  | 'email'
  | 'simulator-form'
  | 'none';

interface CTAButtonConfig {
  text: string;
  actionType?: ActionType | string;
  internalPath?: string;
  externalUrl?: string;
  customUrl?: string;
  formTarget?: string | string[];
  formAnchor?: string | string[];
  sectionAnchor?: string | string[];
  pageSlug?: string | string[];
  phoneNumber?: string;
  emailAddress?: string;
  simulatorSlug?: string;
  openInNewTab?: boolean;
  size?: 'large' | 'middle' | 'small';
  href?: string;
  icon?: React.ReactNode;
  style?: Record<string, any>;
  [key: string]: any;
}

interface NormalizedCTAButton extends CTAButtonConfig {
  actionType: ActionType;
  href?: string;
  target?: string;
  rel?: string;
  formId?: string;
  anchor?: string;
}

const pickFirst = (value?: string | string[]): string | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

const sanitizeTel = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.replace(/^tel:?/i, '').replace(/^\//, '') : undefined;
};

const sanitizeEmail = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.replace(/^mailto:?/i, '').replace(/^\//, '') : undefined;
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

const normalizeRawActionType = (action?: string): ActionType => {
  if (!action) return 'contact-form';
  const normalized = action.toLowerCase();
  switch (normalized) {
    case 'contact-form':
    case 'form':
      return 'contact-form';
    case 'scroll-to-section':
    case 'anchor':
      return 'scroll-to-section';
    case 'internal-page':
    case 'internal':
      return 'internal-page';
    case 'external-url':
    case 'external':
      return 'external-url';
    case 'phone':
    case 'tel':
      return 'phone';
    case 'email':
    case 'mailto':
      return 'email';
    case 'simulator-form':
    case 'simulator':
      return 'simulator-form';
    case 'none':
      return 'none';
    default:
      return 'contact-form';
  }
};

const determineActionType = (button: CTAButtonConfig, legacyHref?: string): ActionType => {
  if (button.actionType) {
    return normalizeRawActionType(typeof button.actionType === 'string' ? button.actionType : undefined);
  }

  if (button.formTarget || button.formAnchor) return 'contact-form';
  if (button.sectionAnchor) return 'scroll-to-section';
  if (button.pageSlug) return 'internal-page';
  if (button.customUrl || button.externalUrl) return 'external-url';
  if (button.phoneNumber) return 'phone';
  if (button.emailAddress) return 'email';
  if (button.internalPath) {
    return button.internalPath.startsWith('#') ? 'scroll-to-section' : 'internal-page';
  }

  const candidate = (button.href || legacyHref || '').trim();

  if (/^tel:/i.test(candidate)) return 'phone';
  if (/^mailto:/i.test(candidate)) return 'email';
  if (/^https?:/i.test(candidate)) return 'external-url';
  if (candidate.startsWith('#')) return 'scroll-to-section';
  if (candidate.startsWith('/')) return 'internal-page';

  return 'contact-form';
};

export const CtaRenderer: React.FC<CtaRendererProps> = ({ content, mode = 'preview' }) => {
  const [ref, inView] = useInView({
    threshold: 0.3,
    triggerOnce: true
  });

  const { openFormModal, modalProps } = usePublicFormModal();

  const {
    title = '',
    subtitle = '',
    primaryButton: explicitPrimaryButton = null,
    secondaryButton: explicitSecondaryButton = null,
    buttons = [],
    media = {},
    style = {},
    stats = []
  } = content;

  const fallbackButtons = Array.isArray(buttons) ? buttons : [];
  const rawPrimaryButton = explicitPrimaryButton ?? fallbackButtons[0] ?? null;
  const rawSecondaryButton = explicitSecondaryButton ?? fallbackButtons[1] ?? null;

  const sectionBackground = style.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  const normalizeButton = useCallback((button: any): NormalizedCTAButton | null => {
    if (!button) return null;

    const legacyHref: string | undefined = button.href || button.url || undefined;

    const resolvedStyle = button.style && typeof button.style === 'object'
      ? button.style
      : (button.backgroundColor || button.borderColor || button.color
          ? {
              backgroundColor: button.backgroundColor,
              borderColor: button.borderColor,
              color: button.color
            }
          : undefined);

    const draft: CTAButtonConfig = {
      text: button.text || button.label || '',
      actionType: button.actionType,
      internalPath: button.internalPath,
      externalUrl: button.externalUrl,
      customUrl: button.customUrl,
      formTarget: button.formTarget || button.formAnchor || button.formId || button.formSlug,
      formAnchor: button.formAnchor || button.formTarget,
      sectionAnchor: button.sectionAnchor,
      pageSlug: button.pageSlug,
      phoneNumber: button.phoneNumber || (legacyHref?.startsWith('tel:') ? legacyHref.replace(/^tel:/i, '') : undefined),
      emailAddress: button.emailAddress || (legacyHref?.startsWith('mailto:') ? legacyHref.replace(/^mailto:/i, '') : undefined),
      openInNewTab: typeof button.openInNewTab === 'boolean' ? button.openInNewTab : button.target === '_blank',
      size: button.size,
      href: legacyHref,
      icon: button.icon,
      style: resolvedStyle
    };

    const actionType = determineActionType(draft, legacyHref);

    let href: string | undefined = draft.href;
    let target: string | undefined;
    let rel: string | undefined;
    const rawFormTarget = pickFirst(draft.formTarget) || pickFirst(draft.formAnchor);
    const { formId, anchor } = resolveFormTarget(rawFormTarget);

    switch (actionType) {
      case 'contact-form': {
        const resolvedAnchor = anchor || pickFirst(draft.formAnchor) || draft.internalPath;
        href = resolvedAnchor;
        break;
      }
      case 'scroll-to-section': {
        const anchor = pickFirst(draft.sectionAnchor) || draft.internalPath || draft.href;
        href = anchor || '#';
        break;
      }
      case 'internal-page': {
        const slug = pickFirst(draft.pageSlug) || draft.internalPath || draft.href;
        href = slug || '/';
        break;
      }
      case 'external-url': {
        const custom = draft.customUrl || draft.externalUrl || draft.href || '';
        const resolved = custom.trim();
        if (resolved) {
          href = resolved;
          const openNew = draft.openInNewTab ?? true;
          if (openNew) {
            target = '_blank';
            rel = 'noopener noreferrer';
          }
        }
        break;
      }
      case 'phone': {
        const phone = sanitizeTel(draft.phoneNumber) || sanitizeTel(draft.href);
        href = phone ? `tel:${phone}` : undefined;
        break;
      }
      case 'email': {
        const email = sanitizeEmail(draft.emailAddress) || sanitizeEmail(draft.href);
        href = email ? `mailto:${email}` : undefined;
        break;
      }
      case 'simulator-form': {
        // Le simulateur est géré via JavaScript dans handleButtonClick
        if (draft.simulatorSlug) {
          href = `/simulateur/${draft.simulatorSlug}`;
        }
        break;
      }
      case 'none':
        return null;
      default:
        break;
    }

    return {
      ...draft,
      actionType,
      href,
      target,
      rel,
      formId,
      anchor: anchor || pickFirst(draft.formAnchor)
    };
  }, []);

  const normalizedPrimaryButton = useMemo(
    () => normalizeButton(rawPrimaryButton),
    [normalizeButton, rawPrimaryButton]
  );

  const normalizedSecondaryButton = useMemo(
    () => normalizeButton(rawSecondaryButton),
    [normalizeButton, rawSecondaryButton]
  );

  const handleButtonClick = useCallback(
    (event: React.MouseEvent<HTMLElement>, button: NormalizedCTAButton) => {
      const actionType = button.actionType || determineActionType(button);
      
      // 🔥 Gestion du scroll vers une section
      if (actionType === 'scroll-to-section') {
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
      if (actionType === 'contact-form') {
        if (button.formId) {
          event.preventDefault();
          openFormModal(button.formId);
          return;
        }

        const anchor = button.anchor;
        if (anchor && typeof document !== 'undefined') {
          const selector = anchor.startsWith('#') ? anchor : `#${anchor}`;
          const target = document.querySelector(selector);
          if (target instanceof HTMLElement) {
            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }

      // 🆕 Gestion des simulateurs / formulaires avancés
      if (actionType === 'simulator-form') {
        if (button.simulatorSlug) {
          event.preventDefault();
          window.location.href = `/simulateur/${button.simulatorSlug}`;
        }
      }
    },
    [openFormModal]
  );

  const resolveButtonBehavior = useCallback((button: NormalizedCTAButton) => {
    const action = button.actionType || determineActionType(button);

    switch (action) {
      case 'contact-form': {
        const anchor = button.anchor;
        const href = anchor ? (anchor.startsWith('#') ? anchor : `#${anchor}`) : undefined;
        return {
          href,
          onClick: (event: React.MouseEvent<HTMLElement>) => handleButtonClick(event, button)
        };
      }
      case 'scroll-to-section': {
        const anchor = pickFirst(button.sectionAnchor) || button.internalPath || button.href || '#';
        return { 
          href: anchor,
          onClick: (event: React.MouseEvent<HTMLElement>) => handleButtonClick(event, button)
        };
      }
      case 'external-url': {
        const href = button.href || button.customUrl || button.externalUrl || '#';
        const openPreference = button.openInNewTab;
        const openNew = typeof openPreference === 'boolean'
          ? openPreference
          : button.target
            ? button.target === '_blank'
            : true;
        return {
          href,
          target: openNew ? '_blank' : undefined,
          rel: openNew ? 'noopener noreferrer' : undefined
        };
      }
      case 'phone': {
        const phone = sanitizeTel(button.phoneNumber) || sanitizeTel(button.href);
        return { href: phone ? `tel:${phone}` : undefined };
      }
      case 'email': {
        const email = sanitizeEmail(button.emailAddress) || sanitizeEmail(button.href);
        return { href: email ? `mailto:${email}` : undefined };
      }
      case 'simulator-form': {
        // Le onClick sera géré par handleButtonClick
        return {
          href: button.simulatorSlug ? `/simulateur/${button.simulatorSlug}` : '#',
          onClick: (event: React.MouseEvent<HTMLElement>) => handleButtonClick(event, button)
        };
      }
      case 'internal-page':
      default: {
        const path = pickFirst(button.pageSlug) || button.internalPath || button.href || '#';
        return { href: path };
      }
    }
  }, [handleButtonClick]);

  const renderCTAButton = useCallback((button: NormalizedCTAButton | null, variant: 'primary' | 'secondary') => {
    if (!button || !button.text) return null;

    const behavior = resolveButtonBehavior(button);
    const size = button.size || 'large';
    const action = button.actionType || determineActionType(button);

    if (action === 'none') return null;

    const sharedStyle = {
      height: button.style?.height || '64px',
      padding: button.style?.padding || '0 48px',
      fontSize: button.style?.fontSize || '18px',
      fontWeight: button.style?.fontWeight || '600',
      borderRadius: button.style?.borderRadius || '12px',
      ...button.style
    };

    const iconNode = renderIconNode(button.icon, {
      size: button.style?.fontSize || '18px',
      color: button.style?.color
    });

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      if (mode === 'edit' && behavior.href && action !== 'contact-form') {
        event.preventDefault();
      }

      if (behavior.onClick) {
        behavior.onClick(event);
      }
    };

    if (variant === 'primary') {
      return (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <motion.div
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(255, 255, 255, 0.7)',
                '0 0 0 20px rgba(255, 255, 255, 0)',
                '0 0 0 0 rgba(255, 255, 255, 0)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            style={{ borderRadius: sharedStyle.borderRadius, display: 'inline-block' }}
          >
            <Button
              type="primary"
              size={size}
              href={behavior.href}
              target={behavior.target}
              rel={behavior.rel}
              onClick={handleClick}
              style={{
                ...sharedStyle,
                backgroundColor: button.style?.backgroundColor || '#ffffff',
                borderColor: button.style?.borderColor,
                color: button.style?.color || sectionBackground,
                border: button.style?.border || 'none',
                boxShadow: button.style?.boxShadow || '0 8px 24px rgba(0,0,0,0.15)'
              }}
            >
              {iconNode && (
                <span
                  style={{
                    marginRight: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: '1em'
                  }}
                >
                  {iconNode}
                </span>
              )}
              <RenderText value={button.text} />
            </Button>
          </motion.div>
        </motion.div>
      );
    }

    return (
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          size={size}
          href={behavior.href}
          target={behavior.target}
          rel={behavior.rel}
          onClick={handleClick}
          style={{
            ...sharedStyle,
            backgroundColor: button.style?.backgroundColor || 'transparent',
            color: button.style?.color || '#ffffff',
            border: button.style?.border || '2px solid rgba(255,255,255,0.5)',
            backdropFilter: button.style?.backdropFilter || 'blur(10px)'
          }}
        >
          {iconNode && (
            <span
              style={{
                marginRight: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                height: '1em'
              }}
            >
              {iconNode}
            </span>
          )}
          <RenderText value={button.text} />
        </Button>
      </motion.div>
    );
  }, [mode, resolveButtonBehavior, sectionBackground]);

  // 🎬 Container variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  // 🎬 Item variants
  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.43, 0.13, 0.23, 0.96]
      }
    }
  };

  return (
    <Fragment>
      <section
        style={{
          padding: '120px 48px',
          background: sectionBackground,
          position: 'relative',
          overflow: 'hidden',
          ...style
        }}
      >
        {/* 🎨 ANIMATED GRADIENT BACKGROUND */}
        <motion.div
          animate={{
            background: [
              'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 100% 100%, rgba(255,255,255,0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 0% 100%, rgba(255,255,255,0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)'
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0, zIndex: 0 }}
        />

        {/* 🎨 BACKGROUND IMAGE */}
        {media.type === 'image' && media.url && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${media.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.2,
              zIndex: 0
            }}
          />
        )}

        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1
          }}
        >
          {title && (
            <motion.h2
              variants={itemVariants}
              style={{
                fontSize: 'clamp(32px, 5vw, 56px)',
                fontWeight: 'bold',
                marginBottom: '24px',
                color: style.titleColor || '#ffffff',
                lineHeight: '1.2'
              }}
              dangerouslySetInnerHTML={{ __html: title }}
            />
          )}

          {subtitle && (
            <motion.p
              variants={itemVariants}
              style={{
                fontSize: 'clamp(16px, 2vw, 22px)',
                marginBottom: '48px',
                color: style.subtitleColor || 'rgba(255,255,255,0.9)',
                lineHeight: '1.6',
                maxWidth: '700px',
                margin: '0 auto 48px'
              }}
            >
              <RenderText value={subtitle} />
            </motion.p>
          )}

          <motion.div variants={itemVariants}>
            <Space size="large" wrap>
              {renderCTAButton(normalizedPrimaryButton, 'primary')}
              {renderCTAButton(normalizedSecondaryButton, 'secondary')}
            </Space>
          </motion.div>

          {Array.isArray(stats) && stats.length > 0 && (
            <motion.div
              variants={itemVariants}
              style={{
                marginTop: '64px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '48px',
                justifyContent: 'center'
              }}
            >
              {stats.map((stat: any, index: number) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.1 }}
                  style={{ textAlign: 'center' }}
                >
                  <div style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    marginBottom: '8px'
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.8)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    <RenderText value={stat.label} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        <style>{`
          @media (max-width: 768px) {
            section {
              padding: 80px 24px !important;
            }
          }
        `}</style>
      </section>

      <WebsiteFormModal
        visible={modalProps.visible}
        loading={modalProps.loading}
        formConfig={modalProps.formConfig}
        onSubmit={modalProps.onSubmit}
        onCancel={modalProps.onCancel}
      />
    </Fragment>
  );
};
