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
  SwapOutlined as _SwapOutlined, SearchOutlined, SoundOutlined, AudioMutedOutlined,
  CarOutlined, LoadingOutlined, WarningOutlined,
  ArrowUpOutlined, ArrowLeftOutlined, ArrowRightOutlined,
} from '@ant-design/icons';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SF } from './ZhiiveTheme';
import { useAuth } from '../../auth/useAuth';

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
  distance?: number | null;
}

interface WaxPanelProps { api: unknown; currentUser?: unknown; }

const WaxPanel: React.FC<WaxPanelProps> = ({ api, currentUser }) => {
  const { t } = useTranslation();
  const { user, isSuperAdmin } = useAuth();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const liveSelfMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [bees, setBees] = useState<BeeMarker[]>([]);
  const [colonies, setColonies] = useState<ColonyMarker[]>([]);
  const [combs, setCombs] = useState<CombMarker[]>([]);
  const [waxPins, setWaxPins] = useState<WaxPinMarker[]>([]);
  const [ghostMode, setGhostMode] = useState<GhostMode>('visible');
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [showLayer, setShowLayer] = useState({ bees: true, colonies: true, combs: true, pins: true });
  const [mapReady, setMapReady] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [mapStyle, setMapStyle] = useState<'vector' | 'satellite'>('vector');

  // ── Routing state ──
  const [routingOpen, setRoutingOpen] = useState(false);
  const [destQuery, setDestQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeSearched, setGeocodeSearched] = useState(false);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const userPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const navWatchRef = useRef<number | null>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeSourceAdded = useRef(false);
  const routeDataRef = useRef<RouteData | null>(null);
  const navigatingRef = useRef(false);
  const carViewRef = useRef(false);
  const userArrowRef = useRef<maplibregl.Marker | null>(null);
  const currentBearingRef = useRef(0);
  const routeDestRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastRerouteRef = useRef(0);
  const sharingRef = useRef(false);
  const ghostModeRef = useRef<GhostMode>('visible');

  const [reportingAlert, setReportingAlert] = useState(false);
  const [carView, setCarView] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const simulationRef = useRef<{ timer: ReturnType<typeof setInterval> | null; traveled: number }>({ timer: null, traveled: 0 });
  const voiceEnabledRef = useRef(true);
  const lastPreAnnounceDistRef = useRef<Record<number, number>>({});
  const announcedAlertIdsRef = useRef<Set<string>>(new Set());
  const currentStepIdxRef = useRef(0);
  const [routeAlerts, setRouteAlerts] = useState<{ id: string; pinType: string; title?: string | null; latitude: number; longitude: number }[]>([]);
  const [simDistRemaining, setSimDistRemaining] = useState<number | null>(null);
  const [simTimeRemaining, setSimTimeRemaining] = useState<number | null>(null);
  const [liveDistToNextStep, setLiveDistToNextStep] = useState<number | null>(null);
  const [liveDistToFollowingStep, setLiveDistToFollowingStep] = useState<number | null>(null);

  const hudStepIndex = routeData ? Math.min(currentStepIndex + 1, routeData.steps.length - 1) : 0;
  const hudNextStepIndex = routeData ? Math.min(hudStepIndex + 1, routeData.steps.length - 1) : 0;

  // Keep refs in sync with state
  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);
  useEffect(() => { routeDataRef.current = routeData; }, [routeData]);
  useEffect(() => { navigatingRef.current = navigating; }, [navigating]);
  useEffect(() => { carViewRef.current = carView; }, [carView]);
  useEffect(() => { sharingRef.current = sharing; }, [sharing]);
  useEffect(() => { ghostModeRef.current = ghostMode; }, [ghostMode]);
  useEffect(() => { currentStepIdxRef.current = currentStepIndex; }, [currentStepIndex]);
  useEffect(() => { userPositionRef.current = userPosition; }, [userPosition]);

  const selfUser = currentUser || user;

  // ── Switch map style (vector <-> satellite) ──
  const switchMapStyle = useCallback((style: 'vector' | 'satellite') => {
    const map = mapRef.current;
    if (!map) return;
    setMapStyle(style);

    // Save current camera state
    const center = map.getCenter();
    const zoom = map.getZoom();
    const pitch = map.getPitch();
    const bearing = map.getBearing();

    // Remove route layer/source before style swap
    const hadRoute = routeSourceAdded.current;
    const savedRouteData = routeDataRef.current;
    routeSourceAdded.current = false;

    // Remove existing markers (will be re-created on next render)
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (liveSelfMarkerRef.current) {
      liveSelfMarkerRef.current.remove();
      liveSelfMarkerRef.current = null;
    }

    if (style === 'satellite') {
      // Satellite hybrid style: ESRI aerial imagery + OpenMapTiles labels overlay
      map.setStyle({
        version: 8,
        glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
        sources: {
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: '&copy; Esri, Maxar, Earthstar Geographics',
          },
          'openmaptiles': {
            type: 'vector',
            url: 'https://tiles.openfreemap.org/planet',
          },
        },
        layers: [
          {
            id: 'satellite-tiles',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            maxzoom: 20,
          },
          // Road labels on top of satellite
          {
            id: 'road-labels',
            type: 'symbol',
            source: 'openmaptiles',
            'source-layer': 'transportation_name',
            minzoom: 14,
            layout: {
              'text-field': '{name}',
              'text-size': 11,
              'text-font': ['Open Sans Regular'],
              'symbol-placement': 'line',
              'text-max-angle': 30,
              'text-padding': 2,
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': 'rgba(0,0,0,0.7)',
              'text-halo-width': 1.5,
            },
          },
          // Place labels (cities, towns)
          {
            id: 'place-labels',
            type: 'symbol',
            source: 'openmaptiles',
            'source-layer': 'place',
            minzoom: 6,
            layout: {
              'text-field': '{name}',
              'text-size': ['interpolate', ['linear'], ['zoom'], 6, 10, 14, 16],
              'text-font': ['Open Sans Bold'],
              'text-anchor': 'center',
              'text-padding': 4,
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': 'rgba(0,0,0,0.8)',
              'text-halo-width': 2,
            },
          },
        ],
      } as unknown);
    } else {
      map.setStyle('https://tiles.openfreemap.org/styles/liberty');
    }

    map.once('style.load', () => {
      // Restore camera
      map.jumpTo({ center, zoom, pitch, bearing });

      // Re-add terrain DEM
      try {
        map.addSource('terrain-dem', {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          tileSize: 256,
          encoding: 'terrarium',
          maxzoom: 15,
        });
        if (!carViewRef.current) {
          map.setTerrain({ source: 'terrain-dem', exaggeration: 1.8 });
        }
      } catch { /* */ }

      // Re-add sky
      try {
        map.setSky({
          'sky-color': style === 'satellite' ? SF.dark : '#88c6fc',
          'sky-horizon-blend': 0.5,
          'horizon-color': style === 'satellite' ? '#2d3436' : '#f0e8d8',
          'horizon-fog-blend': 0.5,
          'fog-color': style === 'satellite' ? '#2d3436' : '#c8d6e5',
          'fog-ground-blend': 0.5,
          'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 12, 0],
        } as unknown);
      } catch { /* */ }

      // Re-add 3D buildings on vector style
      if (style === 'vector') {
        try {
          const layers = map.getStyle().layers || [];
          const buildingLayer = layers.find((l: Record<string, unknown>) =>
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
                  0, '#e0d6f0', 20, '#c4b5e0', 40, '#a594cc',
                ],
                'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10],
                'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
                'fill-extrusion-opacity': 0.7,
              },
            });
          }
        } catch { /* */ }
      } else {
        // Satellite: add 3D building extrusions from the vector source for depth
        try {
          map.addLayer({
            id: 'buildings-3d-sat',
            source: 'openmaptiles',
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': 'rgba(200,200,220,0.3)',
              'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
              'fill-extrusion-opacity': 0.35,
            },
          });
        } catch { /* */ }
      }

      // Restore route if there was one
      if (hadRoute && savedRouteData) {
        try {
          map.addSource('route-line', {
            type: 'geojson',
            data: { type: 'Feature', geometry: savedRouteData.geometry, properties: {} },
          });
          map.addLayer({
            id: 'route-line-bg',
            type: 'line',
            source: 'route-line',
            paint: {
              'line-color': '#000000',
              'line-width': 10,
              'line-opacity': 0.3,
            },
          });
          map.addLayer({
            id: 'route-line-main',
            type: 'line',
            source: 'route-line',
            paint: {
              'line-color': SF.primary,
              'line-width': 6,
              'line-opacity': 0.9,
            },
          });
          routeSourceAdded.current = true;
        } catch { /* */ }
      }

      // Trigger marker re-render
      setMapReady(false);
      setTimeout(() => setMapReady(true), 100);
    });
  }, []);

  const updateUserPosition = useCallback((pos: { lat: number; lng: number }) => {
    userPositionRef.current = pos;
    setUserPosition(pos);
  }, []);

  // Collision offsets — shared between the markers useEffect and the liveSelf useEffect
  const collisionOffsetsRef = useRef<Map<string, [number, number]>>(new Map());

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const pos = userPositionRef.current;
    if (!pos) {
      if (liveSelfMarkerRef.current) {
        liveSelfMarkerRef.current.remove();
        liveSelfMarkerRef.current = null;
      }
      return;
    }

    const el = liveSelfMarkerRef.current?.getElement() || document.createElement('div');
    if (!liveSelfMarkerRef.current) {
      el.className = 'wax-live-self-marker';
      el.innerHTML = `
        <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.95);border:3px solid ${SF.primary};box-shadow:0 0 0 8px ${SF.primary}30,0 4px 14px rgba(0,0,0,0.25);overflow:hidden;display:flex;align-items:center;justify-content:center;">
          ${selfUser?.avatarUrl
            ? `<img src="${selfUser.avatarUrl}" style="width:100%;height:100%;object-fit:cover;" />`
            : `<span style="color:${SF.primary};font-weight:800;font-size:14px;">${(selfUser?.firstName || selfUser?.name || 'You')[0]}</span>`
          }
        </div>
      `;
      const selfOffset = collisionOffsetsRef.current.get('self') || [0, 0];
      liveSelfMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center', offset: selfOffset })
        .setLngLat([pos.lng, pos.lat])
        .addTo(map);
    } else {
      const selfOffset = collisionOffsetsRef.current.get('self') || [0, 0];
      liveSelfMarkerRef.current.setOffset(selfOffset);
      liveSelfMarkerRef.current.setLngLat([pos.lng, pos.lat]);
    }
  }, [mapReady, selfUser, userPosition, bees, colonies, combs, waxPins]);

  // Default: Belgium center
  const defaultCenter: [number, number] = [4.35, 50.85];
  const defaultZoom = 8;

  // ── Alert pin types (Waze-like) ──
  const ALERT_TYPES = [
    { type: 'radar', emoji: '📷', labelKey: 'wax.alerts.radar', color: '#e17055' },
    { type: 'police', emoji: '👮', labelKey: 'wax.alerts.police', color: '#0984e3' },
    { type: 'accident', emoji: '💥', labelKey: 'wax.alerts.accident', color: '#d63031' },
    { type: 'travaux', emoji: '🚧', labelKey: 'wax.alerts.travaux', color: '#fdcb6e' },
    { type: 'danger', emoji: '⚠️', labelKey: 'wax.alerts.danger', color: '#e17055' },
    { type: 'embouteillage', emoji: '🚗', labelKey: 'wax.alerts.traffic', color: '#636e72' },
  ] as const;

  // ── Pin type emoji mapping ──
  const getPinEmoji = (pinType: string) => {
    const map: Record<string, string> = {
      event: '📅', comb: '🔨', whisper: '🕯️', announcement: '📢',
      radar: '📷', police: '👮', accident: '💥', travaux: '🚧', danger: '⚠️', embouteillage: '🚗',
    };
    return map[pinType] || '🕯️';
  };

  // ── Turn arrow SVG helper ──
  const getManeuverIcon = (type: string, modifier?: string, size = 16) => {
    const style = { fontSize: size, color: 'white' };
    if (type === 'depart') return <AimOutlined style={{ ...style, color: SF.success }} />;
    if (type === 'arrive') return <EnvironmentOutlined style={{ ...style, color: '#e17055' }} />;
    if (type === 'roundabout' || type === 'rotary') return <span style={{ fontSize: size - 1 }}>🔄</span>;
    if (modifier?.includes('uturn')) return <span style={{ fontSize: size - 1 }}>↩️</span>;
    if (modifier?.includes('left') && modifier?.includes('sharp')) return <ArrowLeftOutlined style={{ ...style, transform: 'rotate(45deg)' }} />;
    if (modifier?.includes('left') && modifier?.includes('slight')) return <ArrowUpOutlined style={{ ...style, transform: 'rotate(-30deg)' }} />;
    if (modifier?.includes('left')) return <ArrowLeftOutlined style={style} />;
    if (modifier?.includes('right') && modifier?.includes('sharp')) return <ArrowRightOutlined style={{ ...style, transform: 'rotate(-45deg)' }} />;
    if (modifier?.includes('right') && modifier?.includes('slight')) return <ArrowUpOutlined style={{ ...style, transform: 'rotate(30deg)' }} />;
    if (modifier?.includes('right')) return <ArrowRightOutlined style={style} />;
    return <ArrowUpOutlined style={style} />; // straight / continue
  };

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
      maxPitch: 85,       // Allow steep pitch for car-view
      maxZoom: 20,
      minZoom: 3,
    });

    map.addControl(new maplibregl.NavigationControl({
      visualizePitch: true,   // Show pitch control
    }), 'bottom-right');
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }), 'bottom-right');

    // Enable 2-finger rotation (mobile) and right-click drag rotation (desktop)
    map.dragRotate.enable();
    map.touchZoomRotate.enable();
    try { (map.touchZoomRotate as unknown).enableRotation(); } catch { /* */ }
    map.touchPitch.enable();

    // When GeolocateControl gets a position, update userPosition
    // Also auto-start location sharing (triggered by user clicking GPS button = user gesture)
    map.on('geolocate' as unknown, ((e: unknown) => {
      const coords = e.coords || e;
      if (coords?.latitude == null) return;
      const userLat = coords.latitude;
      const userLng = coords.longitude;
      updateUserPosition({ lat: userLat, lng: userLng });

      // Auto-start sharing on first GPS fix (user clicked GPS = valid gesture)
      if (!sharingRef.current && ghostModeRef.current !== 'ghost') {
        shareLocation();
      }

      const rd = routeDataRef.current;
      if (!rd) return; // No active route, let GeolocateControl center on user

      // Only override GeolocateControl when actively navigating in car-view
      if (navigatingRef.current && carViewRef.current) {
        // Car-view: compute bearing toward next step
        const steps = rd.steps;
        let bearing = map.getBearing();
        if (steps.length > 0) {
          let closestIdx = 0;
          let minDist = Infinity;
          for (let i = 0; i < steps.length; i++) {
            const [sLng, sLat] = steps[i].location;
            const dist = Math.sqrt(
              Math.pow((userLat - sLat) * 111320, 2) +
              Math.pow((userLng - sLng) * 111320 * Math.cos(userLat * Math.PI / 180), 2)
            );
            if (dist < minDist) { minDist = dist; closestIdx = i; }
          }
          const nextIdx = Math.min(closestIdx + 1, steps.length - 1);
          const [nLng, nLat] = steps[nextIdx].location;
          const dLng = (nLng - userLng) * Math.PI / 180;
          const lat1R = userLat * Math.PI / 180;
          const lat2R = nLat * Math.PI / 180;
          const y = Math.sin(dLng) * Math.cos(lat2R);
          const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng);
          bearing = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
        }
        setTimeout(() => {
          const ahead = camera3DCenter(userLng, userLat, bearing, 60);
          map.easeTo({
            center: ahead,
            zoom: 18.5,
            pitch: 75,
            bearing,
            duration: 800,
          });
        }, 50);
      }
      // Otherwise: let GeolocateControl center on user normally
    }) as unknown);

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
        } as unknown);
      } catch { /* sky not supported — harmless */ }

      // ── 3D Buildings extrusion ──
      try {
        const layers = map.getStyle().layers || [];
        const buildingLayer = layers.find((l: Record<string, unknown>) =>
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
      // Force resize after load to fix WebGL canvas in sidebar/contained layouts
      setTimeout(() => { map.resize(); }, 100);
      setTimeout(() => { map.resize(); }, 500);
      setTimeout(() => { map.resize(); }, 1500);
    });

    mapRef.current = map;

    // ResizeObserver: force map resize whenever container changes size (e.g. sidebar mount)
    const container = mapContainerRef.current;
    let ro: ResizeObserver | null = null;
    if (container) {
      ro = new ResizeObserver(() => { map.resize(); });
      ro.observe(container);
    }

    return () => { ro?.disconnect(); map.remove(); mapRef.current = null; };
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

  // ── Auto-request GPS on mount: center map on user + set userPosition ──
  useEffect(() => {
    if (!mapReady || userPositionRef.current) return;
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const livePos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        updateUserPosition(livePos);
        mapRef.current?.flyTo({ center: [livePos.lng, livePos.lat], zoom: 14, duration: 1500 });
      },
      () => { /* silent fail — user can still use GPS button */ },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [mapReady, updateUserPosition]);

  // ── Share own location ──
  const shareLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setSharing(true);
    navigator.geolocation.watchPosition(
      async (pos) => {
        const livePos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        updateUserPosition(livePos);
        try {
          await api.post('/api/wax/location', {
            latitude: livePos.lat,
            longitude: livePos.lng,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
          });
        } catch { /* ignore */ }
      },
      () => { setSharing(false); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  }, [api, updateUserPosition]);

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
    // Include the live self marker in collision detection
    const allItems: { lat: number; lng: number; key: string }[] = [];
    // Filter out self from API bees — the live GPS marker (liveSelfMarkerRef) shows our real position
    const selfId = selfUser?.id;
    const otherBees = bees.filter(b => b.id !== selfId);

    // Add self position first so it participates in collision groups
    const selfPos = userPositionRef.current;
    if (selfPos) allItems.push({ lat: selfPos.lat, lng: selfPos.lng, key: 'self' });

    if (showLayer.colonies) colonies.forEach(c => { if (c.latitude != null && c.longitude != null) allItems.push({ lat: c.latitude, lng: c.longitude, key: `colony-${c.id}` }); });
    if (showLayer.bees) otherBees.forEach(b => allItems.push({ lat: b.latitude, lng: b.longitude, key: `bee-${b.id}` }));
    if (showLayer.combs) combs.forEach(c => { if (c.latitude != null && c.longitude != null) allItems.push({ lat: c.latitude, lng: c.longitude, key: `comb-${c.id}` }); });
    if (showLayer.pins) waxPins.forEach(p => allItems.push({ lat: p.latitude, lng: p.longitude, key: `pin-${p.id}` }));

    // Group items that are very close (within ~0.0005° ≈ 55m — covers same-address markers)
    const PROXIMITY = 0.0005;
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
        // Pixel offset: spread markers 30px apart horizontally so they don't overlap
        const PX_SPREAD = 30;
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

    // Store offsets in ref so the self marker effect can read them
    collisionOffsetsRef.current = pixelOffsets;

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

    // ── Bee markers (avatar circle) — self is excluded, shown via liveSelfMarkerRef ──
    if (showLayer.bees) {
      otherBees.forEach(b => {
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
            <span style="font-size:16px;">${getPinEmoji(p.pinType)}</span>
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

  }, [bees, colonies, combs, waxPins, showLayer, mapReady, selfUser]);

  // Stats
  const stats = useMemo(() => ({
    bees: bees.length,
    colonies: colonies.length,
    combs: combs.length,
    pins: waxPins.length,
  }), [bees, colonies, combs, waxPins]);

  // ── Geocode search (debounced) ──
  const doGeocode = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    setGeocodeLoading(true);
    setGeocodeSearched(true);
    try {
      // Pass user position for country bias and distance sorting
      let url = `/api/wax/geocode?q=${encodeURIComponent(q)}`;
      if (userPositionRef.current) {
        url += `&lat=${userPositionRef.current.lat}&lng=${userPositionRef.current.lng}`;
      }
      const res = await api.get(url);
      if (res?.success) setSuggestions(res.data || []);
      else setSuggestions([]);
    } catch {
      setSuggestions([]);
    } finally {
      setGeocodeLoading(false);
    }
  }, [api]);

  const searchDestination = useCallback((query: string) => {
    setDestQuery(query);
    setGeocodeSearched(false);
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    if (query.trim().length < 3) { setSuggestions([]); return; }
    geocodeTimerRef.current = setTimeout(() => { doGeocode(query); }, 400);
  }, [doGeocode]);

  const triggerSearch = useCallback(() => {
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    if (destQuery.trim().length >= 2) doGeocode(destQuery);
  }, [destQuery, doGeocode]);

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
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          6, 4,
          10, 8,
          14, 14,
          18, 20,
        ],
        'line-opacity': 0.5,
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
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          6, 3,
          10, 6,
          14, 10,
          18, 14,
        ],
        'line-opacity': 0.9,
      },
    });

    routeSourceAdded.current = true;
  }, []);

  // ── Compute route ──
  const computeRoute = useCallback(async (dest: { lat: number; lng: number }) => {
    // ALWAYS get a fresh GPS position as origin (no cache)
    let pos: { lat: number; lng: number } | null = null;
    if (navigator.geolocation) {
      try {
        const gpsPos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true, timeout: 8000, maximumAge: 0,
          })
        );
        pos = { lat: gpsPos.coords.latitude, lng: gpsPos.coords.longitude };
        updateUserPosition(pos);
      } catch { /* fallback below */ }
    }
    // Fallback: use last known userPosition, then map center
    if (!pos) pos = userPositionRef.current;
    if (!pos) {
      pos = mapRef.current ? { lat: mapRef.current.getCenter().lat, lng: mapRef.current.getCenter().lng } : null;
    }
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
      routeDestRef.current = dest;
      lastPreAnnounceDistRef.current = {};
      if (res.data.alerts) setRouteAlerts(res.data.alerts);
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
  }, [api, t, drawRouteOnMap, updateUserPosition]);

  // ── Voice announce (Chrome-resilient: periodic resume to prevent pause bug) ──
  const speakInstruction = useCallback((text: string) => {
    if (!voiceEnabledRef.current || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-BE';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find(v => v.lang.startsWith('fr'));
    if (frVoice) utterance.voice = frVoice;
    // Chrome workaround: speechSynthesis pauses internally after ~15s
    let resumeTimer: ReturnType<typeof setInterval> | null = null;
    utterance.onstart = () => {
      resumeTimer = setInterval(() => {
        if (!window.speechSynthesis.speaking) { if (resumeTimer) clearInterval(resumeTimer); return; }
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      }, 5000);
    };
    utterance.onend = () => { if (resumeTimer) clearInterval(resumeTimer); };
    utterance.onerror = () => { if (resumeTimer) clearInterval(resumeTimer); };
    window.speechSynthesis.speak(utterance);
  }, []);

  // ── Compute bearing between two points ──
  const computeBearing = useCallback((from: [number, number], to: [number, number]) => {
    const [lng1, lat1] = from;
    const [lng2, lat2] = to;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1R = lat1 * Math.PI / 180;
    const lat2R = lat2 * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2R);
    const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
  }, []);

  // ── Format duration/distance (declared early for use in announcements) ──
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

  const formatDistanceForSpeech = useCallback((m: number) => {
    const label = formatDistance(m);
    return label.endsWith(' m') ? `${label.slice(0, -2)} mètres` : `${label.replace(' km', '')} kilomètres`;
  }, []);

  // ── Preload TTS voices so they're ready for first announcement ──
  useEffect(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    const handler = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
  }, []);

  // ── Snap user position to nearest point on route polyline ──
  const snapToRoute = useCallback((userLng: number, userLat: number, routeCoords: [number, number][]): [number, number] | null => {
    if (routeCoords.length < 2) return null;
    let nearest: [number, number] | null = null;
    let minDist = Infinity;
    const cosLat = Math.cos(userLat * Math.PI / 180);
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const [x1, y1] = routeCoords[i];
      const [x2, y2] = routeCoords[i + 1];
      const dx = x2 - x1, dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((userLng - x1) * dx + (userLat - y1) * dy) / len2));
      const px = x1 + t * dx, py = y1 + t * dy;
      const dist = Math.sqrt(((userLng - px) * 111320 * cosLat) ** 2 + ((userLat - py) * 111320) ** 2);
      if (dist < minDist) { minDist = dist; nearest = [px, py]; }
    }
    return nearest && minDist < 50 ? nearest : null; // snap only if within 50m of route
  }, []);

  // ── Compute driving bearing from a projected point on the route ──
  const bearingAlongRoute = useCallback((userLng: number, userLat: number, routeCoords: [number, number][], forwardMeters: number = 20) => {
    if (routeCoords.length < 2) return 0;

    const cosLat = Math.cos(userLat * Math.PI / 180);
    let bestIdx = 0;
    let bestT = 0;
    let minDist = Infinity;

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const [x1, y1] = routeCoords[i];
      const [x2, y2] = routeCoords[i + 1];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((userLng - x1) * dx + (userLat - y1) * dy) / len2));
      const px = x1 + t * dx;
      const py = y1 + t * dy;
      const dist = Math.sqrt(((userLng - px) * 111320 * cosLat) ** 2 + ((userLat - py) * 111320) ** 2);
      if (dist < minDist) {
        minDist = dist;
        bestIdx = i;
        bestT = t;
      }
    }

    const projected = routeCoords[bestIdx];
    if (!projected) return 0;

    let remaining = forwardMeters;
    let fromLng = projected[0] + (routeCoords[bestIdx + 1][0] - projected[0]) * bestT;
    let fromLat = projected[1] + (routeCoords[bestIdx + 1][1] - projected[1]) * bestT;

    for (let i = bestIdx; i < routeCoords.length - 1; i++) {
      const [sx, sy] = i === bestIdx
        ? [fromLng, fromLat]
        : routeCoords[i];
      const [ex, ey] = routeCoords[i + 1];
      const segmentLen = Math.sqrt(((ex - sx) * 111320 * Math.cos(((sy + ey) / 2) * Math.PI / 180)) ** 2 + ((ey - sy) * 111320) ** 2);
      if (segmentLen >= remaining) {
        const ratio = segmentLen > 0 ? remaining / segmentLen : 0;
        const targetLng = sx + (ex - sx) * ratio;
        const targetLat = sy + (ey - sy) * ratio;
        return computeBearing([fromLng, fromLat], [targetLng, targetLat]);
      }
      remaining -= segmentLen;
      fromLng = ex;
      fromLat = ey;
    }

    return computeBearing([fromLng, fromLat], routeCoords[routeCoords.length - 1]);
  }, [computeBearing]);

  // ── Offset center forward along bearing for 3D first-person view ──
  const camera3DCenter = useCallback((lng: number, lat: number, bearing: number, offsetMeters: number = 60): [number, number] => {
    const bearingRad = bearing * Math.PI / 180;
    const dLat = (offsetMeters / 111320) * Math.cos(bearingRad);
    const dLng = (offsetMeters / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(bearingRad);
    return [lng + dLng, lat + dLat];
  }, []);

  // ── Project a point on the route and return its progress in meters ──
  const routeProgressAtPoint = useCallback((lng: number, lat: number, routeCoords: [number, number][]) => {
    if (routeCoords.length < 2) return 0;
    const cosLat = Math.cos(lat * Math.PI / 180);
    let bestIdx = 0;
    let bestT = 0;
    let minDist = Infinity;
    const cumDist: number[] = [0];

    for (let i = 1; i < routeCoords.length; i++) {
      const [px1, py1] = routeCoords[i - 1];
      const [px2, py2] = routeCoords[i];
      const d = Math.sqrt(
        ((py2 - py1) * 111320) ** 2 +
        ((px2 - px1) * 111320 * Math.cos(((py1 + py2) / 2) * Math.PI / 180)) ** 2
      );
      cumDist.push(cumDist[i - 1] + d);
    }

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const [x1, y1] = routeCoords[i];
      const [x2, y2] = routeCoords[i + 1];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((lng - x1) * dx + (lat - y1) * dy) / len2));
      const px = x1 + t * dx;
      const py = y1 + t * dy;
      const dist = Math.sqrt(((lng - px) * 111320 * cosLat) ** 2 + ((lat - py) * 111320) ** 2);
      if (dist < minDist) {
        minDist = dist;
        bestIdx = i;
        bestT = t;
      }
    }

    const [sx, sy] = routeCoords[bestIdx];
    const [ex, ey] = routeCoords[bestIdx + 1];
    const segmentLen = Math.sqrt(
      ((ey - sy) * 111320) ** 2 +
      ((ex - sx) * 111320 * Math.cos(((sy + ey) / 2) * Math.PI / 180)) ** 2
    );
    return cumDist[bestIdx] + segmentLen * bestT;
  }, []);

  // ── Advance step index and announce directions (works for real AND simulation) ──
  const advanceSteps = useCallback((userLat: number, userLng: number, steps: RouteStep[], currentSpeedMps: number | null = null) => {
    const routeCoords = routeDataRef.current?.geometry.coordinates as [number, number][] | undefined;
    const calcRouteDistToStep = (step: RouteStep) => {
      if (!routeCoords || routeCoords.length < 2) {
        const cosLat = Math.cos(userLat * Math.PI / 180);
        const [sLng, sLat] = step.location;
        return Math.sqrt(((userLat - sLat) * 111320) ** 2 + ((userLng - sLng) * 111320 * cosLat) ** 2);
      }
      const userProgress = routeProgressAtPoint(userLng, userLat, routeCoords);
      const [sLng, sLat] = step.location;
      const stepProgress = routeProgressAtPoint(sLng, sLat, routeCoords);
      return Math.max(0, stepProgress - userProgress);
    };

    const activeIdx = currentStepIdxRef.current;
    const nextStepIdx = Math.min(activeIdx + 1, steps.length - 1);
    if (steps[nextStepIdx]) {
      setLiveDistToNextStep(calcRouteDistToStep(steps[nextStepIdx]));
    }
    const followingStepIdx = Math.min(activeIdx + 2, steps.length - 1);
    if (steps[followingStepIdx]) {
      setLiveDistToFollowingStep(calcRouteDistToStep(steps[followingStepIdx]));
    } else {
      setLiveDistToFollowingStep(null);
    }

    setCurrentStepIndex(prev => {
      // Check from current step onwards
      for (let i = prev; i < steps.length; i++) {
        const dist = calcRouteDistToStep(steps[i]);
        // Within 30m → advance to this step
        if (dist < 30 && i > prev) {
          // Announce the step with distance to next
          const nextDist = steps[i + 1] ? formatDistance(calcRouteDistToStep(steps[i + 1])) : '';
          const announcement = nextDist && steps[i + 1]
            ? `${steps[i].instruction}. Puis dans ${nextDist}, ${steps[i + 1].instruction.toLowerCase()}`
            : steps[i].instruction;
          speakInstruction(announcement);
          lastPreAnnounceDistRef.current = {};
          currentStepIdxRef.current = i;
          return i;
        }
        // Pre-announce next step at decreasing distance thresholds
        if (i === prev + 1 && dist > 30) {
          const lastThreshold = lastPreAnnounceDistRef.current[i] ?? Infinity;
          const distLabel = formatDistanceForSpeech(dist);
          const instruction = steps[i].instruction.toLowerCase();
          const etaSeconds = currentSpeedMps && currentSpeedMps > 0 ? dist / currentSpeedMps : null;
          if (etaSeconds !== null) {
            if (etaSeconds <= 0.5 && lastThreshold > 0.5) {
              speakInstruction(`Maintenant, ${instruction}`);
              lastPreAnnounceDistRef.current[i] = 0.5;
            } else if (etaSeconds <= 2 && lastThreshold > 2) {
              speakInstruction(`Dans ${distLabel}, ${instruction}`);
              lastPreAnnounceDistRef.current[i] = 2;
            } else if (etaSeconds <= 4 && lastThreshold > 4) {
              speakInstruction(`Dans ${distLabel}, ${instruction}`);
              lastPreAnnounceDistRef.current[i] = 4;
            } else if (etaSeconds <= 8 && lastThreshold > 8) {
              speakInstruction(`Préparez-vous: ${instruction}`);
              lastPreAnnounceDistRef.current[i] = 8;
            }
          } else if (dist < 500 && lastThreshold > 500) {
            speakInstruction(`Dans ${distLabel}, ${instruction}`);
            lastPreAnnounceDistRef.current[i] = 500;
          } else if (dist < 200 && lastThreshold > 200) {
            speakInstruction(`Dans ${distLabel}, ${instruction}`);
            lastPreAnnounceDistRef.current[i] = 200;
          } else if (dist < 100 && lastThreshold > 100) {
            speakInstruction(`Dans ${distLabel}, ${instruction}`);
            lastPreAnnounceDistRef.current[i] = 100;
          } else if (dist < 50 && lastThreshold > 50) {
            speakInstruction(`Maintenant, ${instruction}`);
            lastPreAnnounceDistRef.current[i] = 50;
          }
        }
      }
      // Check arrival at last step
      if (prev >= steps.length - 1 && steps.length > 0) {
        const dist = calcRouteDistToStep(steps[steps.length - 1]);
        if (dist < 20 && (lastPreAnnounceDistRef.current[-1] ?? 1) > 0) {
          speakInstruction('Vous êtes arrivé à destination');
          lastPreAnnounceDistRef.current[-1] = 0;
          currentStepIdxRef.current = steps.length - 1;
        }
      }
      return prev;
    });

    // ── Announce nearby alerts (signalements) when within 200m ──
    const alerts = routeAlerts;
    if (alerts.length > 0) {
      const alertLabels: Record<string, string> = {
        radar: 'Attention, radar',
        police: 'Attention, contrôle de police',
        accident: 'Attention, accident signalé',
        travaux: 'Attention, travaux',
        danger: 'Attention, danger signalé',
        embouteillage: 'Attention, embouteillage signalé',
      };
      for (const alert of alerts) {
        if (announcedAlertIdsRef.current.has(alert.id)) continue;
        const d = Math.sqrt(
          ((userLat - alert.latitude) * 111320) ** 2 +
          ((userLng - alert.longitude) * 111320 * Math.cos(userLat * Math.PI / 180)) ** 2
        );
        if (d < 200) {
          announcedAlertIdsRef.current.add(alert.id);
          speakInstruction(alertLabels[alert.pinType] || `Attention, ${alert.pinType} signalé`);
        }
      }
    }
  }, [speakInstruction, routeAlerts, formatDistanceForSpeech, routeProgressAtPoint]);

  // ── Start live navigation (3D car-view) ──
  const startNavigation = useCallback(() => {
    if (!routeData) return;
    setNavigating(true);
    setCurrentStepIndex(0);
    lastPreAnnounceDistRef.current = {};
    announcedAlertIdsRef.current = new Set();

    // Announce first step
    if (routeData.steps.length > 0) {
      speakInstruction(routeData.steps[0].instruction);
    }

    // Announce alerts along route
    if (routeAlerts.length > 0) {
      const labels: Record<string, string> = { radar: 'radar', police: 'contrôle de police', accident: 'accident', travaux: 'travaux', danger: 'danger', embouteillage: 'embouteillage' };
      const unique = [...new Set(routeAlerts.map(a => labels[a.pinType] || a.pinType))];
      setTimeout(() => speakInstruction(`Attention sur votre trajet : ${unique.join(', ')}`), 3000);
    }

    // Start in current view mode
    const coords = routeData.geometry.coordinates as [number, number][];
    const initialBearing = coords.length >= 2 ? computeBearing(coords[0], coords[Math.min(5, coords.length - 1)]) : 0;
    currentBearingRef.current = initialBearing;
    if (carViewRef.current) {
      try { mapRef.current?.setTerrain(null); } catch { /* */ }
      const ahead = camera3DCenter(coords[0][0], coords[0][1], initialBearing, 60);
      mapRef.current?.easeTo({ center: ahead, zoom: 18.5, pitch: 75, bearing: initialBearing, duration: 1200 });
    } else {
      mapRef.current?.easeTo({ center: coords[0], zoom: 17, pitch: 0, bearing: initialBearing, duration: 1200 });
    }

    // Watch position to advance steps
    if (navigator.geolocation) {
      navWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const userLng = pos.coords.longitude;
          const userLat = pos.coords.latitude;
          updateUserPosition({ lat: userLat, lng: userLng });

          // ── Auto-reroute: if user is >100m from nearest route point, recalculate ──
          const routeCoords = routeData.geometry.coordinates as [number, number][];
          let minRouteDist = Infinity;
          for (let ri = 0; ri < routeCoords.length; ri += 3) {
            const [rLng, rLat] = routeCoords[ri];
            const d = Math.sqrt(
              Math.pow((userLat - rLat) * 111320, 2) +
              Math.pow((userLng - rLng) * 111320 * Math.cos(userLat * Math.PI / 180), 2)
            );
            if (d < minRouteDist) minRouteDist = d;
          }
          if (minRouteDist > 100 && routeDestRef.current && Date.now() - lastRerouteRef.current > 10000) {
            lastRerouteRef.current = Date.now();
            speakInstruction('Recalcul du trajet');
            const dest = routeDestRef.current;
            api.get(`/api/wax/route?from_lng=${userLng}&from_lat=${userLat}&to_lng=${dest.lng}&to_lat=${dest.lat}`)
              .then((res: unknown) => {
                if (res?.success && res.data) {
                  setRouteData(res.data);
                  setCurrentStepIndex(0);
                  lastPreAnnounceDistRef.current = {};
                  if (res.data.alerts) setRouteAlerts(res.data.alerts);
                  const map = mapRef.current;
                  if (map) {
                    if (routeSourceAdded.current) {
                      try { map.removeLayer('wax-route-line'); } catch { /* */ }
                      try { map.removeLayer('wax-route-outline'); } catch { /* */ }
                      try { map.removeSource('wax-route'); } catch { /* */ }
                      routeSourceAdded.current = false;
                    }
                    drawRouteOnMap(res.data.geometry);
                  }
                }
              })
              .catch(() => { /* reroute failed, will retry */ });
          }

          // Advance step announcements
          advanceSteps(userLat, userLng, routeData.steps, typeof pos.coords.speed === 'number' ? pos.coords.speed : null);

          // Compute bearing from route geometry at user's position
          const bearing = bearingAlongRoute(userLng, userLat, routeCoords, 20);
          currentBearingRef.current = bearing;

          // Snap position to route line for accurate road alignment
          const snapped = snapToRoute(userLng, userLat, routeCoords);
          const displayLng = snapped ? snapped[0] : userLng;
          const displayLat = snapped ? snapped[1] : userLat;

          // Update or create the user arrow marker
          if (!userArrowRef.current) {
            const arrowEl = document.createElement('div');
            arrowEl.className = 'wax-nav-arrow';
            arrowEl.innerHTML = `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="16" fill="${SF.primary}" stroke="white" stroke-width="3" opacity="0.9"/>
                <path d="M18 8 L24 24 L18 20 L12 24 Z" fill="white"/>
              </svg>
            </div>`;
            userArrowRef.current = new maplibregl.Marker({ element: arrowEl, rotationAlignment: 'map', pitchAlignment: 'map' })
              .setLngLat([displayLng, displayLat])
              .setRotation(bearing)
              .addTo(mapRef.current!);
          } else {
            userArrowRef.current.setLngLat([displayLng, displayLat]);
            userArrowRef.current.setRotation(bearing);
          }

          // Camera follow — use snapped position
          if (carViewRef.current) {
            const ahead = camera3DCenter(displayLng, displayLat, bearing, 60);
            mapRef.current?.easeTo({ center: ahead, bearing, pitch: 75, zoom: 18.5, duration: 800 });
          } else {
            mapRef.current?.easeTo({ center: [displayLng, displayLat], bearing, pitch: 0, zoom: 17, duration: 800 });
          }
        },
        () => { /* GPS error, keep navigating */ },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
      );
    }
  }, [routeData, routeAlerts, speakInstruction, computeBearing, advanceSteps, bearingAlongRoute, snapToRoute, api, drawRouteOnMap, updateUserPosition, camera3DCenter]);

  // ── Stop navigation ──
  const stopNavigation = useCallback(() => {
    setNavigating(false);
    setSimulating(false);
    if (navWatchRef.current !== null) {
      navigator.geolocation.clearWatch(navWatchRef.current);
      navWatchRef.current = null;
    }
    if (simulationRef.current.timer) {
      clearInterval(simulationRef.current.timer);
      simulationRef.current.timer = null;
    }
    window.speechSynthesis?.cancel();

    // Remove user arrow marker
    if (userArrowRef.current) {
      userArrowRef.current.remove();
      userArrowRef.current = null;
    }

    // Remove route from map
    const map = mapRef.current;
    if (map && routeSourceAdded.current) {
      try { map.removeLayer('wax-route-line'); } catch { /* */ }
      try { map.removeLayer('wax-route-outline'); } catch { /* */ }
      try { map.removeSource('wax-route'); } catch { /* */ }
      routeSourceAdded.current = false;
    }
    setRouteData(null);
    setRouteAlerts([]);
    setCarView(false);
    routeDestRef.current = null;
    lastPreAnnounceDistRef.current = {};
    announcedAlertIdsRef.current = new Set();
    setSimDistRemaining(null);
    setSimTimeRemaining(null);
    setLiveDistToNextStep(null);
    setLiveDistToFollowingStep(null);

    // Re-enable terrain and restore normal map view
    if (map) {
      try { map.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 }); } catch { /* */ }
      map.easeTo({ pitch: 50, bearing: -12, zoom: 12, duration: 1000 });
    }
  }, []);

  // Cleanup nav watch on unmount
  useEffect(() => {
    const simRef = simulationRef.current;
    return () => {
      if (navWatchRef.current !== null) navigator.geolocation.clearWatch(navWatchRef.current);
      if (simRef.timer) clearInterval(simRef.timer);
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ── Simulate driving along route at a given speed (km/h) ──
  const startSimulation = useCallback((speedKmh: number = 50) => {
    if (!isSuperAdmin) {
      message.error(t('wax.nav.simulationTooltip'));
      return;
    }
    const rd = routeDataRef.current;
    if (!rd || !mapRef.current) return;
    setSimulating(true);
    setNavigating(true);
    setCurrentStepIndex(0);
    lastPreAnnounceDistRef.current = {};
    announcedAlertIdsRef.current = new Set();

    const coords = rd.geometry.coordinates as [number, number][];
    if (coords.length < 2) return;

    // Cumulative distances along route (meters)
    const cumDist: number[] = [0];
    for (let i = 1; i < coords.length; i++) {
      const [lng1, lat1] = coords[i - 1];
      const [lng2, lat2] = coords[i];
      const d = Math.sqrt(
        Math.pow((lat2 - lat1) * 111320, 2) +
        Math.pow((lng2 - lng1) * 111320 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180), 2)
      );
      cumDist.push(cumDist[i - 1] + d);
    }
    const totalDist = cumDist[cumDist.length - 1];

    const speedMs = speedKmh / 3.6;
    const intervalMs = 200;
    const distPerTick = speedMs * (intervalMs / 1000);
    simulationRef.current.traveled = 0;

    // Announce alerts summary after 5s
    if (routeAlerts.length > 0) {
      const labels: Record<string, string> = { radar: 'radar', police: 'contrôle de police', accident: 'accident', travaux: 'travaux', danger: 'danger', embouteillage: 'embouteillage' };
      const unique = [...new Set(routeAlerts.map(a => labels[a.pinType] || a.pinType))];
      setTimeout(() => speakInstruction(`Attention, ${routeAlerts.length} signalement${routeAlerts.length > 1 ? 's' : ''} sur votre trajet : ${unique.join(', ')}`), 5000);
    }

    // Initial camera
    const initBearing = bearingAlongRoute(coords[0][0], coords[0][1], coords, 20);
    currentBearingRef.current = initBearing;
    if (carViewRef.current) {
      try { mapRef.current.setTerrain(null); } catch { /* */ }
      const ahead = camera3DCenter(coords[0][0], coords[0][1], initBearing, 60);
      mapRef.current.easeTo({ center: ahead, zoom: 18.5, pitch: 75, bearing: initBearing, duration: 800 });
    } else {
      mapRef.current.easeTo({ center: coords[0], zoom: 17, pitch: 0, bearing: initBearing, duration: 800 });
    }

    // Update distance/time remaining display
    setSimDistRemaining(totalDist);
    setSimTimeRemaining(rd.duration);

    // Periodic announcements: every 1km or every 2 min equivalent
    let lastKmAnnounce = 0;

    simulationRef.current.timer = setInterval(() => {
      simulationRef.current.traveled += distPerTick;
      const traveled = simulationRef.current.traveled;
      if (traveled >= totalDist) {
        speakInstruction('Vous êtes arrivé à destination.');
        setSimDistRemaining(0);
        setSimTimeRemaining(0);
        stopNavigation();
        return;
      }

      // Update distance/time remaining
      const remaining = totalDist - traveled;
      const timeRemaining = remaining / speedMs;
      setSimDistRemaining(remaining);
      setSimTimeRemaining(timeRemaining);

      // Periodic km announcement
      const kmTraveled = Math.floor(traveled / 1000);
      if (kmTraveled > lastKmAnnounce && kmTraveled > 0) {
        lastKmAnnounce = kmTraveled;
        speakInstruction(`${formatDistance(remaining)} restants`);
      }

      // Interpolate position on route
      let segIdx = 0;
      for (let i = 1; i < cumDist.length; i++) {
        if (cumDist[i] >= traveled) { segIdx = i - 1; break; }
      }
      const segStart = cumDist[segIdx];
      const segEnd = cumDist[segIdx + 1] || cumDist[segIdx];
      const t = segEnd > segStart ? (traveled - segStart) / (segEnd - segStart) : 0;
      const [lng1, lat1] = coords[segIdx];
      const [lng2, lat2] = coords[segIdx + 1] || coords[segIdx];
      const simLng = lng1 + t * (lng2 - lng1);
      const simLat = lat1 + t * (lat2 - lat1);

      const bearing = bearingAlongRoute(simLng, simLat, coords, 20);
      currentBearingRef.current = bearing;

      // Update arrow
      if (!userArrowRef.current) {
        const arrowEl = document.createElement('div');
        arrowEl.className = 'wax-nav-arrow';
        arrowEl.innerHTML = `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="16" fill="${SF.primary}" stroke="white" stroke-width="3" opacity="0.9"/>
            <path d="M18 8 L24 24 L18 20 L12 24 Z" fill="white"/>
          </svg>
        </div>`;
        userArrowRef.current = new maplibregl.Marker({ element: arrowEl, rotationAlignment: 'map', pitchAlignment: 'map' })
          .setLngLat([simLng, simLat])
          .setRotation(bearing)
          .addTo(mapRef.current!);
      } else {
        userArrowRef.current.setLngLat([simLng, simLat]);
        userArrowRef.current.setRotation(bearing);
      }

      // Advance step announcements (same as real nav — with alerts)
      const currentRd = routeDataRef.current;
      if (currentRd) advanceSteps(simLat, simLng, currentRd.steps, speedMs);

      // Camera follow — 3D: center ahead for first-person, 2D: center on arrow
      if (carViewRef.current) {
        const ahead = camera3DCenter(simLng, simLat, bearing, 60);
        mapRef.current?.easeTo({ center: ahead, bearing, pitch: 75, zoom: 18.5, duration: 180 });
      } else {
        mapRef.current?.easeTo({ center: [simLng, simLat], bearing, pitch: 0, zoom: 17, duration: 180 });
      }
    }, intervalMs);
  }, [routeAlerts, speakInstruction, bearingAlongRoute, advanceSteps, stopNavigation, camera3DCenter, isSuperAdmin, t]);

  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: SF.dark, width: '100%', maxWidth: '100%' }}>
      {/* CSS for glow animation + mobile */}
      <style>{`
        @keyframes waxGlow {
          from { box-shadow: 0 0 12px 2px #FDCB6E60; }
          to { box-shadow: 0 0 24px 8px #FDCB6EAA; }
        }
        @keyframes waxSelfPulse {
          0% { box-shadow: 0 0 0 0 ${SF.primary}60; }
          70% { box-shadow: 0 0 0 14px ${SF.primary}00; }
          100% { box-shadow: 0 0 0 0 ${SF.primary}00; }
        }
        .wax-live-self-marker > div { animation: waxSelfPulse 2s ease-out infinite; }
        .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right { z-index: 5 !important; }
        .maplibregl-ctrl-bottom-right { bottom: 56px !important; right: 6px !important; }
        .maplibregl-ctrl-group button { width: 36px !important; height: 36px !important; }
        .maplibregl-ctrl-attrib { font-size: 9px !important; opacity: 0.5; }
        .wax-nav-arrow { z-index: 10 !important; transition: transform 0.5s ease; pointer-events: none; }
        .wax-colony-marker, .wax-bee-marker, .wax-comb-marker, .wax-pin-marker {
          touch-action: none;
        }
      `}</style>

      {/* Map container — absolute positioning to guarantee dimensions regardless of parent height chain */}
      <div ref={mapContainerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, touchAction: 'none' }} />

      {/* ── Top bar: title + ghost toggle ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 48,
        background: 'rgba(10, 10, 25, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 8px', zIndex: 10, overflow: 'hidden', maxWidth: '100%', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18 }}>🕯️</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#FDCB6E' }}>{t('wax.title')}</span>
          {!routeData && (
            <Tooltip title={t('wax.subtitle')} placement="bottom">
              <QuestionCircleOutlined style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }} />
            </Tooltip>
          )}
        </div>

        {/* Route info — inline in top bar when route is active */}
        {routeData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
            {/* Tap on route info to re-fit map to route bounds */}
            <div
              onClick={() => {
                const coords = routeData.geometry.coordinates as [number, number][];
                if (coords.length >= 2) {
                  const bounds = coords.reduce(
                    (b, c) => b.extend(c as [number, number]),
                    new maplibregl.LngLatBounds(coords[0], coords[0])
                  );
                  mapRef.current?.fitBounds(bounds, { padding: 60, pitch: 50, bearing: -12, duration: 1000 });
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <CarOutlined style={{ color: simulating ? '#FDCB6E' : SF.primary, fontSize: 13 }} />
              <span style={{ color: 'white', fontSize: 13, fontWeight: 800 }}>
                {simulating && simTimeRemaining != null
                  ? formatDuration(simTimeRemaining)
                  : formatDuration(routeData.duration)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                {simulating && simDistRemaining != null
                  ? formatDistance(simDistRemaining)
                  : formatDistance(routeData.distance)}
              </span>
              {simulating && (
                <span style={{ color: '#FDCB6E', fontSize: 9, fontWeight: 700, background: '#FDCB6E15', padding: '1px 5px', borderRadius: 6 }}>
                  SIMULATION
                </span>
              )}
            </div>
            {/* Voice toggle */}
            <div
              onClick={() => { setVoiceEnabled(v => !v); if (voiceEnabled) window.speechSynthesis?.cancel(); }}
              style={{
                width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: voiceEnabled ? `${SF.primary}30` : 'rgba(255,255,255,0.1)',
                color: voiceEnabled ? SF.primary : 'rgba(255,255,255,0.4)', fontSize: 12,
              }}
            >
              {voiceEnabled ? <SoundOutlined /> : <AudioMutedOutlined />}
            </div>
            {/* Stop / Go */}
            {!navigating ? (
              <>
                <div
                  onClick={startNavigation}
                  style={{
                    padding: '3px 10px', borderRadius: 14, cursor: 'pointer',
                    background: SF.success, color: 'white', fontSize: 10, fontWeight: 700,
                  }}
                >
                  {t('wax.nav.go')}
                </div>
                {isSuperAdmin && (
                  <div
                    onClick={() => startSimulation(50)}
                    style={{
                      padding: '3px 10px', borderRadius: 14, cursor: 'pointer',
                      background: '#FDCB6E20', color: '#FDCB6E', fontSize: 10, fontWeight: 700,
                      border: '1px solid #FDCB6E40',
                    }}
                    title={t('wax.nav.simulationTooltip')}
                  >
                    {t('wax.nav.simulate')}
                  </div>
                )}
              </>
            ) : (
              <div
                onClick={stopNavigation}
                style={{
                  padding: '3px 10px', borderRadius: 14, cursor: 'pointer',
                  background: '#e17055', color: 'white', fontSize: 10, fontWeight: 700,
                }}
              >
                {simulating ? t('wax.nav.stopSimulation') : t('wax.nav.stop')}
              </div>
            )}
            {/* Close route */}
            <CloseOutlined
              onClick={stopNavigation}
              style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12 }}
            />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, overflow: 'hidden' }}>
          {/* Ghost mode toggle */}
          <Tooltip title={ghostMode === 'ghost' ? t('wax.ghostTooltip') : t('wax.visibleTooltip')} placement="bottom">
            <div
              onClick={() => toggleGhostMode(ghostMode === 'ghost' ? 'visible' : 'ghost')}
              style={{
                display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px',
                borderRadius: 14, cursor: 'pointer', fontSize: 10, fontWeight: 600,
                background: ghostMode === 'ghost' ? 'rgba(255,255,255,0.15)' : 'rgba(0,184,148,0.2)',
                color: ghostMode === 'ghost' ? '#dfe6e9' : SF.success,
                border: `1px solid ${ghostMode === 'ghost' ? 'rgba(255,255,255,0.2)' : SF.success + '40'}`,
                whiteSpace: 'nowrap',
              }}
            >
              {ghostMode === 'ghost' ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              <span className="wax-btn-label">{ghostMode === 'ghost' ? t('wax.ghost') : t('wax.visible')}</span>
            </div>
          </Tooltip>
          {/* Share location button */}
          {!sharing && ghostMode !== 'ghost' && (
            <Tooltip title={t('wax.shareLocationTooltip')} placement="bottom">
              <div onClick={shareLocation} style={{
                padding: '3px 6px', borderRadius: 14, cursor: 'pointer', fontSize: 10,
                fontWeight: 600, background: '#FDCB6E20', color: '#FDCB6E', border: '1px solid #FDCB6E40',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <AimOutlined /> <span className="wax-btn-label">{t('wax.shareLocation')}</span>
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

      {/* ── TOP NAV HUD: Waze-style turn banner (48px — same as top bar) ── */}
      {routeData && routeData.steps[currentStepIndex] && (
        <div style={{
          position: 'absolute', top: 48, left: 0, right: 0, height: 48, zIndex: 15,
          background: 'rgba(10, 10, 25, 0.92)', backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${SF.primary}30`,
          padding: '0 10px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {/* Arrow icon */}
          <div
            onClick={() => {
              // Re-center on user position along the route
              const livePos = userPositionRef.current;
              if (livePos) {
                const bearing = currentBearingRef.current;
                if (carViewRef.current) {
                  const ahead = camera3DCenter(livePos.lng, livePos.lat, bearing, 60);
                  mapRef.current?.easeTo({ center: ahead, bearing, pitch: 75, zoom: 18.5, duration: 800 });
                } else {
                  mapRef.current?.easeTo({ center: [livePos.lng, livePos.lat], bearing, pitch: 0, zoom: 17, duration: 800 });
                }
              }
            }}
            style={{
              width: 42, height: 42, borderRadius: 12, background: SF.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: `0 0 12px ${SF.primary}40`, cursor: 'pointer',
            }}>
            {getManeuverIcon(
              routeData.steps[hudStepIndex]?.maneuver?.type,
              routeData.steps[hudStepIndex]?.maneuver?.modifier,
              24,
            )}
          </div>
          {/* Distance + instruction */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ color: 'white', fontSize: 16, fontWeight: 900 }}>
                {formatDistance(liveDistToNextStep ?? routeData.steps[hudStepIndex]?.distance ?? 0)}
              </span>
              <span style={{
                color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {routeData.steps[hudStepIndex]?.instruction}
              </span>
            </div>
          </div>
          {/* Next step preview */}
          {routeData.steps[hudNextStepIndex] && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, opacity: 0.55,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {getManeuverIcon(
                  routeData.steps[hudNextStepIndex]?.maneuver?.type,
                  routeData.steps[hudNextStepIndex]?.maneuver?.modifier,
                  16,
                )}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700 }}>
                {formatDistance(liveDistToFollowingStep ?? routeData.steps[hudNextStepIndex]?.distance ?? 0)}
              </span>
            </div>
          )}
          {/* Alert report quick button — RED */}
          <div
            onClick={() => setReportingAlert(r => !r)}
            style={{
              width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: reportingAlert ? '#d6303130' : '#d6303118',
              color: reportingAlert ? '#ff4444' : '#e17055',
              border: `1.5px solid ${reportingAlert ? '#d63031' : '#e1705550'}`,
            }}
          >
            <WarningOutlined style={{ fontSize: 14 }} />
          </div>
        </div>
      )}

      {/* ── Alert type picker (below HUD — horizontal scroll) ── */}
      {reportingAlert && routeData && (
        <div style={{
          position: 'absolute', top: 48 + 48, left: 0, right: 0, height: 48, zIndex: 16,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 10px',
          overflowX: 'auto', overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          background: 'rgba(15,15,30,0.95)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {ALERT_TYPES.map(at => (
            <div
              key={at.type}
              onClick={async () => {
                const pos = userPositionRef.current || (mapRef.current ? { lat: mapRef.current.getCenter().lat, lng: mapRef.current.getCenter().lng } : null);
                if (!pos) { message.warning(t('wax.nav.noPosition')); return; }
                try {
                  await api.post('/api/wax/pins', {
                    latitude: pos.lat, longitude: pos.lng,
                    pinType: at.type, title: t(at.labelKey),
                    ttlHours: 2, publishAsOrg: false,
                  });
                  message.success(t('wax.alerts.reported'));
                  setReportingAlert(false);
                } catch {
                  message.error(t('wax.nav.error'));
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 3, padding: '5px 10px',
                borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: `${at.color}15`, border: `1px solid ${at.color}30`, color: at.color,
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 14 }}>{at.emoji}</span>
              {t(at.labelKey)}
            </div>
          ))}
        </div>
      )}

      {/* ── Layer filters (bottom-left) ── */}
      <div style={{
        position: 'absolute', bottom: 16, left: 10, display: 'flex', flexDirection: 'column',
        gap: 4, zIndex: 10, maxWidth: 'calc(50vw - 20px)',
      }}>
        {/* Route button — above filters */}
        {!routeData && !routingOpen && (
          <Tooltip title={t('wax.nav.routeTooltip')} placement="right">
            <div
              onClick={() => {
                setRoutingOpen(true);
                // Pre-fetch GPS position so route starts from real location
                if (!userPositionRef.current && navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (p) => updateUserPosition({ lat: p.coords.latitude, lng: p.coords.longitude }),
                    () => { /* will fallback to map center */ },
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
                  );
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px',
                borderRadius: 12, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: `${SF.primary}CC`, color: 'white',
                backdropFilter: 'blur(8px)', transition: 'all 0.2s', whiteSpace: 'nowrap',
                marginBottom: 2,
              }}
            >
              <CarOutlined style={{ fontSize: 13 }} />
              <span>{t('wax.nav.title')}</span>
            </div>
          </Tooltip>
        )}
        {/* 3D car-view toggle */}
        <Tooltip title={carView ? t('wax.nav.view2D') : t('wax.nav.view3D')} placement="right">
          <div
            onClick={() => {
              const next = !carView;
              setCarView(next);
              const map = mapRef.current;
              if (!map) return;
              if (next) {
                // Disable terrain in car-view to prevent visual artifacts at high pitch
                try { map.setTerrain(null); } catch { /* */ }
                const center = userPosition
                  ? camera3DCenter(userPosition.lng, userPosition.lat, currentBearingRef.current, 60)
                  : map.getCenter();
                map.easeTo({ center, pitch: 75, zoom: 18.5, bearing: currentBearingRef.current, duration: 800 });
              } else {
                // Re-enable terrain in normal view
                try { map.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 }); } catch { /* */ }
                if (navigating) {
                  map.easeTo({ pitch: 0, bearing: currentBearingRef.current, zoom: 17, duration: 800 });
                } else {
                  map.easeTo({ pitch: 50, bearing: -12, zoom: map.getZoom() || 12, duration: 800 });
                }
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px',
              borderRadius: 12, cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: carView ? 'rgba(108,92,231,0.3)' : 'rgba(0,0,0,0.6)',
              color: carView ? SF.primary : 'rgba(255,255,255,0.6)',
              border: `1px solid ${carView ? SF.primary + '50' : 'rgba(255,255,255,0.15)'}`,
              backdropFilter: 'blur(8px)', transition: 'all 0.2s', whiteSpace: 'nowrap',
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 13 }}>🏙️</span>
            <span>{carView ? '2D' : '3D'}</span>
          </div>
        </Tooltip>
        {/* Satellite / Map toggle */}
        <Tooltip title={mapStyle === 'satellite' ? t('wax.mapVector') : t('wax.mapSatellite')} placement="right">
          <div
            onClick={() => switchMapStyle(mapStyle === 'satellite' ? 'vector' : 'satellite')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px',
              borderRadius: 12, cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: mapStyle === 'satellite' ? 'rgba(0,180,148,0.25)' : 'rgba(0,0,0,0.6)',
              color: mapStyle === 'satellite' ? SF.success : 'rgba(255,255,255,0.6)',
              border: `1px solid ${mapStyle === 'satellite' ? SF.success + '50' : 'rgba(255,255,255,0.15)'}`,
              backdropFilter: 'blur(8px)', transition: 'all 0.2s', whiteSpace: 'nowrap',
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 13 }}>{mapStyle === 'satellite' ? '🗺️' : '🛰️'}</span>
            <span>{mapStyle === 'satellite' ? t('wax.mapVector') : t('wax.mapSatellite')}</span>
          </div>
        </Tooltip>
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
                  ? <img src={selectedEntity.logoUrl} alt={selectedEntity.name || ''} loading="lazy" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
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
                <img src={selectedEntity.previewUrl} alt="" loading="lazy" style={{
                  width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 6,
                }} />
              )}
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                <EyeOutlined /> {selectedEntity.viewCount} {t('wax.pinViews')} ·
                ⏳ {t('wax.pinExpires')} {Math.max(0, Math.ceil((new Date(selectedEntity.expiresAt).getTime() - Date.now()) / 3600000))}{t('wax.hours')}
              </div>
            </div>
          )}

          {/* Navigate-to button — all entities with coordinates */}
          {selectedEntity.latitude != null && selectedEntity.longitude != null && (
            <div
              onClick={() => {
                const dest = { lat: selectedEntity.latitude, lng: selectedEntity.longitude };
                setSelectedEntity(null);
                computeRoute(dest);
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                marginTop: 10, padding: '8px 0', borderRadius: 12, cursor: 'pointer',
                background: `${SF.primary}20`, border: `1px solid ${SF.primary}40`,
                color: SF.primary, fontSize: 12, fontWeight: 700,
                transition: 'all 0.2s',
              }}
            >
              <CarOutlined /> {t('wax.nav.goThere')}
            </div>
          )}
        </div>
      )}

      {/* ── Routing search bar (top:48, same position as HUD) ── */}
      {routingOpen && !routeData && (
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 30 }}>
          {/* Search bar — 48px, same as top bar */}
          <div style={{
            height: 48,
            background: 'rgba(10, 10, 25, 0.92)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center',
            padding: '0 10px', gap: 8,
          }}>
            <CarOutlined style={{ color: SF.primary, fontSize: 15, flexShrink: 0 }} />
            <input
              type="text"
              value={destQuery}
              onChange={(e) => searchDestination(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') triggerSearch(); }}
              placeholder={t('wax.nav.searchPlaceholder')}
              autoFocus
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'white', fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
              }}
            />
            {geocodeLoading
              ? <LoadingOutlined spin style={{ color: SF.primary, fontSize: 14 }} />
              : <SearchOutlined onClick={triggerSearch} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer' }} />
            }
            <CloseOutlined onClick={() => setRoutingOpen(false)} style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13 }} />
          </div>

          {/* Suggestions dropdown (below the bar) */}
          {(suggestions.length > 0 || (geocodeLoading) || (!geocodeLoading && geocodeSearched && suggestions.length === 0 && destQuery.trim().length >= 2)) && (
            <div style={{
              background: 'rgba(15, 15, 30, 0.97)', backdropFilter: 'blur(16px)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              maxHeight: '40vh', overflowY: 'auto',
            }}>
              {geocodeLoading && (
                <div style={{ textAlign: 'center', padding: 10, color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                  <LoadingOutlined spin style={{ marginRight: 6 }} />{t('wax.nav.searching')}
                </div>
              )}
              {!geocodeLoading && geocodeSearched && suggestions.length === 0 && destQuery.trim().length >= 2 && (
                <div style={{ textAlign: 'center', padding: 10, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                  {t('wax.nav.noResults')}
                </div>
              )}
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setDestQuery(s.displayName.split(',')[0]);
                    setSuggestions([]);
                    computeRoute({ lat: s.lat, lng: s.lng });
                  }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px',
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.03)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                >
                  <EnvironmentOutlined style={{ color: SF.primary, fontSize: 14, marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>
                      {s.displayName.split(',')[0]}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 1 }}>
                      {s.displayName.split(',').slice(1, 3).join(',')}
                    </div>
                  </div>
                  {s.distance != null && (
                    <span style={{ color: SF.primary, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>
                      {s.distance < 1 ? `${Math.round(s.distance * 1000)}m` : `${s.distance}km`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom panel removed — route controls are now in the top bar */}
    </div>
  );
};

export default WaxPanel;
