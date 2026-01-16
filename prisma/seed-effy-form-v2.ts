/**
 * 🎯 SEED FORMULAIRE EFFY v2 - Navigation Conditionnelle
 * 
 * 1 question = 1 écran avec navigation conditionnelle selon les réponses
 * 
 * Structure complète basée sur Effy.fr :
 * - Type de logement → Année → Surface → Chauffage → etc.
 * - Sous-questions conditionnelles (fioul→type chaudière, etc.)
 * 
 * @usage npx prisma db seed OR node --loader ts-node/esm prisma/seed-effy-form-v2.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QuestionData {
  questionKey: string;
  title: string;
  subtitle?: string;
  helpText?: string;
  icon?: string;
  questionType: string;
  placeholder?: string;
  inputSuffix?: string;
  minValue?: number;
  maxValue?: number;
  options?: any[];
  defaultNextQuestionKey?: string;
  navigation?: any[];
  isEndQuestion?: boolean;
  isRequired?: boolean;
  order: number;
}

async function seedEffyFormV2() {
  console.log('🎯 Création du formulaire Effy v2 (1 question = 1 écran)...\n');

  // Trouver l'organisation
  let orgId = '1';
  try {
    const org = await prisma.organization.findFirst();
    if (org) orgId = org.id;
  } catch (e) {
    console.log('  ⚠️ Utilisation de l\'org par défaut');
  }

  // Supprimer l'ancien formulaire s'il existe
  await prisma.website_forms.deleteMany({
    where: { slug: 'simulateur-effy' }
  });

  // 1. Créer le formulaire
  const form = await prisma.website_forms.create({
    data: {
      name: 'Simulateur Aides Rénovation',
      slug: 'simulateur-effy',
      description: 'Estimez vos aides pour vos travaux de rénovation énergétique',
      startQuestionKey: 'type_logement',
      successTitle: '🎉 Merci pour votre demande !',
      successMessage: 'Un conseiller vous contactera sous 24h pour affiner votre estimation.',
      isActive: true,
      organizationId: orgId,
      settings: {
        primaryColor: '#3b82f6',
        logo: '/logo.png'
      }
    }
  });

  console.log(`✅ Formulaire créé: ${form.name} (ID: ${form.id})\n`);

  // Helper pour créer une question
  const createQuestion = async (data: QuestionData) => {
    return prisma.website_form_questions.create({
      data: {
        formId: form.id,
        questionKey: data.questionKey,
        title: data.title,
        subtitle: data.subtitle,
        helpText: data.helpText,
        icon: data.icon,
        questionType: data.questionType,
        placeholder: data.placeholder,
        inputSuffix: data.inputSuffix,
        minValue: data.minValue,
        maxValue: data.maxValue,
        options: data.options,
        defaultNextQuestionKey: data.defaultNextQuestionKey,
        navigation: data.navigation,
        isEndQuestion: data.isEndQuestion || false,
        isRequired: data.isRequired !== false,
        order: data.order
      }
    });
  };

  // ============================================================
  // SECTION 1: TYPE DE LOGEMENT
  // ============================================================
  console.log('📍 Section 1: Type de logement');
  
  await createQuestion({
    questionKey: 'type_logement',
    title: 'Votre projet concerne :',
    subtitle: 'Sélectionnez votre type de logement',
    icon: '🏠',
    questionType: 'single_choice',
    options: [
      { value: 'maison', label: 'Une maison', icon: '🏡', description: 'Individuelle ou mitoyenne' },
      { value: 'appartement', label: 'Un appartement', icon: '🏢', description: 'En copropriété' }
    ],
    defaultNextQuestionKey: 'annee_construction',
    order: 1
  });

  // ============================================================
  // SECTION 2: VOTRE LOGEMENT
  // ============================================================
  console.log('📍 Section 2: Votre logement');

  // 2.1 Année de construction
  await createQuestion({
    questionKey: 'annee_construction',
    title: 'Quelle est l\'année de construction ?',
    subtitle: 'Cette information permet d\'estimer l\'isolation existante',
    icon: '📅',
    questionType: 'single_choice',
    options: [
      { value: 'moins_2', label: 'Moins de 2 ans', icon: '🆕' },
      { value: '2_15', label: 'Entre 2 et 15 ans', icon: '🏠' },
      { value: 'plus_15', label: 'Plus de 15 ans', icon: '🏚️' }
    ],
    defaultNextQuestionKey: 'surface',
    order: 2
  });

  // 2.2 Surface habitable
  await createQuestion({
    questionKey: 'surface',
    title: 'Quelle est la surface habitable ?',
    subtitle: 'Surface approximative en m²',
    icon: '📐',
    questionType: 'number',
    placeholder: 'Ex: 120',
    inputSuffix: 'm²',
    minValue: 10,
    maxValue: 1000,
    defaultNextQuestionKey: 'chauffage_principal',
    order: 3
  });

  // 2.3 Mode de chauffage principal
  await createQuestion({
    questionKey: 'chauffage_principal',
    title: 'Quel est votre chauffage principal ?',
    subtitle: 'Le mode de chauffage que vous utilisez le plus',
    icon: '🔥',
    questionType: 'single_choice',
    options: [
      { value: 'fioul', label: 'Fioul', icon: '🛢️' },
      { value: 'gaz', label: 'Gaz', icon: '🔥' },
      { value: 'electrique', label: 'Électrique', icon: '⚡' },
      { value: 'bois', label: 'Bois', icon: '🪵' },
      { value: 'pac', label: 'Pompe à chaleur', icon: '❄️' },
      { value: 'charbon', label: 'Charbon', icon: '⚫' }
    ],
    navigation: [
      { answerValue: 'fioul', nextQuestionKey: 'chauffage_fioul_type' },
      { answerValue: 'gaz', nextQuestionKey: 'chauffage_gaz_type' },
      { answerValue: 'electrique', nextQuestionKey: 'chauffage_elec_type' },
      { answerValue: 'bois', nextQuestionKey: 'classe_energie' },
      { answerValue: 'pac', nextQuestionKey: 'classe_energie' },
      { answerValue: 'charbon', nextQuestionKey: 'classe_energie' }
    ],
    order: 4
  });

  // 2.3.1 Sous-question FIOUL
  await createQuestion({
    questionKey: 'chauffage_fioul_type',
    title: 'Quel est l\'équipement au fioul installé ?',
    icon: '🛢️',
    questionType: 'single_choice',
    options: [
      { value: 'condensation', label: 'Chaudière à condensation', description: 'Haute performance' },
      { value: 'classique', label: 'Chaudière classique', description: 'Standard' },
      { value: 'poele', label: 'Poêle' },
      { value: 'inconnu', label: 'Je ne sais pas', icon: '❓' }
    ],
    defaultNextQuestionKey: 'classe_energie',
    order: 5
  });

  // 2.3.2 Sous-question GAZ
  await createQuestion({
    questionKey: 'chauffage_gaz_type',
    title: 'Quel est l\'équipement au gaz installé ?',
    icon: '🔥',
    questionType: 'single_choice',
    options: [
      { value: 'condensation', label: 'Chaudière à condensation', description: 'Haute performance' },
      { value: 'classique', label: 'Chaudière classique', description: 'Standard' },
      { value: 'poele', label: 'Poêle' },
      { value: 'inconnu', label: 'Je ne sais pas', icon: '❓' }
    ],
    defaultNextQuestionKey: 'classe_energie',
    order: 6
  });

  // 2.3.3 Sous-question ÉLECTRIQUE
  await createQuestion({
    questionKey: 'chauffage_elec_type',
    title: 'Quel est le système électrique ?',
    icon: '⚡',
    questionType: 'single_choice',
    options: [
      { value: 'chaudiere', label: 'Chaudière électrique' },
      { value: 'plancher', label: 'Plafonds ou planchers chauffants' },
      { value: 'radiateurs', label: 'Radiateurs électriques', description: 'Convecteurs, inertie...' }
    ],
    defaultNextQuestionKey: 'classe_energie',
    order: 7
  });

  // 2.4 Classe énergétique
  await createQuestion({
    questionKey: 'classe_energie',
    title: 'Quelle est la classe énergétique ?',
    subtitle: 'Visible sur votre DPE (Diagnostic de Performance Énergétique)',
    icon: '📊',
    questionType: 'single_choice',
    options: [
      { value: 'A', label: 'A', description: '< 70 kWh/m²' },
      { value: 'B', label: 'B', description: '71-110 kWh/m²' },
      { value: 'C', label: 'C', description: '111-180 kWh/m²' },
      { value: 'D', label: 'D', description: '181-250 kWh/m²' },
      { value: 'E', label: 'E', description: '251-330 kWh/m²' },
      { value: 'F', label: 'F', description: '331-420 kWh/m²' },
      { value: 'G', label: 'G', description: '> 420 kWh/m²' },
      { value: 'inconnu', label: 'Je ne sais pas', icon: '❓' }
    ],
    // Navigation conditionnelle: maison → isolation, appartement → travaux
    navigation: [
      { condition: { field: 'type_logement', operator: 'equals', value: 'maison' }, nextQuestionKey: 'isolation_combles' }
    ],
    defaultNextQuestionKey: 'travaux_envisages',
    order: 8
  });

  // 2.5 État isolation (MAISON uniquement)
  await createQuestion({
    questionKey: 'isolation_combles',
    title: 'Vos combles sont-ils isolés ?',
    icon: '🏠',
    questionType: 'single_choice',
    options: [
      { value: 'oui', label: 'Oui', icon: '✅' },
      { value: 'non', label: 'Non', icon: '❌' },
      { value: 'inconnu', label: 'Je ne sais pas', icon: '❓' }
    ],
    defaultNextQuestionKey: 'isolation_murs',
    order: 9
  });

  await createQuestion({
    questionKey: 'isolation_murs',
    title: 'Vos murs sont-ils isolés ?',
    icon: '🧱',
    questionType: 'single_choice',
    options: [
      { value: 'oui', label: 'Oui', icon: '✅' },
      { value: 'non', label: 'Non', icon: '❌' },
      { value: 'inconnu', label: 'Je ne sais pas', icon: '❓' }
    ],
    defaultNextQuestionKey: 'isolation_sol',
    order: 10
  });

  await createQuestion({
    questionKey: 'isolation_sol',
    title: 'Votre sol est-il isolé ?',
    icon: '⬛',
    questionType: 'single_choice',
    options: [
      { value: 'oui', label: 'Oui', icon: '✅' },
      { value: 'non', label: 'Non', icon: '❌' },
      { value: 'inconnu', label: 'Je ne sais pas', icon: '❓' }
    ],
    defaultNextQuestionKey: 'travaux_envisages',
    order: 11
  });

  // ============================================================
  // SECTION 3: TRAVAUX ENVISAGÉS
  // ============================================================
  console.log('📍 Section 3: Travaux envisagés');

  await createQuestion({
    questionKey: 'travaux_envisages',
    title: 'Quels travaux envisagez-vous ?',
    subtitle: 'Sélectionnez un ou plusieurs types de travaux',
    icon: '🔧',
    questionType: 'multiple_choice',
    options: [
      { value: 'renovation_globale', label: '🏠 Rénovation globale', description: 'Combo isolation + chauffage + ventilation' },
      { value: 'isolation', label: '🧱 Isolation', description: 'Combles, murs, sol, toiture' },
      { value: 'ouvertures', label: '🪟 Fenêtres / Portes', description: 'Menuiseries et volets' },
      { value: 'ventilation', label: '💨 Ventilation (VMC)', description: 'Simple ou double flux' },
      { value: 'pac', label: '❄️ Pompe à chaleur', description: 'Air/eau, géothermie, réversible' },
      { value: 'chauffage_bois', label: '🪵 Chauffage bois', description: 'Poêle, insert, chaudière' },
      { value: 'solaire', label: '☀️ Énergie solaire', description: 'Panneaux photovoltaïques' },
      { value: 'chauffe_eau', label: '🚿 Chauffe-eau', description: 'Thermodynamique, solaire' }
    ],
    navigation: [
      { answerValue: 'isolation', nextQuestionKey: 'isolation_type' },
      { answerValue: 'ouvertures', nextQuestionKey: 'ouvertures_type' },
      { answerValue: 'ventilation', nextQuestionKey: 'vmc_type' },
      { answerValue: 'pac', nextQuestionKey: 'pac_type' },
      { answerValue: 'chauffage_bois', nextQuestionKey: 'bois_type' },
      { answerValue: 'solaire', nextQuestionKey: 'solaire_type' },
      { answerValue: 'chauffe_eau', nextQuestionKey: 'chauffe_eau_type' }
    ],
    defaultNextQuestionKey: 'motif_simulation',
    order: 12
  });

  // 3.2 Isolation - Type
  await createQuestion({
    questionKey: 'isolation_type',
    title: 'Quel type d\'isolation ?',
    icon: '🧱',
    questionType: 'multiple_choice',
    options: [
      { value: 'combles', label: 'Isolation des combles', icon: '🏠' },
      { value: 'murs', label: 'Isolation des murs', icon: '🧱' },
      { value: 'sol', label: 'Isolation du sol', icon: '⬛' },
      { value: 'toiture_terrasse', label: 'Toiture-terrasse', icon: '🏗️' }
    ],
    navigation: [
      { answerValue: 'combles', nextQuestionKey: 'isolation_combles_type' },
      { answerValue: 'murs', nextQuestionKey: 'isolation_murs_mode' }
    ],
    defaultNextQuestionKey: 'motif_simulation',
    order: 13
  });

  // 3.2.1 Combles - type
  await createQuestion({
    questionKey: 'isolation_combles_type',
    title: 'Type de combles à isoler ?',
    icon: '🏠',
    questionType: 'single_choice',
    options: [
      { value: 'perdus', label: 'Combles perdus', description: 'Non aménageables' },
      { value: 'amenages', label: 'Combles aménagés', description: 'Habitables' }
    ],
    defaultNextQuestionKey: 'isolation_combles_surface',
    order: 14
  });

  await createQuestion({
    questionKey: 'isolation_combles_surface',
    title: 'Surface des combles à isoler ?',
    icon: '📐',
    questionType: 'number',
    placeholder: 'Ex: 50',
    inputSuffix: 'm²',
    minValue: 5,
    maxValue: 500,
    defaultNextQuestionKey: 'motif_simulation',
    order: 15
  });

  // 3.2.2 Murs - mode
  await createQuestion({
    questionKey: 'isolation_murs_mode',
    title: 'Mode d\'isolation des murs ?',
    icon: '🧱',
    questionType: 'single_choice',
    options: [
      { value: 'interieur', label: 'Isolation intérieure', description: 'ITI - Moins coûteux' },
      { value: 'exterieur', label: 'Isolation extérieure', description: 'ITE - Plus efficace' }
    ],
    defaultNextQuestionKey: 'isolation_murs_surface',
    order: 16
  });

  await createQuestion({
    questionKey: 'isolation_murs_surface',
    title: 'Surface des murs à isoler ?',
    icon: '📐',
    questionType: 'number',
    placeholder: 'Ex: 100',
    inputSuffix: 'm²',
    minValue: 10,
    maxValue: 1000,
    defaultNextQuestionKey: 'motif_simulation',
    order: 17
  });

  // 3.3 Ouvertures
  await createQuestion({
    questionKey: 'ouvertures_type',
    title: 'Quelles ouvertures ?',
    icon: '🪟',
    questionType: 'multiple_choice',
    options: [
      { value: 'fenetres', label: 'Fenêtres et porte-fenêtres', icon: '🪟' },
      { value: 'volets', label: 'Volets roulants', icon: '🪓' }
    ],
    navigation: [
      { answerValue: 'fenetres', nextQuestionKey: 'fenetres_nombre' }
    ],
    defaultNextQuestionKey: 'motif_simulation',
    order: 18
  });

  await createQuestion({
    questionKey: 'fenetres_nombre',
    title: 'Combien de fenêtres à remplacer ?',
    icon: '🪟',
    questionType: 'number',
    placeholder: 'Ex: 8',
    minValue: 1,
    maxValue: 50,
    defaultNextQuestionKey: 'fenetres_materiau',
    order: 19
  });

  await createQuestion({
    questionKey: 'fenetres_materiau',
    title: 'Matériau souhaité ?',
    icon: '🪟',
    questionType: 'single_choice',
    options: [
      { value: 'pvc', label: 'PVC', description: 'Économique et isolant' },
      { value: 'alu', label: 'Aluminium', description: 'Design et durable' },
      { value: 'bois', label: 'Bois', description: 'Naturel et isolant' },
      { value: 'mixte', label: 'Bois/Alu', description: 'Le meilleur des deux' }
    ],
    defaultNextQuestionKey: 'motif_simulation',
    order: 20
  });

  // 3.4 VMC
  await createQuestion({
    questionKey: 'vmc_type',
    title: 'Type de VMC souhaité ?',
    icon: '💨',
    questionType: 'single_choice',
    options: [
      { value: 'simple_flux', label: 'VMC simple flux', description: 'Extraction d\'air' },
      { value: 'double_flux', label: 'VMC double flux', description: 'Récupération de chaleur' }
    ],
    defaultNextQuestionKey: 'vmc_pieces',
    order: 21
  });

  await createQuestion({
    questionKey: 'vmc_pieces',
    title: 'Nombre de pièces humides ?',
    subtitle: 'Cuisine, salle de bain, WC...',
    icon: '🚿',
    questionType: 'number',
    placeholder: 'Ex: 4',
    minValue: 1,
    maxValue: 20,
    defaultNextQuestionKey: 'motif_simulation',
    order: 22
  });

  // 3.5 PAC
  await createQuestion({
    questionKey: 'pac_type',
    title: 'Quel type de pompe à chaleur ?',
    icon: '❄️',
    questionType: 'single_choice',
    options: [
      { value: 'air_eau', label: 'PAC Air/Eau', description: 'La plus répandue' },
      { value: 'geothermie', label: 'PAC Géothermique', description: 'Captage sol' },
      { value: 'reversible', label: 'PAC Réversible/Clim', description: 'Chaud et froid' },
      { value: 'hybride', label: 'PAC Hybride', description: 'PAC + chaudière gaz' }
    ],
    navigation: [
      { answerValue: 'air_eau', nextQuestionKey: 'pac_air_eau_surface' },
      { answerValue: 'geothermie', nextQuestionKey: 'pac_geo_surface' },
      { answerValue: 'reversible', nextQuestionKey: 'pac_clim_surface' },
      { answerValue: 'hybride', nextQuestionKey: 'pac_hybride_surface' }
    ],
    order: 23
  });

  await createQuestion({
    questionKey: 'pac_air_eau_surface',
    title: 'Surface à chauffer ?',
    icon: '📐',
    questionType: 'number',
    placeholder: 'Ex: 120',
    inputSuffix: 'm²',
    minValue: 20,
    maxValue: 500,
    defaultNextQuestionKey: 'pac_air_eau_ecs',
    order: 24
  });

  await createQuestion({
    questionKey: 'pac_air_eau_ecs',
    title: 'Production d\'eau chaude ?',
    icon: '🚿',
    questionType: 'single_choice',
    options: [
      { value: 'chauffage_seul', label: 'Chauffage seul' },
      { value: 'chauffage_ecs', label: 'Chauffage + eau chaude sanitaire', description: 'Recommandé' }
    ],
    defaultNextQuestionKey: 'pac_emplacement',
    order: 25
  });

  await createQuestion({
    questionKey: 'pac_emplacement',
    title: 'Emplacement extérieur disponible ?',
    subtitle: 'Pour l\'unité extérieure de la PAC',
    icon: '📍',
    questionType: 'single_choice',
    options: [
      { value: 'oui', label: 'Oui', icon: '✅' },
      { value: 'non', label: 'Non', icon: '❌' }
    ],
    defaultNextQuestionKey: 'motif_simulation',
    order: 26
  });

  await createQuestion({
    questionKey: 'pac_geo_surface',
    title: 'Surface à chauffer ?',
    icon: '📐',
    questionType: 'number',
    placeholder: 'Ex: 150',
    inputSuffix: 'm²',
    minValue: 50,
    maxValue: 500,
    defaultNextQuestionKey: 'pac_geo_captage',
    order: 27
  });

  await createQuestion({
    questionKey: 'pac_geo_captage',
    title: 'Type de captage ?',
    icon: '🌍',
    questionType: 'single_choice',
    options: [
      { value: 'horizontal', label: 'Captage horizontal', description: 'Grande surface terrain' },
      { value: 'vertical', label: 'Captage vertical', description: 'Forage profond' }
    ],
    defaultNextQuestionKey: 'motif_simulation',
    order: 28
  });

  await createQuestion({
    questionKey: 'pac_clim_surface',
    title: 'Surface à climatiser ?',
    icon: '📐',
    questionType: 'number',
    placeholder: 'Ex: 80',
    inputSuffix: 'm²',
    minValue: 10,
    maxValue: 300,
    defaultNextQuestionKey: 'pac_clim_pieces',
    order: 29
  });

  await createQuestion({
    questionKey: 'pac_clim_pieces',
    title: 'Nombre de pièces à climatiser ?',
    icon: '🏠',
    questionType: 'number',
    placeholder: 'Ex: 3',
    minValue: 1,
    maxValue: 10,
    defaultNextQuestionKey: 'motif_simulation',
    order: 30
  });

  await createQuestion({
    questionKey: 'pac_hybride_surface',
    title: 'Surface à chauffer ?',
    icon: '📐',
    questionType: 'number',
    placeholder: 'Ex: 140',
    inputSuffix: 'm²',
    minValue: 50,
    maxValue: 500,
    defaultNextQuestionKey: 'motif_simulation',
    order: 31
  });

  // 3.7 Chauffage bois
  await createQuestion({
    questionKey: 'bois_type',
    title: 'Quel équipement bois ?',
    icon: '🪵',
    questionType: 'single_choice',
    options: [
      { value: 'chaudiere', label: 'Chaudière bois', description: 'Granulés ou bûches' },
      { value: 'insert', label: 'Insert cheminée', description: 'Foyer fermé' },
      { value: 'poele', label: 'Poêle à bois', description: 'Granulés ou bûches' }
    ],
    navigation: [
      { answerValue: 'chaudiere', nextQuestionKey: 'bois_chaudiere_combustible' },
      { answerValue: 'poele', nextQuestionKey: 'bois_poele_combustible' }
    ],
    defaultNextQuestionKey: 'motif_simulation',
    order: 32
  });

  await createQuestion({
    questionKey: 'bois_chaudiere_combustible',
    title: 'Type de combustible ?',
    icon: '🪵',
    questionType: 'single_choice',
    options: [
      { value: 'granules', label: 'Granulés (pellets)', description: 'Automatique' },
      { value: 'buches', label: 'Bûches', description: 'Manuel' }
    ],
    defaultNextQuestionKey: 'bois_surface',
    order: 33
  });

  await createQuestion({
    questionKey: 'bois_poele_combustible',
    title: 'Type de combustible ?',
    icon: '🪵',
    questionType: 'single_choice',
    options: [
      { value: 'granules', label: 'Granulés (pellets)', description: 'Autonome' },
      { value: 'buches', label: 'Bûches', description: 'Traditionnel' }
    ],
    defaultNextQuestionKey: 'bois_surface',
    order: 34
  });

  await createQuestion({
    questionKey: 'bois_surface',
    title: 'Surface à chauffer ?',
    icon: '📐',
    questionType: 'number',
    placeholder: 'Ex: 100',
    inputSuffix: 'm²',
    minValue: 20,
    maxValue: 300,
    defaultNextQuestionKey: 'motif_simulation',
    order: 35
  });

  // 3.8 Solaire
  await createQuestion({
    questionKey: 'solaire_type',
    title: 'Quel système solaire ?',
    icon: '☀️',
    questionType: 'single_choice',
    options: [
      { value: 'photovoltaique', label: 'Panneaux photovoltaïques', description: 'Production électricité' },
      { value: 'combine', label: 'Système solaire combiné', description: 'Eau chaude + chauffage' }
    ],
    navigation: [
      { answerValue: 'photovoltaique', nextQuestionKey: 'solaire_pv_surface' }
    ],
    defaultNextQuestionKey: 'motif_simulation',
    order: 36
  });

  await createQuestion({
    questionKey: 'solaire_pv_surface',
    title: 'Surface de toiture disponible ?',
    icon: '📐',
    questionType: 'number',
    placeholder: 'Ex: 30',
    inputSuffix: 'm²',
    minValue: 10,
    maxValue: 200,
    defaultNextQuestionKey: 'solaire_pv_orientation',
    order: 37
  });

  await createQuestion({
    questionKey: 'solaire_pv_orientation',
    title: 'Orientation de la toiture ?',
    icon: '🧭',
    questionType: 'single_choice',
    options: [
      { value: 'sud', label: 'Sud', description: 'Idéal' },
      { value: 'sud_est', label: 'Sud-Est' },
      { value: 'sud_ouest', label: 'Sud-Ouest' },
      { value: 'est', label: 'Est' },
      { value: 'ouest', label: 'Ouest' },
      { value: 'autre', label: 'Autre orientation' }
    ],
    defaultNextQuestionKey: 'motif_simulation',
    order: 38
  });

  // 3.9 Chauffe-eau
  await createQuestion({
    questionKey: 'chauffe_eau_type',
    title: 'Quel type de chauffe-eau ?',
    icon: '🚿',
    questionType: 'single_choice',
    options: [
      { value: 'thermodynamique', label: 'Thermodynamique', description: 'PAC pour eau chaude' },
      { value: 'solaire', label: 'Chauffe-eau solaire', description: 'CESI' },
      { value: 'electrique', label: 'Électrique', description: 'Cumulus' }
    ],
    defaultNextQuestionKey: 'chauffe_eau_capacite',
    order: 39
  });

  await createQuestion({
    questionKey: 'chauffe_eau_capacite',
    title: 'Capacité souhaitée ?',
    icon: '🚿',
    questionType: 'single_choice',
    options: [
      { value: '100', label: '100 litres', description: '1-2 personnes' },
      { value: '150', label: '150 litres', description: '2-3 personnes' },
      { value: '200', label: '200 litres', description: '3-4 personnes' },
      { value: '300', label: '300 litres', description: '5+ personnes' }
    ],
    defaultNextQuestionKey: 'motif_simulation',
    order: 40
  });

  // ============================================================
  // SECTION 4: MOTIF DE LA SIMULATION
  // ============================================================
  console.log('📍 Section 4: Motif de la simulation');

  await createQuestion({
    questionKey: 'motif_simulation',
    title: 'Pourquoi faites-vous cette simulation ?',
    icon: '💡',
    questionType: 'multiple_choice',
    options: [
      { value: 'artisan', label: 'Je cherche un artisan / des devis', icon: '🔧' },
      { value: 'primes', label: 'Je demande mes primes', icon: '💰' },
      { value: 'info', label: 'Je me renseigne juste', icon: '📚' },
      { value: 'conseiller', label: 'Je veux parler à un conseiller', icon: '📞' }
    ],
    defaultNextQuestionKey: 'devis_signe',
    order: 41
  });

  // ============================================================
  // SECTION 5: STATUT DEVIS
  // ============================================================
  console.log('📍 Section 5: Statut devis');

  await createQuestion({
    questionKey: 'devis_signe',
    title: 'Avez-vous déjà signé un devis ?',
    icon: '📄',
    questionType: 'single_choice',
    options: [
      { value: 'oui', label: 'Oui', icon: '✅' },
      { value: 'non', label: 'Non', icon: '❌' }
    ],
    defaultNextQuestionKey: 'adresse',
    order: 42
  });

  // ============================================================
  // SECTION 6: ADRESSE
  // ============================================================
  console.log('📍 Section 6: Adresse');

  await createQuestion({
    questionKey: 'adresse',
    title: 'Quelle est l\'adresse du logement ?',
    subtitle: 'Numéro, rue, code postal et ville',
    icon: '📍',
    questionType: 'address',
    placeholder: 'Ex: 12 rue de la République, 75001 Paris',
    defaultNextQuestionKey: 'statut_occupation',
    order: 43
  });

  // ============================================================
  // SECTION 7: STATUT OCCUPATION
  // ============================================================
  console.log('📍 Section 7: Statut occupation');

  await createQuestion({
    questionKey: 'statut_occupation',
    title: 'Quel est votre statut ?',
    icon: '🏠',
    questionType: 'single_choice',
    options: [
      { value: 'proprietaire_occupant', label: 'Propriétaire occupant', icon: '🏠' },
      { value: 'acquisition', label: 'En cours d\'acquisition', icon: '📝' },
      { value: 'secondaire', label: 'Résidence secondaire', icon: '🏖️' },
      { value: 'bailleur', label: 'Propriétaire bailleur', icon: '🔑' },
      { value: 'locataire', label: 'Locataire', icon: '📋' }
    ],
    defaultNextQuestionKey: 'nb_personnes',
    order: 44
  });

  // ============================================================
  // SECTION 8: COMPOSITION FOYER
  // ============================================================
  console.log('📍 Section 8: Composition foyer');

  await createQuestion({
    questionKey: 'nb_personnes',
    title: 'Combien de personnes dans le foyer ?',
    subtitle: 'Y compris vous-même',
    icon: '👨‍👩‍👧‍👦',
    questionType: 'single_choice',
    options: [
      { value: '1', label: '1', icon: '👤' },
      { value: '2', label: '2', icon: '👫' },
      { value: '3', label: '3', icon: '👨‍👩‍👦' },
      { value: '4', label: '4', icon: '👨‍👩‍👧‍👦' },
      { value: '5', label: '5+', icon: '👨‍👩‍👧‍👦' }
    ],
    defaultNextQuestionKey: 'revenu_fiscal',
    order: 45
  });

  // ============================================================
  // SECTION 9: REVENU FISCAL
  // ============================================================
  console.log('📍 Section 9: Revenu fiscal');

  await createQuestion({
    questionKey: 'revenu_fiscal',
    title: 'Votre revenu fiscal de référence ?',
    subtitle: 'Visible sur votre avis d\'imposition',
    icon: '💰',
    questionType: 'single_choice',
    options: [
      { value: 'tres_modeste', label: 'Très modeste', description: '< 16 229€ (1 pers. IDF)' },
      { value: 'modeste', label: 'Modeste', description: '16 229€ - 20 805€ (1 pers. IDF)' },
      { value: 'intermediaire', label: 'Intermédiaire', description: '20 805€ - 29 148€ (1 pers. IDF)' },
      { value: 'superieur', label: 'Supérieur', description: '> 29 148€ (1 pers. IDF)' }
    ],
    defaultNextQuestionKey: 'telephone',
    order: 46
  });

  // ============================================================
  // SECTION 10: COORDONNÉES
  // ============================================================
  console.log('📍 Section 10: Coordonnées');

  await createQuestion({
    questionKey: 'telephone',
    title: 'Votre numéro de téléphone ?',
    subtitle: 'Pour vous recontacter avec votre estimation',
    icon: '📱',
    questionType: 'phone',
    placeholder: '06 12 34 56 78',
    defaultNextQuestionKey: 'civilite',
    order: 47
  });

  await createQuestion({
    questionKey: 'civilite',
    title: 'Vous êtes :',
    icon: '👤',
    questionType: 'single_choice',
    options: [
      { value: 'mme', label: 'Madame', icon: '👩' },
      { value: 'm', label: 'Monsieur', icon: '👨' }
    ],
    defaultNextQuestionKey: 'prenom',
    order: 48
  });

  await createQuestion({
    questionKey: 'prenom',
    title: 'Votre prénom ?',
    icon: '✏️',
    questionType: 'text',
    placeholder: 'Prénom',
    defaultNextQuestionKey: 'nom',
    order: 49
  });

  await createQuestion({
    questionKey: 'nom',
    title: 'Votre nom ?',
    icon: '✏️',
    questionType: 'text',
    placeholder: 'Nom',
    defaultNextQuestionKey: 'email',
    order: 50
  });

  await createQuestion({
    questionKey: 'email',
    title: 'Votre adresse email ?',
    subtitle: 'Pour recevoir votre estimation',
    icon: '📧',
    questionType: 'email',
    placeholder: 'votre@email.com',
    isEndQuestion: true,
    order: 51
  });

  // ============================================================
  // RÉSUMÉ
  // ============================================================
  const questionCount = await prisma.website_form_questions.count({ where: { formId: form.id } });

  console.log('\n' + '='.repeat(60));
  console.log('🎉 FORMULAIRE EFFY v2 CRÉÉ AVEC SUCCÈS !');
  console.log('='.repeat(60));
  console.log(`\n📊 Statistiques:`);
  console.log(`   • Formulaire: ${form.name}`);
  console.log(`   • Slug: ${form.slug}`);
  console.log(`   • Questions: ${questionCount}`);
  console.log(`   • Question de départ: ${form.startQuestionKey}`);
  console.log(`\n🔗 URL: /form/${form.slug}`);
  console.log('\n');
}

// Exécuter
seedEffyFormV2()
  .then(() => {
    console.log('✅ Seed terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
