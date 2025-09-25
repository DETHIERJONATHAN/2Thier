import React, { useState, useEffect, useMemo } from 'react';
import { Alert, Card, Typography, Spin, Button, Segmented, Switch, Tooltip, message, Tag, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { Lead } from '../../../types/leads';
import { BulbOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography; // Title & Paragraph retirés (non utilisés après refonte)

interface AISuggestion {
  date: string; // ISO start
  endDate: string;
  score: number; // 0-100
  reason: string; // concat des motifs
  type: 'best' | 'good' | 'ok';
  evidence?: {
    busy?: boolean;
    within48h?: boolean;
    lastContactDate?: string | Date | null;
    nextFollowUpDate?: string | Date | null;
  };
}

interface CalendarEventDTO {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
}

interface SmartCalendarProps {
  lead: Lead;
  onSelectSlot: (date: Dayjs) => void;
}

export const SmartCalendar: React.FC<SmartCalendarProps> = ({ lead, onSelectSlot }) => {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [highlightMain, setHighlightMain] = useState<boolean>(true);
  const [events, setEvents] = useState<CalendarEventDTO[]>([]);
  // Durée courante du rendez-vous (déterminée par clic = slotMinutes, ou drag = plage sélectionnée)
  const [meetingDuration, setMeetingDuration] = useState<number>(30);
  const [selectedSlot, setSelectedSlot] = useState<{ dayKey: string; minute: number } | null>(null);
  const [slotMinutes, setSlotMinutes] = useState<number>(30); // 30m ou 60m
  // Drag selection state
  const [dragging, setDragging] = useState<null | { dayKey: string; startMinute: number; currentMinute: number }>(null);
  // Plus de dropdown de durée : meetingDuration évolue dynamiquement (clic ou drag)

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!lead.id) return;
      setLoading(true); setError(null);
      try {
        console.log(`[SmartCalendar] Fetch AI suggestions for lead ${lead.id}`);
        const res = await api.get(`/api/calendar/ai-suggestions?leadId=${lead.id}`);
        const data = res.data?.data || res.data; // compat
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (err) {
        const e = err as Error;
        console.error('[SmartCalendar] Erreur suggestions:', e);
        setError(e.message || 'Chargement impossible');
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [api, lead.id]);

  // Charger préférences persistées
  useEffect(() => {
    try {
      const raw = localStorage.getItem('smartCal_prefs');
      if (raw) {
        const p = JSON.parse(raw);
        if (p.viewMode) setViewMode(p.viewMode);
        if (p.granularity) setSlotMinutes(p.granularity);
        if (typeof p.highlightMain === 'boolean') setHighlightMain(p.highlightMain);
      }
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    try { localStorage.setItem('smartCal_prefs', JSON.stringify({ viewMode, granularity: slotMinutes, highlightMain })); } catch {
      // ignore quota
    }
  }, [viewMode, slotMinutes, highlightMain]);

  const bestSuggestion = useMemo(() => suggestions.find(s => s.type === 'best') || suggestions[0], [suggestions]);

  // Calcule le lundi de la semaine (dayjs: dimanche = 0)
  const weekStart = useMemo(() => {
    const d = selectedDate;
    const day = d.day();
    if (day === 0) return d.subtract(6, 'day'); // dimanche -> lundi précédent
    if (day === 1) return d.clone();
    return d.subtract(day - 1, 'day');
  }, [selectedDate]);

  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => weekStart.add(i, 'day')), [weekStart]);

  // Fenêtre visible pour fetch events (toujours semaine pour cohérence)
  const visibleRange = useMemo(() => ({
    start: weekStart.startOf('day'),
    end: weekStart.add(6, 'day').endOf('day')
  }), [weekStart]);

  // Fetch événements
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get(`/api/calendar/events`, {
          params: {
            startDate: visibleRange.start.toISOString(),
            endDate: visibleRange.end.toISOString()
          }
        });
        setEvents(res.data || []);
      } catch {
        console.warn('[SmartCalendar] Impossible de charger les événements');
      }
    };
    fetchEvents();
  }, [api, visibleRange.start, visibleRange.end]);

  // Grouping conservé si évolution future (actuellement non utilisé dans la grille directe)

  // Anciennes collections (jour/semaine) remplacées par rendu direct de grille

  // Couleur par type (non utilisée après refonte, conservée comme référence)
  // const colorForType = (t: AISuggestion['type']) => t === 'best' ? 'green' : t === 'good' ? 'gold' : 'red';

  // Paramètres de grille (placer avant busyMap / hasConflict pour l'ordre d'initialisation)
  const startHour = 8;
  const endHour = 19; // exclusif
  const timeSlots = useMemo(() => {
    const slots: { label: string; minutes: number }[] = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += slotMinutes) {
        slots.push({ label: dayjs().hour(h).minute(m).format('HH:mm'), minutes: h * 60 + m });
      }
    }
    return slots;
  }, [startHour, endHour, slotMinutes]);

  // Construction map événements -> busy slots (doit précéder hasConflict pour dépendance dans useCallback)
  const busyMap = useMemo(() => {
    const map: Record<string, Record<number, { title?: string; start: boolean }>> = {};
    events.forEach(ev => {
      const start = dayjs(ev.startDate);
      const end = dayjs(ev.endDate || ev.startDate).add(1, 'minute');
      for (let d = start.startOf('day'); d.isBefore(end); d = d.add(1, 'day')) {
        const dayKey = d.format('YYYY-MM-DD');
        if (!map[dayKey]) map[dayKey] = {};
      }
      const dayKey = start.format('YYYY-MM-DD');
      const endKey = end.format('YYYY-MM-DD');
      if (dayKey !== endKey) return; // simplification: ignore événements multi-jours
      const daySlotsMap = map[dayKey] || (map[dayKey] = {});
      const startMin = start.hour() * 60 + start.minute();
      const endMin = end.hour() * 60 + end.minute();
      timeSlots.forEach(ts => {
        const slotStart = ts.minutes;
        if (slotStart >= startMin && slotStart < endMin) {
          daySlotsMap[slotStart] = {
            title: daySlotsMap[slotStart]?.title || (slotStart === startMin ? ev.title : undefined),
            start: slotStart === startMin
          };
        }
      });
    });
    return map;
  }, [events, timeSlots]);

  // Détection de conflit (après busyMap)
  const hasConflict = React.useCallback((dayKey: string, minute: number, duration: number) => {
    const endMinute = minute + duration;
    const dayBusy = busyMap[dayKey] || {};
    for (let m = minute; m < endMinute; m += slotMinutes) {
      if (dayBusy[m]) return true;
    }
    return false;
  }, [busyMap, slotMinutes]);

  const finalizeDrag = React.useCallback((info: { dayKey: string; startMinute: number; currentMinute: number }) => {
    const { dayKey, startMinute, currentMinute } = info;
    const minStart = Math.min(startMinute, currentMinute);
    const maxEnd = Math.max(startMinute, currentMinute) + slotMinutes; // end exclusive
    if (minStart === maxEnd - slotMinutes) {
      // simple click -> durée = slotMinutes
      if (hasConflict(dayKey, minStart, slotMinutes)) {
        message.warning('Conflit');
        return;
      }
      setMeetingDuration(slotMinutes);
      setSelectedSlot({ dayKey, minute: minStart });
      onSelectSlot(dayjs(`${dayKey}T00:00:00`).add(minStart,'minute'));
      return;
    }
    const rawDuration = maxEnd - minStart;
    const capped = Math.min(rawDuration, 120); // limite 2h
    // arrondir au multiple de slotMinutes
    const duration = Math.ceil(capped / slotMinutes) * slotMinutes;
    if (hasConflict(dayKey, minStart, duration)) {
      message.warning('Conflit');
      return;
    }
  setMeetingDuration(duration);
    setSelectedSlot({ dayKey, minute: minStart });
    onSelectSlot(dayjs(`${dayKey}T00:00:00`).add(minStart,'minute'));
  }, [slotMinutes, hasConflict, onSelectSlot]);

  const selectFreeSlot = (dayKey: string, minute: number) => {
    // fallback simple click (non drag)
    finalizeDrag({ dayKey, startMinute: minute, currentMinute: minute });
  };

  const beginDrag = (dayKey: string, minute: number) => {
    if (minute % slotMinutes !== 0) return;
    setDragging({ dayKey, startMinute: minute, currentMinute: minute });
  };
  const updateDrag = (dayKey: string, minute: number) => {
    setDragging(prev => prev && prev.dayKey === dayKey ? { ...prev, currentMinute: minute } : prev);
  };
  useEffect(() => {
    if (!dragging) return;
    const up = () => { finalizeDrag(dragging); setDragging(null); };
    const cancel = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDragging(null); } };
    window.addEventListener('mouseup', up);
    window.addEventListener('keydown', cancel);
    return () => { window.removeEventListener('mouseup', up); window.removeEventListener('keydown', cancel); };
  }, [dragging, finalizeDrag]);

  // Ajuster sélection si granularité change
  useEffect(() => {
    if (selectedSlot && selectedSlot.minute % slotMinutes !== 0) setSelectedSlot(null);
  }, [slotMinutes, selectedSlot]);

  // Ajuster si durée crée conflit
  useEffect(() => {
    if (selectedSlot) {
      if (hasConflict(selectedSlot.dayKey, selectedSlot.minute, meetingDuration)) setSelectedSlot(null);
    }
  }, [meetingDuration, selectedSlot, hasConflict]);

  const refreshEvents = async () => {
    try {
      const res = await api.get(`/api/calendar/events`, { params: { startDate: visibleRange.start.toISOString(), endDate: visibleRange.end.toISOString() } });
      setEvents(res.data || []);
    } catch {
      // ignore refresh failure
    }
  };

  const createMeeting = async () => {
    if (!selectedSlot) return;
    const { dayKey, minute } = selectedSlot;
    const start = dayjs(`${dayKey}T00:00:00`).add(minute,'minute');
    const end = start.add(meetingDuration,'minute');
    if (hasConflict(dayKey, minute, meetingDuration)) { message.error('Conflit détecté'); return; }
    try {
      const title = `RDV ${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Rendez-vous';
      await api.post('/api/calendar/events', { title, start: start.toISOString(), end: end.toISOString(), type: 'rendez-vous', status: 'planifie', description: `Créé via SmartCalendar (${meetingDuration}m)` });
      message.success('Rendez-vous créé');
      await refreshEvents();
    } catch {
      message.error('Erreur création');
    }
  };

  // ...busyMap déjà défini plus haut...

  // Index suggestions par jour & minute
  const suggestionIndex = useMemo(() => {
    const idx: Record<string, Record<number, AISuggestion>> = {};
    suggestions.forEach(s => {
      const d = dayjs(s.date);
      const dayKey = d.format('YYYY-MM-DD');
      const minute = d.hour() * 60 + d.minute();
      if (!idx[dayKey]) idx[dayKey] = {};
      idx[dayKey][minute] = s;
    });
    return idx;
  }, [suggestions]);


  // Auto-scroll vers le créneau sélectionné ou la meilleure suggestion lors des changements de semaine/vue
  const [autoScrollKey, setAutoScrollKey] = useState<string>('');
  useEffect(() => {
    const targetId = selectedSlot
      ? `slot-${selectedSlot.dayKey}-${selectedSlot.minute}`
      : (bestSuggestion ? `slot-${dayjs(bestSuggestion.date).format('YYYY-MM-DD')}-${dayjs(bestSuggestion.date).hour() * 60 + dayjs(bestSuggestion.date).minute()}` : null);
    if (!targetId) return;
  // Remplacement de 'YYYY-[W]WW' (nécessite plugin week/isoWeek) pour éviter TypeError isoWeek
  const key = `${viewMode}-${weekStart.format('YYYY-MM-DD')}-${targetId}`;
    if (key === autoScrollKey) return;
    const t = setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setAutoScrollKey(key);
      }
    }, 80);
    return () => clearTimeout(t);
  }, [selectedSlot, bestSuggestion, viewMode, weekStart, autoScrollKey]);

  // Helper portée semaine supprimé (non utilisé après refonte)

  if (loading) return <Spin tip="🧠 Analyse des créneaux..." size="large"><div style={{ height: 260 }} /></Spin>;
  if (error) return <Alert message="Erreur IA" description={error} type="error" showIcon />;

  // Ancien rendu liste supprimé

  return (
    <div className="space-y-3 my-4">
      <div className="flex flex-wrap items-center gap-3 text-xs bg-white/40 p-2 rounded border">
        <Space size={4} align="center" wrap>
          <Segmented
            options={[{ label: 'Jour', value: 'day' }, { label: 'Semaine', value: 'week' }]}
            value={viewMode}
            onChange={val => setViewMode(val as 'day' | 'week')}
            size="small"
          />
          <Segmented size="small" value={slotMinutes} onChange={v => setSlotMinutes(Number(v))}
            options={[{ label: '30m', value: 30 }, { label: '1h', value: 60 }]} />
          <Space size={2}>
            <Switch size="small" checked={highlightMain} onChange={setHighlightMain} />
            <Text type="secondary">Reco</Text>
          </Space>
          {dragging && (
            <Tag color="blue" style={{ marginLeft: 4 }}>
              Sélection: {Math.min(dragging.startMinute, dragging.currentMinute) / 60 | 0}h{(Math.min(dragging.startMinute, dragging.currentMinute)%60).toString().padStart(2,'0')} → {(Math.max(dragging.startMinute, dragging.currentMinute)+slotMinutes)/60 | 0}h{((Math.max(dragging.startMinute, dragging.currentMinute)+slotMinutes)%60).toString().padStart(2,'0')}
            </Tag>
          )}
        </Space>
        <div className="ml-auto flex items-center gap-2">
          {selectedSlot && (
            <Tag color="geekblue" className="m-0">
              {dayjs(`${selectedSlot.dayKey}T00:00:00`).add(selectedSlot.minute,'minute').format('ddd D MMM HH:mm')} · {meetingDuration}m
            </Tag>
          )}
          {selectedSlot && <Button size="small" type="primary" onClick={createMeeting}>Planifier</Button>}
          {selectedSlot && <Button size="small" onClick={() => setSelectedSlot(null)}>Annuler</Button>}
        </div>
      </div>

  {/* Ancienne barre de sélection remplacée par tags dans toolbar */}

      {highlightMain && bestSuggestion && (
        <Card size="small" className="border-green-300">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 font-medium text-green-700"><BulbOutlined /> Recommandation</span>
            <Tag color="green" className="m-0">{dayjs(bestSuggestion.date).format('ddd D MMM HH:mm')}</Tag>
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => onSelectSlot(dayjs(bestSuggestion.date))}>Choisir</Button>
            <Tooltip title={bestSuggestion.reason}><Text type="secondary" className="truncate max-w-[320px]">{bestSuggestion.reason}</Text></Tooltip>
          </div>
        </Card>
      )}

      {/* Vue JOUR */}
      {viewMode === 'day' && (
        <Card size="small" title={`Agenda du ${selectedDate.format('dddd D MMMM')}`} extra={
          <div style={{ display: 'flex', gap: 4 }}>
            <Button size="small" onClick={() => setSelectedDate(d => d.subtract(1,'day'))}>{'<'} J</Button>
            <Button size="small" onClick={() => setSelectedDate(d => d.add(1,'day'))}>J {'>'}</Button>
          </div>
        }>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="w-14" />
                  <th className="text-left p-1">{selectedDate.format('dddd D MMM')}</th>
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(ts => {
                  const dayKey = selectedDate.format('YYYY-MM-DD');
                  const busy = busyMap[dayKey]?.[ts.minutes];
                  const sugg = suggestionIndex[dayKey]?.[ts.minutes];
                  const isBest = highlightMain && sugg && sugg.date === bestSuggestion?.date;
                  const selected = selectedSlot && selectedSlot.dayKey === dayKey && ts.minutes >= selectedSlot.minute && ts.minutes < selectedSlot.minute + meetingDuration;
                  const color = sugg ? (sugg.type === 'best' ? 'bg-green-500' : sugg.type === 'good' ? 'bg-amber-500' : 'bg-red-500') : '';
                  const classes = [
                    'h-6 align-top relative cursor-pointer transition-colors border-b border-gray-50 px-1',
                    busy ? 'bg-gray-200 text-gray-500' : 'hover:bg-gray-50', // retiré hover bleu
                    isBest ? 'ring-2 ring-green-400' : ''
                  ].join(' ');
                  // drag highlighting supprimé (plus de fond coloré)
                  return (
                    <tr key={ts.minutes}>
                      <td className="text-right pr-2 text-[10px] text-gray-500 align-top">{ts.label}</td>
                      <td
                        id={`slot-${dayKey}-${ts.minutes}`}
                        className={classes} // suppression fond bleu drag
                        onMouseDown={() => { if (!busy) beginDrag(dayKey, ts.minutes); }}
                        onMouseEnter={() => { if (dragging && !busy && dragging.dayKey === dayKey) updateDrag(dayKey, ts.minutes); }}
                        onClick={() => { if (!busy && !dragging) selectFreeSlot(dayKey, ts.minutes); }}
                      >
                        {busy && busy.start && <div className="font-medium truncate text-[10px]">{busy.title}</div>}
                        {!busy && selected && (
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                        )}
                        {!busy && !selected && sugg && (
                          <Tooltip title={<div style={{ maxWidth:220 }}><strong>{dayjs(sugg.date).format('HH:mm')} (Score {Math.round(sugg.score)})</strong><br/>{sugg.reason}</div>}>
                            <div className={`w-3 h-3 rounded-full ${color} flex items-center justify-center text-[9px] text-white`}>{Math.round(sugg.score)}</div>
                          </Tooltip>
                        )}
                        {!busy && !selected && !sugg && (
                          <Tooltip title={`Libre ${dayjs(`${dayKey}T00:00:00`).add(ts.minutes,'minute').format('ddd HH:mm')}`}>
                            <div className="w-3 h-3 rounded-full border border-gray-300" />
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Vue SEMAINE */}
      {viewMode === 'week' && (
        <Card size="small" title={`Semaine du ${weekStart.format('D MMM')}`} extra={
          <div style={{ display: 'flex', gap: 4 }}>
            <Button size="small" onClick={() => setSelectedDate(d => d.subtract(1,'week'))}>{'<'} S</Button>
            <Button size="small" onClick={() => setSelectedDate(d => d.add(1,'week'))}>S {'>'}</Button>
          </div>
        }>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="w-14" />
                  {weekDays.map(d => (
                    <th key={d.toString()} className="p-1 text-left">{d.format('ddd D')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(ts => (
                  <tr key={ts.minutes}>
                    <td className="text-right pr-2 text-[10px] text-gray-500 align-top">{ts.label}</td>
                    {weekDays.map(d => {
                      const dayKey = d.format('YYYY-MM-DD');
                      const busy = busyMap[dayKey]?.[ts.minutes];
                      const sugg = suggestionIndex[dayKey]?.[ts.minutes];
                      const isBest = highlightMain && sugg && sugg.date === bestSuggestion?.date;
                      const selected = selectedSlot && selectedSlot.dayKey === dayKey && ts.minutes >= selectedSlot.minute && ts.minutes < selectedSlot.minute + meetingDuration;
                      const color = sugg ? (sugg.type === 'best' ? 'bg-green-500' : sugg.type === 'good' ? 'bg-amber-500' : 'bg-red-500') : '';
                      const classes = [
                        'h-6 align-top relative cursor-pointer transition-colors border-b border-gray-50 px-1',
                        busy ? 'bg-gray-200 text-gray-500' : 'hover:bg-gray-50', // retiré hover bleu
                        isBest ? 'ring-2 ring-green-400' : ''
                      ].join(' ');
                      // drag highlighting supprimé (plus de fond coloré)
                      return (
                        <td
                          id={`slot-${dayKey}-${ts.minutes}`}
                          key={dayKey + ts.minutes}
                          className={classes} // suppression fond bleu drag
                          onMouseDown={() => { if (!busy) beginDrag(dayKey, ts.minutes); }}
                          onMouseEnter={() => { if (dragging && !busy && dragging.dayKey === dayKey) updateDrag(dayKey, ts.minutes); }}
                          onClick={() => { if (!busy && !dragging) selectFreeSlot(dayKey, ts.minutes); }}
                        >
                          {busy && busy.start && <div className="font-medium truncate text-[10px]">{busy.title}</div>}
                          {!busy && selected && (
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                          )}
                          {!busy && !selected && sugg && (
                            <Tooltip title={<div style={{ maxWidth:220 }}><strong>{dayjs(sugg.date).format('HH:mm')} (Score {Math.round(sugg.score)})</strong><br/>{sugg.reason}</div>}>
                              <div className={`w-3 h-3 rounded-full ${color} flex items-center justify-center text-[9px] text-white`}>{Math.round(sugg.score)}</div>
                            </Tooltip>
                          )}
                          {!busy && !selected && !sugg && (
                            <Tooltip title={`Libre ${dayjs(`${dayKey}T00:00:00`).add(ts.minutes,'minute').format('ddd HH:mm')}`}>
                              <div className="w-3 h-3 rounded-full border border-gray-300" />
                            </Tooltip>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="flex gap-4 text-[11px] text-gray-600 flex-wrap">
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Best</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Bon</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> OK</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> Occupé</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-blue-400 inline-block" /> Sélection</div>
      </div>
    </div>
  );
};

export default SmartCalendar;
