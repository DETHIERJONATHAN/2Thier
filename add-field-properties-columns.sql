-- Migration pour ajouter TOUTES les colonnes de propriétés des champs
-- Basé sur l'interface TreeBranchLeaf - Colonne de droite

-- =====================================
-- PROPRIÉTÉS DE BASE DU CHAMP
-- =====================================

ALTER TABLE tree_nodes ADD COLUMN field_type VARCHAR(50) DEFAULT 'TEXT';
ALTER TABLE tree_nodes ADD COLUMN field_label VARCHAR(255);
ALTER TABLE tree_nodes ADD COLUMN field_description TEXT;

-- =====================================
-- APPARENCE (ASPECT) DU CHAMP
-- =====================================

-- Taille du champ
ALTER TABLE tree_nodes ADD COLUMN appearance_size ENUM('small', 'medium', 'large') DEFAULT 'medium';

-- Configuration texte
ALTER TABLE tree_nodes ADD COLUMN appearance_placeholder VARCHAR(255);
ALTER TABLE tree_nodes ADD COLUMN appearance_max_length INT;
ALTER TABLE tree_nodes ADD COLUMN appearance_mask VARCHAR(100);
ALTER TABLE tree_nodes ADD COLUMN appearance_regex VARCHAR(500);

-- Configuration visuelle
ALTER TABLE tree_nodes ADD COLUMN appearance_width VARCHAR(50);
ALTER TABLE tree_nodes ADD COLUMN appearance_variant VARCHAR(50);

-- =====================================
-- CAPACITÉS (FONCTIONNALITÉS)
-- =====================================

-- Capacités principales
ALTER TABLE tree_nodes ADD COLUMN capability_data BOOLEAN DEFAULT FALSE;
ALTER TABLE tree_nodes ADD COLUMN capability_formula BOOLEAN DEFAULT FALSE;
ALTER TABLE tree_nodes ADD COLUMN capability_conditions BOOLEAN DEFAULT FALSE;
ALTER TABLE tree_nodes ADD COLUMN capability_tableau BOOLEAN DEFAULT FALSE;

-- Capacités avancées
ALTER TABLE tree_nodes ADD COLUMN capability_api BOOLEAN DEFAULT FALSE;
ALTER TABLE tree_nodes ADD COLUMN capability_link BOOLEAN DEFAULT FALSE;
ALTER TABLE tree_nodes ADD COLUMN capability_markers BOOLEAN DEFAULT FALSE;

-- =====================================
-- CONFIGURATIONS AVANCÉES (JSON pour flexibilité)
-- =====================================

-- Configuration spécifique par type de champ (pour les options SELECT, etc.)
ALTER TABLE tree_nodes ADD COLUMN field_config JSON;

-- Configuration des capacités avancées
ALTER TABLE tree_nodes ADD COLUMN capability_config JSON;

-- =====================================
-- INDEX POUR PERFORMANCE
-- =====================================

CREATE INDEX idx_tree_nodes_field_type ON tree_nodes(field_type);
CREATE INDEX idx_tree_nodes_capabilities ON tree_nodes(capability_data, capability_formula, capability_conditions);

-- =====================================
-- COMMENTAIRES POUR DOCUMENTATION
-- =====================================

ALTER TABLE tree_nodes 
MODIFY COLUMN field_type VARCHAR(50) COMMENT 'Type de champ: TEXT, NUMBER, BOOL, SELECT, DATE, IMAGE, FILE',
MODIFY COLUMN appearance_size ENUM('small', 'medium', 'large') COMMENT 'Taille visuelle du champ',
MODIFY COLUMN capability_data BOOLEAN COMMENT 'Capacité: Gestion des données',
MODIFY COLUMN capability_formula BOOLEAN COMMENT 'Capacité: Formules calculées',
MODIFY COLUMN capability_conditions BOOLEAN COMMENT 'Capacité: Conditions logiques',
MODIFY COLUMN capability_tableau BOOLEAN COMMENT 'Capacité: Intégration tableau',
MODIFY COLUMN capability_api BOOLEAN COMMENT 'Capacité: Intégration API',
MODIFY COLUMN capability_link BOOLEAN COMMENT 'Capacité: Liens vers autres champs',
MODIFY COLUMN capability_markers BOOLEAN COMMENT 'Capacité: Marqueurs et tags';
