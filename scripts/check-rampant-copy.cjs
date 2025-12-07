const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();

p.treeBranchLeafNode.findUnique({
  where:{id:'9c9f42b2-e0df-4726-8a81-997c0dee71bc-1'},
  select:{
    id:true,
    label:true,
    metadata:true,
    hasFormula:true,
    hasCondition:true,
    linkedFormulaIds:true,
    linkedConditionIds:true,
    subType:true,
    type:true
  }
}).then(n=>{
  console.log('COPIE RAMPANT TOITURE-1:');
  console.log(JSON.stringify(n,null,2));
}).finally(()=>p.$disconnect());
