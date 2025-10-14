# 🎯 PLAN MODULARITÉ COMPLÈTE + IA INTÉGRÉE

## 📋 PROBLÈME ACTUEL

L'utilisateur ne peut pas :
1. ❌ **Choisir le layout des cartes** (3x3, 5 en ligne, 4x2, 2x4, custom)
2. ❌ **Modifier les headers de section** (titre, sous-titre, couleurs)
3. ❌ **Personnaliser chaque carte individuellement** (header, contenu, couleur, icône)
4. ❌ **Utiliser l'IA pour générer/modifier** du contenu
5. ❌ **Avoir des suggestions IA** pour améliorer le design

## 🎨 SOLUTION : SYSTÈME DE GRILLE DYNAMIQUE + IA

### 1. **GridLayoutEditor** - Choisir la disposition

```typescript
// src/components/websites/editors/GridLayoutEditor.tsx
interface GridLayoutConfig {
  preset: 'auto' | '1x1' | '2x1' | '2x2' | '3x1' | '3x2' | '3x3' | '4x1' | '4x2' | '4x3' | '4x4' | '5x1' | 'custom';
  columns: number;  // 1-12
  rows: number;     // 1-10
  gap: number;      // 0-100px
  responsive: {
    mobile: number;    // colonnes sur mobile
    tablet: number;    // colonnes sur tablette
    desktop: number;   // colonnes sur desktop
  };
  alignment: 'start' | 'center' | 'end' | 'stretch';
  justifyContent: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
}

// Presets prédéfinis
const GRID_PRESETS = {
  '1x1': { columns: 1, rows: 1 },
  '2x1': { columns: 2, rows: 1 },
  '2x2': { columns: 2, rows: 2 },
  '3x1': { columns: 3, rows: 1 },
  '3x2': { columns: 3, rows: 2 },
  '3x3': { columns: 3, rows: 3 },
  '4x1': { columns: 4, rows: 1 },
  '4x2': { columns: 4, rows: 2 },
  '4x3': { columns: 4, rows: 3 },
  '4x4': { columns: 4, rows: 4 },
  '5x1': { columns: 5, rows: 1 }
};
```

**Interface** :
```typescript
<Space direction="vertical" size="large" style={{ width: '100%' }}>
  {/* Presets rapides */}
  <div>
    <label>🎯 Disposition rapide</label>
    <Radio.Group value={layout.preset} onChange={(e) => handlePresetChange(e.target.value)}>
      <Space wrap>
        <Radio.Button value="1x1">1 colonne</Radio.Button>
        <Radio.Button value="2x1">2 colonnes</Radio.Button>
        <Radio.Button value="3x1">3 colonnes</Radio.Button>
        <Radio.Button value="4x1">4 colonnes</Radio.Button>
        <Radio.Button value="5x1">5 colonnes</Radio.Button>
        <Radio.Button value="2x2">2×2 Grille</Radio.Button>
        <Radio.Button value="3x2">3×2 Grille</Radio.Button>
        <Radio.Button value="3x3">3×3 Grille</Radio.Button>
        <Radio.Button value="4x2">4×2 Grille</Radio.Button>
        <Radio.Button value="4x3">4×3 Grille</Radio.Button>
        <Radio.Button value="custom">🎨 Personnalisé</Radio.Button>
      </Space>
    </Radio.Group>
  </div>

  {/* Configuration avancée */}
  {layout.preset === 'custom' && (
    <>
      <div>
        <label>📊 Colonnes (Desktop)</label>
        <Slider min={1} max={12} value={layout.columns} onChange={(v) => updateLayout('columns', v)} />
      </div>

      <div>
        <label>📊 Lignes</label>
        <Slider min={1} max={10} value={layout.rows} onChange={(v) => updateLayout('rows', v)} />
      </div>

      <div>
        <label>📱 Responsive</label>
        <Space>
          <InputNumber addonBefore="Mobile" min={1} max={4} value={layout.responsive.mobile} />
          <InputNumber addonBefore="Tablet" min={1} max={6} value={layout.responsive.tablet} />
          <InputNumber addonBefore="Desktop" min={1} max={12} value={layout.responsive.desktop} />
        </Space>
      </div>
    </>
  )}

  {/* Espacement */}
  <div>
    <label>🔲 Espacement entre cartes</label>
    <Slider min={0} max={100} value={layout.gap} onChange={(v) => updateLayout('gap', v)} marks={{ 0: '0px', 25: '25px', 50: '50px', 75: '75px', 100: '100px' }} />
  </div>

  {/* Alignement */}
  <div>
    <label>⬌ Alignement</label>
    <Radio.Group value={layout.alignment} onChange={(e) => updateLayout('alignment', e.target.value)}>
      <Radio.Button value="start">Haut</Radio.Button>
      <Radio.Button value="center">Centre</Radio.Button>
      <Radio.Button value="end">Bas</Radio.Button>
      <Radio.Button value="stretch">Étirer</Radio.Button>
    </Radio.Group>
  </div>

  {/* Preview visuel */}
  <Card title="👁️ Aperçu de la grille">
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
      gridTemplateRows: `repeat(${layout.rows}, 80px)`,
      gap: `${layout.gap}px`,
      border: '2px dashed #ccc',
      padding: '20px'
    }}>
      {Array.from({ length: layout.columns * layout.rows }).map((_, i) => (
        <div key={i} style={{
          background: '#f0f0f0',
          border: '1px solid #ddd',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: '#999'
        }}>
          Carte {i + 1}
        </div>
      ))}
    </div>
  </Card>
</Space>
```

---

### 2. **SectionHeaderEditor** - Header de section personnalisable

Chaque section (HERO, SERVICES, PROJECTS, etc.) doit avoir un **header modifiable** :

```typescript
// src/components/websites/editors/SectionHeaderEditor.tsx
interface SectionHeaderConfig {
  enabled: boolean;
  
  // Contenu
  title: string;
  subtitle: string;
  description: string;
  showBadge: boolean;
  badgeText: string;
  badgeColor: string;
  
  // Style
  titleColor: string;
  titleSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  titleWeight: 300 | 400 | 500 | 600 | 700 | 800 | 900;
  titleAlignment: 'left' | 'center' | 'right';
  
  subtitleColor: string;
  subtitleSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  descriptionColor: string;
  descriptionMaxWidth: number; // px
  
  // Layout
  alignment: 'left' | 'center' | 'right';
  spacing: number; // mb-4, mb-8, mb-12, etc.
  
  // Fond
  backgroundColor: string;
  backgroundGradient?: string;
  paddingTop: number;
  paddingBottom: number;
  
  // Séparateur
  showDivider: boolean;
  dividerColor: string;
  dividerWidth: number; // px
  dividerStyle: 'solid' | 'dashed' | 'dotted' | 'gradient';
}
```

**Interface** :
```typescript
<Collapse defaultActiveKey={['header']}>
  <Collapse.Panel header="📋 Header de section" key="header">
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Toggle header */}
      <Switch 
        checked={headerConfig.enabled} 
        onChange={(v) => updateHeader('enabled', v)}
        checkedChildren="Header activé"
        unCheckedChildren="Header désactivé"
      />

      {headerConfig.enabled && (
        <>
          {/* Contenu */}
          <div>
            <label>📝 Titre principal</label>
            <Input 
              value={headerConfig.title}
              onChange={(e) => updateHeader('title', e.target.value)}
              placeholder="Ex: Nos Services"
              suffix={<Button icon={<RobotOutlined />} size="small">IA</Button>}
            />
          </div>

          <div>
            <label>📝 Sous-titre</label>
            <Input 
              value={headerConfig.subtitle}
              onChange={(e) => updateHeader('subtitle', e.target.value)}
              placeholder="Ex: Ce que nous offrons"
              suffix={<Button icon={<RobotOutlined />} size="small">IA</Button>}
            />
          </div>

          <div>
            <label>📝 Description</label>
            <TextArea 
              rows={3}
              value={headerConfig.description}
              onChange={(e) => updateHeader('description', e.target.value)}
              placeholder="Texte explicatif..."
              suffix={<Button icon={<RobotOutlined />} size="small">IA</Button>}
            />
          </div>

          {/* Badge optionnel */}
          <div>
            <Checkbox 
              checked={headerConfig.showBadge}
              onChange={(e) => updateHeader('showBadge', e.target.checked)}
            >
              Afficher un badge
            </Checkbox>
            {headerConfig.showBadge && (
              <Space>
                <Input 
                  placeholder="Texte du badge"
                  value={headerConfig.badgeText}
                  onChange={(e) => updateHeader('badgeText', e.target.value)}
                />
                <Input 
                  type="color"
                  value={headerConfig.badgeColor}
                  onChange={(e) => updateHeader('badgeColor', e.target.value)}
                />
              </Space>
            )}
          </div>

          {/* Style du titre */}
          <div>
            <label>🎨 Style du titre</label>
            <Space>
              <Select value={headerConfig.titleSize} onChange={(v) => updateHeader('titleSize', v)}>
                <Select.Option value="sm">Petit</Select.Option>
                <Select.Option value="md">Moyen</Select.Option>
                <Select.Option value="lg">Grand</Select.Option>
                <Select.Option value="xl">Très grand</Select.Option>
                <Select.Option value="2xl">XXL</Select.Option>
                <Select.Option value="3xl">XXXL</Select.Option>
              </Select>

              <Select value={headerConfig.titleWeight} onChange={(v) => updateHeader('titleWeight', v)}>
                <Select.Option value={300}>Light (300)</Select.Option>
                <Select.Option value={400}>Normal (400)</Select.Option>
                <Select.Option value={500}>Medium (500)</Select.Option>
                <Select.Option value={600}>Semibold (600)</Select.Option>
                <Select.Option value={700}>Bold (700)</Select.Option>
                <Select.Option value={800}>Extrabold (800)</Select.Option>
                <Select.Option value={900}>Black (900)</Select.Option>
              </Select>

              <Input 
                type="color"
                value={headerConfig.titleColor}
                onChange={(e) => updateHeader('titleColor', e.target.value)}
              />
            </Space>
          </div>

          {/* Alignement */}
          <div>
            <label>⬌ Alignement</label>
            <Radio.Group value={headerConfig.alignment} onChange={(e) => updateHeader('alignment', e.target.value)}>
              <Radio.Button value="left">Gauche</Radio.Button>
              <Radio.Button value="center">Centre</Radio.Button>
              <Radio.Button value="right">Droite</Radio.Button>
            </Radio.Group>
          </div>

          {/* Espacement */}
          <div>
            <label>📏 Espacement (marge basse)</label>
            <Slider 
              min={0} 
              max={120} 
              value={headerConfig.spacing} 
              onChange={(v) => updateHeader('spacing', v)}
              marks={{ 0: '0px', 30: '30px', 60: '60px', 90: '90px', 120: '120px' }}
            />
          </div>

          {/* Séparateur */}
          <div>
            <Checkbox 
              checked={headerConfig.showDivider}
              onChange={(e) => updateHeader('showDivider', e.target.checked)}
            >
              Afficher un séparateur
            </Checkbox>
            {headerConfig.showDivider && (
              <Space>
                <Select value={headerConfig.dividerStyle} onChange={(v) => updateHeader('dividerStyle', v)}>
                  <Select.Option value="solid">Solide</Select.Option>
                  <Select.Option value="dashed">Tirets</Select.Option>
                  <Select.Option value="dotted">Pointillés</Select.Option>
                  <Select.Option value="gradient">Dégradé</Select.Option>
                </Select>
                <InputNumber 
                  addonBefore="Largeur"
                  addonAfter="px"
                  min={1}
                  max={500}
                  value={headerConfig.dividerWidth}
                  onChange={(v) => updateHeader('dividerWidth', v)}
                />
                <Input 
                  type="color"
                  value={headerConfig.dividerColor}
                  onChange={(e) => updateHeader('dividerColor', e.target.value)}
                />
              </Space>
            )}
          </div>
        </>
      )}
    </Space>
  </Collapse.Panel>
</Collapse>
```

---

### 3. **IndividualCardEditor** - Personnaliser chaque carte

Actuellement, toutes les cartes partagent le même style. On doit pouvoir **personnaliser chaque carte individuellement** :

```typescript
// src/components/websites/editors/IndividualCardEditor.tsx
interface CardItemConfig {
  id: string;
  
  // Header de carte
  header: {
    enabled: boolean;
    title: string;
    icon?: string;
    backgroundColor: string;
    textColor: string;
    borderBottom: boolean;
    borderColor: string;
  };
  
  // Contenu
  content: {
    title: string;
    description: string;
    image?: string;
    imagePosition: 'top' | 'bottom' | 'left' | 'right' | 'background';
    imageOverlay: boolean;
    imageOverlayColor: string;
  };
  
  // Style de carte
  style: {
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    borderRadius: number;
    shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    hoverEffect: 'none' | 'lift' | 'scale' | 'glow' | 'rotate';
    gradient?: string;
  };
  
  // Footer de carte
  footer: {
    enabled: boolean;
    buttonText: string;
    buttonColor: string;
    link?: string;
    showIcon: boolean;
    iconPosition: 'left' | 'right';
  };
  
  // Position custom dans la grille
  gridPosition?: {
    columnStart: number;
    columnEnd: number;
    rowStart: number;
    rowEnd: number;
  };
}
```

**Interface dans SectionEditor** :
```typescript
<Collapse defaultActiveKey={[]} accordion>
  {items.map((item, index) => (
    <Collapse.Panel 
      key={item.id}
      header={
        <Space>
          <DragOutlined />
          <span>Carte {index + 1}</span>
          <Tag color={item.style.backgroundColor}>{item.content.title || 'Sans titre'}</Tag>
          <Button 
            icon={<RobotOutlined />} 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleAISuggestion(item.id);
            }}
          >
            IA
          </Button>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<CopyOutlined />} size="small" onClick={() => duplicateCard(item.id)} />
          <Button icon={<DeleteOutlined />} size="small" danger onClick={() => deleteCard(item.id)} />
        </Space>
      }
    >
      <Tabs items={[
        {
          key: 'content',
          label: '📝 Contenu',
          children: (
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* Header de carte */}
              <Card title="🏷️ Header" size="small">
                <Switch 
                  checked={item.header.enabled}
                  onChange={(v) => updateCard(item.id, 'header.enabled', v)}
                  checkedChildren="Activé"
                  unCheckedChildren="Désactivé"
                />
                {item.header.enabled && (
                  <>
                    <Input 
                      placeholder="Titre du header"
                      value={item.header.title}
                      onChange={(e) => updateCard(item.id, 'header.title', e.target.value)}
                    />
                    <Space>
                      <Input 
                        type="color"
                        addonBefore="Fond"
                        value={item.header.backgroundColor}
                        onChange={(e) => updateCard(item.id, 'header.backgroundColor', e.target.value)}
                      />
                      <Input 
                        type="color"
                        addonBefore="Texte"
                        value={item.header.textColor}
                        onChange={(e) => updateCard(item.id, 'header.textColor', e.target.value)}
                      />
                    </Space>
                  </>
                )}
              </Card>

              {/* Contenu principal */}
              <Card title="📄 Contenu" size="small">
                <Input 
                  placeholder="Titre"
                  value={item.content.title}
                  onChange={(e) => updateCard(item.id, 'content.title', e.target.value)}
                  suffix={<Button icon={<RobotOutlined />} size="small">IA</Button>}
                />
                <TextArea 
                  rows={4}
                  placeholder="Description"
                  value={item.content.description}
                  onChange={(e) => updateCard(item.id, 'content.description', e.target.value)}
                  suffix={<Button icon={<RobotOutlined />} size="small">IA</Button>}
                />
                <ImageUploader 
                  value={item.content.image}
                  onChange={(url) => updateCard(item.id, 'content.image', url)}
                />
                <Select 
                  placeholder="Position de l'image"
                  value={item.content.imagePosition}
                  onChange={(v) => updateCard(item.id, 'content.imagePosition', v)}
                >
                  <Select.Option value="top">Haut</Select.Option>
                  <Select.Option value="bottom">Bas</Select.Option>
                  <Select.Option value="left">Gauche</Select.Option>
                  <Select.Option value="right">Droite</Select.Option>
                  <Select.Option value="background">Fond</Select.Option>
                </Select>
              </Card>
            </Space>
          )
        },
        {
          key: 'style',
          label: '🎨 Style',
          children: (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input 
                type="color"
                addonBefore="Couleur de fond"
                value={item.style.backgroundColor}
                onChange={(e) => updateCard(item.id, 'style.backgroundColor', e.target.value)}
              />
              <Input 
                type="color"
                addonBefore="Couleur de bordure"
                value={item.style.borderColor}
                onChange={(e) => updateCard(item.id, 'style.borderColor', e.target.value)}
              />
              <Slider 
                min={0}
                max={10}
                marks={{ 0: '0px', 2: '2px', 5: '5px', 10: '10px' }}
                value={item.style.borderWidth}
                onChange={(v) => updateCard(item.id, 'style.borderWidth', v)}
              />
              <Select 
                placeholder="Ombre"
                value={item.style.shadow}
                onChange={(v) => updateCard(item.id, 'style.shadow', v)}
              >
                <Select.Option value="none">Aucune</Select.Option>
                <Select.Option value="sm">Petite</Select.Option>
                <Select.Option value="md">Moyenne</Select.Option>
                <Select.Option value="lg">Grande</Select.Option>
                <Select.Option value="xl">XL</Select.Option>
                <Select.Option value="2xl">XXL</Select.Option>
              </Select>
              <Select 
                placeholder="Effet au survol"
                value={item.style.hoverEffect}
                onChange={(v) => updateCard(item.id, 'style.hoverEffect', v)}
              >
                <Select.Option value="none">Aucun</Select.Option>
                <Select.Option value="lift">Soulever</Select.Option>
                <Select.Option value="scale">Agrandir</Select.Option>
                <Select.Option value="glow">Lueur</Select.Option>
                <Select.Option value="rotate">Rotation</Select.Option>
              </Select>
            </Space>
          )
        },
        {
          key: 'grid',
          label: '📐 Position',
          children: (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert message="Définir la position de cette carte dans la grille" type="info" />
              <Space>
                <InputNumber 
                  addonBefore="Colonne début"
                  min={1}
                  max={12}
                  value={item.gridPosition?.columnStart || 'auto'}
                  onChange={(v) => updateCard(item.id, 'gridPosition.columnStart', v)}
                />
                <InputNumber 
                  addonBefore="Colonne fin"
                  min={1}
                  max={12}
                  value={item.gridPosition?.columnEnd || 'auto'}
                  onChange={(v) => updateCard(item.id, 'gridPosition.columnEnd', v)}
                />
              </Space>
              <Space>
                <InputNumber 
                  addonBefore="Ligne début"
                  min={1}
                  max={10}
                  value={item.gridPosition?.rowStart || 'auto'}
                  onChange={(v) => updateCard(item.id, 'gridPosition.rowStart', v)}
                />
                <InputNumber 
                  addonBefore="Ligne fin"
                  min={1}
                  max={10}
                  value={item.gridPosition?.rowEnd || 'auto'}
                  onChange={(v) => updateCard(item.id, 'gridPosition.rowEnd', v)}
                />
              </Space>
              <Alert 
                message={`Cette carte occupera de la colonne ${item.gridPosition?.columnStart || 'auto'} à ${item.gridPosition?.columnEnd || 'auto'}`}
                type="success"
              />
            </Space>
          )
        }
      ]} />
    </Collapse.Panel>
  ))}
  
  <Button 
    type="dashed"
    block
    icon={<PlusOutlined />}
    onClick={addNewCard}
  >
    Ajouter une carte
  </Button>
</Collapse>
```

---

### 4. **AIAssistant** - Intégration IA partout

Créer un composant réutilisable pour l'assistance IA :

```typescript
// src/components/websites/AIAssistant.tsx
interface AIAssistantProps {
  context: 'title' | 'description' | 'fullSection' | 'layout' | 'colors' | 'content';
  currentValue?: any;
  onSuggestion: (suggestion: any) => void;
  sectionType?: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ context, currentValue, onSuggestion, sectionType }) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const prompt = buildPrompt(context, currentValue, sectionType);
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context, sectionType })
      });
      const data = await response.json();
      setSuggestions(data.suggestions);
      setModalOpen(true);
    } catch (error) {
      message.error('Erreur lors de la génération des suggestions');
    } finally {
      setLoading(false);
    }
  };

  const buildPrompt = (context: string, value: any, sectionType?: string) => {
    switch (context) {
      case 'title':
        return `Génère 5 titres accrocheurs pour une section ${sectionType}. Titre actuel: "${value}"`;
      case 'description':
        return `Génère 3 descriptions engageantes pour une section ${sectionType}. Description actuelle: "${value}"`;
      case 'fullSection':
        return `Génère un contenu complet pour une section ${sectionType} incluant titre, sous-titre, description et 3-6 cartes avec titres et descriptions.`;
      case 'layout':
        return `Suggère 3 dispositions de grille (layout) optimales pour une section ${sectionType} avec ${value?.itemCount || 6} éléments.`;
      case 'colors':
        return `Suggère 3 palettes de couleurs harmonieuses pour une section ${sectionType}. Palette actuelle: ${JSON.stringify(value)}`;
      default:
        return `Aide-moi à améliorer ce contenu: ${JSON.stringify(value)}`;
    }
  };

  return (
    <>
      <Tooltip title="Utiliser l'IA pour générer des suggestions">
        <Button 
          icon={<RobotOutlined />}
          loading={loading}
          onClick={generateSuggestions}
          size="small"
          type="primary"
          ghost
        >
          IA
        </Button>
      </Tooltip>

      <Modal
        title={<Space><RobotOutlined /> Suggestions de l'IA</Space>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={800}
        footer={null}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {suggestions.map((suggestion, index) => (
            <Card
              key={index}
              title={`Option ${index + 1}`}
              extra={
                <Button 
                  type="primary"
                  onClick={() => {
                    onSuggestion(suggestion);
                    setModalOpen(false);
                    message.success('Suggestion appliquée !');
                  }}
                >
                  Appliquer
                </Button>
              }
            >
              {context === 'title' && <h3>{suggestion}</h3>}
              {context === 'description' && <p>{suggestion}</p>}
              {context === 'fullSection' && (
                <div>
                  <h3>{suggestion.title}</h3>
                  <p>{suggestion.subtitle}</p>
                  <p>{suggestion.description}</p>
                  <List
                    dataSource={suggestion.items}
                    renderItem={(item: any) => (
                      <List.Item>
                        <List.Item.Meta
                          title={item.title}
                          description={item.description}
                        />
                      </List.Item>
                    )}
                  />
                </div>
              )}
              {context === 'layout' && (
                <div>
                  <p><strong>Grille:</strong> {suggestion.columns} colonnes × {suggestion.rows} lignes</p>
                  <p><strong>Gap:</strong> {suggestion.gap}px</p>
                  <p><strong>Raison:</strong> {suggestion.reason}</p>
                </div>
              )}
              {context === 'colors' && (
                <Space wrap>
                  {Object.entries(suggestion).map(([key, color]: [string, any]) => (
                    <Tag color={color} key={key}>{key}: {color}</Tag>
                  ))}
                </Space>
              )}
            </Card>
          ))}
        </Space>
      </Modal>
    </>
  );
};
```

**Intégration dans tous les éditeurs** :
```typescript
// Exemple dans HeroEditor.tsx
<Input 
  placeholder="Titre"
  value={content.title}
  onChange={(e) => updateContent('title', e.target.value)}
  suffix={
    <AIAssistant 
      context="title"
      currentValue={content.title}
      sectionType="hero"
      onSuggestion={(newTitle) => updateContent('title', newTitle)}
    />
  }
/>

<TextArea 
  rows={4}
  placeholder="Description"
  value={content.description}
  onChange={(e) => updateContent('description', e.target.value)}
  suffix={
    <AIAssistant 
      context="description"
      currentValue={content.description}
      sectionType="hero"
      onSuggestion={(newDesc) => updateContent('description', newDesc)}
    />
  }
/>

{/* Bouton pour générer la section complète */}
<Button 
  icon={<RobotOutlined />}
  type="primary"
  size="large"
  onClick={() => {/* Ouvrir modal IA pour section complète */}}
>
  🤖 Générer toute la section avec IA
</Button>
```

---

### 5. **API Backend pour IA**

```typescript
// src/api/ai.ts
import express from 'express';
import OpenAI from 'openai';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/generate', async (req, res) => {
  try {
    const { prompt, context, sectionType } = req.body;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en web design et copywriting. Tu aides à créer du contenu engageant pour des sites web professionnels. Format de réponse: JSON structuré.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 1500
    });

    const suggestions = parseAIResponse(completion.choices[0].message.content, context);

    res.json({ suggestions, success: true });
  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({ error: 'Erreur génération IA' });
  }
});

function parseAIResponse(content: string, context: string) {
  try {
    const parsed = JSON.parse(content);
    
    switch (context) {
      case 'title':
        return parsed.titles || [];
      case 'description':
        return parsed.descriptions || [];
      case 'fullSection':
        return [parsed]; // Retourne l'objet complet
      case 'layout':
        return parsed.layouts || [];
      case 'colors':
        return parsed.palettes || [];
      default:
        return [parsed];
    }
  } catch (error) {
    // Fallback si pas JSON
    return [content];
  }
}

export default router;
```

**Monter la route dans api-server-clean.ts** :
```typescript
import aiRouter from './api/ai';
app.use('/api/ai', aiRouter);
```

---

## 🎯 RÉSUMÉ DES NOUVEAUTÉS

### ✅ Ce qui sera ajouté :

1. **GridLayoutEditor** : Choisir 1x1, 2x1, 3x3, 4x2, 5x1, custom avec responsive
2. **SectionHeaderEditor** : Header personnalisé pour chaque section (titre, sous-titre, couleurs, séparateur)
3. **IndividualCardEditor** : Personnaliser chaque carte individuellement (header, contenu, style, footer, position grille)
4. **AIAssistant** : Bouton IA partout pour générer/améliorer le contenu
5. **API IA** : Backend OpenAI pour générer suggestions

### 📊 Impact :

- **Flexibilité** : Layout 100% personnalisable (3x3, 5 en ligne, etc.)
- **Headers** : Chaque section a son header modifiable
- **Cartes** : Chaque carte est unique (couleurs, style, contenu)
- **IA** : Assistance IA sur tous les champs + génération complète
- **UX** : Interface intuitive avec presets + mode avancé

---

## 🚀 ORDRE D'IMPLÉMENTATION

### Phase 1 : Corrections techniques (30 min)
1. Fix `Tabs.TabPane` deprecated (100+ occurences)
2. Fix `Card.bordered` → `variant`
3. Fix `Card.bodyStyle` → `styles.body`
4. Fix `useForm` sans connexion
5. Fix warnings couleurs

### Phase 2 : GridLayoutEditor (2h)
1. Créer interface presets
2. Créer mode custom avancé
3. Ajouter preview visuel
4. Intégrer dans tous les éditeurs

### Phase 3 : SectionHeaderEditor (1h30)
1. Créer composant réutilisable
2. Ajouter options complètes
3. Intégrer dans tous les éditeurs

### Phase 4 : IndividualCardEditor (3h)
1. Refactoriser structure data
2. Créer éditeur par carte
3. Ajouter drag&drop pour réordonner
4. Gérer position grille custom

### Phase 5 : AIAssistant (2h)
1. Créer composant AIAssistant
2. Créer API backend OpenAI
3. Intégrer partout (titres, descriptions, sections complètes)
4. Ajouter bouton "Générer section IA"

**TOTAL ESTIMÉ** : ~9 heures de dev

---

## ❓ QUESTIONS POUR VALIDATION

1. **Presets de grille** : Les presets proposés (1x1, 2x1, 3x3, 4x2, 5x1) couvrent-ils tes besoins ou en veux-tu d'autres ?
2. **IA Provider** : OpenAI (GPT-4) ou autre (Claude, Mistral) ?
3. **Niveau d'IA** : Juste suggestions ou aussi génération images (DALL-E/Midjourney) ?
4. **Drag&Drop cartes** : Veux-tu pouvoir réorganiser les cartes par glisser-déposer ?
5. **Templates prédéfinis** : Veux-tu des templates de sections préremplies (ex: "Section services tech", "Portfolio créatif", etc.) ?

---

**Prêt à commencer ?** 🚀

Dis-moi si :
- ✅ Ce plan correspond à tes besoins
- ✅ Je dois ajouter/modifier quelque chose
- ✅ Je peux commencer par la Phase 1 (corrections techniques)
