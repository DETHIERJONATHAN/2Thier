/**
 * ============================================================================
 * 🐝 SYSTÈME D'IDENTITÉ CENTRALISÉ — ActiveIdentityContext
 * ============================================================================
 *
 * CE FICHIER EST LE POINT CENTRAL D'IDENTITÉ DE TOUTE LA RUCHE (Zhiive).
 *
 * PROBLÈME RÉSOLU :
 * Avant, chaque composant (Wall, Reels, Stories, Universe, Explore) calculait
 * localement `isOrgMode = feedMode === 'org' && !!currentOrganization` et
 * déterminait indépendamment l'avatar, le nom, et le flag `publishAsOrg`.
 * Résultat : incohérences, bugs (posts attribués au personnel au lieu de l'org),
 * et du code dupliqué partout.
 *
 * SOLUTION :
 * Ce contexte centralise la notion de "QUI poste" en un seul endroit.
 * Tous les composants Zhiive utilisent `useActiveIdentity()` pour savoir :
 *   - `isOrgMode`    : est-ce qu'on agit au nom de l'organisation ?
 *   - `publishAsOrg` : valeur à envoyer dans chaque requête API
 *   - `displayName`  : nom à afficher (org ou user)
 *   - `avatarUrl`    : avatar à afficher (logo org ou photo user)
 *   - `avatarFallback` : initiale de fallback
 *   - `avatarBgColor` : couleur de fond si pas d'avatar
 *
 * UTILISATION :
 *   import { useActiveIdentity } from '@/contexts/ActiveIdentityContext';
 *
 *   const { isOrgMode, publishAsOrg, displayName, avatarUrl } = useActiveIdentity();
 *
 *   // Dans un appel API :
 *   await api.post('/api/wall/posts', {
 *     content,
 *     publishAsOrg,      // ← déjà calculé correctement
 *   });
 *
 *   // Pour afficher l'avatar :
 *   <Avatar src={avatarUrl}>{avatarFallback}</Avatar>
 *
 * RÈGLE D'OR :
 *   NE JAMAIS recalculer `feedMode === 'org' && !!currentOrganization` localement.
 *   TOUJOURS utiliser `useActiveIdentity()`.
 *
 * ============================================================================
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useZhiiveNav } from './ZhiiveNavContext';
import { useAuth } from '../auth/useAuth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveIdentityType {
  /**
   * true = l'utilisateur agit au nom de son organisation.
   * false = l'utilisateur agit en son nom personnel.
   * Déterminé par feedMode === 'org' ET l'utilisateur a une organisation sélectionnée.
   */
  isOrgMode: boolean;

  /**
   * Valeur prête à envoyer dans les requêtes API pour les posts/stories/reels/etc.
   * - `true`      quand on publie en tant qu'organisation
   * - `undefined` quand on publie en tant que personnel (le backend defaulte à false)
   */
  publishAsOrg: true | undefined;

  /** Nom à afficher : nom de l'org si isOrgMode, sinon prénom nom de l'utilisateur */
  displayName: string;

  /** URL de l'avatar (logo org ou photo user). Peut être undefined/null. */
  avatarUrl: string | undefined;

  /** Initiale de fallback si pas d'avatar */
  avatarFallback: string;

  /** Couleur de fond de l'avatar si pas d'image */
  avatarBgColor: string;

  /** L'organisation courante (null si pas d'org) */
  organization: { id: string; name: string; logoUrl?: string | null } | null;

  /** L'utilisateur connecté */
  user: { id: string; firstName?: string; lastName?: string; avatarUrl?: string } | null;
}

// ---------------------------------------------------------------------------
// Couleurs constantes
// ---------------------------------------------------------------------------

/** Violet pour l'organisation */
import { SF } from '../components/zhiive/ZhiiveTheme';
const ORG_COLOR = SF.primary;
/** Bleu pour le personnel */
const PERSONAL_COLOR = '#1890ff';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ActiveIdentityContext = createContext<ActiveIdentityType>({
  isOrgMode: false,
  publishAsOrg: undefined,
  displayName: '',
  avatarUrl: undefined,
  avatarFallback: '?',
  avatarBgColor: PERSONAL_COLOR,
  organization: null,
  user: null,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const ActiveIdentityProvider = ({ children }: { children: ReactNode }) => {
  const { feedMode } = useZhiiveNav();
  const { user, currentOrganization } = useAuth();

  const value = useMemo<ActiveIdentityType>(() => {
    const org = currentOrganization as { id: string; name: string; logoUrl?: string | null } | null;
    const isOrgMode = feedMode === 'org' && !!org;

    const orgLogo = org?.logoUrl || undefined;
    const userAvatar = user?.avatarUrl || undefined;

    return {
      isOrgMode,
      publishAsOrg: isOrgMode ? true : undefined,
      displayName: isOrgMode
        ? (org?.name || 'Organisation')
        : [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Utilisateur',
      avatarUrl: isOrgMode ? orgLogo : userAvatar,
      avatarFallback: isOrgMode
        ? (org?.name?.[0]?.toUpperCase() || 'O')
        : (user?.firstName?.[0]?.toUpperCase() || '?'),
      avatarBgColor: isOrgMode ? ORG_COLOR : PERSONAL_COLOR,
      organization: org,
      user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl } : null,
    };
  }, [feedMode, currentOrganization, user]);

  return (
    <ActiveIdentityContext.Provider value={value}>
      {children}
    </ActiveIdentityContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * 🐝 Hook centralisé d'identité active.
 *
 * Utiliser ce hook dans TOUS les composants Zhiive pour savoir
 * "qui est en train d'agir" (organisation ou personnel).
 *
 * NE JAMAIS recalculer `feedMode === 'org' && !!currentOrganization` manuellement.
 */
export const useActiveIdentity = (): ActiveIdentityType => {
  return useContext(ActiveIdentityContext);
};
