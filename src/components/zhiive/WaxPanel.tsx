/**
 * 🕯️ WaxPanel — Carte interactive MapLibre
 * Affiche les Colonies (hexagones), Bees (avatars), Combs (chantiers),
 * et les WaxPins éphémères (glow orange, TTL 24h).
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, message, Badge, Tooltip } from 'antd';
import {
  AimOutlined, TeamOutlined,
  EyeOutlined, EyeInvisibleOutlined,
  EnvironmentOutlined, CloseOutlined,
  UserOutlined, QuestionCircleOutlined,
  SwapOutlined, SearchOutlined, SoundOutlined, AudioMutedOutlined,
  CarOutlined,
} from '@ant-design/icons';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SF } from './ZhiiveTheme';
import { useAuth } from '../../auth/useAuth';
import { useActiveIdentity } from '../../contexts/ActiveIdentityContext';

// ── Types ──
interface BeeMarker {
  type: 'bee'; id: string; name: string; avatarUrl?: string | null;
  organizationId?: string | null; latitude: number; longitude: number;
  approximate: boolean; online: boolean;
}
interface ColonyMarker {
  type: 'colony'; id: string; name: string; logoUrl?: string | null;
  description?: string | null; latitude: number; longitude: number; memberCount: number;
}
interface CombMarker {
  type: 'comb'; id: string; name: string; address?: string | null;
  latitude: number; longitude: number; status: string; organizationId?: string;
}
interface WaxPinMarker {
  id: string; type: 'wax-pin'; pinType: string; title?: string | null;
  previewUrl?: string | null; latitude: number; longitude: number;
  createdAt: string; expiresAt: string; viewCount: number; messageId?: string | null;
  user: { id: string; name: string; avatarUrl?: string | null };
  organization?: { id: string; name: string; logoUrl?: string | null } | null;
}

type GhostMode = 'visible' | 'approximate' | 'ghost';

// ── Routing types ──
interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: { type: string; modifier?: string; location: [number, number] };
  location: [number, number];
}
interface RouteData {
  geometry: GeoJSON.LineString;
  distance: number;   // meters
  duration: number;    // seconds
  steps: RouteStep[];
}
interface GeocodeSuggestion {
  displayName: string;
  lat: number;
  lng: number;
  type: string;
}

interface WaxPanelProps { api: any; currentUser?: any; }

const WaxPanel: React.FC<WaxPanelProps> = ({ api }) => {
  const { t } = useTranslation();
  const { currentOrganization: _currentOrganization } = useAuth();
  const _identity = useActiveIdentity();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [bees, setBees] = useState<BeeMarker[]>([]);
  const [colonies, setColonies] = useState<ColonyMarker[]>([]);
  const [combs, setCombs] = useState<CombMarker[]>([]);
  const [waxPins, setWaxPins] = useState<WaxPinMarker[]>([]);
  const [ghostMode, setGhostMode] = useState<GhostMode>('visible');
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [showLayer, setShowLayer] = useState({ bees: true, colonies: true, combs: true, pins: true });
  const [mapReady, setMapReady] = useState(false);
  const [sharing, setSharing] = useState(false);

  // ── Routing state ──
  const [routingOpen, setRoutingOpen] = useState(false);
  const [destQuery, setDestQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const navWatchRef = useRef<number | null>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeSourceAdded = useRef(false);

  // Default: Belgium center
  const defaultCenter: [number, number] = [4.35, 50.85];
  const defaultZoom = 8;

  // ── Initialize MapLibre (3D terrain + vector tiles) ──
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      // OpenFreeMap: free vector tiles, no API key, OpenMapTiles schema
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: defaultCenter,
      zoom: defaultZoom,
      pitch: 50,          // 3D perspective tilt
      bearing: -12,       // Slight rotation for depth
      maxPitch: 72,
      maxZoom: 18,
      minZoom: 3,
    });

    map.addControl(new maplibregl.NavigationControl({
      visualizePitch: true,   // Show pitch control
    }), 'bottom-right');
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }), 'bottom-right');

    map.on('load', () => {
      // ── 3D Terrain (free DEM tiles from AWS/Mapzen Terrarium) ──
      try {
        map.addSource('terrain-dem', {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          tileSize: 256,
          encoding: 'terrarium',
          maxzoom: 15,
        });
        map.setTerrain({ source: 'terrain-dem', exaggeration: 1.8 });
      } catch (e) {
        console.warn('[Wax] Terrain DEM failed:', e);
      }

      // Ensure pitch is applied after style load
      map.setPitch(50);
      map.setBearing(-12);

      // ── Sky atmosphere (MapLibre v5 uses setSky(), NOT addLayer type:'sky') ──
      try {
        map.setSky({
          'sky-color': '#88c6fc',
          'sky-horizon-blend': 0.5,
          'horizon-color': '#f0e8d8',
          'horizon-fog-blend': 0.5,
          'fog-color': '#c8d6e5',
          'fog-ground-blend': 0.5,
          'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 12, 0],
        } as any);
      } catch { /* sky not supported — harmless */ }

      // ── 3D Buildings extrusion ──
      try {
        const layers = map.getStyle().layers || [];
        const buildingLayer = layers.find((l: any) =>
          l.id.includes('building') && (l.type === 'fill' || l['source-layer']?.includes('building'))
        );
        if (buildingLayer) {
          map.addLayer({
            id: 'buildings-3d',
            source: (buildingLayer as any).source,
            'source-layer': (buildingLayer as any)['source-layer'] || 'building',
            type: 'fill-extrusion',
            minzoom: 14,
            paint: {
              'fill-extrusion-color': [
                'interpolate', ['linear'], ['get', 'render_height'],
                0, '#e0d6f0',
                20, '#c4b5e0',
                40, '#a594cc',
              ],
              'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
              'fill-extrusion-opacity': 0.7,
            },
          });
        }
      } catch { /* buildings extrusion failed — harmless */ }

      setMapReady(true);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch locations from API ──
  const fetchLocations = useCallback(async () => {
    try {
      const map = mapRef.current;
      if (!map) return;
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const q = `sw_lat=${sw.lat}&sw_lng=${sw.lng}&ne_lat=${ne.lat}&ne_lng=${ne.lng}`;

      const [locsRes, pinsRes] = await Promise.all([
        api.get(`/api/wax/locations?${q}`).catch(() => null),
        api.get(`/api/wax/pins?${q}`).catch(() => null),
      ]);

      if (locsRes?.success && locsRes.data) {
        setBees(locsRes.data.bees || []);
        setColonies(locsRes.data.colonies || []);
        setCombs(locsRes.data.combs || []);
      }
      if (pinsRes?.success) {
        setWaxPins(pinsRes.data || []);
      }
    } catch { /* non-blocking */ }
  }, [api]);

  // Fetch on map ready + on move
  useEffect(() => {
    if (!mapReady) return;
    fetchLocations();
    const map = mapRef.current;
    if (!map) return;
    const onMoveEnd = () => fetchLocations();
    map.on('moveend', onMoveEnd);
    // Refresh every 30s
    const interval = setInterval(fetchLocations, 30000);
    return () => { map.off('moveend', onMoveEnd); clearInterval(interval); };
  }, [mapReady, fetchLocations]);

  // Auto-start location sharing on mount (if not ghost)
  useEffect(() => {
    if (mapReady && ghostMode !== 'ghost' && !sharing) {
      shareLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  // ── Share own location ──
  const shareLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setSharing(true);
    navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await api.post('/api/wax/location', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
          });
        } catch { /* ignore */ }
      },
      () => { setSharing(false); },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
  }, [api]);

  // ── Toggle ghost mode ──
  const toggleGhostMode = useCallback(async (mode: GhostMode) => {
    try {
      await api.put('/api/wax/ghost-mode', { mode });
      setGhostMode(mode);
      if (mode === 'ghost') setSharing(false);
      message.success(mode === 'ghost' ? t('wax.ghostEnabled') : t('wax.locationVisible'));
    } catch { message.error(t('wax.ghostError')); }
  }, [api, t]);

  // ── Render markers on map ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Helper: create DOM marker element
    const createEl = (html: string, className: string) => {
      const el = document.createElement('div');
      el.className = className;
      el.innerHTML = html;
      return el;
    };

    // ── Collision offset: pixel-based (markers stay at correct address) ──
    // Group markers at ~same coords, then apply pixel offset so they sit side-by-side
    const allItems: { lat: number; lng: number; key: string }[] = [];
    if (showLayer.colonies) colonies.forEach(c => { if (c.latitude != null && c.longitude != null) allItems.push({ lat: c.latitude, lng: c.longitude, key: `colony-${c.id}` }); });
    if (showLayer.bees) bees.forEach(b => allItems.push({ lat: b.latitude, lng: b.longitude, key: `bee-${b.id}` }));
    if (showLayer.combs) combs.forEach(c => { if (c.latitude != null && c.longitude != null) allItems.push({ lat: c.latitude, lng: c.longitude, key: `comb-${c.id}` }); });
    if (showLayer.pins) waxPins.forEach(p => allItems.push({ lat: p.latitude, lng: p.longitude, key: `pin-${p.id}` }));

    // Group items that are very close (within ~0.00015° ≈ 15m)
    const PROXIMITY = 0.00015;
    const pixelOffsets = new Map<string, [number, number]>();
    const processed = new Set<number>();
    for (let i = 0; i < allItems.length; i++) {
      if (processed.has(i)) continue;
      const group = [i];
      for (let j = i + 1; j < allItems.length; j++) {
        if (processed.has(j)) continue;
        if (Math.abs(allItems[i].lat - allItems[j].lat) < PROXIMITY &&
            Math.abs(allItems[i].lng - allItems[j].lng) < PROXIMITY) {
          group.push(j);
        }
      }
      if (group.length > 1) {
        // Pixel offset: spread markers 22px apart horizontally
        const PX_SPREAD = 22;
        const totalWidth = (group.length - 1) * PX_SPREAD;
        group.forEach((idx, gi) => {
          processed.add(idx);
          pixelOffsets.set(allItems[idx].key, [
            -totalWidth / 2 + gi * PX_SPREAD,
            0,
          ]);
        });
      }
    }

    // Helper: get pixel offset for a marker key
    const getPixelOffset = (key: string): [number, number] => {
      return pixelOffsets.get(key) || [0, 0];
    };

    // ── Colony markers (hexagon) ──
    if (showLayer.colonies) {
      colonies.forEach(c => {
        if (c.latitude == null || c.longitude == null) return;
        const el = createEl(
          `<div style="width:44px;height:44px;background:${SF.primary};clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 12px ${SF.primary}60;">
            ${c.logoUrl
              ? `<img src="${c.logoUrl}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" />`
              : `<span style="color:white;font-weight:800;font-size:14px;">${(c.name || '?')[0]}</span>`
            }
          </div>`,
          'wax-colony-marker',
        );
        el.onclick = () => setSelectedEntity({ ...c, type: 'colony' });
        const marker = new maplibregl.Marker({ element: el, offset: getPixelOffset(`colony-${c.id}`) })
          .setLngLat([c.longitude!, c.latitude!])
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    // ── Bee markers (avatar circle) ──
    if (showLayer.bees) {
      bees.forEach(b => {
        const borderColor = b.online ? SF.success : SF.textMuted;
        const el = createEl(
          `<div style="width:32px;height:32px;border-radius:50%;border:2.5px solid ${borderColor};overflow:hidden;cursor:pointer;background:${SF.primary};display:flex;align-items:center;justify-content:center;box-shadow:0 1px 6px rgba(0,0,0,0.3);">
            ${b.avatarUrl
              ? `<img src="${b.avatarUrl}" style="width:100%;height:100%;object-fit:cover;" />`
              : `<span style="color:white;font-size:12px;font-weight:700;">${(b.name || '?')[0]}</span>`
            }
          </div>`,
          'wax-bee-marker',
        );
        el.onclick = () => setSelectedEntity({ ...b, type: 'bee' });
        const marker = new maplibregl.Marker({ element: el, offset: getPixelOffset(`bee-${b.id}`) })
          .setLngLat([b.longitude, b.latitude])
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    // ── Comb markers (tool icon) ──
    if (showLayer.combs) {
      combs.forEach(c => {
        if (c.latitude == null || c.longitude == null) return;
        const el = createEl(
          `<div style="width:28px;height:28px;border-radius:6px;background:${SF.gold};display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 6px ${SF.gold}50;">
            <span style="font-size:14px;">🔨</span>
          </div>`,
          'wax-comb-marker',
        );
        el.onclick = () => setSelectedEntity({ ...c, type: 'comb' });
        const marker = new maplibregl.Marker({ element: el, offset: getPixelOffset(`comb-${c.id}`) })
          .setLngLat([c.longitude!, c.latitude!])
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    // ── Wax Pin markers (glow orange) ──
    if (showLayer.pins) {
      waxPins.forEach(p => {
        const remaining = Math.max(0, Math.ceil((new Date(p.expiresAt).getTime() - Date.now()) / 3600000));
        const el = createEl(
          `<div style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle,#FDCB6E,#e17055);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 0 16px 4px #FDCB6E80;animation:waxGlow 2s ease-in-out infinite alternate;">
            <span style="font-size:16px;">${p.pinType === 'event' ? '📅' : p.pinType === 'comb' ? '🔨' : '🕯️'}</span>
          </div>
          <div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#FDCB6E;font-size:9px;padding:1px 5px;border-radius:8px;white-space:nowrap;font-weight:600;">${remaining}h</div>`,
          'wax-pin-marker',
        );
        el.style.position = 'relative';
        el.onclick = () => setSelectedEntity({ ...p, type: 'wax-pin' });
        const marker = new maplibregl.Marker({ element: el, offset: getPixelOffset(`pin-${p.id}`) })
          .setLngLat([p.longitude, p.latitude])
          .addTo(map);
        markersRef.current.push(marker);
      });
    }
  }, [bees, colonies, combs, waxPins, showLayer, mapReady]);

  // Stats
  const stats = useMemo(() => ({
    bees: bees.length,
    colonies: colonies.length,
    combs: combs.length,
    pins: waxPins.length,
  }), [bees, colonies, combs, waxPins]);

  // ── Geocode search (debounced) ──
  const searchDestination = useCallback((query: string) => {
    setDestQuery(query);
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    if (query.trim().length < 3) { setSuggestions([]); return; }
    geocodeTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/api/wax/geocode?q=${encodeURIComponent(query)}`);
        if (res?.success) setSuggestions(res.data || []);
      } catch { /* ignore */ }
    }, 400);
  }, [api]);

  // ── Draw route line on map ──
  const drawRouteOnMap = useCallback((geometry: GeoJSON.LineString) => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing route
    if (routeSourceAdded.current) {
      try { map.removeLayer('wax-route-line'); } catch { /* */ }
      try { map.removeLayer('wax-route-outline'); } catch { /* */ }
      try { map.removeSource('wax-route'); } catch { /* */ }
    }

    map.addSource('wax-route', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry },
    });

    // Outline (shadow/border)
    map.addLayer({
      id: 'wax-route-outline',
      type: 'line',
      source: 'wax-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#3d2d7c',
        'line-width': 10,
        'line-opacity': 0.4,
      },
    });

    // Main route line
    map.addLayer({
      id: 'wax-route-line',
      type: 'line',
      source: 'wax-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': SF.primary,
        'line-width': 5,
        'line-opacity': 0.9,
      },
    });

    routeSourceAdded.current = true;
  }, []);

  // ── Compute route ──
  const computeRoute = useCallback(async (dest: { lat: number; lng: number }) => {
    // Get current position as origin
    const pos = userPosition || (mapRef.current ? { lat: mapRef.current.getCenter().lat, lng: mapRef.current.getCenter().lng } : null);
    if (!pos) { message.warning(t('wax.nav.noPosition')); return; }

    try {
      message.loading({ content: t('wax.nav.computing'), key: 'route', duration: 10 });
      const res = await api.get(
        `/api/wax/route?from_lng=${pos.lng}&from_lat=${pos.lat}&to_lng=${dest.lng}&to_lat=${dest.lat}`
      );
      if (!res?.success) { message.error({ content: t('wax.nav.noRoute'), key: 'route' }); return; }

      setRouteData(res.data);
      setCurrentStepIndex(0);
      setSuggestions([]);
      setRoutingOpen(false);
      message.destroy('route');

      // Draw route on map
      drawRouteOnMap(res.data.geometry);

      // Fit map to route
      const coords = res.data.geometry.coordinates as [number, number][];
      const bounds = coords.reduce(
        (b, c) => b.extend(c as [number, number]),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      mapRef.current?.fitBounds(bounds, { padding: 80, pitch: 50, bearing: -12, duration: 1500 });
    } catch {
      message.error({ content: t('wax.nav.error'), key: 'route' });
    }
  }, [api, t, userPosition, drawRouteOnMap]);

  // ── Voice announce ──
  const speakInstruction = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-BE';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    // Prefer a French voice
    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find(v => v.lang.startsWith('fr'));
    if (frVoice) utterance.voice = frVoice;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  // ── Start live navigation ──
  const startNavigation = useCallback(() => {
    if (!routeData) return;
    setNavigating(true);
    setCurrentStepIndex(0);

    // Announce first step
    if (routeData.steps.length > 0) {
      speakInstruction(routeData.steps[0].instruction);
    }

    // Watch position to advance steps
    if (navigator.geolocation) {
      navWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const userLng = pos.coords.longitude;
          const userLat = pos.coords.latitude;
          setUserPosition({ lat: userLat, lng: userLng });

          // Check if we're close to the next step's maneuver point
          setCurrentStepIndex(prev => {
            if (!routeData) return prev;
            for (let i = prev; i < routeData.steps.length; i++) {
              const [sLng, sLat] = routeData.steps[i].location;
              const dist = Math.sqrt(
                Math.pow((userLat - sLat) * 111320, 2) +
                Math.pow((userLng - sLng) * 111320 * Math.cos(userLat * Math.PI / 180), 2)
              );
              // Within 50m of step → advance
              if (dist < 50 && i > prev) {
                speakInstruction(routeData.steps[i].instruction);
                return i;
              }
              // Within 150m of NEXT step → pre-announce
              if (i === prev + 1 && dist < 150 && dist > 50) {
                const distRound = Math.round(dist / 10) * 10;
                speakInstruction(`Dans ${distRound} mètres, ${routeData.steps[i].instruction.toLowerCase()}`);
              }
            }
            return prev;
          });

          // Center map on user
          mapRef.current?.easeTo({ center: [userLng, userLat], duration: 500 });
        },
        () => { /* GPS error, keep navigating */ },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
      );
    }
  }, [routeData, speakInstruction]);

  // ── Stop navigation ──
  const stopNavigation = useCallback(() => {
    setNavigating(false);
    if (navWatchRef.current !== null) {
      navigator.geolocation.clearWatch(navWatchRef.current);
      navWatchRef.current = null;
    }
    window.speechSynthesis?.cancel();

    // Remove route from map
    const map = mapRef.current;
    if (map && routeSourceAdded.current) {
      try { map.removeLayer('wax-route-line'); } catch { /* */ }
      try { map.removeLayer('wax-route-outline'); } catch { /* */ }
      try { map.removeSource('wax-route'); } catch { /* */ }
      routeSourceAdded.current = false;
    }
    setRouteData(null);
  }, []);

  // Cleanup nav watch on unmount
  useEffect(() => {
    return () => {
      if (navWatchRef.current !== null) navigator.geolocation.clearWatch(navWatchRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ── Format duration/distance ──
  const formatDuration = (s: number) => {
    if (s < 60) return `${Math.round(s)}s`;
    if (s < 3600) return `${Math.round(s / 60)} min`;
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return `${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}`;
  };
  const formatDistance = (m: number) => {
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(1)} km`;
  };

  return (
    <div style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden', background: SF.dark }}>
      {/* CSS for glow animation + mobile */}
      <style>{`
        @keyframes waxGlow {
          from { box-shadow: 0 0 12px 2px #FDCB6E60; }
          to { box-shadow: 0 0 24px 8px #FDCB6EAA; }
        }
        .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right { z-index: 5 !important; }
        .maplibregl-ctrl-bottom-right { bottom: 56px !important; right: 6px !important; }
        .maplibregl-ctrl-group button { width: 36px !important; height: 36px !important; }
        .maplibregl-ctrl-attrib { font-size: 9px !important; opacity: 0.5; }
        .wax-colony-marker, .wax-bee-marker, .wax-comb-marker, .wax-pin-marker {
          touch-action: none;
        }
      `}</style>

      {/* Map container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', touchAction: 'none' }} />

      {/* ── Top bar: title + ghost toggle ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 48,
        background: 'rgba(10, 10, 25, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18 }}>🕯️</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#FDCB6E' }}>{t('wax.title')}</span>
          <Tooltip title={t('wax.subtitle')} placement="bottom">
            <QuestionCircleOutlined style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }} />
          </Tooltip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Ghost mode toggle */}
          <Tooltip title={ghostMode === 'ghost' ? t('wax.ghostTooltip') : t('wax.visibleTooltip')} placement="bottom">
            <div
              onClick={() => toggleGhostMode(ghostMode === 'ghost' ? 'visible' : 'ghost')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
                borderRadius: 16, cursor: 'pointer', fontSize: 10, fontWeight: 600,
                background: ghostMode === 'ghost' ? 'rgba(255,255,255,0.15)' : 'rgba(0,184,148,0.2)',
                color: ghostMode === 'ghost' ? '#dfe6e9' : SF.success,
                border: `1px solid ${ghostMode === 'ghost' ? 'rgba(255,255,255,0.2)' : SF.success + '40'}`,
                whiteSpace: 'nowrap',
              }}
            >
              {ghostMode === 'ghost' ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              {ghostMode === 'ghost' ? t('wax.ghost') : t('wax.visible')}
            </div>
          </Tooltip>
          {/* Share location button */}
          {!sharing && ghostMode !== 'ghost' && (
            <Tooltip title={t('wax.shareLocationTooltip')} placement="bottom">
              <div onClick={shareLocation} style={{
                padding: '4px 8px', borderRadius: 16, cursor: 'pointer', fontSize: 10,
                fontWeight: 600, background: '#FDCB6E20', color: '#FDCB6E', border: '1px solid #FDCB6E40',
                whiteSpace: 'nowrap',
              }}>
                <AimOutlined /> {t('wax.shareLocation')}
              </div>
            </Tooltip>
          )}
          {sharing && (
            <Tooltip title={t('wax.sharingLiveTooltip')} placement="bottom">
              <div style={{ fontSize: 10, color: SF.success, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                <AimOutlined style={{ animation: 'waxGlow 1.5s ease-in-out infinite alternate' }} /> {t('wax.sharingLive')}
              </div>
            </Tooltip>
          )}
        </div>
      </div>

      {/* ── Layer filters (bottom-left) ── */}
      <div style={{
        position: 'absolute', bottom: 16, left: 10, display: 'flex', flexDirection: 'column',
        gap: 4, zIndex: 10, maxWidth: 'calc(50vw - 20px)',
      }}>
        {[
          { key: 'colonies', icon: '⬡', labelKey: 'wax.colonies', tooltipKey: 'wax.coloniesTooltip', count: stats.colonies, color: SF.primary },
          { key: 'bees', icon: '🐝', labelKey: 'wax.bees', tooltipKey: 'wax.beesTooltip', count: stats.bees, color: SF.success },
          { key: 'combs', icon: '🔨', labelKey: 'wax.combs', tooltipKey: 'wax.combsTooltip', count: stats.combs, color: SF.gold },
          { key: 'pins', icon: '🕯️', labelKey: 'wax.pins', tooltipKey: 'wax.pinsTooltip', count: stats.pins, color: '#FDCB6E' },
        ].map(layer => (
          <Tooltip key={layer.key} title={t(layer.tooltipKey)} placement="right" mouseEnterDelay={0.4}>
            <div
              onClick={() => setShowLayer(prev => ({ ...prev, [layer.key]: !prev[layer.key as keyof typeof prev] }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px',
                borderRadius: 12, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: showLayer[layer.key as keyof typeof showLayer]
                  ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)',
                color: showLayer[layer.key as keyof typeof showLayer]
                  ? layer.color : 'rgba(255,255,255,0.4)',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{layer.icon}</span>
              <span>{t(layer.labelKey)}</span>
              <Badge count={layer.count} style={{
                background: layer.color + '30', color: layer.color,
                fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, lineHeight: '16px',
                boxShadow: 'none',
              }} />
            </div>
          </Tooltip>
        ))}
      </div>

      {/* ── Selected entity popup ── */}
      {selectedEntity && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 24px)', maxWidth: 360, background: 'rgba(15,15,30,0.95)',
          borderRadius: 16, padding: 14, zIndex: 20, backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div onClick={() => setSelectedEntity(null)} style={{
            position: 'absolute', top: 8, right: 10, cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)', fontSize: 14,
          }}>
            <CloseOutlined />
          </div>

          {selectedEntity.type === 'colony' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
                background: SF.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selectedEntity.logoUrl
                  ? <img src={selectedEntity.logoUrl} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  : <span style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>{selectedEntity.name?.[0]}</span>}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{selectedEntity.name}</div>
                <Tooltip title={t('wax.coloniesTooltip')} placement="top">
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                    <TeamOutlined /> {selectedEntity.memberCount} {t('wax.members')}
                  </div>
                </Tooltip>
                {selectedEntity.description && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {selectedEntity.description.substring(0, 80)}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedEntity.type === 'bee' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar size={44} src={selectedEntity.avatarUrl} icon={!selectedEntity.avatarUrl ? <UserOutlined /> : undefined}
                style={{ background: !selectedEntity.avatarUrl ? SF.primary : undefined, border: `2px solid ${selectedEntity.online ? SF.success : SF.textMuted}` }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{selectedEntity.name}</div>
                <div style={{ fontSize: 11, color: selectedEntity.online ? SF.success : 'rgba(255,255,255,0.4)' }}>
                  {selectedEntity.online ? t('wax.online') : t('wax.offline')}
                  {selectedEntity.approximate && ` · ${t('wax.approximate')}`}
                </div>
              </div>
            </div>
          )}

          {selectedEntity.type === 'comb' && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>🔨 {selectedEntity.name}</div>
              {selectedEntity.address && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                  <EnvironmentOutlined /> {selectedEntity.address}
                </div>
              )}
              <div style={{ fontSize: 11, color: SF.gold, marginTop: 2 }}>{selectedEntity.status}</div>
            </div>
          )}

          {selectedEntity.type === 'wax-pin' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 24 }}>🕯️</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#FDCB6E' }}>
                    {selectedEntity.title || 'Wax Pin'}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {selectedEntity.user?.name}
                    {selectedEntity.organization ? ` · ${selectedEntity.organization.name}` : ''}
                  </div>
                </div>
              </div>
              {selectedEntity.previewUrl && (
                <img src={selectedEntity.previewUrl} alt="" style={{
                  width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 6,
                }} />
              )}
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                <EyeOutlined /> {selectedEntity.viewCount} {t('wax.pinViews')} ·
                ⏳ {t('wax.pinExpires')} {Math.max(0, Math.ceil((new Date(selectedEntity.expiresAt).getTime() - Date.now()) / 3600000))}{t('wax.hours')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Route button (bottom-right, above MapLibre controls) ── */}
      {!routeData && !routingOpen && (
        <Tooltip title={t('wax.nav.routeTooltip')} placement="left">
          <div
            onClick={() => setRoutingOpen(true)}
            style={{
              position: 'absolute', bottom: 110, right: 10, zIndex: 10,
              width: 44, height: 44, borderRadius: '50%',
              background: SF.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: `0 4px 16px ${SF.primary}60`,
            }}
          >
            <SwapOutlined style={{ color: 'white', fontSize: 18, transform: 'rotate(90deg)' }} />
          </div>
        </Tooltip>
      )}

      {/* ── Routing search panel (slide up) ── */}
      {routingOpen && !routeData && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
          background: 'rgba(15, 15, 30, 0.97)', borderRadius: '20px 20px 0 0',
          padding: '16px 14px', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: '60vh', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CarOutlined style={{ color: SF.primary, fontSize: 16 }} />
              <span style={{ color: 'white', fontSize: 15, fontWeight: 700 }}>{t('wax.nav.title')}</span>
            </div>
            <CloseOutlined onClick={() => setRoutingOpen(false)} style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14 }} />
          </div>

          {/* Origin: current position */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 8,
            borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: SF.success, flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{t('wax.nav.myPosition')}</span>
          </div>

          {/* Destination search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: SF.primary, flexShrink: 0 }} />
            <input
              type="text"
              value={destQuery}
              onChange={(e) => searchDestination(e.target.value)}
              placeholder={t('wax.nav.searchPlaceholder')}
              autoFocus
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'white', fontSize: 13, fontFamily: 'inherit',
              }}
            />
            <SearchOutlined style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }} />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setDestQuery(s.displayName.split(',')[0]);
                    setSuggestions([]);
                    computeRoute({ lat: s.lat, lng: s.lng });
                  }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px',
                    cursor: 'pointer', borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                >
                  <EnvironmentOutlined style={{ color: SF.primary, fontSize: 14, marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>
                      {s.displayName.split(',')[0]}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 1 }}>
                      {s.displayName.split(',').slice(1, 3).join(',')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tap on map hint */}
          <div style={{ textAlign: 'center', marginTop: 12, color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
            {t('wax.nav.tapHint')}
          </div>
        </div>
      )}

      {/* ── Active route bar ── */}
      {routeData && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
          background: 'rgba(15, 15, 30, 0.97)', borderRadius: '20px 20px 0 0',
          padding: '12px 14px', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: '45vh', overflowY: 'auto',
        }}>
          {/* Header: distance + duration + controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CarOutlined style={{ color: SF.primary, fontSize: 18 }} />
              <div>
                <div style={{ color: 'white', fontSize: 16, fontWeight: 800 }}>
                  {formatDuration(routeData.duration)}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                  {formatDistance(routeData.distance)} · {routeData.steps.length} {t('wax.nav.steps')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Voice toggle */}
              <Tooltip title={voiceEnabled ? t('wax.nav.voiceOn') : t('wax.nav.voiceOff')} placement="top">
                <div
                  onClick={() => { setVoiceEnabled(v => !v); if (voiceEnabled) window.speechSynthesis?.cancel(); }}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: voiceEnabled ? `${SF.primary}30` : 'rgba(255,255,255,0.1)',
                    color: voiceEnabled ? SF.primary : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {voiceEnabled ? <SoundOutlined /> : <AudioMutedOutlined />}
                </div>
              </Tooltip>
              {/* Start/Stop nav */}
              {!navigating ? (
                <div
                  onClick={startNavigation}
                  style={{
                    padding: '8px 16px', borderRadius: 20, cursor: 'pointer',
                    background: SF.success, color: 'white', fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <AimOutlined /> {t('wax.nav.go')}
                </div>
              ) : (
                <div
                  onClick={stopNavigation}
                  style={{
                    padding: '8px 16px', borderRadius: 20, cursor: 'pointer',
                    background: '#e17055', color: 'white', fontSize: 12, fontWeight: 700,
                  }}
                >
                  {t('wax.nav.stop')}
                </div>
              )}
              {/* Close route */}
              <CloseOutlined
                onClick={stopNavigation}
                style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14, marginLeft: 4 }}
              />
            </div>
          </div>

          {/* Current step highlight */}
          {routeData.steps.length > 0 && (
            <div style={{
              padding: '10px 12px', borderRadius: 12, marginBottom: 8,
              background: `${SF.primary}15`, border: `1px solid ${SF.primary}30`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: SF.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 12, fontWeight: 800, flexShrink: 0,
                }}>
                  {currentStepIndex + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>
                    {routeData.steps[currentStepIndex]?.instruction}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 }}>
                    {formatDistance(routeData.steps[currentStepIndex]?.distance || 0)}
                    {' · '}
                    {formatDuration(routeData.steps[currentStepIndex]?.duration || 0)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All steps (collapsed list) */}
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {routeData.steps.map((step, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 4px',
                  opacity: i < currentStepIndex ? 0.3 : 1,
                  borderLeft: i === currentStepIndex ? `2px solid ${SF.primary}` : '2px solid transparent',
                  paddingLeft: 8,
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, width: 16, textAlign: 'right', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{step.instruction}</div>
                  <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>
                    {formatDistance(step.distance)} · {formatDuration(step.duration)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WaxPanel;
