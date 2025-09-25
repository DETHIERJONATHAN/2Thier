import React, { useEffect, useState } from 'react';

// Mapping local (doit être synchronisé avec AppLayout)
import DashboardPage from './DashboardPage';
import CRMPage from './CRMPage';
import GestionSAVPage from './GestionSAVPage';
import FormulaireLayout from './Formulaire/FormulaireLayout';

const modulePageMap = {
  dashboard: DashboardPage,
  crm: CRMPage,
  gestion_sav: GestionSAVPage,
  formulaire: FormulaireLayout, // Remplacé FormulaireRemplissageDemoPage par FormulaireLayout
  // Ajoute ici d’autres mappings si besoin
};

export default function DebugModulesPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/debug/modules', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(data => setModules(data.modules || []))
      .catch(e => setError(String(e)));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Modules (backend + mapping frontend)</h1>
      {error && <div className="text-red-600">Erreur: {error}</div>}
      <h2 className="text-lg font-semibold mt-4">Modules en base (API /api/debug/modules):</h2>
      <table className="mt-2 mb-6 border">
        <thead>
          <tr>
            <th className="border px-2">key</th>
            <th className="border px-2">label</th>
            <th className="border px-2">active</th>
            <th className="border px-2">Organisation</th>
          </tr>
        </thead>
        <tbody>
          {modules.map(m => (
            <tr key={m.key}>
              <td className="border px-2">{m.key}</td>
              <td className="border px-2">{m.label}</td>
              <td className="border px-2">{String(m.active)}</td>
              <td className="border px-2" style={{ 
                fontWeight: 'bold', 
                color: m.organizationName !== 'Global' ? '#cc0000' : '#333',
                backgroundColor: m.organizationName !== 'Global' ? '#f8f8f8' : 'inherit',
                padding: '6px 8px'
              }}>
                {m.key === 'a' ? <span style={{ color: '#0000cc' }}>United</span> : m.organizationName}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="text-lg font-semibold mt-4">Clés du mapping modulePageMap (frontend):</h2>
      <ul className="list-disc ml-6">
        {Object.keys(modulePageMap).map(k => (
          <li key={k}>{k}</li>
        ))}
      </ul>
    </div>
  );
}
