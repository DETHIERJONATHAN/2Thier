const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
async function main(){
  // La variable originale
  const varOriginal = await p.treeBranchLeafNodeVariable.findUnique({
    where:{id:'dfe42b56-ce2e-4c2d-a4a2-cba90087ed72'},
    select:{id:true,nodeId:true,exposedKey:true}
  });
  console.log('Variable originale:', JSON.stringify(varOriginal,null,2));
  
  // Le nœud propriétaire de la variable
  const ownerNode = await p.treeBranchLeafNode.findUnique({
    where:{id:varOriginal?.nodeId || ''},
    select:{id:true,label:true,parentId:true}
  });
  console.log('Nœud propriétaire:', JSON.stringify(ownerNode,null,2));
  
  // Le template Rampant toiture
  const template = await p.treeBranchLeafNode.findUnique({
    where:{id:'9c9f42b2-e0df-4726-8a81-997c0dee71bc'},
    select:{id:true,label:true,parentId:true}
  });
  console.log('Template Rampant:', JSON.stringify(template,null,2));
  
  // Vérification critique
  console.log('\n--- VÉRIFICATION ---');
  console.log('Variable.nodeId:', varOriginal?.nodeId);
  console.log('Template.id:', template?.id);
  console.log('Sont-ils identiques?', varOriginal?.nodeId === template?.id);
  
  if (varOriginal?.nodeId === template?.id) {
    console.log('\n✅ La variable appartient au template Rampant toiture');
    console.log('Donc nodeIdMap devrait avoir ce mapping et autoCreateDisplayNode NE devrait PAS créer de nœud');
  } else {
    console.log('\n⚠️ PROBLÈME: La variable n\'appartient PAS au template!');
    console.log('Elle appartient à:', ownerNode?.label, '(', ownerNode?.id, ')');
  }
}
main().finally(()=>p.$disconnect());
