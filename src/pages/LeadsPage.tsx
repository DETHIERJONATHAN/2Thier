import React from 'react';
import { useLocation } from 'react-router-dom';
import { message } from 'antd';

import { useAuth } from '../auth/useAuth';
import LeadsHomePage from './Leads/LeadsHomePage';

/**
 * Composant principal pour la gestion des leads
 * Configure les routes et effectue les vérifications de permissions
 */
export default function LeadsPage() {
  const [msgApi, msgCtx] = message.useMessage();
  const { can } = useAuth();
  const location = useLocation();

  // 🚨 FORCE CACHE BUST TIMESTAMP: 1758209800000
  console.log('[LeadsPage] 🚀 Page chargée, location:', location.pathname);
  console.log('[LeadsPage] 🔥 CACHE BUST TIMESTAMP: 1758209800000 - FICHIER RECHARGÉ!');

  // Vérification des permissions
  const canViewLeads = can('leads:read');
  console.log('[LeadsPage] 🔐 Permissions canViewLeads:', canViewLeads);

  // DEBUG: Test avant callbacks
  console.log('[LeadsPage] 🔍 DEBUG: Avant création callbacks');
  console.log('[LeadsPage] 🔍 DEBUG: React.useCallback existe?', typeof React.useCallback);

  // 🔧 CALLBACKS CORRECTEMENT DÉFINIS avec useCallback + LOGS EXHAUSTIFS
  console.log('[LeadsPage] 🏗️ DÉBUT CRÉATION DES CALLBACKS avec useCallback...');

  console.log('[LeadsPage] 🔍 DEBUG: Avant handleViewLead');
  const handleViewLead = React.useCallback((leadId: string) => {
    console.log(`[LeadsPage] 🔍 CALLBACK handleViewLead APPELÉ - TIMESTAMP: ${Date.now()}`);
    console.log('[LeadsPage] 🔍 handleViewLead CALLED avec leadId:', leadId);
    console.log('[LeadsPage] 🔍 OUVERTURE MODULE DÉTAILS...');
    console.log('[LeadsPage] 🔍 📝 ACTION: Redirection vers page détails du lead');
    
    // Rediriger vers la page de détails du lead
    window.location.href = `/leads/details/${leadId}`;
  }, []);

  console.log(`[LeadsPage] ✅ handleViewLead CRÉÉ - TIMESTAMP: ${Date.now()}`);

  console.log('[LeadsPage] 🔍 DEBUG: Avant handleCallLead');
  const handleCallLead = React.useCallback((leadId: string) => {
    console.log(`[LeadsPage] 📞 CALLBACK handleCallLead APPELÉ - TIMESTAMP: ${Date.now()}`);
    console.log('[LeadsPage] 📞 handleCallLead CALLED avec leadId:', leadId);
    console.log('[LeadsPage] 📞 OUVERTURE MODULE APPEL TELNYX...');
    console.log('[LeadsPage] 📞 🎯 ACTION: Déclenchement appel via Telnyx');
    
    // Ici on pourrait déclencher un appel via Telnyx
    msgApi.success(`📞 Module d'appel ouvert pour le lead ${leadId} - Connexion Telnyx...`);
    // Redirection vers le module d'appel
    window.location.href = `/leads/call/${leadId}`;
  }, [msgApi]);

  console.log(`[LeadsPage] ✅ handleCallLead CRÉÉ - TIMESTAMP: ${Date.now()}`);

  console.log('[LeadsPage] 🔍 DEBUG: Avant handleEmailLead');
  const handleEmailLead = React.useCallback((leadId: string) => {
    console.log(`[LeadsPage] 📧 CALLBACK handleEmailLead APPELÉ - TIMESTAMP: ${Date.now()}`);
    console.log('[LeadsPage] 📧 handleEmailLead CALLED avec leadId:', leadId);
    console.log('[LeadsPage] 📧 OUVERTURE MODULE EMAIL...');
    console.log('[LeadsPage] 📧 ✉️ ACTION: Composition email pour le lead');
    
    // Déclencher l'ouverture du module email
    msgApi.success(`📧 Module email ouvert pour le lead ${leadId}`);
    // Redirection vers le module email
    window.location.href = `/leads/email/${leadId}`;
  }, [msgApi]);

  console.log(`[LeadsPage] ✅ handleEmailLead CRÉÉ - TIMESTAMP: ${Date.now()}`);

  console.log('[LeadsPage] 🔍 DEBUG: Avant handleScheduleLead');
  const handleScheduleLead = React.useCallback((leadId: string) => {
    console.log(`[LeadsPage] 📅 CALLBACK handleScheduleLead APPELÉ - TIMESTAMP: ${Date.now()}`);
    console.log('[LeadsPage] 📅 handleScheduleLead CALLED avec leadId:', leadId);
    console.log('[LeadsPage] 📅 OUVERTURE MODULE CALENDRIER...');
    console.log('[LeadsPage] 📅 🗓️ ACTION: Planification RDV pour le lead');
    
    // Déclencher l'ouverture du module calendrier
    msgApi.success(`📅 Module calendrier ouvert pour le lead ${leadId}`);
    // Redirection vers le module calendrier
    window.location.href = `/leads/schedule/${leadId}`;
  }, [msgApi]);

  console.log(`[LeadsPage] ✅ handleScheduleLead CRÉÉ - TIMESTAMP: ${Date.now()}`);

  console.log('[LeadsPage] 🎯 TOUS LES CALLBACKS CRÉÉS AVEC SUCCÈS!');

  // Si pas les permissions
  if (!canViewLeads) {
    return <div>Accès non autorisé</div>;
  }

  console.log('[LeadsPage] 📍 Routing vers:', location.pathname);

  // TEST DIRECT DES CALLBACKS AVANT PASSAGE
  console.log('[LeadsPage] 🧪 VALIDATION FINALE DES CALLBACKS:');
  console.log('[LeadsPage] 🧪 handleViewLead type:', typeof handleViewLead);
  console.log('[LeadsPage] 🧪 handleCallLead type:', typeof handleCallLead);
  console.log('[LeadsPage] 🧪 handleEmailLead type:', typeof handleEmailLead);
  console.log('[LeadsPage] 🧪 handleScheduleLead type:', typeof handleScheduleLead);

  // 🔧 ROUTES AVEC LOGS DE DEBUG et IIFE pour éviter les conflits de cache
  console.log('[LeadsPage] 🏠 Route HOME déclenchée!');
  console.log('[LeadsPage] 📊 Route DASHBOARD déclenchée!');
  console.log('[LeadsPage] 📋 Route LIST déclenchée!');
  console.log('[LeadsPage] 🔧 Route SETTINGS déclenchée!');
  console.log('[LeadsPage] ❌ Route CATCH-ALL déclenchée pour:', location.pathname);

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