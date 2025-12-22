// Templates de documents pré-configurés avec designs professionnels

export const PRESET_TEMPLATES = [
  {
    name: 'Devis Commercial Moderne',
    description: 'Design épuré et professionnel pour devis commerciaux',
    theme: {
      primaryColor: '#1890ff',
      secondaryColor: '#52c41a',
      textColor: '#262626',
      backgroundColor: '#ffffff',
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: 11
    },
    sections: [
      {
        type: 'COVER_PAGE',
        order: 0,
        config: {
          title: { fr: 'Proposition Commerciale', nl: 'Commercieel Voorstel', de: 'Geschäftsvorschlag', en: 'Commercial Proposal' },
          subtitle: 'Solutions sur mesure pour votre entreprise',
          logoPosition: 'top-left',
          showDate: true,
          layout: 'text-image'
        }
      },
      {
        type: 'COMPANY_PRESENTATION',
        order: 1,
        config: {
          sectionTitle: 'À propos de nous',
          description: { 
            fr: 'Notre entreprise accompagne les professionnels depuis plus de 10 ans dans leur transformation digitale.' 
          },
          layout: 'two-columns',
          showStats: true,
          statsData: JSON.stringify([
            { label: 'Années d\'expérience', value: '10+' },
            { label: 'Projets réussis', value: '200+' },
            { label: 'Clients satisfaits', value: '150+' }
          ])
        }
      },
      {
        type: 'PROJECT_SUMMARY',
        order: 2,
        config: {
          sectionTitle: 'Résumé du projet',
          projectDescription: { 
            fr: 'Votre projet décrit ici...' 
          },
          showObjectives: true,
          showDeliverables: true
        }
      },
      {
        type: 'PRICING_TABLE',
        order: 3,
        config: {
          sectionTitle: 'Tarification',
          currency: 'EUR',
          showTax: true,
          taxRate: 21,
          tableStyle: 'striped'
        }
      },
      {
        type: 'TERMS_CONDITIONS',
        order: 4,
        config: {
          sectionTitle: 'Conditions générales',
          content: { 
            fr: 'Les conditions générales de vente s\'appliquent...' 
          },
          showPaymentTerms: true,
          paymentTerms: '30 jours nets'
        }
      },
      {
        type: 'SIGNATURE_BLOCK',
        order: 5,
        config: {
          sectionTitle: 'Signatures',
          showDate: true,
          showCompanyInfo: true,
          twoColumn: true
        }
      }
    ]
  },
  {
    name: 'Présentation Projet Creative',
    description: 'Design dynamique pour projets créatifs et agences',
    theme: {
      primaryColor: '#722ed1',
      secondaryColor: '#fa8c16',
      textColor: '#262626',
      backgroundColor: '#ffffff',
      fontFamily: 'Montserrat, Arial, sans-serif',
      fontSize: 11
    },
    sections: [
      {
        type: 'COVER_PAGE',
        order: 0,
        config: {
          title: { fr: 'Projet Créatif', nl: 'Creatief Project', de: 'Kreatives Projekt', en: 'Creative Project' },
          subtitle: 'Des idées qui font la différence',
          logoPosition: 'top-center',
          showDate: true
        }
      },
      {
        type: 'TEAM_PRESENTATION',
        order: 1,
        config: {
          sectionTitle: 'Notre Équipe',
          layout: 'grid',
          showPhotos: true
        }
      },
      {
        type: 'PORTFOLIO',
        order: 2,
        config: {
          sectionTitle: 'Nos Réalisations',
          layout: 'masonry',
          showCaptions: true
        }
      },
      {
        type: 'TESTIMONIALS',
        order: 3,
        config: {
          sectionTitle: 'Témoignages Clients',
          layout: 'carousel',
          showRatings: true
        }
      },
      {
        type: 'CONTACT_INFO',
        order: 4,
        config: {
          sectionTitle: 'Contactez-nous',
          showMap: true,
          showSocial: true
        }
      }
    ]
  },
  {
    name: 'Contrat Technique',
    description: 'Format sobre et structuré pour contrats techniques',
    theme: {
      primaryColor: '#262626',
      secondaryColor: '#595959',
      textColor: '#000000',
      backgroundColor: '#ffffff',
      fontFamily: 'Times New Roman, serif',
      fontSize: 12
    },
    sections: [
      {
        type: 'COVER_PAGE',
        order: 0,
        config: {
          title: { fr: 'Contrat de Prestation', nl: 'Dienstenovereenkomst', de: 'Dienstleistungsvertrag', en: 'Service Agreement' },
          subtitle: 'Entre les parties soussignées',
          logoPosition: 'top-left',
          showDate: true,
          layout: 'text-only'
        }
      },
      {
        type: 'TECHNICAL_SPECS',
        order: 1,
        config: {
          sectionTitle: 'Spécifications Techniques',
          showRequirements: true,
          showConstraints: true,
          tableFormat: 'detailed'
        }
      },
      {
        type: 'TIMELINE',
        order: 2,
        config: {
          sectionTitle: 'Planning Prévisionnel',
          viewType: 'gantt',
          showMilestones: true
        }
      },
      {
        type: 'TERMS_CONDITIONS',
        order: 3,
        config: {
          sectionTitle: 'Conditions Contractuelles',
          content: { 
            fr: 'Article 1 - Objet du contrat...' 
          },
          showPaymentTerms: true,
          paymentTerms: 'Paiement échelonné sur validation des jalons'
        }
      },
      {
        type: 'SIGNATURE_BLOCK',
        order: 4,
        config: {
          sectionTitle: 'Signatures',
          showDate: true,
          showCompanyInfo: true,
          twoColumn: true,
          requireWitness: true
        }
      }
    ]
  },
  {
    name: 'Facture Professionnelle',
    description: 'Template optimisé pour facturation',
    theme: {
      primaryColor: '#52c41a',
      secondaryColor: '#1890ff',
      textColor: '#262626',
      backgroundColor: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: 10
    },
    sections: [
      {
        type: 'COVER_PAGE',
        order: 0,
        config: {
          title: { fr: 'Facture', nl: 'Factuur', de: 'Rechnung', en: 'Invoice' },
          subtitle: 'Merci pour votre confiance',
          logoPosition: 'top-left',
          showDate: true,
          layout: 'text-only'
        }
      },
      {
        type: 'CONTACT_INFO',
        order: 1,
        config: {
          sectionTitle: 'Informations Client',
          layout: 'compact',
          showMap: false
        }
      },
      {
        type: 'PRICING_TABLE',
        order: 2,
        config: {
          sectionTitle: 'Détail des Prestations',
          currency: 'EUR',
          showTax: true,
          taxRate: 21,
          tableStyle: 'detailed',
          showQuantity: true,
          showUnitPrice: true
        }
      },
      {
        type: 'TERMS_CONDITIONS',
        order: 3,
        config: {
          sectionTitle: 'Conditions de Paiement',
          content: { 
            fr: 'Paiement à réception de facture par virement bancaire.' 
          },
          showPaymentTerms: true,
          paymentTerms: 'À réception'
        }
      }
    ]
  }
];

export default PRESET_TEMPLATES;
