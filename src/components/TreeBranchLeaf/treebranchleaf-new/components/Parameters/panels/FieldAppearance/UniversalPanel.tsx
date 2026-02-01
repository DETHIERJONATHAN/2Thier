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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Select
                showSearch
                value={localValues.displayIcon as string || undefined}
                optionFilterProp="label"
                options={[
                  // ═══════════════════════════════════════════════════════════════
                  // 🎯 DÉFAUT
                  // ═══════════════════════════════════════════════════════════════
                  { value: '', label: '(par défaut)' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // ⭕ SYMBOLES TECHNIQUES TBL
                  // ═══════════════════════════════════════════════════════════════
                  { value: '●', label: '● Champ (C)' },
                  { value: '◐', label: '◐ Champ + Option (O+C)' },
                  { value: '○', label: '○ Option (O)' },
                  { value: '◉', label: '◉ Cible' },
                  { value: '◎', label: '◎ Double cercle' },
                  { value: '◯', label: '◯ Grand cercle' },
                  { value: '◆', label: '◆ Losange plein' },
                  { value: '◇', label: '◇ Losange vide' },
                  { value: '▲', label: '▲ Triangle haut' },
                  { value: '▼', label: '▼ Triangle bas' },
                  { value: '◀', label: '◀ Triangle gauche' },
                  { value: '▶', label: '▶ Triangle droit' },
                  { value: '■', label: '■ Carré plein' },
                  { value: '□', label: '□ Carré vide' },
                  { value: '★', label: '★ Étoile pleine' },
                  { value: '☆', label: '☆ Étoile vide' },
                  { value: '✦', label: '✦ Étoile 4 branches' },
                  { value: '✧', label: '✧ Étoile 4 branches vide' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // 📐 MESURES & DIMENSIONS
                  // ═══════════════════════════════════════════════════════════════
                  { value: '📏', label: '📏 Règle / Longueur' },
                  { value: '📐', label: '📐 Équerre / Angle' },
                  { value: '🧭', label: '🧭 Boussole / Orientation' },
                  { value: '⬜', label: '⬜ Surface / Carré' },
                  { value: '⬛', label: '⬛ Surface pleine' },
                  { value: '🔲', label: '🔲 Zone / Périmètre' },
                  { value: '🔳', label: '🔳 Zone sélectionnée' },
                  { value: '📍', label: '📍 Position / Point' },
                  { value: '🎯', label: '🎯 Cible / Précision' },
                  { value: '↔️', label: '↔️ Largeur' },
                  { value: '↕️', label: '↕️ Hauteur' },
                  { value: '↗️', label: '↗️ Diagonale' },
                  { value: '🔄', label: '🔄 Rotation' },
                  { value: '↩️', label: '↩️ Retour' },
                  { value: '↪️', label: '↪️ Avancer' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // 🏠 BÂTIMENT & CONSTRUCTION
                  // ═══════════════════════════════════════════════════════════════
                  { value: '🏠', label: '🏠 Maison / Toiture' },
                  { value: '🏡', label: '🏡 Maison jardin' },
                  { value: '🏢', label: '🏢 Immeuble' },
                  { value: '🏭', label: '🏭 Usine / Industrie' },
                  { value: '🏗️', label: '🏗️ Construction' },
                  { value: '🧱', label: '🧱 Briques / Mur' },
                  { value: '🪵', label: '🪵 Bois / Charpente' },
                  { value: '🪨', label: '🪨 Pierre / Fondation' },
                  { value: '🚪', label: '🚪 Porte' },
                  { value: '🪟', label: '🪟 Fenêtre' },
                  { value: '🛖', label: '🛖 Abri' },
                  { value: '⛺', label: '⛺ Tente / Temporaire' },
                  { value: '🏚️', label: '🏚️ Ancien / Rénovation' },
                  { value: '🏛️', label: '🏛️ Monument / Historique' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // ☀️ ÉNERGIE SOLAIRE & ÉLECTRICITÉ
                  // ═══════════════════════════════════════════════════════════════
                  { value: '☀️', label: '☀️ Soleil / Panneau' },
                  { value: '🌤️', label: '🌤️ Ensoleillement partiel' },
                  { value: '⛅', label: '⛅ Nuageux' },
                  { value: '🌞', label: '🌞 Plein soleil' },
                  { value: '⚡', label: '⚡ Électricité / Puissance' },
                  { value: '🔌', label: '🔌 Branchement' },
                  { value: '🔋', label: '🔋 Batterie / Stockage' },
                  { value: '🪫', label: '🪫 Batterie faible' },
                  { value: '💡', label: '💡 Ampoule / Éclairage' },
                  { value: '🔦', label: '🔦 Lampe torche' },
                  { value: '🕯️', label: '🕯️ Bougie / Secours' },
                  { value: '⚙️', label: '⚙️ Engrenage / Mécanique' },
                  { value: '🔩', label: '🔩 Boulon / Fixation' },
                  { value: '⛽', label: '⛽ Carburant' },
                  { value: '🛢️', label: '🛢️ Réservoir' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // 💰 FINANCE & COMMERCE
                  // ═══════════════════════════════════════════════════════════════
                  { value: '💰', label: '💰 Argent / Prix' },
                  { value: '💵', label: '💵 Billets' },
                  { value: '💶', label: '💶 Euros' },
                  { value: '💳', label: '💳 Carte bancaire' },
                  { value: '🧾', label: '🧾 Reçu / Facture' },
                  { value: '📃', label: '📃 Document' },
                  { value: '📄', label: '📄 Page' },
                  { value: '📑', label: '📑 Onglets' },
                  { value: '🧮', label: '🧮 Calcul / Comptabilité' },
                  { value: '💹', label: '💹 Croissance' },
                  { value: '📈', label: '📈 Hausse / Progression' },
                  { value: '📉', label: '📉 Baisse / Diminution' },
                  { value: '📊', label: '📊 Graphique / Statistiques' },
                  { value: '🏷️', label: '🏷️ Étiquette / Prix' },
                  { value: '🛒', label: '🛒 Panier / Commande' },
                  { value: '🛍️', label: '🛍️ Shopping' },
                  { value: '💎', label: '💎 Premium / Qualité' },
                  { value: '🏆', label: '🏆 Trophée / Meilleur' },
                  { value: '🥇', label: '🥇 Premier / Top' },
                  { value: '🥈', label: '🥈 Deuxième' },
                  { value: '🥉', label: '🥉 Troisième' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // 🔢 QUANTITÉS & NOMBRES
                  // ═══════════════════════════════════════════════════════════════
                  { value: '🔢', label: '🔢 Nombres / Quantité' },
                  { value: '#️⃣', label: '#️⃣ Hashtag / Numéro' },
                  { value: '0️⃣', label: '0️⃣ Zéro' },
                  { value: '1️⃣', label: '1️⃣ Un' },
                  { value: '2️⃣', label: '2️⃣ Deux' },
                  { value: '3️⃣', label: '3️⃣ Trois' },
                  { value: '4️⃣', label: '4️⃣ Quatre' },
                  { value: '5️⃣', label: '5️⃣ Cinq' },
                  { value: '6️⃣', label: '6️⃣ Six' },
                  { value: '7️⃣', label: '7️⃣ Sept' },
                  { value: '8️⃣', label: '8️⃣ Huit' },
                  { value: '9️⃣', label: '9️⃣ Neuf' },
                  { value: '🔟', label: '🔟 Dix' },
                  { value: '💯', label: '💯 Cent / Parfait' },
                  { value: '➕', label: '➕ Plus / Addition' },
                  { value: '➖', label: '➖ Moins / Soustraction' },
                  { value: '✖️', label: '✖️ Multiplier' },
                  { value: '➗', label: '➗ Diviser' },
                  { value: '♾️', label: '♾️ Infini' },
                  { value: '🔣', label: '🔣 Symboles' },
                  { value: '%', label: '% Pourcentage' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // ⚖️ POIDS & MESURES
                  // ═══════════════════════════════════════════════════════════════
                  { value: '⚖️', label: '⚖️ Balance / Poids' },
                  { value: '🏋️', label: '🏋️ Charge lourde' },
                  { value: '🪶', label: '🪶 Léger / Plume' },
                  { value: '⏱️', label: '⏱️ Chronomètre / Durée' },
                  { value: '⏰', label: '⏰ Réveil / Alarme' },
                  { value: '🕐', label: '🕐 Heure' },
                  { value: '📅', label: '📅 Calendrier / Date' },
                  { value: '🗓️', label: '🗓️ Planning' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // 🌡️ MÉTÉO & ENVIRONNEMENT
                  // ═══════════════════════════════════════════════════════════════
                  { value: '🌡️', label: '🌡️ Température' },
                  { value: '❄️', label: '❄️ Froid / Gel' },
                  { value: '🔥', label: '🔥 Chaud / Feu' },
                  { value: '💧', label: '💧 Eau / Goutte' },
                  { value: '🌊', label: '🌊 Vague / Inondation' },
                  { value: '💦', label: '💦 Éclaboussure' },
                  { value: '🌬️', label: '🌬️ Vent' },
                  { value: '🌪️', label: '🌪️ Tornade / Tempête' },
                  { value: '⛈️', label: '⛈️ Orage' },
                  { value: '🌧️', label: '🌧️ Pluie' },
                  { value: '☔', label: '☔ Parapluie' },
                  { value: '❄️', label: '❄️ Neige' },
                  { value: '☁️', label: '☁️ Nuage' },
                  { value: '🌈', label: '🌈 Arc-en-ciel' },
                  { value: '🌍', label: '🌍 Terre / Global' },
                  { value: '🌱', label: '🌱 Pousse / Écologie' },
                  { value: '🌲', label: '🌲 Arbre / Forêt' },
                  { value: '🌳', label: '🌳 Feuillu' },
                  { value: '🍀', label: '🍀 Chance / Nature' },
                  { value: '♻️', label: '♻️ Recyclage' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // 🔧 OUTILS & TECHNIQUE
                  // ═══════════════════════════════════════════════════════════════
                  { value: '🔧', label: '🔧 Clé / Réglage' },
                  { value: '🔨', label: '🔨 Marteau' },
                  { value: '🪚', label: '🪚 Scie' },
                  { value: '🪛', label: '🪛 Tournevis' },
                  { value: '🛠️', label: '🛠️ Outils' },
                  { value: '⚒️', label: '⚒️ Pioche & Marteau' },
                  { value: '🪜', label: '🪜 Échelle' },
                  { value: '🧰', label: '🧰 Boîte à outils' },
                  { value: '🔬', label: '🔬 Microscope / Analyse' },
                  { value: '🔭', label: '🔭 Télescope / Vision' },
                  { value: '🧪', label: '🧪 Test / Labo' },
                  { value: '🧫', label: '🧫 Échantillon' },
                  { value: '🧲', label: '🧲 Aimant' },
                  { value: '🪤', label: '🪤 Piège' },
                  { value: '🔗', label: '🔗 Lien / Chaîne' },
                  { value: '⛓️', label: '⛓️ Chaîne' },
                  { value: '🪝', label: '🪝 Crochet' },
                  { value: '📎', label: '📎 Trombone' },
                  { value: '✂️', label: '✂️ Ciseaux' },
                  { value: '🖊️', label: '🖊️ Stylo' },
                  { value: '✏️', label: '✏️ Crayon' },
                  { value: '🖌️', label: '🖌️ Pinceau' },
                  { value: '🖍️', label: '🖍️ Crayon couleur' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // ✅ STATUTS & VALIDATION
                  // ═══════════════════════════════════════════════════════════════
                  { value: '✅', label: '✅ Validé / OK' },
                  { value: '☑️', label: '☑️ Coché' },
                  { value: '✔️', label: '✔️ Check' },
                  { value: '❌', label: '❌ Erreur / Non' },
                  { value: '❎', label: '❎ Croix carrée' },
                  { value: '⚠️', label: '⚠️ Attention / Warning' },
                  { value: '⛔', label: '⛔ Interdit / Stop' },
                  { value: '🚫', label: '🚫 Interdit' },
                  { value: '🚷', label: '🚷 Accès interdit' },
                  { value: '📛', label: '📛 Badge / Nom' },
                  { value: '❗', label: '❗ Important' },
                  { value: '❓', label: '❓ Question' },
                  { value: '❔', label: '❔ Question blanche' },
                  { value: '❕', label: '❕ Exclamation blanche' },
                  { value: '💬', label: '💬 Commentaire' },
                  { value: '💭', label: '💭 Pensée' },
                  { value: '🗨️', label: '🗨️ Bulle' },
                  { value: '📌', label: '📌 Épinglé / Important' },
                  { value: '📍', label: '📍 Localisation' },
                  { value: '🔒', label: '🔒 Verrouillé' },
                  { value: '🔓', label: '🔓 Déverrouillé' },
                  { value: '🔐', label: '🔐 Sécurisé' },
                  { value: '🔑', label: '🔑 Clé / Accès' },
                  { value: '🗝️', label: '🗝️ Clé ancienne' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // 📞 COMMUNICATION & CONTACT
                  // ═══════════════════════════════════════════════════════════════
                  { value: '📞', label: '📞 Téléphone' },
                  { value: '📱', label: '📱 Mobile' },
                  { value: '📧', label: '📧 Email' },
                  { value: '✉️', label: '✉️ Enveloppe' },
                  { value: '📨', label: '📨 Message entrant' },
                  { value: '📩', label: '📩 Message sortant' },
                  { value: '📬', label: '📬 Boîte aux lettres' },
                  { value: '🔔', label: '🔔 Notification' },
                  { value: '🔕', label: '🔕 Silencieux' },
                  { value: '📢', label: '📢 Annonce' },
                  { value: '📣', label: '📣 Mégaphone' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // 👤 PERSONNES & RÔLES
                  // ═══════════════════════════════════════════════════════════════
                  { value: '👤', label: '👤 Personne' },
                  { value: '👥', label: '👥 Groupe' },
                  { value: '👷', label: '👷 Ouvrier / Chantier' },
                  { value: '🧑‍💼', label: '🧑‍💼 Commercial' },
                  { value: '🧑‍🔧', label: '🧑‍🔧 Technicien' },
                  { value: '🧑‍💻', label: '🧑‍💻 Développeur' },
                  { value: '🧑‍🏫', label: '🧑‍🏫 Formateur' },
                  { value: '👨‍👩‍👧', label: '👨‍👩‍👧 Famille / Client' },
                  { value: '🏃', label: '🏃 En cours' },
                  { value: '🧍', label: '🧍 Debout / Attente' },
                  { value: '🤝', label: '🤝 Accord / Partenariat' },
                  { value: '👍', label: '👍 Approuvé' },
                  { value: '👎', label: '👎 Refusé' },
                  { value: '👋', label: '👋 Salut / Bienvenue' },
                  { value: '✋', label: '✋ Stop / Pause' },
                  { value: '🖐️', label: '🖐️ Main ouverte' },
                  { value: '👆', label: '👆 Pointer haut' },
                  { value: '👇', label: '👇 Pointer bas' },
                  { value: '👈', label: '👈 Pointer gauche' },
                  { value: '👉', label: '👉 Pointer droite' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // 🚗 TRANSPORT & VÉHICULES
                  // ═══════════════════════════════════════════════════════════════
                  { value: '🚗', label: '🚗 Voiture' },
                  { value: '🚙', label: '🚙 SUV' },
                  { value: '🚐', label: '🚐 Camionnette' },
                  { value: '🚚', label: '🚚 Camion' },
                  { value: '🚛', label: '🚛 Semi-remorque' },
                  { value: '🏍️', label: '🏍️ Moto' },
                  { value: '🛵', label: '🛵 Scooter' },
                  { value: '🚲', label: '🚲 Vélo' },
                  { value: '🛻', label: '🛻 Pick-up' },
                  { value: '🚜', label: '🚜 Tracteur' },
                  { value: '🚁', label: '🚁 Hélicoptère' },
                  { value: '✈️', label: '✈️ Avion' },
                  { value: '🚀', label: '🚀 Fusée / Rapide' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // 📁 FICHIERS & DOSSIERS
                  // ═══════════════════════════════════════════════════════════════
                  { value: '📁', label: '📁 Dossier' },
                  { value: '📂', label: '📂 Dossier ouvert' },
                  { value: '🗂️', label: '🗂️ Classeur' },
                  { value: '📋', label: '📋 Presse-papiers' },
                  { value: '📝', label: '📝 Note / Mémo' },
                  { value: '📓', label: '📓 Carnet' },
                  { value: '📔', label: '📔 Carnet décoré' },
                  { value: '📒', label: '📒 Cahier' },
                  { value: '📕', label: '📕 Livre rouge' },
                  { value: '📗', label: '📗 Livre vert' },
                  { value: '📘', label: '📘 Livre bleu' },
                  { value: '📙', label: '📙 Livre orange' },
                  { value: '📚', label: '📚 Livres / Documentation' },
                  { value: '🗃️', label: '🗃️ Boîte archives' },
                  { value: '🗄️', label: '🗄️ Armoire' },
                  { value: '🗑️', label: '🗑️ Corbeille' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // 💻 INFORMATIQUE & TECH
                  // ═══════════════════════════════════════════════════════════════
                  { value: '💻', label: '💻 Ordinateur' },
                  { value: '🖥️', label: '🖥️ Écran' },
                  { value: '🖨️', label: '🖨️ Imprimante' },
                  { value: '⌨️', label: '⌨️ Clavier' },
                  { value: '🖱️', label: '🖱️ Souris' },
                  { value: '💾', label: '💾 Disquette / Sauvegarde' },
                  { value: '💿', label: '💿 CD' },
                  { value: '📀', label: '📀 DVD' },
                  { value: '🔊', label: '🔊 Son fort' },
                  { value: '🔉', label: '🔉 Son moyen' },
                  { value: '🔈', label: '🔈 Son faible' },
                  { value: '🔇', label: '🔇 Muet' },
                  { value: '🎙️', label: '🎙️ Micro' },
                  { value: '📷', label: '📷 Photo' },
                  { value: '📸', label: '📸 Flash' },
                  { value: '📹', label: '📹 Vidéo' },
                  { value: '🎥', label: '🎥 Caméra' },
                  { value: '📺', label: '📺 TV' },
                  { value: '📻', label: '📻 Radio' },
                  { value: '🎮', label: '🎮 Jeu' },
                  { value: '🕹️', label: '🕹️ Joystick' },
                  { value: '🔍', label: '🔍 Recherche' },
                  { value: '🔎', label: '🔎 Loupe droite' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // 🎨 COULEURS & DESIGN
                  // ═══════════════════════════════════════════════════════════════
                  { value: '🎨', label: '🎨 Palette / Design' },
                  { value: '🖼️', label: '🖼️ Cadre / Image' },
                  { value: '🏳️', label: '🏳️ Drapeau blanc' },
                  { value: '🏴', label: '🏴 Drapeau noir' },
                  { value: '🚩', label: '🚩 Drapeau rouge / Alerte' },
                  { value: '🔴', label: '🔴 Rouge' },
                  { value: '🟠', label: '🟠 Orange' },
                  { value: '🟡', label: '🟡 Jaune' },
                  { value: '🟢', label: '🟢 Vert' },
                  { value: '🔵', label: '🔵 Bleu' },
                  { value: '🟣', label: '🟣 Violet' },
                  { value: '🟤', label: '🟤 Marron' },
                  { value: '⚫', label: '⚫ Noir' },
                  { value: '⚪', label: '⚪ Blanc' },
                  { value: '🩶', label: '🩶 Gris' },
                  { value: '🩷', label: '🩷 Rose' },
                  { value: '🩵', label: '🩵 Bleu clair' },
                  { value: '💜', label: '💜 Cœur violet' },
                  { value: '💙', label: '💙 Cœur bleu' },
                  { value: '💚', label: '💚 Cœur vert' },
                  { value: '💛', label: '💛 Cœur jaune' },
                  { value: '🧡', label: '🧡 Cœur orange' },
                  { value: '❤️', label: '❤️ Cœur rouge' },
                  { value: '🖤', label: '🖤 Cœur noir' },
                  { value: '🤍', label: '🤍 Cœur blanc' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // 🎉 ÉVÉNEMENTS & CÉLÉBRATIONS
                  // ═══════════════════════════════════════════════════════════════
                  { value: '🎉', label: '🎉 Fête / Succès' },
                  { value: '🎊', label: '🎊 Confettis' },
                  { value: '🎁', label: '🎁 Cadeau' },
                  { value: '🎂', label: '🎂 Anniversaire' },
                  { value: '🍾', label: '🍾 Champagne' },
                  { value: '🥂', label: '🥂 Trinquer' },
                  { value: '🎈', label: '🎈 Ballon' },
                  { value: '🎀', label: '🎀 Ruban' },
                  { value: '🏅', label: '🏅 Médaille' },
                  { value: '🎖️', label: '🎖️ Décoration' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // 🍴 NOURRITURE & BOISSONS
                  // ═══════════════════════════════════════════════════════════════
                  { value: '☕', label: '☕ Café' },
                  { value: '🍵', label: '🍵 Thé' },
                  { value: '🍺', label: '🍺 Bière' },
                  { value: '🍷', label: '🍷 Vin' },
                  { value: '🍕', label: '🍕 Pizza' },
                  { value: '🍔', label: '🍔 Burger' },
                  { value: '🍽️', label: '🍽️ Assiette / Repas' },
                  
                  // ═══════════════════════════════════════════════════════════════
                  // ⏸️ CONTRÔLES MÉDIA
                  // ═══════════════════════════════════════════════════════════════
                  { value: '▶️', label: '▶️ Play / Lecture' },
                  { value: '⏸️', label: '⏸️ Pause' },
                  { value: '⏹️', label: '⏹️ Stop' },
                  { value: '⏺️', label: '⏺️ Enregistrer' },
                  { value: '⏭️', label: '⏭️ Suivant' },
                  { value: '⏮️', label: '⏮️ Précédent' },
                  { value: '⏩', label: '⏩ Avance rapide' },
                  { value: '⏪', label: '⏪ Retour rapide' },
                  { value: '🔀', label: '🔀 Aléatoire' },
                  { value: '🔁', label: '🔁 Répéter' },
                  { value: '🔂', label: '🔂 Répéter une fois' }
                ]}
                allowClear
                placeholder="Rechercher une icône..."
                onChange={(val) => {
                  const nextValues = { ...localValues, displayIcon: val };
                  form.setFieldValue('displayIcon', val);
                  setLocalValues(nextValues);
                  debouncedSave(nextValues);
                }}
              />
              <Upload
                accept="image/*"
                maxCount={1}
                showUploadList={false}
                beforeUpload={() => false}
                onChange={(info) => {
                  const file = info.file?.originFileObj as File | undefined;
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = typeof reader.result === 'string' ? reader.result : '';
                    if (!result) return;
                    form.setFieldValue('displayIcon', result);
                    const nextValues = { ...localValues, displayIcon: result };
                    setLocalValues(nextValues);
                    debouncedSave(nextValues);
                  };
                  reader.readAsDataURL(file);
                }}
              >
                <Button icon={<UploadOutlined />}>Uploader une icône (PNG/SVG)</Button>
              </Upload>
              {localValues.displayIcon && typeof localValues.displayIcon === 'string' && (localValues.displayIcon as string).startsWith('data:image') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src={localValues.displayIcon as string} alt="Icône" style={{ width: 24, height: 24, borderRadius: 4 }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>Icône personnalisée chargée</Text>
                </div>
              )}
            </div>
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
