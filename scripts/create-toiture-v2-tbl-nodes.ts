/**
 * Devis > Toiture — V2 : Questionnaire intelligent avec parcours conditionnels
 * 
 * Supprime les 49 champs v1 (plats, sans conditions)
 * Crée ~34 champs v2 avec visibilité conditionnelle via product_visibleFor
 * 
 * Système de visibilité :
 *   - hasProduct: true + product_sourceNodeId → champ contrôlé par un autre
 *   - product_visibleFor: ["valeur1", "valeur2"] → visible si source = une de ces valeurs
 *   - hasProduct: false → toujours visible
 * 
 * 4 parcours : neuve / renov / couverture / reparation
 * + bloc "Hors parcours" toujours visible
 */

import { db } from '../src/lib/database';
import { randomUUID } from 'crypto';

const TREE_ID = 'cmf1mwoz10005gooked1j6orn';
const DEVIS_NODE_ID = '7528d92c-ade9-4b38-8c60-fbbeffec6df9';
const SUBTAB = 'Toiture';

// ══════════════════════════════════════════════════════
// PRE-GENERATE ALL IDS (besoin de les référencer entre eux)
// ══════════════════════════════════════════════════════
const ID = {
  intervention:         randomUUID(),
  urgence:              randomUUID(),
  amiante:              randomUUID(),
  zones_reparer:        randomUUID(),
  echafaudage:          randomUUID(),
  description_repare:   randomUUID(),
  isolation_toggle:     randomUUID(),
  isolation_type:       randomUUID(),
  isolation_epaisseur:  randomUUID(),
  isolation_chevrons:   randomUUID(),
  sous_toiture_poser:   randomUUID(),
  sous_toiture_rempl:   randomUUID(),
  lattage_rempl:        randomUUID(),
  materiau_couverture:  randomUUID(),
  format_ardoises:      randomUUID(),
  modele_gamme:         randomUUID(),
  couleur:              randomUUID(),
  materiau_zinguerie:   randomUUID(),
  type_evacuation:      randomUUID(),
  fenetres_toggle:      randomUUID(),
  fenetres_type:        randomUUID(),
  fenetres_dimensions:  randomUUID(),
  fenetres_nombre:      randomUUID(),
  fenetres_store:       randomUUID(),
  chatieres_toggle:     randomUUID(),
  chatieres_nombre:     randomUUID(),
  traitement_toggle:    randomUUID(),
  traitement_type:      randomUUID(),
  container_toggle:     randomUUID(),
  container_volume:     randomUUID(),
  remarques:            randomUUID(),
  hp_toggle:            randomUUID(),
  hp_details:           randomUUID(),
  hp_photo:             randomUUID(),
};

// ══════════════════════════════════════════════════════
// FIELD DEFINITIONS
// ══════════════════════════════════════════════════════

type FieldDef = {
  id: string;
  label: string;
  order: number;
  subType: string;        // TEXT, select, multiselect, number, photo
  fieldSubType?: string;
  hasProduct: boolean;
  sourceId?: string;      // product_sourceNodeId
  visibleFor?: string[];  // product_visibleFor
  options?: { label: string; value: string; group?: string }[];
  tooltip?: string;
  variant?: 'singleline' | 'multiline';
  numberConfig?: { min?: number; max?: number; step?: number; decimals?: number; unit?: string };
};

const FIELDS: FieldDef[] = [
  // ─────────────────────────────────────────────────
  // #1 — TYPE D'INTERVENTION (aiguilleur principal)
  // ─────────────────────────────────────────────────
  {
    id: ID.intervention,
    label: "Type d'intervention",
    order: 26,
    subType: 'select',
    hasProduct: false,
    options: [
      { label: '🏗️ Construction neuve', value: 'neuve' },
      { label: '🔄 Rénovation complète', value: 'renov' },
      { label: '🛠️ Remplacement couverture', value: 'couverture' },
      { label: '🔧 Réparation ciblée', value: 'reparation' },
    ],
    tooltip: "Choisissez le type de travaux. Ce choix adapte automatiquement les questions suivantes.\n\n• Construction neuve : toiture complète sur bâtiment neuf\n• Rénovation complète : tout est refait (charpente → couverture)\n• Remplacement couverture : on change uniquement la couverture\n• Réparation ciblée : intervention ponctuelle sur une zone",
  },

  // ─────────────────────────────────────────────────
  // #2 — URGENCE (renov + couverture)
  // ─────────────────────────────────────────────────
  {
    id: ID.urgence,
    label: 'Urgence / Délai souhaité',
    order: 27,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['renov', 'couverture'],
    options: [
      { label: '🔴 Urgent (infiltrations)', value: 'urgent' },
      { label: '🟠 Sous 1 mois', value: '1_mois' },
      { label: '🟡 Sous 3 mois', value: '3_mois' },
      { label: '🟢 Pas urgent / Planifié', value: 'planifie' },
    ],
    tooltip: "Permet de prioriser le chantier. Si infiltrations actives, le dossier sera traité en priorité.",
  },

  // ─────────────────────────────────────────────────
  // #3 — AMIANTE (renov + couverture + reparation)
  // ─────────────────────────────────────────────────
  {
    id: ID.amiante,
    label: 'Présence d\'amiante ?',
    order: 28,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['renov', 'couverture', 'reparation'],
    options: [
      { label: 'Oui — désamiantage nécessaire', value: 'oui' },
      { label: 'Non', value: 'non' },
      { label: 'Ne sait pas — à vérifier', value: 'inconnu' },
    ],
    tooltip: "Obligation légale en Belgique : tout bâtiment d'avant 2001 doit faire l'objet d'un inventaire amiante avant travaux de rénovation. Si présence confirmée, un désamiantage certifié est requis (surcoût).",
  },

  // ─────────────────────────────────────────────────
  // #4-6 — PARCOURS RÉPARATION
  // ─────────────────────────────────────────────────
  {
    id: ID.zones_reparer,
    label: 'Zones à réparer',
    order: 29,
    subType: 'multiselect',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['reparation'],
    options: [
      { label: 'Couverture (tuiles/ardoises cassées)', value: 'couverture' },
      { label: 'Zinguerie (gouttières/descentes)', value: 'zinguerie' },
      { label: 'Noues', value: 'noues' },
      { label: 'Faîtière', value: 'faitiere' },
      { label: 'Rives', value: 'rives' },
      { label: 'Bavettes / Abergements', value: 'bavettes' },
      { label: 'Fenêtre de toit', value: 'fenetre_toit' },
      { label: 'Autre', value: 'autre' },
    ],
    tooltip: "Cochez toutes les zones qui nécessitent une réparation. On détaillera dans la description.",
  },
  {
    id: ID.echafaudage,
    label: 'Échafaudage nécessaire ?',
    order: 30,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['reparation'],
    options: [
      { label: 'Oui', value: 'oui' },
      { label: 'Non (accessible échelle)', value: 'non' },
      { label: 'À évaluer sur place', value: 'a_evaluer' },
    ],
    tooltip: "L'échafaudage représente un coût significatif. Si le toit est accessible à l'échelle et que la réparation est localisée, on peut éviter ce surcoût.",
  },
  {
    id: ID.description_repare,
    label: 'Description détaillée de la réparation',
    order: 31,
    subType: 'TEXT',
    variant: 'multiline',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['reparation'],
    tooltip: "Décrivez le problème : emplacement exact, étendue des dégâts, cause si connue (tempête, vétusté, etc.).",
  },

  // ─────────────────────────────────────────────────
  // #7-10 — ISOLATION (renov only, toggle)
  // ─────────────────────────────────────────────────
  {
    id: ID.isolation_toggle,
    label: 'Isolation ?',
    order: 32,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['renov'],
    options: [
      { label: 'Oui', value: 'oui' },
      { label: 'Non', value: 'non' },
    ],
    tooltip: "En rénovation complète, c'est le moment idéal pour isoler. L'isolation par l'extérieur (sarking) est la plus performante car elle supprime les ponts thermiques.",
  },
  {
    id: ID.isolation_type,
    label: "Type d'isolation",
    order: 33,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.isolation_toggle,
    visibleFor: ['oui'],
    options: [
      { label: 'Sarking (par-dessus les chevrons)', value: 'sarking' },
      { label: 'Sous-chevrons (entre/sous)', value: 'sous_chevrons' },
      { label: 'Soufflée (combles perdus)', value: 'soufflee' },
    ],
    tooltip: "• Sarking : panneaux rigides posés SUR les chevrons. Top performance, pas de perte d'espace intérieur.\n• Sous-chevrons : laine entre/sous les chevrons. Moins cher mais réduit l'espace.\n• Soufflée : pour combles non aménagés uniquement.",
  },
  {
    id: ID.isolation_epaisseur,
    label: 'Épaisseur isolation (cm)',
    order: 34,
    subType: 'number',
    hasProduct: true,
    sourceId: ID.isolation_toggle,
    visibleFor: ['oui'],
    numberConfig: { min: 4, max: 30, step: 1, decimals: 0, unit: 'cm' },
    tooltip: "Épaisseur du panneau isolant. Normes belges PEB : minimum 12cm en rénovation pour les primes. 16-20cm recommandé pour un bon rapport qualité/prix.",
  },
  {
    id: ID.isolation_chevrons,
    label: 'Hauteur chevrons (cm)',
    order: 35,
    subType: 'number',
    hasProduct: true,
    sourceId: ID.isolation_type,
    visibleFor: ['sarking'],
    numberConfig: { min: 5, max: 40, step: 1, decimals: 0, unit: 'cm' },
    tooltip: "Nécessaire pour le sarking : la hauteur des chevrons détermine le type de fixation traversante. Mesurer la section visible depuis l'intérieur.",
  },

  // ─────────────────────────────────────────────────
  // #11-13 — SOUS-TOITURE & LATTAGE
  // ─────────────────────────────────────────────────
  {
    id: ID.sous_toiture_poser,
    label: 'Sous-toiture à poser',
    order: 36,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['renov'],
    options: [
      { label: 'Écran HPV (Haute Perméabilité Vapeur)', value: 'ecran_hpv' },
      { label: 'Pare-vapeur', value: 'pare_vapeur' },
      { label: 'Écran HPV + Pare-vapeur', value: 'hpv_et_pv' },
    ],
    tooltip: "En rénovation complète, la sous-toiture est toujours remplacée.\n\n• Écran HPV : laisse passer la vapeur (évite la condensation), obligatoire avec sarking.\n• Pare-vapeur : bloque la vapeur venant de l'intérieur, posé côté chaud.\n• Les deux : configuration idéale pour une isolation performante.",
  },
  {
    id: ID.sous_toiture_rempl,
    label: 'Sous-toiture à remplacer ?',
    order: 37,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['couverture'],
    options: [
      { label: 'Oui — remplacement complet', value: 'oui' },
      { label: 'Non — en bon état', value: 'non' },
      { label: 'Partiel — certaines zones', value: 'partiel' },
    ],
    tooltip: "Si la sous-toiture est en mauvais état, la remplacer maintenant évite de devoir retoucher la couverture plus tard. À vérifier lors du relevé technique.",
  },
  {
    id: ID.lattage_rempl,
    label: 'Lattage à remplacer ?',
    order: 38,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['couverture'],
    options: [
      { label: 'Oui — remplacement complet', value: 'oui' },
      { label: 'Non — en bon état', value: 'non' },
      { label: 'Partiel — certaines zones', value: 'partiel' },
    ],
    tooltip: "Le lattage supporte la couverture. Si les lattes sont pourries ou que l'écartement ne correspond pas au nouveau matériau, il faut remplacer. En rénovation complète, c'est automatiquement inclus.",
  },

  // ─────────────────────────────────────────────────
  // #14-17 — COUVERTURE (neuve + renov + couverture)
  // ─────────────────────────────────────────────────
  {
    id: ID.materiau_couverture,
    label: 'Matériau de couverture',
    order: 39,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['neuve', 'renov', 'couverture'],
    options: [
      { label: '🧱 Tuiles béton', value: 'tuiles_beton', group: 'Tuiles' },
      { label: '🧱 Tuiles terre cuite', value: 'tuiles_terre_cuite', group: 'Tuiles' },
      { label: '🪨 Ardoises naturelles', value: 'ardoises_naturelles', group: 'Ardoises' },
      { label: '📐 Ardoises fibro-ciment', value: 'ardoises_fibrociment', group: 'Ardoises' },
      { label: '🔩 Zinc (joint debout)', value: 'zinc', group: 'Métal' },
      { label: '🔩 Zinc (tasseaux)', value: 'zinc_tasseaux', group: 'Métal' },
      { label: '⬛ EPDM / Roofing', value: 'epdm_roofing', group: 'Plat' },
      { label: '📋 Bac acier', value: 'bac_acier', group: 'Métal' },
      { label: '🌿 Toiture végétalisée', value: 'vegetalisee', group: 'Autre' },
      { label: '❓ Autre (préciser)', value: 'autre', group: 'Autre' },
    ],
    tooltip: "Le matériau de couverture détermine le prix, la durabilité et l'esthétique.\n\n• Tuiles béton : économique, 30-50 ans\n• Tuiles terre cuite : milieu de gamme, 50-80 ans\n• Ardoises naturelles : haut de gamme, 100+ ans\n• Ardoises fibro-ciment : aspect ardoise, prix réduit, 30-40 ans\n• Zinc : très durable (80+ ans), idéal faibles pentes\n• EPDM : pour toitures plates uniquement",
  },
  {
    id: ID.format_ardoises,
    label: 'Format ardoises',
    order: 40,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.materiau_couverture,
    visibleFor: ['ardoises_naturelles', 'ardoises_fibrociment'],
    options: [
      { label: '40 × 40 cm (standard Belgique)', value: '40x40' },
      { label: '40 × 25 cm', value: '40x25' },
      { label: '32 × 22 cm (petit format)', value: '32x22' },
      { label: '30 × 20 cm (petit format)', value: '30x20' },
      { label: '60 × 30 cm (grand format)', value: '60x30' },
    ],
    tooltip: "Le format influence le nombre d'ardoises au m² et donc le prix de pose.\n\n• 40×40 : format standard en Belgique, bon rapport couverture/pose\n• Petits formats (32×22, 30×20) : plus esthétiques mais plus longs à poser\n• 60×30 : pose rapide, esthétique moderne",
  },
  {
    id: ID.modele_gamme,
    label: 'Modèle / Gamme',
    order: 41,
    subType: 'TEXT',
    variant: 'singleline',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['neuve', 'renov', 'couverture'],
    tooltip: "Indiquez le modèle ou la gamme souhaitée (ex: CUPA 12, Bruges Novo+, Alterna). Sera lié au catalogue fournisseur pour le calcul de prix.",
  },
  {
    id: ID.couleur,
    label: 'Couleur',
    order: 42,
    subType: 'TEXT',
    variant: 'singleline',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['neuve', 'renov', 'couverture'],
    tooltip: "Couleur souhaitée par le client. Certains matériaux ont des coloris limités (ex: ardoises naturelles = gris/noir uniquement).",
  },

  // ─────────────────────────────────────────────────
  // #18-19 — ZINGUERIE (neuve + renov)
  // ─────────────────────────────────────────────────
  {
    id: ID.materiau_zinguerie,
    label: 'Matériau zinguerie',
    order: 43,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['neuve', 'renov'],
    options: [
      { label: 'Zinc naturel (ZN)', value: 'zn' },
      { label: 'Zinc patiné (ATZ/QZ)', value: 'atz_qz' },
      { label: 'Cuivre', value: 'cuivre' },
      { label: 'Aluminium laqué', value: 'alu_laque' },
      { label: 'PVC', value: 'pvc' },
    ],
    tooltip: "La zinguerie comprend gouttières, descentes, rives, faîtière, noues.\n\n• Zinc naturel : standard, bon rapport qualité/prix\n• Zinc patiné : aspect vieilli dès la pose, plus cher\n• Cuivre : haut de gamme, patine verte avec le temps\n• Alu laqué : ne rouille pas, choix de couleurs\n• PVC : économique mais durée de vie limitée",
  },
  {
    id: ID.type_evacuation,
    label: "Type d'évacuation eaux",
    order: 44,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['neuve', 'renov'],
    options: [
      { label: 'Gouttière demi-ronde', value: 'demi_ronde' },
      { label: 'Gouttière corniche (carrée)', value: 'corniche' },
      { label: 'Chéneau', value: 'cheneau' },
    ],
    tooltip: "• Demi-ronde : classique, facile à entretenir\n• Corniche : intégrée à la structure, esthétique moderne\n• Chéneau : encastré dans le mur, invisible mais plus cher à entretenir",
  },

  // ─────────────────────────────────────────────────
  // #20-24 — FENÊTRES DE TOIT (neuve + renov + couverture, toggle)
  // ─────────────────────────────────────────────────
  {
    id: ID.fenetres_toggle,
    label: 'Fenêtres de toit ?',
    order: 45,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['neuve', 'renov', 'couverture'],
    options: [
      { label: 'Oui', value: 'oui' },
      { label: 'Non', value: 'non' },
    ],
    tooltip: "Fenêtres de toit type Velux. Si oui, les dimensions et options seront demandées.",
  },
  {
    id: ID.fenetres_type,
    label: "Type d'ouverture fenêtre",
    order: 46,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.fenetres_toggle,
    visibleFor: ['oui'],
    options: [
      { label: 'GGL — Rotation (standard)', value: 'ggl' },
      { label: 'GPL — Projection (ouverture vers extérieur)', value: 'gpl' },
      { label: 'GGU — Rotation polyuréthane (pièces humides)', value: 'ggu' },
    ],
    tooltip: "• GGL rotation : la plus courante, s'ouvre en pivotant sur un axe central\n• GPL projection : s'ouvre vers l'extérieur, permet de rester debout devant la fenêtre ouverte\n• GGU : comme GGL mais en polyuréthane blanc, idéal pour salle de bain/cuisine",
  },
  {
    id: ID.fenetres_dimensions,
    label: 'Dimensions fenêtre',
    order: 47,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.fenetres_toggle,
    visibleFor: ['oui'],
    options: [
      { label: 'CK02 — 55×78 cm', value: 'ck02' },
      { label: 'CK04 — 55×98 cm', value: 'ck04' },
      { label: 'MK04 — 78×98 cm', value: 'mk04' },
      { label: 'MK06 — 78×118 cm (populaire)', value: 'mk06' },
      { label: 'MK08 — 78×140 cm', value: 'mk08' },
      { label: 'SK06 — 114×118 cm', value: 'sk06' },
      { label: 'UK08 — 134×140 cm (grande)', value: 'uk08' },
    ],
    tooltip: "Les codes correspondent aux dimensions standard Velux.\n• MK06 (78×118) : le format le plus vendu, bon compromis lumière/prix\n• UK08 (134×140) : très grande, maximum de lumière",
  },
  {
    id: ID.fenetres_nombre,
    label: 'Nombre de fenêtres',
    order: 48,
    subType: 'number',
    hasProduct: true,
    sourceId: ID.fenetres_toggle,
    visibleFor: ['oui'],
    numberConfig: { min: 1, max: 20, step: 1, decimals: 0 },
    tooltip: "Nombre total de fenêtres de toit à poser.",
  },
  {
    id: ID.fenetres_store,
    label: 'Store / Volet',
    order: 49,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.fenetres_toggle,
    visibleFor: ['oui'],
    options: [
      { label: 'Aucun', value: 'aucun' },
      { label: 'Store intérieur occultant', value: 'store_occultant' },
      { label: 'Store extérieur pare-soleil', value: 'store_exterieur' },
      { label: 'Volet roulant électrique', value: 'volet_electrique' },
      { label: 'Volet roulant solaire', value: 'volet_solaire' },
    ],
    tooltip: "• Store occultant : intérieur, bloque la lumière (chambres)\n• Store pare-soleil : extérieur, réduit la chaleur en été\n• Volet roulant : protection complète + isolation, le solaire évite le câblage",
  },

  // ─────────────────────────────────────────────────
  // #25-26 — CHATIÈRES (couverture only, toggle)
  // ─────────────────────────────────────────────────
  {
    id: ID.chatieres_toggle,
    label: 'Chatières / Ventilation toiture ?',
    order: 50,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['couverture'],
    options: [
      { label: 'Oui', value: 'oui' },
      { label: 'Non', value: 'non' },
    ],
    tooltip: "Les chatières permettent la ventilation sous la couverture, évitant la condensation. Recommandé si la sous-toiture n'est pas un écran HPV.",
  },
  {
    id: ID.chatieres_nombre,
    label: 'Nombre de chatières',
    order: 51,
    subType: 'number',
    hasProduct: true,
    sourceId: ID.chatieres_toggle,
    visibleFor: ['oui'],
    numberConfig: { min: 1, max: 50, step: 1, decimals: 0 },
    tooltip: "Règle approximative : 1 chatière pour 20-30 m² de toiture. Le technicien ajustera lors du relevé.",
  },

  // ─────────────────────────────────────────────────
  // #27-28 — TRAITEMENT CHARPENTE (renov + couverture, toggle)
  // ─────────────────────────────────────────────────
  {
    id: ID.traitement_toggle,
    label: 'Traitement charpente ?',
    order: 52,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.intervention,
    visibleFor: ['renov', 'couverture'],
    options: [
      { label: 'Oui', value: 'oui' },
      { label: 'Non', value: 'non' },
    ],
    tooltip: "Si la charpente est en bois et n'a jamais été traitée (ou traitement > 10 ans), un traitement préventif est recommandé pour protéger contre les insectes et champignons.",
  },
  {
    id: ID.traitement_type,
    label: 'Type de traitement charpente',
    order: 53,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.traitement_toggle,
    visibleFor: ['oui'],
    options: [
      { label: 'Préventif (pulvérisation)', value: 'preventif' },
      { label: 'Curatif (injection + pulvérisation)', value: 'curatif' },
      { label: 'Remplacement partiel + traitement', value: 'remplacement_partiel' },
    ],
    tooltip: "• Préventif : pas de dégâts visibles, on protège pour 10-20 ans\n• Curatif : dégâts constatés (vrillettes, capricornes), traitement en profondeur\n• Remplacement partiel : certaines pièces sont trop endommagées",
  },

  // ─────────────────────────────────────────────────
  // #29-30 — CONTAINER (toujours visible)
  // ─────────────────────────────────────────────────
  {
    id: ID.container_toggle,
    label: 'Container / Benne à déchets ?',
    order: 54,
    subType: 'select',
    hasProduct: false,
    options: [
      { label: 'Oui', value: 'oui' },
      { label: 'Non', value: 'non' },
    ],
    tooltip: "Pour évacuer les anciens matériaux (tuiles, ardoises, bois). Nécessaire pour toute rénovation ou remplacement. En construction neuve, parfois fourni par le constructeur.",
  },
  {
    id: ID.container_volume,
    label: 'Volume container',
    order: 55,
    subType: 'select',
    hasProduct: true,
    sourceId: ID.container_toggle,
    visibleFor: ['oui'],
    options: [
      { label: '6 m³ (petit chantier)', value: '6m3' },
      { label: '10 m³ (standard)', value: '10m3' },
      { label: '15 m³ (gros chantier)', value: '15m3' },
      { label: '20 m³ (très gros chantier)', value: '20m3' },
    ],
    tooltip: "• 6 m³ : réparation, petite surface\n• 10 m³ : remplacement couverture standard (100-150 m²)\n• 15-20 m³ : rénovation complète, grande toiture",
  },

  // ─────────────────────────────────────────────────
  // #31 — REMARQUES (toujours visible)
  // ─────────────────────────────────────────────────
  {
    id: ID.remarques,
    label: 'Remarques',
    order: 56,
    subType: 'TEXT',
    variant: 'multiline',
    hasProduct: false,
    tooltip: "Toute information supplémentaire utile pour le chiffrage : demandes spécifiques du client, contraintes particulières, etc.",
  },

  // ─────────────────────────────────────────────────
  // #32-34 — HORS PARCOURS (toujours visible)
  // ─────────────────────────────────────────────────
  {
    id: ID.hp_toggle,
    label: 'Infos complémentaires hors parcours ?',
    order: 57,
    subType: 'select',
    hasProduct: false,
    options: [
      { label: 'Oui', value: 'oui' },
      { label: 'Non', value: 'non' },
    ],
    tooltip: "Pour les cas spéciaux qui ne rentrent dans aucune catégorie standard. Activez pour ajouter des détails ou photos supplémentaires.",
  },
  {
    id: ID.hp_details,
    label: 'Détails complémentaires',
    order: 58,
    subType: 'TEXT',
    variant: 'multiline',
    hasProduct: true,
    sourceId: ID.hp_toggle,
    visibleFor: ['oui'],
    tooltip: "Décrivez la situation particulière ou les travaux supplémentaires non couverts par le questionnaire standard.",
  },
  {
    id: ID.hp_photo,
    label: 'Photo spécifique',
    order: 59,
    subType: 'photo',
    hasProduct: true,
    sourceId: ID.hp_toggle,
    visibleFor: ['oui'],
    tooltip: "Ajoutez une photo illustrant le point particulier.",
  },
];

// ══════════════════════════════════════════════════════
// METADATA BUILDER
// ══════════════════════════════════════════════════════
function buildMetadata(field: FieldDef) {
  const isSelect = field.subType === 'select' || field.subType === 'multiselect';
  const isNumber = field.subType === 'number';
  const isPhoto = field.subType === 'photo';
  const isText = field.subType === 'TEXT';

  return {
    subTab: SUBTAB,
    repeater: {
      iconOnly: false,
      maxItems: null,
      minItems: 0,
      buttonSize: 'middle',
      buttonWidth: 'auto',
      addButtonLabel: 'Ajouter une entrée',
    },
    appearance: {
      size: 'md',
      width: '250px',
      variant: field.variant || (isSelect ? 'singleline' : isText ? (field.variant || 'singleline') : 'singleline'),
      labelColor: null,
      bubbleColor: null,
      displayIcon: null,
      helpTooltipText: field.tooltip || null,
      helpTooltipType: field.tooltip ? 'text' : 'none',
      helpTooltipImage: null,
      ...(isSelect ? {
        selectMode: field.subType === 'multiselect' ? 'multiple' : 'single',
        selectAllowClear: true,
        selectSearchable: true,
        selectShowSearch: true,
        selectAllowCustom: false,
        selectMaxSelections: null,
      } : {}),
      ...(isNumber && field.numberConfig ? {
        min: field.numberConfig.min ?? null,
        max: field.numberConfig.max ?? null,
        step: field.numberConfig.step ?? 1,
        decimals: field.numberConfig.decimals ?? 0,
        unit: field.numberConfig.unit ?? '',
      } : {}),
    },
    capabilities: {},
  };
}

// ══════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════
async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  DEVIS > TOITURE — V2 Parcours conditionnels ║');
  console.log('╚══════════════════════════════════════════════╝');

  // ── STEP 1: Delete v1 fields ──
  console.log('\n🗑️  Suppression des champs v1...');
  const deleted = await db.treeBranchLeafNode.deleteMany({
    where: {
      parentId: DEVIS_NODE_ID,
      subtab: { equals: SUBTAB },
    },
  });
  console.log(`   ✅ ${deleted.count} champs v1 supprimés`);

  // ── STEP 2: Create v2 fields ──
  console.log('\n🆕 Création des champs v2...');
  let created = 0;

  for (const field of FIELDS) {
    const isSelect = field.subType === 'select' || field.subType === 'multiselect';
    const isNumber = field.subType === 'number';
    const isPhoto = field.subType === 'photo';

    const nodeData: any = {
      id: field.id,
      treeId: TREE_ID,
      parentId: DEVIS_NODE_ID,
      label: field.label,
      type: 'leaf_field',
      subType: isSelect ? field.subType : isNumber ? 'number' : isPhoto ? 'photo' : 'TEXT',
      fieldType: isSelect ? 'select' : isNumber ? 'number' : isPhoto ? 'photo' : 'text',
      fieldSubType: isSelect ? field.subType : isNumber ? 'number' : isPhoto ? 'photo' : 'text',
      order: field.order,
      subtab: SUBTAB,
      metadata: buildMetadata(field),
      isVisible: true,
      isActive: true,
      // Tooltip
      text_helpTooltipType: field.tooltip ? 'text' : 'none',
      text_helpTooltipText: field.tooltip || null,
      // Product visibility
      hasProduct: field.hasProduct,
      product_sourceNodeId: field.sourceId || null,
      product_visibleFor: field.visibleFor || [],
      // Select options
      select_options: field.options || [],
      // Number config
      ...(isNumber && field.numberConfig ? {
        number_decimals: field.numberConfig.decimals ?? 0,
        number_step: field.numberConfig.step ?? 1,
      } : {}),
      // Required timestamps
      updatedAt: new Date(),
    };

    await db.treeBranchLeafNode.create({ data: nodeData });
    created++;

    const visLabel = field.hasProduct
      ? `visible si ${field.sourceId === ID.intervention ? 'intervention' : 'toggle'} = [${(field.visibleFor || []).join(', ')}]`
      : 'toujours visible';
    console.log(`   ✅ ${field.order}: ${field.label} (${field.subType}) — ${visLabel}`);
  }

  // ── STEP 3: Verify ──
  console.log('\n📊 Vérification...');
  const allToiture = await db.treeBranchLeafNode.findMany({
    where: { parentId: DEVIS_NODE_ID, subtab: { equals: SUBTAB } },
  });

  const withProduct = allToiture.filter(n => n.hasProduct);
  const noProduct = allToiture.filter(n => !n.hasProduct);
  const withTooltip = allToiture.filter(n => n.text_helpTooltipText);
  const withOptions = allToiture.filter(n => {
    const opts = n.select_options;
    return opts && Array.isArray(opts) && opts.length > 0;
  });

  console.log(`\n  📋 Total champs créés:       ${created}`);
  console.log(`  📋 Total en DB:              ${allToiture.length}`);
  console.log(`  🔒 Conditionnels (hasProduct): ${withProduct.length}`);
  console.log(`  🔓 Toujours visibles:         ${noProduct.length}`);
  console.log(`  💡 Avec tooltip:              ${withTooltip.length}`);
  console.log(`  📝 Avec options select:       ${withOptions.length}`);

  // Count by source
  const bySource = new Map<string, number>();
  for (const n of withProduct) {
    const src = n.product_sourceNodeId || 'none';
    bySource.set(src, (bySource.get(src) || 0) + 1);
  }
  console.log('\n  🔗 Chaînes de dépendances:');
  for (const [src, count] of bySource) {
    const srcNode = allToiture.find(n => n.id === src);
    console.log(`     "${srcNode?.label || '???'}" contrôle ${count} champs`);
  }

  const totalDevis = await db.treeBranchLeafNode.count({ where: { parentId: DEVIS_NODE_ID } });
  console.log(`\n  📦 TOTAL ENFANTS DEVIS: ${totalDevis}`);
  console.log('\n✅ Terminé !');
}

main().catch(console.error).finally(() => process.exit());
