const fetch = require('node-fetch');

(async () => {
  const token = process.env.TOKEN;
  const orgId = process.env.ORGANIZATION_ID || '1757366075154-i554z93kl';
  const nodeId = process.argv[2] || '078f01ba-1b92-4d70-b92a-b09ac6b2741f';
  const treeId = process.argv[3] || 'cmf1mwoz10005gooked1j6orn';
  const subTab = process.argv[4] || 'verify-cascade';
  if (!token) {
    console.error('TOKEN env var required (run `npm run dev:token` to generate and export)');
    process.exit(1);
  }

  try {
    const url = `http://localhost:3000/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`;
    const body = { metadata: { subTab, subTabs: [subTab] }, cascadeSubTab: true };
    const putRes = await fetch(url, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-organization-id': orgId }, body: JSON.stringify(body)
    });
    const putJson = await putRes.json();
    console.log('PUT status:', putRes.status, 'node:', putJson?.id);

    // Now fetch nodes and print those matching the subTab
    const getUrl = `http://localhost:3000/api/treebranchleaf/trees/${treeId}/nodes`;
    const getRes = await fetch(getUrl, { headers: { 'Authorization': `Bearer ${token}`, 'x-organization-id': orgId } });
    const nodes = await getRes.json();
    if (!Array.isArray(nodes)) {
      console.log('GET response not an array:', nodes);
      return;
    }
    const matches = nodes.filter(n => (n.subtab || (n.metadata && (n.metadata.subTab || n.metadata.subtab))) === subTab);
    console.log('Nodes with subTab =', subTab, 'count:', matches.length);
    console.log(JSON.stringify(matches.map(m => ({ id: m.id, label: m.label, subtab: m.subtab, metadata: m.metadata })), null, 2));

  } catch (e) {
    console.error('Error verify-subtabs-cascade:', e);
  }
})();
