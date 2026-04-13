import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Input, Spin, Empty, Avatar } from 'antd';
import {
  SearchOutlined, CloseOutlined, UserOutlined, ContactsOutlined,
  ToolOutlined, AppstoreOutlined, FilePdfOutlined, MessageOutlined,
  MailOutlined, FileTextOutlined, CalendarOutlined, FormOutlined,
  ArrowRightOutlined, GlobalOutlined, PictureOutlined,
  PlayCircleOutlined, FileSearchOutlined, AudioOutlined,
  StarOutlined, StarFilled,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useZhiiveNav } from '../contexts/ZhiiveNavContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { SF } from './zhiive/ZhiiveTheme';

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
  [key: string]: unknown;
}

interface SearchResponse {
  results: Record<string, SearchResult[]>;
  query: string;
  total: number;
}

// ── Search sub-tabs (Google-style) ──
type SearchTab = 'tous' | 'bees' | 'posts' | 'mails' | 'agenda' | 'images' | 'docs' | 'web';

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

const DEBOUNCE_MS = 300;
const WEB_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const MIN_WEB_QUERY_LENGTH = 2;

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  users:      { label: 'Utilisateurs',   icon: <UserOutlined />,     color: SF.primary },
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
  user: <UserOutlined />,
  contacts: <ContactsOutlined />,
  tool: <ToolOutlined />,
  appstore: <AppstoreOutlined />,
  'file-pdf': <FilePdfOutlined />,
  message: <MessageOutlined />,
  mail: <MailOutlined />,
  'file-text': <FileTextOutlined />,
  calendar: <CalendarOutlined />,
  form: <FormOutlined />,
  search: <SearchOutlined />,
};

interface GlobalSearchProps {
  visible: boolean;
  onClose: () => void;
  headerHeight: number;
  isMobile: boolean;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ visible, onClose, headerHeight, isMobile }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { api } = useAuthenticatedApi();
  const { setBrowseUrl, setWallSearchQuery, setCenterApp, setWallViewUrl } = useZhiiveNav();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const apiStable = useMemo(() => api, []);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<SearchTab>('tous');
  const [webResults, setWebResults] = useState<SearchResult[]>([]);
  const [webLoading, setWebLoading] = useState(false);

  const inputRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // ── 🎤 Voice Search (Web Speech API) ──
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiStable.get(`/api/search/global?q=${encodeURIComponent(q)}&limit=8`);
      setResults(data as SearchResponse);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('[GlobalSearch] Error:', err);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [apiStable]);

  // ── Zhiive Search — recherche web intégrée ──
  const doWebSearch = useCallback(async (q: string) => {
    if (q.length < MIN_WEB_QUERY_LENGTH) { setWebResults([]); return; }
    setWebLoading(true);
    try {
      const data = await apiStable.get(`/api/search/web?q=${encodeURIComponent(q)}&limit=10`) as { results: unknown[] };
      const mapped: SearchResult[] = (data.results || []).map((r: unknown, i: number) => ({
        id: `web-${i}`,
        _type: 'web',
        _label: r.title || r.url,
        _desc: r.content || r.snippet || '',
        _route: r.url,
        _icon: 'search',
        imageUrl: r.img_src || r.thumbnail || undefined,
        favicon: r.favicon || undefined,
      }));
      setWebResults(mapped);
      setSelectedIndex(-1);
    } catch {
      setWebResults([{
        id: 'web-error',
        _type: 'web',
        _label: `Recherche temporairement indisponible`,
        _desc: 'Réessayez dans quelques instants',
        _route: '',
        _icon: 'search',
      }]);
    } finally {
      setWebLoading(false);
    }
  }, [apiStable]);

  const webDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) { stopListening(); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: unknown) => {
      const transcript = Array.from(event.results)
        .map((r: Record<string, unknown>) => r[0].transcript)
        .join('');
      setQuery(transcript);
      if (event.results[0]?.isFinal) {
        // Trigger search with final transcript
        if (debounceRef.current) clearTimeout(debounceRef.current);
        doSearch(transcript.trim());
        if (webDebounceRef.current) clearTimeout(webDebounceRef.current);
        doWebSearch(transcript.trim());
      }
    };

    recognition.onerror = () => { setIsListening(false); recognitionRef.current = null; };
    recognition.onend = () => { setIsListening(false); recognitionRef.current = null; };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }, [isListening, stopListening, doSearch, doWebSearch]);

  // Cleanup on unmount / close
  useEffect(() => {
    if (!visible) stopListening();
  }, [visible, stopListening]);

  // Filter results based on active tab
  const filteredResults = useMemo(() => {
    if (!results?.results) return {};
    if (activeTab === 'tous' || activeTab === 'web') return results.results;
    const tabConfig = SEARCH_TABS.find(t => t.id === activeTab);
    if (!tabConfig?.categories) return results.results;
    const filtered: Record<string, SearchResult[]> = {};
    for (const cat of tabConfig.categories) {
      if (results.results[cat]?.length) filtered[cat] = results.results[cat];
    }
    return filtered;
  }, [results, activeTab]);

  const flatResults = useMemo(() => {
    if (activeTab === 'web') return webResults;
    const flat: SearchResult[] = [];
    for (const category of Object.keys(filteredResults)) {
      const items = filteredResults[category];
      if (items) {
        for (const item of items) {
          flat.push(item);
        }
      }
    }
    return flat;
  }, [filteredResults, activeTab, webResults]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults(null);
      setSelectedIndex(-1);
      setActiveTab('tous');
      setWebResults([]);
    }
  }, [visible]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [visible, onClose]);

  useEffect(() => {
    if (!visible) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [visible, onClose]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    // Internal search: fast debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(val.trim());
    }, DEBOUNCE_MS);
    // Web search: slower debounce (avoid spamming external APIs)
    if (webDebounceRef.current) clearTimeout(webDebounceRef.current);
    webDebounceRef.current = setTimeout(() => {
      doWebSearch(val.trim());
    }, WEB_DEBOUNCE_MS);
  }, [doSearch, doWebSearch]);

  const handleTabChange = useCallback((tabId: SearchTab) => {
    setActiveTab(tabId);
    setSelectedIndex(-1);
    if (tabId === 'web' && query.trim().length >= MIN_QUERY_LENGTH) {
      doWebSearch(query.trim());
    }
  }, [query, doWebSearch]);

  const handleSelect = useCallback(async (item: SearchResult) => {
    if (item._route) {
      if (item._route.startsWith('http')) {
        // Sur plateforme native (Android/iOS), ouvrir dans le WebView natif
        const { openInNativeBrowser } = await import('../utils/capacitor');
        const opened = await openInNativeBrowser(item._route);
        if (!opened) {
          // Sur le web → overlay in-app browser (l'utilisateur reste sur Zhiive)
          setWallViewUrl(item._route);
        }
      } else {
        navigate(item._route);
      }
    }
    onClose();
  }, [navigate, onClose, query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const total = flatResults.length;
    if (!total) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % total);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + total) % total);
    } else if (e.key === 'Enter' && selectedIndex >= 0 && flatResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(flatResults[selectedIndex]);
    }
  }, [flatResults, selectedIndex, handleSelect]);

  if (!visible) return null;

  const isActiveLoading = activeTab === 'web' ? webLoading : (activeTab === 'tous' ? (loading && webLoading) : loading);
  const hasDbResults = filteredResults && Object.keys(filteredResults).length > 0;
  const hasResults = activeTab === 'web'
    ? webResults.length > 0
    : activeTab === 'tous'
      ? (hasDbResults || webResults.length > 0)
      : hasDbResults;
  const showDropdown = query.length >= MIN_QUERY_LENGTH;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: `${headerHeight}px`,
        left: 0, right: 0,
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: `calc(100vh - ${headerHeight}px - 40px)`,
      }}
    >
      {/* Barre de recherche */}
      <div style={{
        background: 'linear-gradient(135deg, #0B0E2A 0%, #1a1e4e 100%)',
        padding: isMobile ? '8px 12px' : '8px 16px',
        boxShadow: '0 4px 20px ${SF.overlayDarkMedium}',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Input
            ref={inputRef}
            placeholder={isListening ? t('common.listening', 'Parlez maintenant...') : t('common.search') + '...'}
            prefix={<SearchOutlined style={{ color: SF.textMuted }} />}
            suffix={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isActiveLoading && <Spin size="small" />}
                {((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && (
                  <AudioOutlined
                    onClick={startListening}
                    style={{
                      fontSize: 16,
                      cursor: 'pointer',
                      color: isListening ? '#ff4d4f' : SF.textMuted,
                      animation: isListening ? 'zhiive-pulse 1.2s infinite' : 'none',
                      transition: 'color 0.2s',
                    }}
                  />
                )}
              </div>
            }
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            allowClear
            style={{ flex: 1, height: 36, borderRadius: SF.radiusSm, fontSize: 14 }}
          />
          <CloseOutlined
            onClick={onClose}
            style={{ color: 'white', fontSize: 16, cursor: 'pointer', padding: 4 }}
          />
        </div>

        {/* ── Sub-tabs Google-style ── */}
        {showDropdown && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 0 : 2,
            marginTop: 6,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {SEARCH_TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  role="button" tabIndex={0} onClick={() => handleTabChange(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: isMobile ? '4px 8px' : '5px 12px',
                    borderRadius: 16,
                    cursor: 'pointer',
                    fontSize: isMobile ? 11 : 12,
                    fontWeight: isActive ? 600 : 400,
                    whiteSpace: 'nowrap',
                    color: isActive ? '#fff' : SF.overlayLightMedium,
                    background: isActive ? SF.overlayLighter : 'transparent',
                    borderBottom: isActive ? '2px solid #8c7ae6' : '2px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  {React.cloneElement(tab.icon as React.ReactElement, {
                    style: { fontSize: isMobile ? 12 : 13 },
                  })}
                  <span>{tab.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Résultats — uniquement quand on tape */}
      {showDropdown && (
        <div style={{
          background: SF.cardBg,
          borderRadius: `0 0 ${SF.radius}px ${SF.radius}px`,
          boxShadow: '0 8px 32px ${SF.overlayDarkSubtle}',
          overflowY: 'auto',
          maxHeight: isMobile ? '70vh' : '60vh',
          margin: isMobile ? '0 4px' : '0 16px',
        }}>
          {isActiveLoading && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Spin size="small" />
            </div>
          )}

          {!isActiveLoading && !hasResults && (
            <div style={{ padding: 20 }}>
              <Empty
                description={activeTab === 'web'
                  ? `Aucun résultat pour "${query}"`
                  : `Aucun résultat pour "${query}"`}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          )}

          {/* ── Web results — rich cards ── */}
          {!isActiveLoading && activeTab === 'web' && webResults.length > 0 && (
            <div style={{ padding: '4px 0' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px 6px',
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                color: SF.primary, letterSpacing: 0.5,
              }}>
                <GlobalOutlined />
                <span>{webResults.length} résultat{webResults.length > 1 ? 's' : ''} web</span>
                {webLoading && <Spin size="small" style={{ marginLeft: 6 }} />}
              </div>
              {webResults.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={item.id}
                    role="button" tabIndex={0} onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 16px', cursor: 'pointer', transition: 'background 0.12s',
                      background: isSelected ? SF.primaryAlpha08 : 'transparent',
                    }}
                  >
                    {/* Thumbnail */}
                    {item.imageUrl ? (
                      <div style={{
                        width: 80, minWidth: 80, height: 56, borderRadius: 6,
                        overflow: 'hidden', background: '#f0f0f0', flexShrink: 0,
                      }}>
                        <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                      </div>
                    ) : (
                      <div style={{
                        width: 80, minWidth: 80, height: 56, borderRadius: 6,
                        background: `${SF.primary}10`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <GlobalOutlined style={{ fontSize: 22, color: SF.primary, opacity: 0.5 }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Favicon + domain */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                        {item.favicon && (
                          <img src={item.favicon} alt="" style={{ width: 14, height: 14, borderRadius: 2 }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                        <span style={{ fontSize: 10, color: SF.textMuted }}>
                          {item._route?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                        </span>
                      </div>
                      {/* Title */}
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: SF.primary,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item._label}
                      </div>
                      {/* Description */}
                      {item._desc && (
                        <div style={{
                          fontSize: 11, color: SF.textSecondary, lineHeight: 1.35, marginTop: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }}>
                          {item._desc}
                        </div>
                      )}
                    </div>
                    {/* Bookmark star */}
                    <div
                      role="button" tabIndex={0} onClick={e => {
                        e.stopPropagation();
                        toggleBookmark({
                          url: item._route,
                          title: item._label || '',
                          description: item._desc,
                          favicon: item.favicon,
                          imageUrl: item.imageUrl,
                        });
                      }}
                      style={{
                        padding: 4, cursor: 'pointer', flexShrink: 0,
                        transition: 'transform 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                      title={isBookmarked(item._route) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      {isBookmarked(item._route) ? (
                        <StarFilled style={{ fontSize: 14, color: '#faad14' }} />
                      ) : (
                        <StarOutlined style={{ fontSize: 14, color: SF.textMuted }} />
                      )}
                    </div>
                    <ArrowRightOutlined style={{ fontSize: 10, color: SF.textMuted, flexShrink: 0 }} />
                  </div>
                );
              })}
              <div
                role="button" tabIndex={0} onClick={() => { setCenterApp(null); setBrowseUrl(null); setWallSearchQuery(query.trim()); navigate('/dashboard'); onClose(); }}
                style={{
                  padding: '8px 16px', fontSize: 12, color: SF.primary,
                  cursor: 'pointer', fontWeight: 600, textAlign: 'center',
                  borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 4,
                }}
              >
                Plus de recherche →
              </div>
            </div>
          )}

          {/* ── Internal results (Zhiive data) ── */}
          {!isActiveLoading && activeTab !== 'web' && hasResults && results && (
            <div style={{ padding: '4px 0' }}>
              <div style={{ padding: '4px 16px 6px', fontSize: 12, color: SF.textMuted }}>
                {flatResults.length} résultat{flatResults.length > 1 ? 's' : ''}
                {activeTab !== 'tous' && ` dans ${SEARCH_TABS.find(t => t.id === activeTab)?.label || ''}`}
              </div>

              {Object.entries(filteredResults).map(([category, items]) => {
                const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
                if (!items.length) return null;

                return (
                  <div key={category}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 16px 2px',
                      fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                      color: config.color, letterSpacing: 0.5,
                    }}>
                      {config.icon}
                      <span>{config.label}</span>
                    </div>

                    {items.map((item) => {
                      const globalIdx = flatResults.indexOf(item);
                      const isSelected = selectedIndex === globalIdx;

                      return (
                        <div
                          key={`${item._type}-${item.id}`}
                          role="button" tabIndex={0} onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '6px 16px', cursor: 'pointer', transition: 'background 0.1s',
                            background: isSelected ? `${config.color}12` : 'transparent',
                          }}
                        >
                          {item._type === 'user' || item._type === 'lead' ? (
                            <Avatar size={28} src={item.avatarUrl} style={{ backgroundColor: config.color, flexShrink: 0, fontSize: 12 }}>
                              {(item.firstName || item._label || '?').charAt(0).toUpperCase()}
                            </Avatar>
                          ) : (
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: `${config.color}15`, display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, color: config.color, flexShrink: 0,
                            }}>
                              {ICON_MAP[item._icon] || config.icon}
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 500, color: SF.text,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {highlightMatch(item._label || '', results.query)}
                            </div>
                            {item._desc && (
                              <div style={{
                                fontSize: 11, color: SF.textSecondary,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {item._desc}
                                {item._table && item._matchedColumn && (
                                  <span style={{
                                    marginLeft: 6, fontSize: 9, color: SF.textMuted,
                                    background: `${SF.textMuted}15`, borderRadius: 3,
                                    padding: '1px 4px',
                                  }}>
                                    {item._table}.{item._matchedColumn}
                                  </span>
                                )}
                              </div>
                            )}
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

          {/* ── Web results preview in "Tous" tab — rich cards ── */}
          {!isActiveLoading && activeTab === 'tous' && webResults.length > 0 && (
            <div style={{ padding: '4px 0' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px 6px',
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                color: SF.primary, letterSpacing: 0.5,
                borderTop: hasDbResults ? '1px solid rgba(0,0,0,0.06)' : 'none',
                marginTop: hasDbResults ? 4 : 0,
              }}>
                <GlobalOutlined />
                <span>Recherche Web</span>
                {webLoading && <Spin size="small" style={{ marginLeft: 6 }} />}
              </div>
              {webResults.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  role="button" tabIndex={0} onClick={() => handleSelect(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 16px', cursor: 'pointer', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,92,231,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Thumbnail */}
                  {item.imageUrl ? (
                    <div style={{
                      width: 80, minWidth: 80, height: 56, borderRadius: 6,
                      overflow: 'hidden', background: '#f0f0f0', flexShrink: 0,
                    }}>
                      <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                    </div>
                  ) : null}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Favicon + domain */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      {item.favicon && (
                        <img src={item.favicon} alt="" style={{ width: 14, height: 14, borderRadius: 2 }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      <span style={{ fontSize: 10, color: SF.textMuted }}>
                        {item._route?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                      </span>
                    </div>
                    {/* Title */}
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: SF.primary,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item._label}
                    </div>
                    {/* Description */}
                    {item._desc && (
                      <div style={{
                        fontSize: 11, color: SF.textSecondary, lineHeight: 1.35, marginTop: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {item._desc}
                      </div>
                    )}
                  </div>
                  {/* Bookmark star */}
                  <div
                    role="button" tabIndex={0} onClick={e => {
                      e.stopPropagation();
                      toggleBookmark({
                        url: item._route,
                        title: item._label || '',
                        description: item._desc,
                        favicon: item.favicon,
                        imageUrl: item.imageUrl,
                      });
                    }}
                    style={{
                      padding: 4, cursor: 'pointer', flexShrink: 0,
                      transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    title={isBookmarked(item._route) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  >
                    {isBookmarked(item._route) ? (
                      <StarFilled style={{ fontSize: 14, color: '#faad14' }} />
                    ) : (
                      <StarOutlined style={{ fontSize: 14, color: SF.textMuted }} />
                    )}
                  </div>
                  <ArrowRightOutlined style={{ fontSize: 10, color: SF.textMuted, flexShrink: 0 }} />
                </div>
              ))}
              {webResults.length > 4 && (
                <div
                  role="button" tabIndex={0} onClick={() => { setCenterApp(null); setBrowseUrl(null); setWallSearchQuery(query.trim()); navigate('/dashboard'); onClose(); }}
                  style={{
                    padding: '8px 16px', fontSize: 12, color: SF.primary,
                    cursor: 'pointer', fontWeight: 600, textAlign: 'center',
                    borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 4,
                  }}
                >
                  Plus de recherche →
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {showDropdown && (
        <div
          role="button" tabIndex={0} onClick={onClose}
          style={{
            position: 'fixed',
            top: `${headerHeight}px`,
            left: 0, right: 0, bottom: 0,
            background: SF.overlayDarkSubtle,
            zIndex: -1,
          }}
        />
      )}
    </div>
  );
};

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safeQuery})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <strong key={i} style={{ color: SF.primary }}>{part}</strong>
      : part
  );
}

export default GlobalSearch;
