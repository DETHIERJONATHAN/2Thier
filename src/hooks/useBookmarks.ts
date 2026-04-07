import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description?: string | null;
  favicon?: string | null;
  imageUrl?: string | null;
  domain?: string | null;
  sortOrder?: number;
  createdAt: string;
}

export function useBookmarks() {
  const { api } = useAuthenticatedApi();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const apiStable = useMemo(() => api, []);

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiStable.get('/api/user/bookmarks') as { bookmarks: Bookmark[] };
      setBookmarks(data.bookmarks || []);
    } catch (err) {
      console.error('[useBookmarks] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiStable]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const addBookmark = useCallback(async (bm: {
    url: string;
    title: string;
    description?: string;
    favicon?: string;
    imageUrl?: string;
  }): Promise<boolean> => {
    try {
      const data = await apiStable.post('/api/user/bookmarks', bm) as { bookmark: Bookmark };
      if (data.bookmark) {
        setBookmarks(prev => [data.bookmark, ...prev]);
        return true;
      }
      return false;
    } catch (err: any) {
      // 409 = already exists
      if (err?.status === 409 || err?.response?.status === 409) return false;
      console.error('[useBookmarks] add error:', err);
      return false;
    }
  }, [apiStable]);

  const removeBookmark = useCallback(async (id: string) => {
    try {
      await apiStable.delete(`/api/user/bookmarks/${id}`);
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('[useBookmarks] remove error:', err);
    }
  }, [apiStable]);

  const removeByUrl = useCallback(async (url: string) => {
    try {
      await apiStable.post('/api/user/bookmarks/remove-by-url', { url });
      setBookmarks(prev => prev.filter(b => b.url !== url));
    } catch (err) {
      console.error('[useBookmarks] removeByUrl error:', err);
    }
  }, [apiStable]);

  const isBookmarked = useCallback((url: string) => {
    return bookmarks.some(b => b.url === url);
  }, [bookmarks]);

  const toggleBookmark = useCallback(async (item: {
    url: string;
    title: string;
    description?: string;
    favicon?: string;
    imageUrl?: string;
  }) => {
    if (isBookmarked(item.url)) {
      await removeByUrl(item.url);
      return false;
    } else {
      await addBookmark(item);
      return true;
    }
  }, [isBookmarked, addBookmark, removeByUrl]);

  const reorderBookmarks = useCallback(async (orderedIds: string[]) => {
    // Optimistic update
    const reordered = orderedIds
      .map(id => bookmarks.find(b => b.id === id))
      .filter(Boolean) as Bookmark[];
    setBookmarks(reordered);
    try {
      await apiStable.put('/api/user/bookmarks/reorder', { orderedIds });
    } catch (err) {
      console.error('[useBookmarks] reorder error:', err);
      fetchBookmarks(); // Rollback on error
    }
  }, [bookmarks, apiStable, fetchBookmarks]);

  return {
    bookmarks,
    loading,
    addBookmark,
    removeBookmark,
    removeByUrl,
    isBookmarked,
    toggleBookmark,
    reorderBookmarks,
    refetch: fetchBookmarks,
  };
}
