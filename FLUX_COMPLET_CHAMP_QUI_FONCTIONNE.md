## 🎯 FLUX COMPLET DU CHAMP QUI FONCTIONNE
### Champ: `10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e` ("Prix Kw/h test")

```
🗃️ BASE DE DONNÉES
==================
┌─ TreeBranchLeafNode ─────────────────────────────────────┐
│ ID: 10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e                │
│ label: "Prix Kw/h test"                                  │
│ type: "leaf_field"                                       │
│ tbl_capacity: 2 ⭐ (CRITIQUE - inclut dans TBL)         │
│ hasFormula: true                                         │
│ hasCondition: true                                       │
│ hasData: true                                            │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─ TreeBranchLeafNodeVariable ─────────────────────────────┐
│ ID: 3b276dfb-9c41-4c94-9c72-41e7c345922b                │
│ nodeId: 10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e            │
│ exposedKey: "field_10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e"│
│ sourceRef: "condition:ff05cc48-27ec-4d94-8975-30a0f9c..." │ ⭐ CRITIQUE
│ sourceType: "tree"                                       │
│ visibleToUser: true                                      │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─ TreeBranchLeafNodeCondition ────────────────────────────┐
│ ID: ff05cc48-27ec-4d94-8975-30a0f9c1c275                │
│ nodeId: 10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e            │
│ condition: [formule de calcul]                           │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─ TreeBranchLeafNodeFormula ──────────────────────────────┐
│ ID: 7097ff9b-974a-4fb3-80d8-49634a634efc                │
│ nodeId: 10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e            │
│ formula: [expression mathématique]                       │
└──────────────────────────────────────────────────────────┘

🌐 FLUX DES APIS
================
1️⃣ /api/treebranchleaf/trees/.../nodes (GET)
    │ → Récupère la structure du nœud
    ▼
2️⃣ /api/treebranchleaf/trees/.../nodes/10bfb6d2.../data (GET)
    │ → Récupère les données spécifiques du champ
    ▼
3️⃣ /api/treebranchleaf/conditions/ff05cc48... (GET)
    │ → Récupère la condition référencée par sourceRef
    ▼
4️⃣ /api/treebranchleaf/formulas/7097ff9b... (GET)
    │ → Récupère la formule associée
    ▼
5️⃣ /api/tbl/evaluate (POST)
    │ → Évalue dynamiquement les expressions
    ▼

🔄 TRAITEMENT FRONTEND
======================
                    🎯 useTBLDataPrismaComplete
                    ┌─────────────────────────────┐
                    │ 1. Détecte tbl_capacity = 2│
                    │ 2. Inclut le champ dans TBL │
                    │ 3. Construit capabilities   │
                    └─────────────────────────────┘
                                │
                                ▼
                    🎨 TBLSectionRenderer
                    ┌─────────────────────────────┐
                    │ 1. Section "Données" détectée│
                    │ 2. isDataSection: true      │
                    │ 3. Analyse field.capabilities│
                    └─────────────────────────────┘
                                │
                                ▼
                    🧠 Traducteur sourceRef
                    ┌─────────────────────────────┐
                    │ 1. Lit sourceRef de Variable│
                    │ 2. Type: "condition:..."    │
                    │ 3. Lance évaluation dynamique│
                    └─────────────────────────────┘
                                │
                                ▼

🪞 SYSTÈME DE MIRRORS
=====================
                    📊 Mirrors de DONNÉES
                    ┌─────────────────────────────┐
                    │ __mirror_data_Prix Kw/h test│
                    │ __mirror_data_Prix Kw h test│ (variants)
                    │ __mirror_data_prix kw h test│
                    │ __mirror_data_PrixKwhtest   │
                    └─────────────────────────────┘
                                │
                    🧮 Mirrors de FORMULES      │
                    ┌─────────────────────────────┐
                    │ __mirror_formula_10bfb6d2...│
                    │ __mirror_formula_Prix Kw/h..│
                    │ + variants automatiques     │
                    └─────────────────────────────┘
                                │
                    🔀 Mirrors de CONDITIONS    │
                    ┌─────────────────────────────┐
                    │ __mirror_condition_10bfb6d2.│
                    │ __mirror_condition_Prix Kw/h│
                    │ + variants automatiques     │
                    └─────────────────────────────┘

🎯 RÉSULTAT FINAL
=================
                    🎴 SmartCalculatedField
                    ┌─────────────────────────────┐
                    │ ✅ Affiché correctement    │
                    │ ✅ Calculs fonctionnels    │
                    │ ✅ Taux de succès: 100%    │
                    │ ✅ 1/1 champs détectés     │
                    └─────────────────────────────┘

⭐ FACTEURS CRITIQUES DE SUCCÈS
===============================
1. ✅ tbl_capacity = 2 (pas null)
2. ✅ TreeBranchLeafNodeVariable existe
3. ✅ Variable.sourceRef = "condition:ff05cc48..."
4. ✅ Variable.sourceType = "tree"
5. ✅ Condition ff05cc48... existe et est valide
6. ✅ Formule 7097ff9b... existe et est valide
7. ✅ APIs répondent toutes 200 OK
8. ✅ Système de mirrors fonctionnel
9. ✅ TBLSectionRenderer détecte les capacités
10. ✅ Évaluation dynamique réussie

🔍 POINTS CLÉS D'ANALYSE
========================
- Le sourceRef dans la Variable est LA CLÉ du système
- Il DOIT pointer vers une condition/formule existante
- Le format "condition:ID" est critique
- tbl_capacity = 2 active l'inclusion TBL
- Le système de mirrors est entièrement automatique
- Chaque étape dépend de la précédente

🎯 POUR RÉPLIQUER LE SUCCÈS
===========================
Tout autre champ DOIT avoir EXACTEMENT:
1. tbl_capacity = 2
2. Une TreeBranchLeafNodeVariable
3. Variable.sourceRef pointant vers condition/formule valide
4. Condition/Formule existante dans la BDD
5. APIs fonctionnelles

Sans UN SEUL de ces éléments, le champ ne s'affichera pas comme SmartCalculatedField.
```