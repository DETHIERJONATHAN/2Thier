/**
 * 📘 EXEMPLES D'UTILISATION - Hook useSubmissionFields
 * 
 * Ce fichier montre comment récupérer et utiliser les champs d'une soumission TBL
 */

import React from 'react';
import { useSubmissionFields } from '../hooks/useSubmissionFields';
import { Card, Descriptions, Spin, Alert } from 'antd';

// ============================================
// EXEMPLE 1 : Affichage simple des données Lead
// ============================================
export const LeadInfoDisplay: React.FC<{ submissionId: string }> = ({ submissionId }) => {
  const { lead, loading, error } = useSubmissionFields(submissionId);

  if (loading) return <Spin />;
  if (error) return <Alert type="error" message={error.message} />;
  if (!lead) return <Alert type="warning" message="Aucune donnée lead" />;

  return (
    <Card title="Informations du Lead">
      <Descriptions column={1}>
        <Descriptions.Item label="Nom complet">{lead.fullName}</Descriptions.Item>
        <Descriptions.Item label="Email">{lead.email}</Descriptions.Item>
        <Descriptions.Item label="Téléphone">{lead.phone}</Descriptions.Item>
        <Descriptions.Item label="Adresse">{lead.fullAddress}</Descriptions.Item>
        <Descriptions.Item label="Entreprise">{lead.company}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

// ============================================
// EXEMPLE 2 : Récupération de champs spécifiques
// ============================================
export const SpecificFieldsDisplay: React.FC<{ submissionId: string }> = ({ submissionId }) => {
  const { fields, getFieldValue, loading } = useSubmissionFields(submissionId);

  if (loading) return <Spin />;

  // Méthode 1 : Accès direct via fields
  const prenom = fields?.['Prénom']?.value;
  const nom = fields?.['Nom']?.value;
  const email = fields?.['Email']?.value;

  // Méthode 2 : Utiliser le helper getFieldValue
  const telephone = getFieldValue('Téléphone');
  const rue = getFieldValue('Rue');
  const numero = getFieldValue('Numéro');
  const codePostal = getFieldValue('Code postal');
  const localite = getFieldValue('Localité');

  return (
    <Card title="Données du formulaire">
      <p><strong>Nom :</strong> {prenom} {nom}</p>
      <p><strong>Email :</strong> {email}</p>
      <p><strong>Téléphone :</strong> {telephone}</p>
      <p><strong>Adresse :</strong> {rue} {numero}, {codePostal} {localite}</p>
    </Card>
  );
};

// ============================================
// EXEMPLE 3 : Affichage de TOUS les champs
// ============================================
export const AllFieldsDisplay: React.FC<{ submissionId: string }> = ({ submissionId }) => {
  const { fields, totalFields, loading } = useSubmissionFields(submissionId);

  if (loading) return <Spin />;
  if (!fields) return null;

  return (
    <Card title={`Tous les champs (${totalFields})`}>
      <Descriptions column={1} bordered>
        {Object.entries(fields).map(([key, field]) => (
          <Descriptions.Item key={field.nodeId} label={field.label || key}>
            {typeof field.value === 'object' 
              ? JSON.stringify(field.value) 
              : String(field.value || '-')}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </Card>
  );
};

// ============================================
// EXEMPLE 4 : Utilisation dans un composant métier
// ============================================
export const DevisGenerator: React.FC<{ submissionId: string }> = ({ submissionId }) => {
  const { lead, fields, loading, error } = useSubmissionFields(submissionId);

  if (loading) return <Spin tip="Chargement des données..." />;
  if (error) return <Alert type="error" message="Erreur de chargement" />;

  // Récupérer les données nécessaires
  const clientName = lead?.fullName || 'Client inconnu';
  const clientEmail = lead?.email;
  const clientPhone = lead?.phone;
  const clientAddress = lead?.fullAddress;

  // Récupérer des champs spécifiques du formulaire
  const surfaceHabitable = fields?.['Surface habitable']?.value;
  const typeToiture = fields?.['Type de toiture']?.value;
  const orientationToit = fields?.['Orientation du toit']?.value;

  // Utiliser ces données pour générer un devis
  return (
    <Card title="Génération de devis">
      <h3>Client : {clientName}</h3>
      <p>Email : {clientEmail}</p>
      <p>Téléphone : {clientPhone}</p>
      <p>Adresse : {clientAddress}</p>
      
      <hr />
      
      <h4>Caractéristiques du projet</h4>
      <ul>
        <li>Surface habitable : {surfaceHabitable} m²</li>
        <li>Type de toiture : {typeToiture}</li>
        <li>Orientation : {orientationToit}</li>
      </ul>

      {/* Ici tu peux générer ton PDF, envoyer un email, etc. */}
    </Card>
  );
};

// ============================================
// EXEMPLE 5 : Export vers Excel/CSV
// ============================================
export const ExportSubmissionData: React.FC<{ submissionId: string }> = ({ submissionId }) => {
  const { data, loading } = useSubmissionFields(submissionId);

  const handleExport = () => {
    if (!data) return;

    // Préparer les données pour export
    const exportData = {
      // Données Lead
      'Prénom Lead': data.lead?.firstName,
      'Nom Lead': data.lead?.lastName,
      'Email Lead': data.lead?.email,
      'Téléphone Lead': data.lead?.phone,
      'Adresse Lead': data.lead?.fullAddress,
      
      // Tous les champs du formulaire
      ...Object.entries(data.fields).reduce((acc, [key, field]) => {
        acc[field.label || key] = field.value;
        return acc;
      }, {} as Record<string, any>)
    };

    console.log('Données prêtes pour export:', exportData);
    
    // Ici tu peux utiliser une lib comme xlsx ou csv-export
    // Pour créer un fichier Excel/CSV
  };

  return (
    <button onClick={handleExport} disabled={loading}>
      {loading ? 'Chargement...' : 'Exporter les données'}
    </button>
  );
};

// ============================================
// EXEMPLE 6 : Validation de champs requis
// ============================================
export const useSubmissionValidation = (submissionId: string) => {
  const { fields, hasField } = useSubmissionFields(submissionId);

  const requiredFields = [
    'Prénom',
    'Nom', 
    'Email',
    'Téléphone',
    'Rue',
    'Code postal',
    'Localité'
  ];

  const missingFields = requiredFields.filter(field => !hasField(field));
  const isValid = missingFields.length === 0;

  return {
    isValid,
    missingFields,
    completionRate: ((requiredFields.length - missingFields.length) / requiredFields.length) * 100
  };
};

// ============================================
// EXEMPLE 7 : Appel direct à l'API (sans hook)
// ============================================
export const fetchSubmissionFieldsDirectly = async (submissionId: string, apiClient: any) => {
  try {
    const response = await apiClient.get(`/api/treebranchleaf/submissions/${submissionId}/fields`);
    
    console.log('📋 Soumission:', response.submissionId);
    console.log('👤 Lead:', response.lead?.fullName);
    console.log('🗂️ Champs:', response.totalFields);
    console.log('📝 Données:', response.fields);
    
    // Accéder à un champ spécifique
    const email = response.fields['Email']?.value;
    console.log('📧 Email:', email);
    
    return response;
  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  }
};
