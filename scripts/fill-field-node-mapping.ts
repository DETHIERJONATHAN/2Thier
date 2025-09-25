import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

interface Mapping { labelMatch: string; nodeRole: string; preferredNodeId?: string }
interface MappingFile { version: number; mappings: Mapping[] }

const prisma = new PrismaClient();

async function main(){
  const file = path.join(process.cwd(),'scripts','field-node-mapping.json');
  if(!fs.existsSync(file)) throw new Error('field-node-mapping.json introuvable');
  const json = JSON.parse(fs.readFileSync(file,'utf-8')) as MappingFile;
  let changed = false;
  for (const m of json.mappings){
    if (m.preferredNodeId) continue; // déjà rempli
    const node = await prisma.treeBranchLeafNode.findFirst({ where: { label: m.labelMatch } });
    if (node){
      m.preferredNodeId = node.id;
      changed = true;
      console.log('✅ Mapping résolu', m.labelMatch, '=>', node.id);
    } else {
      console.warn('⚠️ Node non trouvé pour labelMatch =', m.labelMatch);
    }
  }
  if (changed){
    fs.writeFileSync(file, JSON.stringify(json,null,2));
    console.log('💾 Mapping mis à jour.');
  } else {
    console.log('Aucune mise à jour du mapping.');
  }
}

main().catch(e=>{ console.error(e); process.exit(1); }).finally(async()=> prisma.$disconnect());
