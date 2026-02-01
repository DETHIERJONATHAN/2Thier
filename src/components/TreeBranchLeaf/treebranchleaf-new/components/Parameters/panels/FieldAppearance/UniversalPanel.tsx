import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, ColorPicker, Divider, Form, Input, InputNumber, Select, Switch, Typography, Upload, Button, Tooltip, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useDebouncedCallback } from '../../../../hooks/useDebouncedCallback';

const { Title, Text } = Typography;

interface UniversalPanelProps {
  value?: Record<string, unknown>;
  onChange?: (val: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const GRID_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12
};

const DEFAULT_CONFIG: Record<string, unknown> = {
  size: 'md',
  variant: 'default',
  width: '',
  labelColor: '', // 🎨 Couleur du label (héritée par les enfants/copies)
  displayIcon: '', // 🎯 Icône affichée dans la table (○, ◐, ●) - héritée par les copies
  columnsDesktop: 2,
  columnsMobile: 1,
  gutter: 16,
  collapsible: false,
  defaultCollapsed: false,
  showChildrenCount: false,
  placeholder: '',
  minLength: null,
  maxLength: null,
  mask: '',
  regex: '',
  min: null,
  max: null,
  step: 1,
  decimals: 0,
  prefix: '',
  suffix: '',
  unit: '',
  format: 'YYYY-MM-DD',
  showTime: false,
  minDate: '',
  maxDate: '',
  locale: 'fr-BE',
  selectMode: 'single',
  selectAllowClear: true,
  selectSearchable: true,
  selectShowSearch: true,
  selectAllowCustom: false,
  selectMaxSelections: null,
  fileAccept: '.pdf,.docx,.xlsx',
  fileMaxSize: 10,
  fileMultiple: false,
  fileShowPreview: true,
  imageFormats: ['jpeg', 'png', 'webp'],
  imageMaxSize: 5,
  imageRatio: '',
  imageCrop: false,
  imageThumbnails: [],
  helpTooltipType: 'none',
  helpTooltipText: '',
  helpTooltipImage: '',
  visibleToUser: true,
  isRequired: false,
  minItems: 0,
  maxItems: null,
  addButtonLabel: '',
  buttonSize: 'middle',
  buttonWidth: 'auto',
  iconOnly: false
};

const UniversalPanel: React.FC<UniversalPanelProps> = ({ value = {}, onChange, readOnly }) => {
  const [form] = Form.useForm();
  const [uploadFileList, setUploadFileList] = useState<any[]>([]);
  const normalizedValues = useMemo(() => {
    const next: Record<string, unknown> = {
      ...DEFAULT_CONFIG,
      ...value,
      // Préserver les anciens noms de propriétés
      fileMaxSize: value.fileMaxSize ?? value.maxFileSize ?? value.maxSize ?? DEFAULT_CONFIG.fileMaxSize,
      imageMaxSize: value.imageMaxSize ?? value.maxSize ?? DEFAULT_CONFIG.imageMaxSize,
      imageFormats: (value.imageFormats as string[]) ?? (value.formats as string[]) ?? DEFAULT_CONFIG.imageFormats,
      imageRatio: value.imageRatio ?? value.ratio ?? DEFAULT_CONFIG.imageRatio,
      selectMode: value.selectMode ?? value.mode ?? DEFAULT_CONFIG.selectMode,
      selectMaxSelections: value.selectMaxSelections ?? value.maxSelections ?? DEFAULT_CONFIG.selectMaxSelections,
      selectAllowClear: value.selectAllowClear ?? value.allowClear ?? DEFAULT_CONFIG.selectAllowClear,
      selectSearchable: value.selectSearchable ?? value.searchable ?? DEFAULT_CONFIG.selectSearchable,
      selectShowSearch: value.selectShowSearch ?? value.showSearch ?? DEFAULT_CONFIG.selectShowSearch,
      selectAllowCustom: value.selectAllowCustom ?? value.allowCustom ?? DEFAULT_CONFIG.selectAllowCustom,
      columnsDesktop: value.columnsDesktop ?? value.section_columnsDesktop ?? DEFAULT_CONFIG.columnsDesktop,
      columnsMobile: value.columnsMobile ?? value.section_columnsMobile ?? DEFAULT_CONFIG.columnsMobile,
      gutter: value.gutter ?? value.section_gutter ?? DEFAULT_CONFIG.gutter
    };

    // Garantir que les tableaux existent
    next.imageFormats = Array.isArray(next.imageFormats) ? next.imageFormats : DEFAULT_CONFIG.imageFormats;
    next.imageThumbnails = Array.isArray(value.imageThumbnails) ? value.imageThumbnails : DEFAULT_CONFIG.imageThumbnails;

    return next;
  }, [value]);

  const [localValues, setLocalValues] = useState<Record<string, unknown>>(normalizedValues);

  useEffect(() => {
    setLocalValues(normalizedValues);
    form.setFieldsValue(normalizedValues);
    if (normalizedValues.helpTooltipImage && typeof normalizedValues.helpTooltipImage === 'string' && normalizedValues.helpTooltipImage.trim()) {
      setUploadFileList([
        {
          uid: '-1',
          name: 'tooltip-image',
          status: 'done',
          url: normalizedValues.helpTooltipImage
        }
      ]);
    } else {
      setUploadFileList([]);
    }
  }, [normalizedValues, form]);

  const debouncedSave = useDebouncedCallback((vals: Record<string, unknown>) => {
    onChange?.(vals);
  }, 400);

  const handleValuesChange = useCallback((_: Record<string, unknown>, allValues: Record<string, unknown>) => {
    setLocalValues(allValues);
    debouncedSave(allValues);
  }, [debouncedSave]);

  const renderTooltipPreview = useMemo(() => {
    if (!localValues.helpTooltipType || localValues.helpTooltipType === 'none') {
      return null;
    }
    return (
      <div style={{ marginTop: 8, fontSize: 11, color: '#666' }}>
        Prévisualisation disponible directement dans TBL.
      </div>
    );
  }, [localValues.helpTooltipType]);

  return (
    <Card size="small" bordered>
      <Title level={5} style={{ marginTop: 0 }}>🎨 Module d'apparence universel</Title>
      <Text type="secondary" style={{ fontSize: 11 }}>
        Toutes les options sont disponibles pour chaque champ. Remplissez uniquement les sections utiles.
      </Text>

      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        disabled={readOnly}
        style={{ marginTop: 16 }}
      >
        <Divider orientation="left">Disposition & Responsive</Divider>
        <div style={GRID_STYLE}>
          <Form.Item name="size" label="Taille">
            <Select
              options={[
                { value: 'sm', label: 'Petite (200px)' },
                { value: 'md', label: 'Moyenne (300px)' },
                { value: 'lg', label: 'Grande (400px)' }
              ]}
            />
          </Form.Item>
          <Form.Item name="variant" label="Variante">
            <Select
              options={[
                { value: 'default', label: 'Standard' },
                { value: 'ghost', label: 'Ghost' },
                { value: 'filled', label: 'Fond rempli' },
                { value: 'borderless', label: 'Sans bordure' }
              ]}
            />
          </Form.Item>
          <Form.Item name="width" label={<Tooltip title="Valeur CSS personnalisée (ex: 100%, 320px)">Largeur personnalisée</Tooltip>}>
            <Input placeholder="auto / 320px / 100%" allowClear />
          </Form.Item>
          <Form.Item 
            name="labelColor" 
            label={<Tooltip title="Couleur héritée par les champs enfants et copies du repeater">Couleur du label</Tooltip>}
            getValueFromEvent={(color) => color ? (typeof color === 'string' ? color : color.toHexString()) : ''}
          >
            <ColorPicker showText allowClear />
          </Form.Item>
          <Form.Item 
            name="displayIcon" 
            label={<Tooltip title="Icône affichée dans la colonne 'subtap display' de la table. Héritée par les copies du champ">Icône de champ (TBL)</Tooltip>}
          >
            <Select
              allowClear
              placeholder="Choisir une icône"
              options={[
                { value: '', label: '(Aucune - icône par défaut)' },
                { value: '●', label: '● Champ (C)' },
                { value: '◐', label: '◐ Champ + Option (O+C)' },
                { value: '○', label: '○ Option (O)' }
              ]}
            />
          </Form.Item>
          <Form.Item name="columnsDesktop" label="Colonnes desktop">
            <InputNumber min={1} max={12} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="columnsMobile" label="Colonnes mobile">
            <InputNumber min={1} max={6} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="gutter" label="Espacement (px)">
            <InputNumber min={0} max={64} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="collapsible" label="Bloc repliable" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="defaultCollapsed" label="Replié par défaut" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="showChildrenCount" label="Compteur d'enfants" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>

        <Divider orientation="left">Texte</Divider>
        <div style={GRID_STYLE}>
          <Form.Item name="placeholder" label="Placeholder">
            <Input allowClear />
          </Form.Item>
          <Form.Item name="minLength" label="Longueur min">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="maxLength" label="Longueur max">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="mask" label="Masque">
            <Input placeholder="99/99/9999" allowClear />
          </Form.Item>
          <Form.Item name="regex" label="Regex">
            <Input placeholder="^[A-Za-z]+$" allowClear />
          </Form.Item>
        </div>

        <Divider orientation="left">Nombre</Divider>
        <div style={GRID_STYLE}>
          <Form.Item name="min" label="Min">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="max" label="Max">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="step" label="Pas">
            <InputNumber style={{ width: '100%' }} min={0.01} step={0.01} />
          </Form.Item>
          <Form.Item name="decimals" label="Décimales">
            <InputNumber style={{ width: '100%' }} min={0} max={6} />
          </Form.Item>
          <Form.Item name="prefix" label="Préfixe">
            <Input placeholder="€" />
          </Form.Item>
          <Form.Item name="suffix" label="Suffixe">
            <Input placeholder="%" />
          </Form.Item>
          <Form.Item name="unit" label="Unité">
            <Input placeholder="kg, km, m²" />
          </Form.Item>
        </div>

        <Divider orientation="left">Sélection</Divider>
        <div style={GRID_STYLE}>
          <Form.Item name="selectMode" label="Mode">
            <Select
              options={[
                { value: 'single', label: 'Sélection simple' },
                { value: 'multiple', label: 'Multi (liste déroulante)' },
                { value: 'checkboxes', label: 'Cases à cocher' },
                { value: 'tags', label: 'Tags' }
              ]}
            />
          </Form.Item>
          <Form.Item name="selectMaxSelections" label="Sélections max">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="selectAllowClear" label="Bouton effacer" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="selectSearchable" label="Recherchable" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="selectShowSearch" label="Barre de recherche" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="selectAllowCustom" label="Valeur libre" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>

        <Divider orientation="left">Date & heure</Divider>
        <div style={GRID_STYLE}>
          <Form.Item name="format" label="Format">
            <Input placeholder="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="showTime" label="Afficher l'heure" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="minDate" label="Date min">
            <Input placeholder="2025-01-01" />
          </Form.Item>
          <Form.Item name="maxDate" label="Date max">
            <Input placeholder="2025-12-31" />
          </Form.Item>
          <Form.Item name="locale" label="Locale">
            <Input placeholder="fr-BE" />
          </Form.Item>
        </div>

        <Divider orientation="left">Fichiers</Divider>
        <div style={GRID_STYLE}>
          <Form.Item name="fileAccept" label="Formats acceptés">
            <Input placeholder=".pdf,.png" />
          </Form.Item>
          <Form.Item name="fileMaxSize" label="Taille max (Mo)">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="fileMultiple" label="Multiple" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="fileShowPreview" label="Prévisualisation" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>

        <Divider orientation="left">Images</Divider>
        <div style={GRID_STYLE}>
          <Form.Item name="imageFormats" label="Formats">
            <Select mode="tags" placeholder="jpeg,png,webp" />
          </Form.Item>
          <Form.Item name="imageMaxSize" label="Taille max (Mo)">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="imageRatio" label="Ratio">
            <Select
              allowClear
              options={[
                { value: '1:1', label: '1:1' },
                { value: '3:2', label: '3:2' },
                { value: '4:3', label: '4:3' },
                { value: '16:9', label: '16:9' }
              ]}
            />
          </Form.Item>
          <Form.Item name="imageCrop" label="Activer le crop" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="imageThumbnails" label="Thumbnails (LxH)">
            <Select mode="tags" placeholder="96x96, 320x180" />
          </Form.Item>
        </div>

        <Divider orientation="left">Bloc répétable</Divider>
        <div style={GRID_STYLE}>
          <Form.Item name="minItems" label="Min occurrences">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="maxItems" label="Max occurrences">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="addButtonLabel" label="Label bouton">
            <Input placeholder="Ajouter un élément" />
          </Form.Item>
          <Form.Item name="buttonSize" label="Taille bouton">
            <Select
              options={[
                { value: 'tiny', label: 'Très petit' },
                { value: 'small', label: 'Petit' },
                { value: 'middle', label: 'Moyen' },
                { value: 'large', label: 'Grand' }
              ]}
            />
          </Form.Item>
          <Form.Item name="buttonWidth" label="Largeur bouton">
            <Select
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'half', label: 'Demi largeur' },
                { value: 'full', label: 'Pleine largeur' }
              ]}
            />
          </Form.Item>
          <Form.Item name="iconOnly" label="Icône seule" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>

        <Divider orientation="left">Tooltip d'aide</Divider>
        <div style={GRID_STYLE}>
          <Form.Item name="helpTooltipType" label="Type">
            <Select
              options={[
                { value: 'none', label: 'Aucun' },
                { value: 'text', label: 'Texte' },
                { value: 'image', label: 'Image' },
                { value: 'both', label: 'Texte + Image' }
              ]}
            />
          </Form.Item>
          <Form.Item name="helpTooltipText" label="Texte">
            <Input.TextArea rows={2} placeholder="Explication supplémentaire" />
          </Form.Item>
          <Form.Item name="helpTooltipImage" label="Image">
            <Upload
              listType="picture"
              maxCount={1}
              fileList={uploadFileList}
              beforeUpload={(file) => {
                const isImage = file.type.startsWith('image/');
                if (!isImage) {
                  message.error('Seules les images sont autorisées');
                  return Upload.LIST_IGNORE;
                }
                const isLt5M = file.size / 1024 / 1024 < 5;
                if (!isLt5M) {
                  message.error('5Mo maximum');
                  return Upload.LIST_IGNORE;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                  const base64 = e.target?.result as string;
                  const nextValues = { ...form.getFieldsValue(), helpTooltipImage: base64 };
                  form.setFieldsValue(nextValues);
                  setLocalValues(nextValues);
                  setUploadFileList([
                    {
                      uid: file.uid,
                      name: file.name,
                      status: 'done',
                      url: base64
                    }
                  ]);
                  onChange?.(nextValues);
                };
                reader.readAsDataURL(file);
                return false;
              }}
              onRemove={() => {
                const nextValues = { ...form.getFieldsValue(), helpTooltipImage: '' };
                setUploadFileList([]);
                form.setFieldsValue(nextValues);
                setLocalValues(nextValues);
                onChange?.(nextValues);
              }}
            >
              <Button icon={<UploadOutlined />}>Uploader</Button>
            </Upload>
            {renderTooltipPreview}
          </Form.Item>
        </div>

        <Divider orientation="left">Accès & obligations</Divider>
        <div style={GRID_STYLE}>
          <Form.Item name="visibleToUser" label="Visible" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="isRequired" label="Requis" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>
      </Form>
    </Card>
  );
};

export default UniversalPanel;
