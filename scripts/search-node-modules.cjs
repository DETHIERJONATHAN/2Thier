const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'node_modules');
function walk(dir){
  const res=[];
  fs.readdirSync(dir).forEach(f=>{
    const full=path.join(dir,f);
    try{
      const stat=fs.statSync(full);
      if(stat.isDirectory()) res.push(...walk(full));
      else if(stat.isFile() && (full.endsWith('.js')||full.endsWith('.d.ts')||full.endsWith('.ts'))) res.push(full);
    }catch(e){}
  });
  return res;
}
const files = walk(root);
for(const file of files){
  try{
    const content = fs.readFileSync(file,'utf8');
    if(content.includes('TreeBranchLeafNode')) console.log('FOUND',file);
  }catch(e){ }
}
console.log('search done.');
