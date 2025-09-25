import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  message: string;
  type?: NotificationType;
  duration?: number;
  onClose?: () => void;
}

// Composant de notification individuelle
function NotificationItem({ message, type = 'info', duration = 5000, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  
  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };
  
  // Gérer les notifications auto-fermantes
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(() => {
          setIsVisible(false);
          if (onClose) onClose();
        }, 300); // Durée de l'animation de sortie
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  // Gestion du clic sur le bouton de fermeture
  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };
  
  if (!isVisible) return null;
  
  return (
    <div 
      className={`flex items-center justify-between p-3 mb-3 rounded-md text-white shadow-md max-w-md w-full
                 transition-all duration-300 ${getBackgroundColor()} 
                 ${isLeaving ? 'opacity-0 translate-x-full' : 'opacity-100'}`}
    >
      <p className="flex-1 mr-2">{message}</p>
      <button 
        onClick={handleClose} 
        className="text-white hover:text-gray-200 focus:outline-none"
        aria-label="Fermer"
      >
        ✕
      </button>
    </div>
  );
}

// Gestionnaire global de notifications
export const NotificationManager = {
  notifications: [] as { id: string, props: NotificationProps }[],
  listeners: [] as Function[],
  
  show(message: string, type: NotificationType = 'info', duration: number = 5000) {
    const id = Math.random().toString(36).substring(2, 9);
    const notification = {
      id,
      props: {
        message,
        type,
        duration,
        onClose: () => this.remove(id)
      }
    };
    
    this.notifications.push(notification);
    this.emitChange();
    return id;
  },
  
  success(message: string, duration?: number) {
    return this.show(message, 'success', duration);
  },
  
  error(message: string, duration?: number) {
    return this.show(message, 'error', duration);
  },
  
  info(message: string, duration?: number) {
    return this.show(message, 'info', duration);
  },
  
  warning(message: string, duration?: number) {
    return this.show(message, 'warning', duration);
  },
  
  remove(id: string) {
    this.notifications = this.notifications.filter(
      notification => notification.id !== id
    );
    this.emitChange();
  },
  
  clear() {
    this.notifications = [];
    this.emitChange();
  },
  
  subscribe(listener: Function) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },
  
  emitChange() {
    this.listeners.forEach(listener => listener());
  }
};

// Composant pour afficher toutes les notifications
export function NotificationsContainer() {
  const [notifications, setNotifications] = useState(NotificationManager.notifications);
  
  useEffect(() => {
    const unsubscribe = NotificationManager.subscribe(() => {
      setNotifications([...NotificationManager.notifications]);
    });
    return unsubscribe;
  }, []);
  
  // Créer un portail React pour afficher les notifications en dehors de la hiérarchie DOM normal
  const notificationsRoot = document.getElementById('notifications-root');
  
  if (!notificationsRoot) {
    // Créer l'élément s'il n'existe pas
    const element = document.createElement('div');
    element.id = 'notifications-root';
    document.body.appendChild(element);
    return null;
  }
  
  return ReactDOM.createPortal(
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end space-y-2">
      {notifications.map(({ id, props }) => (
        <NotificationItem key={id} {...props} />
      ))}
    </div>,
    notificationsRoot
  );
}
