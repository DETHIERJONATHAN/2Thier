/**
 * 🕯️ WAX — Carte interactive & contenu éphémère
 * Routes: /api/wax/*
 * 
 * GET  /locations       → Positions des Bees/Colonies/Combs visibles
 * POST /location        → Mettre à jour sa propre position
 * GET  /pins            → Pins éphémères dans un bounding box
 * POST /pins            → Créer un pin éphémère (lié ou non à un message)
 * POST /pins/:id/view   → Marquer un pin comme vu (incrémente viewCount)
 * DELETE /pins/:id      → Supprimer son propre pin
 * PUT  /ghost-mode      → Changer son mode fantôme
 * POST /cleanup         → Cron: suppression des pins/messages expirés
 */

import { Router } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { getOrgSocialSettings } from '../lib/feed-visibility';
import { sendPushToUser } from './push';

const router = Router();

// Apply auth middleware to all wax routes
router.use(authenticateToken as any);

// ── Middleware: extract user from request ──
function extractUser(req: any) {
	return req.user || req.authUser || null;
}

// ═══════════════════════════════════════════════════════
// GET /api/wax/locations — All visible entities for the map
// ═══════════════════════════════════════════════════════
router.get('/locations', async (req, res) => {
	try {
		const user = extractUser(req);
		if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

		const { sw_lat, sw_lng, ne_lat, ne_lng } = req.query;
		const swLat = parseFloat(sw_lat as string) || -90;
		const swLng = parseFloat(sw_lng as string) || -180;
		const neLat = parseFloat(ne_lat as string) || 90;
		const neLng = parseFloat(ne_lng as string) || 180;

		// 1. Bee locations (users with shared location, not ghost)
		const beeLocations = await db.userLocation.findMany({
			where: {
				ghostMode: { not: 'ghost' },
				latitude: { gte: swLat, lte: neLat },
				longitude: { gte: swLng, lte: neLng },
				updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // active last 24h
			},
			include: {
				user: {
					select: {
						id: true, firstName: true, lastName: true, avatarUrl: true,
						organizationId: true, role: true, status: true,
					},
				},
			},
		});

		// 2. Colony locations (organizations with lat/lng set)
		const colonies = await db.organization.findMany({
			where: {
				latitude: { not: null, gte: swLat, lte: neLat },
				longitude: { not: null, gte: swLng, lte: neLng },
				status: 'active',
			},
			select: {
				id: true, name: true, logoUrl: true, description: true,
				latitude: true, longitude: true,
				_count: { select: { UserOrganization: true } },
			},
		});

		// 3. Combs (Chantiers with location)
		const combs = await db.chantier.findMany({
			where: {
				latitude: { not: null, gte: swLat, lte: neLat },
				longitude: { not: null, gte: swLng, lte: neLng },
			},
			select: {
				id: true, productLabel: true, customLabel: true, siteAddress: true,
				latitude: true, longitude: true, statusId: true,
				organizationId: true,
			},
		});

		// Apply ghost mode: approximate = round to ~1km
		const bees = beeLocations.map(loc => {
			const isApprox = loc.ghostMode === 'approximate';
			return {
				type: 'bee' as const,
				id: loc.user.id,
				name: `${loc.user.firstName || ''} ${loc.user.lastName || ''}`.trim() || 'Bee',
				avatarUrl: loc.user.avatarUrl,
				organizationId: loc.user.organizationId,
				latitude: isApprox ? Math.round(loc.latitude * 100) / 100 : loc.latitude,
				longitude: isApprox ? Math.round(loc.longitude * 100) / 100 : loc.longitude,
				approximate: isApprox,
				online: (Date.now() - loc.updatedAt.getTime()) < 5 * 60 * 1000, // 5min
			};
		});

		res.json({
			success: true,
			data: {
				bees,
				colonies: colonies.map(c => ({
					type: 'colony' as const,
					id: c.id,
					name: c.name,
					logoUrl: c.logoUrl,
					description: c.description,
					latitude: c.latitude,
					longitude: c.longitude,
					memberCount: c._count.UserOrganization,
				})),
				combs: combs.map(c => ({
					type: 'comb' as const,
					id: c.id,
					name: c.customLabel || c.productLabel,
					address: c.siteAddress,
					latitude: c.latitude,
					longitude: c.longitude,
					status: c.statusId,
					organizationId: c.organizationId,
				})),
			},
		});
	} catch (e) {
		console.error('[wax] GET /locations error:', e);
		res.status(500).json({ success: false, message: 'Error fetching locations' });
	}
});

// ═══════════════════════════════════════════════════════
// POST /api/wax/location — Update own position
// ═══════════════════════════════════════════════════════
router.post('/location', async (req, res) => {
	try {
		const user = extractUser(req);
		if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

		const settings = await getOrgSocialSettings(user.organizationId || null);
		if (!settings.waxEnabled) return res.status(403).json({ success: false, message: 'Wax disabled' });

		const { latitude, longitude, accuracy, heading } = req.body;
		if (typeof latitude !== 'number' || typeof longitude !== 'number') {
			return res.status(400).json({ success: false, message: 'latitude and longitude required' });
		}

		const location = await db.userLocation.upsert({
			where: { userId: user.id },
			update: { latitude, longitude, accuracy, heading },
			create: { userId: user.id, latitude, longitude, accuracy, heading },
		});

		res.json({ success: true, data: location });
	} catch (e) {
		console.error('[wax] POST /location error:', e);
		res.status(500).json({ success: false, message: 'Error updating location' });
	}
});

// ═══════════════════════════════════════════════════════
// PUT /api/wax/ghost-mode — Change ghost mode
// ═══════════════════════════════════════════════════════
router.put('/ghost-mode', async (req, res) => {
	try {
		const user = extractUser(req);
		if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

		const { mode } = req.body; // visible | approximate | ghost
		if (!['visible', 'approximate', 'ghost'].includes(mode)) {
			return res.status(400).json({ success: false, message: 'Invalid mode' });
		}

		const location = await db.userLocation.upsert({
			where: { userId: user.id },
			update: { ghostMode: mode },
			create: { userId: user.id, latitude: 0, longitude: 0, ghostMode: mode },
		});

		res.json({ success: true, data: { ghostMode: location.ghostMode } });
	} catch (e) {
		console.error('[wax] PUT /ghost-mode error:', e);
		res.status(500).json({ success: false, message: 'Error updating ghost mode' });
	}
});

// ═══════════════════════════════════════════════════════
// GET /api/wax/pins — Ephemeral pins in bounding box
// ═══════════════════════════════════════════════════════
router.get('/pins', async (req, res) => {
	try {
		const user = extractUser(req);
		if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

		const { sw_lat, sw_lng, ne_lat, ne_lng } = req.query;
		const swLat = parseFloat(sw_lat as string) || -90;
		const swLng = parseFloat(sw_lng as string) || -180;
		const neLat = parseFloat(ne_lat as string) || 90;
		const neLng = parseFloat(ne_lng as string) || 180;

		const pins = await db.waxPin.findMany({
			where: {
				latitude: { gte: swLat, lte: neLat },
				longitude: { gte: swLng, lte: neLng },
				expiresAt: { gt: new Date() },
			},
			include: {
				user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
				organization: { select: { id: true, name: true, logoUrl: true } },
			},
			orderBy: { createdAt: 'desc' },
			take: 200,
		});

		res.json({
			success: true,
			data: pins.map(p => ({
				id: p.id,
				type: 'wax-pin' as const,
				pinType: p.pinType,
				title: p.title,
				previewUrl: p.previewUrl,
				latitude: p.latitude,
				longitude: p.longitude,
				createdAt: p.createdAt,
				expiresAt: p.expiresAt,
				viewCount: p.viewCount,
				messageId: p.messageId,
				user: { id: p.user.id, name: `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim(), avatarUrl: p.user.avatarUrl },
				organization: p.organization ? { id: p.organization.id, name: p.organization.name, logoUrl: p.organization.logoUrl } : null,
			})),
		});
	} catch (e) {
		console.error('[wax] GET /pins error:', e);
		res.status(500).json({ success: false, message: 'Error fetching pins' });
	}
});

// ═══════════════════════════════════════════════════════
// POST /api/wax/pins — Create ephemeral pin
// ═══════════════════════════════════════════════════════
router.post('/pins', async (req, res) => {
	try {
		const user = extractUser(req);
		if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

		const settings = await getOrgSocialSettings(user.organizationId || null);
		if (!settings.waxEnabled) return res.status(403).json({ success: false, message: 'Wax disabled' });

		const { latitude, longitude, pinType, title, previewUrl, messageId, ttlHours, publishAsOrg } = req.body;
		if (typeof latitude !== 'number' || typeof longitude !== 'number') {
			return res.status(400).json({ success: false, message: 'latitude and longitude required' });
		}

		const ttl = Math.min(Math.max(ttlHours || 24, 1), 168); // 1h to 7 days max
		const expiresAt = new Date(Date.now() + ttl * 60 * 60 * 1000);

		const pin = await db.waxPin.create({
			data: {
				userId: user.id,
				organizationId: publishAsOrg ? user.organizationId : null,
				latitude,
				longitude,
				pinType: pinType || 'whisper',
				title: title?.substring(0, 200),
				previewUrl,
				messageId: messageId || null,
				expiresAt,
			},
		});

		res.json({ success: true, data: pin });

		// 🐝 Alertes de proximité — Notifier les utilisateurs proches (async, non bloquant)
		notifyNearbyUsers(pin, user).catch(err =>
			console.error('[wax] proximity alert error:', err)
		);
	} catch (e) {
		console.error('[wax] POST /pins error:', e);
		res.status(500).json({ success: false, message: 'Error creating pin' });
	}
});

// ═══════════════════════════════════════════════════════
// POST /api/wax/pins/:id/view — Mark pin as viewed
// ═══════════════════════════════════════════════════════
router.post('/pins/:id/view', async (req, res) => {
	try {
		const pin = await db.waxPin.update({
			where: { id: req.params.id },
			data: { viewCount: { increment: 1 } },
		});
		res.json({ success: true, data: { viewCount: pin.viewCount } });
	} catch {
		res.status(404).json({ success: false, message: 'Pin not found' });
	}
});

// ═══════════════════════════════════════════════════════
// DELETE /api/wax/pins/:id — Delete own pin
// ═══════════════════════════════════════════════════════
router.delete('/pins/:id', async (req, res) => {
	try {
		const user = extractUser(req);
		if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

		const pin = await db.waxPin.findUnique({ where: { id: req.params.id } });
		if (!pin || pin.userId !== user.id) {
			return res.status(403).json({ success: false, message: 'Not your pin' });
		}

		await db.waxPin.delete({ where: { id: req.params.id } });
		res.json({ success: true });
	} catch (e) {
		console.error('[wax] DELETE /pins error:', e);
		res.status(500).json({ success: false, message: 'Error deleting pin' });
	}
});

// ═══════════════════════════════════════════════════════
// POST /api/wax/cleanup — Cron: delete expired pins & expired ephemeral messages
// ═══════════════════════════════════════════════════════
router.post('/cleanup', async (_req, res) => {
	try {
		const now = new Date();

		// 1. Delete expired WaxPins
		const deletedPins = await db.waxPin.deleteMany({
			where: { expiresAt: { lt: now } },
		});

		// 2. Mark expired ephemeral messages
		const expiredMessages = await db.message.updateMany({
			where: {
				isEphemeral: true,
				isExpired: false,
				OR: [
					// Viewed + TTL elapsed (default 10s after view)
					{
						viewedAt: { not: null, lt: new Date(Date.now() - 10 * 1000) },
					},
					// Never viewed but older than 24h
					{
						viewedAt: null,
						createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
					},
				],
			},
			data: { isExpired: true, content: null, mediaUrls: null },
		});

		console.log(`[wax/cleanup] Deleted ${deletedPins.count} pins, expired ${expiredMessages.count} messages`);
		res.json({ success: true, deletedPins: deletedPins.count, expiredMessages: expiredMessages.count });
	} catch (e) {
		console.error('[wax] POST /cleanup error:', e);
		res.status(500).json({ success: false, message: 'Cleanup error' });
	}
});

// ═══════════════════════════════════════════════════════
// GET /api/wax/route — Get route between two points (proxy OSRM)
// ═══════════════════════════════════════════════════════
router.get('/route', async (req, res) => {
	try {
		const user = extractUser(req);
		if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

		const { from_lng, from_lat, to_lng, to_lat } = req.query;
		const fromLng = parseFloat(from_lng as string);
		const fromLat = parseFloat(from_lat as string);
		const toLng = parseFloat(to_lng as string);
		const toLat = parseFloat(to_lat as string);

		if ([fromLng, fromLat, toLng, toLat].some(v => isNaN(v))) {
			return res.status(400).json({ success: false, message: 'from_lng, from_lat, to_lng, to_lat required' });
		}

		// OSRM public demo server — free, no API key
		const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true&annotations=false`;

		const response = await fetch(url);
		if (!response.ok) {
			return res.status(502).json({ success: false, message: 'OSRM service unavailable' });
		}

		const data = await response.json();
		if (data.code !== 'Ok' || !data.routes?.length) {
			return res.status(404).json({ success: false, message: 'No route found' });
		}

		const route = data.routes[0];

		// Fetch alert pins (signalements) near the route geometry
		const routeCoords = route.geometry.coordinates as [number, number][];
		let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
		for (const [lng, lat] of routeCoords) {
			if (lng < minLng) minLng = lng;
			if (lng > maxLng) maxLng = lng;
			if (lat < minLat) minLat = lat;
			if (lat > maxLat) maxLat = lat;
		}
		const expand = 0.002; // ~200m buffer
		let alertPins: { id: string; pinType: string; title: string | null; latitude: number; longitude: number }[] = [];
		try {
			alertPins = await db.waxPin.findMany({
				where: {
					latitude: { gte: minLat - expand, lte: maxLat + expand },
					longitude: { gte: minLng - expand, lte: maxLng + expand },
					expiresAt: { gt: new Date() },
					pinType: { in: ['radar', 'police', 'accident', 'travaux', 'danger', 'embouteillage'] },
				},
				select: { id: true, pinType: true, title: true, latitude: true, longitude: true },
			});
		} catch { /* non-blocking: alerts are optional */ }

		res.json({
			success: true,
			data: {
				geometry: route.geometry,             // GeoJSON LineString
				distance: route.distance,             // meters
				duration: route.duration,             // seconds
				steps: route.legs[0].steps.map((s: any) => ({
					instruction: s.maneuver.type === 'depart' ? 'Départ'
						: s.maneuver.type === 'arrive' ? 'Arrivée'
						: `${getManeuverText(s.maneuver.type, s.maneuver.modifier)} ${s.name || ''}`.trim(),
					distance: s.distance,
					duration: s.duration,
					maneuver: s.maneuver,
					location: s.maneuver.location,    // [lng, lat]
				})),
				alerts: alertPins,
			},
		});
	} catch (e) {
		console.error('[wax] GET /route error:', e);
		res.status(500).json({ success: false, message: 'Error computing route' });
	}
});

// ═══════════════════════════════════════════════════════
// GET /api/wax/geocode — Geocode address to coordinates (Nominatim)
// ═══════════════════════════════════════════════════════
router.get('/geocode', async (req, res) => {
	try {
		const user = extractUser(req);
		if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

		const q = (req.query.q as string || '').trim();
		if (!q || q.length < 2) {
			return res.status(400).json({ success: false, message: 'Query too short' });
		}

		// User's current position for country bias and distance sorting
		const userLat = parseFloat(req.query.lat as string) || null;
		const userLng = parseFloat(req.query.lng as string) || null;

		// Detect country codes from query: if user types ".fr" or "france", extend to that country
		let countryCodes = 'be'; // Default: Belgium
		const qLower = q.toLowerCase();
		if (/\.(fr|france)\b/i.test(qLower) || /\bfrance\b/i.test(qLower)) {
			countryCodes = 'fr';
		} else if (/\.(lu|luxembourg)\b/i.test(qLower) || /\bluxembourg\b/i.test(qLower)) {
			countryCodes = 'lu';
		} else if (/\.(nl|pays.bas|nederland)\b/i.test(qLower) || /\b(pays.bas|nederland|netherlands)\b/i.test(qLower)) {
			countryCodes = 'nl';
		} else if (/\.(de|allemagne)\b/i.test(qLower) || /\b(allemagne|deutschland|germany)\b/i.test(qLower)) {
			countryCodes = 'de';
		} else {
			// Default: Belgian-first, with neighboring countries as fallback
			countryCodes = 'be,lu,fr,nl,de';
		}

		// Build Nominatim query with viewbox bias around user position (if available)
		let viewbox = '';
		if (userLat && userLng) {
			// Bias search results within ~100km of user
			const bias = 0.9; // ~100km in degrees
			viewbox = `&viewbox=${userLng - bias},${userLat + bias},${userLng + bias},${userLat - bias}&bounded=0`;
		}

		const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=10&addressdetails=1&countrycodes=${countryCodes}${viewbox}`;

		const response = await fetch(url, {
			headers: { 'User-Agent': 'Zhiive/1.0 (contact@2thier.be)' },
		});
		if (!response.ok) {
			return res.status(502).json({ success: false, message: 'Geocoding service unavailable' });
		}

		const results = await response.json();

		let data = results.map((r: any) => ({
			displayName: r.display_name,
			lat: parseFloat(r.lat),
			lng: parseFloat(r.lon),
			type: r.type,
			distance: null as number | null,
		}));

		// Sort by distance from user position (nearest first)
		if (userLat && userLng) {
			for (const d of data) {
				const dLat = (d.lat - userLat) * Math.PI / 180;
				const dLng = (d.lng - userLng) * Math.PI / 180;
				const a = Math.sin(dLat / 2) ** 2 +
					Math.cos(userLat * Math.PI / 180) * Math.cos(d.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
				d.distance = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10; // km
			}
			data.sort((a: any, b: any) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
		}

		res.json({
			success: true,
			data: data.slice(0, 8),
		});
	} catch (e) {
		console.error('[wax] GET /geocode error:', e);
		res.status(500).json({ success: false, message: 'Geocoding error' });
	}
});

// ── Helper: OSRM maneuver type to human text ──
function getManeuverText(type: string, modifier?: string): string {
	const modMap: Record<string, string> = {
		left: 'à gauche', right: 'à droite',
		'slight left': 'légèrement à gauche', 'slight right': 'légèrement à droite',
		'sharp left': 'fortement à gauche', 'sharp right': 'fortement à droite',
		straight: 'tout droit', uturn: 'demi-tour',
	};
	const typeMap: Record<string, string> = {
		turn: 'Tournez', 'new name': 'Continuez', merge: 'Rejoignez',
		'on ramp': 'Prenez la bretelle', 'off ramp': 'Sortez',
		fork: 'Prenez la fourche', 'end of road': 'En fin de route, tournez',
		roundabout: 'Au rond-point, prenez', rotary: 'Au rond-point, prenez',
		'continue': 'Continuez',
	};
	const verb = typeMap[type] || 'Continuez';
	const dir = modMap[modifier || ''] || '';
	return `${verb} ${dir}`.trim();
}

// ═══════════════════════════════════════════════════════
// 🐝 PROXIMITY ALERTS — Notify nearby users when a pin is created
// ═══════════════════════════════════════════════════════

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371;
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLng = (lng2 - lng1) * Math.PI / 180;
	const a = Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function notifyNearbyUsers(pin: { id: string; latitude: number; longitude: number; pinType: string; title: string | null; userId: string; organizationId: string | null }, creator: { id: string; organizationId?: string }) {
	// Load org settings to check if alerts are enabled
	const settings = await getOrgSocialSettings(creator.organizationId || null);
	if (!settings.waxEnabled || !settings.waxAlertsEnabled) return;

	const radiusKm = settings.waxDefaultRadiusKm || 10;

	// Bounding box approximation (1° lat ≈ 111 km)
	const latDeg = radiusKm / 111;
	const lngDeg = radiusKm / (111 * Math.cos(pin.latitude * Math.PI / 180));

	// Find nearby users with recent location (last 24h), not in ghost mode, not the creator
	const nearbyUsers = await db.userLocation.findMany({
		where: {
			latitude: { gte: pin.latitude - latDeg, lte: pin.latitude + latDeg },
			longitude: { gte: pin.longitude - lngDeg, lte: pin.longitude + lngDeg },
			ghostMode: 'visible',
			userId: { not: creator.id },
			updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
		},
		select: { userId: true, latitude: true, longitude: true },
	});

	// Filter by actual haversine distance and send push
	const pinTitle = pin.title || 'Nouveau pin Wax';
	let sent = 0;
	for (const loc of nearbyUsers) {
		const dist = haversineKm(pin.latitude, pin.longitude, loc.latitude, loc.longitude);
		if (dist <= radiusKm) {
			const distLabel = dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
			sendPushToUser(loc.userId, {
				title: 'Wax — Nouveau contenu à proximité',
				body: `${pinTitle} (${distLabel} de vous)`,
				tag: `wax_alert_${pin.id}`,
				type: 'wax_alert',
			});
			sent++;
		}
	}

	if (sent > 0) {
		console.log(`[wax] Proximity alerts: ${sent} user(s) notified for pin ${pin.id}`);
	}
}

export default router;
