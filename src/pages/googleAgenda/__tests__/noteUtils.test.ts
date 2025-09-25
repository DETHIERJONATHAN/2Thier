import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { sortNotesByUrgency, computeNotesSummary, countNotesCompletedToday, type AgendaNote } from '../noteUtils';

describe('noteUtils', () => {
  const baseNow = dayjs('2025-09-25T10:00:00.000Z');

  it('sorts notes by overdue status, priority, due date, then start date', () => {
    const notes: AgendaNote[] = [
      { id: '1', type: 'note', status: 'active', priority: 'medium', dueDate: baseNow.add(1, 'day').toISOString(), startDate: baseNow.subtract(3, 'day').toISOString() },
      { id: '2', type: 'note', status: 'active', priority: 'urgent', dueDate: baseNow.add(2, 'day').toISOString(), startDate: baseNow.subtract(1, 'day').toISOString() },
      { id: '3', type: 'note', status: 'active', priority: 'high', dueDate: baseNow.subtract(1, 'day').toISOString(), startDate: baseNow.subtract(2, 'day').toISOString() },
      { id: '4', type: 'note', status: 'active', priority: 'low', startDate: baseNow.subtract(5, 'day').toISOString() },
    ];

    const sorted = sortNotesByUrgency(notes, baseNow);
    expect(sorted.map(note => note.id)).toEqual(['3', '2', '1', '4']);
  });

  it('computes summary metrics excluding non-note entries and completed notes', () => {
    const notes: AgendaNote[] = [
      { id: '1', type: 'note', status: 'active', dueDate: baseNow.subtract(1, 'day').toISOString() },
      { id: '2', type: 'note', status: 'active', dueDate: baseNow.add(1, 'day').toISOString() },
      { id: '3', type: 'note', status: 'done', dueDate: baseNow.add(2, 'day').toISOString() },
      { id: '4', type: 'task', status: 'active', dueDate: baseNow.add(1, 'day').toISOString() },
      { id: '5', type: 'note', status: 'active', startDate: baseNow.toISOString() },
    ];

    const summary = computeNotesSummary(notes, baseNow, { dueSoonWindowDays: 3 });
    expect(summary.totalActive).toBe(3);
    expect(summary.overdueCount).toBe(1);
    expect(summary.dueSoonCount).toBe(2);
    expect(summary.todayCount).toBe(1);
  });

  it('counts notes completed today using various completion fields', () => {
    const notes: AgendaNote[] = [
      { id: '1', type: 'note', status: 'done', completedAt: baseNow.subtract(1, 'day').toISOString() },
      { id: '2', type: 'note', status: 'done', updatedAt: baseNow.add(1, 'hour').toISOString() },
      { id: '3', type: 'note', status: 'done', endDate: baseNow.toISOString() },
      { id: '4', type: 'note', status: 'done', dueDate: baseNow.add(5, 'day').toISOString() },
    ];

    const completed = countNotesCompletedToday(notes, baseNow);
    expect(completed).toBe(2);
  });
});
