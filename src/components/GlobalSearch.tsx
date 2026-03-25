import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Input, Spin, Empty, Avatar } from 'antd';
import {
  SearchOutlined, CloseOutlined, UserOutlined, ContactsOutlined,
  ToolOutlined, AppstoreOutlined, FilePdfOutlined, MessageOutlined,
  MailOutlined, FileTextOutlined, CalendarOutlined, FormOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
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
  [key: string]: any;
}

interface SearchResponse {
  results: Record<string, SearchResult[]>;
  query: string;
  total: number;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const apiStable = useMemo(() => api, []);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const flatResults = useMemo(() => {
    if (!results?.results) return [];
    const flat: SearchResult[] = [];
    for (const category of Object.keys(results.results)) {
      for (const item of results.results[category]) {
        flat.push(item);
      }
    }
    return flat;
  }, [results]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults(null);
      setSelectedIndex(-1);
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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val.trim()), DEBOUNCE_MS);
  }, [doSearch]);

  const handleSelect = useCallback((item: SearchResult) => {
    if (item._route) {
      if (item._route.startsWith('http')) {
        window.open(item._route, '_blank', 'noopener,noreferrer');
      } else {
        navigate(item._route);
      }
    }
    onClose();
  }, [navigate, onClose]);

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

  const hasResults = results && Object.keys(results.results).length > 0;
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
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Input
          ref={inputRef}
          placeholder={t('common.search') + '...'}
          prefix={<SearchOutlined style={{ color: SF.textMuted }} />}
          suffix={loading ? <Spin size="small" /> : null}
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

      {/* Résultats — uniquement quand on tape */}
      {showDropdown && (
        <div style={{
          background: SF.cardBg,
          borderRadius: `0 0 ${SF.radius}px ${SF.radius}px`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          overflowY: 'auto',
          maxHeight: isMobile ? '70vh' : '60vh',
          margin: isMobile ? '0 4px' : '0 16px',
        }}>
          {loading && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Spin size="small" />
            </div>
          )}

          {!loading && !hasResults && (
            <div style={{ padding: 20 }}>
              <Empty
                description={`Aucun résultat pour "${query}"`}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          )}

          {!loading && hasResults && results && (
            <div style={{ padding: '4px 0' }}>
              <div style={{ padding: '4px 16px 6px', fontSize: 12, color: SF.textMuted }}>
                {results.total} résultat{results.total > 1 ? 's' : ''}
              </div>

              {Object.entries(results.results).map(([category, items]) => {
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
                          onClick={() => handleSelect(item)}
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
        </div>
      )}

      {/* Backdrop */}
      {showDropdown && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: `${headerHeight}px`,
            left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.2)',
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
