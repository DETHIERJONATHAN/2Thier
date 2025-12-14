#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('\n📌 REPEATERS IN DATABASE\n');

    const repeaters = await prisma.treeBranchLeafNode.findMany({
      where: { type: 'leaf_repeater' },
      select: {
        id: true,
        label: true,
        repeater_templateNodeIds: true,
        parentId: true
      }
    });

    console.log(`Found ${repeaters.length} repeaters:\n`);

    for (let i = 0; i < repeaters.length; i++) {
      const r = repeaters[i];
      let templates = [];
      try {
        if (r.repeater_templateNodeIds) {
          templates = JSON.parse(r.repeater_templateNodeIds);
        }
      } catch (e) {}

      console.log(`${i + 1}. ${r.label}`);
      console.log(`   ID: ${r.id}`);
      console.log(`   Templates stored: ${templates.length}`);
      console.log(`   Parent: ${r.parentId}\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
