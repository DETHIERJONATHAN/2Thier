import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { AuthUser } from './user';
import { AuthOrganization } from './organization';
import { Permission } from './permissions';
import { RoleName } from './role';
import { ModuleAccess } from './modules';

// Ajouter une déclaration pour Window
declare global {
  interface Window {
    lastModulesFetch?: number;
  }
}

export interface AuthContextType {
  user: AuthUser | null;
  originalUser: AuthUser | null; // Ajouté pour l'usurpation
  organizations: AuthOrganization[];
  currentOrganization: AuthOrganization | null;
  permissions: Permission[];
  modules: ModuleAccess[];
  loading: boolean;
  refresh: () => Promise<void>;
  refetchUser: () => Promise<void>;
  refreshModules: () => Promise<void>; // Ajouté pour forcer le rechargement des modules
  isSuperAdmin: boolean;
  userRole: RoleName | null;
  selectedOrganization: AuthOrganization | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void; // Ajouté
  isImpersonating: boolean;
  setImpersonation: (user: AuthUser, organization: AuthOrganization) => void; // Ajouté
  clearImpersonation: () => void; // Ajouté
  can: (permission: string) => boolean; // Ajouté
  selectOrganization: (organizationId: string | null) => Promise<void>;
  // Expose un petit client API (legacy usages dans quelques pages)
  api: {
  get: <T = unknown>(url: string) => Promise<T>;
  post: <T = unknown, B = unknown>(url: string, body: B) => Promise<T>;
  put: <T = unknown, B = unknown>(url: string, body: B) => Promise<T>;
  patch: <T = unknown, B = unknown>(url: string, body: B) => Promise<T>;
  delete: <T = unknown>(url: string) => Promise<T>;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper API local pour AuthProvider (pas de dépendance au contexte)
const staticApi = {
  get: async (url: string) => {
    // Pour les cookies HTTP-only, on n'a pas besoin de token dans les headers
    // Le navigateur enverra automatiquement les cookies
    const response = await fetch(url.startsWith('/api') ? url : `/api${url}`, { 
      credentials: 'include' // Important: inclure les cookies
    });
    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response body');
        console.error(`[staticApi] GET ${url} failed with status ${response.status}`, errorText);
        throw new Error(`API call failed: ${response.status}`);
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
    } catch (e) {
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
        const errorText = await response.text().catch(() => 'Could not read error response body');
        console.error(`[staticApi] POST ${url} failed with status ${response.status}`, errorText);
        throw new Error(`API call failed: ${response.status}`);
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

  const fetchMe = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staticApi.get('/auth/me');
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
          console.log('[AuthProvider] 🚀 Tentative de connexion automatique à Google pour:', currentUser.id);
          
          // On utilise l'endpoint 'connect' qui nous donnera une réponse directe
          staticApi.post('/auto-google-auth/connect', {
            userId: currentUser.id,
            organizationId: selectedOrg?.id || undefined
          }).then((response: any) => {
            console.log('[AuthProvider] ✅ Réponse de /auto-google-auth/connect:', response);
            
            // Si une authentification manuelle est requise, on redirige l'utilisateur
            if (response.needsManualAuth && response.authUrl) {
              console.log('[AuthProvider] 🔐 Redirection vers Google pour autorisation...');
              message.info("Redirection vers Google pour l'autorisation...", 3);
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
          });
        }
      } else {
        throw new Error('Format de réponse /auth/me invalide');
      }
    } catch (e) {
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
    }
  }, []);

    const login = async (email: string, password: string) => {
      await staticApi.post('/auth/login', { email, password });
      await fetchMe();
    };

    const logout = () => {
      // 🔄 DÉCONNEXION GOOGLE WORKSPACE lors du logout
      if (user?.id) {
        staticApi.post('/auto-google-auth/trigger-logout', {
          userId: user.id
        }).catch((error: unknown) => {
          console.warn('[AuthProvider] Erreur nettoyage session Google:', error);
        });
      }

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

    const can = useCallback((permission: string): boolean => {
      // 👑 CORRECTION: Utiliser la même logique que isSuperAdmin pour être cohérent !
      if (user?.role === 'super_admin' || originalUser?.role === 'super_admin') {
        console.log('[AuthProvider] 👑 SuperAdmin détecté - Permission accordée automatiquement:', permission);
        return true;
      }
      return permissions.some(p => p === permission);
    }, [permissions, user, originalUser]);

    useEffect(() => {
      // Vérifier au démarrage si l'utilisateur est déjà connecté via les cookies
      // Cela permet de restaurer la session lors du rechargement de la page
      fetchMe().catch(() => {
        // Si la vérification échoue, ce n'est pas grave - l'utilisateur devra se connecter
        console.log('[AuthProvider] Aucune session existante trouvée au démarrage');
        setLoading(false);
      });
    }, [fetchMe]);

    // ✨ FONCTION POUR FORCER LE RECHARGEMENT DES MODULES
    const fetchModules = useCallback(async () => {
      if (!user) {
        setModules([]);
        return;
      }
      
      // 🛡️ ATTENDRE QUE L'ORGANISATION SOIT DÉFINIE
      if (!currentOrganization) {
        console.log('[AuthProvider] ⏳ En attente de la définition de l\'organisation...');
        setModules([]);
        return;
      }
      
      // 🛡️ PROTECTION CONTRE LES BOUCLES INFINIES - Debounce et cache
      const now = Date.now();
      
      // Éviter les appels multiples rapprochés (debounce de 500ms)
      if (window.lastModulesFetch && (now - window.lastModulesFetch) < 500) {
        console.log('[AuthProvider] 🛡️ Protection anti-boucle: appel ignoré');
        return;
      }
      window.lastModulesFetch = now;
      
      try {
        let fetchedModules = [];
        
        // 🏗️ CORRECTION CRUCIALE : Charger les modules pour l'organisation actuelle
        if (currentOrganization?.id && currentOrganization.id !== 'all') {
          console.log(`[AuthProvider] 📋 Chargement des modules pour l'organisation ${currentOrganization.name} (${currentOrganization.id})...`);
          fetchedModules = await staticApi.get(`/modules?organizationId=${currentOrganization.id}`);
        } else if (isSuperAdmin) {
          console.log('[AuthProvider] 👑 Vue globale super-admin - chargement de TOUS les modules');
          // Endpoint aligné sur ModulesAdminPage
          fetchedModules = await staticApi.get('/modules/all');
        } else {
          console.log('[AuthProvider] 🌐 Vue globale sans super-admin - modules vides');
          fetchedModules = { success: true, data: [] };
        }
        
        console.log('[AuthProvider] 📊 Réponse modules reçue:', fetchedModules);
        
        // S'assurer de toujours définir un tableau et filtrer les modules actifs pour la sidebar
        const rawModules = fetchedModules && fetchedModules.success && Array.isArray(fetchedModules.data) ? fetchedModules.data : [];
        
        console.log('[AuthProvider] 🔍 Modules bruts avant filtrage:', rawModules.map(m => ({
          name: m.name || m.label,
          key: m.key,
          isActiveForOrg: m.isActiveForOrg,
          type: m.type
        })));
        
        // 🔍 DEBUG SPÉCIAL GMAIL - Rechercher le module Gmail spécifiquement
        const gmailModule = rawModules.find((m: ModuleAccess) => 
          (m.key && m.key.toLowerCase().includes('gmail')) || 
          (m.name && m.name.toLowerCase().includes('gmail')) ||
          (m.label && m.label.toLowerCase().includes('gmail'))
        );
        
        if (gmailModule) {
          console.log('[AuthProvider] 🎯 MODULE GMAIL TROUVÉ dans les modules bruts:', {
            name: gmailModule.name,
            label: gmailModule.label,
            key: gmailModule.key,
            isActiveForOrg: gmailModule.isActiveForOrg,
            isActiveInOrg: gmailModule.isActiveInOrg,
            type: gmailModule.type,
            feature: gmailModule.feature,
            icon: gmailModule.icon,
            path: gmailModule.path,
            description: gmailModule.description,
            organizationId: currentOrganization?.id
          });
        } else {
          console.log('[AuthProvider] ❌ AUCUN MODULE GMAIL trouvé dans les modules bruts pour l\'organisation:', currentOrganization?.id);
          console.log('[AuthProvider] 📋 Liste complète des modules reçus:', rawModules.map(m => ({
            name: m.name,
            label: m.label,
            key: m.key,
            type: m.type
          })));
        }
        
        // 🎯 FILTRAGE ASSOUPLI :
        // Objectif immédiat = ne plus masquer les modules si le backend ne renvoie pas encore isActiveForOrg.
        // Règle :
        //  - active (global) : si absent → considéré comme true
        //  - isActiveForOrg : si absent → considéré comme true (on montre le module)
        //  - si présent et false → masqué
  const activeModules = rawModules.filter((module: ModuleAccess) => {
          const globallyActive = module.active !== false; // undefined => true
          const inOrgFlag = module.isActiveForOrg;
            // undefined => true (fallback permissif pour restaurer l'UI)
          const activeInOrg = inOrgFlag === undefined ? true : inOrgFlag === true;
          return globallyActive && activeInOrg;
        });
        
        // 🔍 DEBUG SPÉCIAL GMAIL - Vérifier si Gmail est dans les modules actifs
        const gmailModuleActive = activeModules.find((m: ModuleAccess) => 
          (m.key && m.key.toLowerCase().includes('gmail')) || 
          (m.name && m.name.toLowerCase().includes('gmail')) ||
          (m.label && m.label.toLowerCase().includes('gmail'))
        );
        
        if (gmailModuleActive) {
          console.log('[AuthProvider] ✅ MODULE GMAIL ACTIF après filtrage:', {
            name: gmailModuleActive.name,
            label: gmailModuleActive.label,
            key: gmailModuleActive.key,
            isActiveForOrg: gmailModuleActive.isActiveForOrg
          });
        } else {
          console.log('[AuthProvider] ❌ MODULE GMAIL EXCLU par le filtrage isActiveForOrg');
          console.log('[AuthProvider] 📋 Modules actifs après filtrage:', activeModules.map(m => ({
            name: m.name || m.label,
            key: m.key,
            isActiveForOrg: m.isActiveForOrg
          })));
        }
        
        console.log('[AuthProvider] ✅ Modules actifs pour la sidebar:', activeModules.map(m => ({
          name: m.name || m.label,
          key: m.key,
          isActiveForOrg: m.isActiveForOrg
        })));
        
  const mappedModules = activeModules.map((module: ModuleAccess) => ({
          ...module,
          // Normalisation : assurer un booléen explicite pour l'UI
          isActiveInOrg: module.isActiveForOrg !== undefined
            ? !!module.isActiveForOrg
            : (module.isActiveInOrg !== undefined ? !!module.isActiveInOrg : true),
          active: module.active !== false, // fallback true
          feature: module.feature || module.key || module.name
        }));
        
        // 🔍 DEBUG SPÉCIAL GMAIL - Vérifier la feature
        const gmailModuleFinal = mappedModules.find((m: ModuleAccess) => 
          (m.key && m.key.toLowerCase().includes('gmail')) || 
          (m.name && m.name.toLowerCase().includes('gmail')) ||
          (m.label && m.label.toLowerCase().includes('gmail'))
        );
        
        if (gmailModuleFinal) {
          console.log('[AuthProvider] 🎯 MODULE GMAIL FINAL avec feature:', {
            name: gmailModuleFinal.name,
            label: gmailModuleFinal.label,
            key: gmailModuleFinal.key,
            feature: gmailModuleFinal.feature,
            featureOriginal: activeModules.find(m => m.key === gmailModuleFinal.key)?.feature
          });
        }
        
        console.log('[AuthProvider] 🎨 Modules mappés pour la sidebar (FINAL):', mappedModules.map(m => ({
          name: m.name || m.label,
          key: m.key,
          isActiveInOrg: m.isActiveInOrg
        })));
        
        setModules(mappedModules);

      } catch (error) {
        console.error("Erreur lors de la récupération des modules:", error);
        setModules([]);
      }
  }, [user, currentOrganization, isSuperAdmin]); // 🔧 Ajout isSuperAdmin pour cohérence

    useEffect(() => {
      fetchModules();
    }, [fetchModules]);


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
      refreshModules: fetchModules, // ✨ Nouvelle fonction pour forcer le rechargement des modules
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

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// Fin du fichier
