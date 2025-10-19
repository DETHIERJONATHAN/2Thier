/**
 * 🗂️ Hook pour récupérer tous les champs d'une soumission TBL
 * 
 * Usage:
 * ```tsx
 * const { fields, lead, loading, error } = useSubmissionFields(submissionId);
 * 
 * // Accéder aux données du lead
 * console.log(lead?.firstName, lead?.lastName, lead?.email);
 * 
 * // Accéder aux champs par nom/label
 * const prenom = fields?.['Prénom']?.value;
 * const email = fields?.['Email']?.value;
 * const telephone = fields?.['Téléphone']?.value;
 * ```
 */

import { useState, useEffect } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';

export interface SubmissionField {
  nodeId: string;
  label: string;
  name?: string;
  type: string;
  fieldType?: string;
  fieldSubType?: string;
  value: any;
  rawValue: string;
}

export interface SubmissionLead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  streetNumber: string | null;
  postalCode: string | null;
  city: string | null;
  company: string | null;
  fullAddress: string;
}

export interface SubmissionFieldsResponse {
  submissionId: string;
  treeId: string;
  treeName?: string;
  leadId: string | null;
  lead: SubmissionLead | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  fields: Record<string, SubmissionField>;
  totalFields: number;
}

export function useSubmissionFields(submissionId: string | null | undefined) {
  const { api } = useAuthenticatedApi();
  const [data, setData] = useState<SubmissionFieldsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!submissionId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`[useSubmissionFields] 🔍 Chargement des champs pour soumission: ${submissionId}`);
        const response = await api.get(`/api/treebranchleaf/submissions/${submissionId}/fields`);
        
        if (cancelled) return;
        
        setData(response as SubmissionFieldsResponse);
        console.log(`[useSubmissionFields] ✅ ${response.totalFields} champs chargés`);
      } catch (err) {
        if (cancelled) return;
        console.error('[useSubmissionFields] ❌ Erreur:', err);
        setError(err as Error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [submissionId, api]);

  return {
    // Données complètes
    data,
    
    // Raccourcis pratiques
    fields: data?.fields || null,
    lead: data?.lead || null,
    submissionId: data?.submissionId,
    treeId: data?.treeId,
    status: data?.status,
    totalFields: data?.totalFields || 0,
    
    // États de chargement
    loading,
    error,
    
    // Helpers
    getField: (key: string) => data?.fields?.[key] || null,
    getFieldValue: (key: string) => data?.fields?.[key]?.value,
    hasField: (key: string) => !!data?.fields?.[key],
  };
}
