# 🚀 Scripts de Performance - CRM 2Thier

Scripts d'analyse et de monitoring pour optimiser les performances du CRM.

## 📊 Scripts Disponibles

### 1. Analyse des Logs (Diagnostic Rapide)
```bash
npm run analyze:logs
```
**Objectif :** Affiche un diagnostic complet basé sur l'analyse de vos logs récents
- ✅ Détecte les problèmes de performance
- 📊 Montre l'efficacité des triggers
- 🎯 Identifie les optimisations appliquées
- 📈 Calcule les gains de performance

**Quand l'utiliser :** Pour un diagnostic rapide sans lancer l'application

---

### 2. Moniteur de Performance Temps Réel
```bash
npm run monitor:perf
```
**Objectif :** Analyse les temps de réponse de tous les endpoints en temps réel

**Métriques collectées :**
- ⏱️ Temps de réponse par endpoint (min, max, moyen, P95)
- 📊 Nombre d'appels par endpoint
- 🐌 Détection des requêtes lentes (> 1s)
- 📈 Distribution des temps de réponse

**Utilisation :**
1. Lancez le script
2. Utilisez l'application normalement
3. Appuyez sur `Ctrl+C` pour voir les statistiques

**Exemple de sortie :**
```
✓ GET /api/auth/me - 45ms
⚠️  POST /api/tbl/submissions/create-and-evaluate - 650ms
🐌 SLOW: POST /api/tbl/submissions/create-and-evaluate - 1200ms

📊 STATISTIQUES DE PERFORMANCE
═════════════════════════════

Total de requêtes analysées: 47

🏆 TOP 10 ENDPOINTS LES PLUS LENTS
─────────────────────────────────
1. POST /api/tbl/submissions/create-and-evaluate
   Appels: 5 | Moy: 850ms | Min: 200ms | Max: 1200ms | P95: 1150ms
```

---

### 3. Analyseur de Triggers (Optimisation Display Fields)
```bash
npm run analyze:triggers
```
**Objectif :** Analyse en détail comment les triggers optimisent le recalcul des display fields

**Métriques collectées :**
- ✅ Triggers matchés (recalcul nécessaire)
- ⏸️ Triggers filtrés (optimisation)
- ⏸️ Champs sans triggers
- ⏸️ Autosaves (pas de recalcul)
- 📊 Ratio d'optimisation

**Utilisation :**
1. Lancez le script
2. Modifiez des champs dans le formulaire TBL
3. Observez les optimisations en temps réel
4. Appuyez sur `Ctrl+C` pour voir les statistiques

**Exemple de sortie :**
```
🎯 Évaluation: changedFieldId="shared-ref-1767665997315-yyp3jk"
  ✅ Recalculé: M² toiture
  ✅ Recalculé: Rampant toiture
  ⏸️  Skippé: Longueur toiture
  ⏸️  Pas de triggers: N° de panneau max
  📊 Total: 2 calculés, 12 skippés (86% optimisés)

📊 STATISTIQUES D'OPTIMISATION DES TRIGGERS
═══════════════════════════════════════════

🎯 RÉSUMÉ DES DISPLAY FIELDS
  Calculés: 10
  Skippés:  52
  Total:    62
  
  Efficacité: 83.9% des display fields évités grâce aux triggers 🚀
```

---

### 4. Guide de Benchmark (Instructions Manuelles)
```bash
npm run benchmark
```
**Objectif :** Guide complet pour mesurer manuellement les performances dans le navigateur

**Contenu :**
- 📋 Checklist des mesures à effectuer
- ✅ Résultats attendus
- ❌ Problèmes à détecter
- 🚀 Commandes utiles

---

## 🎯 Métriques de Performance Attendues

### Avec Optimisations (État Actuel)
- **Chargement initial :** ~2-6s (calcul de TOUS les display fields) ✅ Normal
- **Changement utilisateur :** ~100-300ms (2-3 display fields) ✅ Excellent
- **Autosave périodique :** ~50-150ms (aucun recalcul) ✅ Optimisé

### Sans Optimisations (Avant Fix)
- **Chargement initial :** ~6s ❌
- **Changement utilisateur :** ~6s (TOUS recalculés) ❌ Très lent
- **Autosave périodique :** ~6s (TOUS recalculés) ❌ Freezes

### Gain de Performance
- **Triggers :** 30x plus rapide (200ms vs 6s)
- **Autosave :** 60x plus rapide (100ms vs 6s)
- **Display fields évités :** 86% en moyenne

---

## 🔍 Comment Détecter les Problèmes

### ❌ Signes de Problème

1. **changedFieldId="NULL" lors d'un changement utilisateur**
   ```
   🎯 [TBL] changedFieldId envoyé au backend: "NULL"  ❌ MAUVAIS
   ```
   **Impact :** Tous les display fields recalculés inutilement
   **Solution :** Vérifier que `debouncedEvaluateRef` reçoit bien le `changedField`

2. **Tous les display fields recalculés à chaque changement**
   ```
   ✅ [DISPLAY FIELD] M² toiture = 150
   ✅ [DISPLAY FIELD] Longueur toiture = 15
   ✅ [DISPLAY FIELD] Rampant toiture = 10
   ... (28 display fields calculés)  ❌ PAS OPTIMISÉ
   ```
   **Impact :** Performance dégradée (6s au lieu de 200ms)
   **Solution :** Vérifier que les triggers sont bien configurés

3. **Autosave recalcule les display fields**
   ```
   🎯 [TRIGGER DEBUG] changedFieldId: "NULL"
   ✅ [DISPLAY FIELD] M² toiture = 150  ❌ NE DEVRAIT PAS CALCULER
   ```
   **Impact :** Freezes toutes les 30 secondes
   **Solution :** Fix appliqué (skip display fields si changedFieldId="NULL")

### ✅ Signes de Bon Fonctionnement

1. **changedFieldId correct lors des changements**
   ```
   🎯 [TBL] changedFieldId envoyé au backend: "shared-ref-1767665997315-yyp3jk" ✓
   ```

2. **Triggers filtrés correctement**
   ```
   ✅ [TRIGGER MATCH] M² toiture recalculé
   ⏸️ [TRIGGER FILTER] Longueur toiture skippé
   📊 Total: 2 calculés, 12 skippés (86% optimisés) ✓
   ```

3. **Autosave optimisé**
   ```
   🎯 [TRIGGER DEBUG] changedFieldId: "NULL"
   ⏸️ [AUTOSAVE] Display field M² toiture skippé ✓
   ⏸️ [AUTOSAVE] Display field ... skippé ✓
   ```

---

## 🚀 Workflow de Diagnostic

### 1. Diagnostic Initial
```bash
npm run analyze:logs
```
→ Vérifier l'état général du système

### 2. Monitoring Temps Réel
```bash
npm run monitor:perf
```
→ Identifier les endpoints lents

### 3. Analyse des Triggers
```bash
npm run analyze:triggers
```
→ Vérifier l'efficacité des optimisations

### 4. Test Manuel
```bash
npm run benchmark
```
→ Suivre le guide pour tester dans le navigateur

---

## 📝 Logs à Surveiller

### Backend (Console Serveur)

**Triggers matchés :**
```
✅ [TRIGGER MATCH] Display field 0cac5b10... (M² toiture) recalculé
```

**Triggers filtrés :**
```
⏸️ [TRIGGER FILTER] Display field aaf69b1e... (Longueur) skippé
```

**Autosave optimisé :**
```
⏸️ [AUTOSAVE] Display field ... skippé - autosave périodique
```

**Requêtes lentes :**
```
2026-01-27 20:25:26 [warn]: SECURITY_EVENT: SLOW_REQUEST
{"duration":6010,"method":"POST","url":"/api/tbl/submissions/create-and-evaluate"}
```

### Frontend (Console Navigateur)

**changedFieldId envoyé :**
```
🎯 [TBL] changedFieldId envoyé au backend: "shared-ref-1767665997315-yyp3jk"
```

**Rafraîchissements :**
```
⬆️ [GRD nodeId=0cac5b10...] Rafraîchissement demandé (8 en cours)
```

---

## 🎓 Comprendre les Métriques

### Percentile 95 (P95)
95% des requêtes sont plus rapides que cette valeur. Utile pour ignorer les outliers.

**Exemple :**
```
Moy: 250ms | P95: 800ms
```
→ La plupart des requêtes sont ~250ms, quelques-unes atteignent 800ms

### Efficacité des Triggers
Pourcentage de display fields évités grâce aux triggers.

**Formule :**
```
Efficacité = (Display Fields Skippés / Total) × 100
```

**Exemple :**
```
12 skippés / 14 total = 86% d'efficacité ✅
```

### Temps de Réponse
- **< 200ms :** Excellent ✅
- **200-500ms :** Bon ⚠️
- **500-1000ms :** Moyen ⚠️
- **> 1000ms :** Lent ❌ (à optimiser)

---

## 🔧 Troubleshooting

### Problème : Scripts ne se lancent pas

**Solution :**
```bash
chmod +x scripts/*.mjs
npm install
```

### Problème : "chalk" not found

**Solution :**
```bash
npm install chalk
```

### Problème : Pas de logs visibles

**Vérifier :**
1. Le serveur est bien lancé (`npm run dev`)
2. Les logs de debug sont activés
3. Vous êtes dans le bon répertoire

---

## 📚 Ressources Supplémentaires

- **Guide d'architecture :** `/workspaces/2Thier/.github/copilot-instructions.md`
- **Connection guide :** `/workspaces/2Thier/Dossier important/Dossier Général/CONNECTION-GENERALE.md`
- **Backend evaluator :** `src/components/TreeBranchLeaf/tbl-bridge/routes/tbl-submission-evaluator.ts`
- **Frontend TBL :** `src/components/TreeBranchLeaf/treebranchleaf-new/TBL/TBL.tsx`

---

**Dernière mise à jour :** 27 janvier 2026
**Auteur :** GitHub Copilot & Jonathan Dethier
