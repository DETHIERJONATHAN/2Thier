import React, { useState } from 'react';

interface Template {
  name: string;
  data: any;
}

const LOCAL_STORAGE_KEY = 'fieldBuilderTemplates';

function loadTemplates(): Template[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveTemplates(templates: Template[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates));
}

const TemplatesManager: React.FC<{ block: any; onLoad: (data: any) => void }> = ({ block, onLoad }) => {
  const [templates, setTemplates] = useState<Template[]>(loadTemplates());
  const [templateName, setTemplateName] = useState('');

  function handleSave() {
    if (!templateName.trim()) return;
    const newTemplates = [...templates, { name: templateName, data: block }];
    setTemplates(newTemplates);
    saveTemplates(newTemplates);
    setTemplateName('');
  }

  function handleLoad(template: Template) {
    onLoad(template.data);
  }

  function handleDelete(name: string) {
    const newTemplates = templates.filter(t => t.name !== name);
    setTemplates(newTemplates);
    saveTemplates(newTemplates);
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1 text-sm" placeholder="Nom du template" value={templateName} onChange={e => setTemplateName(e.target.value)} />
        <button className="bg-green-600 text-white px-3 py-1 rounded text-sm" onClick={handleSave}>Sauvegarder</button>
      </div>
      <div className="flex flex-col gap-1 mt-2">
        {templates.length === 0 && <span className="text-xs text-gray-400">Aucun template enregistré</span>}
        {templates.map(t => (
          <div key={t.name} className="flex items-center gap-2 text-xs bg-gray-100 rounded px-2 py-1">
            <span className="font-semibold">{t.name}</span>
            <button className="ml-auto text-blue-600 hover:underline" onClick={() => handleLoad(t)}>Charger</button>
            <button className="text-red-500 hover:underline" onClick={() => handleDelete(t.name)}>Suppr.</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplatesManager;
