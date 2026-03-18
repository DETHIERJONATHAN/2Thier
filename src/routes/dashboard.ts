import express from 'express';
import { db } from '../lib/database';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';

const router = express.Router();
const prisma = db;

// 📊 GET /api/dashboard/stats - Récupérer les statistiques du dashboard
router.get('/stats', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const isSuperAdmin = req.user?.role === 'super_admin';

    if (!organizationId && !isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Organisation ID requis ou droits super admin'
      });
    }

    // Construire les conditions de base pour les requêtes
    const whereCondition = isSuperAdmin ? {} : { organizationId };

    // Récupérer les statistiques en parallèle
    const [
      totalLeads,
      newLeadsToday,
      totalClients,
      totalUsers,
      completedLeads,
      pendingTasks,
      upcomingMeetings,
      monthlyRevenue
    ] = await Promise.all([
      // Total des leads
      prisma.lead.count({
        where: whereCondition
      }),
      
      // Nouveaux leads aujourd'hui
      prisma.lead.count({
        where: {
          ...whereCondition,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // Total clients actifs
      prisma.user.count({
        where: {
          ...whereCondition,
          status: 'active'
        }
      }),
      
      // Total utilisateurs
      prisma.user.count({
        where: whereCondition
      }),
      
      // Leads convertis (pour calculer le taux de conversion)
      prisma.lead.count({
        where: {
          ...whereCondition,
          status: 'converti'
        }
      }),
      
      // Tâches en attente (simulé pour l'instant)
      Promise.resolve(Math.floor(Math.random() * 20) + 5),
      
      // RDV à venir (simulé pour l'instant)
      Promise.resolve(Math.floor(Math.random() * 10) + 2),
      
      // CA du mois (simulé pour l'instant)
      Promise.resolve(Math.floor(Math.random() * 100000) + 50000)
    ]);

    // Calculer le taux de conversion
    const conversionRate = totalLeads > 0 ? (completedLeads / totalLeads) * 100 : 0;
    
    // Calculer la croissance mensuelle (simulé)
    const monthlyGrowth = Math.floor(Math.random() * 30) - 10; // Entre -10% et +20%

    const stats = {
      totalLeads,
      newLeadsToday,
      totalClients,
      totalUsers,
      conversionRate: Math.round(conversionRate * 10) / 10,
      pendingTasks,
      upcomingMeetings,
      totalRevenue: monthlyRevenue,
      monthlyGrowth
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ [DASHBOARD] Erreur lors de la récupération des stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 📈 GET /api/dashboard/activities - Récupérer les activités récentes RÉELLES
router.get('/activities', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const isSuperAdmin = req.user?.role === 'super_admin';
    const limit = parseInt(req.query.limit as string) || 10;

    if (!organizationId && !isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Organisation ID requis ou droits super admin'
      });
    }

    const whereCondition = isSuperAdmin ? {} : { organizationId };

    // Récupérer les vraies activités récentes
    const [
      recentLeads,
      recentEmails,
      recentCalendarEvents,
      timelineEvents
    ] = await Promise.all([
      // Leads récents
      prisma.lead.findMany({
        where: {
          ...whereCondition,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 derniers jours
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          createdAt: true,
          status: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      
      // Emails récents (si applicable)
      organizationId ? prisma.email.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 dernières heures
          },
          User: {
            UserOrganization: {
              some: {
                organizationId: organizationId
              }
            }
          }
        },
        select: {
          id: true,
          subject: true,
          from: true,
          to: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: Math.floor(limit / 2)
      }) : [],
      
      // Événements de calendrier récents
      prisma.calendarEvent.findMany({
        where: {
          ...whereCondition,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          title: true,
          description: true,
          startDate: true,
          createdAt: true,
          status: true
        },
        orderBy: { createdAt: 'desc' },
        take: Math.floor(limit / 2)
      }),
      
      // Événements de timeline
      prisma.timelineEvent.findMany({
        where: {
          ...whereCondition,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          eventType: true,
          entityType: true,
          data: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: Math.floor(limit / 2)
      })
    ]);

    // Transformer les données en format uniforme pour l'activité
    interface ActivityItem {
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: string;
      status: string;
      entityId: string;
    }
    
    const activities: ActivityItem[] = [];

    // Ajouter les leads
    recentLeads.forEach(lead => {
      activities.push({
        id: `lead-${lead.id}`,
        type: 'lead',
        title: 'Nouveau lead créé',
        description: `${lead.firstName} ${lead.lastName}${lead.company ? ` - ${lead.company}` : ''}`,
        timestamp: lead.createdAt.toISOString(),
        status: 'success',
        entityId: lead.id
      });
    });

    // Ajouter les emails
    recentEmails.forEach(email => {
      activities.push({
        id: `email-${email.id}`,
        type: 'email',
        title: 'Email reçu',
        description: email.subject || 'Sans objet',
        timestamp: email.createdAt.toISOString(),
        status: 'info',
        entityId: email.id
      });
    });

    // Ajouter les événements de calendrier
    recentCalendarEvents.forEach(event => {
      activities.push({
        id: `calendar-${event.id}`,
        type: 'meeting',
        title: event.title || 'Événement calendrier',
        description: event.description || `Prévu le ${event.startDate.toLocaleDateString('fr-FR')}`,
        timestamp: event.createdAt.toISOString(),
        status: event.status === 'confirmed' ? 'success' : 'warning',
        entityId: event.id
      });
    });

    // Ajouter les événements de timeline
    timelineEvents.forEach(event => {
      activities.push({
        id: `timeline-${event.id}`,
        type: event.entityType || 'task',
        title: event.eventType || 'Activité système',
        description: event.data ? JSON.stringify(event.data).substring(0, 100) + '...' : 'Activité automatique',
        timestamp: event.createdAt.toISOString(),
        status: 'info',
        entityId: event.id
      });
    });

    // Trier par date décroissante et limiter
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    res.json({
      success: true,
      data: sortedActivities
    });

  } catch (error) {
    console.error('❌ [DASHBOARD] Erreur lors de la récupération des activités:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des activités',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 🏆 GET /api/dashboard/top-leads - Récupérer les meilleurs leads RÉELS
router.get('/top-leads', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const isSuperAdmin = req.user?.role === 'super_admin';
    const limit = parseInt(req.query.limit as string) || 5;

    if (!organizationId && !isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Organisation ID requis ou droits super admin'
      });
    }

    const whereCondition = isSuperAdmin ? {} : { organizationId };

    // Récupérer les vrais leads avec leurs données complètes
    const topLeads = await prisma.lead.findMany({
      where: {
        ...whereCondition,
        status: {
          not: 'supprimé'
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        email: true,
        phone: true,
        status: true,
        lastContactDate: true,
        nextFollowUpDate: true,
        createdAt: true,
        updatedAt: true,
        source: true,
        notes: true,
        assignedToId: true,
        User: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        LeadStatus: {
          select: {
            name: true,
            color: true
          }
        }
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    });

    // Calculer un score basique pour chaque lead
    const leadsWithScore = topLeads.map(lead => {
      let score = 50; // Score de base

      // Bonus si contact récent
      if (lead.lastContactDate) {
        const daysSinceContact = Math.floor((Date.now() - lead.lastContactDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceContact < 7) score += 20;
        else if (daysSinceContact < 30) score += 10;
      }

      // Bonus si suivi planifié
      if (lead.nextFollowUpDate && lead.nextFollowUpDate > new Date()) {
        score += 15;
      }

      // Bonus si email et téléphone
      if (lead.email) score += 10;
      if (lead.phone) score += 10;

      // Bonus si entreprise
      if (lead.company) score += 15;

      // Bonus/malus selon statut
      switch (lead.status) {
        case 'qualifié':
        case 'négociation':
          score += 25;
          break;
        case 'nouveau':
          score += 10;
          break;
        case 'prospect':
          score += 15;
          break;
        case 'perdu':
          score -= 30;
          break;
      }

      // Limiter le score entre 0 et 100
      score = Math.max(0, Math.min(100, score));

      return {
        id: lead.id,
        nom: lead.lastName || 'N/A',
        prenom: lead.firstName || 'N/A',
        entreprise: lead.company || 'Particulier',
        email: lead.email,
        phone: lead.phone,
        status: lead.LeadStatus?.name || lead.status || 'nouveau',
        statusColor: lead.LeadStatus?.color || '#6b7280',
        score: Math.round(score),
        lastContact: lead.lastContactDate?.toISOString().split('T')[0] || null,
        nextFollowUp: lead.nextFollowUpDate?.toISOString().split('T')[0] || null,
        assignedTo: lead.User ? `${lead.User.firstName} ${lead.User.lastName}` : null,
        source: lead.source || 'Manuel',
        createdAt: lead.createdAt.toISOString(),
        notes: lead.notes?.substring(0, 100) + (lead.notes && lead.notes.length > 100 ? '...' : '') || null
      };
    });

    // Trier par score décroissant
    const sortedLeads = leadsWithScore.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      data: sortedLeads
    });

  } catch (error) {
    console.error('❌ [DASHBOARD] Erreur lors de la récupération des top leads:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des meilleurs leads',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 📅 GET /api/dashboard/tasks - Récupérer les tâches RÉELLES
router.get('/tasks', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const isSuperAdmin = req.user?.role === 'super_admin';

    if (!organizationId && !isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Organisation ID requis ou droits super admin'
      });
    }

    const whereCondition = isSuperAdmin ? {} : { organizationId };
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Récupérer les vraies tâches basées sur les leads et événements
    const [
      leadsToFollowUp,
      todayEvents,
      overdueFollowUps
    ] = await Promise.all([
      // Leads avec suivi prévu aujourd'hui
      prisma.lead.count({
        where: {
          ...whereCondition,
          nextFollowUpDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),

      // Événements d'aujourd'hui
      prisma.calendarEvent.count({
        where: {
          ...whereCondition,
          startDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),

      // Suivis en retard
      prisma.lead.count({
        where: {
          ...whereCondition,
          nextFollowUpDate: {
            lt: startOfDay
          }
        }
      })
    ]);

    const taskData = {
      pendingTasks: overdueFollowUps,
      upcomingMeetings: todayEvents,
      followUpsToday: leadsToFollowUp,
      totalTasks: overdueFollowUps + todayEvents + leadsToFollowUp
    };

    res.json({
      success: true,
      data: taskData
    });

  } catch (error) {
    console.error('❌ [DASHBOARD] Erreur lors de la récupération des tâches:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tâches',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 📊 GET /api/dashboard/analytics - Stats analytiques par rôle, avec sélection de collaborateur
router.get('/analytics', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const isSuperAdmin = req.user?.role === 'super_admin';
    const userRole = req.user?.role || 'user';
    const userId = req.user?.id;
    // Admin peut voir les stats d'un collaborateur via ?userId=xxx
    const targetUserId = (req.query.userId as string) || null;

    if (!organizationId && !isSuperAdmin) {
      return res.status(400).json({ success: false, message: 'Organisation ID requis' });
    }

    const isAdmin = isSuperAdmin || userRole === 'admin' || userRole === 'super_admin';
    const orgWhere = isSuperAdmin ? {} : { organizationId };

    // Si admin regarde un collaborateur spécifique, on vérifie qu'il est dans la même org
    let viewUserId = isAdmin && targetUserId ? targetUserId : userId;

    // === DONNÉES COMMUNES ===
    const [totalLeads, totalChantiers, chantierRevenue, convertedLeads, newLeadsThisMonth, newLeadsLastMonth] = await Promise.all([
      prisma.lead.count({ where: orgWhere }),
      prisma.chantier.count({ where: orgWhere }),
      prisma.chantier.aggregate({ where: orgWhere, _sum: { amount: true } }),
      prisma.lead.count({
        where: {
          ...orgWhere,
          LeadStatus: { name: { in: ['Gagné', 'Converti', 'Client', 'gagné', 'converti', 'client'] } }
        }
      }),
      prisma.lead.count({
        where: {
          ...orgWhere,
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }
      }),
      prisma.lead.count({
        where: {
          ...orgWhere,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
    ]);

    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 1000) / 10 : 0;
    const monthlyGrowth = newLeadsLastMonth > 0
      ? Math.round(((newLeadsThisMonth - newLeadsLastMonth) / newLeadsLastMonth) * 100)
      : (newLeadsThisMonth > 0 ? 100 : 0);
    const totalRevenue = chantierRevenue._sum.amount || 0;

    // === CHANTIERS PAR MOIS (6 derniers mois) ===
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const recentChantiers = await prisma.chantier.findMany({
      where: { ...orgWhere, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, amount: true },
    });

    const monthlyData: { month: string; chantiers: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = d.toLocaleString('fr-FR', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();
      const filtered = recentChantiers.filter(c => {
        const cd = new Date(c.createdAt);
        return cd.getFullYear() === year && cd.getMonth() === month;
      });
      monthlyData.push({
        month: monthKey,
        chantiers: filtered.length,
        revenue: filtered.reduce((sum, c) => sum + (c.amount || 0), 0),
      });
    }

    // === STATS SPÉCIFIQUES AU RÔLE ===
    let roleStats: any = {};

    if (isAdmin || userRole === 'comptable') {
      // Admin / Comptable : vue globale
      const [totalUsers, chantiersByStatus, topCommercials] = await Promise.all([
        prisma.user.count({ where: { ...orgWhere, status: 'active' } }),
        prisma.chantier.groupBy({
          by: ['statusId'],
          where: orgWhere,
          _count: true,
          _sum: { amount: true },
        }),
        prisma.lead.groupBy({
          by: ['assignedToId'],
          where: {
            ...orgWhere,
            assignedToId: { not: null },
          },
          _count: true,
          orderBy: { _count: { assignedToId: 'desc' } },
          take: 5,
        }),
      ]);

      // Enrichir les statuts chantier
      const statusNames = await prisma.chantierStatus.findMany({
        where: orgWhere,
        select: { id: true, name: true, color: true },
      });
      const enrichedStatuses = chantiersByStatus.map(s => {
        const status = statusNames.find(st => st.id === s.statusId);
        return {
          name: status?.name || 'Sans statut',
          color: status?.color || '#999',
          count: s._count,
          amount: s._sum.amount || 0,
        };
      });

      // Enrichir les top commerciaux
      const commercialIds = topCommercials.map(c => c.assignedToId).filter(Boolean) as string[];
      const commercialUsers = await prisma.user.findMany({
        where: { id: { in: commercialIds } },
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      });
      const enrichedCommercials = topCommercials.map(c => {
        const u = commercialUsers.find(u => u.id === c.assignedToId);
        return {
          userId: c.assignedToId,
          name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'Inconnu',
          avatarUrl: u?.avatarUrl,
          leadCount: c._count,
        };
      });

      roleStats = {
        type: 'admin',
        totalUsers,
        chantiersByStatus: enrichedStatuses,
        topCommercials: enrichedCommercials,
      };
    }

    if (userRole === 'commercial' || userRole === 'user') {
      // Commercial : ses leads + ses chantiers
      const [myLeads, myConvertedLeads, myChantiers, myRevenue] = await Promise.all([
        prisma.lead.count({ where: { ...orgWhere, assignedToId: viewUserId } }),
        prisma.lead.count({
          where: {
            ...orgWhere,
            assignedToId: viewUserId,
            LeadStatus: { name: { in: ['Gagné', 'Converti', 'Client', 'gagné', 'converti', 'client'] } },
          },
        }),
        prisma.chantier.count({ where: { ...orgWhere, commercialId: viewUserId } }),
        prisma.chantier.aggregate({
          where: { ...orgWhere, commercialId: viewUserId },
          _sum: { amount: true },
        }),
      ]);
      roleStats = {
        ...roleStats,
        type: roleStats.type || 'commercial',
        myLeads,
        myConvertedLeads,
        myConversion: myLeads > 0 ? Math.round((myConvertedLeads / myLeads) * 1000) / 10 : 0,
        myChantiers,
        myRevenue: myRevenue._sum.amount || 0,
      };
    }

    if (userRole === 'technicien' || userRole === 'chef_equipe' || userRole === 'contremaitre' || userRole === 'sous_traitant') {
      // Technicien & co : chantiers assignés + pointage
      const technician = await prisma.technician.findFirst({
        where: { userId: viewUserId, ...orgWhere },
        select: { id: true },
      });

      if (technician) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const [assignedChantiers, timeEntries, totalTimeThisMonth] = await Promise.all([
          prisma.chantierAssignment.count({ where: { technicianId: technician.id } }),
          prisma.timeEntry.findMany({
            where: { technicianId: technician.id, date: { gte: startOfMonth } },
            select: { durationMinutes: true, startTime: true, endTime: true, breakMinutes: true },
          }),
          prisma.timeEntry.aggregate({
            where: { technicianId: technician.id, date: { gte: startOfMonth } },
            _sum: { durationMinutes: true },
            _count: true,
          }),
        ]);

        // Calculer les heures travaillées si durationMinutes est null
        let totalMinutes = totalTimeThisMonth._sum.durationMinutes || 0;
        if (totalMinutes === 0) {
          totalMinutes = timeEntries.reduce((sum, e) => {
            if (e.durationMinutes) return sum + e.durationMinutes;
            if (e.startTime && e.endTime) {
              const diff = (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60000;
              return sum + diff - (e.breakMinutes || 0);
            }
            return sum;
          }, 0);
        }

        roleStats = {
          ...roleStats,
          type: roleStats.type || 'technicien',
          assignedChantiers,
          hoursThisMonth: Math.round(totalMinutes / 60 * 10) / 10,
          daysWorkedThisMonth: totalTimeThisMonth._count,
          technicianId: technician.id,
        };
      }
    }

    // === LISTE DES COLLABORATEURS (pour le sélecteur admin) ===
    let collaborators: any[] = [];
    if (isAdmin) {
      const users = await prisma.user.findMany({
        where: { ...orgWhere, status: 'active' },
        select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true },
        orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
      });
      collaborators = users.map(u => ({
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Sans nom',
        role: u.role,
        avatarUrl: u.avatarUrl,
      }));
    }

    res.json({
      success: true,
      data: {
        // Globaux
        totalLeads,
        convertedLeads,
        conversionRate,
        totalChantiers,
        totalRevenue,
        monthlyGrowth,
        newLeadsThisMonth,
        // Graphiques
        monthlyData,
        // Rôle
        roleStats,
        // Collaborateurs
        collaborators,
        // Meta
        viewUserId,
        viewerRole: userRole,
      },
    });
  } catch (error: any) {
    console.error('❌ [DASHBOARD] Erreur analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
