import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authMiddleware } from '../middlewares/auth';
import Parser from 'rss-parser';
import { logger } from '../lib/logger';

const router = Router();

// ── Constantes nommées (zéro magic numbers) ──
const RSS_PARSER_TIMEOUT_MS = 15_000;
const FETCH_TIMEOUT_MS = 12_000;
const CACHE_SUCCESS_TTL_MS = 15 * 60 * 1000;       // 15 minutes (feeds with real content)
const CACHE_SUCCESS_LONG_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours (scraped sites — expensive & rate-limited)
const CACHE_ERROR_TTL_MS = 2 * 60 * 1000;             // 2 minutes
const FAVICON_FALLBACK_SIZE = 128;
const MAX_ITEMS_PER_FEED = 5;
const MAX_SNIPPET_LENGTH = 200;
const _CONCURRENCY_LIMIT = 5; // available for chunked fetching if needed
const FEEDS_ENDPOINT_TIMEOUT_MS = 8_000;               // Max 8s for the entire /feeds endpoint
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const rssParser = new Parser({
  timeout: RSS_PARSER_TIMEOUT_MS,
  headers: {
    'User-Agent': BROWSER_USER_AGENT,
    'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
  },
});

// ── In-memory cache ──
interface CacheEntry {
  data: FeedResult;
  expiry: number;
}
const feedCache = new Map<string, CacheEntry>();

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

// ── Common RSS feed paths to probe dynamically ──
const COMMON_FEED_PATHS = [
  '/feed',
  '/rss',
  '/rss.xml',
  '/feed.xml',
  '/atom.xml',
  '/feeds/posts/default',
  '/blog/feed',
  '/news/feed',
  '/feed/rss',
  '/index.xml',
  '/.rss',
  '/rss/news',
  '/fr/rss',
  '/en/rss',
];

/**
 * Fetch helper with timeout and browser-like headers
 */
async function safeFetch(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        'Accept': 'text/html, application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
        'Accept-Language': 'fr-BE,fr;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);
    return resp;
  } catch {
    return null;
  }
}

/** Feed type detected */
type FeedType = 'rss' | 'json' | null;

/**
 * Check if a response body looks like an RSS/Atom feed
 */
function looksLikeFeed(contentType: string, body: string): boolean {
  if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
    return true;
  }
  const trimmed = body.trimStart().slice(0, 500);
  return trimmed.startsWith('<?xml') || trimmed.includes('<rss') || trimmed.includes('<feed') || trimmed.includes('<channel>');
}

/**
 * Check if a response is a JSON Feed (https://www.jsonfeed.org/)
 * JSON Feed has { version: "https://jsonfeed.org/...", items: [...] }
 */
function looksLikeJsonFeed(contentType: string, body: string): boolean {
  if (!contentType.includes('json')) return false;
  try {
    const parsed = JSON.parse(body);
    return (parsed.version && parsed.items && Array.isArray(parsed.items));
  } catch {
    return false;
  }
}

/**
 * Detect feed type from response
 */
function detectFeedType(contentType: string, body: string): FeedType {
  if (looksLikeFeed(contentType, body)) return 'rss';
  if (looksLikeJsonFeed(contentType, body)) return 'json';
  return null;
}

/**
 * Parse a JSON Feed into our FeedItem format
 * Supports: jsonfeed.org spec, WordPress REST API, generic JSON arrays
 */
function parseJsonFeed(body: string, siteUrl: string): { title?: string; items: FeedItem[] } {
  try {
    const parsed = JSON.parse(body);
    let feedItems: unknown[] = [];
    let feedTitle: string | undefined;

    // ── JSON Feed spec (jsonfeed.org) ──
    if (parsed.version && parsed.items) {
      feedTitle = parsed.title;
      feedItems = parsed.items;
    }
    // ── WordPress REST API (/wp-json/wp/v2/posts) ──
    else if (Array.isArray(parsed) && parsed[0]?.title?.rendered) {
      feedItems = parsed;
    }
    // ── Generic array of objects with title ──
    else if (Array.isArray(parsed) && parsed[0]?.title) {
      feedItems = parsed;
    }
    // ── Wrapped in a data/results/articles key ──
    else {
      const arr = parsed.data || parsed.results || parsed.articles || parsed.posts || parsed.news || parsed.entries;
      if (Array.isArray(arr)) {
        feedTitle = parsed.title || parsed.name;
        feedItems = arr;
      }
    }

    const baseUrl = new URL(siteUrl).origin;
    const items: FeedItem[] = feedItems.slice(0, MAX_ITEMS_PER_FEED).map((item: Record<string, unknown>) => {
      // Title: various possible fields
      const title = (typeof item.title === 'string' ? item.title : item.title?.rendered || item.name || item.headline || '');
      // Link
      let link = item.url || item.link || item.href || '';
      if (link && !link.startsWith('http')) {
        try { link = new URL(link, siteUrl).toString(); } catch { /* keep as-is */ }
      }
      // Image: many possible fields, support protocol-relative URLs
      let imageUrl = item.image || item.banner_image || item.imageUrl || item.thumbnail ||
        item.featured_image || item.media?.thumbnail?.url || item.enclosure?.url ||
        (item.featured_media_src_url) || '';
      if (typeof imageUrl === 'object') {
        imageUrl = imageUrl.url || imageUrl.src || '';
      }
      if (imageUrl && imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }
      if (imageUrl && !imageUrl.startsWith('http')) {
        try { imageUrl = new URL(imageUrl, baseUrl).toString(); } catch { imageUrl = ''; }
      }
      // Snippet
      const snippet = (item.summary || item.content_text || item.description || item.excerpt?.rendered || '')
        .replace(/<[^>]+>/g, '').slice(0, MAX_SNIPPET_LENGTH).trim();
      // Date
      const pubDate = item.date_published || item.date_modified || item.date || item.pubDate || item.published || undefined;

      return { title: decodeHtmlEntities(title).trim(), link, snippet: snippet || undefined, pubDate, imageUrl: imageUrl || undefined };
    }).filter((item: FeedItem) => item.title && item.title.length > 3);

    return { title: feedTitle, items };
  } catch (e) {
    logger.info(`[Honeycomb] ⚠️ JSON Feed parse error:`, e);
    return { items: [] };
  }
}

/** Result of feed discovery: URL + detected type */
interface DiscoveredFeed {
  url: string;
  type: FeedType;
}

// ── Common JSON API paths to probe ──
const COMMON_JSON_FEED_PATHS = [
  '/feed/news',
  '/fr/feed/news',
  '/en/feed/news',
  '/wp-json/wp/v2/posts?_embed&per_page=5',
  '/api/posts',
  '/api/articles',
  '/api/news',
  '/api/feed',
];

/**
 * 100% dynamic feed discovery — Supports ALL formats: RSS, Atom, JSON Feed, WP REST API
 * 
 * Strategy (in order):
 * 1. Parse HTML <head> for <link rel="alternate"> — detects RSS, Atom AND JSON Feed
 * 2. Probe common feed paths (both XML and JSON)
 * 3. Try rss-parser directly on the site URL
 */
async function discoverFeedUrl(siteUrl: string, prefetchedHtml?: string): Promise<DiscoveredFeed | null> {
  const baseUrl = siteUrl.replace(/\/$/, '');

  // ── Strategy 1: HTML <head> auto-discovery (most reliable) ──
  try {
    const html = prefetchedHtml || await (async () => {
      const resp = await safeFetch(siteUrl);
      return (resp && resp.ok) ? resp.text() : '';
    })();
    if (html) {
      
      // Look for ALL <link rel="alternate"> with any feed type (RSS, Atom, JSON)
      const linkRegex = /<link[^>]+rel=["']alternate["'][^>]*>/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        const tag = match[0];
        const typeMatch = tag.match(/type=["']([^"']+)["']/i);
        const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
        if (!hrefMatch?.[1]) continue;
        
        const href = hrefMatch[1].replace(/&amp;/g, '&');
        const type = typeMatch?.[1] || '';
        
        // Skip non-feed alternate links (e.g. hreflang)
        if (!type.includes('xml') && !type.includes('rss') && !type.includes('atom') && !type.includes('json')) continue;

        try {
          const feedUrl = href.startsWith('http') ? href : new URL(href, siteUrl).toString();
          const feedResp = await safeFetch(feedUrl);
          if (feedResp && feedResp.ok) {
            const ct = feedResp.headers.get('content-type') || '';
            const body = await feedResp.text();
            const feedType = detectFeedType(ct, body);
            if (feedType) {
              logger.info(`[Honeycomb] ✅ Found ${feedType} feed via HTML <link>: ${feedUrl}`);
              return { url: feedUrl, type: feedType };
            }
          }
        } catch { /* continue */ }
      }

      // Also check for <a> links containing "rss" or "feed" in the href
      const aMatch = html.match(/<a[^>]+href=["']([^"']*(?:rss|feed|atom)[^"']*)["'][^>]*>/i);
      if (aMatch?.[1]) {
        try {
          const feedUrl = aMatch[1].startsWith('http') ? aMatch[1] : new URL(aMatch[1], siteUrl).toString();
          const feedResp = await safeFetch(feedUrl);
          if (feedResp && feedResp.ok) {
            const ct = feedResp.headers.get('content-type') || '';
            const body = await feedResp.text();
            const feedType = detectFeedType(ct, body);
            if (feedType) {
              logger.info(`[Honeycomb] ✅ Found ${feedType} feed via <a> link: ${feedUrl}`);
              return { url: feedUrl, type: feedType };
            }
          }
        } catch { /* continue */ }
      }
    }
  } catch { /* continue to next strategy */ }

  // ── OPTIMIZATION: When we already have the HTML and Strategy 1 found nothing,
  // skip expensive probe strategies (2-4) which fire 23+ requests and trigger rate-limiting.
  // If a feed isn't advertised in <head>, probing random paths almost never finds one.
  if (prefetchedHtml) {
    logger.info(`[Honeycomb] ⏭️ HTML analyzed, no feed advertised — skipping probes for: ${siteUrl}`);
    return null;
  }

  // ── Strategy 2: Probe common RSS/Atom paths (only when no prefetched HTML) ──
  for (const path of COMMON_FEED_PATHS) {
    try {
      const feedUrl = baseUrl + path;
      const resp = await safeFetch(feedUrl);
      if (resp && resp.ok) {
        const ct = resp.headers.get('content-type') || '';
        const body = await resp.text();
        const feedType = detectFeedType(ct, body);
        if (feedType) {
          logger.info(`[Honeycomb] ✅ Found ${feedType} feed via probe: ${feedUrl}`);
          return { url: feedUrl, type: feedType };
        }
      }
    } catch { /* continue to next path */ }
  }

  // ── Strategy 3: Probe common JSON API paths (only when no prefetched HTML) ──
  for (const path of COMMON_JSON_FEED_PATHS) {
    try {
      const feedUrl = baseUrl + path;
      const resp = await safeFetch(feedUrl);
      if (resp && resp.ok) {
        const ct = resp.headers.get('content-type') || '';
        const body = await resp.text();
        if (looksLikeJsonFeed(ct, body)) {
          logger.info(`[Honeycomb] ✅ Found JSON feed via probe: ${feedUrl}`);
          return { url: feedUrl, type: 'json' };
        }
        // Also check for WP REST API style (array of posts)
        if (ct.includes('json')) {
          try {
            const parsed = JSON.parse(body);
            if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].title || parsed[0].name)) {
              logger.info(`[Honeycomb] ✅ Found JSON API via probe: ${feedUrl}`);
              return { url: feedUrl, type: 'json' };
            }
          } catch { /* not valid JSON */ }
        }
      }
    } catch { /* continue to next path */ }
  }

  // ── Strategy 4: Try rss-parser directly on the URL (only when no prefetched HTML) ──
  try {
    const feed = await rssParser.parseURL(siteUrl);
    if (feed && feed.items && feed.items.length > 0) {
      logger.info(`[Honeycomb] ✅ Site URL is itself an RSS feed: ${siteUrl}`);
      return { url: siteUrl, type: 'rss' };
    }
  } catch { /* not a feed */ }

  logger.info(`[Honeycomb] ⚠️ No feed found for: ${siteUrl}`);
  return null;
}

/** Minimum HTML size to consider a page worth scraping (anti-bot pages are tiny) */
const MIN_HTML_SIZE_FOR_SCRAPING = 20_000;
/** Patterns in image URLs to skip */
const SKIP_IMG_PATTERNS = ['sprite', 'pixel', 'transparent', 'spacer', 'blank', 'logo', 'icon'];

/**
 * FALLBACK: Scrape VISUAL content directly from the site's HTML when no RSS is available.
 * Prioritizes images, products, promotions — anything visually engaging.
 * Falls back to article/heading strategies only if no visual content found.
 */
async function scrapeArticlesFromHtml(siteUrl: string, prefetchedHtml?: string): Promise<FeedItem[]> {
  try {
    const html = prefetchedHtml || await (async () => {
      const resp = await safeFetch(siteUrl);
      return (resp && resp.ok) ? resp.text() : '';
    })();
    if (!html) return [];
    
    // Anti-bot detection: if the HTML is very small, the site blocked us
    // Still try to extract ALL links as a last resort — better than nothing
    if (html.length < MIN_HTML_SIZE_FOR_SCRAPING) {
      logger.info(`[Honeycomb] ⚠️ Tiny HTML (${html.length} bytes) — likely anti-bot: ${siteUrl}`);
      const navItems: FeedItem[] = [];
      const navSeenUrls = new Set<string>();
      const baseUrl = new URL(siteUrl).origin;

      // Accept ANY href (absolute OR relative) with visible text
      const navLinkRegex = /<a\s[^>]*href=["']([^"'#][^"']{2,})["'][^>]*>([^<]{4,80})<\/a>/gi;
      let nm;
      while ((nm = navLinkRegex.exec(html)) !== null && navItems.length < MAX_ITEMS_PER_FEED * 2) {
        let href = nm[1].trim();
        const text = nm[2].trim();
        if (!text || text.length < 3) continue;
        // Skip non-content links
        if (/login|sign.?in|sign.?up|register|account|privacy|cookie|terms|help|faq|about|contact|legal|cgu|cgv/i.test(text)) continue;
        if (/login|signin|signup|register|account|privacy|cookie|terms|help|ap\/signin/i.test(href)) continue;
        // Skip anchors, javascript, mailto
        if (/^(javascript|mailto|tel):/i.test(href)) continue;

        // Resolve relative URLs to absolute
        try {
          const resolved = new URL(href, siteUrl).toString();
          href = resolved;
        } catch { continue; }

        // Must be same domain or subdomain
        try {
          const urlHost = new URL(href).hostname;
          const siteHost = new URL(siteUrl).hostname;
          if (!urlHost.includes(siteHost.replace(/^www\./, '')) && !siteHost.includes(urlHost.replace(/^www\./, ''))) continue;
        } catch { continue; }

        // Skip homepage itself
        if (href === siteUrl || href === siteUrl + '/' || href === baseUrl || href === baseUrl + '/') continue;

        if (navSeenUrls.has(href)) continue;
        navSeenUrls.add(href);
        navItems.push({ title: decodeHtmlEntities(text), link: href });
      }

      // Also try to extract links that contain images (even in anti-bot HTML)
      const imgLinkRegex = /<a\s[^>]*href=["']([^"'#][^"']{2,})["'][^>]*>[\s\S]{0,500}?<img[^>]+(?:src|data-src)=["']([^"']+)["'][\s\S]{0,200}?alt=["']([^"']{3,})["'][\s\S]*?<\/a>/gi;
      let im;
      while ((im = imgLinkRegex.exec(html)) !== null && navItems.length < MAX_ITEMS_PER_FEED * 2) {
        let href = im[1].trim();
        let imgSrc = im[2].trim();
        const alt = im[3].trim();
        try {
          href = new URL(href, siteUrl).toString();
          if (imgSrc.startsWith('//')) imgSrc = 'https:' + imgSrc;
          else if (!imgSrc.startsWith('http')) imgSrc = new URL(imgSrc, baseUrl).toString();
        } catch { continue; }
        if (navSeenUrls.has(href)) continue;
        navSeenUrls.add(href);
        navItems.push({ title: decodeHtmlEntities(alt), link: href, imageUrl: imgSrc });
      }

      // Deduplicate and take best items (prioritize those with images)
      const withImages = navItems.filter(i => !!i.imageUrl);
      const withoutImages = navItems.filter(i => !i.imageUrl);
      const finalItems = [...withImages, ...withoutImages].slice(0, MAX_ITEMS_PER_FEED);

      logger.info(`[Honeycomb] 🔗 Anti-bot fallback: extracted ${finalItems.length} nav items from ${siteUrl}`);
      return finalItems;
    }

    const items: FeedItem[] = [];
    const seenUrls = new Set<string>();
    const baseUrl = new URL(siteUrl).origin;

    // ── VISUAL STRATEGY 1: <a> tags containing <img> (linked image cards) ──
    // This catches product cards, news teasers, promo banners — the visual stuff
    {
      const linkedImgRegex = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,3000}?)<\/a>/gi;
      let m;
      while ((m = linkedImgRegex.exec(html)) !== null && items.length < MAX_ITEMS_PER_FEED) {
        const href = m[1];
        const inner = m[2];
        
        // Must contain a real image (src, data-src, or data-a-hires)
        // Accept absolute, protocol-relative (//), and path-relative URLs
        const imgMatch = inner.match(/(?:data-a-hires|data-src|src)=["']([^"']{5,})["']/i);
        if (!imgMatch) continue;
        let imgSrc = imgMatch[1].trim();
        // Skip data URIs, anchors, JS
        if (imgSrc.startsWith('data:') || imgSrc.startsWith('#') || imgSrc.startsWith('javascript:')) continue;
        // Resolve to absolute URL
        if (imgSrc.startsWith('//')) imgSrc = 'https:' + imgSrc;
        else if (!imgSrc.startsWith('http')) {
          try { imgSrc = new URL(imgSrc, baseUrl).toString(); } catch { continue; }
        }
        // Skip tiny icons, sprites, SVGs
        if (SKIP_IMG_PATTERNS.some(p => imgSrc.toLowerCase().includes(p))) continue;
        if (imgSrc.endsWith('.svg')) continue;

        // Extract title: prefer alt text, then heading text, then visible text
        let title = '';
        const altMatch = inner.match(/alt=["']([^"']{8,})["']/i);
        const hMatch = inner.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
        if (altMatch) {
          title = altMatch[1];
        } else if (hMatch) {
          title = hMatch[1].replace(/<[^>]+>/g, '').trim();
        } else {
          // Get visible text, skip if too short
          title = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
        title = decodeHtmlEntities(title).slice(0, 120).trim();
        if (!title || title.length < 5) continue;

        const fullUrl = resolveUrl(href, baseUrl, siteUrl);
        if (!fullUrl || seenUrls.has(fullUrl)) continue;
        if (fullUrl === siteUrl || fullUrl === siteUrl + '/') continue;

        seenUrls.add(fullUrl);
        // Get hi-res version if available (support relative URLs)
        const hiresMatch = inner.match(/data-a-hires=["']([^"']{5,})["']/i);
        let bestImg = imgSrc;
        if (hiresMatch) {
          let hires = hiresMatch[1].trim();
          if (hires.startsWith('//')) hires = 'https:' + hires;
          else if (!hires.startsWith('http')) {
            try { hires = new URL(hires, baseUrl).toString(); } catch { hires = ''; }
          }
          if (hires) bestImg = hires;
        }
        
        items.push({ title, link: fullUrl, imageUrl: bestImg });
      }
    }

    // ── VISUAL STRATEGY 2: <article> elements (news sites) ──
    if (items.length < MAX_ITEMS_PER_FEED) {
      const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi;
      let articleMatch;
      while ((articleMatch = articleRegex.exec(html)) !== null && items.length < MAX_ITEMS_PER_FEED) {
        const item = extractArticleFromHtml(articleMatch[1], baseUrl, siteUrl);
        if (item && !seenUrls.has(item.link)) {
          seenUrls.add(item.link);
          items.push(item);
        }
      }
    }

    // ── VISUAL STRATEGY 3: Card-like containers with images and links ──
    if (items.length < MAX_ITEMS_PER_FEED) {
      const cardRegex = /<(?:div|li|section)[^>]+class=["'][^"']*(?:card|teaser|product|promo|deal|featured|slider|banner|hero|highlight|catalog|offer)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|li|section)>/gi;
      let cardMatch;
      while ((cardMatch = cardRegex.exec(html)) !== null && items.length < MAX_ITEMS_PER_FEED) {
        const item = extractArticleFromHtml(cardMatch[1], baseUrl, siteUrl);
        if (item && !seenUrls.has(item.link)) {
          seenUrls.add(item.link);
          items.push(item);
        }
      }
    }

    // ── VISUAL STRATEGY 4: Linked headings (h2/h3 with links) — also look for nearby images ──
    if (items.length < MAX_ITEMS_PER_FEED) {
      const headingLinkRegex = /<(?:h[2-3])[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>|<a[^>]+href=["']([^"']+)["'][^>]*>\s*<(?:h[2-3])[^>]*>([^<]+)<\/(?:h[2-3])>/gi;
      let hlMatch;
      while ((hlMatch = headingLinkRegex.exec(html)) !== null && items.length < MAX_ITEMS_PER_FEED) {
        const href = hlMatch[1] || hlMatch[3];
        const title = (hlMatch[2] || hlMatch[4] || '').trim();
        if (href && title && title.length > 8) {
          const fullUrl = resolveUrl(href, baseUrl, siteUrl);
          if (fullUrl && !seenUrls.has(fullUrl) && isArticleUrl(fullUrl, siteUrl)) {
            // Search for a nearby image within ~2000 chars around this match
            const pos = hlMatch.index;
            const context = html.slice(Math.max(0, pos - 1000), pos + 2000);
            const nearbyImg = context.match(/(?:data-a-hires|data-src|src)=["']([^"']{5,}(?:jpg|jpeg|png|webp|gif)[^"']*)["']/i);
            let nearbyImgUrl: string | undefined;
            if (nearbyImg?.[1]) {
              let ni = nearbyImg[1].trim();
              if (ni.startsWith('//')) ni = 'https:' + ni;
              else if (!ni.startsWith('http')) {
                try { ni = new URL(ni, baseUrl).toString(); } catch { ni = ''; }
              }
              if (ni) nearbyImgUrl = ni;
            }
            seenUrls.add(fullUrl);
            items.push({ 
              title, 
              link: fullUrl,
              imageUrl: nearbyImgUrl,
            });
          }
        }
      }
    }

    // ── STRATEGY 5: Nav-links fallback (last resort — better than nothing) ──
    if (items.length === 0) {
      const navLinkRegex = /<a\s[^>]*href=["']([^"'#][^"']{2,})["'][^>]*>([^<]{4,80})<\/a>/gi;
      let nlm;
      while ((nlm = navLinkRegex.exec(html)) !== null && items.length < MAX_ITEMS_PER_FEED) {
        let href = nlm[1].trim();
        const text = nlm[2].trim();
        if (!text || text.length < 3) continue;
        if (/login|sign.?in|sign.?up|register|account|privacy|cookie|terms|help|faq|about|contact|legal|cgu|cgv/i.test(text)) continue;
        if (/login|signin|signup|register|account|privacy|cookie|terms|help|ap\/signin/i.test(href)) continue;
        if (/^(javascript|mailto|tel):/i.test(href)) continue;
        try { href = new URL(href, siteUrl).toString(); } catch { continue; }
        try {
          const urlHost = new URL(href).hostname;
          const siteHost = new URL(siteUrl).hostname;
          if (!urlHost.includes(siteHost.replace(/^www\./, '')) && !siteHost.includes(urlHost.replace(/^www\./, ''))) continue;
        } catch { continue; }
        if (href === siteUrl || href === siteUrl + '/' || href === baseUrl || href === baseUrl + '/') continue;
        if (seenUrls.has(href)) continue;
        seenUrls.add(href);
        items.push({ title: decodeHtmlEntities(text), link: href });
      }
      if (items.length > 0) {
        logger.info(`[Honeycomb] 🔗 Nav-link fallback: ${items.length} items from ${siteUrl}`);
      }
    }

    if (items.length > 0) {
      logger.info(`[Honeycomb] ✅ Scraped ${items.length} items from HTML: ${siteUrl}`);
    }
    return items;
  } catch {
    logger.info(`[Honeycomb] ⚠️ HTML scraping failed for: ${siteUrl}`);
    return [];
  }
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#\d+;/g, (m) => {
      const code = parseInt(m.slice(2, -1));
      return String.fromCharCode(code);
    });
}

/**
 * Extract an article (title + link + image) from an HTML snippet
 */
function extractArticleFromHtml(html: string, baseUrl: string, siteUrl: string): FeedItem | null {
  // Find the first link
  const linkMatch = html.match(/<a[^>]+href=["']([^"']+)["']/i);
  if (!linkMatch) return null;
  
  const href = linkMatch[1];
  const fullUrl = resolveUrl(href, baseUrl, siteUrl);
  if (!fullUrl || !isArticleUrl(fullUrl, siteUrl)) return null;

  // Find best title: h2/h3 > a text > img alt
  let title = '';
  const hMatch = html.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
  if (hMatch) {
    title = hMatch[1].replace(/<[^>]+>/g, '').trim();
  }
  if (!title) {
    const aMatch = html.match(/<a[^>]*>([^<]{10,})<\/a>/i);
    if (aMatch) title = aMatch[1].trim();
  }
  if (!title || title.length < 5) return null;

  // Find image (support data-src, data-a-hires for lazy loading + relative URLs)
  const imgMatch = html.match(/<img[^>]+(?:data-a-hires|data-src|src)=["']([^"']{5,})["']/i);
  let imageUrl: string | undefined;
  if (imgMatch?.[1]) {
    let img = imgMatch[1].trim();
    if (!img.startsWith('data:') && !img.startsWith('#')) {
      if (img.startsWith('//')) img = 'https:' + img;
      else if (!img.startsWith('http')) {
        try { img = new URL(img, baseUrl).toString(); } catch { img = ''; }
      }
      if (img && !SKIP_IMG_PATTERNS.some(p => img.toLowerCase().includes(p)) && !img.endsWith('.svg')) {
        imageUrl = img;
      }
    }
  }

  // Find snippet
  const pMatch = html.match(/<p[^>]*>([^<]{20,})<\/p>/i);
  const snippet = pMatch ? pMatch[1].trim().slice(0, MAX_SNIPPET_LENGTH) : undefined;

  return { title, link: fullUrl, imageUrl, snippet };
}

/**
 * Extract Open Graph / meta tags from HTML (for site-level card image)
 */
function extractOgMeta(html: string): { ogImage?: string; ogDescription?: string } {
  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)
    || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  return {
    ogImage: ogImageMatch?.[1] || undefined,
    ogDescription: ogDescMatch?.[1] || undefined,
  };
}

/**
 * Resolve relative / absolute URLs
 */
function resolveUrl(href: string, baseUrl: string, siteUrl: string): string | null {
  if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return null;
  try {
    if (href.startsWith('http')) return href;
    return new URL(href, siteUrl).toString();
  } catch {
    return null;
  }
}

/**
 * Filter out non-article URLs (navigation links, categories, etc.)
 */
function isArticleUrl(url: string, siteUrl: string): boolean {
  try {
    const u = new URL(url);
    const siteHost = new URL(siteUrl).hostname;
    // Must be same domain or subdomain
    if (!u.hostname.endsWith(siteHost.replace(/^www\./, '')) && !siteHost.endsWith(u.hostname.replace(/^www\./, ''))) {
      return false;
    }
    // Skip obvious non-articles
    const path = u.pathname.toLowerCase();
    const skipPatterns = ['/tag/', '/category/', '/author/', '/page/', '/login', '/register', '/contact', '/about', '/privacy', '/terms', '/search', '/cart', '/account'];
    if (skipPatterns.some(p => path.includes(p))) return false;
    // Skip very short paths (likely section pages, not articles)
    if (path === '/' || path.split('/').filter(Boolean).length < 1) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch and parse a feed for a bookmark
 */
async function fetchFeedForBookmark(bookmark: {
  id: string;
  url: string;
  title: string;
  domain?: string | null;
  favicon?: string | null;
  imageUrl?: string | null;
}): Promise<FeedResult> {
  // Check cache
  const cached = feedCache.get(bookmark.url);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const result: FeedResult = {
    bookmarkId: bookmark.id,
    url: bookmark.url,
    title: bookmark.title,
    domain: bookmark.domain,
    favicon: bookmark.favicon,
    imageUrl: bookmark.imageUrl,
    feedUrl: null,
    items: [],
  };

  try {
    // ── SINGLE FETCH: Get HTML + headers in one request ──
    // This avoids hitting the site 20+ times (which triggers rate-limiting/anti-bot)
    let siteHtml = '';
    let iframeBlocked = false;
    let antiBotDetected = false;
    try {
      const mainResp = await safeFetch(bookmark.url);
      if (mainResp) {
        // Detect iframe-blocking headers (decision deferred until we know if there's a feed)
        const xfo = (mainResp.headers.get('x-frame-options') || '').toLowerCase();
        const csp = (mainResp.headers.get('content-security-policy') || '').toLowerCase();
        if (xfo === 'deny' || xfo === 'sameorigin') {
          iframeBlocked = true;
          logger.info(`[Honeycomb] 🔍 ${bookmark.url} blocks iframes (X-Frame-Options: ${xfo})`);
        } else if (csp.includes('frame-ancestors') && !csp.includes('frame-ancestors *') && !csp.includes('frame-ancestors *;')) {
          iframeBlocked = true;
          logger.info(`[Honeycomb] 🔍 ${bookmark.url} blocks iframes (CSP frame-ancestors)`);
        }
        if (mainResp.ok) {
          siteHtml = await mainResp.text();
          logger.info(`[Honeycomb] 📥 ${bookmark.url} HTML size: ${siteHtml.length} bytes`);
          // Anti-bot detection: if a major site (large domain) returns tiny HTML,
          // it's rate-limiting us → it will also block iframes
          if (siteHtml.length < MIN_HTML_SIZE_FOR_SCRAPING) {
            antiBotDetected = true;
            logger.info(`[Honeycomb] 🤖 ${bookmark.url} anti-bot detected (${siteHtml.length} bytes) → will open externally`);
          }
        }
      }
    } catch (e) { logger.info(`[Honeycomb] ⚠️ Fetch error for ${bookmark.url}:`, e); }

    // Discover feed URL dynamically (reuse the HTML we already fetched)
    const discovered = await discoverFeedUrl(bookmark.url, siteHtml || undefined);
    let hasRealFeed = false;
    
    if (discovered) {
      result.feedUrl = discovered.url;
      hasRealFeed = true;

      if (discovered.type === 'json') {
        // ── JSON Feed / JSON API — parse natively ──
        const resp = await safeFetch(discovered.url);
        if (resp && resp.ok) {
          const body = await resp.text();
          const jsonResult = parseJsonFeed(body, bookmark.url);
          result.items = jsonResult.items;
          if (jsonResult.title) result.title = jsonResult.title;
        }
      } else {
        // ── RSS/Atom feed — use rss-parser ──
        const feed = await rssParser.parseURL(discovered.url);
        result.items = (feed.items || []).slice(0, MAX_ITEMS_PER_FEED).map(item => ({
          title: item.title || '—',
          link: item.link || '',
          snippet: (item.contentSnippet?.slice(0, MAX_SNIPPET_LENGTH) || item.content?.replace(/<[^>]+>/g, '').slice(0, MAX_SNIPPET_LENGTH) || ''),
          pubDate: item.pubDate || item.isoDate || undefined,
          imageUrl: item.enclosure?.url || extractImageFromContent(item.content || item['content:encoded'] || '') || undefined,
        }));
        if (feed.title) result.title = feed.title;
      }
    } else {
      // ── No structured feed — fallback to visual HTML scraping ──
      // Reuse the HTML we already fetched — no extra request!
      logger.info(`[Honeycomb] 🔄 No feed for ${bookmark.url}, trying visual HTML scraping (HTML: ${(siteHtml || '').length} bytes)...`);
      const scrapedItems = await scrapeArticlesFromHtml(bookmark.url, siteHtml || undefined);
      logger.info(`[Honeycomb] 📊 Scraping result for ${bookmark.url}: ${scrapedItems.length} items${scrapedItems.length > 0 ? ' — ' + scrapedItems.map(i => i.title).join(', ') : ''}`);
      
      if (scrapedItems.length > 0) {
        result.items = scrapedItems;
        result.feedUrl = 'scraped';
      } else {
        // Use the HTML we already have for OG meta
        if (siteHtml) {
          const og = extractOgMeta(siteHtml);
          if (og.ogImage && !result.imageUrl) {
            result.imageUrl = og.ogImage;
          }
        }
        result.error = 'no_feed';
      }
    }

    // ── SMART openExternal decision ──
    // A site opens externally if:
    // 1. It blocks iframes (X-Frame-Options/CSP) AND has no real feed, OR
    // 2. It triggered anti-bot protection (tiny HTML) — if it blocks our server,
    //    it will certainly block our iframe too.
    // Sites with feeds (RSS/JSON) stay in Hive because individual article pages
    // typically don't block iframes (e.g., Standard blocks homepage but not articles).
    const shouldOpenExternal = (!hasRealFeed && (iframeBlocked || antiBotDetected));
    if (shouldOpenExternal) {
      result.openExternal = true;
      const reason = iframeBlocked ? 'iframe blocked' : 'anti-bot';
      logger.info(`[Honeycomb] 🚫 ${bookmark.url} → openExternal (${reason} + no feed)`);
    } else if (iframeBlocked && hasRealFeed) {
      logger.info(`[Honeycomb] ✅ ${bookmark.url} → stays in Hive (has feed, article pages likely OK)`);
    }

    // ── Anti-bot: preserve cached good data instead of overwriting with empty ──
    if (antiBotDetected && result.items.length === 0 && cached?.data?.items && cached.data.items.length > 0) {
      logger.info(`[Honeycomb] 🛡️ ${bookmark.url} anti-bot returned empty — keeping cached data (${cached.data.items.length} items)`);
      // Extend the existing good cache, but update openExternal flag
      cached.data.openExternal = true;
      cached.expiry = Date.now() + CACHE_SUCCESS_LONG_TTL_MS;
      return cached.data;
    }

    // ── Fallback: generate a visual item for anti-bot sites with zero content ──
    if (antiBotDetected && result.items.length === 0) {
      const domain = bookmark.domain || new URL(bookmark.url).hostname;
      const largeFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=${FAVICON_FALLBACK_SIZE}`;
      result.items = [{
        title: bookmark.title || domain,
        link: bookmark.url,
        imageUrl: largeFavicon,
      }];
      result.feedUrl = 'anti-bot-fallback';
      // Don't set error — we have an item to display
      delete result.error;
      logger.info(`[Honeycomb] 🎨 ${bookmark.url} anti-bot fallback: generated visual item with favicon`);
    }

    // Cache result — use longer TTL for scraped sites (harder to get, rate-limited)
    const ttl = hasRealFeed ? CACHE_SUCCESS_TTL_MS : CACHE_SUCCESS_LONG_TTL_MS;
    feedCache.set(bookmark.url, { data: result, expiry: Date.now() + ttl });
  } catch {
    result.error = 'fetch_failed';
    feedCache.set(bookmark.url, { data: result, expiry: Date.now() + CACHE_ERROR_TTL_MS });
  }

  return result;
}

/**
 * Extract first image URL from HTML content
 */
function extractImageFromContent(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || null;
}

/**
 * GET /api/user/bookmarks/feeds
 * Fetch RSS feeds for all user bookmarks (with caching)
 */
router.get('/feeds', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    // ?refresh=true → purge all cached feeds for this user
    const forceRefresh = req.query.refresh === 'true';

    const bookmarks = await db.userBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (bookmarks.length === 0) {
      return res.json({ feeds: [] });
    }

    // Expire cache (don't delete — keep as fallback for anti-bot protection)
    if (forceRefresh) {
      for (const bm of bookmarks) {
        const entry = feedCache.get(bm.url);
        if (entry) entry.expiry = 0; // Mark stale but keep data as fallback
      }
    }

    // Fetch ALL feeds concurrently with a global timeout
    const allPromises = bookmarks.map(bm => fetchFeedForBookmark(bm));

    // Race: either all feeds resolve or we hit the timeout
    const timeoutPromise = new Promise<'TIMEOUT'>(resolve =>
      setTimeout(() => resolve('TIMEOUT'), FEEDS_ENDPOINT_TIMEOUT_MS)
    );

    // Track settled results individually
    const settled = await Promise.race([
      Promise.allSettled(allPromises).then(s => s),
      timeoutPromise.then(() => 'TIMEOUT' as const),
    ]);

    let results: FeedResult[];
    if (settled === 'TIMEOUT') {
      // Timeout — collect whatever resolved so far + cached fallbacks
      results = bookmarks.map((bm, i) => {
        // Check if this specific promise has resolved (snapshot)
        const cached = feedCache.get(bm.url);
        if (cached?.data) return cached.data;
        // Return a minimal placeholder for bookmarks that haven't loaded yet
        return {
          bookmarkId: bm.id,
          url: bm.url,
          title: bm.title,
          domain: bm.domain,
          favicon: bm.favicon,
          imageUrl: bm.imageUrl,
          feedUrl: null,
          items: [],
        } as FeedResult;
      });
      logger.info(`[Honeycomb] ⏱️ /feeds timeout (${FEEDS_ENDPOINT_TIMEOUT_MS}ms), returning ${results.filter(r => r.items.length > 0).length}/${bookmarks.length} cached`);
    } else {
      // All resolved within timeout
      results = (settled as PromiseSettledResult<FeedResult>[]).map((s, i) =>
        s.status === 'fulfilled' ? s.value : {
          bookmarkId: bookmarks[i].id,
          url: bookmarks[i].url,
          title: bookmarks[i].title,
          domain: bookmarks[i].domain,
          favicon: bookmarks[i].favicon,
          imageUrl: bookmarks[i].imageUrl,
          feedUrl: null,
          items: [],
        } as FeedResult
      );
    }

    res.json({ feeds: results });
  } catch (error) {
    logger.error('[Honeycomb] ❌ Error fetching feeds:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des flux' });
  }
});

/**
 * GET /api/user/bookmarks/feeds/:bookmarkId
 * Fetch a single bookmark's feed (force refresh)
 */
router.get('/feeds/:bookmarkId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const bookmark = await db.userBookmark.findFirst({
      where: { id: req.params.bookmarkId, userId },
    });

    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark non trouvé' });
    }

    // Expire cache (don't delete — keep as fallback for anti-bot protection)
    const entry = feedCache.get(bookmark.url);
    if (entry) entry.expiry = 0;

    const feed = await fetchFeedForBookmark(bookmark);
    res.json({ feed });
  } catch (error) {
    logger.error('[Honeycomb] ❌ Error fetching single feed:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du flux' });
  }
});

export default router;
