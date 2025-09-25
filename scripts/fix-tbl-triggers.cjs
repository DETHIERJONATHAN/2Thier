// Script CJS pour appliquer le correctif des triggers TBL et exécuter un test fumigène
// Utilisation: node scripts/fix-tbl-triggers.cjs

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SQL_DROP_TRIGGER = 'DROP TRIGGER IF EXISTS auto_create_variables_trigger ON "TreeBranchLeafSubmission";';
const SQL_DROP_FUNCTION = 'DROP FUNCTION IF EXISTS auto_create_variables_for_submission();';
// Triggers/fonctions parasites à supprimer (provoquent JSON/enum FK erreurs)
const SQL_DROP_BAD_TRIGGER_SUBMISSION = 'DROP TRIGGER IF EXISTS auto_populate_trigger ON "TreeBranchLeafSubmission";';
const SQL_DROP_BAD_FUNCTION_SUBMISSION = 'DROP FUNCTION IF EXISTS auto_populate_submission_data();';
const SQL_DROP_BAD_TRIGGER_DATA = 'DROP TRIGGER IF EXISTS auto_update_trigger ON "TreeBranchLeafSubmissionData";';
const SQL_DROP_BAD_FUNCTION_DATA = 'DROP FUNCTION IF EXISTS update_existing_submission_data();';
const SQL_CREATE_FUNCTION = `
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
$$ LANGUAGE plpgsql;`;
const SQL_CREATE_TRIGGER = `
CREATE TRIGGER auto_create_variables_trigger
  AFTER INSERT ON "TreeBranchLeafSubmission"
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_variables_for_submission();`;

async function smokeTest() {
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
      status: 'draft',
      updatedAt: new Date()
    }
  });
  console.log('OK submission créée:', sub.id);
  const count = await prisma.treeBranchLeafSubmissionData.count({ where: { submissionId: sub.id } });
  console.log('Variables auto-créées:', count);
}

async function main() {
  console.log('Application du correctif des triggers TBL…');
  // Supprimer triggers/fonctions parasites
  await prisma.$executeRawUnsafe(SQL_DROP_BAD_TRIGGER_SUBMISSION);
  await prisma.$executeRawUnsafe(SQL_DROP_BAD_FUNCTION_SUBMISSION);
  await prisma.$executeRawUnsafe(SQL_DROP_BAD_TRIGGER_DATA);
  await prisma.$executeRawUnsafe(SQL_DROP_BAD_FUNCTION_DATA);

  // Recréer uniquement le trigger sain d'auto-création des variables
  await prisma.$executeRawUnsafe(SQL_DROP_TRIGGER);
  await prisma.$executeRawUnsafe(SQL_DROP_FUNCTION);
  await prisma.$executeRawUnsafe(SQL_CREATE_FUNCTION);
  await prisma.$executeRawUnsafe(SQL_CREATE_TRIGGER);
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
