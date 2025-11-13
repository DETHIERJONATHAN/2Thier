const fetch = require('node-fetch');
(async() => {
  try {
    const res = await fetch('http://localhost:4000/api/treebranchleaf/trees/cmf1mwoz10005gooked1j6orn/nodes');
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text.substring(0, 2000));
  } catch (e) {
    console.error('Error requesting nodes:', e);
  }
})();
