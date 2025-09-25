// Composant de remplissage de formulaire (FormulaireRemplissage) - preview dynamique du formulaire
import { useState, useEffect } from 'react';

// Ajout des types nécessaires qui étaient implicitement dans crmStore ou utilisés
// Ces types devraient idéalement être importés depuis un fichier de types partagé si disponible
interface FieldOption {
  id?: string | number;
  label: string;
}

interface Field {
  id: number; // ou string, selon votre modèle de données
  label: string;
  type: string;
  required?: boolean;
  width?: string;
  options?: FieldOption[];
  // Potentiellement d'autres propriétés comme 'value', etc.
}

interface Section {
  id: number; // ou string
  title: string;
  sectionType?: string;
  fields: Field[];
  // Potentiellement d'autres propriétés
}

interface Block {
  id: number; // ou string
  name?: string;
  sections: Section[];
  // Potentiellement d'autres propriétés
}

interface FormulaireRemplissageProps {
  formDefinition: {
    blocks: Block[];
  };
}

const FormulaireRemplissage: React.FC<FormulaireRemplissageProps> = ({ formDefinition }) => {
  // Utilise formDefinition.blocks au lieu de useCRMStore()
  const blocksFromProps = formDefinition.blocks;
  // On prend le premier block des props pour la logique existante,
  // ou on ajuste la logique si plusieurs blocks peuvent être passés/gérés.
  // Pour la prévisualisation d'une section, on s'attend souvent à un seul block filtré.
  const block = blocksFromProps && blocksFromProps.length > 0 ? blocksFromProps[0] : null;

  const [values, setValues] = useState<Record<string, any>>({});
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});
  // Ajout : stockage des formules par fieldId
  const [fieldFormulas, setFieldFormulas] = useState<Record<string, any[]>>({});

  // Chargement des formules pour tous les champs du formulaire au montage
  useEffect(() => {
    if (!block || !Array.isArray(block.sections)) {
      setFieldFormulas({}); // Reset si pas de block valide
      return;
    }
    const allFields = block.sections.flatMap(s => s.fields);
    Promise.all(
      allFields.map(async (field) => {
        const res = await fetch(`/api/fields/${field.id}/formulas`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        const formulas = await res.json();
        return { fieldId: field.id, formulas };
      })
    ).then(results => {
      const map: Record<string, any[]> = {};
      for (const { fieldId, formulas } of results) {
        map[fieldId] = formulas;
      }
      setFieldFormulas(map);
    });
  }, [block]);

  // Fermer toutes les sections par défaut au premier rendu ou changement de block
  useEffect(() => {
    if (block && Array.isArray(block.sections)) {
      const initial: Record<number, boolean> = {};
      block.sections.forEach(s => { initial[s.id] = false; });
      setOpenSections(initial);
    } else {
      setOpenSections({}); // Reset si pas de block valide
    }
  }, [block]);

  if (!block || !Array.isArray(block.sections) || block.sections.length === 0) {
    return <div className="text-gray-400 p-4">Aucune section à afficher pour l'aperçu.</div>;
  }

  const handleChange = (fieldId: string | number, value: any) => { // fieldId peut être string ou number
    setValues(v => ({ ...v, [fieldId]: value }));
  };

  // Fonction pour toggle l'ouverture d'une section
  const toggleSection = (sectionId: number) => { // Modifié: sectionId est maintenant number
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Fonction pour savoir si une section est validée (tous les champs obligatoires sont remplis)
  const isSectionValid = (section: Section) => { // Type plus précis pour section
    if (!Array.isArray(section.fields)) return false;
    // Pour l'utilisateur final, un champ obligatoire est "rempli" si sa valeur n'est pas vide
    return section.fields.filter((f: Field) => f.required).every((f: Field) => { // Type plus précis pour f
      const val = values[String(f.id)]; // Assurer que l'accès à values se fait avec une clé string
      if (f.type === 'select') return val && val !== '';
      if (f.type === 'number') return val !== undefined && val !== '' && !isNaN(val);
      return val !== undefined && val !== '';
    });
  };

  // Fonction utilitaire pour évaluer une formule (version simple, supporte +, -, *, /, parenthèses)
  function evalFormula(formulaArr: any[], currentValues: Record<string, any>) { // Renommé values en currentValues pour éviter conflit
    if (!Array.isArray(formulaArr) || formulaArr.length === 0) return '';
    // On convertit la formule en string JS safe
    let expr = '';
    for (const item of formulaArr) {
      if (item.type === 'field') {
        const v = currentValues[String(item.value)] ?? 0; // Accès avec String(item.value)
        expr += (typeof v === 'number' || /^\d+(\\.\\d+)?$/.test(v)) ? v : `0`;
      } else if (item.type === 'operator') {
        if (item.value === '×') expr += '*';
        else if (item.value === '÷') expr += '/';
        else if (item.value === 'ET') expr += '&&';
        else if (item.value === 'OU') expr += '||';
        else if (item.value === 'SI') expr += '?'; // à améliorer pour les SI imbriqués
        else expr += item.value;
      } else if (item.type === 'paren') {
        expr += item.value;
      }
    }
    try {
      // eslint-disable-next-line no-eval
      // On limite l’éval à des cas simples (pas de fonctions, pas d’accès global)
      // Pour la prod, utiliser un parser dédié !
      // eslint-disable-next-line no-new-func
      // @ts-ignore
      return Function('return (' + expr + ')')();
    } catch {
      return '';
    }
  }

  // --- VALIDATION DE TYPE DE FORMULE ---
  function validateFormulaTypes(
    formulaArr: Array<{ type: string; value: string }>,
    sections: Array<{ fields: Array<{ id: string | number; type: string }> }>
  ): { valid: boolean; error?: string; suggestion?: string } {
    const getFieldType = (fieldId: string | number) => {
      for (const section of sections) {
        const field = section.fields?.find((f: { id: string | number; type: string }) => String(f.id) === String(fieldId));
        if (field) return field.type;
      }
      return null;
    };
    let lastType = null;
    for (const item of formulaArr) {
      if (item.type === 'field') {
        const t = getFieldType(item.value);
        if (!t) return { valid: false, error: `Champ inconnu dans la formule (#${item.value})` };
        // Empêcher l'utilisation de champs non numériques dans une formule arithmétique
        if (["+", "-", "×", "÷", "*", "/", "%"].some(op => formulaArr.some(i => i.type === 'operator' && i.value === op))) {
          if (t !== 'number') {
            return {
              valid: false,
              error: `Le champ #${item.value} n'est pas de type numérique (type actuel : ${t}). Seuls les champs de type 'Nombre' peuvent être utilisés dans une formule de calcul.`,
              suggestion: `Remplacez ce champ par un champ de type 'Nombre' ou modifiez la formule.`
            };
          }
        }
        if (!lastType) lastType = t;
        if (lastType !== t) {
          if ((lastType === 'number' && t === 'number') || (lastType === 'text' && t === 'text')) continue;
          return { valid: false, error: `Types incompatibles dans la formule : ${lastType} et ${t}` };
        }
      }
    }
    return { valid: true };
  }

  // Nouvelle fonction utilitaire pour récupérer les options persistées (FieldOption[])
  const getOptions = (field: any) => {
    // Priorité à field.FieldOption (retour Prisma/API), fallback sur field.options (legacy ou compatibilité)
    if (Array.isArray(field.FieldOption) && field.FieldOption.length > 0) return field.FieldOption;
    if (Array.isArray(field.options) && field.options.length > 0) return field.options;
    return [];
  };

  return (
    <div className="p-4">
      <h2 className="font-semibold mb-2">Aperçu du formulaire</h2>
      {block.sections.map(section => {
        const sectionValid = isSectionValid(section);
        const isOpen = openSections[section.id] ?? true; // Accès avec section.id
        return (
          <div
            key={section.id}
            className={`bg-gray-50 border rounded p-4 mb-6 transition-colors duration-200 ${sectionValid ? 'border-green-500 bg-green-50' : ''}`}
          >
            <div className="flex justify-between items-center mb-2 cursor-pointer select-none" onClick={() => toggleSection(section.id)}>
              <div className="flex items-center gap-2">
                <span className="badge badge-outline mr-2">{section.sectionType}</span>
                <span className="font-bold">{section.title}</span>
                {sectionValid && <span className="ml-2 text-green-600 font-bold">✔</span>}
              </div>
              <span className="text-xl transition-transform duration-200" style={{transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)'}}>{isOpen ? '▼' : '▶'}</span>
            </div>
            <div
              className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
            >
              {isOpen && (
                <div className="grid grid-cols-4 gap-4">
                  {section.fields.map(field => {
                    // Mapping width -> col-span
                    let colSpan = 'col-span-4';
                    if (field.width === '1/2') colSpan = 'col-span-2';
                    else if (field.width === '1/4') colSpan = 'col-span-1';
                    else if (field.width === '3/4') colSpan = 'col-span-3';
                    else if (field.width === '1/1') colSpan = 'col-span-4';
                    
                    const formulas = fieldFormulas[String(field.id)] || [];
                    const firstFormula = formulas.length > 0 ? formulas[0] : null;
                    
                    const formulaTitle = firstFormula?.title;
                    const formulaDescription = firstFormula?.description;
                    
                    let formulaResult = '';
                    let parsedFormulaItems: any[] = []; 

                    if (firstFormula && firstFormula.formula) {
                      const parseFormulaString = (str: string): Array<{type: string, value: string}> => {
                        if (!str || typeof str !== 'string') return [];
                        // Correction: Utiliser JSON.parse pour parser la formule stockée en format JSON string
                        try {
                          const parsedSeq = JSON.parse(str);
                          if (Array.isArray(parsedSeq)) {
                            // Transformer la séquence en tokens simples pour evalFormula et validateFormulaTypes
                            // Ceci est une simplification, l'idéal serait que evalFormula et validateFormulaTypes
                            // comprennent directement le format de la séquence.
                            const tokens: Array<{type: string, value: string}> = [];
                            parsedSeq.forEach(item => {
                              if (item === null) return; // Ignorer les nulls (dropzones vides)
                              if (item.type === 'field') {
                                tokens.push({ type: 'field', value: String(item.fieldId) });
                              } else if (item.type === 'fixed') {
                                // Tenter de convertir en nombre si possible, sinon garder comme chaîne
                                const numVal = parseFloat(item.value);
                                tokens.push({ type: 'fixed', value: isNaN(numVal) ? item.value : String(numVal) });
                              } else if (item.type === 'operator') {
                                tokens.push({ type: 'operator', value: item.op });
                              }
                              // Ajouter d'autres types si nécessaire (fonctions avancées, etc.)
                            });
                            return tokens;
                          }
                        } catch (e) {
                          console.error("Erreur de parsing de la formule JSON:", e);
                          return [{ type: 'unknown', value: str }]; // Erreur de parsing
                        }
                        return [{ type: 'unknown', value: str }]; // Fallback si pas un array
                      };
                      parsedFormulaItems = parseFormulaString(firstFormula.formula);
                      if (parsedFormulaItems.length > 0 && !parsedFormulaItems.some(item => item.type === 'unknown')) {
                        formulaResult = evalFormula(parsedFormulaItems, values);
                      } else {
                        if (parsedFormulaItems.some(item => item.type === 'unknown')) {
                            parsedFormulaItems = []; 
                        }
                      }
                    }

                    // Configuration des couleurs du champ
                    const fieldConfig = (field as any).advancedConfig || {};
                    const fieldStyle = {
                      backgroundColor: fieldConfig.color || undefined,
                      color: fieldConfig.textColor || undefined,
                    };

                    return (
                      <div key={field.id} className={`flex flex-col ${colSpan}`}>
                        <label className="font-medium mb-1 flex items-center gap-1">
                          {fieldConfig.icon && <span>{fieldConfig.icon}</span>}
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        
                        {field.type === 'text' && (
                          <input 
                            className="border rounded px-2 py-1" 
                            style={fieldStyle}
                            placeholder={fieldConfig.placeholder || field.label} 
                            value={values[String(field.id)] || ''} 
                            onChange={e => handleChange(String(field.id), e.target.value)} 
                          />
                        )}
                        {field.type === 'number' && (
                          <input 
                            type="number" 
                            className="border rounded px-2 py-1" 
                            style={fieldStyle}
                            placeholder={fieldConfig.placeholder || field.label} 
                            value={values[String(field.id)] || ''} 
                            onChange={e => handleChange(String(field.id), e.target.value)} 
                          />
                        )}
                        {field.type === 'date' && (
                          <input 
                            type="date" 
                            className="border rounded px-2 py-1" 
                            style={fieldStyle}
                            value={values[String(field.id)] || ''} 
                            onChange={e => handleChange(String(field.id), e.target.value)} 
                          />
                        )}
                        {field.type === 'select' && (
                          <select 
                            className="border rounded px-2 py-1" 
                            style={fieldStyle}
                            value={values[String(field.id)] || ''} 
                            onChange={e => handleChange(String(field.id), e.target.value)}
                          >
                            <option value="">Sélectionner...</option>
                            {getOptions(field).map((opt: any, idx: number) => (
                              <option key={opt.id || idx} value={opt.label}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                        {field.type === 'checkboxes' && getOptions(field).length > 0 && (
                          <div className="flex flex-col gap-1" style={fieldStyle}>
                            {getOptions(field).map((opt: any, idx: number) => (
                              <label key={opt.id || idx} className="inline-flex items-center gap-2" style={{ color: fieldStyle.color }}>
                                <input
                                  type="checkbox"
                                  checked={Array.isArray(values[String(field.id)]) ? values[String(field.id)].includes(opt.label) : false}
                                  onChange={e => {
                                    const prev = Array.isArray(values[String(field.id)]) ? values[String(field.id)] : [];
                                    if (e.target.checked) {
                                      handleChange(String(field.id), [...prev, opt.label]);
                                    } else {
                                      handleChange(String(field.id), prev.filter((v: string) => v !== opt.label));
                                    }
                                  }}
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                        )}
                        {field.type === 'radio' && getOptions(field).length > 0 && (
                          <div className="flex flex-col gap-1" style={fieldStyle}>
                            {getOptions(field).map((opt: any, idx: number) => (
                              <label key={opt.id || idx} className="inline-flex items-center gap-2" style={{ color: fieldStyle.color }}>
                                <input
                                  type="radio"
                                  name={`radio-${field.id}`}
                                  checked={values[String(field.id)] === opt.label}
                                  onChange={() => handleChange(String(field.id), opt.label)}
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                        )}
                        {/* Affichage du titre de la formule APRES le champ et AVANT le résultat */}
                        {formulaTitle && parsedFormulaItems.length > 0 && (
                          <div className="mb-1 text-xs mt-1">
                            <span 
                              className="text-blue-700 font-semibold cursor-help"
                              title={formulaDescription || undefined}
                            >
                              {formulaTitle}
                            </span>
                          </div>
                        )}

                        {['image_admin','image_user'].includes(field.type) && ((field as any).advancedConfig?.imageUrl) && (
                          <img
                            src={(field as any).advancedConfig.imageUrl}
                            alt={field.label}
                            style={{
                              objectFit: 'contain',
                              width: '100%',
                              height: 'auto',
                              maxHeight: '200px',
                              display: 'block',
                              margin: '0 auto',
                              borderRadius: '0.375rem', // arrondi comme tailwind rounded
                              boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)', // shadow comme tailwind
                              border: '1px solid #e5e7eb' // border comme tailwind
                            }}
                            className="mt-2"
                          />
                        )}

                        {parsedFormulaItems.length > 0 && !parsedFormulaItems.some(item => item.type === 'unknown') ? (
                          (() => {
                            const validation = validateFormulaTypes(parsedFormulaItems, section.fields ? [section] : []);
                            if (!validation.valid) {
                              return (
                                <div className="text-xs text-red-600 mt-1">
                                  <b>Erreur dans la formule :</b> {validation.error}
                                </div>
                              );
                            }
                            return values && Object.keys(values).some(k => values[k] !== '' && values[k] !== undefined) ? (
                              <div className="text-xs text-green-700 mt-1">
                                <b>Résultat :</b> {String(formulaResult)}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500 mt-1">
                                <b>Résultat :</b> <span className="italic">Aucune valeur saisie</span>
                              </div>
                            );
                          })()
                        ) : (
                          firstFormula && firstFormula.formula && (
                            <div className="text-xs text-red-600 mt-1">
                              <b>Erreur dans la formule :</b> champ inconnu ou syntaxe invalide<br />
                              <span className="underline cursor-pointer text-blue-700 hover:text-blue-900" onClick={() => window && window.scrollTo && window.scrollTo({top:0, behavior:'smooth'})}>
                                Corriger la formule dans l’onglet « Formule »
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {/* Affichage du state pour debug/test */}
      {/* <pre className="bg-gray-100 text-xs p-2 mt-4 rounded">{JSON.stringify(values, null, 2)}</pre> */}
    </div>
  );
};

export default FormulaireRemplissage;
