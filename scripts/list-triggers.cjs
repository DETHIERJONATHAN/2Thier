// List triggers and function definitions for TBL tables + check column defaults
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listTriggersForTable(tableName) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT 
      tg.tgname AS trigger_name,
      c.relname AS table_name,
      p.proname AS function_name,
      pg_get_triggerdef(tg.oid) AS trigger_def,
      ns.nspname AS schema_name
    FROM pg_trigger tg
    JOIN pg_class c ON tg.tgrelid = c.oid
    JOIN pg_proc p ON tg.tgfoid = p.oid
    JOIN pg_namespace ns ON c.relnamespace = ns.oid
    WHERE NOT tg.tgisinternal
      AND c.relname = $1
      AND ns.nspname = 'public'
    ORDER BY tg.tgname;`, tableName);
  return rows;
}

async function getFunctionDefs(functionNames) {
  const rows = [];
  for (const fn of functionNames) {
    try {
      const def = await prisma.$queryRawUnsafe(`SELECT pg_get_functiondef(p.oid) AS def
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = $1
        LIMIT 1;`, fn);
      if (def.length) rows.push({ name: fn, def: def[0].def });
    } catch (e) {
      rows.push({ name: fn, error: e.message });
    }
  }
  return rows;
}

async function listColumnDefaults(tableName) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, udt_name, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position;`, tableName);
  return rows;
}

async function main() {
  console.log('Inspecting DB triggers and JSON defaults...');
  const tables = ['TreeBranchLeafSubmission', 'TreeBranchLeafSubmissionData'];
  for (const t of tables) {
    console.log(`\n-- Triggers on ${t} --`);
    const tr = await listTriggersForTable(t);
    console.log(tr);
    const fnNames = [...new Set(tr.map(r => r.function_name))];
    if (fnNames.length) {
      console.log(`\n-- Function definitions used by triggers on ${t} --`);
      const defs = await getFunctionDefs(fnNames);
      for (const d of defs) {
        console.log(`\nFunction: ${d.name}`);
        console.log(d.def || d.error);
      }
    }
    console.log(`\n-- Column defaults for ${t} --`);
    const cols = await listColumnDefaults(t);
    console.table(cols);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
