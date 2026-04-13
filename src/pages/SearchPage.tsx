import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Input, Spin, Empty, Button, Tooltip, Badge, Avatar } from 'antd';
import {
  SearchOutlined, ReloadOutlined, GlobalOutlined, ClockCircleOutlined,
  RightOutlined, AudioOutlined, StarOutlined, StarFilled,
  AppstoreOutlined, UnorderedListOutlined, ArrowRightOutlined,
  UserOutlined, ContactsOutlined, ToolOutlined, FilePdfOutlined,
  MessageOutlined, MailOutlined, FileTextOutlined, CalendarOutlined,
  FormOutlined, PictureOutlined, FileSearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useBookmarks } from '../hooks/useBookmarks';
import { useZhiiveNav } from '../contexts/ZhiiveNavContext';
import { SF } from '../components/zhiive/ZhiiveTheme';

// ── Types ──
interface SearchResult {
  id: string;
  _type: string;
  _label: string;
  _desc?: string;
  _route: string;
  _icon: string;
  _table?: string;
  _matchedColumn?: string;
  avatarUrl?: string;
  firstName?: string;
  imageUrl?: string;
  favicon?: string;
  [key: string]: unknown;
}

interface SearchResponse {
  results: Record<string, SearchResult[]>;
  query: string;
  total: number;
}

interface FeedItem {
  title: string;
  link: string;
  snippet?: string;
  pubDate?: string;
  imageUrl?: string;
}

interface FeedResult {
  bookmarkId: string;
  url: string;
  title: string;
  domain?: string | null;
  favicon?: string | null;
  imageUrl?: string | null;
  feedUrl?: string | null;
  items: FeedItem[];
  error?: string;
  openExternal?: boolean;
}

// ── Constants ──
const DEBOUNCE_MS = 300;
const WEB_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

type SearchTab = 'tous' | 'bees' | 'posts' | 'mails' | 'agenda' | 'images' | 'docs' | 'web';
type ViewMode = 'widgets' | 'buttons';

const SEARCH_TABS: { id: SearchTab; label: string; icon: React.ReactNode; categories?: string[] }[] = [
  { id: 'tous', label: 'Tous', icon: <SearchOutlined /> },
  { id: 'bees', label: 'Abeilles', icon: <UserOutlined />, categories: ['users', 'contacts', 'orgs'] },
  { id: 'posts', label: 'Buzz', icon: <MessageOutlined />, categories: ['posts'] },
  { id: 'mails', label: 'Mails', icon: <MailOutlined />, categories: ['emails'] },
  { id: 'agenda', label: 'Agenda', icon: <CalendarOutlined />, categories: ['events'] },
  { id: 'images', label: 'Images', icon: <PictureOutlined />, categories: ['documents', 'products'] },
  { id: 'docs', label: 'Docs', icon: <FileSearchOutlined />, categories: ['documents', 'quotes', 'orders', 'templates', 'forms', 'trees'] },
  { id: 'web', label: 'Web', icon: <GlobalOutlined /> },
];

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  users:      { label: 'Utilisateurs',    icon: <UserOutlined />,     color: SF.primary },
  leads:      { label: 'Leads / Clients', icon: <ContactsOutlined />, color: SF.secondary },
  chantiers:  { label: 'Chantiers',       icon: <ToolOutlined />,     color: SF.fire },
  modules:    { label: 'Modules',          icon: <AppstoreOutlined />, color: SF.gold },
  documents:  { label: 'Documents',        icon: <FilePdfOutlined />,  color: '#E74C3C' },
  posts:      { label: 'Posts',            icon: <MessageOutlined />,  color: SF.accent },
  emails:     { label: 'Emails',           icon: <MailOutlined />,     color: SF.secondary },
  quotes:     { label: 'Devis',            icon: <FileTextOutlined />, color: SF.success },
  events:     { label: 'Calendrier',       icon: <CalendarOutlined />, color: SF.primaryLight },
  forms:      { label: 'Formulaires',      icon: <FormOutlined />,     color: SF.accentLight },
  products:   { label: 'Produits',         icon: <AppstoreOutlined />, color: SF.gold },
  orgs:       { label: 'Organisations',    icon: <AppstoreOutlined />, color: SF.primary },
  orders:     { label: 'Commandes',        icon: <FileTextOutlined />, color: SF.success },
  requests:   { label: 'Demandes',         icon: <UserOutlined />,     color: SF.primaryLight },
  contacts:   { label: 'Contacts',         icon: <ContactsOutlined />, color: SF.secondary },
  templates:  { label: 'Templates',        icon: <FilePdfOutlined />,  color: '#E74C3C' },
  categories: { label: 'Catégories',       icon: <AppstoreOutlined />, color: SF.gold },
  notifs:     { label: 'Notifications',    icon: <MailOutlined />,     color: SF.accent },
  trees:      { label: 'Formulaires',      icon: <FormOutlined />,     color: SF.accentLight },
  other:      { label: 'Autres',           icon: <SearchOutlined />,   color: SF.textMuted },
};

const ICON_MAP: Record<string, React.ReactNode> = {
  user: <UserOutlined />, contacts: <ContactsOutlined />, tool: <ToolOutlined />,
  appstore: <AppstoreOutlined />, 'file-pdf': <FilePdfOutlined />, message: <MessageOutlined />,
  mail: <MailOutlined />, 'file-text': <FileTextOutlined />, calendar: <CalendarOutlined />,
  form: <FormOutlined />, search: <SearchOutlined />,
};

// ── Helpers ──
function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 0) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}j`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safeQuery})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <strong key={i} style={{ color: SF.primary }}>{part}</strong> : part
  );
}

// ══════════════════════════════════════════════════════════════
// ── FEED WIDGET CARD (reused from HoneycombPage)
// ══════════════════════════════════════════════════════════════
const FeedWidget: React.FC<{
  feed: FeedResult;
  onRefresh: (id: string) => void;
  refreshing: boolean;
  onOpenUrl: (url: string, forceExternal?: boolean) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onTitleClick?: () => void;
}> = ({ feed, onRefresh, refreshing, onOpenUrl, scrollRef, onTitleClick }) => {
  const { t } = useTranslation();
  const hasError = !!feed.error;
  const hasItems = feed.items.length > 0;
  const ext = !!feed.openExternal;
  const resolveLink = (itemLink?: string) => ext ? feed.url : (itemLink || feed.url);

  return (
    <div
      ref={scrollRef}
      style={{
        background: SF.cardBg,
        borderRadius: SF.radius,
        boxShadow: SF.shadow,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      className="hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${SF.border}`,
        background: SF.bg,
        cursor: 'grab',
      }}>
        {feed.favicon ? (
          <img src={feed.favicon} alt="" loading="lazy" style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <GlobalOutlined style={{ fontSize: 18, color: SF.textSecondary, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div onClick={onTitleClick} style={{ fontWeight: 600, fontSize: 14, color: SF.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: onTitleClick ? 'pointer' : 'default' }}>
            {feed.title}
          </div>
          {feed.domain && <div style={{ fontSize: 11, color: SF.textSecondary }}>{feed.domain}</div>}
        </div>
        <Tooltip title={t('honeycomb.refresh')}>
          <Button type="text" size="small" icon={<ReloadOutlined spin={refreshing} />}
            onClick={() => onRefresh(feed.bookmarkId)} style={{ color: SF.textSecondary }} />
        </Tooltip>
      </div>

      {/* Content */}
      <div style={{ padding: '8px 0', flex: 1 }}>
        {hasError && !hasItems && (
          <div onClick={() => onOpenUrl(feed.url, ext)} style={{ cursor: 'pointer', transition: 'background 0.15s' }} className="hover:bg-gray-50">
            {feed.imageUrl && (
              <div style={{ width: '100%', height: 140, overflow: 'hidden', background: SF.bg }}>
                <img src={feed.imageUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
              </div>
            )}
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: SF.text, marginBottom: 6 }}>
                {feed.error === 'no_feed' ? t('honeycomb.exploreSite') : t('honeycomb.fetchFailed')}
              </div>
              <div style={{ fontSize: 12, color: SF.textSecondary, marginBottom: 12 }}>
                {feed.error === 'no_feed' ? t('honeycomb.exploreSiteDesc') : t('honeycomb.retryLater')}
              </div>
              <Button type="primary" size="small" icon={<GlobalOutlined />}
                style={{ background: SF.primary, borderColor: SF.primary }}>
                {t('honeycomb.openInHive')}
              </Button>
            </div>
          </div>
        )}

        {hasItems && feed.items.map((item, idx) => {
          const isHero = idx === 0 && !!item.imageUrl;
          if (isHero) {
            return (
              <div key={idx} onClick={() => onOpenUrl(resolveLink(item.link), ext)}
                style={{ cursor: 'pointer', transition: 'background 0.15s', borderBottom: idx < feed.items.length - 1 ? `1px solid ${SF.border}` : undefined }}
                className="hover:bg-gray-50">
                <div style={{ width: '100%', height: 160, overflow: 'hidden', background: SF.bg }}>
                  <img src={item.imageUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                </div>
                <div style={{ padding: '8px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: SF.text, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.title}
                  </div>
                  {item.snippet && <div style={{ fontSize: 11, color: SF.textSecondary, marginTop: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35 }}>{item.snippet}</div>}
                  {item.pubDate && <div style={{ fontSize: 10, color: SF.textSecondary, marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}><ClockCircleOutlined style={{ fontSize: 10 }} />{timeAgo(item.pubDate)}</div>}
                </div>
              </div>
            );
          }
          return (
            <div key={idx} onClick={() => onOpenUrl(resolveLink(item.link), ext)}
              style={{ display: 'flex', padding: '8px 16px', gap: 10, cursor: 'pointer', transition: 'background 0.15s', borderBottom: idx < feed.items.length - 1 ? `1px solid ${SF.border}` : undefined }}
              className="hover:bg-gray-50">
              {item.imageUrl && (
                <div style={{ width: 72, height: 72, borderRadius: SF.radiusSm, overflow: 'hidden', flexShrink: 0, background: SF.bg }}>
                  <img src={item.imageUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: SF.text, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</div>
                {item.snippet && <div style={{ fontSize: 11, color: SF.textSecondary, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35 }}>{item.snippet}</div>}
                {item.pubDate && <div style={{ fontSize: 10, color: SF.textSecondary, marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}><ClockCircleOutlined style={{ fontSize: 10 }} />{timeAgo(item.pubDate)}</div>}
              </div>
              <RightOutlined style={{ fontSize: 10, color: SF.textSecondary, alignSelf: 'center', flexShrink: 0 }} />
            </div>
          );
        })}

        {!hasError && !hasItems && (
          <div style={{ padding: '20px 16px', textAlign: 'center', color: SF.textSecondary, fontSize: 13 }}>
            {t('honeycomb.noArticles')}
          </div>
        )}
      </div>

      {/* Footer */}
      <div onClick={() => onOpenUrl(feed.url, ext)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 16px', borderTop: `1px solid ${SF.border}`, fontSize: 12, color: SF.primary, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' }}
        className="hover:bg-purple-50">
        <GlobalOutlined style={{ fontSize: 12 }} />
        {feed.domain || feed.url}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// ── FEED BUTTON (compact mode)
// ══════════════════════════════════════════════════════════════
const FeedButton: React.FC<{
  feed: FeedResult;
  onClick: () => void;
}> = ({ feed, onClick }) => {
  const itemCount = feed.items.length;
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px',
        background: SF.cardBg,
        borderRadius: SF.radius,
        boxShadow: SF.shadow,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      className="hover:shadow-md hover:-translate-y-0.5"
    >
      {feed.favicon ? (
        <img src={feed.favicon} alt="" loading="lazy" style={{ width: 24, height: 24, borderRadius: 4, flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <GlobalOutlined style={{ fontSize: 20, color: SF.textSecondary, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: SF.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {feed.title}
        </div>
        {feed.domain && <div style={{ fontSize: 11, color: SF.textSecondary }}>{feed.domain}</div>}
      </div>
      {itemCount > 0 && (
        <Badge count={itemCount} style={{ backgroundColor: SF.primary }} />
      )}
      <RightOutlined style={{ fontSize: 10, color: SF.textSecondary }} />
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// ── MAIN SEARCH PAGE
// ══════════════════════════════════════════════════════════════
const SearchPage: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { api } = useAuthenticatedApi();
  const apiStable = useMemo(() => api, [api]);
  const { bookmarks, isBookmarked, toggleBookmark, reorderBookmarks } = useBookmarks();
  const { setWallViewUrl } = useZhiiveNav();

  // ── View mode: widget grid vs compact buttons ──
  const [viewMode, setViewMode] = useState<ViewMode>('buttons');

  // ── Search state ──
  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [activeTab, setActiveTab] = useState<SearchTab>('tous');
  const [webResults, setWebResults] = useState<SearchResult[]>([]);
  const [webLoading, setWebLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const webDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Feed state ──
  const [feeds, setFeeds] = useState<FeedResult[]>([]);
  const [feedsLoading, setFeedsLoading] = useState(true);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  // ── Scroll-to-widget refs ──
  const widgetRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // ── Drag & drop state ──
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // ── Search functions ──
  const doSearch = useCallback(async (q: string) => {
    if (q.length < MIN_QUERY_LENGTH) { setSearchResults(null); setSearchLoading(false); return; }
    setSearchLoading(true);
    try {
      const data = await apiStable.get(`/api/search/global?q=${encodeURIComponent(q)}&limit=8`);
      setSearchResults(data as SearchResponse);
      setSelectedIndex(-1);
    } catch { setSearchResults(null); }
    finally { setSearchLoading(false); }
  }, [apiStable]);

  const doWebSearch = useCallback(async (q: string) => {
    if (q.length < MIN_QUERY_LENGTH) { setWebResults([]); return; }
    setWebLoading(true);
    try {
      const data = await apiStable.get(`/api/search/web?q=${encodeURIComponent(q)}&limit=10`) as { results: unknown[] };
      setWebResults((data.results || []).map((r: unknown, i: number) => ({
        id: `web-${i}`, _type: 'web', _label: r.title || r.url,
        _desc: r.content || r.snippet || '', _route: r.url, _icon: 'search',
        imageUrl: r.img_src || r.thumbnail || undefined,
        favicon: r.favicon || undefined,
      })));
      setSelectedIndex(-1);
    } catch { setWebResults([]); }
    finally { setWebLoading(false); }
  }, [apiStable]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null; }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) { stopListening(); return; }
    const recognition = new SR();
    recognition.lang = 'fr-FR'; recognition.continuous = false; recognition.interimResults = true;
    recognition.onresult = (event: unknown) => {
      const transcript = Array.from(event.results).map((r: Record<string, unknown>) => r[0].transcript).join('');
      setQuery(transcript);
      if (event.results[0]?.isFinal) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        doSearch(transcript.trim());
        if (webDebounceRef.current) clearTimeout(webDebounceRef.current);
        doWebSearch(transcript.trim());
      }
    };
    recognition.onerror = () => { setIsListening(false); recognitionRef.current = null; };
    recognition.onend = () => { setIsListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition; setIsListening(true); recognition.start();
  }, [isListening, stopListening, doSearch, doWebSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val.trim()), DEBOUNCE_MS);
    if (webDebounceRef.current) clearTimeout(webDebounceRef.current);
    webDebounceRef.current = setTimeout(() => doWebSearch(val.trim()), WEB_DEBOUNCE_MS);
  }, [doSearch, doWebSearch]);

  const handleSelect = useCallback(async (item: SearchResult) => {
    if (item._route?.startsWith('http')) {
      const { openInNativeBrowser } = await import('../utils/capacitor');
      const opened = await openInNativeBrowser(item._route);
      if (!opened) setWallViewUrl(item._route);
    } else if (item._route) {
      navigate(item._route);
    }
    setQuery(''); setSearchResults(null); setWebResults([]);
  }, [navigate, setWallViewUrl]);

  // ── Filtered results ──
  const filteredResults = useMemo(() => {
    if (!searchResults?.results) return {};
    if (activeTab === 'tous' || activeTab === 'web') return searchResults.results;
    const tabConfig = SEARCH_TABS.find(t => t.id === activeTab);
    if (!tabConfig?.categories) return searchResults.results;
    const filtered: Record<string, SearchResult[]> = {};
    for (const cat of tabConfig.categories) {
      if (searchResults.results[cat]?.length) filtered[cat] = searchResults.results[cat];
    }
    return filtered;
  }, [searchResults, activeTab]);

  const flatResults = useMemo(() => {
    if (activeTab === 'web') return webResults;
    const flat: SearchResult[] = [];
    for (const items of Object.values(filteredResults)) {
      if (items) for (const item of items) flat.push(item);
    }
    return flat;
  }, [filteredResults, activeTab, webResults]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const total = flatResults.length;
    if (!total) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => (prev + 1) % total); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => (prev - 1 + total) % total); }
    else if (e.key === 'Enter' && selectedIndex >= 0 && flatResults[selectedIndex]) { e.preventDefault(); handleSelect(flatResults[selectedIndex]); }
  }, [selectedIndex, handleSelect, flatResults]);

  // ── Feed functions ──
  const openUrlInHive = useCallback((url: string, forceExternal = false) => {
    if (forceExternal) window.open(url, '_blank', 'noopener,noreferrer');
    else setWallViewUrl(url);
  }, [setWallViewUrl]);

  const fetchAllFeeds = useCallback(async (forceRefresh = false) => {
    try {
      setFeedsLoading(true);
      const url = forceRefresh ? '/api/user/bookmarks/feeds?refresh=true' : '/api/user/bookmarks/feeds';
      const data = (await apiStable.get(url)) as { feeds: FeedResult[] };
      setFeeds(data.feeds || []);
    } catch (err) {
      console.error('[Search] feed fetch error:', err);
    } finally {
      setFeedsLoading(false);
    }
  }, [apiStable]);

  const refreshSingleFeed = useCallback(async (bookmarkId: string) => {
    setRefreshingIds(prev => new Set(prev).add(bookmarkId));
    try {
      const data = (await apiStable.get(`/api/user/bookmarks/feeds/${bookmarkId}`)) as { feed: FeedResult };
      if (data.feed) setFeeds(prev => prev.map(f => f.bookmarkId === bookmarkId ? data.feed : f));
    } catch (err) {
      console.error('[Search] refresh error:', err);
    } finally {
      setRefreshingIds(prev => { const next = new Set(prev); next.delete(bookmarkId); return next; });
    }
  }, [apiStable]);

  useEffect(() => { fetchAllFeeds(); }, [fetchAllFeeds]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 200); }, []);

  // ── Drag & drop handlers ──
  const onDragStart = useCallback((bookmarkId: string) => { setDragId(bookmarkId); }, []);
  const onDragOver = useCallback((e: React.DragEvent, bookmarkId: string) => {
    e.preventDefault(); setDragOverId(bookmarkId);
  }, []);
  const onDragEnd = useCallback(() => {
    if (dragId && dragOverId && dragId !== dragOverId) {
      const feedIds = feeds.map(f => f.bookmarkId);
      const fromIdx = feedIds.indexOf(dragId);
      const toIdx = feedIds.indexOf(dragOverId);
      if (fromIdx >= 0 && toIdx >= 0) {
        const reordered = [...feedIds];
        reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, dragId);
        // Reorder feeds locally
        const reorderedFeeds = reordered.map(id => feeds.find(f => f.bookmarkId === id)!).filter(Boolean);
        setFeeds(reorderedFeeds);
        // Persist to backend
        reorderBookmarks(reordered);
      }
    }
    setDragId(null); setDragOverId(null);
  }, [dragId, dragOverId, feeds, reorderBookmarks]);

  // ── Button click: switch to widget mode and scroll to widget ──
  const scrollToWidget = useCallback((bookmarkId: string) => {
    setViewMode('widgets');
    setTimeout(() => {
      const el = widgetRefs.current.get(bookmarkId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, []);

  // ── Derived ──
  const showSearchResults = query.length >= MIN_QUERY_LENGTH;
  const hasDbResults = filteredResults && Object.keys(filteredResults).length > 0;
  const isActiveLoading = activeTab === 'web' ? webLoading : (activeTab === 'tous' ? (searchLoading && webLoading) : searchLoading);
  const hasResults = activeTab === 'web' ? webResults.length > 0 : activeTab === 'tous' ? (hasDbResults || webResults.length > 0) : hasDbResults;

  const feedsWithArticles = feeds.filter(f => f.items.length > 0);
  const feedsNoArticles = feeds.filter(f => f.items.length === 0);
  const allFeeds = [...feedsWithArticles, ...feedsNoArticles];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ═══════ TOP BAR ═══════ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        height: 48,
        padding: '0 12px',
        borderBottom: `1px solid ${SF.border}`,
        background: SF.cardBg,
        flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Left: Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <SearchOutlined style={{ fontSize: 16, color: SF.primary }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: SF.text }}>Search</span>
          {bookmarks.length > 0 && (
            <Badge count={bookmarks.length} style={{ backgroundColor: SF.primary }} />
          )}
        </div>

        {/* Center: Search bar */}
        <div style={{ flex: 1, maxWidth: 600, margin: '0 auto' }}>
          <Input
            ref={inputRef}
            placeholder={isListening ? t('common.listening', 'Parlez maintenant...') : t('common.search') + '...'}
            prefix={<SearchOutlined style={{ color: SF.textMuted }} />}
            suffix={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {(searchLoading || webLoading) && <Spin size="small" />}
                {((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && (
                  <AudioOutlined onClick={startListening}
                    style={{ fontSize: 16, cursor: 'pointer', color: isListening ? '#ff4d4f' : SF.textMuted, animation: isListening ? 'zhiive-pulse 1.2s infinite' : 'none' }} />
                )}
              </div>
            }
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            allowClear
            style={{ height: 32, borderRadius: SF.radiusSm, fontSize: 13 }}
          />
        </div>

        {/* Right: View mode toggle + refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Tooltip title={viewMode === 'widgets' ? t('honeycomb.compactView', 'Vue compacte') : t('honeycomb.widgetView', 'Vue widgets')}>
            <Button
              type={viewMode === 'widgets' ? 'primary' : 'default'}
              icon={viewMode === 'widgets' ? <AppstoreOutlined /> : <UnorderedListOutlined />}
              onClick={() => setViewMode(prev => prev === 'widgets' ? 'buttons' : 'widgets')}
              style={viewMode === 'widgets' ? { background: SF.primary, borderColor: SF.primary } : {}}
            />
          </Tooltip>
          <Tooltip title={t('honeycomb.refreshAll')}>
            <Button icon={<ReloadOutlined />} onClick={() => fetchAllFeeds(true)} loading={feedsLoading} />
          </Tooltip>
        </div>
      </div>

      {/* ═══════ SEARCH RESULTS DROPDOWN (floating, appears when typing) ═══════ */}
      {showSearchResults && (
        <div style={{ position: 'relative', zIndex: 50 }}>
          {/* Search tabs */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2, padding: '6px 20px',
            background: SF.cardBg, borderBottom: `1px solid ${SF.border}`,
            overflowX: 'auto', scrollbarWidth: 'none',
          }}>
            {SEARCH_TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <div key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedIndex(-1); if (tab.id === 'web' && query.trim().length >= MIN_QUERY_LENGTH) doWebSearch(query.trim()); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px',
                    borderRadius: 16, cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 600 : 400,
                    whiteSpace: 'nowrap', color: isActive ? SF.primary : SF.textSecondary,
                    background: isActive ? `${SF.primary}15` : 'transparent',
                    transition: 'all 0.2s',
                  }}>
                  {React.cloneElement(tab.icon as React.ReactElement, { style: { fontSize: 13 } })}
                  <span>{tab.label}</span>
                </div>
              );
            })}
          </div>

          {/* Results area */}
          <div style={{
            background: SF.cardBg,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            borderRadius: `0 0 ${SF.radius}px ${SF.radius}px`,
            maxHeight: '50vh', overflowY: 'auto',
            margin: '0 20px',
          }}>
            {isActiveLoading && <div style={{ padding: 20, textAlign: 'center' }}><Spin size="small" /></div>}

            {!isActiveLoading && !hasResults && (
              <div style={{ padding: 20 }}><Empty description={`Aucun résultat pour "${query}"`} image={Empty.PRESENTED_IMAGE_SIMPLE} /></div>
            )}

            {/* Web results (full tab or preview in Tous) */}
            {!isActiveLoading && (activeTab === 'web' || (activeTab === 'tous' && webResults.length > 0)) && (
              <div style={{ padding: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px 6px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: SF.primary, letterSpacing: 0.5, borderTop: (activeTab === 'tous' && hasDbResults) ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                  <GlobalOutlined /><span>{webResults.length} résultat{webResults.length > 1 ? 's' : ''} web</span>
                </div>
                {(activeTab === 'web' ? webResults : webResults.slice(0, 4)).map((item, idx) => (
                  <div key={item.id} onClick={() => handleSelect(item)} onMouseEnter={() => setSelectedIndex(idx)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', transition: 'background 0.12s', background: selectedIndex === idx ? 'rgba(108,92,231,0.08)' : 'transparent' }}>
                    {item.imageUrl ? (
                      <div style={{ width: 80, minWidth: 80, height: 56, borderRadius: 6, overflow: 'hidden', background: '#f0f0f0', flexShrink: 0 }}>
                        <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                      </div>
                    ) : (
                      <div style={{ width: 80, minWidth: 80, height: 56, borderRadius: 6, background: `${SF.primary}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <GlobalOutlined style={{ fontSize: 22, color: SF.primary, opacity: 0.5 }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {item.favicon && <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}><img src={item.favicon} alt="" style={{ width: 14, height: 14, borderRadius: 2 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /><span style={{ fontSize: 10, color: SF.textMuted }}>{item._route?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span></div>}
                      <div style={{ fontSize: 13, fontWeight: 600, color: SF.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item._label}</div>
                      {item._desc && <div style={{ fontSize: 11, color: SF.textSecondary, lineHeight: 1.35, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item._desc}</div>}
                    </div>
                    <div onClick={e => { e.stopPropagation(); toggleBookmark({ url: item._route, title: item._label || '', description: item._desc, favicon: item.favicon, imageUrl: item.imageUrl }); }}
                      style={{ padding: 4, cursor: 'pointer', flexShrink: 0, transition: 'transform 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                      {isBookmarked(item._route) ? <StarFilled style={{ fontSize: 14, color: '#faad14' }} /> : <StarOutlined style={{ fontSize: 14, color: SF.textMuted }} />}
                    </div>
                    <ArrowRightOutlined style={{ fontSize: 10, color: SF.textMuted, flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            )}

            {/* Internal DB results */}
            {!isActiveLoading && activeTab !== 'web' && hasDbResults && searchResults && (
              <div style={{ padding: '4px 0' }}>
                <div style={{ padding: '4px 16px 6px', fontSize: 12, color: SF.textMuted }}>
                  {flatResults.length} résultat{flatResults.length > 1 ? 's' : ''}
                </div>
                {Object.entries(filteredResults).map(([category, items]) => {
                  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
                  if (!items?.length) return null;
                  return (
                    <div key={category}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px 2px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: config.color, letterSpacing: 0.5 }}>
                        {config.icon}<span>{config.label}</span>
                      </div>
                      {items.map(item => {
                        const globalIdx = flatResults.indexOf(item);
                        return (
                          <div key={`${item._type}-${item.id}`} onClick={() => handleSelect(item)} onMouseEnter={() => setSelectedIndex(globalIdx)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px', cursor: 'pointer', transition: 'background 0.1s', background: selectedIndex === globalIdx ? `${config.color}12` : 'transparent' }}>
                            {item._type === 'user' || item._type === 'lead' ? (
                              <Avatar size={28} src={item.avatarUrl} style={{ backgroundColor: config.color, flexShrink: 0, fontSize: 12 }}>
                                {(item.firstName || item._label || '?').charAt(0).toUpperCase()}
                              </Avatar>
                            ) : (
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${config.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: config.color, flexShrink: 0 }}>
                                {ICON_MAP[item._icon] || config.icon}
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: SF.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {highlightMatch(item._label || '', searchResults.query)}
                              </div>
                              {item._desc && <div style={{ fontSize: 11, color: SF.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item._desc}</div>}
                            </div>
                            <ArrowRightOutlined style={{ fontSize: 10, color: SF.textMuted }} />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Backdrop to close results */}
          <div onClick={() => { setQuery(''); setSearchResults(null); setWebResults([]); }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }} />
        </div>
      )}

      {/* ═══════ CONTENT: Feed widgets/buttons ═══════ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 32px' }}>
        {feedsLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 16 }}>
            <Spin size="large" />
            <span style={{ color: SF.textSecondary, fontSize: 14 }}>{t('honeycomb.loading')}</span>
          </div>
        )}

        {!feedsLoading && bookmarks.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', padding: 32 }}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: SF.text, marginBottom: 8 }}>{t('honeycomb.emptyTitle')}</div>
                <div style={{ fontSize: 14, color: SF.textSecondary }}>{t('honeycomb.emptyDescription')}</div>
              </div>
            }>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => inputRef.current?.focus()}
                style={{ background: SF.primary, borderColor: SF.primary }}>
                {t('honeycomb.emptyAction')}
              </Button>
            </Empty>
          </div>
        )}

        {/* ── Widget mode: grid of feed cards ── */}
        {!feedsLoading && bookmarks.length > 0 && viewMode === 'widgets' && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? '200px' : '320px'}, 1fr))`, gap: compact ? 8 : 16, maxWidth: compact ? undefined : 1400, margin: '0 auto' }}>
            {allFeeds.map(feed => (
              <div
                key={feed.bookmarkId}
                ref={(el) => { if (el) widgetRefs.current.set(feed.bookmarkId, el); }}
                draggable
                onDragStart={() => onDragStart(feed.bookmarkId)}
                onDragOver={(e) => onDragOver(e, feed.bookmarkId)}
                onDragEnd={onDragEnd}
                style={{
                  opacity: dragId === feed.bookmarkId ? 0.5 : 1,
                  border: dragOverId === feed.bookmarkId ? `2px dashed ${SF.primary}` : '2px solid transparent',
                  borderRadius: SF.radius,
                  transition: 'opacity 0.2s, border 0.2s',
                }}
              >
                <FeedWidget
                  feed={feed}
                  onRefresh={refreshSingleFeed}
                  refreshing={refreshingIds.has(feed.bookmarkId)}
                  onOpenUrl={openUrlInHive}
                  scrollRef={{ current: null } as React.RefObject<HTMLDivElement | null>}
                  onTitleClick={() => setViewMode('buttons')}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Button mode: compact list ── */}
        {!feedsLoading && bookmarks.length > 0 && viewMode === 'buttons' && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? '200px' : '280px'}, 1fr))`, gap: 8, maxWidth: compact ? undefined : 1400, margin: '0 auto' }}>
            {allFeeds.map(feed => (
              <div
                key={feed.bookmarkId}
                draggable
                onDragStart={() => onDragStart(feed.bookmarkId)}
                onDragOver={(e) => onDragOver(e, feed.bookmarkId)}
                onDragEnd={onDragEnd}
                style={{
                  opacity: dragId === feed.bookmarkId ? 0.5 : 1,
                  border: dragOverId === feed.bookmarkId ? `2px dashed ${SF.primary}` : '2px solid transparent',
                  borderRadius: SF.radius,
                  transition: 'opacity 0.2s, border 0.2s',
                }}
              >
                <FeedButton feed={feed} onClick={() => scrollToWidget(feed.bookmarkId)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
