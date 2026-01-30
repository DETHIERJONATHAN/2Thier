import 'dotenv/config';
import { db } from '../src/lib/database';

type Args = {
  submissionId?: string;
  limit: number;
  nodeId?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { limit: 20 };

  for (const item of argv.slice(2)) {
    const [rawKey, rawValue] = item.split('=');
    const key = rawKey?.replace(/^--/, '');
    const value = rawValue ?? '';

    if (!key) continue;

    if (key === 'submissionId') args.submissionId = value;
    if (key === 'limit') args.limit = Math.max(1, Number.parseInt(value || '20', 10) || 20);
    if (key === 'nodeId') args.nodeId = value;
  }

  return args;
}

function countBy<T extends string | null | undefined>(values: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of values) {
    const key = v ?? '<null>';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

async function main() {
  const { submissionId, limit, nodeId } = parseArgs(process.argv);

  if (!submissionId) {
    console.error('Usage: npm run inspect:submission -- --submissionId=<id> [--limit=20] [--nodeId=<nodeId>]');
    process.exitCode = 2;
    return;
  }

  const submission = await db.treeBranchLeafSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      treeId: true,
      userId: true,
      leadId: true,
      organizationId: true,
    },
  });

  if (!submission) {
    console.error(`Submission introuvable: ${submissionId}`);
    process.exitCode = 1;
    return;
  }

  const where: any = { submissionId };
  if (nodeId) where.nodeId = nodeId;

  const totalRows = await db.treeBranchLeafSubmissionData.count({ where });

  const rows = await db.treeBranchLeafSubmissionData.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      nodeId: true,
      updatedAt: true,
      operationSource: true,
      value: true,
    },
  });

  const sources = countBy(rows.map((r) => (r as any).operationSource));

  console.log('--- Submission ---');
  console.log(submission);
  console.log('--- Data ---');
  console.log({ totalRows, sources, showing: rows.length, nodeIdFilter: nodeId ?? null });

  for (const r of rows) {
    const preview = typeof r.value === 'string' ? r.value.slice(0, 160) : JSON.stringify(r.value).slice(0, 160);
    console.log(
      `${r.updatedAt.toISOString()}  node=${r.nodeId}  op=${(r as any).operationSource ?? '<null>'}  value=${preview}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // En dev, on ferme proprement les connexions
    await db.$disconnect();
  });
