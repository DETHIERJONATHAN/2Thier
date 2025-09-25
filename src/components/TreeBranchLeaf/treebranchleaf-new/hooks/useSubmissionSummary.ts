import { useEffect, useMemo, useState } from 'react';
import { useAuthenticatedApi } from '../../../../hooks/useAuthenticatedApi';

type SummaryResponse = {
  submissionId: string;
  counts: {
    fields: { total: number; filled: number; empty: number };
    optionFields: { total: number; filled: number; empty: number };
    variables: { total: number };
  };
  completion: { percent: number };
};

export function useSubmissionSummary(submissionId?: string | null, refreshTrigger?: unknown) {
  const { api } = useAuthenticatedApi();
  const [data, setData] = useState<SummaryResponse | null>(null);
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
        const res = await api.get<SummaryResponse>(`/api/treebranchleaf/submissions/${submissionId}/summary`);
        if (!cancelled) setData(res);
      } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!cancelled) setError(e?.message || 'Erreur lors du chargement du résumé');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [api, canFetch, submissionId, refreshTrigger]);

  return { data, loading, error };
}
