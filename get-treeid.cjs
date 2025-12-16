const {PrismaClient}=require('@prisma/client'); 
const p=new PrismaClient(); 
p.treeBranchLeafNode.findUnique({
  where:{id:'3da47bc3-739e-4c83-98c3-813ecf77a740-1'},
  select:{treeId:true,label:true}
}).then(n=>{
  console.log('TreeId de Panneaux max-1:',n?.treeId);
  p.$disconnect()
});
