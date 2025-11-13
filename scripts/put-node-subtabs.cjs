const fetch = require('node-fetch');

(async () => {
  const token = process.env.TOKEN;
  const orgId = process.env.ORGANIZATION_ID || '1757366075154-i554z93kl';
  const nodeId = process.argv[2] || '078f01ba-1b92-4d70-b92a-b09ac6b2741f';
  const treeId = process.argv[3] || 'cmf1mwoz10005gooked1j6orn';
  if (!token) {
    console.error('TOKEN env var required (run `npm run dev:token` to generate and export)');
    process.exit(1);
  }

  const url = `http://localhost:3000/api/treebranchleaf/trees/${treeId}/nodes/${nodeId}`;
  const body = {
    metadata: {
      subTab: 'test-subtab-1',
      subTabs: [
        { key: 'tab1', label: 'Tab 1' },
        { key: 'tab2', label: 'Tab 2' }
      ]
    }
  };

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-organization-id': orgId
      },
      body: JSON.stringify(body)
    });

    const result = await res.json();
    console.log('HTTP status:', res.status);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
})();
