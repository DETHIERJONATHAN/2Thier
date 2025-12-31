#!/bin/bash

# 🧪 Script pour lancer les tests des champs NUMBER
# Usage: bash scripts/run-number-field-tests.sh

echo "🧪 Lancement des tests pour les champs NUMBER..."

# Lancer les tests avec Vitest
npm run test -- src/components/TreeBranchLeaf/treebranchleaf-new/TBL/components/__tests__/TBLFieldRendererAdvanced.number.test.tsx

# Vérifier le code de sortie
if [ $? -eq 0 ]; then
    echo "✅ Tous les tests sont passés avec succès !"
else
    echo "❌ Certains tests ont échoué. Vérifiez les logs ci-dessus."
    exit 1
fi
