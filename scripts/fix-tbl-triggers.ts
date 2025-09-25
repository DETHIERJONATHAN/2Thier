// Applique le correctif des triggers TBL côté base de données
// - Remplace la fonction auto_create_variables_for_submission() et recrée le trigger
// - Laisse intact le trigger BEFORE auto_resolve_tree_branch_leaf_operations (déjà dans prisma/sql)
// - Fournit un test fumigène pour vérifier la création de submission sans erreur JSON

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SQL_FIX = `
-- Recréer proprement la fonction et le trigger d'auto-création
DROP TRIGGER IF EXISTS auto_create_variables_trigger ON "TreeBranchLeafSubmission";
DROP FUNCTION IF EXISTS auto_create_variables_for_submission();

CREATE OR REPLACE FUNCTION auto_create_variables_for_submission()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "TreeBranchLeafSubmissionData" (
        id,
        "submissionId",
        "nodeId",
        value,
        "isVariable",
        "variableKey",
        "variableDisplayName",
        "variableUnit",
        "fieldLabel",
        "sourceRef",
        "operationDetail",
        "operationResult",
        "operationSource",
        "createdAt"
    )
    SELECT 
        (NEW.id || ':' || var."nodeId") AS id,
        NEW.id,
        var."nodeId",
        NULL,
        true,
        var."exposedKey",
        var."displayName",
        var.unit,
        node.label,
        var."sourceRef",
        NULL,
        NULL,
        CASE 
            WHEN var."sourceRef" LIKE 'condition:%' THEN 'condition'::"OperationSource"
            WHEN var."sourceRef" LIKE 'formula:%' THEN 'formula'::"OperationSource"
            WHEN var."sourceRef" LIKE 'table:%' THEN 'table'::"OperationSource"
            ELSE NULL
        END,
        NOW()
    FROM "TreeBranchLeafNodeVariable" var
    JOIN "TreeBranchLeafNode" node ON var."nodeId" = node.id
    WHERE node."treeId" = NEW."treeId"
      AND var."nodeId" NOT IN (
        SELECT "nodeId" FROM "TreeBranchLeafSubmissionData" WHERE "submissionId" = NEW.id
      );

    RAISE NOTICE 'Auto-créé variables pour le devis % (arbre %)', NEW.id, NEW."treeId";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_variables_trigger
    AFTER INSERT ON "TreeBranchLeafSubmission"
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_variables_for_submission();
`;

async function smokeTest() {
  // Crée une submission minimale sur un arbre existant
  // Choisit un treeId au hasard pour limiter l'impact
  const tree = await prisma.treeBranchLeafTree.findFirst();
  if (!tree) {
    console.warn('Aucun TreeBranchLeafTree trouvé, test fumigène sauté.');
    return;
  }
  const id = `${Date.now()}`;
  console.log('Création submission de test', { id, treeId: tree.id });
  const sub = await prisma.treeBranchLeafSubmission.create({
    data: {
      id,
      treeId: tree.id,
      status: 'draft'
    }
  });
  console.log('OK submission créée:', sub.id);
  // Vérifie qu’au moins une variable a été auto-créée (si variables existent sur cet arbre)
  const count = await prisma.treeBranchLeafSubmissionData.count({ where: { submissionId: sub.id } });
  console.log('Variables auto-créées:', count);
}

async function main() {
  console.log('Application du correctif des triggers TBL…');
  await prisma.$executeRawUnsafe(SQL_FIX);
  console.log('Correctif appliqué. Lancement test fumigène…');
  await smokeTest();
}

main()
  .catch((e) => {
    console.error('Erreur lors de l\'application du correctif:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
