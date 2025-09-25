const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addFormulasTable() {
  try {
    console.log('🔧 Création de la table TreeBranchLeafNodeFormula...');
    
    // Création de la table via SQL brut
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "TreeBranchLeafNodeFormula" (
        "id" TEXT NOT NULL,
        "nodeId" TEXT NOT NULL,
        "organizationId" TEXT,
        "name" TEXT NOT NULL,
        "tokens" JSONB NOT NULL DEFAULT '[]',
        "description" TEXT,
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "order" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "TreeBranchLeafNodeFormula_pkey" PRIMARY KEY ("id")
      );
    `;
    
    console.log('✅ Table TreeBranchLeafNodeFormula créée');
    
    // Ajout des contraintes
    console.log('🔧 Ajout des contraintes...');
    
    // Index unique sur nodeId + name
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "TreeBranchLeafNodeFormula_nodeId_name_key" 
      ON "TreeBranchLeafNodeFormula"("nodeId", "name");
    `;
    
    // Index sur nodeId
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "TreeBranchLeafNodeFormula_nodeId_idx" 
      ON "TreeBranchLeafNodeFormula"("nodeId");
    `;
    
    // Index sur organizationId
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "TreeBranchLeafNodeFormula_organizationId_idx" 
      ON "TreeBranchLeafNodeFormula"("organizationId");
    `;
    
    // Clé étrangère vers TreeBranchLeafNode
    await prisma.$executeRaw`
      ALTER TABLE "TreeBranchLeafNodeFormula" 
      ADD CONSTRAINT IF NOT EXISTS "TreeBranchLeafNodeFormula_nodeId_fkey" 
      FOREIGN KEY ("nodeId") REFERENCES "TreeBranchLeafNode"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    // Clé étrangère vers Organization
    await prisma.$executeRaw`
      ALTER TABLE "TreeBranchLeafNodeFormula" 
      ADD CONSTRAINT IF NOT EXISTS "TreeBranchLeafNodeFormula_organizationId_fkey" 
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    console.log('✅ Contraintes ajoutées');
    
    // Test : insérer quelques formules pour le nœud 917c6bb4-eaab-42c8-a71e-3ab85c1498b4
    const nodeId = '917c6bb4-eaab-42c8-a71e-3ab85c1498b4';
    
    console.log('🧪 Test : Insertion des formules de test...');
    
    const formulas = [
      {
        id: 'formula-' + Date.now() + '-1',
        nodeId,
        name: 'Formule Test 1',
        tokens: JSON.stringify([
          { type: 'variable', value: 'puissance' },
          { type: 'operator', value: '*' },
          { type: 'number', value: '0.15' }
        ]),
        description: 'Calcul simple puissance * 0.15',
        isDefault: true,
        order: 1
      },
      {
        id: 'formula-' + Date.now() + '-2',
        nodeId,
        name: 'Formule Test 2',
        tokens: JSON.stringify([
          { type: 'variable', value: 'puissance' },
          { type: 'operator', value: '*' },
          { type: 'number', value: '0.20' },
          { type: 'operator', value: '+' },
          { type: 'number', value: '10' }
        ]),
        description: 'Calcul avec frais fixes',
        isDefault: false,
        order: 2
      },
      {
        id: 'formula-' + Date.now() + '-3',
        nodeId,
        name: 'Formule Test 3',
        tokens: JSON.stringify([
          { type: 'variable', value: 'puissance' },
          { type: 'operator', value: '*' },
          { type: 'number', value: '0.18' },
          { type: 'operator', value: '*' },
          { type: 'number', value: '1.21' }
        ]),
        description: 'Calcul avec TVA',
        isDefault: false,
        order: 3
      }
    ];
    
    for (const formula of formulas) {
      await prisma.$executeRaw`
        INSERT INTO "TreeBranchLeafNodeFormula" 
        ("id", "nodeId", "name", "tokens", "description", "isDefault", "order", "createdAt", "updatedAt")
        VALUES (${formula.id}, ${formula.nodeId}, ${formula.name}, ${formula.tokens}::jsonb, 
                ${formula.description}, ${formula.isDefault}, ${formula.order}, NOW(), NOW())
        ON CONFLICT ("nodeId", "name") DO NOTHING;
      `;
    }
    
    console.log('✅ Formules de test insérées');
    
    // Vérification
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "TreeBranchLeafNodeFormula" WHERE "nodeId" = ${nodeId};
    `;
    
    console.log(`🔍 Formules trouvées pour le nœud ${nodeId}:`, count[0].count);
    
    console.log('🎉 Table créée et testée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addFormulasTable();
