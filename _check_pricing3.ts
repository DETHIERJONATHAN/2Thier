import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.documentTemplate.findMany({
    select: { id: true, name: true, DocumentSection: { select: { id: true, type: true, config: true } } }
  });

  for (const tpl of templates) {
    console.log(`\n=== Template: "${tpl.name}" (${tpl.id}) ===`);
    for (const sec of tpl.DocumentSection) {
      const config = (sec.config || {}) as any;
      const modules = config.modules || [];
      if (modules.length > 0) {
        console.log(`  Section type=${sec.type}, ${modules.length} modules:`);
        for (let i = 0; i < modules.length; i++) {
          const mod = modules[i];
          console.log(`    Module[${i}] keys:`, Object.keys(mod));
          console.log(`    Module[${i}] raw:`, JSON.stringify(mod).substring(0, 500));
        }
      }
    }
  }

  // Also dump first template that has modules
  const firstWithModules = templates.find(t => 
    t.DocumentSection.some(s => ((s.config || {}) as any).modules?.length > 0)
  );
  if (firstWithModules) {
    console.log('\n\n=== FULL DUMP of first template with modules ===');
    for (const sec of firstWithModules.DocumentSection) {
      const config = (sec.config || {}) as any;
      if (config.modules?.length > 0) {
        console.log(JSON.stringify(config.modules, null, 2));
      }
    }
  }

  await prisma.$disconnect();
}
main();
