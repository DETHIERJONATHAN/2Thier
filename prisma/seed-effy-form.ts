/**
 * 🏠 SEED FORMULAIRE EFFY - Simulateur Aides Rénovation Énergétique
 * 
 * Ce script crée le formulaire complet style Effy avec :
 * - 10 sections/étapes
 * - Questions conditionnelles (sous-questions)
 * - Cartes cliquables avec icônes
 * - Mapping TBL pour devis automatique
 * 
 * @usage npx ts-node prisma/seed-effy-form.ts
 */

import { db } from '../src/lib/database';

interface FieldData {
  name: string;
  label: string;
  fieldType: string;
  order: number;
  isRequired: boolean;
  options?: any;
  condition?: any;
  helpText?: string;
  placeholder?: string;
  parentFieldId?: number;
  allowMultiple?: boolean;
}

async function seedEffyForm() {
  console.log('🏠 Création du formulaire Effy...\n');

  // Vérifier si l'organisation existe, sinon prendre la première
  let orgId = '1';
  try {
    const org = await db.organization.findFirst();
    if (org) orgId = org.id;
  } catch (e) {
    console.log('  ⚠️ Utilisation de l\'org par défaut');
  }

  // 1. Créer le formulaire principal
  const form = await db.website_forms.create({
    data: {
      name: 'Simulateur Aides Rénovation Énergétique',
      slug: 'simulateur-aides-renovation',
      description: 'Estimez vos aides pour vos travaux de rénovation énergétique en quelques clics',
      successTitle: '🎉 Merci pour votre demande !',
      successMessage: 'Un conseiller vous contactera sous 24h pour affiner votre estimation et vous accompagner dans votre projet.',
      isActive: true,
      organizationId: orgId,
      settings: {
        primaryColor: '#1890ff',
        submitButtonText: 'Voir mon estimation'
      }
    }
  });

  console.log(`✅ Formulaire créé: ${form.name} (ID: ${form.id})`);

  // Helper pour créer une étape
  const createStep = async (order: number, title: string, description: string, icon: string) => {
    return db.website_form_steps.create({
      data: {
        formId: form.id,
        order,
        title,
        subtitle: description,
        stepType: 'single_choice',
        settings: { icon }
      }
    });
  };

  // Helper pour créer un champ
  const createField = async (stepId: number, fieldData: FieldData) => {
    return db.website_form_fields.create({
      data: {
        stepId,
        name: fieldData.name,
        label: fieldData.label,
        fieldType: fieldData.fieldType,
        order: fieldData.order,
        isRequired: fieldData.isRequired,
        options: fieldData.options || undefined,
        condition: fieldData.condition || undefined,
        helpText: fieldData.helpText || null,
        placeholder: fieldData.placeholder || null,
        parentFieldId: fieldData.parentFieldId || null,
        allowMultiple: fieldData.allowMultiple || false
      }
    });
  };

  // ============================================================
  // ÉTAPE 1: Type de logement
  // ============================================================
  const step1 = await createStep(1, 'Type de logement', 'Quel type de logement souhaitez-vous rénover ?', '🏠');
  
  await createField(step1.id, {
    name: 'type_logement',
    label: 'Votre logement est :',
    fieldType: 'card_select',
    order: 1,
    isRequired: true,
    options: [
      { value: 'maison', label: 'Une maison', icon: '🏡', description: 'Individuelle ou mitoyenne' },
      { value: 'appartement', label: 'Un appartement', icon: '🏢', description: 'En copropriété' }
    ]
  });

  console.log('  ✓ Étape 1: Type de logement');

  // ============================================================
  // ÉTAPE 2: Votre logement
  // ============================================================
  const step2 = await createStep(2, 'Votre logement', 'Décrivez votre logement actuel', '📋');

  // Année de construction
  await createField(step2.id, {
    name: 'annee_construction',
    label: 'Année de construction',
    fieldType: 'card_select',
    order: 1,
    isRequired: true,
    options: [
      { value: 'avant_1975', label: 'Avant 1975', icon: '🏚️' },
      { value: '1975_2000', label: '1975 - 2000', icon: '🏠' },
      { value: '2000_2012', label: '2000 - 2012', icon: '🏡' },
      { value: 'apres_2012', label: 'Après 2012', icon: '🏗️' }
    ]
  });

  // Surface habitable
  await createField(step2.id, {
    name: 'surface',
    label: 'Surface habitable (m²)',
    fieldType: 'number',
    order: 2,
    isRequired: true,
    placeholder: 'Ex: 120',
    helpText: 'Surface de plancher chauffée'
  });

  // Type de chauffage principal
  const chauffageField = await createField(step2.id, {
    name: 'chauffage_principal',
    label: 'Chauffage principal actuel',
    fieldType: 'card_select',
    order: 3,
    isRequired: true,
    options: [
      { value: 'gaz', label: 'Gaz', icon: '🔥' },
      { value: 'fioul', label: 'Fioul', icon: '🛢️' },
      { value: 'electrique', label: 'Électrique', icon: '⚡' },
      { value: 'bois', label: 'Bois', icon: '🪵' },
      { value: 'pac', label: 'Pompe à chaleur', icon: '❄️' },
      { value: 'autre', label: 'Autre', icon: '❓' }
    ]
  });

  // Sous-question: Type de chaudière gaz
  await createField(step2.id, {
    name: 'type_chaudiere_gaz',
    label: 'Type de chaudière gaz',
    fieldType: 'card_select',
    order: 4,
    isRequired: true,
    parentFieldId: chauffageField.id,
    condition: { showIf: { field: 'chauffage_principal', operator: 'equals', value: 'gaz' } },
    options: [
      { value: 'standard', label: 'Standard', description: 'Chaudière classique' },
      { value: 'condensation', label: 'Condensation', description: 'Haute performance' },
      { value: 'basse_temp', label: 'Basse température', description: 'Économique' }
    ]
  });

  // Sous-question: Âge chaudière fioul
  await createField(step2.id, {
    name: 'age_chaudiere_fioul',
    label: 'Âge de votre chaudière fioul',
    fieldType: 'card_select',
    order: 5,
    isRequired: true,
    parentFieldId: chauffageField.id,
    condition: { showIf: { field: 'chauffage_principal', operator: 'equals', value: 'fioul' } },
    options: [
      { value: 'moins_10', label: 'Moins de 10 ans' },
      { value: '10_20', label: '10 à 20 ans' },
      { value: 'plus_20', label: 'Plus de 20 ans' }
    ]
  });

  // Sous-question: Type chauffage électrique
  await createField(step2.id, {
    name: 'type_chauffage_elec',
    label: 'Type de chauffage électrique',
    fieldType: 'card_select',
    order: 6,
    isRequired: true,
    parentFieldId: chauffageField.id,
    condition: { showIf: { field: 'chauffage_principal', operator: 'equals', value: 'electrique' } },
    options: [
      { value: 'convecteurs', label: 'Convecteurs', icon: '📻', description: 'Grille-pain' },
      { value: 'radiateurs_inertie', label: 'Radiateurs à inertie', icon: '🔲' },
      { value: 'plancher', label: 'Plancher chauffant', icon: '⬛' }
    ]
  });

  // Classe énergétique estimée
  await createField(step2.id, {
    name: 'classe_energie',
    label: 'Classe énergétique estimée (DPE)',
    fieldType: 'card_select',
    order: 7,
    isRequired: false,
    helpText: 'Si vous ne connaissez pas votre DPE, sélectionnez "Je ne sais pas"',
    options: [
      { value: 'A', label: 'A', description: '< 70 kWh/m²' },
      { value: 'B', label: 'B', description: '71-110 kWh/m²' },
      { value: 'C', label: 'C', description: '111-180 kWh/m²' },
      { value: 'D', label: 'D', description: '181-250 kWh/m²' },
      { value: 'E', label: 'E', description: '251-330 kWh/m²' },
      { value: 'F', label: 'F', description: '331-420 kWh/m²' },
      { value: 'G', label: 'G', description: '> 420 kWh/m²' },
      { value: 'inconnu', label: 'Je ne sais pas', icon: '❓' }
    ]
  });

  // État isolation actuelle
  await createField(step2.id, {
    name: 'etat_isolation',
    label: 'État de l\'isolation actuelle',
    fieldType: 'card_select',
    order: 8,
    isRequired: true,
    options: [
      { value: 'aucune', label: 'Aucune isolation', icon: '❄️', description: 'Pas isolé' },
      { value: 'partielle', label: 'Isolation partielle', icon: '🌡️', description: 'Quelques zones' },
      { value: 'complete', label: 'Bien isolé', icon: '🏠', description: 'Isolation récente' }
    ]
  });

  console.log('  ✓ Étape 2: Votre logement (avec sous-questions chauffage)');

  // ============================================================
  // ÉTAPE 3: Travaux envisagés
  // ============================================================
  const step3 = await createStep(3, 'Travaux envisagés', 'Quels travaux souhaitez-vous réaliser ?', '🔧');

  // Travaux d'isolation
  const isolationField = await createField(step3.id, {
    name: 'travaux_isolation',
    label: 'Isolation',
    fieldType: 'checkbox',
    order: 1,
    isRequired: false,
    allowMultiple: true,
    options: [
      { value: 'combles', label: '🏠 Isolation des combles' },
      { value: 'murs_int', label: '🧱 Isolation murs intérieur' },
      { value: 'murs_ext', label: '🏗️ Isolation murs extérieur (ITE)' },
      { value: 'plancher', label: '⬛ Isolation plancher bas' },
      { value: 'toiture', label: '🏚️ Isolation toiture terrasse' }
    ]
  });

  // Sous-question: Surface combles
  await createField(step3.id, {
    name: 'surface_combles',
    label: 'Surface des combles à isoler (m²)',
    fieldType: 'number',
    order: 2,
    isRequired: true,
    parentFieldId: isolationField.id,
    placeholder: 'Ex: 50',
    condition: { showIf: { field: 'travaux_isolation', operator: 'contains', value: 'combles' } }
  });

  // Type de combles
  await createField(step3.id, {
    name: 'type_combles',
    label: 'Type de combles',
    fieldType: 'card_select',
    order: 3,
    isRequired: true,
    parentFieldId: isolationField.id,
    condition: { showIf: { field: 'travaux_isolation', operator: 'contains', value: 'combles' } },
    options: [
      { value: 'perdus', label: 'Combles perdus', description: 'Non aménageables' },
      { value: 'amenages', label: 'Combles aménagés', description: 'Habitables' }
    ]
  });

  // Sous-question: Surface murs ITE
  await createField(step3.id, {
    name: 'surface_ite',
    label: 'Surface de murs à isoler par l\'extérieur (m²)',
    fieldType: 'number',
    order: 4,
    isRequired: true,
    parentFieldId: isolationField.id,
    placeholder: 'Ex: 100',
    condition: { showIf: { field: 'travaux_isolation', operator: 'contains', value: 'murs_ext' } }
  });

  // Menuiseries / Fenêtres
  const menuiseriesField = await createField(step3.id, {
    name: 'travaux_menuiseries',
    label: 'Menuiseries / Fenêtres',
    fieldType: 'checkbox',
    order: 5,
    isRequired: false,
    allowMultiple: true,
    options: [
      { value: 'fenetres', label: '🪟 Fenêtres double/triple vitrage' },
      { value: 'portes', label: '🚪 Portes d\'entrée isolantes' },
      { value: 'volets', label: '🪓 Volets isolants' }
    ]
  });

  // Sous-question: Nombre de fenêtres
  await createField(step3.id, {
    name: 'nb_fenetres',
    label: 'Nombre de fenêtres à remplacer',
    fieldType: 'number',
    order: 6,
    isRequired: true,
    parentFieldId: menuiseriesField.id,
    placeholder: 'Ex: 8',
    condition: { showIf: { field: 'travaux_menuiseries', operator: 'contains', value: 'fenetres' } }
  });

  // VMC
  await createField(step3.id, {
    name: 'travaux_vmc',
    label: 'Ventilation',
    fieldType: 'card_select',
    order: 7,
    isRequired: false,
    options: [
      { value: 'aucune', label: 'Aucune', icon: '❌' },
      { value: 'simple_flux', label: 'VMC simple flux', icon: '💨' },
      { value: 'double_flux', label: 'VMC double flux', icon: '🔄', description: 'Récupération chaleur' }
    ]
  });

  // Chauffage / PAC
  const pacField = await createField(step3.id, {
    name: 'travaux_chauffage',
    label: 'Système de chauffage',
    fieldType: 'checkbox',
    order: 8,
    isRequired: false,
    allowMultiple: true,
    options: [
      { value: 'pac_air_eau', label: '❄️ Pompe à chaleur air/eau' },
      { value: 'pac_air_air', label: '🌀 Pompe à chaleur air/air' },
      { value: 'pac_geothermie', label: '🌍 PAC géothermique' },
      { value: 'chaudiere_granules', label: '🪵 Chaudière à granulés' },
      { value: 'poele_bois', label: '🔥 Poêle à bois/granulés' },
      { value: 'chaudiere_gaz_cond', label: '🔥 Chaudière gaz condensation' }
    ]
  });

  // Sous-question: Puissance PAC souhaitée
  await createField(step3.id, {
    name: 'puissance_pac',
    label: 'Puissance PAC estimée (kW)',
    fieldType: 'select',
    order: 9,
    isRequired: false,
    parentFieldId: pacField.id,
    condition: { 
      showIf: [
        { field: 'travaux_chauffage', operator: 'contains', value: 'pac_air_eau' },
        { field: 'travaux_chauffage', operator: 'contains', value: 'pac_geothermie' }
      ],
      logic: 'or'
    },
    options: [
      { value: '6', label: '6 kW - Petit logement' },
      { value: '9', label: '9 kW - Logement moyen' },
      { value: '12', label: '12 kW - Grand logement' },
      { value: '16', label: '16 kW - Très grand logement' },
      { value: 'inconnu', label: 'Je ne sais pas' }
    ]
  });

  // Solaire
  const solaireField = await createField(step3.id, {
    name: 'travaux_solaire',
    label: 'Énergie solaire',
    fieldType: 'checkbox',
    order: 10,
    isRequired: false,
    allowMultiple: true,
    options: [
      { value: 'panneaux_pv', label: '☀️ Panneaux photovoltaïques' },
      { value: 'chauffe_eau_solaire', label: '🌞 Chauffe-eau solaire' },
      { value: 'systeme_hybride', label: '⚡ Système hybride PV + thermique' }
    ]
  });

  // Sous-question: Surface de toiture pour PV
  await createField(step3.id, {
    name: 'surface_toiture_pv',
    label: 'Surface de toiture disponible pour panneaux (m²)',
    fieldType: 'number',
    order: 11,
    isRequired: true,
    parentFieldId: solaireField.id,
    placeholder: 'Ex: 30',
    condition: { showIf: { field: 'travaux_solaire', operator: 'contains', value: 'panneaux_pv' } }
  });

  // Chauffe-eau
  await createField(step3.id, {
    name: 'travaux_ecs',
    label: 'Eau chaude sanitaire',
    fieldType: 'card_select',
    order: 12,
    isRequired: false,
    options: [
      { value: 'aucun', label: 'Aucun changement', icon: '❌' },
      { value: 'ballon_thermo', label: 'Ballon thermodynamique', icon: '🔄', description: 'PAC pour eau chaude' },
      { value: 'chauffe_eau_solaire', label: 'Chauffe-eau solaire', icon: '☀️' }
    ]
  });

  console.log('  ✓ Étape 3: Travaux envisagés (avec nombreuses sous-questions)');

  // ============================================================
  // ÉTAPE 4: Motivation
  // ============================================================
  const step4 = await createStep(4, 'Votre motivation', 'Pourquoi souhaitez-vous réaliser ces travaux ?', '💡');

  await createField(step4.id, {
    name: 'motivation',
    label: 'Quelle est votre motivation principale ?',
    fieldType: 'card_select',
    order: 1,
    isRequired: true,
    options: [
      { value: 'factures', label: 'Réduire mes factures', icon: '💰', description: 'Économies d\'énergie' },
      { value: 'confort', label: 'Améliorer le confort', icon: '🏠', description: 'Été comme hiver' },
      { value: 'ecologie', label: 'Réduire mon impact', icon: '🌱', description: 'Écologique' },
      { value: 'valeur', label: 'Valoriser mon bien', icon: '📈', description: 'Plus-value immobilière' },
      { value: 'obligation', label: 'Obligation réglementaire', icon: '📋', description: 'Mise aux normes' }
    ]
  });

  await createField(step4.id, {
    name: 'urgence',
    label: 'Quand souhaitez-vous réaliser ces travaux ?',
    fieldType: 'card_select',
    order: 2,
    isRequired: true,
    options: [
      { value: 'urgent', label: 'Dès que possible', icon: '🚀' },
      { value: '3_mois', label: 'Dans les 3 mois', icon: '📅' },
      { value: '6_mois', label: 'Dans les 6 mois', icon: '🗓️' },
      { value: '1_an', label: 'Dans l\'année', icon: '📆' },
      { value: 'info', label: 'Je me renseigne', icon: '🔍' }
    ]
  });

  console.log('  ✓ Étape 4: Motivation');

  // ============================================================
  // ÉTAPE 5: Devis existant
  // ============================================================
  const step5 = await createStep(5, 'Avez-vous un devis ?', 'Avez-vous déjà fait chiffrer vos travaux ?', '📄');

  const devisField = await createField(step5.id, {
    name: 'devis_existant',
    label: 'Avez-vous déjà un devis ?',
    fieldType: 'card_select',
    order: 1,
    isRequired: true,
    options: [
      { value: 'oui', label: 'Oui, j\'ai un devis', icon: '✅' },
      { value: 'en_cours', label: 'En attente de devis', icon: '⏳' },
      { value: 'non', label: 'Non, pas encore', icon: '❌' }
    ]
  });

  // Sous-question: Montant du devis
  await createField(step5.id, {
    name: 'montant_devis',
    label: 'Montant approximatif du devis (€)',
    fieldType: 'number',
    order: 2,
    isRequired: false,
    parentFieldId: devisField.id,
    placeholder: 'Ex: 15000',
    condition: { showIf: { field: 'devis_existant', operator: 'equals', value: 'oui' } }
  });

  // Artisan RGE ?
  await createField(step5.id, {
    name: 'artisan_rge',
    label: 'L\'artisan est-il certifié RGE ?',
    fieldType: 'card_select',
    order: 3,
    isRequired: false,
    parentFieldId: devisField.id,
    helpText: 'La certification RGE est obligatoire pour bénéficier des aides',
    condition: { showIf: { field: 'devis_existant', operator: 'in', value: ['oui', 'en_cours'] } },
    options: [
      { value: 'oui', label: 'Oui, RGE', icon: '✅' },
      { value: 'non', label: 'Non / Je ne sais pas', icon: '❓' }
    ]
  });

  console.log('  ✓ Étape 5: Devis existant');

  // ============================================================
  // ÉTAPE 6: Adresse du logement
  // ============================================================
  const step6 = await createStep(6, 'Localisation', 'Où se situe le logement à rénover ?', '📍');

  await createField(step6.id, {
    name: 'adresse',
    label: 'Adresse du logement',
    fieldType: 'address',
    order: 1,
    isRequired: true,
    placeholder: 'Numéro et nom de rue'
  });

  await createField(step6.id, {
    name: 'code_postal',
    label: 'Code postal',
    fieldType: 'text',
    order: 2,
    isRequired: true,
    placeholder: 'Ex: 75001'
  });

  await createField(step6.id, {
    name: 'ville',
    label: 'Ville',
    fieldType: 'text',
    order: 3,
    isRequired: true,
    placeholder: 'Ex: Paris'
  });

  console.log('  ✓ Étape 6: Localisation');

  // ============================================================
  // ÉTAPE 7: Statut d'occupation
  // ============================================================
  const step7 = await createStep(7, 'Statut d\'occupation', 'Quel est votre statut vis-à-vis de ce logement ?', '🏠');

  await createField(step7.id, {
    name: 'statut_occupation',
    label: 'Vous êtes :',
    fieldType: 'card_select',
    order: 1,
    isRequired: true,
    options: [
      { value: 'proprietaire_occupant', label: 'Propriétaire occupant', icon: '🏠', description: 'Résidence principale' },
      { value: 'proprietaire_bailleur', label: 'Propriétaire bailleur', icon: '🔑', description: 'Logement loué' },
      { value: 'locataire', label: 'Locataire', icon: '📝' },
      { value: 'proprietaire_secondaire', label: 'Résidence secondaire', icon: '🏖️' }
    ]
  });

  const dureeOccupation = await createField(step7.id, {
    name: 'duree_occupation',
    label: 'Depuis combien de temps occupez-vous ce logement ?',
    fieldType: 'card_select',
    order: 2,
    isRequired: true,
    condition: { showIf: { field: 'statut_occupation', operator: 'equals', value: 'proprietaire_occupant' } },
    options: [
      { value: 'moins_2', label: 'Moins de 2 ans' },
      { value: '2_5', label: '2 à 5 ans' },
      { value: '5_15', label: '5 à 15 ans' },
      { value: 'plus_15', label: 'Plus de 15 ans' }
    ]
  });

  console.log('  ✓ Étape 7: Statut d\'occupation');

  // ============================================================
  // ÉTAPE 8: Composition du foyer
  // ============================================================
  const step8 = await createStep(8, 'Votre foyer', 'Combien de personnes composent votre foyer ?', '👨‍👩‍👧‍👦');

  await createField(step8.id, {
    name: 'nb_personnes',
    label: 'Nombre de personnes dans le foyer fiscal',
    fieldType: 'card_select',
    order: 1,
    isRequired: true,
    helpText: 'Y compris vous-même et les enfants à charge',
    options: [
      { value: '1', label: '1 personne', icon: '👤' },
      { value: '2', label: '2 personnes', icon: '👫' },
      { value: '3', label: '3 personnes', icon: '👨‍👩‍👦' },
      { value: '4', label: '4 personnes', icon: '👨‍👩‍👧‍👦' },
      { value: '5', label: '5 personnes', icon: '👨‍👩‍👧‍👦' },
      { value: '6+', label: '6 personnes ou plus', icon: '👨‍👩‍👧‍👦' }
    ]
  });

  console.log('  ✓ Étape 8: Composition du foyer');

  // ============================================================
  // ÉTAPE 9: Revenu fiscal
  // ============================================================
  const step9 = await createStep(9, 'Revenus', 'Quel est votre revenu fiscal de référence ?', '💰');

  await createField(step9.id, {
    name: 'revenu_fiscal',
    label: 'Revenu fiscal de référence (RFR)',
    fieldType: 'card_select',
    order: 1,
    isRequired: true,
    helpText: 'Visible sur votre dernier avis d\'imposition (ligne Revenu fiscal de référence)',
    options: [
      { value: 'tres_modeste', label: 'Très modeste', icon: '💰', description: '< 16 229 € (1 pers.)' },
      { value: 'modeste', label: 'Modeste', icon: '💰💰', description: '< 20 805 € (1 pers.)' },
      { value: 'intermediaire', label: 'Intermédiaire', icon: '💰💰💰', description: '< 29 148 € (1 pers.)' },
      { value: 'superieur', label: 'Supérieur', icon: '💰💰💰💰', description: '> 29 148 € (1 pers.)' }
    ]
  });

  await createField(step9.id, {
    name: 'rfr_exact',
    label: 'Montant exact du RFR (optionnel)',
    fieldType: 'number',
    order: 2,
    isRequired: false,
    placeholder: 'Ex: 25000',
    helpText: 'Pour une estimation plus précise des aides'
  });

  console.log('  ✓ Étape 9: Revenus');

  // ============================================================
  // ÉTAPE 10: Coordonnées
  // ============================================================
  const step10 = await createStep(10, 'Vos coordonnées', 'Pour recevoir votre estimation personnalisée', '📧');

  await createField(step10.id, {
    name: 'civilite',
    label: 'Civilité',
    fieldType: 'card_select',
    order: 1,
    isRequired: true,
    options: [
      { value: 'M', label: 'Monsieur', icon: '👨' },
      { value: 'Mme', label: 'Madame', icon: '👩' }
    ]
  });

  await createField(step10.id, {
    name: 'prenom',
    label: 'Prénom',
    fieldType: 'text',
    order: 2,
    isRequired: true,
    placeholder: 'Votre prénom'
  });

  await createField(step10.id, {
    name: 'nom',
    label: 'Nom',
    fieldType: 'text',
    order: 3,
    isRequired: true,
    placeholder: 'Votre nom'
  });

  await createField(step10.id, {
    name: 'email',
    label: 'Email',
    fieldType: 'email',
    order: 4,
    isRequired: true,
    placeholder: 'votre@email.com',
    helpText: 'Nous vous enverrons votre estimation par email'
  });

  await createField(step10.id, {
    name: 'telephone',
    label: 'Téléphone',
    fieldType: 'phone',
    order: 5,
    isRequired: true,
    placeholder: '06 12 34 56 78',
    helpText: 'Un conseiller vous contactera pour affiner votre projet'
  });

  await createField(step10.id, {
    name: 'accepte_conditions',
    label: 'J\'accepte les conditions d\'utilisation et la politique de confidentialité',
    fieldType: 'checkbox',
    order: 6,
    isRequired: true,
    options: [
      { value: 'oui', label: 'J\'accepte les conditions' }
    ]
  });

  await createField(step10.id, {
    name: 'accepte_contact',
    label: 'Communication',
    fieldType: 'checkbox',
    order: 7,
    isRequired: false,
    options: [
      { value: 'oui', label: 'J\'accepte de recevoir des informations sur les aides et actualités' }
    ]
  });

  console.log('  ✓ Étape 10: Coordonnées');

  // ============================================================
  // RÉSUMÉ
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 FORMULAIRE EFFY CRÉÉ AVEC SUCCÈS !');
  console.log('='.repeat(60));
  
  // Compter les éléments créés
  const stepCount = await db.website_form_steps.count({ where: { formId: form.id } });
  const fieldCount = await db.website_form_fields.count({ 
    where: { step: { formId: form.id } } 
  });
  const conditionalCount = await db.website_form_fields.count({ 
    where: { 
      step: { formId: form.id },
      condition: { not: null }
    } 
  });

  console.log(`\n📊 Statistiques:`);
  console.log(`   • Formulaire: ${form.name}`);
  console.log(`   • Slug: ${form.slug}`);
  console.log(`   • Étapes: ${stepCount}`);
  console.log(`   • Champs totaux: ${fieldCount}`);
  console.log(`   • Champs conditionnels: ${conditionalCount}`);
  console.log(`\n🔗 URL: /form/${form.slug}`);
  console.log('\n');
}

// Exécuter
seedEffyForm()
  .then(() => {
    console.log('✅ Seed terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
