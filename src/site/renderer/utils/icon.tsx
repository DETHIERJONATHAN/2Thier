/**
 * 🧠 ICON UTILITIES
 *
 * Fonctions utilitaires pour interpréter et rendre dynamiquement
 * les valeurs des champs d'icônes (support icône, emoji ou image).
 */

import React from 'react';
import * as AntIcons from '@ant-design/icons';
import { logger } from '../../../lib/logger';

export type IconFieldValue =
  | string
  | {
      mode?: 'icon' | 'image' | 'emoji';
      icon?: string;
      image?: string;
      emoji?: string;
    };

export interface ResolvedIconValue {
  type: 'icon' | 'image' | 'emoji' | 'none';
  iconName?: string;
  image?: string;
  emoji?: string;
}

export interface RenderIconOptions {
  size?: string | number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

const toSize = (value?: string | number, fallback = '32px'): string => {
  if (typeof value === 'number') return `${value}px`;
  if (!value) return fallback;
  return value;
};

const isLikelyEmoji = (value: string) => {
  if (!value) return false;
  if (value.startsWith('<')) return false;
  if (value.length > 4) return false;
  const code = value.codePointAt(0);
  if (!code) return false;
  return code > 0x1f000 || /[\u2600-\u27bf]/.test(value);
};

const isLikelyAntIcon = (value: string) => /Outlined$|Filled$|TwoTone$/.test(value);

export const resolveIconValue = (value?: IconFieldValue): ResolvedIconValue => {
  if (!value) return { type: 'none' };

  if (typeof value === 'string') {
    if (value.startsWith('data:image') || /^https?:/i.test(value)) {
      return { type: 'image', image: value };
    }

    if (isLikelyAntIcon(value)) {
      return { type: 'icon', iconName: value };
    }

    if (isLikelyEmoji(value)) {
      return { type: 'emoji', emoji: value };
    }

    // Fallback : tenter comme icône Ant Design
    return { type: 'icon', iconName: value };
  }

  const mode = value.mode;
  const image = value.image;
  const iconName = value.icon;
  const emoji = value.emoji;

  if (mode === 'image' || image) {
    return { type: 'image', image: image || '' };
  }

  if (mode === 'emoji' || emoji) {
    return { type: 'emoji', emoji: emoji || iconName };
  }

  if (mode === 'icon' || iconName) {
    return { type: 'icon', iconName: iconName || '' };
  }

  return { type: 'none' };
};

export const renderIconNode = (
  value: IconFieldValue,
  options?: RenderIconOptions
): React.ReactNode => {
  // Protection contre les valeurs undefined/null
  if (!value) return null;
  
  const resolved = resolveIconValue(value);
  const size = toSize(options?.size);

  switch (resolved.type) {
    case 'image':
      if (!resolved.image) return null;
      return (
        <img
          src={resolved.image}
          alt="icône"
          className={options?.className}
          style={{
            width: size,
            height: size,
            objectFit: 'contain',
            display: 'inline-block',
            ...options?.style
          }}
        />
      );
    case 'emoji':
      if (!resolved.emoji) return null; // Protection contre emoji undefined
      return (
        <span
          className={options?.className}
          style={{
            fontSize: size,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...options?.style
          }}
        >
          {resolved.emoji}
        </span>
      );
    case 'icon': {
      if (!resolved.iconName) return null;
      const IconComponent = (AntIcons as any)[resolved.iconName];
      if (IconComponent) {
        return (
          <IconComponent
            className={options?.className}
            style={{ fontSize: size, color: options?.color, ...options?.style }}
          />
        );
      }
      // Si l'icône n'existe pas, ne pas rendre de fallback
      logger.warn(`[Icon] Icône Ant Design introuvable: ${resolved.iconName}`);
      return null;
    }
    default:
      return null;
  }
};

export default renderIconNode;
