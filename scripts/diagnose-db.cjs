#!/usr/bin/env node
/*
  Quick DB diagnostics: prints DATABASE_URL (masked), checks for specific Field IDs,
  lists a few Fields and their Sections/Blocks, and counts.
*/
const { PrismaClient } = require('@prisma/client');

function maskDbUrl(url) {
  try {
    if (!url) return '(undefined)';
    const u = new URL(url.replace('postgres://', 'postgresql://'));
    const user = u.username || '';
    const host = u.hostname || '';
    const db = (u.pathname || '').replace(/^\//, '') || '';
    const params = u.search || '';
    return `postgresql://${user ? user + ':***@' : ''}${host}/${db}${params ? params : ''}`;
  } catch (e) {
    return '(unparseable)';
  }
}

const fieldIds = [
  '99476bab-4835-4108-ad02-7f37e096647d',
  'cc8bf34e-3461-426e-a16d-2c1db4ff8a76',
  '9f27d411-6511-487c-a983-9f9fc357c560',
  '965b1e18-3f0e-483f-ba03-81b4dd2d6236',
];

(async () => {
  console.log('DATABASE_URL =', maskDbUrl(process.env.DATABASE_URL));
  const prisma = new PrismaClient();
  try {
    const version = await prisma.$queryRaw`select version()`;
    console.log('Postgres version:', version?.[0]?.version || '(unknown)');
  } catch {}

  try {
    const totalFields = await prisma.field.count();
    const totalSections = await prisma.section.count();
    console.log('Counts => Field:', totalFields, 'Section:', totalSections);

    const found = await prisma.field.findMany({
      where: { id: { in: fieldIds } },
    });
    console.log(`Found ${found.length} target Field(s).`);
    for (const f of found) {
      console.log({
        id: f.id,
        label: f.label,
        type: f.type,
        order: f.order,
        sectionId: f.sectionId,
      });
    }

    const sample = await prisma.field.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    }).catch(() => prisma.field.findMany({ take: 10 }));
    console.log('Sample of recent Fields (up to 10):');
    for (const f of sample) {
      console.log({ id: f.id, label: f.label, sectionId: f.sectionId, order: f.order });
    }
  } catch (e) {
    console.error('Diagnostic error:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
