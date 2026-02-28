import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check what modules exist in templates
  const templates = await prisma.documentTemplate.findMany({
    select: { id: true, name: true, DocumentSection: { select: { id: true, config: true } } }
  });

  for (const tpl of templates) {
    console.log(`\nTemplate: "${tpl.name}" (${tpl.id})`);
    for (const sec of tpl.DocumentSection) {
      const config = (sec.config || {}) as any;
      console.log(`  Section ${sec.id}:`);
      console.log(`    Config keys:`, Object.keys(config));
      const modules = config.modules || [];
      if (modules.length > 0) {
        for (const mod of modules) {
          console.log(`    Module type: ${mod.type}`);
          if (mod.config) {
            console.log(`    Module config keys:`, Object.keys(mod.config));
            // Print all config values that look like refs
            for (const [k, v] of Object.entries(mod.config)) {
              if (typeof v === 'string' && (v.includes('formula') || v.includes('@') || v.includes(':'))) {
                console.log(`      ${k}: "${v}"`);
              } else if (typeof v === 'string' && /^[0-9a-f]{8}-/.test(v)) {
                console.log(`      ${k}: "${v}" (UUID-like)`);
              }
            }
          }
        }
      } else {
        // Maybe modules are stored differently
        // Check all string values in config for formula-like refs
        const printRefs = (obj: any, prefix: string) => {
          for (const [k, v] of Object.entries(obj || {})) {
            if (typeof v === 'string' && (v.includes('formula') || v.includes('@') || v.includes(':') || /^[0-9a-f]{8}-/.test(v))) {
              console.log(`    ${prefix}${k}: "${v}"`);
            } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
              printRefs(v, `${prefix}${k}.`);
            }
          }
        };
        printRefs(config, '');
      }
    }
  }

  await prisma.$disconnect();
}
main();
