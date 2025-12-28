import { useCallback, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import type { WebsiteFormConfig } from '../components/WebsiteFormModal';

interface ModalState {
  visible: boolean;
  loading: boolean;
  config: WebsiteFormConfig | null;
}

const supportedFieldTypes = new Set(['text', 'email', 'phone', 'textarea']);

const pickFirst = (value?: string | string[] | null): string | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

const mapPayloadToConfig = (payload: any): WebsiteFormConfig => {
  const rawFields = Array.isArray(payload?.fields) ? payload.fields : [];

  const fields = rawFields
    .filter((field) => field && supportedFieldTypes.has(field.type))
    .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
    .map((field) => ({
      id: field.name || field.id || field.label || `field_${Math.random().toString(36).slice(2)}`,
      label: field.label || field.name || 'Champ',
      type:
        field.type === 'textarea'
          ? 'textarea'
          : field.type === 'phone'
          ? 'phone'
          : field.type === 'email'
          ? 'email'
          : 'text',
      required: Boolean(field.required),
      placeholder: field.placeholder || undefined
    }));

  const fallbackFields: WebsiteFormConfig['fields'] = fields.length > 0
    ? fields
    : [
        { id: 'firstName', label: 'Prénom', type: 'text', required: true, placeholder: 'Votre prénom' },
        { id: 'lastName', label: 'Nom', type: 'text', required: true, placeholder: 'Votre nom' },
        { id: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Votre email' },
        { id: 'phone', label: 'Téléphone', type: 'phone', required: false, placeholder: 'Votre téléphone' },
        { id: 'projectDescription', label: 'Votre projet', type: 'textarea', required: false, placeholder: 'Décrivez brièvement votre projet' }
      ];

  return {
    id: payload.id,
    title: payload.title || payload.name || 'Demandez votre devis',
    description: payload.description || payload?.campaign?.name || '',
    submitLabel: pickFirst(payload?.styling?.submitLabel) || payload?.styling?.submitLabel || 'Envoyer',
    fields: fallbackFields,
    successMessage: payload?.submissionMessage || 'Merci ! Nous revenons vers vous rapidement.'
  };
};

export const usePublicFormModal = () => {
  const { api } = useAuthenticatedApi();
  const stableApi = useMemo(() => api, [api]);

  const cacheRef = useRef<Record<string, WebsiteFormConfig>>({});
  const configRef = useRef<WebsiteFormConfig | null>(null);

  const [state, setState] = useState<ModalState>({ visible: false, loading: false, config: null });

  const closeModal = useCallback(() => {
    configRef.current = null;
    setState({ visible: false, loading: false, config: null });
  }, []);

  const openFormModal = useCallback(
    async (formId?: string) => {
      if (!formId) {
        message.warning('Aucun formulaire associé à ce bouton.');
        return;
      }

      const cached = cacheRef.current[formId];
      if (cached) {
        configRef.current = cached;
        setState({ visible: true, loading: false, config: cached });
        return;
      }

      setState({ visible: true, loading: true, config: null });

      try {
        const response = await stableApi.get<{ success?: boolean; data?: any }>(
          `/api/public-forms/public/${formId}/config`,
          {
            showErrors: false,
            suppressErrorLogForStatuses: [404]
          }
        );

        const payload = (response as any)?.data ?? response;
        if (!payload) {
          throw new Error('Formulaire introuvable');
        }

        const config = mapPayloadToConfig(payload);
        cacheRef.current[formId] = config;
        configRef.current = config;
        setState({ visible: true, loading: false, config });
      } catch (error) {
        console.error('[usePublicFormModal] Chargement impossible', error);
        message.error("Impossible d\'ouvrir le formulaire pour le moment.");
        configRef.current = null;
        setState({ visible: false, loading: false, config: null });
      }
    },
    [stableApi]
  );

  const submitForm = useCallback(
    async (values: Record<string, any>) => {
      const currentConfig = configRef.current;
      if (!currentConfig) {
        message.error('Formulaire indisponible.');
        return;
      }

      setState((prev) => ({ ...prev, loading: true }));

      try {
        await stableApi.post('/api/public-forms/submit', {
          formId: currentConfig.id,
          privacyConsent: true,
          marketingConsent: values.marketingConsent ?? false,
          ...values
        });

        message.success(currentConfig.successMessage || 'Votre demande a bien été envoyée.');
        configRef.current = null;
        setState({ visible: false, loading: false, config: null });
      } catch (error) {
        console.error('[usePublicFormModal] Soumission impossible', error);
        message.error("Erreur lors de l'envoi du formulaire.");
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [stableApi]
  );

  const modalProps = useMemo(
    () => ({
      visible: state.visible,
      loading: state.loading,
      formConfig: state.config ?? undefined,
      onCancel: closeModal,
      onSubmit: submitForm
    }),
    [state, closeModal, submitForm]
  );

  return {
    openFormModal,
    closeFormModal: closeModal,
    modalProps
  };
};

export type UsePublicFormModalReturn = ReturnType<typeof usePublicFormModal>;

export default usePublicFormModal;
