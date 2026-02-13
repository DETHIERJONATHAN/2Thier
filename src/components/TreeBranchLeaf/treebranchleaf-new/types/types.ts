// La définition des secteurs est maintenant dynamique et provient des données de l'arbre TBL.

export interface Lead {
    name: string;
    email: string;
    phone: string;
    address: string;
}

export interface Answers {
    typeClient: "particulier" | "entreprise" | "autre";
    tva: string;
    budget?: number;
    surface?: number;
    orientation: "sud" | "est" | "ouest" | "nord";
    inclinaison?: number;
    toitureType: "tuiles" | "ardoises" | "bacacier";
    images: File[];
    // Les clés ici seront les ID des noeuds de branche (secteurs)
    include: Record<string, boolean>;
}

// --- Structures de données basées sur l'analyse de TreeBranchLeaf ---

/**
 * Représente un marqueur qui peut être attaché à un noeud (ex: "Type:Secteur").
 */
export interface TblMarker {
    id: string;
    name: string;
}

/**
 * Représente une variable exposée (ex: @budget).
 */
export interface TblVariable {
    id: string;
    exposedKey: string; // La clé utilisable comme @budget
    nodeId: string;     // Le noeud qui fournit la valeur
}

/**
 * Représente un noeud dans l'arbre (peut être une branche ou une feuille).
 * C'est la structure de base pour les secteurs et les champs.
 */
export interface TblNode {
    id: string;
    parentId?: string | null;
    title: string;
    subtitle?: string | null;
    type: 'GROUP' | 'LEAF'; // GROUP = Branche/Titre, LEAF = Champ/Question
    leafType?: 'OPTION' | 'FIELD' | 'OPTION_FIELD' | null; // O, C, O+C
    order?: number; // pour trier l'affichage

    // Configuration du champ (si c'est une feuille)
    fieldConfig?: TblFieldConfig | null;

    // Logique conditionnelle pour l'affichage
    conditionConfig?: JsonObject | null; // structure libre de règles

    // Formule pour les calculs
    formulaConfig?: JsonObject | null; // tokens/AST/formule

    // Relations
    markers: TblMarker[];
    children: TblNode[];
    // Metadata libre (copié depuis TreeBranchLeaf API) — utilisé pour étendre localement
    metadata?: JsonObject | null;

    // 📦 Filtrage par Produit : visibilité conditionnelle
    hasProduct?: boolean;
    product_sourceNodeId?: string | null;
    product_visibleFor?: string[] | null;
    product_options?: Array<{ value: string; label: string }> | null;
}

/**
 * Configuration détaillée pour un champ (Leaf).
 */
export interface TblFieldConfig {
    id: string;
    fieldType: 'TEXT' | 'NUMBER' | 'SELECT' | 'CHECKBOX' | 'DATE';
    /** true = multiselect (Ant Design Select mode="multiple") */
    multiple?: boolean;
    // Configurations spécifiques par type
    numberConfig?: {
        min?: number;
        max?: number;
        step?: number;
        defaultValue?: number;
    ui?: 'slider' | 'input';
    } | null;
    textConfig?: {
        defaultValue?: string;
        placeholder?: string;
    } | null;
    selectConfig?: {
        options: { label: string; value: string; }[];
        defaultValue?: string;
    } | null;
}


/**
 * Représente l'arbre complet récupéré depuis l'API.
 */
export interface TblTree {
    id: string;
    name: string;
    nodes: TblNode[];
    variables: TblVariable[];
}

// Type utilitaire JSON générique (immutable, non circulaire)
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue }
export type JsonArray = JsonValue[];

// Type simple pour représenter un onglet dynamique dérivé de l'arbre
export interface TblTab {
    key: string;   // id du noeud de branche
    label: string; // titre affiché
}
