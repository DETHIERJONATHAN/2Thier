import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import type { Team, Technician, ChantierAssignment } from '../types/chantier';

/**
 * Hook pour gérer les équipes, techniciens et assignations chantier
 */
export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);

  // ── Charger équipes ──
  const fetchTeams = useCallback(async () => {
    try {
      const response = await api.get('/api/teams') as { success: boolean; data: Team[] };
      setTeams(response.data || []);
    } catch (err) {
      console.error('[useTeams] Erreur chargement équipes:', err);
    }
  }, [api]);

  // ── Charger techniciens ──
  const fetchTechnicians = useCallback(async () => {
    try {
      const response = await api.get('/api/teams/technicians') as { success: boolean; data: Technician[] };
      setTechnicians(response.data || []);
    } catch (err) {
      console.error('[useTeams] Erreur chargement techniciens:', err);
    }
  }, [api]);

  // ── Chargement initial ──
  const refetch = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchTeams(), fetchTechnicians()]);
    setIsLoading(false);
  }, [fetchTeams, fetchTechnicians]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // ═══ CRUD Équipes ═══

  const createTeam = useCallback(async (data: { name: string; color?: string; description?: string }) => {
    const response = await api.post('/api/teams', data) as { success: boolean; data: Team };
    await fetchTeams();
    return response.data;
  }, [api, fetchTeams]);

  const updateTeam = useCallback(async (teamId: string, data: { name?: string; color?: string; description?: string }) => {
    const response = await api.put(`/api/teams/${teamId}`, data) as { success: boolean; data: Team };
    await fetchTeams();
    return response.data;
  }, [api, fetchTeams]);

  const deleteTeam = useCallback(async (teamId: string) => {
    await api.delete(`/api/teams/${teamId}`);
    await fetchTeams();
  }, [api, fetchTeams]);

  // ═══ CRUD Membres ═══

  const addTeamMember = useCallback(async (teamId: string, userId: string, role: 'LEADER' | 'MEMBER' = 'MEMBER') => {
    await api.post(`/api/teams/${teamId}/members`, { userId, role });
    await Promise.all([fetchTeams(), fetchTechnicians()]);
  }, [api, fetchTeams, fetchTechnicians]);

  const updateMemberRole = useCallback(async (teamId: string, memberId: string, role: 'LEADER' | 'MEMBER') => {
    await api.put(`/api/teams/${teamId}/members/${memberId}`, { role });
    await fetchTeams();
  }, [api, fetchTeams]);

  const removeTeamMember = useCallback(async (teamId: string, memberId: string) => {
    await api.delete(`/api/teams/${teamId}/members/${memberId}`);
    await Promise.all([fetchTeams(), fetchTechnicians()]);
  }, [api, fetchTeams, fetchTechnicians]);

  // ═══ Assignations Chantier ═══

  const assignToChantier = useCallback(async (
    chantierId: string,
    userId: string,
    role: 'CHEF_EQUIPE' | 'TECHNICIEN' = 'TECHNICIEN',
    teamId?: string
  ) => {
    const response = await api.post(`/api/teams/assignments/${chantierId}`, { userId, role, teamId }) as {
      success: boolean;
      data: ChantierAssignment;
    };
    await fetchTechnicians(); // Met à jour les compteurs
    return response.data;
  }, [api, fetchTechnicians]);

  const assignTeamToChantier = useCallback(async (chantierId: string, teamId: string) => {
    const response = await api.post(`/api/teams/assignments/${chantierId}/team`, { teamId }) as {
      success: boolean;
      data: ChantierAssignment[];
      message: string;
    };
    await fetchTechnicians();
    return response;
  }, [api, fetchTechnicians]);

  const removeAssignment = useCallback(async (assignmentId: string) => {
    await api.delete(`/api/teams/assignments/${assignmentId}`);
    await fetchTechnicians();
  }, [api, fetchTechnicians]);

  return {
    teams,
    technicians,
    isLoading,
    refetch,
    // CRUD Teams
    createTeam,
    updateTeam,
    deleteTeam,
    // CRUD Members
    addTeamMember,
    updateMemberRole,
    removeTeamMember,
    // Assignments
    assignToChantier,
    assignTeamToChantier,
    removeAssignment,
  };
}
