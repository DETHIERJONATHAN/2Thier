import React from 'react';import React from 'react';import React from '  const location = useLocation();

import { Route, Routes, Navigate, useLocation } from 'react-router-dom';

import { message } from 'antd';import { Route, Routes, Navigate, useLocation } from 'react-router-dom';

import LeadsLayout from './Leads/LeadsLayout';

import LeadsHomePage from './Leads/LeadsHomePage';import { message } from 'antd';  // 🚨 LOGS CACHE-BUSTING ULTRA FORTS

import LeadDetailModule from './Leads/LeadDetailModule';

import CallModule from './Leads/CallModule';import LeadsLayout from './Leads/LeadsLayout';  console.log(`[LeadsPage] 🚀 PAGE CHARGÉE TIMESTAMP: ${Date.now()}`);

import EmailModule from './Leads/EmailModule';

import LeadsKanbanWrapper from './Leads/LeadsKanbanWrapper';import LeadsHomePage from './Leads/LeadsHomePage';  console.log('[LeadsPage] 🚀 Page chargée, location:', location.pathname);

import LeadsDashboard from './Leads/LeadsDashboard';

import LeadsSettingsPage from './Leads/LeadsSettingsPage';import LeadDetailModule from './Leads/LeadDetailModule';  console.log('[LeadsPage] 🔄 VERSION MODIFIÉE - CACHE FORCÉ À SE RAFRAÎCHIR!');

import { useAuth } from '../auth/useAuth';

import CallModule from './Leads/CallModule';  console.log('[LeadsPage] ⚠️ SI VOUS VOYEZ CES LOGS, LE CACHE A ÉTÉ RAFRAÎCHI!');

/**

 * Composant principal pour la gestion des leadsimport EmailModule from './Leads/EmailModule';  console.log('[LeadsPage] 🔍 useAuth hook:', { can: typeof can });';

 * Configure les routes et effectue les vérifications de permissions

 */import LeadsKanbanWrapper from './Leads/LeadsKanbanWrapper';import { Route, Routes, Navigate, useLocation } from 'react-router-dom';

export default function LeadsPage() {

  const { can } = useAuth();import LeadsDashboard from './Leads/LeadsDashboard';import { message } from 'antd';

  const location = useLocation();

import LeadsSettingsPage from './Leads/LeadsSettingsPage';import LeadsLayout from './Leads/LeadsLayout';

  // 🚨 LOGS CACHE-BUSTING ULTRA FORTS - TIMESTAMP UNIQUE

  console.log(`[LeadsPage] 🚀 PAGE CHARGÉE TIMESTAMP: ${Date.now()}`);import { useAuth } from '../auth/useAuth';import LeadsHomePage from './Leads/LeadsHomePage';

  console.log('[LeadsPage] 🚀 Page chargée, location:', location.pathname);

  console.log('[LeadsPage] 🔄 VERSION MODIFIÉE - CACHE FORCÉ À SE RAFRAÎCHIR!');import LeadDetailModule from './Leads/LeadDetailModule';

  console.log('[LeadsPage] ⚠️ SI VOUS VOYEZ CES LOGS, LE CACHE A ÉTÉ RAFRAÎCHI!');

  console.log('[LeadsPage] 🔍 useAuth hook:', { can: typeof can });/**import CallModule from './Leads/CallModule';



  // Vérification des permissions * Composant principal pour la gestion des leadsimport EmailModule from './Leads/EmailModule';

  const canViewLeads = can('leads:read');

 * Configure les routes et effectue les vérifications de permissionsimport LeadsKanbanWrapper from './Leads/LeadsKanbanWrapper';

  console.log('[LeadsPage] 🔐 Permissions canViewLeads:', canViewLeads);

 */import LeadsDashboard from './Leads/LeadsDashboard';

  // 🔧 Stabiliser les callbacks avec useCallback + LOGS EXHAUSTIFS

  console.log('[LeadsPage] 🏗️ DÉBUT CRÉATION DES CALLBACKS avec useCallback...');export default function LeadsPage() {import LeadsSettingsPage from './Leads/LeadsSettingsPage';

  

  const handleViewLead = React.useCallback((leadId: string) => {  const { can } = useAuth();import { useAuth } from '../auth/useAuth';

    console.log(`[LeadsPage] 🔍 CALLBACK handleViewLead APPELÉ - TIMESTAMP: ${Date.now()}`);

    console.log('[LeadsPage] 🔍 handleViewLead CALLED avec leadId:', leadId);  const location = useLocation();

    console.log('[LeadsPage] 🔍 OUVERTURE MODULE DÉTAILS...');

    console.log('[LeadsPage] 🔍 📝 ACTION: Redirection vers page détails du lead');/**

    

    // Rediriger vers la page de détails du lead  // 🚨 LOGS CACHE-BUSTING ULTRA FORTS - TIMESTAMP UNIQUE * Composant principal pour la gestion des leads

    window.location.href = `/leads/details/${leadId}`;

  }, []);  console.log(`[LeadsPage] 🚀 PAGE CHARGÉE TIMESTAMP: ${Date.now()}`); * Configure les routes et effectue les vérifications de permissions

  

  console.log(`[LeadsPage] ✅ handleViewLead CRÉÉ - TIMESTAMP: ${Date.now()}`);  console.log('[LeadsPage] 🚀 Page chargée, location:', location.pathname); */



  const handleCallLead = React.useCallback((leadId: string) => {  console.log('[LeadsPage] 🔄 VERSION MODIFIÉE - CACHE FORCÉ À SE RAFRAÎCHIR!');export default function LeadsPage() {

    console.log(`[LeadsPage] 📞 CALLBACK handleCallLead APPELÉ - TIMESTAMP: ${Date.now()}`);

    console.log('[LeadsPage] 📞 handleCallLead CALLED avec leadId:', leadId);  console.log('[LeadsPage] ⚠️ SI VOUS VOYEZ CES LOGS, LE CACHE A ÉTÉ RAFRAÎCHI!');  const { can } = useAuth();

    console.log('[LeadsPage] 📞 OUVERTURE MODULE APPEL TELNYX...');

    console.log('[LeadsPage] 📞 🎯 ACTION: Déclenchement appel via Telnyx');  console.log('[LeadsPage] 🔍 useAuth hook:', { can: typeof can });  const location = useLocation();

    

    // Ici on pourrait déclencher un appel via Telnyx

    message.success(`📞 Module d'appel ouvert pour le lead ${leadId} - Connexion Telnyx...`);

      // Vérification des permissions  console.log('[LeadsPage] 🚀 Page chargée, location:', location.pathname);

    // Redirection vers le module d'appel

    window.location.href = `/leads/call/${leadId}`;  const canViewLeads = can('leads:read');  console.log('[LeadsPage] � VERSION MODIFIÉE - CACHE FORCÉ À SE RAFRAÎCHIR!');

  }, []);

    console.log('[LeadsPage] �🔍 useAuth hook:', { can: typeof can });

  console.log(`[LeadsPage] ✅ handleCallLead CRÉÉ - TIMESTAMP: ${Date.now()}`);

  console.log('[LeadsPage] 🔐 Permissions canViewLeads:', canViewLeads);

  const handleEmailLead = React.useCallback((leadId: string) => {

    console.log(`[LeadsPage] 📧 CALLBACK handleEmailLead APPELÉ - TIMESTAMP: ${Date.now()}`);  // Vérification des permissions

    console.log('[LeadsPage] 📧 handleEmailLead CALLED avec leadId:', leadId);

    console.log('[LeadsPage] 📧 OUVERTURE MODULE EMAIL...');  // 🔧 Stabiliser les callbacks avec useCallback + LOGS EXHAUSTIFS  const canViewLeads = can('leads:read');

    console.log('[LeadsPage] 📧 ✉️ ACTION: Ouverture composer email');

      console.log('[LeadsPage] 🏗️ DÉBUT CRÉATION DES CALLBACKS avec useCallback...');

    // Ici on pourrait ouvrir un modal d'email

    message.success(`📧 Module email ouvert pour le lead ${leadId} - Composer un message...`);    console.log('[LeadsPage] 🔐 Permissions canViewLeads:', canViewLeads);

    

    // Redirection vers le module email  const handleViewLead = React.useCallback((leadId: string) => {

    window.location.href = `/leads/email/${leadId}`;

  }, []);    console.log(`[LeadsPage] 🔍 CALLBACK handleViewLead APPELÉ - TIMESTAMP: ${Date.now()}`);  // 🔧 Stabiliser les callbacks avec useCallback

  

  console.log(`[LeadsPage] ✅ handleEmailLead CRÉÉ - TIMESTAMP: ${Date.now()}`);    console.log('[LeadsPage] 🔍 handleViewLead CALLED avec leadId:', leadId);  console.log('[LeadsPage] 🏗️ DÉBUT CRÉATION DES CALLBACKS avec useCallback...');



  const handleScheduleLead = React.useCallback((leadId: string) => {    console.log('[LeadsPage] 🔍 OUVERTURE MODULE DÉTAILS...');  

    console.log(`[LeadsPage] 📅 CALLBACK handleScheduleLead APPELÉ - TIMESTAMP: ${Date.now()}`);

    console.log('[LeadsPage] 📅 handleScheduleLead CALLED avec leadId:', leadId);    console.log('[LeadsPage] 🔍 📝 ACTION: Redirection vers page détails du lead');  const handleViewLead = React.useCallback((leadId: string) => {

    console.log('[LeadsPage] 📅 OUVERTURE MODULE CALENDRIER GOOGLE...');

    console.log('[LeadsPage] 📅 🗓️ ACTION: Ouverture Google Calendar');        console.log(`[LeadsPage] 🔍 CALLBACK handleViewLead APPELÉ - TIMESTAMP: ${Date.now()}`);

    

    // Ici on pourrait ouvrir un calendrier    // Rediriger vers la page de détails du lead    console.log('[LeadsPage] 🔍 handleViewLead CALLED avec leadId:', leadId);

    message.success(`📅 Module calendrier ouvert pour le lead ${leadId} - Planification Google Calendar...`);

        window.location.href = `/leads/details/${leadId}`;    console.log('[LeadsPage] 🔍 OUVERTURE MODULE DÉTAILS...');

    // Redirection vers le module agenda

    window.location.href = `/leads/agenda/${leadId}`;  }, []);    // Rediriger vers la page de détails du lead

  }, []);

        window.location.href = `/leads/details/${leadId}`;

  console.log(`[LeadsPage] ✅ handleScheduleLead CRÉÉ - TIMESTAMP: ${Date.now()}`);

    console.log(`[LeadsPage] ✅ handleViewLead CRÉÉ - TIMESTAMP: ${Date.now()}`);  }, []);

  // VÉRIFICATION FINALE DE TOUS LES CALLBACKS

  console.log(`[LeadsPage] ✅ TOUS LES CALLBACKS CRÉÉS - TIMESTAMP: ${Date.now()}`);  

  console.log('[LeadsPage] ✅ Callbacks créés avec succès:', {

    handleViewLead: typeof handleViewLead,  const handleCallLead = React.useCallback((leadId: string) => {  console.log(`[LeadsPage] ✅ handleViewLead CRÉÉ - TIMESTAMP: ${Date.now()}`);

    handleCallLead: typeof handleCallLead,

    handleEmailLead: typeof handleEmailLead,    console.log(`[LeadsPage] 📞 CALLBACK handleCallLead APPELÉ - TIMESTAMP: ${Date.now()}`);

    handleScheduleLead: typeof handleScheduleLead

  });    console.log('[LeadsPage] 📞 handleCallLead CALLED avec leadId:', leadId);  const handleCallLead = React.useCallback((leadId: string) => {

  console.log('[LeadsPage] ✅ VÉRIFICATION: handleViewLead existe?', !!handleViewLead);

  console.log('[LeadsPage] ✅ VÉRIFICATION: handleCallLead existe?', !!handleCallLead);    console.log('[LeadsPage] 📞 OUVERTURE MODULE APPEL TELNYX...');    console.log(`[LeadsPage] 📞 CALLBACK handleCallLead APPELÉ - TIMESTAMP: ${Date.now()}`);

  console.log('[LeadsPage] ✅ VÉRIFICATION: handleEmailLead existe?', !!handleEmailLead);

  console.log('[LeadsPage] ✅ VÉRIFICATION: handleScheduleLead existe?', !!handleScheduleLead);    console.log('[LeadsPage] 📞 🎯 ACTION: Déclenchement appel via Telnyx');    console.log('[LeadsPage] 📞 handleCallLead CALLED avec leadId:', leadId);



  if (!canViewLeads) {        console.log('[LeadsPage] 📞 OUVERTURE MODULE APPEL TELNYX...');

    return (

      <div className="p-6">    // Ici on pourrait déclencher un appel via Telnyx    // Ici on pourrait déclencher un appel via Telnyx

        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">

          <p className="text-red-700">Vous n'avez pas les permissions nécessaires pour accéder à cette section.</p>    message.success(`📞 Module d'appel ouvert pour le lead ${leadId} - Connexion Telnyx...`);    message.success(`📞 Module d'appel ouvert pour le lead ${leadId} - Connexion Telnyx...`);

        </div>

      </div>      }, []);

    );

  }    // Redirection vers le module d'appel  



  // Rediriger vers la nouvelle page d'accueil par défaut    window.location.href = `/leads/call/${leadId}`;  console.log(`[LeadsPage] ✅ handleCallLead CRÉÉ - TIMESTAMP: ${Date.now()}`);

  if (location.pathname === '/leads') {

    console.log('[LeadsPage] 🔄 Redirection /leads -> /leads/home');  }, []);

    return <Navigate to="/leads/home" replace />;

  }    const handleEmailLead = React.useCallback((leadId: string) => {



  console.log('[LeadsPage] 📍 Routing vers:', location.pathname);  console.log(`[LeadsPage] ✅ handleCallLead CRÉÉ - TIMESTAMP: ${Date.now()}`);    console.log(`[LeadsPage] 📧 CALLBACK handleEmailLead APPELÉ - TIMESTAMP: ${Date.now()}`);

  

  // 🔍 LOGS CALLBACKS AVANT RENDU    console.log('[LeadsPage] 📧 handleEmailLead CALLED avec leadId:', leadId);

  console.log('[LeadsPage] 🎯 ÉTAT DES CALLBACKS AVANT RENDU:');

  console.log('[LeadsPage] 🎯 handleViewLead:', typeof handleViewLead, '=', handleViewLead);  const handleEmailLead = React.useCallback((leadId: string) => {    console.log('[LeadsPage] 📧 OUVERTURE MODULE EMAIL...');

  console.log('[LeadsPage] 🎯 handleCallLead:', typeof handleCallLead, '=', handleCallLead);

  console.log('[LeadsPage] 🎯 handleEmailLead:', typeof handleEmailLead, '=', handleEmailLead);    console.log(`[LeadsPage] 📧 CALLBACK handleEmailLead APPELÉ - TIMESTAMP: ${Date.now()}`);    // Ici on pourrait ouvrir un modal d'email

  console.log('[LeadsPage] 🎯 handleScheduleLead:', typeof handleScheduleLead, '=', handleScheduleLead);

    console.log('[LeadsPage] 📧 handleEmailLead CALLED avec leadId:', leadId);    message.success(`📧 Module email ouvert pour le lead ${leadId} - Composer un message...`);

  return (

    <Routes>    console.log('[LeadsPage] 📧 OUVERTURE MODULE EMAIL...');  }, []);

      <Route path="/" element={<LeadsLayout />}>

        <Route     console.log('[LeadsPage] 📧 ✉️ ACTION: Ouverture composer email');  

          path="home" 

          element={      console.log(`[LeadsPage] ✅ handleEmailLead CRÉÉ - TIMESTAMP: ${Date.now()}`);

            (() => {

              console.log('[LeadsPage] 🏠 Route HOME déclenchée!');    // Ici on pourrait ouvrir un modal d'email

              console.log('[LeadsPage] 🏠 Passage des callbacks à LeadsHomePage:', {

                onViewLead: typeof handleViewLead,    message.success(`📧 Module email ouvert pour le lead ${leadId} - Composer un message...`);  const handleScheduleLead = React.useCallback((leadId: string) => {

                onCallLead: typeof handleCallLead,

                onEmailLead: typeof handleEmailLead,        console.log(`[LeadsPage] 📅 CALLBACK handleScheduleLead APPELÉ - TIMESTAMP: ${Date.now()}`);

                onScheduleLead: typeof handleScheduleLead

              });    // Redirection vers le module email    console.log('[LeadsPage] 📅 handleScheduleLead CALLED avec leadId:', leadId);

              return (

                <LeadsHomePage     window.location.href = `/leads/email/${leadId}`;    console.log('[LeadsPage] 📅 OUVERTURE MODULE CALENDRIER GOOGLE...');

                  onViewLead={handleViewLead}

                  onCallLead={handleCallLead}  }, []);    // Ici on pourrait ouvrir un calendrier

                  onEmailLead={handleEmailLead}

                  onScheduleLead={handleScheduleLead}      message.success(`📅 Module calendrier ouvert pour le lead ${leadId} - Planification Google Calendar...`);

                />

              );  console.log(`[LeadsPage] ✅ handleEmailLead CRÉÉ - TIMESTAMP: ${Date.now()}`);  }, []);

            })()

          }   

        />

        <Route   const handleScheduleLead = React.useCallback((leadId: string) => {  console.log(`[LeadsPage] ✅ handleScheduleLead CRÉÉ - TIMESTAMP: ${Date.now()}`);

          path="dashboard" 

          element={    console.log(`[LeadsPage] 📅 CALLBACK handleScheduleLead APPELÉ - TIMESTAMP: ${Date.now()}`);  

            (() => {

              console.log('[LeadsPage] 📊 Route DASHBOARD déclenchée!');    console.log('[LeadsPage] 📅 handleScheduleLead CALLED avec leadId:', leadId);  // VÉRIFICATION FINALE DE TOUS LES CALLBACKS

              return <LeadsDashboard />;

            })()    console.log('[LeadsPage] 📅 OUVERTURE MODULE CALENDRIER GOOGLE...');  console.log(`[LeadsPage] ✅ TOUS LES CALLBACKS CRÉÉS - TIMESTAMP: ${Date.now()}`);

          } 

        />    console.log('[LeadsPage] 📅 🗓️ ACTION: Ouverture Google Calendar');  console.log('[LeadsPage] ✅ Callbacks créés avec succès:', {

        <Route 

          path="list"         handleViewLead: typeof handleViewLead,

          element={

            (() => {    // Ici on pourrait ouvrir un calendrier    handleCallLead: typeof handleCallLead,

              console.log('[LeadsPage] 📋 Route LIST déclenchée!');

              console.log('[LeadsPage] 📋 Passage des callbacks à LeadsHomePage (liste):', {    message.success(`📅 Module calendrier ouvert pour le lead ${leadId} - Planification Google Calendar...`);    handleEmailLead: typeof handleEmailLead,

                onViewLead: typeof handleViewLead,

                onCallLead: typeof handleCallLead,        handleScheduleLead: typeof handleScheduleLead

                onEmailLead: typeof handleEmailLead,

                onScheduleLead: typeof handleScheduleLead    // Redirection vers le module agenda  });

              });

              return (    window.location.href = `/leads/agenda/${leadId}`;  console.log('[LeadsPage] ✅ VÉRIFICATION: handleViewLead existe?', !!handleViewLead);

                <div className="p-6">

                  <LeadsHomePage  }, []);  console.log('[LeadsPage] ✅ VÉRIFICATION: handleCallLead existe?', !!handleCallLead);

                    onViewLead={handleViewLead}

                    onCallLead={handleCallLead}    console.log('[LeadsPage] ✅ VÉRIFICATION: handleEmailLead existe?', !!handleEmailLead);

                    onEmailLead={handleEmailLead}

                    onScheduleLead={handleScheduleLead}  console.log(`[LeadsPage] ✅ handleScheduleLead CRÉÉ - TIMESTAMP: ${Date.now()}`);  console.log('[LeadsPage] ✅ VÉRIFICATION: handleScheduleLead existe?', !!handleScheduleLead);

                  />

                </div>  

              );

            })()  // VÉRIFICATION FINALE DE TOUS LES CALLBACKS  if (!canViewLeads) {

          } 

        />  console.log(`[LeadsPage] ✅ TOUS LES CALLBACKS CRÉÉS - TIMESTAMP: ${Date.now()}`);    return (

        <Route 

          path="kanban"   console.log('[LeadsPage] ✅ Callbacks créés avec succès:', {      <div className="p-6">

          element={

            (() => {    handleViewLead: typeof handleViewLead,        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">

              console.log('[LeadsPage] 📊 Route KANBAN déclenchée!');

              return <LeadsKanbanWrapper />;    handleCallLead: typeof handleCallLead,          <p className="text-red-700">Vous n'avez pas les permissions nécessaires pour accéder à cette section.</p>

            })()

          }     handleEmailLead: typeof handleEmailLead,        </div>

        />

        <Route     handleScheduleLead: typeof handleScheduleLead      </div>

          path="details/:leadId" 

          element={  });    );

            (() => {

              console.log('[LeadsPage] 🔍 Route DETAILS déclenchée!');  console.log('[LeadsPage] ✅ VÉRIFICATION: handleViewLead existe?', !!handleViewLead);  }

              return <LeadDetailModule />;

            })()  console.log('[LeadsPage] ✅ VÉRIFICATION: handleCallLead existe?', !!handleCallLead);

          } 

        />  console.log('[LeadsPage] ✅ VÉRIFICATION: handleEmailLead existe?', !!handleEmailLead);  // Rediriger vers la nouvelle page d'accueil par défaut

        <Route 

          path="call/:leadId"   console.log('[LeadsPage] ✅ VÉRIFICATION: handleScheduleLead existe?', !!handleScheduleLead);  if (location.pathname === '/leads') {

          element={

            (() => {    console.log('[LeadsPage] 🔄 Redirection /leads -> /leads/home');

              console.log('[LeadsPage] 📞 Route CALL déclenchée!');

              return <CallModule />;  if (!canViewLeads) {    return <Navigate to="/leads/home" replace />;

            })()

          }     return (  }

        />

        <Route       <div className="p-6">

          path="email/:leadId" 

          element={        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">  console.log('[LeadsPage] 📍 Routing vers:', location.pathname);

            (() => {

              console.log('[LeadsPage] 📧 Route EMAIL déclenchée!');          <p className="text-red-700">Vous n'avez pas les permissions nécessaires pour accéder à cette section.</p>  

              return <EmailModule />;

            })()        </div>  // 🔍 LOGS CALLBACKS AVANT RENDU

          } 

        />      </div>  console.log('[LeadsPage] 🎯 ÉTAT DES CALLBACKS AVANT RENDU:');

        <Route 

          path="agenda/:leadId"     );  console.log('[LeadsPage] 🎯 handleViewLead:', typeof handleViewLead, '=', handleViewLead);

          element={

            (() => {  }  console.log('[LeadsPage] 🎯 handleCallLead:', typeof handleCallLead, '=', handleCallLead);

              console.log('[LeadsPage] 📅 Route AGENDA déclenchée!');

              return (  console.log('[LeadsPage] 🎯 handleEmailLead:', typeof handleEmailLead, '=', handleEmailLead);

                <div className="p-6">

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">  // Rediriger vers la nouvelle page d'accueil par défaut  console.log('[LeadsPage] 🎯 handleScheduleLead:', typeof handleScheduleLead, '=', handleScheduleLead);

                    <h2 className="text-lg font-semibold text-blue-800 mb-2">📅 Module Agenda Google</h2>

                    <p className="text-blue-700">Intégration Google Calendar en cours de développement. Redirection vers Google Agenda...</p>  if (location.pathname === '/leads') {

                  </div>

                </div>    console.log('[LeadsPage] 🔄 Redirection /leads -> /leads/home');  return (

              );

            })()    return <Navigate to="/leads/home" replace />;    <Routes>

          } 

        />  }      <Route path="/" element={<LeadsLayout />}>

        

        {/* Routes pour les intégrations et paramètres */}        <Route 

        <Route 

          path="integrations"   console.log('[LeadsPage] 📍 Routing vers:', location.pathname);          path="home" 

          element={

            (() => {            element={

              console.log('[LeadsPage] 🔗 Route INTEGRATIONS déclenchée!');

              return (  // 🔍 LOGS CALLBACKS AVANT RENDU            <LeadsHomePage 

                <div className="p-6">

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">  console.log('[LeadsPage] 🎯 ÉTAT DES CALLBACKS AVANT RENDU:');              onViewLead={handleViewLead}

                    <h2 className="text-lg font-semibold text-blue-800 mb-2">🔗 Intégrations</h2>

                    <p className="text-blue-700">Cette section permettra de configurer les intégrations avec vos outils externes (CRM, emails, calendriers, etc.).</p>  console.log('[LeadsPage] 🎯 handleViewLead:', typeof handleViewLead, '=', handleViewLead);              onCallLead={handleCallLead}

                  </div>

                </div>  console.log('[LeadsPage] 🎯 handleCallLead:', typeof handleCallLead, '=', handleCallLead);              onEmailLead={handleEmailLead}

              );

            })()  console.log('[LeadsPage] 🎯 handleEmailLead:', typeof handleEmailLead, '=', handleEmailLead);              onScheduleLead={handleScheduleLead}

          } 

        />  console.log('[LeadsPage] 🎯 handleScheduleLead:', typeof handleScheduleLead, '=', handleScheduleLead);            />

        

        {/* Route pour les paramètres */}          } 

        <Route 

          path="settings"   return (        />

          element={

            (() => {    <Routes>        <Route path="dashboard" element={<LeadsDashboard />} />

              console.log('[LeadsPage] 🔧 Route SETTINGS déclenchée!');

              return <LeadsSettingsPage />;      <Route path="/" element={<LeadsLayout />}>        <Route 

            })()

          }         <Route           path="list" 

        />

                  path="home"           element={

        {/* Redirection par défaut */}

        <Route           element={            <div className="p-6">

          path="*" 

          element={            (() => {              <LeadsHomePage

            (() => {

              console.log('[LeadsPage] ❌ Route CATCH-ALL déclenchée pour:', location.pathname);              console.log('[LeadsPage] 🏠 Route HOME déclenchée!');                onViewLead={handleViewLead}

              return <Navigate to="/leads/home" replace />;

            })()              console.log('[LeadsPage] 🏠 Passage des callbacks à LeadsHomePage:', {                onCallLead={handleCallLead}

          } 

        />                onViewLead: typeof handleViewLead,                onEmailLead={handleEmailLead}

      </Route>

    </Routes>                onCallLead: typeof handleCallLead,                onScheduleLead={handleScheduleLead}

  );

}                onEmailLead: typeof handleEmailLead,              />

                onScheduleLead: typeof handleScheduleLead            </div>

              });          } 

              return (        />

                <LeadsHomePage         <Route path="kanban" element={<LeadsKanbanWrapper />} />

                  onViewLead={handleViewLead}        <Route path="details/:leadId" element={<LeadDetailModule />} />

                  onCallLead={handleCallLead}        <Route path="call/:leadId" element={<CallModule />} />

                  onEmailLead={handleEmailLead}        <Route path="email/:leadId" element={<EmailModule />} />

                  onScheduleLead={handleScheduleLead}        <Route path="agenda/:leadId" element={

                />          <div className="p-6">

              );            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">

            })()              <h2 className="text-lg font-semibold text-blue-800 mb-2">📅 Module Agenda Google</h2>

          }               <p className="text-blue-700">Intégration Google Calendar en cours de développement. Redirection vers Google Agenda...</p>

        />            </div>

        <Route           </div>

          path="dashboard"         } />

          element={        

            (() => {        {/* Routes pour les intégrations et paramètres */}

              console.log('[LeadsPage] 📊 Route DASHBOARD déclenchée!');        <Route path="integrations" element={

              return <LeadsDashboard />;          <div className="p-6">

            })()            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">

          }               <h2 className="text-lg font-semibold text-blue-800 mb-2">🔗 Intégrations</h2>

        />              <p className="text-blue-700">Cette section permettra de configurer les intégrations avec vos outils externes (CRM, emails, calendriers, etc.).</p>

        <Route             </div>

          path="list"           </div>

          element={        } />

            (() => {        

              console.log('[LeadsPage] 📋 Route LIST déclenchée!');        {/* Route pour les paramètres */}

              console.log('[LeadsPage] 📋 Passage des callbacks à LeadsHomePage (liste):', {        <Route path="settings" element={<LeadsSettingsPage />

                onViewLead: typeof handleViewLead,        } />

                onCallLead: typeof handleCallLead,        

                onEmailLead: typeof handleEmailLead,        {/* Redirection par défaut */}

                onScheduleLead: typeof handleScheduleLead        <Route path="*" element={<Navigate to="/leads/home" replace />} />

              });      </Route>

              return (    </Routes>

                <div className="p-6">  );

                  <LeadsHomePage}

                    onViewLead={handleViewLead}
                    onCallLead={handleCallLead}
                    onEmailLead={handleEmailLead}
                    onScheduleLead={handleScheduleLead}
                  />
                </div>
              );
            })()
          } 
        />
        <Route 
          path="kanban" 
          element={
            (() => {
              console.log('[LeadsPage] 📊 Route KANBAN déclenchée!');
              return <LeadsKanbanWrapper />;
            })()
          } 
        />
        <Route 
          path="details/:leadId" 
          element={
            (() => {
              console.log('[LeadsPage] 🔍 Route DETAILS déclenchée!');
              return <LeadDetailModule />;
            })()
          } 
        />
        <Route 
          path="call/:leadId" 
          element={
            (() => {
              console.log('[LeadsPage] 📞 Route CALL déclenchée!');
              return <CallModule />;
            })()
          } 
        />
        <Route 
          path="email/:leadId" 
          element={
            (() => {
              console.log('[LeadsPage] 📧 Route EMAIL déclenchée!');
              return <EmailModule />;
            })()
          } 
        />
        <Route 
          path="agenda/:leadId" 
          element={
            (() => {
              console.log('[LeadsPage] 📅 Route AGENDA déclenchée!');
              return (
                <div className="p-6">
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                    <h2 className="text-lg font-semibold text-blue-800 mb-2">📅 Module Agenda Google</h2>
                    <p className="text-blue-700">Intégration Google Calendar en cours de développement. Redirection vers Google Agenda...</p>
                  </div>
                </div>
              );
            })()
          } 
        />
        
        {/* Routes pour les intégrations et paramètres */}
        <Route 
          path="integrations" 
          element={
            (() => {
              console.log('[LeadsPage] 🔗 Route INTEGRATIONS déclenchée!');
              return (
                <div className="p-6">
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                    <h2 className="text-lg font-semibold text-blue-800 mb-2">🔗 Intégrations</h2>
                    <p className="text-blue-700">Cette section permettra de configurer les intégrations avec vos outils externes (CRM, emails, calendriers, etc.).</p>
                  </div>
                </div>
              );
            })()
          } 
        />
        
        {/* Route pour les paramètres */}
        <Route 
          path="settings" 
          element={
            (() => {
              console.log('[LeadsPage] 🔧 Route SETTINGS déclenchée!');
              return <LeadsSettingsPage />;
            })()
          } 
        />
        
        {/* Redirection par défaut */}
        <Route 
          path="*" 
          element={
            (() => {
              console.log('[LeadsPage] ❌ Route CATCH-ALL déclenchée pour:', location.pathname);
              return <Navigate to="/leads/home" replace />;
            })()
          } 
        />
      </Route>
    </Routes>
  );
}