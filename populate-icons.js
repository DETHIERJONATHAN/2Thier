const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 104 Icônes Ant Design organisées par catégories
const iconData = [
  // NAVIGATION (20 icônes)
  { name: 'HomeOutlined', category: 'navigation', description: 'Accueil' },
  { name: 'AppstoreOutlined', category: 'navigation', description: 'Applications' },
  { name: 'MenuOutlined', category: 'navigation', description: 'Menu' },
  { name: 'MoreOutlined', category: 'navigation', description: 'Plus' },
  { name: 'SearchOutlined', category: 'navigation', description: 'Recherche' },
  { name: 'FilterOutlined', category: 'navigation', description: 'Filtrer' },
  { name: 'ReloadOutlined', category: 'navigation', description: 'Actualiser' },
  { name: 'SettingOutlined', category: 'navigation', description: 'Paramètres' },
  { name: 'CloseOutlined', category: 'navigation', description: 'Fermer' },
  { name: 'FullscreenOutlined', category: 'navigation', description: 'Plein écran' },
  { name: 'FullscreenExitOutlined', category: 'navigation', description: 'Sortir plein écran' },
  { name: 'ArrowLeftOutlined', category: 'navigation', description: 'Flèche gauche' },
  { name: 'ArrowRightOutlined', category: 'navigation', description: 'Flèche droite' },
  { name: 'ArrowUpOutlined', category: 'navigation', description: 'Flèche haut' },
  { name: 'ArrowDownOutlined', category: 'navigation', description: 'Flèche bas' },
  { name: 'DoubleLeftOutlined', category: 'navigation', description: 'Double flèche gauche' },
  { name: 'DoubleRightOutlined', category: 'navigation', description: 'Double flèche droite' },
  { name: 'LeftOutlined', category: 'navigation', description: 'Gauche' },
  { name: 'RightOutlined', category: 'navigation', description: 'Droite' },
  { name: 'UpOutlined', category: 'navigation', description: 'Haut' },

  // BUSINESS (25 icônes)
  { name: 'UserOutlined', category: 'business', description: 'Utilisateur' },
  { name: 'TeamOutlined', category: 'business', description: 'Équipe' },
  { name: 'CustomerServiceOutlined', category: 'business', description: 'Service client' },
  { name: 'ContactsOutlined', category: 'business', description: 'Contacts' },
  { name: 'IdcardOutlined', category: 'business', description: 'Carte d\'identité' },
  { name: 'SolutionOutlined', category: 'business', description: 'Solution' },
  { name: 'AuditOutlined', category: 'business', description: 'Audit' },
  { name: 'BankOutlined', category: 'business', description: 'Banque' },
  { name: 'ShopOutlined', category: 'business', description: 'Boutique' },
  { name: 'ShoppingOutlined', category: 'business', description: 'Achats' },
  { name: 'ShoppingCartOutlined', category: 'business', description: 'Panier' },
  { name: 'CreditCardOutlined', category: 'business', description: 'Carte de crédit' },
  { name: 'PayCircleOutlined', category: 'business', description: 'Paiement' },
  { name: 'MoneyCollectOutlined', category: 'business', description: 'Collecte d\'argent' },
  { name: 'DollarOutlined', category: 'business', description: 'Dollar' },
  { name: 'EuroOutlined', category: 'business', description: 'Euro' },
  { name: 'PoundOutlined', category: 'business', description: 'Livre' },
  { name: 'PropertySafetyOutlined', category: 'business', description: 'Sécurité' },
  { name: 'SafetyCertificateOutlined', category: 'business', description: 'Certificat sécurisé' },
  { name: 'InsuranceOutlined', category: 'business', description: 'Assurance' },
  { name: 'TrophyOutlined', category: 'business', description: 'Trophée' },
  { name: 'CrownOutlined', category: 'business', description: 'Couronne' },
  { name: 'StarOutlined', category: 'business', description: 'Étoile' },
  { name: 'HeartOutlined', category: 'business', description: 'Cœur' },
  { name: 'LikeOutlined', category: 'business', description: 'J\'aime' },

  // COMMUNICATION (20 icônes)
  { name: 'MailOutlined', category: 'communication', description: 'Email' },
  { name: 'MessageOutlined', category: 'communication', description: 'Message' },
  { name: 'CommentOutlined', category: 'communication', description: 'Commentaire' },
  { name: 'WechatOutlined', category: 'communication', description: 'Chat WeChat' },
  { name: 'QqOutlined', category: 'communication', description: 'QQ' },
  { name: 'PhoneOutlined', category: 'communication', description: 'Téléphone' },
  { name: 'MobileOutlined', category: 'communication', description: 'Mobile' },
  { name: 'VideoCameraOutlined', category: 'communication', description: 'Caméra vidéo' },
  { name: 'SoundOutlined', category: 'communication', description: 'Son' },
  { name: 'AudioOutlined', category: 'communication', description: 'Audio' },
  { name: 'NotificationOutlined', category: 'communication', description: 'Notification' },
  { name: 'BellOutlined', category: 'communication', description: 'Cloche' },
  { name: 'GlobalOutlined', category: 'communication', description: 'Global' },
  { name: 'SendOutlined', category: 'communication', description: 'Envoyer' },
  { name: 'ShareAltOutlined', category: 'communication', description: 'Partager' },
  { name: 'RetweetOutlined', category: 'communication', description: 'Retweeter' },
  { name: 'TwitterOutlined', category: 'communication', description: 'Twitter' },
  { name: 'FacebookOutlined', category: 'communication', description: 'Facebook' },
  { name: 'LinkedinOutlined', category: 'communication', description: 'LinkedIn' },
  { name: 'InstagramOutlined', category: 'communication', description: 'Instagram' },

  // FICHIERS (15 icônes)
  { name: 'FileOutlined', category: 'files', description: 'Fichier' },
  { name: 'FolderOutlined', category: 'files', description: 'Dossier' },
  { name: 'FolderOpenOutlined', category: 'files', description: 'Dossier ouvert' },
  { name: 'FileTextOutlined', category: 'files', description: 'Fichier texte' },
  { name: 'FilePdfOutlined', category: 'files', description: 'PDF' },
  { name: 'FileWordOutlined', category: 'files', description: 'Word' },
  { name: 'FileExcelOutlined', category: 'files', description: 'Excel' },
  { name: 'FilePptOutlined', category: 'files', description: 'PowerPoint' },
  { name: 'FileImageOutlined', category: 'files', description: 'Image' },
  { name: 'FileZipOutlined', category: 'files', description: 'Archive ZIP' },
  { name: 'UploadOutlined', category: 'files', description: 'Upload' },
  { name: 'DownloadOutlined', category: 'files', description: 'Téléchargement' },
  { name: 'CloudUploadOutlined', category: 'files', description: 'Upload cloud' },
  { name: 'CloudDownloadOutlined', category: 'files', description: 'Téléchargement cloud' },
  { name: 'InboxOutlined', category: 'files', description: 'Boîte de réception' },

  // OUTILS (12 icônes)
  { name: 'ToolOutlined', category: 'tools', description: 'Outil' },
  { name: 'EditOutlined', category: 'tools', description: 'Éditer' },
  { name: 'DeleteOutlined', category: 'tools', description: 'Supprimer' },
  { name: 'CopyOutlined', category: 'tools', description: 'Copier' },
  { name: 'ScissorOutlined', category: 'tools', description: 'Couper' },
  { name: 'HighlightOutlined', category: 'tools', description: 'Surligner' },
  { name: 'FormOutlined', category: 'tools', description: 'Formulaire' },
  { name: 'CheckOutlined', category: 'tools', description: 'Vérifier' },
  { name: 'CloseCircleOutlined', category: 'tools', description: 'Fermer cercle' },
  { name: 'CheckCircleOutlined', category: 'tools', description: 'Vérifier cercle' },
  { name: 'ExclamationCircleOutlined', category: 'tools', description: 'Attention cercle' },
  { name: 'QuestionCircleOutlined', category: 'tools', description: 'Question cercle' },

  // DONNÉES (12 icônes)
  { name: 'DatabaseOutlined', category: 'data', description: 'Base de données' },
  { name: 'TableOutlined', category: 'data', description: 'Tableau' },
  { name: 'PieChartOutlined', category: 'data', description: 'Graphique camembert' },
  { name: 'BarChartOutlined', category: 'data', description: 'Graphique barres' },
  { name: 'LineChartOutlined', category: 'data', description: 'Graphique lignes' },
  { name: 'AreaChartOutlined', category: 'data', description: 'Graphique zones' },
  { name: 'DotChartOutlined', category: 'data', description: 'Graphique points' },
  { name: 'FundOutlined', category: 'data', description: 'Fonds' },
  { name: 'StockOutlined', category: 'data', description: 'Stock' },
  { name: 'CalculatorOutlined', category: 'data', description: 'Calculatrice' },
  { name: 'NumberOutlined', category: 'data', description: 'Numéro' },
  { name: 'PercentageOutlined', category: 'data', description: 'Pourcentage' }
];

async function populateIcons() {
  try {
    console.log('🎨 [POPULATE-ICONS] Démarrage du peuplement des icônes...');
    
    // Vérifier si des icônes existent déjà
    const existingIcons = await prisma.icon.findMany();
    console.log(`📊 [POPULATE-ICONS] ${existingIcons.length} icônes existantes trouvées`);
    
    if (existingIcons.length > 0) {
      console.log('⚠️  [POPULATE-ICONS] Des icônes existent déjà. Suppression pour recréer...');
      await prisma.icon.deleteMany();
    }

    // Créer toutes les icônes
    let createdCount = 0;
    for (const icon of iconData) {
      try {
        await prisma.icon.create({
          data: {
            id: `icon_${icon.name.toLowerCase().replace('outlined', '')}`,
            name: icon.name,
            category: icon.category,
            description: icon.description,
            tags: [icon.category, icon.name.toLowerCase()],
            active: true
          }
        });
        createdCount++;
      } catch (error) {
        console.error(`❌ Erreur lors de la création de l'icône ${icon.name}:`, error.message);
      }
    }

    console.log(`✅ [POPULATE-ICONS] ${createdCount} icônes créées avec succès !`);
    
    // Afficher le résumé par catégorie
    const summary = await prisma.icon.groupBy({
      by: ['category'],
      _count: { id: true },
      orderBy: { category: 'asc' }
    });
    
    console.log('\n📋 [POPULATE-ICONS] Résumé par catégorie:');
    summary.forEach(cat => {
      console.log(`   - ${cat.category}: ${cat._count.id} icônes`);
    });
    
    console.log(`\n🎉 [POPULATE-ICONS] Total: ${createdCount} icônes disponibles dans le système !`);

  } catch (error) {
    console.error('❌ [POPULATE-ICONS] Erreur lors du peuplement:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateIcons();
