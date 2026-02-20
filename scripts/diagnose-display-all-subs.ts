#!/usr/bin/env node
/**
 * DIAGNOSTIC — Comparer le comportement DISPLAY sur TOUTES les submissions
 * Vérifie que les DISPLAY (subType='display') fonctionnent pareil quel que soit le mode.
 * 
 * Usage: npx tsx --env-file=.env scripts/diagnose-display-all-subs.ts
 */
import { db } from '../src/lib/database';
const prisma = db;

async function main() {
  const treeId = 'cmf1mwoz10005gooked1j6orn';

  // 1. Charger les DISPLAY (subType='display')
  const displayNodes = await prisma.treeBranchLeafNode.findMany({
    where: { treeId, subType: 'display' },
    select: {
      id: true, label: true, hasFormula: true, hasCondition: true, hasTable: true, hasLink: true, hasData: true,
    }
  });
  const displayIds = displayNodes.map(n => n.id);

  // Variables pour savoir si le champ est dans le pipeline capacities
  const variables = await prisma.treeBranchLeafNodeVariable.findMany({
    where: { nodeId: { in: displayIds } },
    select: { nodeId: true, sourceRef: true }
  });
  const varByNode = new Map(variables.map(v => [v.nodeId, v]));

  // Champs qui ont une capacité de calcul
  const displayWithCap = displayNodes.filter(n => {
    const v = varByNode.get(n.id);
    return (v && v.sourceRef) || n.hasFormula || n.hasCondition || n.hasTable || n.hasLink;
  });
  const capIds = new Set(displayWithCap.map(n => n.id));
  
  console.log(`${displayNodes.length} DISPLAY fields (subType=display), dont ${displayWithCap.length} avec capacité de calcul.\n`);

  // 2. Charger TOUTES les submissions
  const submissions = await prisma.treeBranchLeafSubmission.findMany({
    where: { treeId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, status: true, leadId: true, updatedAt: true }
  });
  console.log(`${submissions.length} submissions trouvées.\n`);

  // 3. Pour chaque submission, compter les DISPLAY avec valeur
  console.log('╔═══════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  COMPARAISON DISPLAY PAR SUBMISSION                                                 ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║ Submission ID                         │ Status        │ Lead  │ OK/Cap │ Broken │ % ║');
  console.log('╠═══════════════════════════════════════╪═══════════════╪═══════╪════════╪════════╪═══╣');

  const allResults: Array<{
    subId: string;
    status: string;
    lead: string;
    okCount: number;
    brokenCount: number;
    brokenFields: string[];
    pct: number;
  }> = [];

  for (const sub of submissions) {
    const sds = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId: sub.id, nodeId: { in: displayIds } },
      select: { nodeId: true, value: true }
    });
    const sdMap = new Map(sds.map(sd => [sd.nodeId, sd.value]));
    
    let okCount = 0;
    let brokenCount = 0;
    const brokenFields: string[] = [];
    
    for (const n of displayWithCap) {
      const val = sdMap.get(n.id);
      const hasVal = val !== null && val !== undefined && val.trim() !== '' && val !== '∅';
      if (hasVal) {
        okCount++;
      } else {
        brokenCount++;
        brokenFields.push(n.label || n.id.slice(0, 12));
      }
    }
    
    const pct = displayWithCap.length > 0 ? Math.round((okCount / displayWithCap.length) * 100) : 0;
    const leadLabel = sub.leadId ? sub.leadId.slice(0, 5) : 'none';
    const statusLabel = sub.status?.padEnd(13) || '?'.padEnd(13);
    
    allResults.push({
      subId: sub.id,
      status: sub.status || '?',
      lead: leadLabel,
      okCount,
      brokenCount,
      brokenFields,
      pct
    });
    
    const pctStr = pct === 100 ? '100' : pct.toString().padStart(2);
    console.log(`║ ${sub.id.slice(0, 37).padEnd(37)} │ ${statusLabel} │ ${leadLabel.padEnd(5)} │ ${String(okCount).padStart(2)}/${String(displayWithCap.length).padStart(2)}  │ ${String(brokenCount).padStart(4)}   │${pctStr}%║`);
  }
  
  console.log('╚═══════════════════════════════════════╧═══════════════╧═══════╧════════╧════════╧═══╝\n');

  // 4. Afficher les champs BROKEN communs à toutes les submissions
  const alwaysBroken = displayWithCap.filter(n => {
    return allResults.every(r => r.brokenFields.includes(n.label || n.id.slice(0, 12)));
  });

  if (alwaysBroken.length > 0) {
    console.log(`🔴 ${alwaysBroken.length} champ(s) TOUJOURS BROKEN (dans TOUTES les submissions):\n`);
    for (const n of alwaysBroken) {
      const v = varByNode.get(n.id);
      const caps = [n.hasFormula && 'FORMULA', n.hasCondition && 'CONDITION', n.hasTable && 'TABLE', n.hasLink && 'LINK'].filter(Boolean).join(', ');
      console.log(`  🔴 "${n.label}" — ${n.id}`);
      console.log(`     caps: ${caps} | variable.sourceRef=${v?.sourceRef || 'NULL'} | inPipeline=${Boolean((v && v.sourceRef) || n.hasFormula)}`);
    }
    console.log('');
  }

  // 5. Champs BROKEN uniquement dans certaines submissions
  const sometimesBroken = displayWithCap.filter(n => {
    const label = n.label || n.id.slice(0, 12);
    const brokenIn = allResults.filter(r => r.brokenFields.includes(label)).length;
    return brokenIn > 0 && brokenIn < allResults.length;
  });

  if (sometimesBroken.length > 0) {
    console.log(`🟡 ${sometimesBroken.length} champ(s) BROKEN dans certaines submissions seulement:\n`);
    for (const n of sometimesBroken) {
      const label = n.label || n.id.slice(0, 12);
      const brokenSubs = allResults.filter(r => r.brokenFields.includes(label));
      console.log(`  🟡 "${label}" — broken dans ${brokenSubs.length}/${allResults.length} submissions`);
      for (const r of brokenSubs) {
        console.log(`     → ${r.subId.slice(0, 30)}… (${r.status}, lead=${r.lead})`);
      }
    }
    console.log('');
  }

  // 6. Champs sans capacité (pour info)
  const noCap = displayNodes.filter(n => !capIds.has(n.id));
  if (noCap.length > 0) {
    console.log(`⚪ ${noCap.length} DISPLAY sans aucune capacité (pas de calcul possible):`);
    for (const n of noCap) {
      console.log(`  ⚪ "${n.label}"`);
    }
  }

  console.log('\n✅ Diagnostic terminé.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
