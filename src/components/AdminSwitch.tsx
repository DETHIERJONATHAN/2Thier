import React, { useState, useCallback } from 'react';
import { Switch, message } from 'antd';
import { useEmailService } from '../services/EmailService'; // CORRECTION: Importer le hook
import { User } from '../types';

interface AdminSwitchProps {
  user: User;
  serviceType: 'email' | 'telnyx';
  initialStatus: boolean;
  onStatusChange: () => void; // Callback pour rafraîchir la liste parente
}

const AdminSwitch: React.FC<AdminSwitchProps> = ({
  user,
  serviceType,
  initialStatus,
  onStatusChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [isChecked, setIsChecked] = useState(initialStatus);
  
  // CORRECTION: Utiliser le hook pour accéder aux fonctions
  const { createEmailAddress } = useEmailService();

  const handleToggle = useCallback(async (checked: boolean) => {
    setLoading(true);
    try {
      if (serviceType === 'email') {
        if (checked) {
          const emailPrefix = `${user.firstName}.${user.lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, '');
          await createEmailAddress(user.id, emailPrefix);
          message.success('Service email activé.');
        } else {
          // TODO: Implémenter la logique de désactivation
          message.info("La désactivation de l'email n'est pas encore implémentée.");
          // On ne change pas l'état visuel si l'action n'est pas faite
          setLoading(false);
          return; 
        }
      } else {
        message.info('La gestion de ce service n\'est pas encore implémentée.');
        setLoading(false);
        return;
      }
      
      setIsChecked(checked);
      onStatusChange(); // Notifier le parent du changement
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
      message.error(`Erreur: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [user, serviceType, createEmailAddress, onStatusChange]);

  return <Switch checked={isChecked} loading={loading} onChange={handleToggle} />;
};

export default AdminSwitch;