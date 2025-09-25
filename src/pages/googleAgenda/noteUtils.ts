import dayjs, { Dayjs } from 'dayjs';

type NotePriority = 'low' | 'medium' | 'high' | 'urgent' | string;

type NullableDate = string | null | undefined;

export type AgendaNote = {
  id: string;
  type?: string;
  status?: string;
  priority?: NotePriority;
  dueDate?: NullableDate;
  startDate?: NullableDate;
  start?: NullableDate;
  endDate?: NullableDate;
  completedAt?: NullableDate;
  updatedAt?: NullableDate;
};

export interface NotesSummary {
  totalActive: number;
  overdueCount: number;
  dueSoonCount: number;
  todayCount: number;
}

const priorityRank: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const isOverdue = (note: AgendaNote, now: Dayjs) => {
  if (!note.dueDate) return false;
  const due = dayjs(note.dueDate);
  return due.isValid() && due.isBefore(now.startOf('day'), 'day');
};

const getPriorityOrder = (priority?: NotePriority) => {
  if (!priority) return priorityRank.medium;
  return priorityRank[priority] ?? priorityRank.medium;
};

const getComparableDate = (input?: NullableDate, fallback: number = Number.MAX_SAFE_INTEGER) => {
  if (!input) return fallback;
  const parsed = dayjs(input);
  return parsed.isValid() ? parsed.valueOf() : fallback;
};

const getDueDateValue = (note: AgendaNote) => getComparableDate(note.dueDate, Number.MAX_SAFE_INTEGER - 1);

const getStartDateValue = (note: AgendaNote) => getComparableDate(note.startDate ?? note.start);

export const sortNotesByUrgency = (notes: AgendaNote[], reference: Dayjs = dayjs()): AgendaNote[] => {
  return [...notes].sort((a, b) => {
    const aOverdue = isOverdue(a, reference);
    const bOverdue = isOverdue(b, reference);
    if (aOverdue !== bOverdue) {
      return aOverdue ? -1 : 1;
    }

    const aPriority = getPriorityOrder(a.priority);
    const bPriority = getPriorityOrder(b.priority);
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    const aDue = getDueDateValue(a);
    const bDue = getDueDateValue(b);
    if (aDue !== bDue) {
      return aDue - bDue;
    }

    return getStartDateValue(a) - getStartDateValue(b);
  });
};

export const computeNotesSummary = (
  notes: AgendaNote[],
  reference: Dayjs = dayjs(),
  options?: { dueSoonWindowDays?: number }
): NotesSummary => {
  const windowDays = options?.dueSoonWindowDays ?? 3;
  const startOfDay = reference.startOf('day');
  const endOfDay = reference.endOf('day');
  const dueSoonLimit = reference.add(windowDays, 'day').endOf('day');

  let totalActive = 0;
  let overdueCount = 0;
  let dueSoonCount = 0;
  let todayCount = 0;

  notes.forEach((note) => {
    if (note.type && note.type !== 'note') {
      return;
    }
    if (note.status === 'done') {
      return;
    }
    totalActive += 1;

    const due = note.dueDate ? dayjs(note.dueDate) : null;
    if (due?.isValid()) {
      if (due.isBefore(startOfDay, 'day')) {
        overdueCount += 1;
      } else if (due.isBetween(startOfDay, dueSoonLimit, null, '[]')) {
        dueSoonCount += 1;
        if (due.isBetween(startOfDay, endOfDay, null, '[]')) {
          todayCount += 1;
        }
      }
      return;
    }

    const start = note.startDate || note.start;
    if (!start) return;
    const startDay = dayjs(start);
    if (!startDay.isValid()) return;
    if (startDay.isBetween(startOfDay, endOfDay, null, '[]')) {
      todayCount += 1;
    }
  });

  return {
    totalActive,
    overdueCount,
    dueSoonCount,
    todayCount,
  };
};

export const countNotesCompletedToday = (notes: AgendaNote[], reference: Dayjs = dayjs()): number => {
  const startOfDay = reference.startOf('day');
  const endOfDay = reference.endOf('day');
  return notes.reduce((count, note) => {
    if (note.type && note.type !== 'note') return count;
    if (note.status !== 'done') return count;
    const completion = note.completedAt ?? note.updatedAt ?? note.endDate ?? note.dueDate;
    if (!completion) return count;
    const parsed = dayjs(completion);
    if (!parsed.isValid()) return count;
    return parsed.isBetween(startOfDay, endOfDay, null, '[]') ? count + 1 : count;
  }, 0);
};
