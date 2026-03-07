import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import type { Team, Technician, ChantierAssignment, TechnicianType } from '../types/chantier';

/**
 * Hook complet pour techniciens, équipes, assignations et indisponibilités
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

  // ── Charger techniciens (enrichis) ──
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

  // ═══ CRUD Techniciens ═══

  const createTechnician = useCallback(async (data: {
    type: TechnicianType;
    userId?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    company?: string;
    specialties?: string[];
    hourlyRate?: number;
    notes?: string;
    color?: string;
  }) => {
    const response = await api.post('/api/teams/technicians', data) as { success: boolean; data: Technician };
    await fetchTechnicians();
    return response.data;
  }, [api, fetchTechnicians]);

  const updateTechnician = useCallback(async (techId: string, data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    specialties: string[];
    hourlyRate: number;
    notes: string;
    color: string;
    isActive: boolean;
  }>) => {
    const response = await api.put(`/api/teams/technicians/${techId}`, data) as { success: boolean; data: Technician };
    await fetchTechnicians();
    return response.data;
  }, [api, fetchTechnicians]);

  const deleteTechnician = useCallback(async (techId: string) => {
    await api.delete(`/api/teams/technicians/${techId}`);
    await fetchTechnicians();
  }, [api, fetchTechnicians]);

  const syncTechnicians = useCallback(async () => {
    const response = await api.post('/api/teams/technicians/sync', {}) as {
      success: boolean;
      message: string;
      data: { created: number; total: number };
    };
    await fetchTechnicians();
    return response;
  }, [api, fetchTechnicians]);

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

  const addTeamMember = useCallback(async (teamId: string, technicianId: string, role: 'LEADER' | 'MEMBER' = 'MEMBER') => {
    await api.post(`/api/teams/${teamId}/members`, { technicianId, role });
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
    technicianId: string,
    role: 'CHEF_EQUIPE' | 'TECHNICIEN' = 'TECHNICIEN',
    teamId?: string
  ) => {
    const response = await api.post(`/api/teams/assignments/${chantierId}`, { technicianId, role, teamId }) as {
      success: boolean;
      data: ChantierAssignment;
    };
    await fetchTechnicians();
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

  // ═══ Indisponibilités ═══

  const addUnavailability = useCallback(async (data: {
    technicianId: string;
    startDate: string;
    endDate: string;
    type?: 'CONGE' | 'FORMATION' | 'MALADIE' | 'AUTRE';
    allDay?: boolean;
    note?: string;
  }) => {
    const response = await api.post('/api/teams/unavailabilities', data);
    await fetchTechnicians();
    return response;
  }, [api, fetchTechnicians]);

  const removeUnavailability = useCallback(async (id: string) => {
    await api.delete(`/api/teams/unavailabilities/${id}`);
    await fetchTechnicians();
  }, [api, fetchTechnicians]);

  return {
    teams,
    technicians,
    isLoading,
    refetch,
    // CRUD Technicians
    createTechnician,
    updateTechnician,
    deleteTechnician,
    syncTechnicians,
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
    // Unavailabilities
    addUnavailability,
    removeUnavailability,
  };
}
