import React from 'react';
import OrganizationEmailSettings from '../../components/settings/OrganizationEmailSettings';

/**
 * Page de paramètres des emails pour les administrateurs d'organisation
 * Accessible dans /settings/emails
 */
const EmailSettings: React.FC = () => {
  return (
    <div className="email-settings-page">
      <OrganizationEmailSettings />
    </div>
  );
};

export default EmailSettings;
