import { useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { useTblSubmission as useTblSubmissionCore } from '../../../../hooks/useTblSubmission';

export type TblSubmissionState = {
  submissionId: string | null;
  status: 'draft' | 'completed';
  data: Record<string, string | null>;
  calculatedData: Record<string, string | null>;
};

// Wrapper de compatibilité pour le nouveau hook central basé sur staging/preview/commit
export function useTblSubmission(treeId: string) {
  const core = useTblSubmissionCore({ initialTreeId: treeId, debounceMs: 500 });

  // Conserver une forme d'état compatible avec l'ancien appelant (TblContainer)
  const [state, setState] = useState<TblSubmissionState>({
    submissionId: core.submissionId,
    status: 'draft',
    data: {},
    calculatedData: {}
  });

  // Suivre l'ID de soumission exposé par le hook central
  useEffect(() => {
    if (core.submissionId !== state.submissionId) {
      setState(s => ({ ...s, submissionId: core.submissionId }));
    }
  }, [core.submissionId, state.submissionId]);

  // Définir une valeur utilisateur → staging + preview (debounced dans le hook central)
  const setValue = useCallback((nodeId: string, value: unknown) => {
    setState(prev => ({ ...prev, data: { ...prev.data, [nodeId]: value == null ? '' : String(value) } }));
    core.setField(nodeId, value);
  }, [core]);

  // Définir une valeur calculée → même traitement (staging côté serveur)
  const setCalculatedValue = useCallback((nodeId: string, calculatedValue: unknown) => {
    setState(prev => ({ ...prev, calculatedData: { ...prev.calculatedData, [nodeId]: calculatedValue == null ? '' : String(calculatedValue) } }));
    core.setField(nodeId, calculatedValue);
  }, [core]);

  // Enregistrer le brouillon
  const saveDraft = useCallback(async () => {
    // Si aucune soumission n'existe encore, créer explicitement via commitAsNew (zéro écriture tant que pas de commit)
    if (!core.submissionId) {
      const res = await core.commitAsNew();
      if (res?.submissionId) {
        message.success('Brouillon créé et enregistré');
      }
      return;
    }
    // Sinon, commit non destructif/idempotent sur la soumission existante
    await core.commitToExisting();
    message.success('Brouillon enregistré');
  }, [core]);

  // Marquer comme complété (commit, puis statut côté serveur via mêmes règles)
  const complete = useCallback(async () => {
    if (!core.submissionId) {
      const res = await core.commitAsNew();
      if (res?.submissionId) {
        message.success('Soumission créée');
      }
    } else {
      await core.commitToExisting();
    }
    setState(s => ({ ...s, status: 'completed' }));
    message.success('Soumission complétée');
  }, [core]);

  // isSaving ≈ committing (le hook central gère aussi loading/previewing)
  const isSaving = core.committing;
  const error = core.error;

  const helpers = useMemo(() => ({ setValue, setCalculatedValue, saveDraft, complete }), [setValue, setCalculatedValue, saveDraft, complete]);

  return { state, setState, isSaving, error, ...helpers };
}
