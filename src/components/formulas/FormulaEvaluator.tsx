import React, { useEffect, useMemo, useState } from 'react';
import type { Formula, FormulaItem } from "../../store/slices/types";
import useCRMStore from '../../store';
import { evaluateFormula } from '../../utils/formulaEvaluator';
import { adaptFormulaForEvaluation } from '../../utils/formulaAdapter';

interface FormulaEvaluatorProps { formula: Formula; }
interface ConditionInfo { index: number; expression: string; pass: boolean; thenResult?: number | boolean | string | null; elseResult?: number | boolean | string | null; }

const FormulaEvaluator: React.FC<FormulaEvaluatorProps> = ({ formula }) => {
  // Extraire les informations des champs et valeurs par défaut
  // Extraction complète de tous les champs (racine + condition + branches)
  interface FieldGrouping {
    all: string[];
    main: string[];
    condition: string[];
    then: string[];
    else: string[];
    labels: Record<string,string>;
  }
  const blocks = useCRMStore(s => s.blocks);

  const findFormulaById = React.useCallback((id: string): Formula | undefined => {
    for (const b of blocks) for (const s of b.sections) for (const fld of s.fields) {
      const found = (fld.formulas || []).find(ff => ff.id === id);
      if (found) return found as Formula;
    }
    return undefined;
  }, [blocks]);

  const collectFormulaRefFields = React.useCallback((refId: string, sets: { all:Set<string>; main:Set<string>; condition:Set<string>; then:Set<string>; else:Set<string>; }, labels: Record<string,string>, depth: number, visited: Set<string>, context: 'main'|'condition'|'then'|'else') => {
    if (!refId || depth>5 || visited.has(refId)) return; // limite profondeur
    visited.add(refId);
    const ref = findFormulaById(refId);
    if (!ref) return;
    for (const it of ref.sequence || []) {
      if (!it) continue;
  if (it.type==='field') {
        const fid = it.fieldId || (typeof it.value==='string'? it.value: undefined);
        if (fid) { sets.all.add(fid); sets[context].add(fid); labels[fid]= labels[fid]|| it.label || fid; }
      } else if (it.type==='adv_part') {
        if (it.fieldId) { sets.all.add(it.fieldId); sets[context].add(it.fieldId); labels[it.fieldId]= labels[it.fieldId]|| it.label || it.fieldId; }
      } else if (it.type==='formula_ref' && it.refFormulaId) {
        collectFormulaRefFields(it.refFormulaId, sets, labels, depth+1, visited, context);
      } else if (it.type==='cond') {
        // Recurse inside branches
        [...(it.condExpr||[]), ...(it.then||[]), ...(it.else||[])]?.forEach(sub=>{
          if (sub?.type==='formula_ref' && sub.refFormulaId) collectFormulaRefFields(sub.refFormulaId, sets, labels, depth+1, visited, context);
          if (sub?.type==='field') {
            const fid = sub.fieldId || (typeof sub.value==='string'? sub.value: undefined);
            if (fid) { sets.all.add(fid); sets[context].add(fid); labels[fid]= labels[fid]|| sub.label || fid; }
          }
          if (sub?.type==='adv_part' && sub.fieldId) { sets.all.add(sub.fieldId); sets[context].add(sub.fieldId); labels[sub.fieldId]= labels[sub.fieldId]|| sub.label || sub.fieldId; }
        });
      }
    }
  }, [findFormulaById]);

  const buildFieldGrouping = React.useCallback((f: Formula): FieldGrouping => {
    const sets = {
      all: new Set<string>(),
      main: new Set<string>(),
      condition: new Set<string>(),
      then: new Set<string>(),
      else: new Set<string>()
    };
    const labels: Record<string,string> = {};
    const visit = (items: FormulaItem[]|undefined, context: 'main'|'condition'|'then'|'else') => {
      if (!Array.isArray(items)) return;
      for (const it of items) {
        if (!it) continue;
        const pushField = (fid?: string, label?: string) => {
          if (!fid) return;
            sets.all.add(fid);
            sets[context].add(fid);
            if (!labels[fid]) labels[fid] = label || fid;
        };
        if (it.type === 'field') pushField(it.fieldId || (typeof it.value === 'string'? it.value: undefined), it.label);
        if (it.type === 'adv_part') pushField(it.fieldId, it.label);
        if (it.type === 'formula_ref' && it.refFormulaId) { collectFormulaRefFields(it.refFormulaId, sets, labels, 0, new Set(), context); continue; }
        if (it.type === 'cond') { visit(it.condExpr, 'condition'); visit(it.then, 'then'); visit(it.else, 'else'); continue; }
        if (it.type === 'switch') {
          // considérer les champs de switchFieldId comme condition
          pushField(it.switchFieldId, it.label);
          (it.cases||[]).forEach((c)=> visit(c.seq as FormulaItem[], context));
          visit(it.defaultSeq, context);
        }
      }
    };
    visit(f.sequence, 'main');
    return {
      all: Array.from(sets.all),
      main: Array.from(sets.main),
      condition: Array.from(sets.condition),
      then: Array.from(sets.then),
      else: Array.from(sets.else),
      labels
    };
  }, [collectFormulaRefFields]);
  const grouping = useMemo(()=> buildFieldGrouping(formula), [formula, buildFieldGrouping]);
  const [fieldValues, setFieldValues] = useState<Record<string, number>>(()=>{
    const init: Record<string, number> = {};
    grouping.all.forEach(fid => { init[fid] = 0; });
    return init;
  });

  // Synchroniser lorsque de nouveaux champs apparaissent (ne pas écraser ceux déjà saisis)
  useEffect(()=>{
    setFieldValues(prev => {
      let changed = false; const next = { ...prev };
      grouping.all.forEach(fid => { if (typeof next[fid]==='undefined') { next[fid]=0; changed=true; } });
      return changed ? next : prev;
    });
  }, [grouping.all]);

  // Déterminer les infos de chaque condition (expression + branche active)
  const conditionInfos: ConditionInfo[] = useMemo(()=>{
    const infos: ConditionInfo[] = [];
    formula.sequence.forEach((it, idx)=>{
      if (it.type==='cond') {
        // Construire expression
        let expr = '';
        if (it.condExpr && it.condExpr.length>0) {
          expr = it.condExpr.map(tok => {
            if (tok.type==='field') return (grouping.labels[tok.fieldId|| (typeof tok.value==='string'? tok.value: '')] || tok.label || tok.fieldId || tok.value || '');
            if (tok.type==='operator') return String(tok.value || tok.label || '');
            if (tok.type==='value') {
              const raw = typeof tok.value==='string'? tok.value: tok.value;
              if (tok.label) return String(tok.label);
              if (typeof raw==='string' && raw.startsWith('nextField:')) return 'Champ suivant';
              return String(raw);
            }
            if (tok.type==='adv_part') return (grouping.labels[tok.fieldId||'']||tok.label||tok.fieldId||'');
            return '';
          }).join(' ');
        } else if (it.condition) {
          const fid = it.condition.fieldId;
          const label = grouping.labels[fid] || fid;
          expr = `${label} ${it.condition.operator||'='} ${it.condition.value}`;
        }
        // Evaluer pass/fail minimal (réutiliser evaluateFormula sur condExpr si présente)
        let pass = false; let thenResult: number | boolean | string | null | undefined; let elseResult: number | boolean | string | null | undefined;
        try {
          if (it.condExpr && it.condExpr.length>0) {
            const temp: Formula = { id:`cond_expr_preview_${idx}`, name:'', targetProperty:'', sequence: it.condExpr };
            const adapted = adaptFormulaForEvaluation(temp);
            if (adapted) {
              const r = evaluateFormula(adapted as unknown as Formula, fieldValues);
              pass = Boolean(r.result);
            } else {
              pass = false;
            }
          } else if (it.condition) {
            // simple comparaison: on ne possède pas rawValues ici, utiliser fieldValues
            const v = fieldValues[it.condition.fieldId];
            const cmpVal = it.condition.value as number | string;
            switch(it.condition.operator){
              case '>': pass = v > cmpVal; break;
              case '>=': pass = v >= cmpVal; break;
              case '<': pass = v < cmpVal; break;
              case '<=': pass = v <= cmpVal; break;
              case '!=': pass = String(v) !== String(cmpVal); break;
              case '=':
              default: pass = String(v) === String(cmpVal); break;
            }
          }
          if (it.then && it.then.length>0) {
            const tempThen: Formula = { id:`then_sim_${idx}`, name:'', targetProperty:'', sequence: it.then };
            const adaptedThen = adaptFormulaForEvaluation(tempThen);
            if (adaptedThen) {
              const rThen = evaluateFormula(adaptedThen as unknown as Formula, fieldValues);
              thenResult = rThen.result;
            }
          }
          if (it.else && it.else.length>0) {
            const tempElse: Formula = { id:`else_sim_${idx}`, name:'', targetProperty:'', sequence: it.else };
            const adaptedElse = adaptFormulaForEvaluation(tempElse);
            if (adaptedElse) {
              const rElse = evaluateFormula(adaptedElse as unknown as Formula, fieldValues);
              elseResult = rElse.result;
            }
          }
        } catch { pass = false; }
        infos.push({ index: idx, expression: expr, pass, thenResult, elseResult });
      }
    });
    return infos;
  }, [formula, fieldValues, grouping.labels]);
  
  // Simple (main) sequence calculation (exclude cond blocks)
  const simpleSequence = useMemo(()=> formula.sequence.filter(it => it.type !== 'cond'), [formula]);
  const simpleEvaluation = useMemo(()=>{
    if (!simpleSequence.length) return null;
    const temp: Formula = { ...formula, id: formula.id + '_simple', sequence: simpleSequence };
    const adapted = adaptFormulaForEvaluation(temp);
    return evaluateFormula(adapted, fieldValues);
  }, [formula, simpleSequence, fieldValues]);

  // Adapter la formule pour l'évaluation
  const adaptedFormula = adaptFormulaForEvaluation(formula);
  
  // Évaluer la formule avec les valeurs actuelles
  const evaluation = evaluateFormula(adaptedFormula, fieldValues);
  
  // Mettre à jour la valeur d'un champ
  const handleFieldValueChange = (fieldId: string, value: string) => {
    const numericValue = parseFloat(value);
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: isNaN(numericValue) ? 0 : numericValue
    }));
  };

  // Si pas de champs à tester
  if (grouping.all.length === 0) {
    return (
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-700">
          Cette formule ne contient pas de champs à évaluer.
        </p>
      </div>
    );
  }
  
  // Helper render field inputs for a list
  const renderFieldInputs = (list: string[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {list.map(fid => (
        <div key={fid}>
          <label className="block text-xs font-medium text-gray-600 mb-1" title={fid}>{grouping.labels[fid] || fid}</label>
          <input
            type="number"
            value={fieldValues[fid]}
            onChange={(e) => handleFieldValueChange(fid, e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-blue-50 p-3 border-b border-blue-100">
        <h3 className="text-sm font-medium text-blue-800">
          Test complet de la formule
        </h3>
        <p className="text-xs text-blue-600 mt-1">
          4 volets : Calcul simple, Condition(s), Résultat ALORS, Résultat SINON + résultat final.
        </p>
      </div>
      <div className="p-3 bg-white space-y-4">
        {/* 1. CALCUL SIMPLE */}
        <section className="border rounded-md p-3 bg-gray-50 border-gray-200">
          <h4 className="text-xs font-semibold uppercase text-gray-700 mb-2">1. Calcul simple (séquence hors conditions)</h4>
          {grouping.main.length ? renderFieldInputs(grouping.main) : <p className="text-[11px] text-gray-500">Aucun élément simple (tout est conditionnel).</p>}
          {simpleEvaluation && (
            <div className={`mt-3 p-2 rounded text-xs ${simpleEvaluation.success? 'bg-green-50 border border-green-200':'bg-red-50 border border-red-200'}`}>
              <span className="font-semibold">Résultat calcul simple : </span>
              <span>{simpleEvaluation.success ? String(simpleEvaluation.result) : 'Erreur'}</span>
            </div>
          )}
        </section>

        {/* 2. CONDITIONS */}
        <section className="border rounded-md p-3 bg-indigo-50 border-indigo-200">
          <h4 className="text-xs font-semibold uppercase text-indigo-700 mb-2">2. Condition(s) (TEST)</h4>
          {!conditionInfos.length && <p className="text-[11px] text-indigo-600">Aucune condition.</p>}
          {grouping.condition.length>0 && (
            <div className="mb-3">
              <h5 className="text-[10px] font-semibold uppercase text-indigo-600 mb-1">Champs utilisés dans les expressions</h5>
              {renderFieldInputs(grouping.condition)}
            </div>
          )}
          <div className="space-y-2">
            {conditionInfos.map(ci => (
              <div key={ci.index} className="bg-white rounded border border-indigo-200 p-2 text-[11px]">
                <div className="flex justify-between mb-1">
                  <span className="font-medium truncate" title={ci.expression}>{ci.expression || '(condition vide)'}</span>
                  <span className={`px-1 rounded text-white ${ci.pass? 'bg-green-500':'bg-red-500'}`}>{ci.pass? 'VRAI':'FAUX'}</span>
                </div>
                <div className="flex gap-2 text-[10px]">
                  <span className={`px-1 rounded ${ci.pass? 'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>ALORS {ci.pass? 'ACTIF':'IGNORÉ'}</span>
                  <span className={`px-1 rounded ${!ci.pass? 'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>SINON {!ci.pass? 'ACTIF':'IGNORÉ'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. THEN RESULTS */}
        <section className="border rounded-md p-3 bg-green-50 border-green-200">
          <h4 className="text-xs font-semibold uppercase text-green-700 mb-2">3. Résultat ALORS (THEN)</h4>
          {grouping.then.length>0 ? (
            <>
              <div className="mb-2"><h5 className="text-[10px] font-semibold uppercase text-green-600 mb-1">Champs utilisés</h5>{renderFieldInputs(grouping.then)}</div>
              {conditionInfos.map(ci => (
                <div key={ci.index} className="text-[11px] bg-white border border-green-200 rounded p-2 mb-2">
                  <div className="flex justify-between mb-1"><span className="font-medium">Condition #{ci.index+1}</span><span className={`px-1 rounded ${ci.pass? 'bg-green-600 text-white':'bg-gray-300 text-gray-700'}`}>{ci.pass? 'ACTIF':'IGNORÉ'}</span></div>
                  <div>Valeur simulée THEN : <strong>{ci.thenResult===undefined? '—' : String(ci.thenResult)}</strong></div>
                </div>
              ))}
            </>
          ) : <p className="text-[11px] text-green-700">Aucune branche THEN.</p>}
        </section>

        {/* 4. ELSE RESULTS */}
        <section className="border rounded-md p-3 bg-orange-50 border-orange-200">
          <h4 className="text-xs font-semibold uppercase text-orange-700 mb-2">4. Résultat SINON (ELSE)</h4>
          {grouping.else.length>0 ? (
            <>
              <div className="mb-2"><h5 className="text-[10px] font-semibold uppercase text-orange-600 mb-1">Champs utilisés</h5>{renderFieldInputs(grouping.else)}</div>
              {conditionInfos.map(ci => (
                <div key={ci.index} className="text-[11px] bg-white border border-orange-200 rounded p-2 mb-2">
                  <div className="flex justify-between mb-1"><span className="font-medium">Condition #{ci.index+1}</span><span className={`px-1 rounded ${!ci.pass? 'bg-orange-600 text-white':'bg-gray-300 text-gray-700'}`}>{!ci.pass? 'ACTIF':'IGNORÉ'}</span></div>
                  <div>Valeur simulée ELSE : <strong>{ci.elseResult===undefined? '—' : String(ci.elseResult)}</strong></div>
                </div>
              ))}
            </>
          ) : <p className="text-[11px] text-orange-700">Aucune branche ELSE.</p>}
        </section>

        {/* 5. Résultat final */}
        <section className="border rounded-md p-3 bg-gray-100 border-gray-300">
          <h4 className="text-xs font-semibold uppercase text-gray-700 mb-2">5. Résultat final de la formule</h4>
          <div className={`p-3 rounded-md text-sm ${evaluation.success ? 'bg-white border border-green-300' : 'bg-red-50 border border-red-300'}`}>
            {evaluation.success ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-green-700">{typeof evaluation.result === 'boolean' ? (evaluation.result ? 'Vrai' : 'Faux') : evaluation.result}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-700">Type: {typeof evaluation.result}</span>
              </div>
            ) : (
              <div className="text-red-700 text-xs space-y-1">
                <div>Erreur: {evaluation.error || 'Erreur inconnue'}</div>
                {evaluation.error && /divis/i.test(evaluation.error) && (
                  <div className="text-[10px] text-red-600 bg-red-100/60 px-2 py-1 rounded">
                    Astuce: vérifiez que le dénominateur n'est pas 0 (ajustez les champs concernés ou la branche ignorée ne doit pas provoquer une division par 0).
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 6. Debug détaillé */}
        <details className="border rounded-md p-3 bg-white border-gray-200" open>
          <summary className="cursor-pointer text-xs font-semibold text-gray-700">Étapes de calcul (debug)</summary>
          <div className="mt-2 bg-gray-50 border border-gray-200 rounded-md overflow-hidden"><div className="max-h-40 overflow-y-auto">
            <table className="w-full text-left text-xs"><thead className="bg-gray-100"><tr><th className="px-2 py-1">Étape</th><th className="px-2 py-1">Opération</th><th className="px-2 py-1">Résultat</th></tr></thead><tbody>
              {evaluation.debug.map((step, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-2 py-1 whitespace-nowrap">{step.step}</td>
                  <td className="px-2 py-1">{step.operation}</td>
                  <td className="px-2 py-1 font-mono">{step.value === null ? '-' : typeof step.value === 'boolean' ? (step.value ? 'Vrai' : 'Faux') : step.value}</td>
                </tr>
              ))}
            </tbody></table></div></div>
        </details>
      </div>
    </div>
  );
};

export default FormulaEvaluator;


