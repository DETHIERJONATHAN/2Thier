/**
 * 🎨 ColorInput - Composant d'input couleur avec support rgba et noms
 * Remplace <Input type="color"> pour supporter tous les formats de couleurs
 */

import React, { useState, useEffect } from 'react';
import { Input, Space, ColorPicker, Button, Tooltip } from 'antd';
import { BgColorsOutlined, CloseOutlined } from '@ant-design/icons';
import { cleanColor, hexToRgba, isValidHexColor } from '../../utils/colorUtils';

interface ColorInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  allowClear?: boolean;
  showAlpha?: boolean; // Permet de gérer l'opacité
  presets?: string[]; // Couleurs prédéfinies
}

export const ColorInput: React.FC<ColorInputProps> = ({
  value,
  onChange,
  placeholder = '#ffffff',
  defaultValue = '#ffffff',
  disabled = false,
  allowClear = true,
  showAlpha = false,
  presets = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#000000', '#ffffff']
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [hexValue, setHexValue] = useState<string>(defaultValue);

  // Synchroniser avec la prop value
  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
      const cleaned = cleanColor(value, defaultValue);
      setHexValue(cleaned);
    }
  }, [value, defaultValue]);

  // Handler pour le changement dans l'input texte
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Nettoyer et convertir
    const cleaned = cleanColor(newValue, hexValue);
    setHexValue(cleaned);
    
    // Notifier le parent avec la valeur brute (permet de garder rgba si besoin)
    onChange?.(newValue);
  };

  // Handler pour le ColorPicker
  const handleColorPickerChange = (color: any) => {
    let newValue: string;

    if (showAlpha && color.metaColor?.a !== undefined && color.metaColor.a < 1) {
      // Si alpha est activé et < 1, retourner rgba
      const rgba = hexToRgba(color.toHexString(), color.metaColor.a);
      newValue = rgba;
      setInputValue(rgba);
    } else {
      // Sinon retourner hex
      newValue = color.toHexString();
      setInputValue(newValue);
    }

    setHexValue(color.toHexString());
    onChange?.(newValue);
  };

  // Handler pour clear
  const handleClear = () => {
    setInputValue('');
    setHexValue(defaultValue);
    onChange?.('');
  };

  return (
    <Space.Compact style={{ width: '100%' }}>
      {/* Input texte pour saisie manuelle */}
      <Input
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        prefix={<BgColorsOutlined style={{ color: hexValue }} />}
        style={{ 
          flex: 1,
          borderColor: isValidHexColor(hexValue) ? '#d9d9d9' : '#ff4d4f'
        }}
      />

      {/* ColorPicker Ant Design 5 */}
      <ColorPicker
        value={hexValue}
        onChange={handleColorPickerChange}
        disabled={disabled}
        showText={false}
        presets={presets.length > 0 ? [
          {
            label: 'Couleurs recommandées',
            colors: presets
          }
        ] : undefined}
        format={showAlpha ? 'rgb' : 'hex'}
      />

      {/* Bouton clear */}
      {allowClear && inputValue && !disabled && (
        <Tooltip title="Effacer">
          <Button
            icon={<CloseOutlined />}
            onClick={handleClear}
            danger
          />
        </Tooltip>
      )}
    </Space.Compact>
  );
};

/**
 * Hook pour gérer les couleurs dans un formulaire
 * @example
 * const { color, setColor, cleanedColor } = useColor('#ffffff');
 */
export function useColor(initialColor: string = '#ffffff') {
  const [color, setColor] = useState<string>(initialColor);
  const [cleanedColor, setCleanedColor] = useState<string>(cleanColor(initialColor));

  const updateColor = (newColor: string) => {
    setColor(newColor);
    setCleanedColor(cleanColor(newColor, cleanedColor));
  };

  return {
    color,
    setColor: updateColor,
    cleanedColor
  };
}
