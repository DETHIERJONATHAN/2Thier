/**
 * 🧩 ICON OR IMAGE PICKER
 *
 * Fournit un sélecteur hybride permettant de choisir soit une icône (bibliothèque existante),
 * soit une image personnalisée pour représenter un élément.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Segmented, Space } from 'antd';
import IconPicker from './IconPicker';
import ImageUploader from './ImageUploader';

export type IconValue =
  | string
  | {
      mode?: 'icon' | 'image' | 'emoji';
      icon?: string;
      image?: string;
      emoji?: string;
    };

interface IconOrImagePickerProps {
  value?: IconValue;
  onChange?: (value: IconValue) => void;
  imageMaxSize?: number;
  imageAspectRatio?: number;
  imageAllowCrop?: boolean;
}

const normalizeValue = (value?: IconValue) => {
  if (!value) {
    return {
      mode: 'icon' as const,
      icon: '',
      image: ''
    };
  }

  if (typeof value === 'string') {
    if (value.startsWith('data:image') || /^https?:/i.test(value)) {
      return { mode: 'image' as const, icon: '', image: value };
    }

    return { mode: 'icon' as const, icon: value, image: '' };
  }

  const mode: 'icon' | 'image' = value.mode
    ? (value.mode === 'image' ? 'image' : 'icon')
    : value.image
    ? 'image'
    : 'icon';

  return {
    mode,
    icon: value.icon || '',
    image: value.image || ''
  };
};

const IconOrImagePicker: React.FC<IconOrImagePickerProps> = ({
  value,
  onChange,
  imageMaxSize,
  imageAspectRatio,
  imageAllowCrop
}) => {
  const parsed = useMemo(() => normalizeValue(value), [value]);
  const [mode, setMode] = useState<'icon' | 'image'>(parsed.mode);

  useEffect(() => {
    setMode(parsed.mode);
  }, [parsed.mode]);

  const handleModeChange = (nextMode: 'icon' | 'image') => {
    setMode(nextMode);
    if (nextMode === 'icon') {
      onChange?.(parsed.icon || '');
    } else {
      onChange?.({
        mode: 'image',
        icon: parsed.icon || '',
        image: parsed.image || ''
      });
    }
  };

  const handleIconChange = (icon: string) => {
    if (mode === 'image') {
      onChange?.({
        mode: 'image',
        icon,
        image: parsed.image || ''
      });
    } else {
      onChange?.(icon);
    }
  };

  const handleImageChange = (imageValue: string) => {
    onChange?.({
      mode: 'image',
      icon: parsed.icon || '',
      image: imageValue
    });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <Segmented
        value={mode}
        onChange={(val) => handleModeChange(val as 'icon' | 'image')}
        options={[
          { label: 'Icône', value: 'icon' },
          { label: 'Image', value: 'image' }
        ]}
      />

      {mode === 'icon' ? (
        <IconPicker value={parsed.icon} onChange={handleIconChange} />
      ) : (
        <ImageUploader
          value={parsed.image}
          onChange={handleImageChange}
          maxSize={imageMaxSize}
          aspectRatio={imageAspectRatio}
          allowCrop={imageAllowCrop}
        />
      )}
    </Space>
  );
};

export default IconOrImagePicker;
