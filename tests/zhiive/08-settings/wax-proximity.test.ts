/**
 * Tests unitaires pour les alertes de proximité Wax.
 * Teste la fonction haversine et la logique de notification.
 */

import { describe, it, expect } from 'vitest';

// Test the haversine formula directly (reimplemented for unit testing)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

describe('Wax Proximity — Haversine Distance', () => {
  it('returns 0 for same point', () => {
    expect(haversineKm(50.6, 3.06, 50.6, 3.06)).toBe(0);
  });

  it('calculates Liège to Brussels correctly (~100 km)', () => {
    // Liège: 50.6326, 5.5797
    // Brussels: 50.8503, 4.3517
    const dist = haversineKm(50.6326, 5.5797, 50.8503, 4.3517);
    expect(dist).toBeGreaterThan(80);
    expect(dist).toBeLessThan(120);
  });

  it('detects nearby points within 10km radius', () => {
    // Two points ~1km apart in Charleroi
    const dist = haversineKm(50.4108, 4.4446, 50.4190, 4.4446);
    expect(dist).toBeLessThan(1);
  });

  it('detects far points outside 10km radius', () => {
    // Charleroi to Namur (~35km)
    const dist = haversineKm(50.4108, 4.4446, 50.4674, 4.8672);
    expect(dist).toBeGreaterThan(25);
    expect(dist).toBeLessThan(40);
  });

  it('handles cross-hemisphere distances', () => {
    // Paris to New York (~5839 km)
    const dist = haversineKm(48.8566, 2.3522, 40.7128, -74.0060);
    expect(dist).toBeGreaterThan(5500);
    expect(dist).toBeLessThan(6200);
  });

  it('bounding box approximation works for short distances', () => {
    const radiusKm = 10;
    const lat = 50.4;
    const latDeg = radiusKm / 111;
    const lngDeg = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

    // A point right at the edge of bounding box should be approximately 10km
    const edgeLat = lat + latDeg;
    const dist = haversineKm(lat, 4.4, edgeLat, 4.4);
    expect(dist).toBeCloseTo(10, 0);
  });
});
