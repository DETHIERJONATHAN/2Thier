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
				_count: { select: { users: true } },
			},
		});

		// 3. Combs (Chantiers with location)
		const combs = await db.chantier.findMany({
			where: {
				latitude: { not: null, gte: swLat, lte: neLat },
				longitude: { not: null, gte: swLng, lte: neLng },
				status: { in: ['active', 'planning'] },
			},
			select: {
				id: true, name: true, siteAddress: true,
				latitude: true, longitude: true, status: true,
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
					memberCount: c._count.users,
				})),
				combs: combs.map(c => ({
					type: 'comb' as const,
					id: c.id,
					name: c.name,
					address: c.siteAddress,
					latitude: c.latitude,
					longitude: c.longitude,
					status: c.status,
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
router.post('/cleanup', async (req, res) => {
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
						viewedAt: { not: null },
						viewedAt: { lt: new Date(Date.now() - 10 * 1000) },
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

export default router;
