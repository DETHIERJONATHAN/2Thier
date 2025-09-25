import { useEffect, useMemo, useState } from 'react';
import { useAuthenticatedApi } from '../../../../hooks/useAuthenticatedApi';

export type OperationItem = {
  nodeId: string;
  isVariable: boolean;
  fieldLabel: string | null;
  variableDisplayName: string | null;
  variableKey: string | null;
  unit: string | null;
  sourceRef: string | null;
  operationSource: 'formula' | 'condition' | 'table' | 'neutral';
  operationDetail?: string;
  operationResult: string;
  response: string | null;
  lastResolved: string; // ISO date
};

type OperationsResponse = {
  submissionId: string;
  items: OperationItem[];
};

export function useSubmissionOperations(submissionId?: string | null, refreshTrigger?: unknown) {
  const { api } = useAuthenticatedApi();
  const [data, setData] = useState<OperationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFetch = useMemo(() => !!submissionId, [submissionId]);

  useEffect(() => {
    let cancelled = false;
    if (!canFetch) return;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<OperationsResponse>(`/api/treebranchleaf/submissions/${submissionId}/operations`);
        if (!cancelled) setData(res.items);
      } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!cancelled) setError(e?.message || 'Erreur lors du chargement des opérations');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [api, canFetch, submissionId, refreshTrigger]);

  return { items: data, loading, error };
}
