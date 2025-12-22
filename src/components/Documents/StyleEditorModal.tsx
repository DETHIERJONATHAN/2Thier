import { Modal, Form, Select, InputNumber, ColorPicker, Space, Divider } from 'antd';
import { useState, useEffect, useRef } from 'react';

export type FieldStyle = {
  // Styles texte
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | 'normal' | 'bold';
  color?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  letterSpacing?: number;
  lineHeight?: number;
  
  // Styles image/logo
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
  position?: 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'custom';
  x?: number;
  y?: number;
  opacity?: number;
};

interface StyleEditorModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (style: FieldStyle) => void;
  initialStyle?: FieldStyle;
  fieldLabel?: string;
  fieldName?: string; // Pour détecter le type de champ
}

const FONT_FAMILIES = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Tahoma, sans-serif', label: 'Tahoma' },
  { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
  { value: 'Impact, sans-serif', label: 'Impact' },
  { value: 'Comic Sans MS, cursive', label: 'Comic Sans MS' },
  { value: 'Palatino, serif', label: 'Palatino' },
  { value: 'Garamond, serif', label: 'Garamond' },
  { value: 'Bookman, serif', label: 'Bookman' },
  { value: 'Arial Black, sans-serif', label: 'Arial Black' }
];

const StyleEditorModal = ({ open, onClose, onSave, initialStyle, fieldLabel, fieldName }: StyleEditorModalProps) => {
  const [form] = Form.useForm();
  const [previewStyle, setPreviewStyle] = useState<FieldStyle>(initialStyle || {});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  // Détection du type de champ
  const isImageField = fieldName?.toLowerCase().includes('image') || fieldName?.toLowerCase().includes('logo');

  useEffect(() => {
    if (initialStyle) {
      form.setFieldsValue(initialStyle);
      setPreviewStyle(initialStyle);
    }
  }, [initialStyle, form]);

  const handleValuesChange = (_: any, allValues: any) => {
    const style: FieldStyle = {
      ...allValues,
      color: allValues.color?.toHexString?.() || allValues.color,
      backgroundColor: allValues.backgroundColor?.toHexString?.() || allValues.backgroundColor
    };
    setPreviewStyle(style);
  };

  const handleSave = () => {
    const values = form.getFieldsValue();
    const style: FieldStyle = {
      ...values,
      color: values.color?.toHexString?.() || values.color,
      backgroundColor: values.backgroundColor?.toHexString?.() || values.backgroundColor
    };
    onSave(style);
    onClose();
  };

  // Gestion du drag & drop pour positionner visuellement
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!elementRef.current || !previewContainerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    
    const elementRect = elementRef.current.getBoundingClientRect();
    const containerRect = previewContainerRef.current.getBoundingClientRect();
    
    // Calculer la position actuelle de l'élément par rapport au container
    const currentX = elementRect.left - containerRect.left;
    const currentY = elementRect.top - containerRect.top;
    
    // Forcer le passage en mode custom avec la position actuelle
    if (previewStyle.position !== 'custom') {
      form.setFieldsValue({ position: 'custom', x: Math.round(currentX), y: Math.round(currentY) });
      setPreviewStyle(prev => ({ ...prev, position: 'custom', x: Math.round(currentX), y: Math.round(currentY) }));
    }
    
    setIsDragging(true);
    
    // Calculer l'offset du clic dans l'élément
    setDragStart({
      x: e.clientX - elementRect.left,
      y: e.clientY - elementRect.top
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !previewContainerRef.current) return;
    
    const containerRect = previewContainerRef.current.getBoundingClientRect();
    
    // Calculer la nouvelle position
    let x = e.clientX - containerRect.left - dragStart.x;
    let y = e.clientY - containerRect.top - dragStart.y;
    
    // Limiter aux bordures du container (avec marges)
    x = Math.max(0, Math.min(x, containerRect.width - 100));
    y = Math.max(0, Math.min(y, containerRect.height - 50));
    
    // Mettre à jour la position
    form.setFieldsValue({ position: 'custom', x: Math.round(x), y: Math.round(y) });
    setPreviewStyle(prev => ({ ...prev, position: 'custom', x: Math.round(x), y: Math.round(y) }));
    setPreviewStyle(prev => ({ ...prev, position: 'custom', x: Math.round(x), y: Math.round(y) }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <Modal
      title={`🎨 Style : ${fieldLabel || 'Champ'}`}
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      width={700}
      okText="Appliquer"
      cancelText="Annuler"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Formulaire */}
        <div>
          <Form
            form={form}
            layout="vertical"
            initialValues={isImageField ? {
              maxWidth: 250,
              maxHeight: 100,
              objectFit: 'contain',
              position: 'top-left',
              x: 30,
              y: 30,
              opacity: 1,
              ...initialStyle
            } : {
              fontFamily: 'Arial, sans-serif',
              fontSize: 14,
              fontWeight: 'normal',
              color: '#000000',
              backgroundColor: 'transparent',
              textAlign: 'left',
              fontStyle: 'normal',
              textDecoration: 'none',
              textTransform: 'none',
              letterSpacing: 0,
              lineHeight: 1.5,
              ...initialStyle
            }}
            onValuesChange={handleValuesChange}
          >
            {!isImageField && (
              <>
                {/* Contrôles pour texte */}
                <Form.Item name="fontFamily" label="Police">
              <Select options={FONT_FAMILIES} />
            </Form.Item>

            <Space style={{ width: '100%' }}>
              <Form.Item name="fontSize" label="Taille" style={{ marginBottom: 0 }}>
                <InputNumber min={8} max={72} addonAfter="px" />
              </Form.Item>

              <Form.Item name="fontWeight" label="Graisse" style={{ marginBottom: 0 }}>
                <Select style={{ width: 120 }}>
                  <Select.Option value="normal">Normal</Select.Option>
                  <Select.Option value="bold">Gras</Select.Option>
                  <Select.Option value={300}>Léger</Select.Option>
                  <Select.Option value={500}>Moyen</Select.Option>
                  <Select.Option value={700}>Extra Gras</Select.Option>
                </Select>
              </Form.Item>
            </Space>

            <Space style={{ width: '100%' }}>
              <Form.Item name="color" label="Couleur texte" style={{ marginBottom: 0 }}>
                <ColorPicker showText />
              </Form.Item>

              <Form.Item name="backgroundColor" label="Fond" style={{ marginBottom: 0 }}>
                <ColorPicker showText />
              </Form.Item>
            </Space>

            <Form.Item name="textAlign" label="Alignement">
              <Select>
                <Select.Option value="left">⬅️ Gauche</Select.Option>
                <Select.Option value="center">↔️ Centré</Select.Option>
                <Select.Option value="right">➡️ Droite</Select.Option>
                <Select.Option value="justify">↔️ Justifié</Select.Option>
              </Select>
            </Form.Item>

            <Space style={{ width: '100%' }}>
              <Form.Item name="fontStyle" label="Style" style={{ marginBottom: 0 }}>
                <Select style={{ width: 110 }}>
                  <Select.Option value="normal">Normal</Select.Option>
                  <Select.Option value="italic">Italique</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="textDecoration" label="Décoration" style={{ marginBottom: 0 }}>
                <Select style={{ width: 130 }}>
                  <Select.Option value="none">Aucune</Select.Option>
                  <Select.Option value="underline">Souligné</Select.Option>
                  <Select.Option value="line-through">Barré</Select.Option>
                </Select>
              </Form.Item>
            </Space>

            <Form.Item name="textTransform" label="Casse">
              <Select>
                <Select.Option value="none">Normale</Select.Option>
                <Select.Option value="uppercase">MAJUSCULES</Select.Option>
                <Select.Option value="lowercase">minuscules</Select.Option>
                <Select.Option value="capitalize">Première Lettre Majuscule</Select.Option>
              </Select>
            </Form.Item>

            <Space style={{ width: '100%' }}>
              <Form.Item name="letterSpacing" label="Espacement lettres" style={{ marginBottom: 0 }}>
                <InputNumber min={-2} max={10} step={0.5} addonAfter="px" />
              </Form.Item>

              <Form.Item name="lineHeight" label="Hauteur ligne" style={{ marginBottom: 0 }}>
                <InputNumber min={0.8} max={3} step={0.1} />
              </Form.Item>
            </Space>
              </>
            )}

            {/* CONTRÔLES DE POSITION POUR TOUS LES CHAMPS */}
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #1890ff' }}>
              <h4 style={{ marginBottom: '15px', color: '#1890ff' }}>📐 Position & Dimensions</h4>
              
              <Form.Item name="position" label="Position">
                <Select placeholder="Position par défaut" allowClear>
                  <Select.Option value="top-left">📍 Haut gauche</Select.Option>
                  <Select.Option value="top-center">📍 Haut centre</Select.Option>
                  <Select.Option value="top-right">📍 Haut droite</Select.Option>
                  <Select.Option value="middle-left">📍 Milieu gauche</Select.Option>
                  <Select.Option value="center">📍 Centre</Select.Option>
                  <Select.Option value="middle-right">📍 Milieu droite</Select.Option>
                  <Select.Option value="bottom-left">📍 Bas gauche</Select.Option>
                  <Select.Option value="bottom-center">📍 Bas centre</Select.Option>
                  <Select.Option value="bottom-right">📍 Bas droite</Select.Option>
                  <Select.Option value="custom">🎯 Position personnalisée (X/Y)</Select.Option>
                </Select>
              </Form.Item>

              {previewStyle.position === 'custom' && (
                <Space style={{ width: '100%' }}>
                  <Form.Item 
                    name="x" 
                    label="Position X" 
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber 
                      min={0} 
                      max={1000} 
                      addonAfter="px"
                    />
                  </Form.Item>

                  <Form.Item 
                    name="y" 
                    label="Position Y" 
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber 
                      min={0} 
                      max={1500} 
                      addonAfter="px"
                    />
                  </Form.Item>
                </Space>
              )}

              {isImageField && (
                <>
                  <Space style={{ width: '100%' }}>
                    <Form.Item name="maxWidth" label="Largeur max" style={{ marginBottom: 0 }}>
                      <InputNumber min={50} max={500} addonAfter="px" />
                    </Form.Item>

                    <Form.Item name="maxHeight" label="Hauteur max" style={{ marginBottom: 0 }}>
                      <InputNumber min={50} max={300} addonAfter="px" />
                    </Form.Item>
                  </Space>

                  <Form.Item name="objectFit" label="Ajustement">
                    <Select>
                      <Select.Option value="contain">🖼️ Contenir (respecte proportions)</Select.Option>
                      <Select.Option value="cover">🖼️ Couvrir (remplir)</Select.Option>
                      <Select.Option value="fill">🖼️ Étirer</Select.Option>
                      <Select.Option value="none">🖼️ Taille originale</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item name="opacity" label="Opacité">
                    <InputNumber min={0} max={1} step={0.1} />
                  </Form.Item>
                </>
              )}
            </div>
          </Form>
        </div>

        {/* Aperçu */}
        <div>
          <Divider orientation="left">Aperçu Interactif - Glissez pour positionner</Divider>
          <div
            ref={previewContainerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              padding: '20px',
              border: '2px solid #1890ff',
              borderRadius: '8px',
              backgroundColor: '#fafafa',
              minHeight: '400px',
              position: 'relative',
              cursor: isDragging ? 'grabbing' : 'default',
              userSelect: 'none'
            }}
          >
            <div style={{ 
              position: 'absolute', 
              top: '8px', 
              right: '8px', 
              fontSize: '12px', 
              color: '#1890ff',
              backgroundColor: 'white',
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid #91d5ff',
              zIndex: 1000,
              fontWeight: 500
            }}>
              {previewStyle.position === 'custom' 
                ? `📍 X: ${previewStyle.x || 0}px, Y: ${previewStyle.y || 0}px` 
                : `📍 ${previewStyle.position || 'Automatique'}`}
            </div>
            {isImageField ? (
              <div 
                ref={elementRef}
                onMouseDown={handleMouseDown}
                style={{
                  position: 'absolute',
                  top: previewStyle.position === 'custom' ? previewStyle.y || 30 :
                       previewStyle.position?.includes('top') ? 30 :
                       previewStyle.position?.includes('middle') ? '50%' :
                       previewStyle.position?.includes('bottom') ? 'auto' : 30,
                  bottom: previewStyle.position?.includes('bottom') ? 30 : 'auto',
                  left: previewStyle.position === 'custom' ? previewStyle.x || 30 :
                        previewStyle.position?.includes('left') ? 30 :
                        previewStyle.position?.includes('center') ? '50%' : 'auto',
                  right: previewStyle.position?.includes('right') ? 30 : 'auto',
                  transform: previewStyle.position === 'center' ? 'translate(-50%, -50%)' :
                            previewStyle.position?.includes('center') && !previewStyle.position?.includes('middle') ? 'translateX(-50%)' :
                            previewStyle.position?.includes('middle') && !previewStyle.position?.includes('center') ? 'translateY(-50%)' : 'none',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  opacity: previewStyle.opacity || 1,
                  border: '2px dashed #1890ff',
                  padding: '8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(24, 144, 255, 0.05)',
                  transition: isDragging ? 'none' : 'all 0.2s ease'
                }}>
                <img 
                  src="https://via.placeholder.com/250x100/1890ff/ffffff?text=LOGO"
                  alt="Aperçu logo"
                  style={{
                    maxWidth: previewStyle.maxWidth || 250,
                    maxHeight: previewStyle.maxHeight || 100,
                    objectFit: previewStyle.objectFit || 'contain',
                    opacity: previewStyle.opacity || 1,
                    pointerEvents: 'none',
                    display: 'block'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '-24px',
                  left: '0',
                  backgroundColor: '#1890ff',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}>
                  ✋ Glissez pour déplacer
                </div>
              </div>
            ) : (
              <div 
                ref={elementRef}
                onMouseDown={handleMouseDown}
                style={{
                  position: 'absolute',
                  top: previewStyle.position === 'custom' ? previewStyle.y || 30 :
                       previewStyle.position?.includes('top') ? 30 :
                       previewStyle.position?.includes('middle') ? '50%' :
                       previewStyle.position?.includes('bottom') ? 'auto' : 30,
                  bottom: previewStyle.position?.includes('bottom') ? 30 : 'auto',
                  left: previewStyle.position === 'custom' ? previewStyle.x || 30 :
                        previewStyle.position?.includes('left') ? 30 :
                        previewStyle.position?.includes('center') ? '50%' : 'auto',
                  right: previewStyle.position?.includes('right') ? 30 : 'auto',
                  transform: previewStyle.position === 'center' ? 'translate(-50%, -50%)' :
                            previewStyle.position?.includes('center') && !previewStyle.position?.includes('middle') ? 'translateX(-50%)' :
                            previewStyle.position?.includes('middle') && !previewStyle.position?.includes('center') ? 'translateY(-50%)' : 'none',
                  fontFamily: previewStyle.fontFamily,
                  fontSize: previewStyle.fontSize,
                  fontWeight: previewStyle.fontWeight,
                  color: previewStyle.color,
                  backgroundColor: previewStyle.backgroundColor,
                  textAlign: previewStyle.textAlign,
                  fontStyle: previewStyle.fontStyle,
                  textDecoration: previewStyle.textDecoration,
                  textTransform: previewStyle.textTransform,
                  letterSpacing: `${previewStyle.letterSpacing}px`,
                  lineHeight: previewStyle.lineHeight,
                  padding: '15px',
                  borderRadius: '6px',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  border: '2px dashed #1890ff',
                  maxWidth: '80%',
                  transition: isDragging ? 'none' : 'all 0.2s ease'
                }}>
                <div style={{
                  position: 'absolute',
                  top: '-24px',
                  left: '0',
                  backgroundColor: '#1890ff',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}>
                  ✋ Glissez pour déplacer
                </div>
                {fieldLabel || 'Texte d\'exemple'}
                <br />
                Voici comment votre texte apparaîtra avec tous les styles appliqués.
              </div>
            )}

            <div style={{ 
              position: 'absolute', 
              bottom: '10px', 
              left: '10px', 
              right: '10px',
              fontSize: '11px', 
              color: '#1890ff',
              backgroundColor: '#e6f7ff',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #91d5ff',
              fontWeight: 500
            }}>
              💡 <strong>Mode interactif :</strong> Cliquez et glissez l'élément pour le positionner où vous voulez !
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default StyleEditorModal;
