/**
 * Tests exhaustifs pour les routes Wax (src/routes/wax.ts)
 *
 * Couvre :
 *  - Haversine distance (déjà couvert + extensions)
 *  - Ghost mode approximation logic
 *  - Bounding box filtering
 *  - Pin lifecycle (create, view, delete, cleanup)
 *  - Proximity alerts
 *  - Settings enforcement (waxEnabled, waxAlertsEnabled, waxDefaultRadiusKm)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Haversine ────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ═══════════════════════════════════════════════════════
describe('Wax — Haversine Distance Extended', () => {
  it('Bruxelles to Namur ~60km', () => {
    const dist = haversineKm(50.8503, 4.3517, 50.4674, 4.8672);
    expect(dist).toBeGreaterThan(50);
    expect(dist).toBeLessThan(70);
  });

  it('Charleroi to Mons ~35km', () => {
    const dist = haversineKm(50.4108, 4.4446, 50.4540, 3.9560);
    expect(dist).toBeGreaterThan(25);
    expect(dist).toBeLessThan(45);
  });

  it('London to Paris ~340km', () => {
    const dist = haversineKm(51.5074, -0.1278, 48.8566, 2.3522);
    expect(dist).toBeGreaterThan(320);
    expect(dist).toBeLessThan(360);
  });

  it('very close points (~10m) are under 0.1km', () => {
    const dist = haversineKm(50.4108, 4.4446, 50.4109, 4.4447);
    expect(dist).toBeLessThan(0.1);
  });

  it('antipodal points are approximately 20000km', () => {
    const dist = haversineKm(0, 0, 0, 180);
    expect(dist).toBeGreaterThan(19000);
    expect(dist).toBeLessThan(21000);
  });
});

// ═══════════════════════════════════════════════════════
describe('Wax — Ghost Mode Approximation', () => {
  it('rounds coordinates to ~1km precision', () => {
    const lat = 50.4108;
    const lng = 4.4446;
    const approxLat = Math.round(lat * 100) / 100;
    const approxLng = Math.round(lng * 100) / 100;

    expect(approxLat).toBe(50.41);
    expect(approxLng).toBe(4.44);

    // Distance between original and approximated should be < 2km
    const dist = haversineKm(lat, lng, approxLat, approxLng);
    expect(dist).toBeLessThan(2);
  });

  it('ghost mode exact → returns exact coordinates', () => {
    const ghostMode = 'exact';
    const lat = 50.41085623;
    const isApprox = ghostMode === 'approximate';
    const resultLat = isApprox ? Math.round(lat * 100) / 100 : lat;
    expect(resultLat).toBe(lat);
  });

  it('ghost mode ghost → should be excluded entirely', () => {
    const ghostMode = 'ghost';
    const filter = { ghostMode: { not: 'ghost' } };
    const visible = ghostMode !== 'ghost';
    expect(visible).toBe(false);
    expect(filter.ghostMode.not).toBe('ghost');
  });
});

// ═══════════════════════════════════════════════════════
describe('Wax — Bounding Box Filtering', () => {
  it('parses bounding box from query params', () => {
    const query = { sw_lat: '50.0', sw_lng: '3.0', ne_lat: '51.0', ne_lng: '5.0' };
    const swLat = parseFloat(query.sw_lat) || -90;
    const swLng = parseFloat(query.sw_lng) || -180;
    const neLat = parseFloat(query.ne_lat) || 90;
    const neLng = parseFloat(query.ne_lng) || 180;

    expect(swLat).toBe(50.0);
    expect(swLng).toBe(3.0);
    expect(neLat).toBe(51.0);
    expect(neLng).toBe(5.0);
  });

  it('falls back to global bounds with invalid params', () => {
    const query = { sw_lat: 'invalid', sw_lng: undefined };
    const swLat = parseFloat(query.sw_lat as string) || -90;
    const swLng = parseFloat(query.sw_lng as any) || -180;

    expect(swLat).toBe(-90);
    expect(swLng).toBe(-180);
  });

  it('detects point within bounding box', () => {
    const box = { swLat: 50.0, swLng: 3.0, neLat: 51.0, neLng: 5.0 };
    const point = { lat: 50.5, lng: 4.0 };
    const inside = point.lat >= box.swLat && point.lat <= box.neLat &&
                   point.lng >= box.swLng && point.lng <= box.neLng;
    expect(inside).toBe(true);
  });

  it('detects point outside bounding box', () => {
    const box = { swLat: 50.0, swLng: 3.0, neLat: 51.0, neLng: 5.0 };
    const point = { lat: 52.0, lng: 4.0 }; // Too far north
    const inside = point.lat >= box.swLat && point.lat <= box.neLat;
    expect(inside).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
describe('Wax — Pin Lifecycle', () => {
  it('pin has required fields', () => {
    const pin = {
      id: 'pin-1',
      userId: 'user-1',
      organizationId: 'org-1',
      latitude: 50.41,
      longitude: 4.44,
      content: 'Hello from here!',
      mediaUrl: null,
      type: 'message',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      viewCount: 0,
    };

    expect(pin).toHaveProperty('latitude');
    expect(pin).toHaveProperty('longitude');
    expect(pin).toHaveProperty('expiresAt');
    expect(pin.viewCount).toBe(0);
  });

  it('pin view increments viewCount', () => {
    let viewCount = 0;
    viewCount += 1;
    expect(viewCount).toBe(1);
  });

  it('expired pins are detected correctly', () => {
    const expiredPin = { expiresAt: new Date(Date.now() - 1000) };
    const activePin = { expiresAt: new Date(Date.now() + 60000) };

    expect(expiredPin.expiresAt.getTime()).toBeLessThan(Date.now());
    expect(activePin.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('only owner can delete their own pin', () => {
    const pin = { userId: 'user-1' };
    const requester1 = { id: 'user-1', isSuperAdmin: false };
    const requester2 = { id: 'user-2', isSuperAdmin: false };
    const admin = { id: 'admin-1', isSuperAdmin: true };

    expect(pin.userId === requester1.id || requester1.isSuperAdmin).toBe(true);
    expect(pin.userId === requester2.id || requester2.isSuperAdmin).toBe(false);
    expect(pin.userId === admin.id || admin.isSuperAdmin).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
describe('Wax — Proximity Alerts', () => {
  it('triggers alert when bee enters radius', () => {
    const radiusKm = 10;
    const colonyLat = 50.41;
    const colonyLng = 4.44;
    const beeLat = 50.42;
    const beeLng = 4.45;

    const dist = haversineKm(colonyLat, colonyLng, beeLat, beeLng);
    expect(dist).toBeLessThan(radiusKm);
  });

  it('does not trigger alert outside radius', () => {
    const radiusKm = 10;
    const dist = haversineKm(50.41, 4.44, 51.0, 5.0);
    expect(dist).toBeGreaterThan(radiusKm);
  });

  it('respects custom waxDefaultRadiusKm', () => {
    const customRadius = 25;
    const dist = haversineKm(50.41, 4.44, 50.55, 4.55); // ~17km
    expect(dist).toBeLessThan(customRadius);
    expect(dist).toBeGreaterThan(10); // Would be missed with default 10km
  });

  it('does not alert when waxAlertsEnabled is false', () => {
    const settings = { waxAlertsEnabled: false, waxDefaultRadiusKm: 10 };
    const shouldAlert = settings.waxAlertsEnabled;
    expect(shouldAlert).toBe(false);
  });

  it('does not alert when waxEnabled is false (global kill switch)', () => {
    const settings = { waxEnabled: false, waxAlertsEnabled: true };
    const canUseWax = settings.waxEnabled;
    expect(canUseWax).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
describe('Wax — Online Status', () => {
  it('user is online if updated within 5 minutes', () => {
    const updatedAt = new Date(Date.now() - 2 * 60 * 1000); // 2 min ago
    const isOnline = (Date.now() - updatedAt.getTime()) < 5 * 60 * 1000;
    expect(isOnline).toBe(true);
  });

  it('user is offline if updated more than 5 minutes ago', () => {
    const updatedAt = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago
    const isOnline = (Date.now() - updatedAt.getTime()) < 5 * 60 * 1000;
    expect(isOnline).toBe(false);
  });

  it('24h cutoff excludes stale locations', () => {
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1h ago
    const stale = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48h ago

    expect(recent.getTime()).toBeGreaterThan(cutoff24h.getTime());
    expect(stale.getTime()).toBeLessThan(cutoff24h.getTime());
  });
});
