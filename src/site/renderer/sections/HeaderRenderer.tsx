import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Menu, Button, Drawer } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { RenderText } from '../components/RenderText';
import { renderIconNode, resolveIconValue } from '../utils/icon';
import WebsiteFormModal from '../../components/WebsiteFormModal';
import usePublicFormModal from '../../hooks/usePublicFormModal';
import '../../../styles/site-responsive.css';

/**
 * 🎨 HEADER RENDERER V3 - 100% MOBILE RESPONSIVE
 * 
 * Améliorations :
 * - Sticky header avec transition smooth
 * - Background blur au scroll
 * - Menu animé (slide-in)
 * - Logo avec effet hover
 * - Mobile menu avec animations
 * - Shadow qui apparaît au scroll
 * - ✨ NOUVEAU : 100% responsive mobile/tablet/desktop
 * - ✨ NOUVEAU : Touch-friendly avec zones tactiles optimisées
 * - ✨ NOUVEAU : Padding et spacing adaptatifs
 * 
 * @author IA Assistant - Phase D + Responsive
 */

interface HeaderRendererProps {
  content: any;
  mode: 'preview' | 'edit';
}

type HeaderActionType =
  | 'contact-form'
  | 'scroll-to-section'
  | 'internal-page'
  | 'external-url'
  | 'phone'
  | 'email'
  | 'simulator-form'
  | 'none';

interface HeaderCtaConfig {
  text: string;
  actionType: HeaderActionType;
  formTarget?: string | string[];
  formAnchor?: string | string[];
  sectionAnchor?: string | string[];
  pageSlug?: string | string[];
  customUrl?: string;
  openInNewTab?: boolean;
  phoneNumber?: string;
  emailAddress?: string;
  simulatorSlug?: string;
  href?: string;
  buttonType?: string;
  buttonSize?: string;
  style?: Record<string, any> | undefined;
}

interface NormalizedHeaderCta {
  text: string;
  href?: string;
  target?: string;
  rel?: string;
  actionType: HeaderActionType;
  buttonType?: string;
  buttonSize?: string;
  style?: Record<string, any> | undefined;
  formId?: string;
  anchor?: string;
  simulatorSlug?: string;
}

const pickFirst = (value: string | string[] | undefined): string | undefined => {
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

const determineHeaderAction = (button: HeaderCtaConfig, legacyHref?: string): HeaderActionType => {
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

const normalizeHeaderCta = (cta: any): NormalizedHeaderCta | null => {
  if (!cta) return null;

  const text = cta.text || cta.label || '';
  if (!text) return null;

  const legacyHref: string | undefined = cta.href || cta.url;
  const style = cta.style && typeof cta.style === 'object' ? cta.style : undefined;
  const rawFormTarget = pickFirst(cta.formTarget) || pickFirst(cta.formAnchor);
  const { formId, anchor } = resolveFormTarget(rawFormTarget);

  const baseConfig: HeaderCtaConfig = {
    text,
    actionType: cta.actionType || 'contact-form',
    formTarget: cta.formTarget,
    formAnchor: cta.formAnchor,
    sectionAnchor: cta.sectionAnchor,
    pageSlug: cta.pageSlug,
    customUrl: cta.customUrl,
    openInNewTab: typeof cta.openInNewTab === 'boolean' ? cta.openInNewTab : undefined,
    phoneNumber: cta.phoneNumber,
    emailAddress: cta.emailAddress,
    simulatorSlug: cta.simulatorSlug,
    href: legacyHref,
    buttonType: cta.buttonType,
    buttonSize: cta.buttonSize,
    style
  };

  const actionType = determineHeaderAction(baseConfig, legacyHref);

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
    case 'simulator-form': {
      // Le simulateur est géré via JavaScript dans handleCtaClick
      if (baseConfig.simulatorSlug) {
        href = `/simulateur/${baseConfig.simulatorSlug}`;
      }
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
    buttonType: baseConfig.buttonType,
    buttonSize: baseConfig.buttonSize,
    style: baseConfig.style,
    formId,
    anchor: anchor || pickFirst(baseConfig.formAnchor),
    simulatorSlug: baseConfig.simulatorSlug
  };
};

export const HeaderRenderer: React.FC<HeaderRendererProps> = ({ content }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { openFormModal, modalProps } = usePublicFormModal();
  
  // 🔧 ADAPTATION AU SEED 2THIER : Lire les bonnes propriétés
  const {
    logo = {},
    navigation = {},  // ✅ Seed a "navigation" pas "menuItems"
    cta: rawCta = null,       // ✅ Seed a "cta" (objet) pas "ctaButtons" (array)
    style = {},
    menuStyle = {},   // 🔥 NOUVEAU : Lire les styles du menu
    responsive = {}   // 🔥 NOUVEAU : Configuration responsive
  } = content;

  const cta = useMemo(() => normalizeHeaderCta(rawCta), [rawCta]);

  const handleCtaClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!cta) return;

      // 🔥 Gestion du scroll vers une section
      if (cta.actionType === 'scroll-to-section') {
        if (cta.href && typeof document !== 'undefined') {
          event.preventDefault();
          const targetElement = document.querySelector(cta.href);
          if (targetElement instanceof HTMLElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        return;
      }

      // 🔥 Gestion des formulaires de contact
      if (cta.actionType === 'contact-form') {
        if (cta.formId) {
          event.preventDefault();
          openFormModal(cta.formId);
          return;
        }

        if (cta.anchor && typeof document !== 'undefined') {
          event.preventDefault();
          const targetElement = document.querySelector(cta.anchor);
          if (targetElement instanceof HTMLElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }

      // 🆕 Gestion des simulateurs / formulaires avancés
      if (cta.actionType === 'simulator-form') {
        if (cta.simulatorSlug) {
          event.preventDefault();
          window.location.href = `/simulateur/${cta.simulatorSlug}`;
        }
      }
    },
    [cta, openFormModal]
  );

  // � Handler pour les liens du menu (smooth scroll pour ancres)
  const handleMenuLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (href && href.startsWith('#') && typeof document !== 'undefined') {
        event.preventDefault();
        const targetElement = document.querySelector(href);
        if (targetElement instanceof HTMLElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    },
    []
  );

  // �🔧 Helper: Ajouter 'px' si valeur numérique sans unité
  const ensureUnit = (value: string | number | undefined, defaultValue: string): string => {
    if (!value) return defaultValue;
    const str = String(value);
    // Si c'est juste un nombre, ajouter 'px'
    if (/^\d+$/.test(str)) return `${str}px`;
    return str;
  };

  // Adapter navigation.links → menuItems pour compatibilité
  const menuItems = navigation.links || [];

  // 📱 Détection mobile
  useEffect(() => {
    const breakpoint = responsive.mobileBreakpoint || 768;
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 📡 Détection du scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 🎨 Styles dynamiques : RESPECTER les styles du seed ! + RESPONSIVE
  const headerStyles = {
    // ✅ Utiliser style.position du seed (fixed) au lieu de behavior.sticky
    position: (style.position || 'relative') as any,
    top: style.top || 0,
    zIndex: style.zIndex || 1000,
    // 🔥 FIX: Utiliser ensureUnit pour ajouter 'px' si absent
    height: ensureUnit(style.height, '64px'),
    minHeight: ensureUnit(style.height, '64px'),
    // ✅ Utiliser backgroundColor du seed au lieu de background
    background: style.backgroundColor || style.background || '#ffffff',
    backdropFilter: style.backdropFilter || (isScrolled ? 'blur(10px)' : 'none'),
    // 🔥 RESPONSIVE: Padding adaptatif mobile/tablet/desktop
    padding: style.padding || (isScrolled ? 
      'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 48px)' : 
      'clamp(12px, 2vw, 16px) clamp(16px, 4vw, 48px)'
    ),
    boxShadow: style.boxShadow || (isScrolled ? '0 4px 12px rgba(0,0,0,0.08)' : '0 2px 4px rgba(0,0,0,0.04)'),
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    // ✅ Appliquer les autres styles du seed (display, alignItems, etc.)
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  };

  return (
    <>
      <motion.header
      className="header-renderer"
      style={headerStyles}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
    >
      <div className="header-container" style={{
        maxWidth: ensureUnit(style.maxWidth, '1200px'),
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        minHeight: ensureUnit(style.height, '64px'),
        padding: '0 clamp(12px, 2vw, 24px)'
      }}>
        {/* 🎯 ZONE 1: LOGO (avec alignement indépendant + RESPONSIVE) */}
        <motion.div
          className="header-logo"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            display: 'flex',
            justifyContent: style.logoAlign || 'flex-start',
            alignItems: 'center',
            gap: 'clamp(8px, 1.5vw, 12px)',
            // 🔥 FIX + RESPONSIVE: Taille responsive
            fontSize: ensureUnit(logo.fontSize, `clamp(18px, 4vw, ${isScrolled ? '22px' : '24px'})`),
            fontWeight: logo.fontWeight || 'bold',
            color: logo.color || style.color || '#000',
            cursor: 'pointer',
            transition: 'font-size 0.3s ease',
            whiteSpace: 'nowrap'
          }}
        >
          {/* Image seule OU Image + Texte */}
          {(logo.type === 'image' || logo.type === 'image-text') && logo.image && (
            <motion.img 
              src={logo.image}
              alt="Logo" 
              style={{ 
                // 🔥 RESPONSIVE: Hauteur adaptative
                height: `clamp(32px, 6vw, ${isScrolled ? '36px' : '40px'})`,
                maxHeight: '56px',
                transition: 'height 0.3s ease',
                objectFit: 'contain'
              }}
              whileHover={{ scale: 1.05 }}
            />
          )}
          
          {/* Emoji (si type text-emoji) */}
          {logo.type === 'text-emoji' && logo.emoji && (
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
            >
              {logo.emoji}
            </motion.span>
          )}
          
          {/* Texte (si text, text-emoji OU image-text) */}
          {(logo.type === 'text' || logo.type === 'text-emoji' || logo.type === 'image-text') && logo.text && (
            <RenderText value={logo.text} />
          )}
        </motion.div>

        {/* 🎯 ZONE 2: MENU (avec alignement indépendant) */}
        <nav 
          className="header-desktop-menu"
          style={{ 
            flex: 1,
            display: 'flex',
            justifyContent: style.menuAlign || 'center',
            alignItems: 'center',
            // 🔥 FIX: Utiliser menuStyle.spacing pour l'espacement entre liens
            gap: `${menuStyle.spacing || 32}px`,
            padding: '0 clamp(16px, 3vw, 32px)'
          }}
        >
          {menuItems.map((item: any, index: number) => {
            const hasIcon = item.icon && resolveIconValue(item.icon).type !== 'none';
            const iconColor = item.iconColor || menuStyle.iconColor || menuStyle.color || style.color || '#000';
            const href = pickFirst(item.href) || item.url || '#';  // 🔥 Support des arrays
            
            return (
              <motion.a
                key={index}
                href={href}
                onClick={(e) => handleMenuLinkClick(e, href)}  // 🔥 Smooth scroll
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ 
                  scale: 1.05,
                  // 🔥 FIX: Utiliser menuStyle.hoverColor
                  color: menuStyle.hoverColor || style.primaryColor || '#1890ff'
                }}
                style={{
                  // 🔥 FIX: Utiliser menuStyle au lieu de valeurs hardcodées
                  color: menuStyle.color || style.color || '#000',
                  textDecoration: 'none',
                  fontSize: ensureUnit(menuStyle.fontSize, '16px'),
                  fontWeight: menuStyle.fontWeight || 500,
                  position: 'relative',
                  transition: 'color 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {/* 🎨 ICÔNE DU MENU ITEM */}
                {hasIcon && (
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {renderIconNode(item.icon, {
                      size: '18px',
                      color: iconColor
                    })}
                  </span>
                )}
                <RenderText value={item.text || item.label} />  {/* ✅ Seed utilise "text" pas "label" */}
                <motion.div
                  className="menu-underline"
                  initial={{ width: 0 }}
                  whileHover={{ width: '100%' }}
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    left: 0,
                    height: '2px',
                    // 🔥 FIX: Utiliser menuStyle.hoverColor pour la ligne de soulignement
                    background: menuStyle.hoverColor || style.primaryColor || '#1890ff',
                    transition: 'width 0.3s ease'
                  }}
                />
              </motion.a>
            );
          })}
        </nav>

        {/* 🎯 ZONE 3: CTA BUTTON (avec alignement indépendant) */}
        {cta && cta.actionType !== 'none' && cta.text && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={responsive.hiddenOnMobile?.includes('secondary-cta') && isMobile ? 'hide-mobile' : ''}
            style={{
              display: (responsive.hiddenOnMobile?.includes('secondary-cta') && isMobile) ? 'none' : 'flex',
              justifyContent: style.ctaAlign || 'flex-end',
              alignItems: 'center',
              height: '100%'
            }}
          >
            <Button
              type={cta.buttonType || 'primary'}
              href={cta.href}
              target={cta.target}
              rel={cta.rel}
              size={cta.buttonSize || 'large'}
              className="touchable"
              onClick={
                (cta.actionType === 'contact-form' || cta.actionType === 'scroll-to-section')
                  ? handleCtaClick
                  : undefined
              }
              style={{
                borderRadius: '8px',
                fontWeight: 600,
                backgroundColor: cta.style?.backgroundColor,
                borderColor: cta.style?.borderColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...cta.style
              }}
            >
              <RenderText value={cta.text} />
            </Button>
          </motion.div>
        )}

        {/* 🎯 MOBILE MENU BUTTON - 100% RESPONSIVE */}
        <motion.div
          className="header-mobile-menu-btn"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button
            type="text"
            className="touchable"
            icon={<MenuOutlined />}
            onClick={() => setMobileMenuOpen(true)}
            size="large"
            style={{
              fontSize: 'clamp(20px, 4vw, 24px)',
              minHeight: '44px',
              minWidth: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        </motion.div>
      </div>

      {/* 🎯 MOBILE DRAWER - 100% RESPONSIVE */}
      <Drawer
        title="Menu"
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width="85vw"
        style={{ maxWidth: '400px' }}
        styles={{
          body: { padding: '16px' }
        }}
      >
        <Menu mode="vertical" style={{ border: 'none' }}>
          {menuItems.map((item: any, index: number) => {
            const hasIcon = item.icon && resolveIconValue(item.icon).type !== 'none';
            const iconColor = item.iconColor || menuStyle.iconColor || menuStyle.color || style.color || '#000';
            
            return (
              <Menu.Item key={index} style={{ minHeight: '48px' }}>
                <motion.a
                  href={item.href || item.url || '#'}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="touchable"
                  style={{
                    color: style.color || '#000',
                    textDecoration: 'none',
                    fontSize: 'clamp(15px, 3vw, 18px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    minHeight: '44px'
                  }}
                >
                  {/* 🎨 ICÔNE DU MENU ITEM MOBILE */}
                  {hasIcon && (
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      {renderIconNode(item.icon, {
                        size: 'clamp(18px, 3.5vw, 22px)',
                        color: iconColor
                      })}
                    </span>
                  )}
                  <RenderText value={item.text || item.label} />
                </motion.a>
              </Menu.Item>
            );
          })}
        </Menu>
      </Drawer>

      {/* 🎨 RESPONSIVE STYLES */}
      <style>{`
        @media (min-width: 768px) {
          .header-desktop-menu { display: flex !important; }
          .header-mobile-menu-btn { display: none !important; }
        }
        @media (max-width: 767px) {
          .header-desktop-menu { display: none !important; }
          .header-mobile-menu-btn { display: inline-flex !important; }
        }
      `}</style>
      </motion.header>

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
