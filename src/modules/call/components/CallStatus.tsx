import React, { useState, useEffect, useCallback } from 'react';
import { Card, Select, Button, Space, message } from 'antd';
import { SaveOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';

// (Réécriture propre : le fichier original était corrompu en haut)
const { Option } = Select;

interface CallStatusProps {
  leadId?: string;
  onCallCompleted?: (callStatus: string, leadStatus: string) => void;
}

interface LeadStatus {
  id: string;
  name: string;
  color: string;
  order: number;
}

export const CallStatus: React.FC<CallStatusProps> = ({ leadId, onCallCompleted }) => {
  const navigate = useNavigate();
  const { api } = useAuthenticatedApi();
  const [callStatus, setCallStatus] = useState('');
  const [leadStatus, setLeadStatus] = useState('');
  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [callStatusOptions, setCallStatusOptions] = useState<{ value: string; label: string; description: string }[]>([]);

  // Statuts d'appels - ces valeurs sont fixes car elles représentent les résultats possibles d'un appel
  // Valeurs par défaut (si API mapping non dispo)
  const FALLBACK_CALL_STATUS_OPTIONS = [
    { value: 'answered', label: '✅ Répondu', description: 'Contact établi avec succès' },
    { value: 'no_answer', label: '📵 Pas de réponse', description: 'Aucune réponse obtenue' },
    { value: 'busy', label: '📞 Occupé', description: 'Ligne occupée' },
    { value: 'voicemail', label: '📧 Répondeur', description: 'Message laissé sur répondeur' },
    { value: 'meeting_scheduled', label: '📅 RDV programmé', description: 'Rendez-vous planifié' },
    { value: 'not_interested', label: '❌ Pas intéressé', description: 'Lead non intéressé' },
    { value: 'callback_requested', label: '🔄 Rappel demandé', description: 'Rappel à programmer' },
    { value: 'invalid_number', label: '⚠️ Numéro invalide', description: 'Numéro incorrect' }
  ];

  // Charger dynamiquement (optionnel) sinon fallback
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await api.get('/api/settings/call-statuses');
        if (!response || !Array.isArray(response)) throw new Error('Format inattendu');
        if (!cancelled) {
          interface ApiStatus { id: string; name: string; description?: string }
          setCallStatusOptions((response as ApiStatus[]).map((s) => ({
            value: s.id,
            label: s.name,
            description: s.description || ''
          })));
        }
      } catch (e) {
        console.warn('[CallStatus] Fallback statuts d\'appel (API indisponible):', e);
        if (!cancelled) setCallStatusOptions(FALLBACK_CALL_STATUS_OPTIONS);
      }
    })();
    return () => { cancelled = true; };
  // FALLBACK_CALL_STATUS_OPTIONS est constant (pas besoin dépendance)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  // Récupérer le statut de lead recommandé depuis l'API
  const getRecommendedLeadStatus = useCallback(async (callStatusValue: string): Promise<string | null> => {
    try {
      const response = await api.get(`/api/settings/call-status-mapping/${callStatusValue}`);
      return response.data?.recommendedStatus || null;
    } catch (error) {
      console.error('❌ [CallStatus] Erreur récupération mapping:', error);
      return null;
    }
  }, [api]);

  // Charger les statuts de leads dynamiquement depuis la base
  useEffect(() => {
    const loadLeadStatuses = async () => {
      try {
        console.log('🔄 [CallStatus] Chargement des statuts de leads...');
        const statuses = await api.get('/api/settings/lead-statuses');
        setLeadStatuses(statuses);
        console.log('✅ [CallStatus] Statuts chargés:', statuses.length);
      } catch (error) {
        console.error('❌ [CallStatus] Erreur chargement statuts:', error);
        message.error('Erreur lors du chargement des statuts');
      }
    };

    loadLeadStatuses();
  }, [api]);

  // Auto-sélection du statut de lead recommandé quand le statut d'appel change
  useEffect(() => {
    const updateRecommendedStatus = async () => {
      if (callStatus) {
        const recommendedStatus = await getRecommendedLeadStatus(callStatus);
        if (recommendedStatus) {
          const matchingStatus = leadStatuses.find(ls => ls.name === recommendedStatus);
          if (matchingStatus) {
            setLeadStatus(matchingStatus.id);
            console.log(`🎯 [CallStatus] Auto-sélection: ${callStatus} → ${recommendedStatus}`);
          }
        }
      }
    };
    updateRecommendedStatus();
  }, [callStatus, leadStatuses, getRecommendedLeadStatus]);

  const handleSave = async () => {
    if (!callStatus) {
      message.error('Veuillez sélectionner un statut d\'appel');
      return;
    }

    if (!leadStatus) {
      message.error('Veuillez sélectionner un statut de lead');
      return;
    }

    setLoading(true);
    
    try {
      console.log('💾 [CallStatus] Sauvegarde:', { callStatus, leadStatus, leadId });
      
      // 1. Sauvegarder l'historique d'appel
      const callHistory = {
        timestamp: new Date().toISOString(),
        status: callStatus,
        duration: 0, // À adapter selon votre logique
        notes: `Appel ${callStatusOptions.find(opt => opt.value === callStatus)?.label}`
      };

      // 2. Mettre à jour le statut du lead
      if (leadId) {
        await api.put(`/api/leads/${leadId}`, {
          statusId: leadStatus,
          lastContactType: 'call',
          lastContact: new Date().toISOString(),
          // Ajouter l'appel à l'historique existant
          callHistory: callHistory
        });
        
        console.log('✅ [CallStatus] Lead mis à jour avec succès');
      }

      // 3. Callback pour notifier le parent
      if (onCallCompleted) {
        const selectedLeadStatus = leadStatuses.find(ls => ls.id === leadStatus);
        onCallCompleted(callStatus, selectedLeadStatus?.name || '');
      }

      message.success('Appel enregistré et lead mis à jour !');
      
      // 4. Navigation conditionnelle
      if (callStatus === 'meeting_scheduled') {
        message.info('Redirection vers l\'agenda pour planifier le RDV...');
        navigate(`/calendar?leadId=${leadId}&action=schedule`);
      } else {
        navigate(`/leads/${leadId}`);
      }
      
    } catch (error) {
      console.error('❌ [CallStatus] Erreur sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleRDV = () => {
    setCallStatus('meeting_scheduled');
    // Le useEffect se chargera de mettre à jour le leadStatus automatiquement
    message.info('RDV sélectionné - Complétez la sauvegarde pour accéder à l\'agenda');
  };

  return (
    <Card title="Clôture d'appel" loading={loading}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Résultat de l'appel *
          </label>
          <Select
            placeholder="Quel a été le résultat de cet appel ?"
            value={callStatus}
            onChange={setCallStatus}
            className="w-full"
            size="large"
          >
            {(callStatusOptions.length ? callStatusOptions : FALLBACK_CALL_STATUS_OPTIONS).map(option => (
              <Option key={option.value} value={option.value}>
                <div>
                  <div>{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Nouveau statut du lead {leadStatus && <span className="text-green-600">✅</span>}
          </label>
          <Select
            placeholder="Choisir le nouveau statut du lead"
            value={leadStatus}
            onChange={setLeadStatus}
            className="w-full"
            size="large"
            disabled={!callStatus}
          >
            {leadStatuses.map(status => (
              <Option key={status.id} value={status.id}>
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: status.color }}
                  />
                  {status.name}
                  {status.id === leadStatus && callStatus && (
                    <span className="ml-2 text-xs text-blue-600">
                      (Recommandé pour "{callStatusOptions.find(c => c.value === callStatus)?.label}")
                    </span>
                  )}
                </div>
              </Option>
            ))}
          </Select>
        </div>

        {callStatus && leadStatus && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Résumé :</strong> Appel "{callStatusOptions.find(opt => opt.value === callStatus)?.label}" 
              → Lead passe en "{leadStatuses.find(ls => ls.id === leadStatus)?.name}"
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <Space size="middle" className="w-full">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              disabled={!callStatus || !leadStatus}
              loading={loading}
              size="large"
            >
              Enregistrer l'appel
            </Button>
            
            <Button
              icon={<CalendarOutlined />}
              onClick={handleScheduleRDV}
              disabled={loading}
              size="large"
              type={callStatus === 'meeting_scheduled' ? 'primary' : 'default'}
            >
              {callStatus === 'meeting_scheduled' ? 'RDV sélectionné ✅' : 'RDV à programmer'}
            </Button>
          </Space>
        </div>

        {!callStatus && (
          <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded">
            ⚠️ Sélectionnez d'abord le résultat de l'appel
          </div>
        )}

        {callStatus && !leadStatus && (
          <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded">
            ⚠️ Choisissez le nouveau statut pour le lead
          </div>
        )}
      </div>
    </Card>
  );
};
