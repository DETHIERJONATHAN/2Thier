// Traductions et descriptions détaillées des permissions
export const PERMISSIONS_TRANSLATIONS = {
  // Actions principales
  actions: {
    view: {
      label: 'Consulter',
      description: 'Permet de lire et consulter les données sans possibilité de modification',
      details: 'L\'utilisateur peut voir les informations, générer des rapports et exporter des données en lecture seule.'
    },
    create: {
      label: 'Créer',
      description: 'Permet d\'ajouter de nouveaux éléments au système',
      details: 'L\'utilisateur peut créer de nouvelles entrées, saisir des données et initialiser de nouveaux enregistrements.'
    },
    edit: {
      label: 'Modifier',
      description: 'Permet de modifier les éléments existants',
      details: 'L\'utilisateur peut mettre à jour, corriger et modifier les données existantes dans le système.'
    },
    delete: {
      label: 'Supprimer',
      description: 'Permet de supprimer définitivement des éléments',
      details: 'L\'utilisateur peut supprimer des enregistrements. Cette action est souvent irréversible et nécessite des précautions.'
    },
    manage: {
      label: 'Gérer',
      description: 'Permissions complètes de gestion et d\'administration',
      details: 'L\'utilisateur dispose de tous les droits sur ce module : consultation, création, modification, suppression et configuration avancée.'
    }
  },

  // Modules spécifiques avec leurs traductions
  modules: {
    // CRM
    leads: {
      name: 'Prospects',
      description: 'Gestion des prospects et opportunités commerciales',
      actions: {
        view: 'Consulter la liste des prospects, voir leurs informations et historiques',
        create: 'Ajouter de nouveaux prospects et saisir leurs informations',
        edit: 'Modifier les informations des prospects, changer leur statut',
        delete: 'Supprimer des prospects de la base de données',
        manage: 'Configuration complète : statuts, étapes de vente, attribution automatique'
      }
    },
    
    contacts: {
      name: 'Contacts',
      description: 'Carnet d\'adresses et gestion des contacts',
      actions: {
        view: 'Consulter les contacts, voir leurs coordonnées et interactions',
        create: 'Ajouter de nouveaux contacts avec leurs informations détaillées',
        edit: 'Modifier les coordonnées, notes et catégories des contacts',
        delete: 'Supprimer définitivement des contacts du système',
        manage: 'Gestion des catégories, import/export, fusion de doublons'
      }
    },

    organizations: {
      name: 'Organisations',
      description: 'Gestion des entreprises et entités organisationnelles',
      actions: {
        view: 'Consulter les informations des organisations et leurs structures',
        create: 'Créer de nouvelles organisations avec leur hiérarchie',
        edit: 'Modifier les détails, adresses et configurations des organisations',
        delete: 'Supprimer des organisations (attention aux données liées)',
        manage: 'Configuration complète : modules, utilisateurs, paramètres avancés'
      }
    },

    // Utilisateurs et sécurité
    users: {
      name: 'Utilisateurs',
      description: 'Gestion des comptes utilisateurs et accès',
      actions: {
        view: 'Consulter la liste des utilisateurs et leurs profils',
        create: 'Créer de nouveaux comptes utilisateurs avec leurs accès',
        edit: 'Modifier les profils, rôles et statuts des utilisateurs',
        delete: 'Désactiver ou supprimer des comptes utilisateurs',
        manage: 'Gestion complète : rôles, permissions, authentification'
      }
    },

    roles: {
      name: 'Rôles',
      description: 'Définition des rôles et niveaux d\'accès',
      actions: {
        view: 'Consulter les rôles existants et leurs permissions',
        create: 'Créer de nouveaux rôles avec leurs définitions',
        edit: 'Modifier les permissions et attributions des rôles',
        delete: 'Supprimer des rôles (vérifier les utilisateurs associés)',
        manage: 'Configuration avancée des hiérarchies et héritages de rôles'
      }
    },

    permissions: {
      name: 'Permissions',
      description: 'Contrôle d\'accès granulaire aux fonctionnalités',
      actions: {
        view: 'Consulter la matrice des permissions par rôle',
        create: 'Définir de nouvelles permissions spécifiques',
        edit: 'Modifier les autorisations et restrictions d\'accès',
        delete: 'Supprimer des permissions personnalisées',
        manage: 'Configuration système complète des droits d\'accès'
      }
    },

    // Modules fonctionnels
    calendar: {
      name: 'Agenda',
      description: 'Planification et gestion des événements',
      actions: {
        view: 'Consulter les agendas et événements planifiés',
        create: 'Créer de nouveaux événements et rendez-vous',
        edit: 'Modifier les détails des événements existants',
        delete: 'Supprimer des événements de l\'agenda',
        manage: 'Configuration : calendriers partagés, notifications, synchronisation'
      }
    },

    notifications: {
      name: 'Notifications',
      description: 'Système d\'alertes et communications',
      actions: {
        view: 'Consulter les notifications reçues et leur historique',
        create: 'Envoyer de nouvelles notifications aux utilisateurs',
        edit: 'Modifier le contenu et paramètres des notifications',
        delete: 'Supprimer des notifications du système',
        manage: 'Configuration : règles automatiques, canaux, modèles'
      }
    },

    gmail: {
      name: 'Gmail',
      description: 'Intégration et gestion des emails Gmail',
      actions: {
        view: 'Consulter les emails et conversations Gmail liés',
        create: 'Envoyer de nouveaux emails via l\'intégration Gmail',
        edit: 'Modifier les brouillons et paramètres d\'emails',
        delete: 'Supprimer des emails ou conversations',
        manage: 'Configuration complète : comptes, synchronisation, règles'
      }
    },

    google_workspace: {
      name: 'Google Workspace',
      description: 'Intégration complète avec Google Workspace',
      actions: {
        view: 'Consulter les données synchronisées de Google Workspace',
        create: 'Créer du contenu via les outils Google (Drive, Docs, etc.)',
        edit: 'Modifier les configurations et synchronisations',
        delete: 'Supprimer les liaisons et données synchronisées',
        manage: 'Administration complète : domaines, utilisateurs, sécurité'
      }
    },

    // Administration
    modules: {
      name: 'Modules',
      description: 'Gestion des modules et fonctionnalités du système',
      actions: {
        view: 'Consulter la liste des modules disponibles et leur statut',
        create: 'Activer de nouveaux modules dans l\'organisation',
        edit: 'Configurer les paramètres des modules existants',
        delete: 'Désactiver ou supprimer des modules',
        manage: 'Administration complète : installation, mise à jour, dépendances'
      }
    },

    admin_panel: {
      name: 'Panneau d\'administration',
      description: 'Accès aux outils d\'administration système',
      actions: {
        view: 'Consulter les statistiques et rapports d\'administration',
        create: 'Initier des tâches administratives et configurations',
        edit: 'Modifier les paramètres système et configurations',
        delete: 'Supprimer des configurations ou réinitialiser des paramètres',
        manage: 'Contrôle total du système : maintenance, sécurité, performance'
      }
    },

    // Modules métier spécifiques
    forms: {
      name: 'Formulaires',
      description: 'Création et gestion de formulaires dynamiques',
      actions: {
        view: 'Consulter les formulaires créés et leurs réponses',
        create: 'Créer de nouveaux formulaires avec leurs champs',
        edit: 'Modifier la structure et validation des formulaires',
        delete: 'Supprimer des formulaires et leurs données',
        manage: 'Configuration avancée : logique conditionnelle, intégrations'
      }
    },

    sav: {
      name: 'Service Après-Vente',
      description: 'Gestion du support client et des tickets',
      actions: {
        view: 'Consulter les tickets de support et leur progression',
        create: 'Créer de nouveaux tickets et demandes de support',
        edit: 'Modifier le statut et réponses des tickets',
        delete: 'Fermer définitivement des tickets résolus',
        manage: 'Configuration : workflow, escalade, SLA, équipes'
      }
    },

    // Intégrations
    external_apis: {
      name: 'APIs Externes',
      description: 'Gestion des intégrations avec des services tiers',
      actions: {
        view: 'Consulter les configurations et statuts des APIs',
        create: 'Configurer de nouvelles intégrations API',
        edit: 'Modifier les paramètres de connexion et mapping',
        delete: 'Supprimer des intégrations non utilisées',
        manage: 'Administration complète : clés API, sécurité, monitoring'
      }
    }
  },

  // Messages d'aide contextuelle
  help: {
    general: 'Les permissions définissent ce qu\'un utilisateur peut faire dans chaque module du système.',
    hierarchical: 'Les permissions sont hiérarchiques : "Gérer" inclut toutes les autres permissions.',
    caution: 'Soyez prudent avec les permissions "Supprimer" et "Gérer" car elles donnent des accès étendus.',
    organization: 'Ces permissions s\'appliquent uniquement à l\'organisation sélectionnée.',
    inheritance: 'Les super-administrateurs ont automatiquement toutes les permissions.'
  }
};

// Types pour la validation
export type ActionKey = keyof typeof PERMISSIONS_TRANSLATIONS.actions;
export type ModuleKey = keyof typeof PERMISSIONS_TRANSLATIONS.modules;

// Fonction utilitaire pour obtenir la traduction d'une action
export const getActionTranslation = (action: string) => {
  return PERMISSIONS_TRANSLATIONS.actions[action as ActionKey] || {
    label: action,
    description: 'Permission personnalisée',
    details: 'Cette permission a été définie spécifiquement pour votre organisation.'
  };
};

// Fonction utilitaire pour obtenir la traduction d'un module
export const getModuleTranslation = (moduleKey: string) => {
  return PERMISSIONS_TRANSLATIONS.modules[moduleKey as ModuleKey] || {
    name: moduleKey,
    description: 'Module personnalisé',
    actions: {}
  };
};
