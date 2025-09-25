import { useEffect, useState, useCallback } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';

export interface AIStatusData {
  mode: 'live' | 'mock';
  model: string;
  aiModeFlag: string;
  hasApiKey: boolean;
  timestamp: string;
  consecutiveFailures?: number;
  lastError?: string | null;
  lastSuccessAt?: string | null;
  degraded?: boolean;
  degradedUntil?: string | null;
}

interface AIStatusState {
  loading: boolean;
  error?: string;
  data?: AIStatusData;
  refresh: () => Promise<void>;
  badge: { text: string; color: string; title: string } | null;
  fallbackWarning: string | null;
}

export function useAIStatus(pollMs = 60000): AIStatusState {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [data, setData] = useState<AIStatusData | undefined>();

  const computeBadge = useCallback((d?: AIStatusData) => {
    if (!d) return null;
  if (d.mode === 'live') return { text: d.degraded ? 'IA Live (Dégradée)' : 'IA Live', color: d.degraded ? 'orange' : 'green', title: `Gemini actif (${d.model})` + (d.degraded ? ' - mode dégradé temporaire' : '') };
    if (d.hasApiKey) return { text: 'IA Fallback', color: 'orange', title: 'Clé fournie mais réponses mock (invalide ? quotas ?)' };
    return { text: 'IA Simulée', color: 'gray', title: 'Mode simplifié en l’absence de clé valide' };
  }, []);

  const [fallbackWarning, setFallbackWarning] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      const res = await api.get('/api/ai/status');
      const incoming = res.data?.data || res.data;
      setData(incoming);
      if (incoming?.hasApiKey && incoming?.mode === 'mock') {
        const reason = incoming.lastError?.match(/API key not valid|API_KEY_INVALID|unauthorized|permission|401|403/i) ? 'clé invalide/permissions' : 'appels en échec/quotas';
        setFallbackWarning(`IA en mode de secours (${reason}). Vérifiez la clé ou les quotas.`);
      } else {
        setFallbackWarning(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [pollMs, refresh]);

  return { loading, error, data, refresh, badge: computeBadge(data), fallbackWarning };
}

export default useAIStatus;
