/**
 * 🔄 REDIRECTION VERS LA COUCHE D'ABSTRACTION DATABASE
 * =====================================================
 * 
 * Ce fichier redirige vers l'instance centralisée dans src/lib/database.ts
 * 
 * ⚠️ POUR LE NOUVEAU CODE, UTILISER:
 * ```typescript
 * import { db } from '@/lib/database';
 * // ou
 * import { db } from './lib/database';
 * ```
 */

import { db } from './lib/database';

export default db;