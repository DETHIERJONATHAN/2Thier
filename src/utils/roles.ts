// Utilitaire unique pour la détection du super_admin
export function isSuperAdmin(role: string | undefined | null): boolean {
  return role === 'super_admin';
}
