// 📧 Service pour la gestion des emails internes - Backend intégré

// Types d'emails
export interface InternalEmail {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml: boolean;
  isRead: boolean;
  isImportant: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  threadId?: string;
  organizationId: string;
  attachments?: InternalEmailAttachment[];
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  scheduledFor?: string;
}

export interface InternalEmailAttachment {
  id: string;
  emailId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: string;
}

// Types de requêtes
export interface CreateEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  folder?: 'drafts' | 'sent';
  attachments?: File[];
  scheduledFor?: string;
}

export interface UpdateEmailRequest {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
  isHtml?: boolean;
  isRead?: boolean;
  isImportant?: boolean;
  folder?: 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

// Types de réponses API
export interface EmailApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 🔧 Classe principale du service Email avec backend intégré
export class EmailService {
  private baseUrl = '/api/mail-system';

  // 📋 Récupérer la liste des emails avec pagination - BACKEND INTÉGRÉ
  async getEmails(options: {
    folder?: string;
    page?: number;
    limit?: number;
    sort?: 'date' | 'subject' | 'from';
    order?: 'asc' | 'desc';
    unreadOnly?: boolean;
  } = {}): Promise<EmailApiResponse<{ emails: InternalEmail[]; total: number }>> {
    const params = new URLSearchParams();
    
    if (options.folder) params.append('folder', options.folder);
    if (options.page) params.append('page', String(options.page));
    if (options.limit) params.append('limit', String(options.limit));
    if (options.sort) params.append('sort', options.sort);
    if (options.order) params.append('order', options.order);
    if (options.unreadOnly) params.append('unreadOnly', 'true');

    const response = await fetch(`${this.baseUrl}/emails?${params}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.json();
  }

  // ✉️ Création/envoi d'un nouvel email - BACKEND INTÉGRÉ
  async createEmail(emailData: CreateEmailRequest): Promise<EmailApiResponse<InternalEmail>> {
    const formData = new FormData();
    
    // Ajouter les données de l'email
    formData.append('to', JSON.stringify(emailData.to));
    if (emailData.cc) formData.append('cc', JSON.stringify(emailData.cc));
    if (emailData.bcc) formData.append('bcc', JSON.stringify(emailData.bcc));
    formData.append('subject', emailData.subject);
    formData.append('body', emailData.body);
    formData.append('isHtml', String(emailData.isHtml || false));
    formData.append('priority', emailData.priority || 'normal');
    formData.append('folder', emailData.folder || 'sent');

    // Ajouter les pièces jointes
    if (emailData.attachments) {
      emailData.attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });
    }

    const response = await fetch(`${this.baseUrl}/emails`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    return response.json();
  }

  // ✏️ Mise à jour d'un email existant - BACKEND INTÉGRÉ
  async updateEmail(emailId: string, data: UpdateEmailRequest): Promise<EmailApiResponse<InternalEmail>> {
    const response = await fetch(`${this.baseUrl}/emails/${emailId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    return response.json();
  }

  // 🗑️ Suppression d'un email - BACKEND INTÉGRÉ
  async deleteEmail(emailId: string, permanent: boolean = false): Promise<EmailApiResponse<void>> {
    const params = new URLSearchParams();
    if (permanent) params.append('permanent', 'true');

    const response = await fetch(`${this.baseUrl}/emails/${emailId}?${params}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    return response.json();
  }

  // 🔍 Recherche d'emails - BACKEND INTÉGRÉ
  async searchEmails(query: string, options?: {
    folder?: string;
    dateFrom?: string;
    dateTo?: string;
    hasAttachments?: boolean;
  }): Promise<EmailApiResponse<{ emails: InternalEmail[]; total: number }>> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (options?.folder) params.append('folder', options.folder);
    if (options?.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options?.dateTo) params.append('dateTo', options.dateTo);
    if (options?.hasAttachments) params.append('hasAttachments', 'true');

    const response = await fetch(`${this.baseUrl}/search?${params}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.json();
  }

  // 📊 Statistiques des emails - BACKEND INTÉGRÉ
  async getEmailStats(): Promise<EmailApiResponse<{
    total: number;
    unread: number;
    byFolder: Record<string, number>;
    byPriority: Record<string, number>;
  }>> {
    const response = await fetch(`${this.baseUrl}/stats`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.json();
  }

  // 📎 Télécharger une pièce jointe - BACKEND INTÉGRÉ
  async downloadAttachment(attachmentId: string): Promise<Blob | null> {
    try {
      const response = await fetch(`${this.baseUrl}/attachments/${attachmentId}/download`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        console.error('Erreur lors du téléchargement:', response.statusText);
        return null;
      }

      return await response.blob();
    } catch (error) {
      console.error('Erreur lors du téléchargement de la pièce jointe:', error);
      return null;
    }
  }

  // 🗑️ Supprimer une pièce jointe - BACKEND INTÉGRÉ
  async deleteAttachment(attachmentId: string): Promise<EmailApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/attachments/${attachmentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression de la pièce jointe:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // 📧 Actions en lot sur les emails - BACKEND INTÉGRÉ
  async bulkUpdateEmails(emailIds: string[], updates: {
    isRead?: boolean;
    isImportant?: boolean;
    folder?: string;
  }): Promise<EmailApiResponse<void>> {
    const response = await fetch(`${this.baseUrl}/emails/bulk`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        emailIds,
        updates
      })
    });

    return response.json();
  }

  // 🗑️ Suppression en lot - BACKEND INTÉGRÉ
  async bulkDeleteEmails(emailIds: string[], permanent: boolean = false): Promise<EmailApiResponse<void>> {
    const response = await fetch(`${this.baseUrl}/emails/bulk`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        emailIds,
        permanent
      })
    });

    return response.json();
  }
}

// Instance exportée du service
export const emailService = new EmailService();
