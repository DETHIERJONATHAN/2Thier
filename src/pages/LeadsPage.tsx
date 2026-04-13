import React from 'react';
import { useLocation } from 'react-router-dom';
import { message } from 'antd';

import { useAuth } from '../auth/useAuth';
import LeadsHomePage from './Leads/LeadsHomePage';
import { logger } from '../lib/logger';

/**
 * Composant principal pour la gestion des leads
 * Configure les routes et effectue les vérifications de permissions
 */
export default function LeadsPage() {
  const [msgApi, msgCtx] = message.useMessage();
  const { can } = useAuth();
  const location = useLocation();

  // 🚨 FORCE CACHE BUST TIMESTAMP: 1758209800000
  logger.debug('[LeadsPage] 🚀 Page chargée, location:', location.pathname);
  logger.debug('[LeadsPage] 🔥 CACHE BUST TIMESTAMP: 1758209800000 - FICHIER RECHARGÉ!');

  // Vérification des permissions
  const canViewLeads = can('leads:read');
  logger.debug('[LeadsPage] 🔐 Permissions canViewLeads:', canViewLeads);

  // DEBUG: Test avant callbacks
  logger.debug('[LeadsPage] 🔍 DEBUG: Avant création callbacks');
  logger.debug('[LeadsPage] 🔍 DEBUG: React.useCallback existe?', typeof React.useCallback);

  // 🔧 CALLBACKS CORRECTEMENT DÉFINIS avec useCallback + LOGS EXHAUSTIFS
  logger.debug('[LeadsPage] 🏗️ DÉBUT CRÉATION DES CALLBACKS avec useCallback...');

  logger.debug('[LeadsPage] 🔍 DEBUG: Avant handleViewLead');
  const handleViewLead = React.useCallback((leadId: string) => {
    logger.debug(`[LeadsPage] 🔍 CALLBACK handleViewLead APPELÉ - TIMESTAMP: ${Date.now()}`);
    logger.debug('[LeadsPage] 🔍 handleViewLead CALLED avec leadId:', leadId);
    logger.debug('[LeadsPage] 🔍 OUVERTURE MODULE DÉTAILS...');
    logger.debug('[LeadsPage] 🔍 📝 ACTION: Redirection vers page détails du lead');
    
    // Rediriger vers la page de détails du lead
    window.location.href = `/leads/details/${leadId}`;
  }, []);

  logger.debug(`[LeadsPage] ✅ handleViewLead CRÉÉ - TIMESTAMP: ${Date.now()}`);

  logger.debug('[LeadsPage] 🔍 DEBUG: Avant handleCallLead');
  const handleCallLead = React.useCallback((leadId: string) => {
    logger.debug(`[LeadsPage] 📞 CALLBACK handleCallLead APPELÉ - TIMESTAMP: ${Date.now()}`);
    logger.debug('[LeadsPage] 📞 handleCallLead CALLED avec leadId:', leadId);
    logger.debug('[LeadsPage] 📞 OUVERTURE MODULE APPEL TELNYX...');
    logger.debug('[LeadsPage] 📞 🎯 ACTION: Déclenchement appel via Telnyx');
    
    // Ici on pourrait déclencher un appel via Telnyx
    msgApi.success(`📞 Module d'appel ouvert pour le lead ${leadId} - Connexion Telnyx...`);
    // Redirection vers le module d'appel
    window.location.href = `/leads/call/${leadId}`;
  }, [msgApi]);

  logger.debug(`[LeadsPage] ✅ handleCallLead CRÉÉ - TIMESTAMP: ${Date.now()}`);

  logger.debug('[LeadsPage] 🔍 DEBUG: Avant handleEmailLead');
  const handleEmailLead = React.useCallback((leadId: string) => {
    logger.debug(`[LeadsPage] 📧 CALLBACK handleEmailLead APPELÉ - TIMESTAMP: ${Date.now()}`);
    logger.debug('[LeadsPage] 📧 handleEmailLead CALLED avec leadId:', leadId);
    logger.debug('[LeadsPage] 📧 OUVERTURE MODULE EMAIL...');
    logger.debug('[LeadsPage] 📧 ✉️ ACTION: Composition email pour le lead');
    
    // Déclencher l'ouverture du module email
    msgApi.success(`📧 Module email ouvert pour le lead ${leadId}`);
    // Redirection vers le module email
    window.location.href = `/leads/email/${leadId}`;
  }, [msgApi]);

  logger.debug(`[LeadsPage] ✅ handleEmailLead CRÉÉ - TIMESTAMP: ${Date.now()}`);

  logger.debug('[LeadsPage] 🔍 DEBUG: Avant handleScheduleLead');
  const handleScheduleLead = React.useCallback((leadId: string) => {
    logger.debug(`[LeadsPage] 📅 CALLBACK handleScheduleLead APPELÉ - TIMESTAMP: ${Date.now()}`);
    logger.debug('[LeadsPage] 📅 handleScheduleLead CALLED avec leadId:', leadId);
    logger.debug('[LeadsPage] 📅 OUVERTURE MODULE CALENDRIER...');
    logger.debug('[LeadsPage] 📅 🗓️ ACTION: Planification RDV pour le lead');
    
    // Déclencher l'ouverture du module calendrier
    msgApi.success(`📅 Module calendrier ouvert pour le lead ${leadId}`);
    // Redirection vers le module calendrier
    window.location.href = `/leads/schedule/${leadId}`;
  }, [msgApi]);

  logger.debug(`[LeadsPage] ✅ handleScheduleLead CRÉÉ - TIMESTAMP: ${Date.now()}`);

  logger.debug('[LeadsPage] 🎯 TOUS LES CALLBACKS CRÉÉS AVEC SUCCÈS!');

  // Si pas les permissions
  if (!canViewLeads) {
    return <div>Accès non autorisé</div>;
  }

  logger.debug('[LeadsPage] 📍 Routing vers:', location.pathname);

  // TEST DIRECT DES CALLBACKS AVANT PASSAGE
  logger.debug('[LeadsPage] 🧪 VALIDATION FINALE DES CALLBACKS:');
  logger.debug('[LeadsPage] 🧪 handleViewLead type:', typeof handleViewLead);
  logger.debug('[LeadsPage] 🧪 handleCallLead type:', typeof handleCallLead);
  logger.debug('[LeadsPage] 🧪 handleEmailLead type:', typeof handleEmailLead);
  logger.debug('[LeadsPage] 🧪 handleScheduleLead type:', typeof handleScheduleLead);

  // 🔧 ROUTES AVEC LOGS DE DEBUG et IIFE pour éviter les conflits de cache
  logger.debug('[LeadsPage] 🏠 Route HOME déclenchée!');
  logger.debug('[LeadsPage] 📊 Route DASHBOARD déclenchée!');
  logger.debug('[LeadsPage] 📋 Route LIST déclenchée!');
  logger.debug('[LeadsPage] 🔧 Route SETTINGS déclenchée!');
  logger.debug('[LeadsPage] ❌ Route CATCH-ALL déclenchée pour:', location.pathname);

  return <>
    {msgCtx}
    <LeadsHomePage 
    onViewLead={handleViewLead}
    onCallLead={handleCallLead}
    onEmailLead={handleEmailLead}
    onScheduleLead={handleScheduleLead}
    refreshTrigger={0}
  />
  </>;
}