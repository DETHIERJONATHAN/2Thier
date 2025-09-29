import React, { useEffect, useState, useCallback, useRef } from 'react';
import { message as antdMessage } from 'antd';
import { AuthUser } from './user';
import { AuthOrganization } from './organization';
import { Permission } from './permissions';
import { ModuleAccess } from './modules';
import { AuthContext, type AuthContextType } from './AuthContext';

// Ajouter une déclaration pour Window
declare global {
  interface Window {
    lastModulesFetch?: number;
    __authFetchMeInFlight?: boolean;
    __authLastFetchMeTime?: number;
    __authLoginInFlight?: boolean;
    __authMeCooldownUntil?: number;
    __lastModulesKey?: string; // Ajouté pour le cache des modules
    __googleAutoConnectCooldownUntil?: number; // Cooldown anti-spam auto Google connect
    __googleAutoConnectInFlight?: boolean; // Single-flight auto Google connect
  }
}

type ApiError = Error & {
  status?: number;
  body?: unknown;
  retryAfterMs?: number;
};

const ensureCooldown = (url: string, retryAfterMs?: number) => {
  if (!retryAfterMs) {
    return;
  }
  if (url.includes('/auth/me')) {
    window.__authMeCooldownUntil = Date.now() + retryAfterMs;
  }
};

const parseRetryAfterMs = (response: Response, parsedBody: unknown): number | undefined => {
  const header = response.headers.get('Retry-After');
  if (header) {
    const headerSeconds = Number.parseInt(header, 10);
    if (!Number.isNaN(headerSeconds) && headerSeconds > 0) {
      return headerSeconds * 1000;
    }
  }
  if (parsedBody && typeof parsedBody === 'object') {
    const retryAfter = (parsedBody as { retryAfter?: number; retryAfterMs?: number }).retryAfterMs
      ?? (parsedBody as { retryAfter?: number }).retryAfter;
    if (typeof retryAfter === 'number' && retryAfter > 0) {
      // Le backend renvoie des secondes
      return retryAfter >= 1000 ? retryAfter : retryAfter * 1000;
    }
  }
  return undefined;
};

// Helper API local pour AuthProvider (pas de dépendance au contexte)
const staticApi = {
  get: async (url: string) => {
    // Pour les cookies HTTP-only, on n'a pas besoin de token dans les headers
    // Le navigateur enverra automatiquement les cookies
    const response = await fetch(url.startsWith('/api') ? url : `/api${url}`, { 
      credentials: 'include' // Important: inclure les cookies
    });
    if (!response.ok) {
        let rawText = 'Could not read error response body';
        let parsedBody: unknown = null;
        try {
          rawText = await response.text();
          parsedBody = JSON.parse(rawText);
        } catch {
          parsedBody = rawText;
        }
        const retryAfterMs = response.status === 429 ? parseRetryAfterMs(response, parsedBody) : undefined;
        ensureCooldown(url, retryAfterMs);
        const message =
          (parsedBody && typeof parsedBody === 'object' && 'error' in parsedBody && typeof (parsedBody as { error?: string }).error === 'string')
            ? (parsedBody as { error: string }).error
            : `API call failed: ${response.status}`;
        const error: ApiError = new Error(message);
        error.status = response.status;
        error.body = parsedBody;
        if (retryAfterMs) {
          error.retryAfterMs = retryAfterMs;
        }
        console.error(`[staticApi] GET ${url} failed with status ${response.status}`, parsedBody ?? rawText);
        throw error;
    }
    const text = await response.text();
    try {
        const data = JSON.parse(text);
        
        // 🧹 Vérifier si le serveur demande un nettoyage du cache
        // ⚠️ DÉSACTIVÉ COMPLÈTEMENT pour éviter les déconnexions intempestives
        if (data && data.clearCache === true && data.forceReload === true) {
          console.warn('🧹 [staticApi] Serveur demande nettoyage automatique du cache - IGNORÉ pour éviter les déconnexions');
          // NE PAS FAIRE LE NETTOYAGE AUTOMATIQUE
          // Cette logique causait des déconnexions intempestives
        }
        
        return data;
  } catch {
    console.warn('[staticApi] Response was not valid JSON.', text);
        return text;
    }
  },
  post: async (url: string, body: unknown) => {
    // Pour les cookies HTTP-only, on n'a pas besoin de token dans les headers
    // Le navigateur enverra automatiquement les cookies
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const response = await fetch(url.startsWith('/api') ? url : `/api${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include' // Important: inclure les cookies
    });
    if (!response.ok) {
        let rawText = 'Could not read error response body';
        let parsedBody: unknown = null;
        try {
          rawText = await response.text();
          parsedBody = JSON.parse(rawText);
        } catch {
          parsedBody = rawText;
        }
        const retryAfterMs = response.status === 429 ? parseRetryAfterMs(response, parsedBody) : undefined;
        ensureCooldown(url, retryAfterMs);
        const message =
          (parsedBody && typeof parsedBody === 'object' && 'error' in parsedBody && typeof (parsedBody as { error?: string }).error === 'string')
            ? (parsedBody as { error: string }).error
            : `API call failed: ${response.status}`;
        const error: ApiError = new Error(message);
        error.status = response.status;
        error.body = parsedBody;
        if (retryAfterMs) {
          error.retryAfterMs = retryAfterMs;
        }
        console.error(`[staticApi] POST ${url} failed with status ${response.status}`, parsedBody ?? rawText);
        throw error;
    }
    const text = await response.text();
    try {
        const data = JSON.parse(text);
        // Plus besoin de gérer localStorage pour le token car on utilise les cookies
        return data;
  } catch {
    console.warn('[staticApi] Response was not valid JSON.', text);
        return text;
    }
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [msgApi, msgCtx] = antdMessage.useMessage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [originalUser, setOriginalUser] = useState<AuthUser | null>(null);
  const [organizations, setOrganizations] = useState<AuthOrganization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<AuthOrganization | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [modules, setModules] = useState<ModuleAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === 'super_admin' || originalUser?.role === 'super_admin';
  // Client API léger pour compatibilité (utilise fetch cookies)
  const api = React.useMemo<AuthContextType['api']>(() => {
    const base = async <T = unknown>(method: string, url: string, body?: unknown): Promise<T> => {
      const opts: RequestInit = { method: method.toUpperCase(), credentials: 'include', headers: { 'Content-Type': 'application/json' } };
      if (body !== undefined) opts.body = JSON.stringify(body);
      const resp = await fetch(url.startsWith('/api') ? url : `/api${url}` , opts);
      if (!resp.ok) throw new Error(`API ${method} ${url} failed: ${resp.status}`);
      const text = await resp.text();
      try { return JSON.parse(text) as T; } catch { return text as unknown as T; }
    };
    return {
      get: (u: string) => base('get', u),
      post: (u: string, b: unknown) => base('post', u, b),
      put: (u: string, b: unknown) => base('put', u, b),
      patch: (u: string, b: unknown) => base('patch', u, b),
      delete: (u: string) => base('delete', u)
    };
  }, []);

  // fetchMe renforcé contre les rafales: single-flight + TTL + backoff léger
  const fetchMe = useCallback(async (opts?: { force?: boolean }) => {
    // Debounce: éviter plus d'un appel toutes les 3s sauf force
    const now = Date.now();
    if (!opts?.force && window.__authLastFetchMeTime && (now - window.__authLastFetchMeTime) < 3000) {
      if (window.__authFetchMeInFlight) {
        // Un appel est déjà en cours – on n'empile pas
        return;
      }
      return; // Récupération récente suffisante
    }
    // Cooldown global si le backend a renvoyé un retryAfter important
    if (!opts?.force && window.__authMeCooldownUntil && now < window.__authMeCooldownUntil) {
      console.warn('[AuthProvider] fetchMe ignoré (cooldown actif jusqu\'à', new Date(window.__authMeCooldownUntil).toISOString(), ')');
      return;
    }
    if (window.__authFetchMeInFlight) {
      // Single-flight: un autre composant a déjà déclenché fetchMe
      return;
    }
    window.__authFetchMeInFlight = true;
    window.__authLastFetchMeTime = now;

    setLoading(true);
    let attempt = 0;
    const maxAttempts = 3;
    const baseDelay = 500; // ms
    try {
      let res: unknown | null = null;
      // Backoff simple en cas de 429
      while (attempt < maxAttempts) {
        attempt++;
        try {
          res = await staticApi.get('/auth/me');
          break; // succès
        } catch (err: unknown) {
          const apiError = err as ApiError;
          if (apiError?.status === 429) {
            const retryAfterMs = apiError.retryAfterMs ?? baseDelay * Math.pow(2, attempt - 1);
            const seconds = Math.round(retryAfterMs / 1000);
            console.warn(`[AuthProvider] 429 reçu sur /auth/me – tentative ${attempt}/${maxAttempts}, attente ${retryAfterMs}ms (≈${seconds}s)`);
            if (apiError.retryAfterMs && apiError.retryAfterMs > 30_000) {
              // Cooldown long -> inutile de retenter immédiatement
              throw err;
            }
            await new Promise(r => setTimeout(r, retryAfterMs));
            continue;
          }
          throw err; // autre erreur => on sort
        }
      }
      if (!res) throw new Error('Impossible de récupérer /auth/me après retries');
      console.log('[AuthProvider] /auth/me response:', res);
      if (res && res.currentUser) {
        const { currentUser, originalUser: impersonator } = res;
        setUser(currentUser);

        // Si l'utilisateur est un super-admin (et non en usurpation), on charge TOUTES les organisations.
        // Sinon, on charge uniquement celles auxquelles il appartient.
        if (currentUser.role === 'super_admin' && !impersonator) {
          try {
            const orgsResponse = await staticApi.get('/organizations');
            if (orgsResponse && orgsResponse.success) {
              setOrganizations(orgsResponse.data);
            } else {
              console.error("[AuthProvider] Échec de la récupération des organisations pour le super-admin.");
              setOrganizations(currentUser.organizations || []); // Fallback
            }
          } catch (error) {
            console.error("[AuthProvider] Erreur lors de la récupération des organisations pour le super-admin:", error);
            setOrganizations(currentUser.organizations || []); // Fallback
          }
        } else {
          setOrganizations(currentUser.organizations || []);
        }

        // Définir l'organisation actuelle
        const storedOrgId = localStorage.getItem('organizationId');
        let selectedOrg: AuthOrganization | null = null;

        if (currentUser.role === 'super_admin' && !impersonator) {
          // La liste complète des organisations a été chargée juste avant.
          // Note: `organizations` state might not be updated yet, so we use the fetched data.
          const allOrgs = (await staticApi.get('/organizations')).data || [];
          setOrganizations(allOrgs);

          let orgToSet: AuthOrganization | null = null;

          // 1. Essayer de trouver l'organisation depuis le localStorage
          if (storedOrgId && storedOrgId !== 'all') {
            const foundOrg = allOrgs.find((o: { id: string; }) => o.id === storedOrgId);
            if (foundOrg) {
              console.log('[AuthProvider] Organisation restaurée depuis localStorage:', foundOrg.name);
              orgToSet = { ...foundOrg, role: 'super_admin', permissions: currentUser.permissions || [] };
            }
          }

          // 2. Sinon, essayer de trouver une organisation préférée (2Thier CRM ou similaire)
          if (!orgToSet && allOrgs.length > 0) {
            // Chercher d'abord une organisation avec "2Thier" dans le nom
            const preferredOrg = allOrgs.find((o: { name: string; }) => 
              o.name.toLowerCase().includes('2thier') || 
              o.name.toLowerCase().includes('crm')
            );
            
            if (preferredOrg) {
              console.log('[AuthProvider] Organisation préférée sélectionnée:', preferredOrg.name);
              orgToSet = { ...preferredOrg, role: 'super_admin', permissions: currentUser.permissions || [] };
            } else {
              // Fallback: prendre la première organisation de la liste
              const firstOrg = allOrgs[0];
              orgToSet = { ...firstOrg, role: 'super_admin', permissions: currentUser.permissions || [] };
            }
          }
          
          // 3. Si aucune organisation n'est trouvée, utiliser la Vue Globale
          if (orgToSet) {
            setCurrentOrganization(orgToSet);
            selectedOrg = orgToSet;
            localStorage.setItem('organizationId', orgToSet.id);
          } else {
            const globalOrg: AuthOrganization = {
              id: 'all',
              name: 'Vue Globale',
              status: 'ACTIVE',
              role: 'super_admin',
              permissions: currentUser.permissions || [],
            };
            setCurrentOrganization(globalOrg);
            selectedOrg = globalOrg;
            localStorage.setItem('organizationId', 'all');
          }

        } else if (impersonator) {
          // En cas d'usurpation, l'organisation de la personne usurpée est prioritaire
          const impersonatedOrg = impersonator.currentOrganization || null;
          setCurrentOrganization(impersonatedOrg);
          selectedOrg = impersonatedOrg;
          if (impersonatedOrg) {
            localStorage.setItem('organizationId', impersonatedOrg.id);
          } else {
            localStorage.removeItem('organizationId');
          }
        } else {
          // Pour un utilisateur standard, on utilise son organisation actuelle
          const userOrg = currentUser.currentOrganization || null;
          setCurrentOrganization(userOrg);
          selectedOrg = userOrg;
          if (userOrg) {
            localStorage.setItem('organizationId', userOrg.id);
          } else {
            localStorage.removeItem('organizationId');
          }
        }

        setPermissions(currentUser.permissions || []);
        // 👑 **CORRECTION CRUCIALE** : S'assurer que le rôle 'super_admin' est toujours une permission
        if (currentUser.role === 'super_admin' && !currentUser.permissions.includes('super_admin')) {
          setPermissions(prev => [...prev, 'super_admin']);
        }
        
        if (impersonator) {
          setOriginalUser(impersonator);
        }

        // 🚀 CONNEXION AUTOMATIQUE GOOGLE WORKSPACE après authentification réussie
        if (currentUser.id) {
          const now = Date.now();
          // Cooldown anti-boucle (évite tentatives répétées)
          if (window.__googleAutoConnectCooldownUntil && now < window.__googleAutoConnectCooldownUntil) {
            console.log('[AuthProvider] ⏳ Auto-Google cooldown actif – tentative ignorée');
          } else if (window.__googleAutoConnectInFlight) {
            console.log('[AuthProvider] 🔄 Connexion Google auto déjà en cours – ignoré');
          } else {
            // Vérifier si un callback Google vient juste d'être complété pour cette org
            try {
              const raw = sessionStorage.getItem('google_auth_just_completed');
              if (raw) {
                const info = JSON.parse(raw) as { ts?: number; organizationId?: string | null };
                if (info?.ts && (now - info.ts) < 60_000) {
                  // Si l'org correspond, on évite de relancer l'auto-connect immédiatement
                  const sameOrg = !info.organizationId || info.organizationId === selectedOrg?.id;
                  if (sameOrg) {
                    console.log('[AuthProvider] ✅ Auth Google juste complétée – on saute l\'auto-connect');
                    // Définir un petit cooldown pour absorber les relances
                    window.__googleAutoConnectCooldownUntil = now + 60_000;
                    // Nettoyer le marqueur pour ne pas bloquer indéfiniment
                    setTimeout(() => sessionStorage.removeItem('google_auth_just_completed'), 5000);
                    return; // on ne lance pas la connexion auto
                  }
                }
              }
            } catch {
              // ignore
            }
            console.log('[AuthProvider] 🚀 Tentative de connexion automatique à Google pour:', currentUser.id);
            window.__googleAutoConnectInFlight = true;
            
            // On utilise l'endpoint 'connect' qui nous donnera une réponse directe
            staticApi.post('/auto-google-auth/connect', {
              userId: currentUser.id,
              organizationId: selectedOrg?.id || undefined
            }).then((response: { needsManualAuth?: boolean; authUrl?: string; isConnected?: boolean } ) => { // réponse typée minimalement
              console.log('[AuthProvider] ✅ Réponse de /auto-google-auth/connect:', response);
              
              // Définir un cooldown en fonction du résultat
              if (response.needsManualAuth) {
                // Si une action manuelle est requise, éviter de spammer pendant 60s
                window.__googleAutoConnectCooldownUntil = Date.now() + 60_000;
              } else if (response.isConnected) {
                // Si déjà connecté, retenter au plus tôt dans 15s
                window.__googleAutoConnectCooldownUntil = Date.now() + 15_000;
              } else {
                // Cas divers: petit cooldown par défaut
                window.__googleAutoConnectCooldownUntil = Date.now() + 30_000;
              }

              // Si une authentification manuelle est requise, on redirige l'utilisateur
              if (response.needsManualAuth && response.authUrl) {
                console.log('[AuthProvider] 🔐 Redirection vers Google pour autorisation...');
                msgApi.info("Redirection vers Google pour l'autorisation...", 3);
                // On attend un court instant pour que le message soit visible
                setTimeout(() => {
                  window.location.href = response.authUrl;
                }, 2000);
              } else if (response.isConnected) {
                console.log('[AuthProvider] ✅ Connexion Google déjà active.');
                // On peut optionnellement rafraîchir l'état si nécessaire
              }
            }).catch((error: unknown) => {
              console.warn('[AuthProvider] ❌ Erreur lors de la tentative de connexion automatique Google:', error);
              // En cas d'erreur, mettre un cooldown pour éviter le spam
              window.__googleAutoConnectCooldownUntil = Date.now() + 30_000;
            }).finally(() => {
              // Relâcher le verrou quelques centaines de ms après pour absorber des rafales
              setTimeout(() => { window.__googleAutoConnectInFlight = false; }, 300);
            });
          }
        }
      } else {
        throw new Error('Format de réponse /auth/me invalide');
      }
    } catch (e: unknown) {
      const apiError = e as ApiError;
      if (apiError?.status === 429) {
        const retryAfterMs = apiError.retryAfterMs ?? 60_000;
        window.__authMeCooldownUntil = Date.now() + retryAfterMs;
        const seconds = Math.round(retryAfterMs / 1000);
        console.warn(`[AuthProvider] Cooldown activé suite à un 429: ${seconds}s`);
        msgApi.warning(`Trop de tentatives. Réessayez dans ${seconds > 60 ? `${Math.ceil(seconds / 60)} minutes` : `${seconds} secondes`}.`, seconds > 60 ? 5 : 3);
      }
      console.error("Erreur fetchMe:", e);
      setUser(null);
      setOriginalUser(null);
      setOrganizations([]);
      setCurrentOrganization(null);
      setPermissions([]);
      setModules([]);
      // Plus besoin de localStorage car on utilise les cookies
    } finally {
      setLoading(false);
      window.__authFetchMeInFlight = false;
    }
  }, [msgApi]);

    const login = async (email: string, password: string) => {
      if (window.__authLoginInFlight) {
        console.log('[AuthProvider] Login déjà en cours – appel ignoré');
        return;
      }
      window.__authLoginInFlight = true;
      try {
        await staticApi.post('/auth/login', { email, password });
        // Force un refresh immédiat en ignorant le TTL
        await fetchMe({ force: true });
      } catch (error) {
        const apiError = error as ApiError;
        if (apiError?.status === 429) {
          const retryAfterMs = apiError.retryAfterMs ?? 60_000;
          const seconds = Math.round(retryAfterMs / 1000);
          window.__authMeCooldownUntil = Date.now() + retryAfterMs;
          msgApi.error(`Trop de tentatives de connexion. Patientez ${seconds > 60 ? `${Math.ceil(seconds / 60)} minutes` : `${seconds} secondes`} avant de réessayer.`);
        } else if (apiError?.status === 401) {
          msgApi.error(apiError.message || 'Identifiants invalides.');
        } else {
          msgApi.error(apiError?.message || 'Connexion impossible pour le moment.');
        }
        throw error;
      } finally {
        // On relâche le verrou avec un micro délai pour prévenir les doubles clics rapides
        setTimeout(() => { window.__authLoginInFlight = false; }, 300);
      }
    };

    const logout = () => {
      // Appeler l'API de déconnexion pour nettoyer le cookie côté serveur
      staticApi.post('/logout', {}).catch(err => {
        console.warn('Erreur lors de la déconnexion côté serveur:', err);
      });
      
      // Nettoyage des données d'usurpation d'identité si présentes
      sessionStorage.removeItem('impersonatedUserId');
      sessionStorage.removeItem('impersonatedOrgId');
      
      // 🧹 Nettoyage de l'organisation sélectionnée pour forcer la sélection par défaut au prochain login
      localStorage.removeItem('organizationId');
      
      // Réinitialisation de l'état de l'application
      setUser(null);
      setOriginalUser(null);
      setOrganizations([]);
      setCurrentOrganization(null);
      setPermissions([]);
      setModules([]);
      
      console.log('[AuthProvider] Déconnexion effectuée, toutes les données d\'authentification ont été supprimées');
    };

    const setImpersonation = async (targetUser: AuthUser, organization: AuthOrganization) => {
      try {
          await staticApi.post('/impersonate', { userId: targetUser.id, organizationId: organization.id });
          // Plus besoin de gérer le token manuellement, il est dans les cookies httpOnly
          await fetchMe(); // Refresh all data from the new token
      } catch (error) {
          console.error("Erreur lors de l'usurpation d'identité:", error);
      }
    };

    const clearImpersonation = async () => {
      try {
          await staticApi.post('/impersonate/stop', {});
          // Plus besoin de localStorage.removeItem('token') car on utilise les cookies httpOnly
          // et on se reconnecte avec le token original si disponible
          // Pour l'instant, on force un logout complet pour plus de simplicité
          logout();
          // Idéalement, il faudrait rafraîchir la session de l'admin original
      } catch (error) {
          console.error("Erreur lors de l'arrêt de l'usurpation:", error);
      }
    };

    const selectOrganization = async (organizationId: string | null) => {
      if (user?.role !== 'super_admin') {
        console.warn("selectOrganization n'est pertinent que pour les Super Admins.");
        // Pour les utilisateurs normaux, le changement se fait via l'API et un refresh complet.
        // On pourrait vouloir garder la logique de post ici si nécessaire.
        try {
          await staticApi.post('/users/me/current-organization', { organizationId });
          await fetchMe();
        } catch (error) {
          console.error("Erreur lors du changement d'organisation pour un utilisateur standard:", error);
        }
        return;

  }

      // Logique simplifiée pour le Super Admin
      console.log(`[AuthProvider] SuperAdmin change d'organisation vers : ${organizationId}`);
      
      if (organizationId === 'all' || organizationId === null) {
        const globalOrg: AuthOrganization = {
          id: 'all',
          name: 'Vue Globale',
          status: 'ACTIVE',
          role: 'super_admin',
          permissions: user.permissions || [],
        };
        setCurrentOrganization(globalOrg);
        localStorage.setItem('organizationId', 'all');
      } else {
        const targetOrg = organizations.find(o => o.id === organizationId);
        if (targetOrg) {
          // On met à jour l'état local immédiatement pour une réactivité instantanée
          setCurrentOrganization({
            ...targetOrg,
            role: 'super_admin', // Le rôle ne change pas
            permissions: user.permissions || [] // Les permissions de base du super_admin ne changent pas
          });
          localStorage.setItem('organizationId', organizationId);
        } else {
          console.error(`[AuthProvider] Tentative de sélection d'une organisation non trouvée: ${organizationId}`);
          // Fallback vers la vue globale en cas d'erreur
          const globalOrg: AuthOrganization = {
            id: 'all',
            name: 'Vue Globale',
            status: 'ACTIVE',
            role: 'super_admin',
            permissions: user.permissions || [],
          };
          setCurrentOrganization(globalOrg);
          localStorage.setItem('organizationId', 'all');
        }
      }

      // L'appel API pour persister le choix peut se faire en arrière-plan.
      // Pour l'instant, le localStorage et la mise à jour de l'état suffisent,
      // car les `useEffect` qui dépendent de `currentOrganization` vont se redéclencher.
      // Pas besoin de `fetchMe()` qui recharge tout lourdement.
      // Si le backend a besoin de connaître la dernière organisation consultée, on peut ajouter :
      staticApi.post('/users/me/current-organization', { organizationId }).catch(error => {
        console.warn("Échec de la synchronisation de l'organisation avec le backend:", error);
      });
    };

    // Déduplication logs permissions super-admin
    const loggedPermsRef = React.useRef<Set<string>>(new Set());
    const can = useCallback((permission: string): boolean => {
      if (user?.role === 'super_admin' || originalUser?.role === 'super_admin') {
        if (!loggedPermsRef.current.has(permission)) {
          loggedPermsRef.current.add(permission);
          console.log('[AuthProvider] 👑 SuperAdmin (once) permission auto:', permission);
        }
        return true;
      }
      return permissions.includes(permission as Permission);
    }, [permissions, user, originalUser]);

    const hasInitialFetchRunRef = useRef(false);

    useEffect(() => {
      if (hasInitialFetchRunRef.current) {
        return;
      }
      hasInitialFetchRunRef.current = true;

      // Premier fetch au montage uniquement - avec protection single-flight
      if (window.__authFetchMeInFlight) {
        console.log('[AuthProvider] 🛡️ fetchMe déjà en cours au montage, ignoré');
        return;
      }
      
      console.log('[AuthProvider] 🚀 Premier fetch au montage');
      fetchMe({ force: true }).catch((error) => {
        console.log('[AuthProvider] Aucune session existante trouvée au démarrage:', error);
        setLoading(false);
        window.__authFetchMeInFlight = false;
      });
      
      // Cleanup pour éviter les fuites
      return () => {
        console.log('[AuthProvider] 🧹 Cleanup effect fetchMe');
      };
    }, [fetchMe]);

    // ✨ Ref pour éviter les boucles infinies dans fetchModules
    const fetchModulesRef = useRef<(force?: boolean) => Promise<void>>();

    // ✨ FONCTION POUR LE RECHARGEMENT DES MODULES - Version avec ref pour stabilité
    fetchModulesRef.current = useCallback(async (force = false) => {
      // Protection absolue contre les boucles - vérifier les flags globaux
      const now = Date.now();
      if (!force && window.lastModulesFetch && (now - window.lastModulesFetch) < 3000) {
        console.log('[AuthProvider] 🛡️ Protection anti-boucle: appel ignoré (< 3s)');
        return;
      }
      window.lastModulesFetch = now;
      
      if (!user?.id || !currentOrganization?.id) {
        setModules([]);
        return;
      }
      
      try {
        let fetchedModules = [];
        
        if (currentOrganization.id !== 'all') {
          fetchedModules = await staticApi.get(`/api/modules?organizationId=${currentOrganization.id}`);
        } else if (isSuperAdmin) {
          fetchedModules = await staticApi.get('/modules/all');
        } else {
          fetchedModules = { success: true, data: [] };
        }
        
        const rawModules = fetchedModules && fetchedModules.success && Array.isArray(fetchedModules.data) ? fetchedModules.data : [];
        const activeModules = rawModules.filter((module: ModuleAccess) => {
          const globallyActive = module.active !== false;
          const activeInOrg = module.isActiveForOrg === undefined ? true : module.isActiveForOrg === true;
          return globallyActive && activeInOrg;
        });
        
        const mappedModules = activeModules.map((module: ModuleAccess) => ({
          ...module,
          isActiveInOrg: module.isActiveForOrg !== undefined ? !!module.isActiveForOrg : true,
          active: module.active !== false,
          feature: module.feature || module.key || module.name
        }));
        
        setModules(mappedModules);
      } catch (error) {
        console.error("Erreur lors de la récupération des modules:", error);
        setModules([]);
      }
    }, [user?.id, currentOrganization?.id, isSuperAdmin]);

    // Effect simplifié qui appelle la fonction via ref - SANS BOUCLE INFINIE
    useEffect(() => {
      // Protection anti-boucle supplémentaire avec clé de cache
      const cacheKey = `${user?.id || 'no-user'}-${currentOrganization?.id || 'no-org'}-${isSuperAdmin}`;
      
      if (window.__lastModulesKey === cacheKey) {
        console.log('[AuthProvider] 🛡️ Modules déjà chargés pour cette combinaison, ignoré');
        return;
      }
      
      if (user?.id && currentOrganization?.id && fetchModulesRef.current) {
        console.log('[AuthProvider] 📦 Chargement modules pour:', cacheKey);
        window.__lastModulesKey = cacheKey;
        fetchModulesRef.current();
      } else {
        console.log('[AuthProvider] ⏸️ Pas de user/org pour charger les modules');
      }
    }, [user?.id, currentOrganization?.id, isSuperAdmin]);

    // Fonction publique pour forcer le rechargement
    const refreshModules = useCallback(() => {
      if (fetchModulesRef.current) {
        fetchModulesRef.current(true); // force = true
      }
    }, []);

    // 🔄 Écouter les événements de mise à jour des modules
    useEffect(() => {
      const handleModulesUpdated = (event: CustomEvent) => {
        console.log('[AuthProvider] 🔄 Événement modulesUpdated reçu:', event.detail);
        refreshModules();
      };

      window.addEventListener('modulesUpdated', handleModulesUpdated as EventListener);
      
      return () => {
        window.removeEventListener('modulesUpdated', handleModulesUpdated as EventListener);
      };
    }, [refreshModules]);


    const value = {
      user,
      originalUser,
      organizations,
      currentOrganization,
      permissions,
      modules,
      loading,
      refresh: fetchMe,
      refetchUser: fetchMe,
      refreshModules: refreshModules, // ✨ Nouvelle fonction pour forcer le rechargement des modules
      isSuperAdmin,
      userRole: user?.role || null,
      selectedOrganization: currentOrganization,
      login,
      logout,
      isImpersonating: !!originalUser,
      setImpersonation,
      clearImpersonation,
      can,
      selectOrganization,
      api,
    };

    return (
      <AuthContext.Provider value={value}>
        {msgCtx}
        {children}
      </AuthContext.Provider>
    );
};
