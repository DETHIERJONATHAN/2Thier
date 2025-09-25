// Configuration des délais par source
export const SOURCE_DEADLINES = {
  'bobex': { hours: 24, name: 'Bobex', priority: 'high' },
  'solvary': { hours: 48, name: 'Solvary', priority: 'high' },
  'website': { hours: 72, name: 'Site Web', priority: 'medium' },
  'facebook': { hours: 48, name: 'Facebook Ads', priority: 'medium' },
  'google': { hours: 24, name: 'Google Ads', priority: 'high' },
  'salon': { hours: 168, name: 'Salon', priority: 'low' }, // 7 jours
  'referral': { hours: 96, name: 'Parrainage', priority: 'medium' }, // 4 jours
  'cold_call': { hours: 24, name: 'Appel froid', priority: 'high' },
  'linkedin': { hours: 72, name: 'LinkedIn', priority: 'medium' },
  'email': { hours: 48, name: 'Email entrant', priority: 'medium' },
  'manual': { hours: 24, name: 'Saisie manuelle', priority: 'medium' },
  'direct': { hours: 24, name: 'Contact direct', priority: 'high' },
} as const;

export type SourceKey = keyof typeof SOURCE_DEADLINES;

/**
 * Calcule le statut temporel d'un lead selon sa source et sa date de création
 */
export function calculateLeadTimelineStatus(
  createdAt: string | Date,
  source: string = 'manual',
  lastContactDate?: string | Date | null
): {
  status: 'on_time' | 'warning' | 'overdue' | 'critical';
  color: 'green' | 'orange' | 'red' | 'purple';
  urgencyLevel: number; // 0-100
  remainingHours: number;
  deadlineDate: Date;
  isOverdue: boolean;
  description: string;
  lastContactHoursAgo: number | null;
} {
  const now = new Date();
  const createdDate = new Date(createdAt);
  const sourceKey = source as SourceKey;
  const sourceConfig = SOURCE_DEADLINES[sourceKey] || SOURCE_DEADLINES.manual;
  const lastContact = lastContactDate ? new Date(lastContactDate) : null;
  const lastContactHoursAgo = lastContact ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60)) : null;
  
  // Calculer la date limite
  const deadlineDate = new Date(createdDate);
  deadlineDate.setHours(deadlineDate.getHours() + sourceConfig.hours);
  
  // Calculer le temps restant en heures
  const remainingMs = deadlineDate.getTime() - now.getTime();
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  
  // Déterminer le statut
  const isOverdue = remainingHours < 0;
  const hoursUntilDeadline = Math.abs(remainingHours);
  
  let status: 'on_time' | 'warning' | 'overdue' | 'critical';
  let color: 'green' | 'orange' | 'red' | 'purple';
  let urgencyLevel: number;
  let description: string;
  
  const adjustUrgencyForContact = (level: number): number => {
    if (lastContactHoursAgo === null) {
      return level;
    }

    if (lastContactHoursAgo <= 12) {
      return Math.max(0, level - 20);
    }

    if (lastContactHoursAgo >= 72) {
      return Math.min(100, level + 15);
    }

    return level;
  };

  if (isOverdue) {
    if (hoursUntilDeadline > 72) { // Plus de 3 jours de retard
      status = 'critical';
      color = 'purple';
      urgencyLevel = 100;
      description = `Critique: ${Math.floor(hoursUntilDeadline / 24)} jours de retard`;
    } else {
      status = 'overdue';
      color = 'red';
      urgencyLevel = adjustUrgencyForContact(90 + Math.min(10, hoursUntilDeadline / 24 * 10));
      description = `En retard: ${hoursUntilDeadline}h`;
    }
  } else {
    // Calculer le pourcentage de temps écoulé
    const totalHours = sourceConfig.hours;
    const elapsedHours = totalHours - remainingHours;
    const progressPercent = (elapsedHours / totalHours) * 100;
    
    if (progressPercent < 50) {
      status = 'on_time';
      color = 'green';
      urgencyLevel = adjustUrgencyForContact(Math.max(0, progressPercent / 2));
      description = `Dans les temps: ${remainingHours}h restantes`;
    } else if (progressPercent < 80) {
      status = 'warning';
      color = 'orange';
      urgencyLevel = adjustUrgencyForContact(50 + (progressPercent - 50) * 0.8);
      description = `Attention: ${remainingHours}h restantes`;
    } else {
      status = 'warning';
      color = 'orange';
      urgencyLevel = adjustUrgencyForContact(70 + (progressPercent - 80));
      description = `Urgent: ${remainingHours}h restantes`;
    }
  }

  if (lastContactHoursAgo !== null) {
    description += ` | Dernier contact: ${lastContactHoursAgo}h`; 
  }
  
  return {
    status,
    color,
    urgencyLevel,
    remainingHours,
    deadlineDate,
    isOverdue,
    description,
    lastContactHoursAgo
  };
}

/**
 * Calcule l'impact d'un lead sur les chiffres commerciaux
 */
export function calculateCommercialImpact(
  lead: {
    createdAt: string | Date;
    source: string;
    status: string;
    lastContactDate?: string | Date | null;
  }
): {
  impactType: 'positive' | 'neutral' | 'negative' | 'critical';
  score: number; // -100 à +100
  reason: string;
} {
  const timeline = calculateLeadTimelineStatus(
    lead.createdAt,
    lead.source,
    lead.lastContactDate
  );
  
  // Statuts considérés comme "traités"
  const treatedStatuses = ['contacted', 'meeting', 'proposal', 'won', 'lost'];
  const isTreated = treatedStatuses.includes(lead.status);
  
  // Statuts positifs
  const positiveStatuses = ['won'];
  const isWon = positiveStatuses.includes(lead.status);
  
  // Statuts de refus/non qualifié (ne comptent pas en négatif si traités dans les délais)
  const rejectedStatuses = ['lost', 'unqualified', 'not_interested'];
  const isRejected = rejectedStatuses.includes(lead.status);
  
  let impactType: 'positive' | 'neutral' | 'negative' | 'critical';
  let score: number;
  let reason: string;
  
  if (isWon) {
    impactType = 'positive';
    score = 100;
    reason = 'Client gagné';
  } else if (timeline.isOverdue && !isTreated) {
    // Lead non traité dans les délais = impact négatif
    if (timeline.status === 'critical') {
      impactType = 'critical';
      score = -100;
      reason = `Non traité depuis ${Math.floor(Math.abs(timeline.remainingHours) / 24)} jours`;
    } else {
      impactType = 'negative';
      score = -50 - Math.min(50, Math.abs(timeline.remainingHours) / 24 * 10);
      reason = `Non traité depuis ${Math.abs(timeline.remainingHours)}h`;
    }
  } else if (isRejected && !timeline.isOverdue) {
    // Lead refusé mais traité dans les délais = neutre
    impactType = 'neutral';
    score = 0;
    reason = 'Refusé mais traité dans les délais';
  } else if (isTreated) {
    // Lead traité dans les délais
    impactType = 'neutral';
    score = 20;
    reason = 'Traité dans les délais';
  } else {
    // Lead en cours, évaluer l'urgence
    if (timeline.status === 'warning') {
      impactType = 'neutral';
      score = -timeline.urgencyLevel / 2;
      reason = 'Nécessite un suivi rapide';
    } else {
      impactType = 'neutral';
      score = 10;
      reason = 'En cours de traitement';
    }
  }
  
  return { impactType, score, reason };
}

/**
 * Génère des recommandations IA pour un lead
 */
export function generateLeadRecommendations(
  lead: {
    id: string;
    createdAt: string | Date;
    source: string;
    status: string;
    lastContactDate?: string | Date | null;
    data?: any;
  }
): {
  priority: 'low' | 'medium' | 'high' | 'critical';
  actions: string[];
  reasoning: string;
  aiSuggestion: string;
} {
  const timeline = calculateLeadTimelineStatus(
    lead.createdAt,
    lead.source,
    lead.lastContactDate
  );
  
  const impact = calculateCommercialImpact(lead);
  
  let priority: 'low' | 'medium' | 'high' | 'critical';
  const actions: string[] = [];
  let reasoning: string;
  let aiSuggestion: string;
  
  if (timeline.status === 'critical') {
    priority = 'critical';
    actions.push('Appeler immédiatement');
    actions.push('Envoyer email de relance');
    actions.push('Programmer suivi quotidien');
    reasoning = 'Lead critique avec retard important';
    aiSuggestion = '🚨 URGENT: Ce lead nécessite une action immédiate. Le retard risque d\'impacter négativement vos KPIs.';
  } else if (timeline.status === 'overdue') {
    priority = 'high';
    actions.push('Contacter prioritairement');
    actions.push('Vérifier les coordonnées');
    reasoning = 'Lead en retard, impact commercial négatif';
    aiSuggestion = '⚠️ Lead en retard: Contactez rapidement pour limiter l\'impact sur vos objectifs.';
  } else if (timeline.status === 'warning') {
    priority = 'high';
    actions.push('Planifier contact aujourd\'hui');
    actions.push('Préparer argumentaire adapté');
    reasoning = 'Délai serré, action requise';
    aiSuggestion = '🎯 Fenêtre d\'opportunité: Contactez ce lead aujourd\'hui pour maximiser vos chances.';
  } else {
    priority = 'medium';
    actions.push('Suivre le processus standard');
    reasoning = 'Lead dans les délais';
    aiSuggestion = '✅ Lead sous contrôle: Suivez votre processus habituel.';
  }

  switch (impact.impactType) {
    case 'positive':
      aiSuggestion += ` 🎉 Impact positif (+${impact.score}).`;
      break;
    case 'negative':
      actions.push('Planifier une revue commerciale');
      aiSuggestion += ` 📉 Impact négatif (${impact.score}).`;
      break;
    case 'critical':
      priority = 'critical';
      actions.unshift('Analyser les pertes potentielles');
      reasoning += ' Impact commercial critique.';
      aiSuggestion = `🚨 Impact critique (${impact.score}). Mobilisez l'équipe commerciale immédiatement.`;
      break;
    default:
      aiSuggestion += ` ℹ️ Impact neutre (${impact.score}).`;
  }
  
  // Ajouts selon la source
  const sourceKey = lead.source as SourceKey;
  const sourceConfig = SOURCE_DEADLINES[sourceKey];
  if (sourceConfig?.priority === 'high') {
    if (priority === 'medium') priority = 'high';
    aiSuggestion += ` Source ${sourceConfig.name} à haute priorité.`;
  }
  
  return { priority, actions, reasoning, aiSuggestion };
}

/**
 * Alias simple pour calculateLeadTimelineStatus (compatibilité Kanban)
 */
export function calculateLeadTimeline(
  createdAt: string | Date,
  source: string = 'manual'
) {
  return calculateLeadTimelineStatus(createdAt, source);
}

/**
 * Détermine la priorité d'un lead (compatibilité Kanban)
 */
export function getLeadPriority(
  createdAt: string | Date,
  source: string = 'manual',
  lastContactDate?: string | Date | null
): 'low' | 'medium' | 'high' | 'critical' {
  const timeline = calculateLeadTimelineStatus(createdAt, source, lastContactDate);
  
  if (timeline.status === 'critical') return 'critical';
  if (timeline.status === 'overdue') return 'high';
  if (timeline.status === 'warning') return 'high';
  return 'medium';
}

/**
 * Retourne la couleur hexadecimale selon le statut (compatibilité Kanban)
 */
export function getTimelineColor(status: 'on_time' | 'warning' | 'overdue' | 'critical'): string {
  switch (status) {
    case 'critical': return '#722ed1'; // violet
    case 'overdue': return '#ff4d4f';  // rouge
    case 'warning': return '#fa8c16';  // orange
    case 'on_time': return '#52c41a';  // vert
    default: return '#d9d9d9';         // gris
  }
}
