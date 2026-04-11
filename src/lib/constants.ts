/**
 * 🔢 CONSTANTES GLOBALES — source unique de vérité pour les valeurs numériques
 *
 * NE JAMAIS écrire de magic numbers dans les composants.
 * Exporter ici toute constante partagée entre frontend et backend.
 */

// ─── Tailles de fichiers (en octets) ─────────────────────────────────────────
export const MAX_PHOTO_SIZE        = 50  * 1024 * 1024; // 50 MB  — photos, stories
export const MAX_VIDEO_SIZE        = 100 * 1024 * 1024; // 100 MB — reels, live timeline
export const MAX_DOCUMENT_SIZE     = 10  * 1024 * 1024; // 10 MB  — pièces jointes documents
export const MAX_LOGO_SIZE         = 5   * 1024 * 1024; // 5 MB   — logos organisation
export const MAX_AVATAR_SIZE       = 10  * 1024 * 1024; // 10 MB  — avatars utilisateurs

// ─── Pagination ───────────────────────────────────────────────────────────────
export const API_PAGE_SIZE         = 20;   // Taille de page par défaut
export const API_PAGE_SIZE_SMALL   = 10;   // Petites listes (events, capsules)
export const API_PAGE_SIZE_LARGE   = 30;   // Grandes listes (explore/users)
export const API_FEED_SPARKS_LIMIT = 20;   // Feed social — sparks
export const API_FEED_BATTLES_LIMIT = 10;  // Feed social — battles
export const API_COMMENTS_LIMIT    = 20;   // Commentaires d'un post
export const API_EMAILS_LIMIT      = 100;  // Emails Postal

// ─── Tokens / Sécurité ───────────────────────────────────────────────────────
export const OTP_MIN               = 100_000; // 6 chiffres OTP min
export const OTP_MAX               = 999_999; // 6 chiffres OTP max
export const SIGNAL_EXPIRY_MS      = 120_000; // 2 min — expiration signaux live

// ─── Layout ──────────────────────────────────────────────────────────────────
export const SIDEBAR_LEFT_WIDTH    = 280; // px — barre latérale gauche
export const SIDEBAR_RIGHT_WIDTH   = 300; // px — barre latérale droite
export const TOP_NAV_HEIGHT        = 56;  // px — hauteur de la topbar

// ─── Leads / CRM ─────────────────────────────────────────────────────────────
export const LEAD_SCORE_MIN        = 500;
export const LEAD_SCORE_MAX        = 100_000;
