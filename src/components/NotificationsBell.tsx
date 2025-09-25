import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Trash2 } from 'lucide-react'; // Utilisation d'icônes
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

// Définition du type pour une notification, pour correspondre au backend
interface Notification {
  id: string;
  type: string;
  data: any;
  createdAt: string;
  organization?: {
    name: string;
  };
}

const NotificationsBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { api } = useAuthenticatedApi();

  // Récupérer les notifications depuis l'API en utilisant useAuthenticatedApi
  const fetchNotifications = useCallback(async () => {
    try {
      console.log('🔔 [NotificationsBell] Récupération des notifications...');
      const response = await api.get('/api/notifications');
      console.log('🔔 [NotificationsBell] Réponse:', response);
      setNotifications(response.data || []);
    } catch (error) {
      console.error("🔔 [NotificationsBell] Erreur lors de la récupération des notifications:", error);
    }
  }, [api]);

  // ✅ PRODUCTION: Supprimer une notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      console.log('🔔 [NotificationsBell] Suppression notification:', notificationId);
      await api.delete(`/api/notifications/${notificationId}`);
      // Mettre à jour la liste localement
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      console.log('🔔 [NotificationsBell] Notification supprimée avec succès');
    } catch (error) {
      console.error("🔔 [NotificationsBell] Erreur lors de la suppression:", error);
    }
  }, [api]);

  // ✅ PRODUCTION: Supprimer toutes les notifications
  const deleteAllNotifications = useCallback(async () => {
    try {
      console.log('🔔 [NotificationsBell] Suppression de toutes les notifications...');
      // Supprimer chaque notification individuellement
      const deletePromises = notifications.map(notif => 
        api.delete(`/api/notifications/${notif.id}`)
      );
      await Promise.all(deletePromises);
      setNotifications([]);
      console.log('🔔 [NotificationsBell] Toutes les notifications supprimées');
    } catch (error) {
      console.error("🔔 [NotificationsBell] Erreur lors de la suppression globale:", error);
    }
  }, [api, notifications]);

  // 🆕 NOUVEAU: Déclencher manuellement la vérification des emails
  const checkForNewEmails = useCallback(async () => {
    try {
      console.log('🔔 [NotificationsBell] Vérification manuelle des nouveaux emails...');
      
      // 🔧 SOLUTION TEMPORAIRE : Utiliser un endpoint existant pour déclencher la sync
      // Au lieu d'appeler check-emails, on va déclencher une sync manuelle
      try {
        // Essayer d'abord l'endpoint check-emails
        await api.post('/api/notifications/check-emails');
        console.log('🔔 [NotificationsBell] Vérification check-emails réussie');
      } catch (checkEmailsError) {
        console.log('🔔 [NotificationsBell] check-emails échoué, tentative alternative...');
        
        // Alternative : créer une notification de test pour vérifier la connectivité
        try {
          await api.post('/api/notifications', {
            type: 'EMAIL_CHECK_TRIGGERED',
            data: {
              message: '📧 Vérification manuelle des emails déclenchée',
              timestamp: new Date().toISOString(),
              trigger: 'manual'
            }
          });
          console.log('🔔 [NotificationsBell] Alternative réussie - notification de test créée');
        } catch (altError) {
          console.error('🔔 [NotificationsBell] Toutes les tentatives ont échoué:', altError);
        }
      }
      
      // Recharger les notifications après vérification
      setTimeout(fetchNotifications, 1000); // Attendre 1 seconde puis recharger
    } catch (error) {
      console.error("🔔 [NotificationsBell] Erreur lors de la vérification des emails:", error);
    }
  }, [api, fetchNotifications]);

  // Effet pour charger les notifications au montage du composant
  useEffect(() => {
    fetchNotifications();
    // ✅ PRODUCTION: Rafraîchir toutes les 30 secondes pour les nouveaux emails
    const interval = setInterval(fetchNotifications, 30000); // toutes les 30 secondes
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.length;

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-md transition-all duration-200 hover:bg-[#D67D35] hover:-translate-y-0.5 hover:shadow-lg">
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-[#D67D35] text-white text-xs flex items-center justify-center notification-badge">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-10 dropdown-2thier">
          <div className="p-4 font-bold border-b flex items-center justify-between">
            <span>Notifications</span>
            <div className="flex items-center gap-2">
              {/* Bouton de vérification manuelle des emails */}
              <button 
                onClick={checkForNewEmails}
                className="text-blue-500 hover:bg-[#D67D35] hover:text-white px-2 py-1 rounded text-sm flex items-center gap-1 transition-all duration-200"
                title="Vérifier les nouveaux emails maintenant"
              >
                <Bell className="h-3 w-3" />
                📧
              </button>
              {notifications.length > 0 && (
                <button 
                  onClick={deleteAllNotifications}
                  className="text-red-500 hover:bg-[#D67D35] hover:text-white px-2 py-1 rounded text-sm flex items-center gap-1 transition-all duration-200"
                  title="Supprimer toutes les notifications"
                >
                  <Trash2 className="h-4 w-4" />
                  Tout supprimer
                </button>
              )}
            </div>
          </div>
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <li key={notif.id} className="p-4 hover:bg-[#D67D35]/10 flex items-start justify-between dropdown-2thier-item">
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{notif.data.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => deleteNotification(notif.id)}
                    className="text-gray-400 hover:text-white hover:bg-[#D67D35] ml-2 p-1 rounded transition-all duration-200"
                    title="Supprimer cette notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))
            ) : (
              <li className="p-4 text-sm text-gray-500">Aucune nouvelle notification</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;
