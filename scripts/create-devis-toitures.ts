/**
 * Script de création du bloc Devis "Toitures" avec toutes ses sections, champs, options et tooltips.
 * 
 * Usage: npx tsx scripts/create-devis-toitures.ts
 * 
 * Ce script crée le bloc "Toitures" pour TOUTES les organisations existantes.
 * Il est idempotent : si un bloc "Toitures" existe déjà pour une org, il est ignoré.
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// ========== DÉFINITION DES SECTIONS ET CHAMPS ==========

interface FieldDef {
  label: string;
  type: string;
  width: string;
  required?: boolean;
  order: number;
  options?: { label: string; value: string }[];
  advancedConfig?: Record<string, unknown>;
  tooltip: string; // text_helpTooltipText
}

interface SectionDef {
  name: string;
  order: number;
  fields: FieldDef[];
}

const SECTIONS: SectionDef[] = [
  // ─── SECTION 1 : ÉTAT GÉNÉRAL DE LA TOITURE ───
  {
    name: 'État général de la toiture',
    order: 0,
    fields: [
      {
        label: 'Intervention souhaitée',
        type: 'select',
        width: '100%',
        required: true,
        order: 0,
        options: [
          { label: 'Rénovation complète', value: 'renovation_complete' },
          { label: 'Réparation partielle', value: 'reparation_partielle' },
          { label: 'Toiture neuve (nouvelle construction)', value: 'toiture_neuve' },
          { label: 'On ne touche pas (PV/PAC uniquement)', value: 'on_ne_touche_pas' },
        ],
        tooltip: 'À quoi sert ce champ ?\nDétermine le type de travail à réaliser sur la toiture. Cela conditionne tous les postes du devis.\n\nQuestion commerciale :\n« Que souhaitez-vous faire : rénover entièrement, réparer une zone, ou la toiture est-elle neuve ? »\n\nIndication :\nSi le client veut uniquement des panneaux PV ou une PAC, choisir "On ne touche pas".',
      },
      {
        label: 'Urgence / Délai souhaité',
        type: 'select',
        width: '50%',
        order: 1,
        options: [
          { label: 'Urgent (< 1 mois)', value: 'urgent' },
          { label: 'Normal (1–3 mois)', value: 'normal' },
          { label: 'Pas pressé (> 3 mois)', value: 'pas_presse' },
        ],
        tooltip: 'À quoi sert ce champ ?\nPermet de planifier le chantier et de prioriser les interventions.\n\nQuestion commerciale :\n« Y a-t-il des fuites ou une urgence ? Dans quel délai souhaitez-vous les travaux ? »\n\nIndication :\nUrgent = infiltrations actives ou dégâts visibles.',
      },
      {
        label: 'Problèmes constatés',
        type: 'checkboxes',
        width: '100%',
        order: 2,
        options: [
          { label: 'Fuites / Infiltrations', value: 'fuites' },
          { label: 'Tuiles / Ardoises cassées ou manquantes', value: 'couverture_cassee' },
          { label: 'Mousse / Lichens importants', value: 'mousse' },
          { label: 'Gouttières endommagées', value: 'gouttieres_endommagees' },
          { label: 'Isolation insuffisante', value: 'isolation_insuffisante' },
          { label: 'Charpente affaissée / abîmée', value: 'charpente_abimee' },
          { label: 'Zinguerie rouillée / percée', value: 'zinguerie_rouille' },
          { label: 'Aucun problème visible', value: 'aucun' },
        ],
        tooltip: 'À quoi sert ce champ ?\nIdentifie les problèmes existants pour adapter le devis et anticiper les travaux supplémentaires.\n\nQuestion commerciale :\n« Avez-vous remarqué des problèmes : fuites, tuiles cassées, mousse, gouttières abîmées ? »\n\nIndication :\nCocher tout ce qui s\'applique. "Aucun problème" = toiture en bon état apparent.',
      },
      {
        label: 'Remarques état toiture',
        type: 'textarea',
        width: '100%',
        order: 3,
        tooltip: 'À quoi sert ce champ ?\nPermet de noter des observations sur l\'état de la toiture qui ne rentrent pas dans les cases.\n\nQuestion commerciale :\n« Y a-t-il autre chose à signaler concernant votre toiture ? »\n\nIndication :\nNotes libres : âge de la dernière rénovation, historique de réparations, etc.',
      },
    ],
  },

  // ─── SECTION 2 : SOUS-TOITURE ───
  {
    name: 'Sous-toiture',
    order: 1,
    fields: [
      {
        label: 'État de la sous-toiture',
        type: 'select',
        width: '50%',
        required: true,
        order: 0,
        options: [
          { label: 'Absente', value: 'absente' },
          { label: 'Présente – bon état', value: 'bon_etat' },
          { label: 'Présente – à remplacer', value: 'a_remplacer' },
          { label: 'Inconnue (pas visible)', value: 'inconnue' },
        ],
        tooltip: 'À quoi sert ce champ ?\nLa sous-toiture (membrane sous les tuiles/ardoises) protège contre les infiltrations. Son état détermine s\'il faut la remplacer.\n\nQuestion commerciale :\n« Savez-vous s\'il y a une sous-toiture sous votre couverture ? Est-elle en bon état ? »\n\nIndication :\nSi le client ne sait pas → "Inconnue". Si pas de sous-toiture → "Absente" (obligatoire d\'en poser une).',
      },
      {
        label: 'Type de sous-toiture à poser',
        type: 'select',
        width: '50%',
        order: 1,
        options: [
          { label: 'Membrane respirante (standard)', value: 'membrane_respirante' },
          { label: 'Écran HPV (haute perméabilité vapeur)', value: 'ecran_hpv' },
          { label: 'Écran bitumé', value: 'ecran_bitume' },
          { label: 'Aucune (existante conservée)', value: 'aucune' },
        ],
        tooltip: 'À quoi sert ce champ ?\nDéfinit le type de sous-toiture à installer. Impacte le prix et la performance.\n\nQuestion commerciale :\n(Question technique, proposer selon le chantier)\n\nIndication :\nMembrane respirante = standard pour rénovation. HPV = recommandé sans lame d\'air. Bitumé = rénovation légère.',
      },
    ],
  },

  // ─── SECTION 3 : LATTAGE / CONTRE-LATTAGE ───
  {
    name: 'Lattage / Contre-lattage',
    order: 2,
    fields: [
      {
        label: 'Remplacement du lattage',
        type: 'select',
        width: '50%',
        required: true,
        order: 0,
        options: [
          { label: 'Oui – remplacement complet', value: 'complet' },
          { label: 'Partiel – selon état', value: 'partiel' },
          { label: 'Non – lattage conservé', value: 'non' },
        ],
        tooltip: 'À quoi sert ce champ ?\nLe lattage (lattes horizontales) supporte la couverture. S\'il est pourri ou trop ancien, il faut le remplacer.\n\nQuestion commerciale :\n« Le lattage (les lattes en bois sous les tuiles) sera-t-il remplacé ? »\n\nIndication :\nEn rénovation complète → généralement "Oui". Réparation partielle → "Partiel".',
      },
      {
        label: 'Section des lattes',
        type: 'select',
        width: '50%',
        order: 1,
        options: [
          { label: '38 × 50 mm (standard)', value: '38x50' },
          { label: '30 × 40 mm', value: '30x40' },
          { label: '40 × 60 mm (renforcé)', value: '40x60' },
        ],
        tooltip: 'À quoi sert ce champ ?\nDimension des lattes de bois. Détermine le produit et le prix au mètre linéaire.\n\nQuestion commerciale :\n(Question technique, rarement posée au client)\n\nIndication :\n38×50 = standard pour la plupart des couvertures.',
      },
      {
        label: 'Contre-lattage nécessaire',
        type: 'select',
        width: '50%',
        order: 2,
        options: [
          { label: 'Oui', value: 'oui' },
          { label: 'Non', value: 'non' },
        ],
        tooltip: 'À quoi sert ce champ ?\nLe contre-lattage (lattes verticales) crée une lame d\'air sous la couverture. Obligatoire avec certaines sous-toitures.\n\nQuestion commerciale :\n(Question technique)\n\nIndication :\nOui = obligatoire avec écran HPV posé sur chevrons.',
      },
      {
        label: 'Section des contre-lattes',
        type: 'select',
        width: '50%',
        order: 3,
        options: [
          { label: '12 × 32 mm', value: '12x32' },
          { label: '16 × 32 mm', value: '16x32' },
          { label: '38 × 50 mm', value: '38x50' },
        ],
        tooltip: 'À quoi sert ce champ ?\nDimension des contre-lattes. Impacte la lame d\'air et le prix.\n\nQuestion commerciale :\n(Question technique)\n\nIndication :\n16×32 = standard. 38×50 = si ventilation renforcée nécessaire.',
      },
    ],
  },

  // ─── SECTION 4 : COUVERTURE ───
  {
    name: 'Couverture',
    order: 3,
    fields: [
      {
        label: 'Matériau de couverture',
        type: 'select',
        width: '50%',
        required: true,
        order: 0,
        options: [
          { label: 'Tuiles béton', value: 'tuiles_beton' },
          { label: 'Tuiles terre cuite', value: 'tuiles_terre_cuite' },
          { label: 'Ardoises naturelles', value: 'ardoises_naturelles' },
          { label: 'Ardoises fibro-ciment', value: 'ardoises_fibrociment' },
          { label: 'Zinc (joint debout)', value: 'zinc_joint_debout' },
          { label: 'Roofing / Membrane EPDM', value: 'roofing_epdm' },
          { label: 'Autre', value: 'autre' },
        ],
        tooltip: 'À quoi sert ce champ ?\nDéfinit le type de couverture qui sera posée. C\'est le poste principal du devis toiture.\n\nQuestion commerciale :\n« Quel type de couverture souhaitez-vous ? Tuiles, ardoises, zinc ? »\n\nIndication :\nTuiles béton = le plus courant et économique. Ardoises naturelles = esthétique premium. Zinc = toitures plates ou modernes.',
      },
      {
        label: 'Modèle / Gamme',
        type: 'select',
        width: '50%',
        order: 1,
        options: [
          // Tuiles
          { label: 'Bruges Novo+ (tuile béton)', value: 'bruges_novo_plus' },
          { label: 'Tuile S (terre cuite)', value: 'tuile_s' },
          { label: 'Universelle (terre cuite)', value: 'universelle' },
          // Ardoises
          { label: 'CUPA 12 (naturelle)', value: 'cupa_12' },
          { label: 'CUPA 98 (naturelle)', value: 'cupa_98' },
          { label: 'CUPA H (naturelle)', value: 'cupa_h' },
          { label: 'Rathscheck (naturelle)', value: 'rathscheck' },
          { label: 'Alterna (fibro-ciment)', value: 'alterna' },
          { label: 'New Stonit (fibro-ciment)', value: 'new_stonit' },
          // Autre
          { label: 'Autre (préciser en remarques)', value: 'autre' },
        ],
        tooltip: 'À quoi sert ce champ ?\nPrécise le modèle exact du matériau. Permet de calculer le prix unitaire depuis le catalogue fournisseur.\n\nQuestion commerciale :\n« Avez-vous une préférence de modèle ou de gamme ? »\n\nIndication :\nBruges Novo+ = best-seller tuile béton. CUPA = référence ardoises naturelles. Alterna = ardoise fibro-ciment économique.',
      },
      {
        label: 'Couleur',
        type: 'text',
        width: '50%',
        order: 2,
        tooltip: 'À quoi sert ce champ ?\nCouleur choisie pour la couverture. Certains modèles existent en plusieurs coloris.\n\nQuestion commerciale :\n« Quelle couleur souhaitez-vous pour vos tuiles/ardoises ? »\n\nIndication :\nEx: Noir, Anthracite, Brun, Gris. Si pas de préférence → laisser vide.',
      },
      {
        label: 'Format ardoises',
        type: 'select',
        width: '50%',
        order: 3,
        options: [
          { label: '40 × 40 cm', value: '40x40' },
          { label: '40 × 25 cm', value: '40x25' },
          { label: '30 × 20 cm (rectangulaire)', value: '30x20' },
          { label: '32 × 22 cm', value: '32x22' },
          { label: 'Autre', value: 'autre' },
        ],
        tooltip: 'À quoi sert ce champ ?\nFormat (taille) des ardoises. Détermine le nombre au m² et donc la quantité à commander.\n\nQuestion commerciale :\n« Quel format d\'ardoises préférez-vous ? »\n\nIndication :\n40×40 = format carré classique en Belgique. 40×25 = rectangulaire standard. À remplir uniquement si ardoises sélectionnées.',
      },
      {
        label: 'Fixation couverture',
        type: 'select',
        width: '50%',
        order: 4,
        options: [
          { label: 'Crochets (tuiles)', value: 'crochets' },
          { label: 'Clous inox (ardoises)', value: 'clous_inox' },
          { label: 'Clous cuivre (ardoises)', value: 'clous_cuivre' },
          { label: 'Agrafes (zinc)', value: 'agrafes_zinc' },
          { label: 'Vis inox', value: 'vis_inox' },
        ],
        tooltip: 'À quoi sert ce champ ?\nType de fixation pour la couverture. Chaque matériau a sa fixation dédiée.\n\nQuestion commerciale :\n(Question technique, rarement posée au client)\n\nIndication :\nCrochets = tuiles. Clous inox = ardoises standard. Cuivre = ardoises haut de gamme.',
      },
    ],
  },

  // ─── SECTION 5 : ZINGUERIE ───
  {
    name: 'Zinguerie',
    order: 4,
    fields: [
      {
        label: 'Matériau zinguerie',
        type: 'select',
        width: '50%',
        required: true,
        order: 0,
        options: [
          { label: 'Zinc naturel (ZN)', value: 'zn' },
          { label: 'Zinc anthra (ATZ)', value: 'atz' },
          { label: 'Zinc quartz (QZ)', value: 'qz' },
          { label: 'Cuivre (CU)', value: 'cu' },
          { label: 'Aluminium laqué', value: 'alu_laque' },
          { label: 'PVC', value: 'pvc' },
        ],
        tooltip: 'À quoi sert ce champ ?\nMatériau utilisé pour toute la zinguerie (gouttières, descentes, rives, etc.). Impacte fortement le prix.\n\nQuestion commerciale :\n« En quel matériau souhaitez-vous la zinguerie ? Zinc, cuivre, alu ? »\n\nIndication :\nZinc naturel = standard. Anthra/Quartz = esthétique moderne. Cuivre = premium.',
      },
      {
        label: 'Remplacement gouttières',
        type: 'select',
        width: '50%',
        order: 1,
        options: [
          { label: 'Oui – toutes', value: 'oui_toutes' },
          { label: 'Partiellement', value: 'partiel' },
          { label: 'Non – conservées', value: 'non' },
        ],
        tooltip: 'À quoi sert ce champ ?\nDétermine si les gouttières doivent être remplacées (inclus dans le devis).\n\nQuestion commerciale :\n« Les gouttières sont-elles en bon état ou faut-il les remplacer ? »\n\nIndication :\nEn rénovation complète → généralement "Oui – toutes".',
      },
      {
        label: 'Type de gouttières',
        type: 'select',
        width: '50%',
        order: 2,
        options: [
          { label: 'Demi-ronde (DL)', value: 'dl' },
          { label: 'Corniche moulurée (VM)', value: 'vm' },
          { label: 'Carrée (CAR)', value: 'car' },
          { label: 'Ardennaise (ARD)', value: 'ard' },
        ],
        tooltip: 'À quoi sert ce champ ?\nForme (profil) de la gouttière. Détermine le modèle exact dans le catalogue.\n\nQuestion commerciale :\n« Quel style de gouttière préférez-vous ? Demi-ronde classique ou corniche ? »\n\nIndication :\nDemi-ronde (DL) = le plus courant. Corniche (VM) = esthétique traditionnelle. Carrée = moderne.',
      },
      {
        label: 'Développement gouttières (mm)',
        type: 'select',
        width: '50%',
        order: 3,
        options: [
          { label: '280 mm (standard petit)', value: '280' },
          { label: '330 mm (standard)', value: '330' },
          { label: '400 mm (grand)', value: '400' },
        ],
        tooltip: 'À quoi sert ce champ ?\nLargeur de développement de la gouttière en mm. Plus c\'est grand, plus elle évacue d\'eau.\n\nQuestion commerciale :\n(Question technique)\n\nIndication :\n330 mm = standard pour maison individuelle. 400 mm = grande surface de toiture ou forte pluviosité.',
      },
      {
        label: 'ML gouttières (estimation)',
        type: 'number',
        width: '50%',
        order: 4,
        advancedConfig: { placeholder: 'Auto-calculé depuis façades' },
        tooltip: 'À quoi sert ce champ ?\nMètres linéaires de gouttières à poser. Peut être estimé depuis les longueurs de façade.\n\nQuestion commerciale :\n(Pas de question, mesuré sur place)\n\nIndication :\nÉgal environ à la somme des longueurs de façade (avant + arrière). Sera affiné au métré.',
      },
      {
        label: 'Remplacement descentes',
        type: 'select',
        width: '50%',
        order: 5,
        options: [
          { label: 'Oui – toutes', value: 'oui_toutes' },
          { label: 'Partiellement', value: 'partiel' },
          { label: 'Non – conservées', value: 'non' },
        ],
        tooltip: 'À quoi sert ce champ ?\nDétermine si les descentes d\'eau pluviale doivent être remplacées.\n\nQuestion commerciale :\n« Les descentes d\'eau sont-elles en bon état ? »\n\nIndication :\nSouvent remplacées en même temps que les gouttières pour une zinguerie homogène.',
      },
      {
        label: 'Diamètre descentes (mm)',
        type: 'select',
        width: '50%',
        order: 6,
        options: [
          { label: '80 mm (standard)', value: '80' },
          { label: '100 mm (grand)', value: '100' },
        ],
        tooltip: 'À quoi sert ce champ ?\nDiamètre des tuyaux de descente. Plus c\'est grand, plus ça évacue rapidement.\n\nQuestion commerciale :\n(Question technique)\n\nIndication :\n80 mm = standard maison. 100 mm = surface de toiture > 100 m².',
      },
      {
        label: 'Nombre de descentes',
        type: 'number',
        width: '50%',
        order: 7,
        tooltip: 'À quoi sert ce champ ?\nNombre total de descentes d\'eau pluviale à poser ou remplacer.\n\nQuestion commerciale :\n« Combien de descentes d\'eau avez-vous actuellement ? »\n\nIndication :\nEn général : 1 descente par 50 m² de toiture. Minimum 2 par versant long.',
      },
      {
        label: 'Hauteur descentes (m)',
        type: 'number',
        width: '50%',
        order: 8,
        advancedConfig: { placeholder: 'Hauteur façade × nb étages' },
        tooltip: 'À quoi sert ce champ ?\nHauteur moyenne d\'une descente (du bas de la gouttière au sol). Sert à calculer les ML de tuyau.\n\nQuestion commerciale :\n(Mesuré ou estimé)\n\nIndication :\nÉgal environ à la hauteur de façade. Si 2 étages ≈ 6m, si 1 étage ≈ 3m.',
      },
    ],
  },

  // ─── SECTION 6 : FINITIONS ZINGUERIE ───
  {
    name: 'Finitions zinguerie',
    order: 5,
    fields: [
      {
        label: 'Rives à remplacer',
        type: 'select',
        width: '50%',
        order: 0,
        options: [
          { label: 'Oui', value: 'oui' },
          { label: 'Non', value: 'non' },
        ],
        tooltip: 'À quoi sert ce champ ?\nLes rives sont les finitions sur les bords latéraux du toit. Elles protègent contre le vent et la pluie.\n\nQuestion commerciale :\n« Les bords du toit (rives) sont-ils en bon état ? »\n\nIndication :\nEn rénovation complète → généralement oui.',
      },
      {
        label: 'ML rives (estimation)',
        type: 'number',
        width: '50%',
        order: 1,
        tooltip: 'À quoi sert ce champ ?\nMètres linéaires de rives à remplacer. Correspond aux rampants de toiture.\n\nQuestion commerciale :\n(Mesuré sur place)\n\nIndication :\nEstimation = somme des longueurs de rampant × 2 côtés.',
      },
      {
        label: 'Faîtière à remplacer',
        type: 'select',
        width: '50%',
        order: 2,
        options: [
          { label: 'Oui – faîtière zinc', value: 'oui_zinc' },
          { label: 'Oui – faîtière tuile/ardoise', value: 'oui_couverture' },
          { label: 'Non', value: 'non' },
        ],
        tooltip: 'À quoi sert ce champ ?\nLa faîtière est la pièce de finition au sommet du toit. Elle étanchéifie l\'arête supérieure.\n\nQuestion commerciale :\n« Le faîte du toit (le sommet) a-t-il besoin d\'être refait ? »\n\nIndication :\nFaîtière zinc = toiture zinc ou rénovation. Faîtière tuile = toiture tuiles.',
      },
      {
        label: 'ML faîtière',
        type: 'number',
        width: '50%',
        order: 3,
        tooltip: 'À quoi sert ce champ ?\nMètres linéaires de faîtière à poser.\n\nQuestion commerciale :\n(Mesuré sur place)\n\nIndication :\nCorrespond à la longueur du bâtiment côté pignon.',
      },
      {
        label: 'Noues à traiter',
        type: 'select',
        width: '50%',
        order: 4,
        options: [
          { label: 'Oui', value: 'oui' },
          { label: 'Non – pas de noue', value: 'non' },
        ],
        tooltip: 'À quoi sert ce champ ?\nLes noues sont les angles rentrants entre deux pans de toiture. Zone sensible aux infiltrations.\n\nQuestion commerciale :\n« Y a-t-il des angles rentrants (vallées) sur votre toiture ? »\n\nIndication :\nFréquent sur les toitures en L ou T. Si toit simple 2 pans → "Non".',
      },
      {
        label: 'ML noues',
        type: 'number',
        width: '50%',
        order: 5,
        tooltip: 'À quoi sert ce champ ?\nMètres linéaires de noues à traiter.\n\nQuestion commerciale :\n(Mesuré sur place)\n\nIndication :\nChaque noue = la longueur de l\'angle du haut vers le bas du toit.',
      },
      {
        label: 'Bavettes / Abergements',
        type: 'select',
        width: '50%',
        order: 6,
        options: [
          { label: 'Oui (cheminée, mur, etc.)', value: 'oui' },
          { label: 'Non', value: 'non' },
        ],
        tooltip: 'À quoi sert ce champ ?\nLes bavettes/abergements sont les raccords zinc entre la toiture et un mur, une cheminée, un velux, etc.\n\nQuestion commerciale :\n« Y a-t-il une cheminée, un mur mitoyen ou des éléments qui traversent la toiture ? »\n\nIndication :\nCheminée = toujours un abergement. Mur mitoyen = bavette nécessaire.',
      },
      {
        label: 'Nombre de bavettes / abergements',
        type: 'number',
        width: '50%',
        order: 7,
        tooltip: 'À quoi sert ce champ ?\nNombre de pièces de raccord à réaliser (cheminées, murs, velux, etc.).\n\nQuestion commerciale :\n« Combien de cheminées et d\'éléments qui traversent le toit y a-t-il ? »\n\nIndication :\nCompter : chaque cheminée (4 côtés = 1 abergement), chaque mur mitoyen, chaque velux.',
      },
    ],
  },

  // ─── SECTION 7 : FENÊTRES DE TOIT ───
  {
    name: 'Fenêtres de toit',
    order: 6,
    fields: [
      {
        label: 'Fenêtres de toit à poser',
        type: 'select',
        width: '50%',
        order: 0,
        options: [
          { label: 'Oui – neuves', value: 'oui_neuves' },
          { label: 'Oui – remplacement', value: 'oui_remplacement' },
          { label: 'Non', value: 'non' },
        ],
        tooltip: 'À quoi sert ce champ ?\nDétermine si le devis inclut des fenêtres de toit (type Velux).\n\nQuestion commerciale :\n« Souhaitez-vous des fenêtres de toit ? Ou en avez-vous à remplacer ? »\n\nIndication :\nNeuves = percement nécessaire (chevêtre). Remplacement = même ouverture réutilisée.',
      },
      {
        label: 'Type d\'ouverture',
        type: 'select',
        width: '50%',
        order: 1,
        options: [
          { label: 'Rotation (GGL)', value: 'ggl' },
          { label: 'Projection (GPL)', value: 'gpl' },
        ],
        tooltip: 'À quoi sert ce champ ?\nMécanisme d\'ouverture de la fenêtre. GGL = pivot central, GPL = ouverture vers l\'extérieur par le bas.\n\nQuestion commerciale :\n« Préférez-vous une fenêtre qui pivote au centre ou qui s\'ouvre vers l\'extérieur ? »\n\nIndication :\nGGL (rotation) = le plus courant, à portée de main. GPL (projection) = si hauteur basse, vue dégagée.',
      },
      {
        label: 'Dimensions fenêtre',
        type: 'select',
        width: '50%',
        order: 2,
        options: [
          { label: '55 × 78 cm (CK02)', value: 'ck02' },
          { label: '55 × 98 cm (CK04)', value: 'ck04' },
          { label: '78 × 98 cm (MK04)', value: 'mk04' },
          { label: '78 × 118 cm (MK06)', value: 'mk06' },
          { label: '78 × 140 cm (MK08)', value: 'mk08' },
          { label: '114 × 118 cm (SK06)', value: 'sk06' },
          { label: '134 × 140 cm (UK08)', value: 'uk08' },
          { label: 'Autre', value: 'autre' },
        ],
        tooltip: 'À quoi sert ce champ ?\nTaille de la fenêtre de toit (code fabricant VELUX). Impacte le prix et le raccord.\n\nQuestion commerciale :\n« Quelle taille de fenêtre souhaitez-vous ? »\n\nIndication :\n78×118 (MK06) = taille la plus populaire. Plus la fenêtre est grande, plus elle éclaire.',
      },
      {
        label: 'Nombre de fenêtres',
        type: 'number',
        width: '50%',
        order: 3,
        tooltip: 'À quoi sert ce champ ?\nQuantité de fenêtres de toit à poser.\n\nQuestion commerciale :\n« Combien de fenêtres de toit souhaitez-vous ? »\n\nIndication :\n1 par pièce sous combles en général.',
      },
      {
        label: 'Store / Volet',
        type: 'select',
        width: '50%',
        order: 4,
        options: [
          { label: 'Aucun', value: 'aucun' },
          { label: 'Store intérieur occultant', value: 'store_occultant' },
          { label: 'Volet roulant extérieur', value: 'volet_roulant' },
          { label: 'Store extérieur pare-soleil', value: 'store_pare_soleil' },
        ],
        tooltip: 'À quoi sert ce champ ?\nAccessoire complémentaire pour la fenêtre de toit.\n\nQuestion commerciale :\n« Souhaitez-vous un volet roulant ou un store pour vos fenêtres de toit ? »\n\nIndication :\nVolet roulant = meilleure isolation thermique et phonique. Store occultant = chambre à coucher.',
      },
    ],
  },

  // ─── SECTION 8 : ÉCHAFAUDAGE ET LOGISTIQUE ───
  {
    name: 'Échafaudage et logistique',
    order: 7,
    fields: [
      {
        label: 'Échafaudage nécessaire',
        type: 'select',
        width: '50%',
        required: true,
        order: 0,
        options: [
          { label: 'Oui – location', value: 'oui_location' },
          { label: 'Oui – propre', value: 'oui_propre' },
          { label: 'Non (accès par nacelle/échelle)', value: 'non' },
        ],
        tooltip: 'À quoi sert ce champ ?\nL\'échafaudage est souvent le 2ème poste budgétaire. Détermine s\'il faut louer ou utiliser du matériel propre.\n\nQuestion commerciale :\n« L\'accès au toit est-il facile ? Y a-t-il besoin d\'un échafaudage ? »\n\nIndication :\nPlus de 2 étages = échafaudage quasi obligatoire. Maison mitoyenne = accès limité.',
      },
      {
        label: 'ML d\'échafaudage',
        type: 'number',
        width: '50%',
        order: 1,
        tooltip: 'À quoi sert ce champ ?\nMètres linéaires d\'échafaudage à installer (longueur de façade à couvrir).\n\nQuestion commerciale :\n(Estimé sur place)\n\nIndication :\nPérimètre du bâtiment si échafaudage complet. Sinon longueur de la ou des façades concernées.',
      },
      {
        label: 'Durée location échafaudage (semaines)',
        type: 'number',
        width: '50%',
        order: 2,
        tooltip: 'À quoi sert ce champ ?\nDurée de location de l\'échafaudage en semaines. Impacte le coût de location.\n\nQuestion commerciale :\n(Estimé par le chef de chantier)\n\nIndication :\nToiture standard ≈ 2–3 semaines. Grande toiture ≈ 4–6 semaines.',
      },
      {
        label: 'Container / Benne à déchets',
        type: 'select',
        width: '50%',
        order: 3,
        options: [
          { label: 'Oui – container 10m³', value: 'container_10' },
          { label: 'Oui – container 20m³', value: 'container_20' },
          { label: 'Oui – big bag', value: 'big_bag' },
          { label: 'Non', value: 'non' },
        ],
        tooltip: 'À quoi sert ce champ ?\nÉvacuation des déchets de chantier (anciennes tuiles, bois, etc.).\n\nQuestion commerciale :\n« Avez-vous un endroit pour stocker les déchets ou faut-il un container ? »\n\nIndication :\n10m³ = rénovation standard. 20m³ = grande surface ou beaucoup de déblais.',
      },
      {
        label: 'Distance chantier (km)',
        type: 'number',
        width: '50%',
        order: 4,
        tooltip: 'À quoi sert ce champ ?\nDistance entre le dépôt/bureau et le chantier. Peut générer un forfait déplacement.\n\nQuestion commerciale :\n(Calculé depuis l\'adresse du chantier)\n\nIndication :\nPeut être auto-calculé depuis l\'adresse du chantier dans la fiche lead.',
      },
    ],
  },

  // ─── SECTION 9 : OPTIONS ET TRAVAUX DIVERS ───
  {
    name: 'Options et travaux divers',
    order: 8,
    fields: [
      {
        label: 'Démoussage toiture',
        type: 'select',
        width: '50%',
        order: 0,
        options: [
          { label: 'Oui', value: 'oui' },
          { label: 'Non', value: 'non' },
        ],
        tooltip: 'À quoi sert ce champ ?\nTraitement anti-mousse de la toiture existante (si conservée) ou préventif.\n\nQuestion commerciale :\n« Souhaitez-vous un traitement anti-mousse ? »\n\nIndication :\nUtile si la couverture est conservée ("On ne touche pas" ou réparation partielle).',
      },
      {
        label: 'Isolation sous-toiture',
        type: 'select',
        width: '50%',
        order: 1,
        options: [
          { label: 'Oui – par l\'intérieur', value: 'oui_interieur' },
          { label: 'Oui – par l\'extérieur (sarking)', value: 'oui_sarking' },
          { label: 'Non', value: 'non' },
        ],
        tooltip: 'À quoi sert ce champ ?\nAjout ou remplacement de l\'isolation sous le toit. Peut être fait en même temps que la rénovation.\n\nQuestion commerciale :\n« Profitez-vous de la rénovation pour isoler votre toiture ? »\n\nIndication :\nPar l\'intérieur = moins cher, perte d\'espace. Sarking = pas de perte d\'espace, plus coûteux.',
      },
      {
        label: 'Épaisseur isolation (cm)',
        type: 'number',
        width: '50%',
        order: 2,
        tooltip: 'À quoi sert ce champ ?\nÉpaisseur de l\'isolant à poser. Plus c\'est épais, meilleure est la performance thermique.\n\nQuestion commerciale :\n« Quelle épaisseur d\'isolation souhaitez-vous ? »\n\nIndication :\nMinimum 12 cm pour conformité PEB (Belgique). 18–24 cm = performance optimale.',
      },
      {
        label: 'Traitement charpente',
        type: 'select',
        width: '50%',
        order: 3,
        options: [
          { label: 'Oui – traitement fongicide/insecticide', value: 'oui_traitement' },
          { label: 'Oui – remplacement partiel', value: 'oui_remplacement' },
          { label: 'Non', value: 'non' },
        ],
        tooltip: 'À quoi sert ce champ ?\nTraitement ou réparation de la charpente si elle est abîmée, infestée ou affaiblie.\n\nQuestion commerciale :\n« La charpente a-t-elle été traitée récemment ? Y a-t-il des signes de moisissure ou d\'insectes ? »\n\nIndication :\nTraitement = préventif/curatif chimique. Remplacement = pièces de bois endommagées.',
      },
      {
        label: 'Chatière / Ventilation toiture',
        type: 'select',
        width: '50%',
        order: 4,
        options: [
          { label: 'Oui – chatières à poser', value: 'oui_chatieres' },
          { label: 'Oui – tuile de ventilation', value: 'oui_tuile_ventilation' },
          { label: 'Non', value: 'non' },
        ],
        tooltip: 'À quoi sert ce champ ?\nÉléments de ventilation de la toiture. Évitent la condensation sous la couverture.\n\nQuestion commerciale :\n(Question technique)\n\nIndication :\nEn général 1 chatière / 20 m² de toiture pour une bonne ventilation.',
      },
      {
        label: 'Nombre de chatières',
        type: 'number',
        width: '50%',
        order: 5,
        tooltip: 'À quoi sert ce champ ?\nQuantité de chatières / tuiles de ventilation à installer.\n\nQuestion commerciale :\n(Question technique)\n\nIndication :\nRègle : 1 chatière / 20 m² de versant. Ex: versant de 60 m² → 3 chatières.',
      },
      {
        label: 'Remarques complémentaires',
        type: 'textarea',
        width: '100%',
        order: 6,
        tooltip: 'À quoi sert ce champ ?\nEspace libre pour des informations complémentaires sur le chantier.\n\nQuestion commerciale :\n« Avez-vous d\'autres demandes ou remarques ? »\n\nIndication :\nTout ce qui n\'est pas couvert par les champs ci-dessus : accès difficile, voisinage, contraintes urbanistiques, etc.',
      },
    ],
  },
];

// ========== LOGIQUE PRINCIPALE ==========

async function main() {
  console.log('🏗️  Création du bloc Devis "Toitures"...\n');

  // Récupérer toutes les organisations
  const organizations = await prisma.organization.findMany({ select: { id: true, name: true } });
  console.log(`📋 ${organizations.length} organisation(s) trouvée(s)\n`);

  for (const org of organizations) {
    console.log(`\n━━━ Organisation: ${org.name} (${org.id}) ━━━`);

    // Vérifier si un bloc "Toitures" existe déjà
    const existingBlock = await prisma.block.findFirst({
      where: {
        organizationId: org.id,
        name: { contains: 'Toitures', mode: 'insensitive' },
      },
    });

    if (existingBlock) {
      console.log(`   ⏭️  Bloc "Toitures" existe déjà (${existingBlock.id}) — ignoré`);
      continue;
    }

    // Créer le bloc
    const blockId = uuidv4();
    await prisma.block.create({
      data: {
        id: blockId,
        name: 'Toitures',
        organizationId: org.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`   ✅ Bloc créé: Toitures (${blockId})`);

    // Créer les sections et champs
    let totalFields = 0;
    let totalOptions = 0;

    for (const sectionDef of SECTIONS) {
      const sectionId = uuidv4();
      await prisma.section.create({
        data: {
          id: sectionId,
          name: sectionDef.name,
          order: sectionDef.order,
          blockId: blockId,
          active: true,
        },
      });
      console.log(`   📄 Section: ${sectionDef.name} (${sectionDef.fields.length} champs)`);

      for (const fieldDef of sectionDef.fields) {
        const fieldId = uuidv4();
        await prisma.field.create({
          data: {
            id: fieldId,
            label: fieldDef.label,
            type: fieldDef.type,
            width: fieldDef.width,
            required: fieldDef.required ?? false,
            sectionId: sectionId,
            order: fieldDef.order,
            advancedConfig: fieldDef.advancedConfig
              ? {
                  ...fieldDef.advancedConfig,
                  helpTooltipType: 'text',
                  helpTooltipText: fieldDef.tooltip,
                }
              : {
                  helpTooltipType: 'text',
                  helpTooltipText: fieldDef.tooltip,
                },
          },
        });
        totalFields++;

        // Créer les options si c'est un select, radio ou checkboxes
        if (fieldDef.options && fieldDef.options.length > 0) {
          for (let i = 0; i < fieldDef.options.length; i++) {
            const opt = fieldDef.options[i];
            await prisma.fieldOption.create({
              data: {
                id: uuidv4(),
                label: opt.label,
                value: opt.value,
                fieldId: fieldId,
                order: i,
              },
            });
            totalOptions++;
          }
        }
      }
    }

    console.log(`\n   📊 Total: ${totalFields} champs, ${totalOptions} options créés`);
  }

  console.log('\n\n🎉 Script terminé avec succès !');
}

main()
  .catch((e) => {
    console.error('💥 ERREUR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
