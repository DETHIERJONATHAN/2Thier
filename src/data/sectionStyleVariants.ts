// Configuration des variantes visuelles pour chaque type de section

export const SECTION_STYLE_VARIANTS = {
  COVER_PAGE: [
    { value: 'modern', label: '✨ Modern', description: 'Design épuré avec dégradés' },
    { value: 'classic', label: '📜 Classic', description: 'Style traditionnel élégant' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Ultra-simple et sobre' },
    { value: 'bold', label: '💪 Bold', description: 'Fort impact visuel' },
    { value: 'corporate', label: '🏢 Corporate', description: 'Professionnel strict' },
    { value: 'creative', label: '🎨 Creative', description: 'Coloré et original' }
  ],
  
  COMPANY_PRESENTATION: [
    { value: 'modern', label: '✨ Modern', description: 'Cards avec stats' },
    { value: 'classic', label: '📜 Classic', description: 'Paragraphes élégants' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Texte simple' },
    { value: 'bold', label: '💪 Bold', description: 'Grande image dominante' },
    { value: 'timeline', label: '📅 Timeline', description: 'Histoire chronologique' },
    { value: 'infographic', label: '📊 Infographic', description: 'Données visuelles' }
  ],
  
  PRICING_TABLE: [
    { value: 'modern', label: '✨ Modern', description: 'Table avec ombres et arrondis' },
    { value: 'classic', label: '📜 Classic', description: 'Tableau traditionnel' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Lignes simples' },
    { value: 'striped', label: '🦓 Striped', description: 'Lignes alternées' },
    { value: 'boxed', label: '📦 Boxed', description: 'Cases séparées' },
    { value: 'gradient', label: '🌈 Gradient', description: 'Dégradés de couleurs' }
  ],
  
  SIGNATURE_BLOCK: [
    { value: 'modern', label: '✨ Modern', description: '2 colonnes élégantes' },
    { value: 'classic', label: '📜 Classic', description: 'Style juridique formel' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Signatures simples' },
    { value: 'bold', label: '💪 Bold', description: 'Cadres épais' },
    { value: 'side-by-side', label: '↔️ Side-by-side', description: 'Côte à côte compact' },
    { value: 'stacked', label: '⬇️ Stacked', description: 'Empilées vertical' }
  ],
  
  TERMS_CONDITIONS: [
    { value: 'modern', label: '✨ Modern', description: '2 colonnes avec numéros' },
    { value: 'classic', label: '📜 Classic', description: 'Liste numérotée classique' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Texte continu' },
    { value: 'accordion', label: '📑 Accordion', description: 'Titres repliables' },
    { value: 'cards', label: '🗂️ Cards', description: 'Articles en cartes' },
    { value: 'timeline', label: '📅 Timeline', description: 'Chronologie verticale' }
  ],
  
  CONTACT_INFO: [
    { value: 'modern', label: '✨ Modern', description: 'Cards colorées' },
    { value: 'classic', label: '📜 Classic', description: 'Liste simple' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Texte brut' },
    { value: 'vcard', label: '📇 VCard', description: 'Style carte visite' },
    { value: 'map-style', label: '🗺️ Map', description: 'Avec icône carte' },
    { value: 'social-focus', label: '📱 Social', description: 'Focus réseaux sociaux' }
  ],
  
  TIMELINE: [
    { value: 'modern', label: '✨ Modern', description: 'Timeline verticale avec icônes' },
    { value: 'classic', label: '📜 Classic', description: 'Liste chronologique' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Dates simples' },
    { value: 'horizontal', label: '↔️ Horizontal', description: 'Frise horizontale' },
    { value: 'gantt', label: '📊 Gantt', description: 'Diagramme de Gantt' },
    { value: 'milestones', label: '🎯 Milestones', description: 'Jalons importants' }
  ],
  
  TECHNICAL_SPECS: [
    { value: 'modern', label: '✨ Modern', description: 'Table technique pro' },
    { value: 'classic', label: '📜 Classic', description: 'Spécs traditionnelles' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Liste simple' },
    { value: 'datasheet', label: '📄 Datasheet', description: 'Fiche technique' },
    { value: 'comparison', label: '⚖️ Comparison', description: 'Tableau comparatif' },
    { value: 'icons', label: '🎯 Icons', description: 'Avec icônes visuelles' }
  ],
  
  TESTIMONIALS: [
    { value: 'modern', label: '✨ Modern', description: 'Cards avec photos' },
    { value: 'classic', label: '📜 Classic', description: 'Citations élégantes' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Texte simple' },
    { value: 'grid', label: '📐 Grid', description: 'Grille de témoignages' },
    { value: 'carousel', label: '🎠 Carousel', description: 'Défilement visuel' },
    { value: 'quotes', label: '💬 Quotes', description: 'Grandes citations' }
  ],
  
  PORTFOLIO: [
    { value: 'modern', label: '✨ Modern', description: 'Galerie masonry' },
    { value: 'classic', label: '📜 Classic', description: 'Grille régulière' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Images simples' },
    { value: 'showcase', label: '🖼️ Showcase', description: 'Grandes images' },
    { value: 'grid-4', label: '⊞ Grid 4', description: 'Grille 4 colonnes' },
    { value: 'alternating', label: '↔️ Alternating', description: 'Alternance gauche/droite' }
  ],
  
  TEAM_PRESENTATION: [
    { value: 'modern', label: '✨ Modern', description: 'Cards membres' },
    { value: 'classic', label: '📜 Classic', description: 'Photos + bio' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Liste simple' },
    { value: 'circle-photos', label: '⭕ Circles', description: 'Photos rondes' },
    { value: 'org-chart', label: '🌳 Org Chart', description: 'Organigramme' },
    { value: 'compact', label: '📦 Compact', description: 'Version condensée' }
  ],
  
  FAQ: [
    { value: 'modern', label: '✨ Modern', description: 'Accordion styled' },
    { value: 'classic', label: '📜 Classic', description: 'Q&A traditionnel' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Liste simple' },
    { value: 'two-columns', label: '↔️ 2 Columns', description: '2 colonnes' },
    { value: 'numbered', label: '🔢 Numbered', description: 'Numérotées' },
    { value: 'categories', label: '📑 Categories', description: 'Par catégories' }
  ],
  
  PROJECT_SUMMARY: [
    { value: 'modern', label: '✨ Modern', description: 'Overview blocks' },
    { value: 'classic', label: '📜 Classic', description: 'Résumé classique' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Texte simple' },
    { value: 'dashboard', label: '📊 Dashboard', description: 'Style tableau de bord' },
    { value: 'timeline', label: '📅 Timeline', description: 'Chronologie projet' },
    { value: 'metrics', label: '📈 Metrics', description: 'Focus métriques' }
  ],
  
  CUSTOM_HTML: [
    { value: 'modern', label: '✨ Modern', description: 'Container styled' },
    { value: 'classic', label: '📜 Classic', description: 'Frame simple' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Sans décoration' },
    { value: 'boxed', label: '📦 Boxed', description: 'Dans cadre' },
    { value: 'fullwidth', label: '↔️ Full', description: 'Pleine largeur' },
    { value: 'centered', label: '⊙ Centered', description: 'Centré' }
  ],
  
  CALENDAR: [
    { value: 'modern', label: '✨ Modern', description: 'Calendrier interactif' },
    { value: 'classic', label: '📜 Classic', description: 'Table calendrier' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Liste dates' },
    { value: 'month-view', label: '📅 Month', description: 'Vue mensuelle' },
    { value: 'week-view', label: '📆 Week', description: 'Vue hebdomadaire' },
    { value: 'timeline', label: '📊 Timeline', description: 'Timeline événements' }
  ]
};

// Obtenir les variantes pour un type de section
export const getVariantsForSection = (sectionType: string) => {
  return SECTION_STYLE_VARIANTS[sectionType as keyof typeof SECTION_STYLE_VARIANTS] || [
    { value: 'modern', label: '✨ Modern', description: 'Style moderne' },
    { value: 'classic', label: '📜 Classic', description: 'Style classique' },
    { value: 'minimal', label: '⚪ Minimal', description: 'Style minimal' }
  ];
};
