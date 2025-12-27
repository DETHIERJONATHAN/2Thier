
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 Diagnostic TBL Data...');
  console.log('Database URL:', process.env.DATABASE_URL ? 'Defined' : 'Undefined');

  try {
    // 1. Check connection
    console.log('1. Testing connection...');
    await prisma.$connect();
    console.log('✅ Connection successful');

    // 2. Check Variables
    console.log('2. Checking TreeBranchLeafNodeVariable...');
    const variables = await prisma.treeBranchLeafNodeVariable.findMany({
      include: {
        TreeBranchLeafNode: true
      }
    });
    console.log(`✅ Found ${variables.length} variables`);

    let orphaned = 0;
    let missingNode = 0;

    for (const v of variables) {
      if (!v.TreeBranchLeafNode) {
        console.warn(`⚠️ Variable ${v.id} (${v.exposedKey}) has no associated Node!`);
        missingNode++;
      }
    }

    if (missingNode > 0) {
      console.error(`❌ ${missingNode} variables are orphaned (missing Node). This might cause issues.`);
    } else {
      console.log('✅ All variables have valid Nodes.');
    }

    // 3. Check specific deleted variables
    const targetKeys = ['TOTAL DEUX PUISSANCE WC', 'N DE PANNEAU']; // Approximate keys
    console.log(`3. Searching for keys like: ${targetKeys.join(', ')}...`);
    
    const found = variables.filter(v => 
      targetKeys.some(k => 
        v.exposedKey.includes(k) || 
        v.displayName.includes(k)
      )
    );

    if (found.length > 0) {
      console.log('✅ Found potentially related variables:');
      found.forEach(v => console.log(` - ${v.exposedKey} (${v.displayName}) [ID: ${v.id}]`));
    } else {
      console.warn('⚠️ No variables found matching the deleted names.');
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
