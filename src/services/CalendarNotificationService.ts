// Service pour gérer les notifications et emails liés à l'agenda
import { emailService } from './EmailService';
import { prisma } from '../lib/prisma';
import { sendPushToUser } from '../routes/push';

export interface CalendarNotificationData {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation?: string;
  organizerName: string;
  participants?: string[]; // emails des participants
}

export class CalendarNotificationService {
  
  /**
   * Créer une notification d'invitation à un événement
   */
  static async createEventInvitation(
    organizationId: string,
    userId: string,
    eventData: CalendarNotificationData
  ) {
    try {
      await prisma.notification.create({
        data: {
          organizationId,
          userId,
          type: 'CALENDAR_EVENT_INVITATION',
          data: {
            eventId: eventData.eventId,
            eventTitle: eventData.eventTitle,
            eventDate: eventData.eventDate,
            eventLocation: eventData.eventLocation,
            organizerName: eventData.organizerName,
            message: `Vous êtes invité(e) à l'événement "${eventData.eventTitle}" le ${new Date(eventData.eventDate).toLocaleDateString('fr-FR')}`
          },
          status: 'PENDING'
        } as unknown
      });

      // Push notification
      sendPushToUser(userId, {
        title: 'Zhiive — Calendrier',
        body: `Invitation : "${eventData.eventTitle}" le ${new Date(eventData.eventDate).toLocaleDateString('fr-FR')}`,
        icon: '/pwa-192x192.png',
        tag: `calendar-invite-${eventData.eventId}`,
        url: '/calendrier',
        type: 'notification',
      }).catch(() => {});
      
    } catch (error) {
      console.error('❌ [Calendar] Erreur lors de la création de la notification:', error);
    }
  }

  /**
   * Créer une notification de rappel d'événement
   */
  static async createEventReminder(
    organizationId: string,
    userId: string,
    eventData: CalendarNotificationData,
    reminderMinutes: number = 15
  ) {
    try {
      await prisma.notification.create({
        data: {
          organizationId,
          userId,
          type: 'CALENDAR_EVENT_REMINDER',
          data: {
            eventId: eventData.eventId,
            eventTitle: eventData.eventTitle,
            eventDate: eventData.eventDate,
            eventLocation: eventData.eventLocation,
            reminderMinutes,
            message: `Rappel: "${eventData.eventTitle}" dans ${reminderMinutes} minutes`
          },
          status: 'PENDING'
        } as unknown
      });

      // Push notification
      sendPushToUser(userId, {
        title: 'Zhiive — Rappel',
        body: `"${eventData.eventTitle}" dans ${reminderMinutes} minutes`,
        icon: '/pwa-192x192.png',
        tag: `calendar-reminder-${eventData.eventId}`,
        url: '/calendrier',
        type: 'notification',
        requireInteraction: true,
      }).catch(() => {});
      
    } catch (error) {
      console.error('❌ [Calendar] Erreur lors de la création du rappel:', error);
    }
  }

  /**
   * Créer une notification de modification d'événement
   */
  static async createEventUpdate(
    organizationId: string,
    userIds: string[],
    eventData: CalendarNotificationData,
    changes: string[]
  ) {
    try {
      const notifications = userIds.map(userId => ({
        organizationId,
        userId,
        type: 'CALENDAR_EVENT_UPDATED' as const,
        data: {
          eventId: eventData.eventId,
          eventTitle: eventData.eventTitle,
          eventDate: eventData.eventDate,
          changes,
          message: `L'événement "${eventData.eventTitle}" a été modifié: ${changes.join(', ')}`
        },
        status: 'PENDING' as const
      }));

      await prisma.notification.createMany({
        data: notifications as unknown
      });

      // Push to all participants
      for (const userId of userIds) {
        sendPushToUser(userId, {
          title: 'Zhiive — Calendrier',
          body: `Événement modifié : "${eventData.eventTitle}" — ${changes.join(', ')}`,
          icon: '/pwa-192x192.png',
          tag: `calendar-update-${eventData.eventId}`,
          url: '/calendrier',
          type: 'notification',
        }).catch(() => {});
      }
      
    } catch (error) {
      console.error('❌ [Calendar] Erreur lors de la création des notifications de mise à jour:', error);
    }
  }

  /**
   * Créer une notification d'annulation d'événement
   */
  static async createEventCancellation(
    organizationId: string,
    userIds: string[],
    eventData: CalendarNotificationData,
    reason?: string
  ) {
    try {
      const notifications = userIds.map(userId => ({
        organizationId,
        userId,
        type: 'CALENDAR_EVENT_CANCELLED' as const,
        data: {
          eventId: eventData.eventId,
          eventTitle: eventData.eventTitle,
          eventDate: eventData.eventDate,
          reason,
          message: `L'événement "${eventData.eventTitle}" a été annulé${reason ? `: ${reason}` : ''}`
        },
        status: 'PENDING' as const
      }));

      await prisma.notification.createMany({
        data: notifications as unknown
      });

      // Push to all participants
      for (const userId of userIds) {
        sendPushToUser(userId, {
          title: 'Zhiive — Calendrier',
          body: `Événement annulé : "${eventData.eventTitle}"${reason ? ` — ${reason}` : ''}`,
          icon: '/pwa-192x192.png',
          tag: `calendar-cancel-${eventData.eventId}`,
          url: '/calendrier',
          type: 'notification',
        }).catch(() => {});
      }
      
    } catch (error) {
  console.error("❌ [Calendar] Erreur lors de la création des notifications d'annulation:", error);
    }
  }

  /**
   * Programmer des rappels automatiques pour un événement
   */
  static async scheduleEventReminders(
    _organizationId: string,
    _eventId: string,
    eventData: CalendarNotificationData,
    participantUserIds: string[],
    reminderIntervals: number[] = [24 * 60, 60, 15] // 24h, 1h, 15min avant
  ) {
    const eventDate = new Date(eventData.eventDate);
    
    for (const minutesBefore of reminderIntervals) {
      const reminderDate = new Date(eventDate.getTime() - minutesBefore * 60 * 1000);
      
      // Si le rappel est dans le futur, on le programme
      if (reminderDate > new Date()) {
        for (const _userId of participantUserIds) {
          // Ici on pourrait utiliser un job scheduler comme Bull/BullMQ
          // Pour l'instant, créons juste la logique de base
          
          // Dans une vraie implémentation, on programmerait un job:
          // await reminderQueue.add('calendar-reminder', {
          //   userId,
          //   eventData,
          //   reminderMinutes: minutesBefore
          // }, { delay: reminderDate.getTime() - Date.now() });
        }
      }
    }
  }

  /**
   * Envoyer un email d'invitation
   */
  static async sendEventInvitationEmail(
    recipientEmail: string,
    organizerName: string,
    eventData: CalendarNotificationData
  ) {
    try {
      // Utiliser votre système d'email existant
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const agendaUrl = `${frontendUrl}/agenda`;
      const subject = `Invitation: ${eventData.eventTitle}`;
      const html = `
        <h2>Invitation à un événement</h2>
        <p><strong>Événement:</strong> ${eventData.eventTitle}</p>
        <p><strong>Date:</strong> ${new Date(eventData.eventDate).toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        ${eventData.eventLocation ? `<p><strong>Lieu:</strong> ${eventData.eventLocation}</p>` : ''}
        <p><strong>Organisateur:</strong> ${organizerName}</p>
        
        <p>Vous êtes invité(e) à participer à cet événement.</p>
        
        <div style="margin: 20px 0;">
          <a href="${agendaUrl}" style="background-color: #1890ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Voir l'agenda</a>
        </div>
      `;

      await emailService.sendEmail({
        to: recipientEmail,
        subject,
        html
      });
      
    } catch (error) {
      console.error('❌ [Calendar] Erreur lors de l\'envoi de l\'email d\'invitation:', error);
    }
  }
}
