import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Spin, Empty, Button, Tooltip, Badge } from 'antd';
import {
  ReloadOutlined,
  GlobalOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useBookmarks } from '../hooks/useBookmarks';
import { useZhiiveNav } from '../contexts/ZhiiveNavContext';
import { SF } from '../components/zhiive/ZhiiveTheme';
import { logger } from '../lib/logger';

// ── Types ──
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
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

// ── Feed Card Component ──
const FeedCard: React.FC<{
  feed: FeedResult;
  onRefresh: (bookmarkId: string) => void;
  refreshing: boolean;
  onOpenUrl: (url: string, forceExternal?: boolean) => void;
}> = ({ feed, onRefresh, refreshing, onOpenUrl }) => {
  const { t } = useTranslation();
  const hasError = !!feed.error;
  const hasItems = feed.items.length > 0;
  const ext = !!feed.openExternal;
  // For openExternal sites (Amazon etc.), deep links are blocked — always open main site
  const resolveLink = (itemLink?: string) => ext ? feed.url : (itemLink || feed.url);

  return (
    <div
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
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: `1px solid ${SF.border}`,
          background: SF.bg,
        }}
      >
        {feed.favicon ? (
          <img loading="lazy" src={feed.favicon}
            alt=""
            style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <GlobalOutlined style={{ fontSize: 18, color: SF.textSecondary, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: SF.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {feed.title}
          </div>
          {feed.domain && (
            <div style={{ fontSize: 11, color: SF.textSecondary }}>
              {feed.domain}
            </div>
          )}
        </div>
        <Tooltip title={t('honeycomb.refresh')}>
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={() => onRefresh(feed.bookmarkId)}
            style={{ color: SF.textSecondary }}
          />
        </Tooltip>
      </div>

      {/* Content */}
      <div style={{ padding: '8px 0', flex: 1 }}>
        {hasError && !hasItems && (
          <div
            role="button" tabIndex={0} onClick={() => onOpenUrl(feed.url, ext)}
            style={{
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            className="hover:bg-gray-50"
          >
            {/* Show bookmark image as banner if available */}
            {feed.imageUrl && (
              <div style={{ width: '100%', height: 140, overflow: 'hidden', background: SF.bg }}>
                <img loading="lazy" src={feed.imageUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
              </div>
            )}
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: SF.text, marginBottom: 6 }}>
                {feed.error === 'no_feed'
                  ? t('honeycomb.exploreSite')
                  : t('honeycomb.fetchFailed')}
              </div>
              <div style={{ fontSize: 12, color: SF.textSecondary, marginBottom: 12 }}>
                {feed.error === 'no_feed'
                  ? t('honeycomb.exploreSiteDesc')
                  : t('honeycomb.retryLater')}
              </div>
              <Button
                type="primary"
                size="small"
                icon={<GlobalOutlined />}
                style={{ background: SF.primary, borderColor: SF.primary }}
              >
                {t('honeycomb.openInHive')}
              </Button>
            </div>
          </div>
        )}

        {hasItems &&
          feed.items.map((item, idx) => {
            // First item with image = hero mode (full-width image)
            const isHero = idx === 0 && !!item.imageUrl;
            
            if (isHero) {
              return (
                <div
                  key={idx}
                  role="button" tabIndex={0} onClick={() => onOpenUrl(resolveLink(item.link), ext)}
                  style={{
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    borderBottom: idx < feed.items.length - 1 ? `1px solid ${SF.border}` : undefined,
                  }}
                  className="hover:bg-gray-50"
                >
                  {/* Hero image */}
                  <div
                    style={{
                      width: '100%',
                      height: 160,
                      overflow: 'hidden',
                      background: SF.bg,
                    }}
                  >
                    <img loading="lazy" src={item.imageUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                      }}
                    />
                  </div>
                  <div style={{ padding: '8px 16px' }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: SF.text,
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.title}
                    </div>
                    {item.snippet && (
                      <div
                        style={{
                          fontSize: 11,
                          color: SF.textSecondary,
                          marginTop: 3,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.35,
                        }}
                      >
                        {item.snippet}
                      </div>
                    )}
                    {item.pubDate && (
                      <div style={{ fontSize: 10, color: SF.textSecondary, marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <ClockCircleOutlined style={{ fontSize: 10 }} />
                        {timeAgo(item.pubDate)}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
            <div
              key={idx}
              role="button" tabIndex={0} onClick={() => onOpenUrl(resolveLink(item.link), ext)}
              style={{
                display: 'flex',
                padding: '8px 16px',
                gap: 10,
                cursor: 'pointer',
                color: 'inherit',
                transition: 'background 0.15s',
                borderBottom: idx < feed.items.length - 1 ? `1px solid ${SF.border}` : undefined,
              }}
              className="hover:bg-gray-50"
            >
              {/* Thumbnail */}
              {item.imageUrl && (
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: SF.radiusSm,
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: SF.bg,
                  }}
                >
                  <img loading="lazy" src={item.imageUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: SF.text,
                    lineHeight: 1.35,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.title}
                </div>
                {item.snippet && (
                  <div
                    style={{
                      fontSize: 11,
                      color: SF.textSecondary,
                      marginTop: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.35,
                    }}
                  >
                    {item.snippet}
                  </div>
                )}
                {item.pubDate && (
                  <div style={{ fontSize: 10, color: SF.textSecondary, marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <ClockCircleOutlined style={{ fontSize: 10 }} />
                    {timeAgo(item.pubDate)}
                  </div>
                )}
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

      {/* Footer: open site */}
      <div
        role="button" tabIndex={0} onClick={() => onOpenUrl(feed.url, ext)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '8px 16px',
          borderTop: `1px solid ${SF.border}`,
          fontSize: 12,
          color: SF.primary,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        className="hover:bg-purple-50"
      >
        <GlobalOutlined style={{ fontSize: 12 }} />
        {feed.domain || feed.url}
      </div>
    </div>
  );
};

// ── Main Page ──
const HoneycombPage: React.FC = () => {
  const { t } = useTranslation();
  const { api } = useAuthenticatedApi();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const apiStable = useMemo(() => api, []);
  const { bookmarks } = useBookmarks();
  const { setWallViewUrl } = useZhiiveNav();

  const openUrlInHive = useCallback((url: string, forceExternal = false) => {
    if (forceExternal) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      setWallViewUrl(url);
    }
  }, [setWallViewUrl]);

  const [feeds, setFeeds] = useState<FeedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  const fetchAllFeeds = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      const url = forceRefresh ? '/api/user/bookmarks/feeds?refresh=true' : '/api/user/bookmarks/feeds';
      const data = (await apiStable.get(url)) as { feeds: FeedResult[] };
      setFeeds(data.feeds || []);
    } catch (err) {
      logger.error('[Honeycomb] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiStable]);

  const refreshSingleFeed = useCallback(
    async (bookmarkId: string) => {
      setRefreshingIds((prev) => new Set(prev).add(bookmarkId));
      try {
        const data = (await apiStable.get(`/api/user/bookmarks/feeds/${bookmarkId}`)) as {
          feed: FeedResult;
        };
        if (data.feed) {
          setFeeds((prev) =>
            prev.map((f) => (f.bookmarkId === bookmarkId ? data.feed : f)),
          );
        }
      } catch (err) {
        logger.error('[Honeycomb] refresh error:', err);
      } finally {
        setRefreshingIds((prev) => {
          const next = new Set(prev);
          next.delete(bookmarkId);
          return next;
        });
      }
    },
    [apiStable],
  );

  useEffect(() => {
    fetchAllFeeds();
  }, [fetchAllFeeds]);

  // ── Loading ──
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 16,
        }}
      >
        <Spin size="large" />
        <span style={{ color: SF.textSecondary, fontSize: 14 }}>{t('honeycomb.loading')}</span>
      </div>
    );
  }

  // ── Empty ──
  if (bookmarks.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: 32,
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: SF.text, marginBottom: 8 }}>
                {t('honeycomb.emptyTitle')}
              </div>
              <div style={{ fontSize: 14, color: SF.textSecondary }}>
                {t('honeycomb.emptyDescription')}
              </div>
            </div>
          }
        >
          <Button
            type="primary"
            icon={<SearchOutlined />}
            style={{ background: SF.primary, borderColor: SF.primary }}
          >
            {t('honeycomb.emptyAction')}
          </Button>
        </Empty>
      </div>
    );
  }

  // ── Feeds with articles vs feeds without ──
  const feedsWithArticles = feeds.filter((f) => f.items.length > 0);
  const feedsNoArticles = feeds.filter((f) => f.items.length === 0);

  return (
    <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
    <div style={{ padding: '16px 16px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: SF.text,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 28 }}>🍯</span>
            {t('honeycomb.title')}
            <Badge
              count={feedsWithArticles.length}
              style={{ backgroundColor: SF.primary }}
            />
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: SF.textSecondary }}>
            {t('honeycomb.subtitle')}
          </p>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => fetchAllFeeds(true)}
          loading={loading}
        >
          {t('honeycomb.refreshAll')}
        </Button>
      </div>

      {/* Feeds grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {feedsWithArticles.map((feed) => (
          <FeedCard
            key={feed.bookmarkId}
            feed={feed}
            onRefresh={refreshSingleFeed}
            refreshing={refreshingIds.has(feed.bookmarkId)}
            onOpenUrl={openUrlInHive}
          />
        ))}
        {feedsNoArticles.map((feed) => (
          <FeedCard
            key={feed.bookmarkId}
            feed={feed}
            onRefresh={refreshSingleFeed}
            refreshing={refreshingIds.has(feed.bookmarkId)}
            onOpenUrl={openUrlInHive}
          />
        ))}
      </div>
    </div>
    </div>
  );
};

export default HoneycombPage;
