import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuthenticatedApi } from '../../../../hooks/useAuthenticatedApi';

export type DbIcon = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  tags: string[];
  active: boolean;
};

export const useIcons = (initialQuery?: { category?: string; search?: string }) => {
  const { api } = useAuthenticatedApi();
  const [icons, setIcons] = useState<DbIcon[]>([]);
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string | undefined>(initialQuery?.category);
  const [search, setSearch] = useState<string>(initialQuery?.search || '');

  const fetchIcons = useCallback(async (opts?: { category?: string; search?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const qCat = opts?.category ?? category;
      const qSearch = opts?.search ?? search;
      if (qCat && qCat !== 'all') params.set('category', qCat);
      if (qSearch) params.set('search', qSearch);
      const res = await api.get(`/api/icons?${params.toString()}`);
      if (res?.success) {
        setIcons(res.data.icons || []);
        // Charger les catégories une fois
        if (categories.length === 0) {
          const catsRes = await api.get('/api/icons/categories');
          if (catsRes?.success) setCategories(catsRes.data || []);
        }
      } else {
        setError(res?.error || 'Erreur inconnue');
      }
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : undefined;
      setError(msg || 'Erreur lors du chargement des icônes');
    } finally {
      setLoading(false);
    }
  }, [api, category, search, categories.length]);

  useEffect(() => {
    fetchIcons();
  }, [fetchIcons]);

  const grouped = useMemo(() => {
    return icons.reduce((acc, it) => {
      (acc[it.category] ||= []).push(it);
      return acc;
    }, {} as Record<string, DbIcon[]>);
  }, [icons]);

  return {
    icons,
    grouped,
    categories,
    loading,
    error,
    category,
    search,
    setCategory,
    setSearch,
    reload: fetchIcons
  };
};
