import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { calendarService } from '../services/calendarService';
import UtopiaLoader from '../components/UtopiaLoader';
import {
  CalendarDays, Calendar as CalendarIcon, Clock, MapPin, Search, Plus, Trash2, Edit3, X,
  ChevronLeft, ChevronRight, Sliders, RefreshCw, CheckCircle, HelpCircle
} from 'lucide-react';

const CALENDAR_COLORS = {
  '1': '#7986CB', // Lavender
  '2': '#33B679', // Sage
  '3': '#8E24AA', // Grape
  '4': '#E67C73', // Flamingo
  '5': '#F6BF26', // Banana
  '6': '#F4511E', // Tangerine
  '7': '#039BE5', // Peacock
  '8': '#616161', // Graphite
  '9': '#3F51B5', // Blueberry
  '10': '#0B8043', // Basil
  '11': '#D50000', // Tomato
};

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CalendarScreen() {
  const { user } = useAuth();
  const userId = user?.uid || '';

  // Core navigation states
  const [viewMode, setViewMode] = useState('month'); // month, week, day, agenda
  const [focusedDate, setFocusedDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Connection & Data
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [events, setEvents] = useState([]);

  // Search & Filter
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Event Editor Modal
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    summary: '',
    description: '',
    location: '',
    calendarId: 'primary',
    startTime: '09:00',
    endTime: '10:00',
    date: getLocalDateString(),
    isAllDay: false,
    colorId: '1'
  });

  useEffect(() => {
    if (userId) {
      initCalendar();
    }
  }, [userId]);

  const initCalendar = async () => {
    setLoading(true);
    try {
      const connected = await calendarService.isConnected(userId);
      setIsConnected(connected);
      
      const { calendars: cals, events: evs } = await calendarService.syncAll(userId);
      setCalendars(cals);
      setEvents(evs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const success = await calendarService.connect(userId);
      if (success) {
        setIsConnected(true);
        const cals = await calendarService.getCalendars(userId);
        setCalendars(cals);
        const evs = await calendarService.getEvents(userId);
        setEvents(evs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Calendar sync? This will remove all cloud-synced items.')) return;
    setLoading(true);
    try {
      await calendarService.disconnect(userId);
      setIsConnected(false);
      const cals = await calendarService.getCalendars(userId);
      setCalendars(cals);
      const evs = await calendarService.getEvents(userId);
      setEvents(evs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { calendars: cals, events: evs } = await calendarService.syncAll(userId);
      setCalendars(cals);
      setEvents(evs);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const toggleCalendarVisibility = async (calId, selected) => {
    const updated = await calendarService.updateCalendarSelected(userId, calId, selected);
    setCalendars(updated);
    const evs = await calendarService.getEvents(userId);
    setEvents(evs);
  };

  // ──────────────────────────── Events List Logic ────────────────────────────

  const getEventsForDate = (date) => {
    const dStr = getLocalDateString(date);
    return events.filter(e => {
      const eStartStr = e.startTime.split('T')[0];
      if (e.isAllDay) {
        const eEndStr = e.endTime ? e.endTime.split('T')[0] : eStartStr;
        return dStr >= eStartStr && dStr <= eEndStr;
      }
      return dStr === eStartStr;
    }).sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      return a.startTime.localeCompare(b.startTime);
    });
  };

  const getEventColor = (event) => {
    if (event.colorId && CALENDAR_COLORS[event.colorId]) {
      return CALENDAR_COLORS[event.colorId];
    }
    const cal = calendars.find(c => c.id === event.calendarId);
    return cal?.backgroundColor || '#08BB68';
  };

  // ──────────────────────────── Search Handlers ────────────────────────────

  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim() === '') {
      setSearchResults([]);
      return;
    }
    const results = await calendarService.searchEvents(userId, val);
    setSearchResults(results);
  };

  // ──────────────────────────── CRUD Handlers ────────────────────────────

  const handleOpenCreate = (initialDate = new Date()) => {
    setEditingEvent(null);
    const start = new Date();
    start.setMinutes(0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    const pad = (n) => String(n).padStart(2, '0');

    setEventForm({
      summary: '',
      description: '',
      location: '',
      calendarId: 'primary',
      startTime: `${pad(start.getHours())}:00`,
      endTime: `${pad(end.getHours())}:00`,
      date: getLocalDateString(initialDate),
      isAllDay: false,
      colorId: '1'
    });
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (event) => {
    setEditingEvent(event);
    const startParts = event.startTime.split('T');
    const endParts = event.endTime?.split('T') || startParts;

    const pad = (n) => String(n).padStart(2, '0');

    const sTime = startParts[1] ? startParts[1].substring(0, 5) : '09:00';
    const eTime = endParts[1] ? endParts[1].substring(0, 5) : '10:00';

    setEventForm({
      summary: event.summary || '',
      description: event.description || '',
      location: event.location || '',
      calendarId: event.calendarId || 'primary',
      startTime: sTime,
      endTime: eTime,
      date: startParts[0],
      isAllDay: !!event.isAllDay,
      colorId: event.colorId || '1'
    });
    setIsEditorOpen(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.summary.trim()) return;

    let startIso = '';
    let endIso = '';

    if (eventForm.isAllDay) {
      startIso = `${eventForm.date}T00:00:00.000Z`;
      endIso = `${eventForm.date}T23:59:59.000Z`;
    } else {
      startIso = `${eventForm.date}T${eventForm.startTime}:00.000Z`;
      endIso = `${eventForm.date}T${eventForm.endTime}:00.000Z`;
    }

    const payload = {
      id: editingEvent ? editingEvent.id : '',
      calendarId: eventForm.calendarId,
      summary: eventForm.summary.trim(),
      description: eventForm.description.trim() || null,
      location: eventForm.location.trim() || null,
      startTime: startIso,
      endTime: endIso,
      isAllDay: !!eventForm.isAllDay,
      colorId: eventForm.colorId
    };

    try {
      await calendarService.saveEvent(userId, payload);
      setIsEditorOpen(false);
      const evs = await calendarService.getEvents(userId);
      setEvents(evs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await calendarService.deleteEvent(userId, eventId);
      const evs = await calendarService.getEvents(userId);
      setEvents(evs);
    } catch (e) {
      console.error(e);
    }
  };

  // ──────────────────────────── Render Month Grid ────────────────────────────

  const renderMonthGrid = () => {
    const year = focusedDate.getFullYear();
    const month = focusedDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Day grid calculation (aligning starting week cell)
    let startWeekday = firstDay.getDay(); // 0 = Sunday, 1 = Monday
    if (startWeekday === 0) startWeekday = 7; // Align to Mon-Sun index

    const daysInMonth = lastDay.getDate();
    const cells = [];

    // Empty lead cells
    for (let i = 1; i < startWeekday; i++) {
      cells.push(<div key={`empty-${i}`} className="h-14 border border-border/10 opacity-30 bg-surface/30" />);
    }

    const todayStr = getLocalDateString();
    const selectedStr = getLocalDateString(selectedDate);

    // Days grid
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dStr = getLocalDateString(date);
      const isToday = dStr === todayStr;
      const isSelected = dStr === selectedStr;
      const dayEvents = getEventsForDate(date);

      cells.push(
        <div
          key={`day-${d}`}
          onClick={() => setSelectedDate(date)}
          className={`h-14 border border-border/10 p-1 flex flex-col justify-between cursor-pointer transition-all rounded-none relative ${
            isSelected
              ? 'bg-text/5 border-text'
              : isToday
              ? 'bg-surface/50 border-border/30'
              : 'bg-card hover:bg-surface/30'
          }`}
        >
          <span
            className={`text-xs font-bold leading-none w-5 h-5 flex items-center justify-center select-none ${
              isToday
                ? 'bg-text text-bg rounded-none'
                : isSelected
                ? 'text-text font-black'
                : 'text-sub'
            }`}
          >
            {d}
          </span>

          {dayEvents.length > 0 && (
            <div className="flex gap-0.5 justify-center flex-wrap select-none mt-1">
              {dayEvents.slice(0, 3).map((e, idx) => (
                <span
                  key={idx}
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: getEventColor(e) }}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="card-premium-mono p-4 rounded-none font-sans select-none animate-fadeIn">
        
        {/* Month grid headers */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] uppercase tracking-wider text-dim mb-3">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="py-1">{day}</div>
          ))}
        </div>

        {/* Days grid layout */}
        <div className="grid grid-cols-7 gap-1">
          {cells}
        </div>

      </div>
    );
  };

  // ──────────────────────────── Render Agenda/List View ────────────────────────────

  const renderAgendaView = () => {
    const upcomingEvents = events.filter(e => {
      const todayStr = getLocalDateString();
      const eDate = e.startTime.split('T')[0];
      return eDate >= todayStr;
    });

    return (
      <div className="space-y-6 font-sans select-none animate-fadeIn">
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-20 card-premium-mono p-8 rounded-none">
            <HelpCircle className="mx-auto text-dim mb-4" size={32} />
            <h3 className="font-serif font-light text-xl uppercase text-text mb-2">No upcoming events</h3>
            <p className="text-xs text-dim">Add class routines, deadlines, and task alerts to fill up your agenda guide.</p>
          </div>
        ) : (
          upcomingEvents.map(event => renderEventCard(event, true))
        )}
      </div>
    );
  };

  // ──────────────────────────── Render Weekly/Daily Timeline ────────────────────────────

  const renderHourlyTimeline = (targetDate) => {
    const dayEvents = getEventsForDate(targetDate);
    const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7 AM to 10 PM

    return (
      <div className="card-premium-mono p-4 rounded-none font-sans select-none animate-fadeIn">
        <div className="relative border-l border-border/20 pl-4 space-y-4">
          
          {hours.map(hour => {
            const timeStr = `${String(hour).padStart(2, '0')}:00`;
            const matchingEvents = dayEvents.filter(e => {
              if (e.isAllDay) return false;
              const startHr = parseInt(e.startTime.split('T')[1]?.split(':')[0]) || 0;
              return startHr === hour;
            });

            return (
              <div key={hour} className="relative min-h-[64px] border-b border-border/5 pb-2">
                
                {/* Hour label */}
                <div className="absolute -left-16 text-[10px] font-bold text-dim w-12 text-right">
                  {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                </div>

                {/* Event items container */}
                <div className="space-y-2">
                  {matchingEvents.length === 0 ? (
                    <div className="h-6" />
                  ) : (
                    matchingEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={() => handleOpenEdit(event)}
                        className="p-3 border-l-4 border bg-surface/30 cursor-pointer hover:bg-surface transition-all flex items-start justify-between rounded-none"
                        style={{ borderLeftColor: getEventColor(event), borderColor: 'var(--border)' }}
                      >
                        <div className="min-w-0 flex-grow pr-3">
                          <h5 className="text-xs font-serif uppercase tracking-tight text-text truncate mb-0.5">
                            {event.summary}
                          </h5>
                          {event.location && (
                            <p className="text-[10px] text-dim flex items-center gap-1">
                              <MapPin size={9} /> {event.location}
                            </p>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-dim bg-surface border border-border/10 px-1 py-0.5">
                          {event.startTime.split('T')[1]?.substring(0, 5)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

              </div>
            );
          })}

          {/* All day events block */}
          {dayEvents.filter(e => e.isAllDay).length > 0 && (
            <div className="mt-6 pt-4 border-t border-border/20">
              <span className="text-[9px] font-black text-dim uppercase tracking-wider block mb-2">ALL DAY EVENTS</span>
              {dayEvents.filter(e => e.isAllDay).map(event => (
                <div
                  key={event.id}
                  onClick={() => handleOpenEdit(event)}
                  className="p-2 mb-2 bg-surface/40 hover:bg-surface border-l-4 border rounded-none cursor-pointer flex items-center justify-between text-xs"
                  style={{ borderLeftColor: getEventColor(event), borderColor: 'var(--border)' }}
                >
                  <span className="font-serif uppercase tracking-tight text-text">{event.summary}</span>
                  <span className="text-[9px] font-bold text-dim">All Day</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    );
  };

  const renderEventCard = (event, showDate = false) => {
    const col = getEventColor(event);
    const startParts = event.startTime.split('T');
    const sTime = startParts[1] ? startParts[1].substring(0, 5) : null;
    const dateStr = startParts[0];

    return (
      <div
        key={event.id}
        onClick={() => handleOpenEdit(event)}
        className="card-premium-mono p-5 rounded-none flex items-start gap-4 cursor-pointer relative"
      >
        <span className="w-1.5 h-12 rounded-full shrink-0" style={{ backgroundColor: col }} />

        <div className="flex-grow min-w-0 pr-6">
          <h4 className="text-text font-serif font-light text-base md:text-[17px] tracking-tight uppercase leading-snug mb-1">
            {event.summary}
          </h4>

          {event.description && (
            <p className="text-xs text-sub leading-relaxed mb-3 truncate max-w-lg">
              {event.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-dim text-[10px] font-bold uppercase tracking-wider">
            {showDate && (
              <span className="flex items-center gap-1.5">
                <CalendarIcon size={11} /> {dateStr}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock size={11} /> {event.isAllDay ? 'All Day' : sTime}
            </span>
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={11} /> {event.location}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteEvent(event.id);
          }}
          className="absolute top-5 right-5 text-dim hover:text-red transition-colors cursor-pointer"
        >
          <Trash2 size={13} />
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-1 py-4 font-sans select-none pb-24">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-border/20">
        <div>
          <h1 className="text-4xl font-serif font-light text-text uppercase tracking-tighter leading-none flex items-center gap-3">
            Calendar <span className="font-serif italic lowercase font-light text-dim">schedule</span>
          </h1>
          <span className="editorial-text-spaced text-dim text-[8px] tracking-[0.3em] block mt-1">
            {isConnected ? 'Sync guides online' : 'Local guide fallback'}
          </span>
        </div>

        {/* Action Panel */}
        <div className="flex flex-wrap items-center gap-3 select-none">
          {isConnected && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="p-2 border border-border/30 hover:border-border bg-surface text-text rounded-none cursor-pointer flex items-center justify-center disabled:opacity-50"
              title="Refresh and sync cloud events"
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            </button>
          )}

          <button
            onClick={() => handleOpenCreate(selectedDate)}
            className="btn-premium-mono py-2 px-4 flex items-center gap-2 border border-border cursor-pointer text-bg font-sans"
          >
            <Plus size={14} className="text-bg" />
            <span className="text-[10px] font-bold uppercase tracking-wider">New Event</span>
          </button>

          <button
            onClick={() => setIsFilterOpen(true)}
            className="p-2 border border-border/30 hover:border-border bg-surface text-text rounded-none cursor-pointer flex items-center justify-center"
            title="Calendar filters"
          >
            <Sliders size={13} />
          </button>

          <button
            onClick={isConnected ? handleDisconnect : handleConnect}
            className={`px-3 py-2 border text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer ${
              isConnected
                ? 'border-red/40 hover:border-red text-red bg-transparent'
                : 'bg-text text-bg border-text'
            }`}
          >
            {isConnected ? 'Disconnect' : 'Connect GCal'}
          </button>
        </div>
      </div>

      {/* Main Core Layout */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <UtopiaLoader />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          
          {/* Main Calendar Views */}
          <div className="space-y-6">
            
            {/* View selectors */}
            <div className="flex bg-surface border border-border/20 p-0.5 rounded-none font-bold uppercase text-[9px] tracking-widest select-none">
              {['month', 'week', 'day', 'agenda'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex-grow py-2 text-center transition-colors cursor-pointer rounded-none ${
                    viewMode === mode ? 'bg-text text-bg' : 'text-sub hover:text-text'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* View panels */}
            {viewMode === 'month' && (
              <div className="space-y-6">
                
                {/* Month navigation controller */}
                <div className="flex items-center justify-between px-2 font-serif uppercase tracking-tight">
                  <button
                    onClick={() => setFocusedDate(new Date(focusedDate.getFullYear(), focusedDate.getMonth() - 1, 1))}
                    className="p-1 hover:bg-surface border border-transparent hover:border-border/10 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-lg font-light text-text">
                    {focusedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => setFocusedDate(new Date(focusedDate.getFullYear(), focusedDate.getMonth() + 1, 1))}
                    className="p-1 hover:bg-surface border border-transparent hover:border-border/10 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {renderMonthGrid()}

                {/* Day events section */}
                <div className="space-y-4">
                  <h3 className="font-serif font-light text-lg uppercase px-1">
                    Events Guide · {selectedDate.toDateString()}
                  </h3>
                  {getEventsForDate(selectedDate).length === 0 ? (
                    <div className="text-center py-8 bg-surface/30 border border-border/10 rounded-none text-xs text-dim italic">
                      No events registered for this date.
                    </div>
                  ) : (
                    getEventsForDate(selectedDate).map(e => renderEventCard(e))
                  )}
                </div>

              </div>
            )}

            {viewMode === 'week' && renderHourlyTimeline(selectedDate)}
            {viewMode === 'day' && renderHourlyTimeline(selectedDate)}
            {viewMode === 'agenda' && renderAgendaView()}

          </div>

          {/* Sidebar controls & Search */}
          <div className="space-y-6">
            
            {/* Search Box */}
            <div className="card-premium-mono p-4 rounded-none space-y-3">
              <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Search Schedule</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Query title, location..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full bg-transparent border border-border/30 focus:border-text rounded-none pl-9 pr-4 py-2 text-xs font-semibold text-text focus:outline-none transition-colors placeholder:text-dim/40"
                />
                <Search size={13} className="absolute left-3 top-3 text-dim" />
              </div>

              {searchQuery && (
                <div className="max-h-60 overflow-y-auto space-y-2 pt-2 border-t border-border/10 animate-fadeIn hide-scrollbar select-none">
                  {searchResults.length === 0 ? (
                    <div className="text-center text-[10px] text-dim italic">No events found.</div>
                  ) : (
                    searchResults.map(event => (
                      <div
                        key={event.id}
                        onClick={() => handleOpenEdit(event)}
                        className="p-2.5 bg-surface/40 hover:bg-surface border-l-3 border cursor-pointer rounded-none text-[11px] font-sans transition-all truncate"
                        style={{ borderLeftColor: getEventColor(event), borderColor: 'var(--border)' }}
                      >
                        <h5 className="font-serif uppercase tracking-tight text-text truncate mb-0.5">{event.summary}</h5>
                        <span className="text-[8px] font-bold text-dim block">{event.startTime.split('T')[0]}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Quick mini-calendar checklist */}
            <div className="card-premium-mono p-5 rounded-none space-y-4">
              <h4 className="font-serif text-sm uppercase leading-none pb-2 border-b border-border/10">Active Calendars</h4>
              <div className="space-y-3 select-none">
                {calendars.map(cal => (
                  <label key={cal.id} className="flex items-center gap-3 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={!!cal.selected}
                      onChange={(e) => toggleCalendarVisibility(cal.id, e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-text"
                    />
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cal.backgroundColor }} />
                    <span className="font-semibold text-text truncate">{cal.summary}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ──────────────────────────── EVENT EDITOR DIALOG MODAL ──────────────────────────── */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn font-sans px-4 select-none">
          <div className="w-full max-w-md bg-card border border-border p-6 shadow-2xl rounded-none relative overflow-y-auto max-h-[90vh]">
            
            <h3 className="text-xl font-serif font-light text-text uppercase mb-4 leading-none pr-6">
              {editingEvent ? 'Modify Event' : 'Schedule Event'}
            </h3>

            <button
              onClick={() => setIsEditorOpen(false)}
              className="absolute top-4 right-4 text-dim hover:text-text cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>

            <form onSubmit={handleSaveEvent} className="space-y-5">
              
              {/* Summary / Title */}
              <div className="space-y-1">
                <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Algorithms Midterm Exam"
                  value={eventForm.summary}
                  onChange={(e) => setEventForm({ ...eventForm, summary: e.target.value })}
                  className="w-full bg-transparent border border-border/30 focus:border-text rounded-none px-3.5 py-2 text-xs font-semibold text-text focus:outline-none transition-colors"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Description</label>
                <textarea
                  placeholder="Event syllabus, notes, details..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  rows={2}
                  className="w-full bg-transparent border border-border/30 focus:border-text rounded-none px-3.5 py-2 text-xs font-medium text-text focus:outline-none resize-none placeholder:text-dim/40"
                />
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Block C, Seminar Room 302"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full bg-transparent border border-border/30 focus:border-text rounded-none px-3.5 py-2 text-xs font-semibold text-text focus:outline-none"
                />
              </div>

              {/* Calendar list */}
              <div className="space-y-1">
                <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Calendar Group</label>
                <select
                  value={eventForm.calendarId}
                  onChange={(e) => setEventForm({ ...eventForm, calendarId: e.target.value })}
                  className="w-full bg-card border border-border/30 rounded-none px-3 py-2 text-xs font-bold text-text focus:outline-none"
                >
                  {calendars.filter(c => c.accessRole !== 'reader').map(c => (
                    <option key={c.id} value={c.id}>{c.summary}</option>
                  ))}
                </select>
              </div>

              {/* Date & All Day Toggle */}
              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-1">
                  <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Date</label>
                  <input
                    type="date"
                    required
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full bg-transparent border border-border/30 focus:border-text rounded-none px-3 py-1.5 text-xs font-semibold text-text focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pb-2.5 text-xs font-bold uppercase tracking-wider text-text">
                  <input
                    type="checkbox"
                    checked={eventForm.isAllDay}
                    onChange={(e) => setEventForm({ ...eventForm, isAllDay: e.target.checked })}
                    className="w-4 h-4 cursor-pointer accent-text"
                  />
                  <span>All Day</span>
                </label>
              </div>

              {/* Time pickers (conditional) */}
              {!eventForm.isAllDay && (
                <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Start Time</label>
                    <input
                      type="time"
                      required
                      value={eventForm.startTime}
                      onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                      className="w-full bg-transparent border border-border/30 focus:border-text rounded-none px-3 py-1.5 text-xs font-semibold text-text focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-text text-[9px] font-bold uppercase tracking-widest">End Time</label>
                    <input
                      type="time"
                      required
                      value={eventForm.endTime}
                      onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                      className="w-full bg-transparent border border-border/30 focus:border-text rounded-none px-3 py-1.5 text-xs font-semibold text-text focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Color accent Selection */}
              <div className="space-y-2">
                <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Category Color</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(CALENDAR_COLORS).map(([colorId, colorHex]) => (
                    <button
                      key={colorId}
                      type="button"
                      onClick={() => setEventForm({ ...eventForm, colorId: colorId })}
                      className="w-6 h-6 rounded-full cursor-pointer border flex items-center justify-center text-white"
                      style={{
                        backgroundColor: colorHex,
                        borderColor: eventForm.colorId === colorId ? 'var(--text)' : 'transparent',
                        borderWidth: eventForm.colorId === colorId ? '2px' : '0px'
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full btn-premium-mono py-3.5 px-6 border cursor-pointer text-bg font-sans"
              >
                <span>Save Event</span>
              </button>

            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────── FILTER SIDEBAR DRAWER ──────────────────────────── */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 animate-fadeIn font-sans px-4 select-none">
          <div className="w-full max-w-sm bg-card border-l border-border h-full flex flex-col p-6 shadow-2xl">
            
            <div className="flex items-center justify-between pb-4 border-b border-border/10 mb-6">
              <h3 className="text-xl font-serif font-light text-text uppercase">Calendar Groups</h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-1 hover:bg-surface border border-transparent hover:border-border/20 transition-all rounded-none cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4">
              {calendars.map(cal => (
                <div key={cal.id} className="flex items-center justify-between p-3 bg-surface/30 border border-border/5 rounded-none">
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cal.backgroundColor }} />
                    <div className="min-w-0">
                      <h4 className="font-bold text-text text-xs truncate leading-snug">{cal.summary}</h4>
                      {cal.description && <p className="text-[10px] text-dim truncate max-w-xs">{cal.description}</p>}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!cal.selected}
                    onChange={(e) => toggleCalendarVisibility(cal.id, e.target.checked)}
                    className="w-4 h-4 cursor-pointer accent-text shrink-0"
                  />
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
