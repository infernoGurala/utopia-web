import { initFocusSupabase } from './focusService';

const LOCAL_KEY_PREFIX = 'utopia_calendar_';

const localDb = {
  get(userId, key, defaultVal = null) {
    try {
      const val = localStorage.getItem(`${LOCAL_KEY_PREFIX}${userId}_${key}`);
      return val ? JSON.parse(val) : defaultVal;
    } catch {
      return defaultVal;
    }
  },
  set(userId, key, data) {
    try {
      localStorage.setItem(`${LOCAL_KEY_PREFIX}${userId}_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed for calendar:', e);
    }
  }
};

const MOCK_CALENDARS = [
  {
    id: 'primary',
    summary: 'My Utopia Schedule 🎓',
    description: 'Main academic calendar',
    backgroundColor: '#08BB68',
    foregroundColor: '#ffffff',
    selected: true,
    accessRole: 'owner'
  },
  {
    id: 'reminders_cal',
    summary: 'Habits & Reminders 🔔',
    description: 'Habit check-ins and alarm reminders',
    backgroundColor: '#1D9BF0',
    foregroundColor: '#ffffff',
    selected: true,
    accessRole: 'owner'
  },
  {
    id: 'college_events',
    summary: 'University Broadcasts 🏛️',
    description: 'General college events and deadlines',
    backgroundColor: '#FFB703',
    foregroundColor: '#ffffff',
    selected: true,
    accessRole: 'reader'
  }
];

const generateMockEvents = (userId) => {
  const today = new Date();
  const getRelativeDate = (days, hours, minutes) => {
    const d = new Date(today);
    d.setDate(today.getDate() + days);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  return [
    {
      id: 'mock_1',
      calendarId: 'primary',
      summary: 'Algorithms & Data Structures Lecture 💻',
      description: 'Topic: Dynamic Programming and Knapsack problem. Reading assignment Chapter 6.',
      location: 'Block C, Seminar Room 302',
      startTime: getRelativeDate(0, 9, 30),
      endTime: getRelativeDate(0, 11, 0),
      isAllDay: false,
      colorId: '1',
      creatorEmail: 'professor@utopia.edu',
      updatedAt: Date.now()
    },
    {
      id: 'mock_2',
      calendarId: 'primary',
      summary: 'Coffee with Research Mentor ☕',
      description: 'Discussing the graduation project proposal in Machine Learning.',
      location: 'Utopia Student Café',
      startTime: getRelativeDate(0, 14, 0),
      endTime: getRelativeDate(0, 15, 0),
      isAllDay: false,
      colorId: '5',
      creatorEmail: 'mentor@utopia.edu',
      updatedAt: Date.now()
    },
    {
      id: 'mock_3',
      calendarId: 'reminders_cal',
      summary: 'Deep Work Session 🧘',
      description: 'Utopia focus blocker: Put phone on Do Not Disturb.',
      location: 'Utopia Library Silence Zone',
      startTime: getRelativeDate(1, 10, 0),
      endTime: getRelativeDate(1, 12, 30),
      isAllDay: false,
      colorId: '3',
      updatedAt: Date.now()
    },
    {
      id: 'mock_4',
      calendarId: 'college_events',
      summary: 'Utopia Spring Hackathon 🏆',
      description: 'Annual 48-hour student hackathon. Theme: Advanced Artificial Intelligence Agents.',
      location: 'Campus Auditorium',
      startTime: getRelativeDate(-1, 9, 0),
      endTime: getRelativeDate(1, 18, 0),
      isAllDay: true,
      colorId: '10',
      updatedAt: Date.now()
    },
    {
      id: 'mock_5',
      calendarId: 'primary',
      summary: 'Final Project Submission Deadline 📝',
      description: 'Submit source code and pdf paper before 11:59 PM.',
      location: 'Utopia Student Portal',
      startTime: getRelativeDate(3, 23, 59),
      endTime: getRelativeDate(3, 23, 59),
      isAllDay: false,
      colorId: '11',
      updatedAt: Date.now()
    }
  ];
};

export const calendarService = {
  /**
   * Check if connected to Google Calendar
   */
  async isConnected(userId) {
    const token = localStorage.getItem(`utopia_gcal_token_${userId}`);
    return token !== null;
  },

  /**
   * Connect Google account
   */
  async connect(userId) {
    try {
      // Mock OAuth connect sequence for instant developer preview success
      localStorage.setItem(`utopia_gcal_token_${userId}`, 'mock_google_oauth_token');
      localStorage.setItem(`utopia_gcal_expiry_${userId}`, new Date(Date.now() + 3600 * 1000).toISOString());
      
      // Perform initial full sync
      await this.syncAll(userId);
      return true;
    } catch (e) {
      console.error('Google Calendar connection failed:', e);
      return false;
    }
  },

  /**
   * Disconnect Google Calendar
   */
  async disconnect(userId) {
    localStorage.removeItem(`utopia_gcal_token_${userId}`);
    localStorage.removeItem(`utopia_gcal_expiry_${userId}`);
    // Clear Google Calendar cache, but keep primary Utopia local events
    const calendars = localDb.get(userId, 'calendars', []);
    const filteredCalendars = calendars.filter(c => c.id === 'primary' || c.id === 'reminders_cal');
    localDb.set(userId, 'calendars', filteredCalendars);
    
    const events = localDb.get(userId, 'events', []);
    const filteredEvents = events.filter(e => e.calendarId === 'primary' || e.calendarId === 'reminders_cal');
    localDb.set(userId, 'events', filteredEvents);
  },

  /**
   * Trigger full sync
   */
  async syncAll(userId) {
    const isGoogleConnected = await this.isConnected(userId);
    
    // Ensure primary calendars exist
    let calendars = localDb.get(userId, 'calendars', null);
    if (!calendars) {
      calendars = MOCK_CALENDARS;
      localDb.set(userId, 'calendars', calendars);
    }

    // Ensure events exist
    let events = localDb.get(userId, 'events', null);
    if (!events) {
      events = generateMockEvents(userId);
      localDb.set(userId, 'events', events);
    }

    // If Google connected, sync remote calendars and events
    if (isGoogleConnected) {
      try {
        const supabase = await initFocusSupabase();
        if (supabase) {
          // Supabase sync fallback: Load user specific events
          const { data, error } = await supabase
            .from('google_calendar_events')
            .select('*')
            .eq('user_id', userId);
          if (!error && data && data.length > 0) {
            // Merge events
            const seen = new Set(events.map(e => e.id));
            data.forEach(remoteEvent => {
              if (!seen.has(remoteEvent.id)) {
                events.push({
                  id: remoteEvent.id,
                  calendarId: remoteEvent.calendar_id || 'primary',
                  summary: remoteEvent.summary,
                  description: remoteEvent.description,
                  location: remoteEvent.location,
                  startTime: remoteEvent.start_time,
                  endTime: remoteEvent.end_time,
                  isAllDay: !!remoteEvent.is_all_day,
                  timezone: remoteEvent.timezone,
                  colorId: remoteEvent.color_id,
                  hangoutLink: remoteEvent.hangout_link,
                  updatedAt: remoteEvent.updated_at
                });
              }
            });
            localDb.set(userId, 'events', events);
          }
        }
      } catch (e) {
        console.warn('Silent events Supabase sync failed, using cache:', e);
      }
    }

    return { calendars, events };
  },

  /**
   * Fetch configured calendars list
   */
  async getCalendars(userId) {
    let calendars = localDb.get(userId, 'calendars', null);
    if (!calendars) {
      calendars = MOCK_CALENDARS;
      localDb.set(userId, 'calendars', calendars);
    }
    return calendars;
  },

  /**
   * Save configured calendars list
   */
  async saveCalendars(userId, calendars) {
    localDb.set(userId, 'calendars', calendars);
  },

  /**
   * Toggle calendar visibility
   */
  async updateCalendarSelected(userId, calendarId, selected) {
    const calendars = await this.getCalendars(userId);
    const updated = calendars.map(c => c.id === calendarId ? { ...c, selected } : c);
    localDb.set(userId, 'calendars', updated);
    return updated;
  },

  /**
   * Fetch events within dates
   */
  async getEvents(userId, startDate = null, endDate = null) {
    let events = localDb.get(userId, 'events', null);
    if (!events) {
      events = generateMockEvents(userId);
      localDb.set(userId, 'events', events);
    }

    const calendars = await this.getCalendars(userId);
    const activeCalendarIds = new Set(calendars.filter(c => c.selected).map(c => c.id));

    // Filter by active calendars
    let filtered = events.filter(e => activeCalendarIds.has(e.calendarId));

    if (startDate) {
      const startMs = new Date(startDate).getTime();
      filtered = filtered.filter(e => new Date(e.startTime).getTime() >= startMs);
    }

    if (endDate) {
      const endMs = new Date(endDate).getTime();
      filtered = filtered.filter(e => new Date(e.startTime).getTime() <= endMs);
    }

    // Sort ascending by time
    filtered.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return filtered;
  },

  /**
   * Create or update an event
   */
  async saveEvent(userId, event) {
    const now = Date.now();
    const eventData = {
      ...event,
      updatedAt: now
    };
    if (!eventData.id) {
      eventData.id = `local_${Math.random().toString(36).substring(2)}${Date.now()}`;
    }

    // Write to LocalStorage
    const events = localDb.get(userId, 'events', []) || [];
    const filtered = events.filter(e => e.id !== eventData.id);
    localDb.set(userId, 'events', [eventData, ...filtered]);

    // Async push to Supabase google_calendar_events table
    try {
      const supabase = await initFocusSupabase();
      if (supabase) {
        const payload = {
          id: eventData.id,
          user_id: userId,
          calendar_id: eventData.calendarId,
          summary: eventData.summary,
          description: eventData.description,
          location: eventData.location,
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          is_all_day: !!eventData.isAllDay,
          timezone: eventData.timezone || 'UTC',
          color_id: eventData.colorId,
          hangout_link: eventData.hangoutLink,
          updated_at: now,
          is_deleted: false,
          is_dirty: true
        };
        await supabase.from('google_calendar_events').upsert(payload, { onConflict: 'id' });
      }
    } catch (e) {
      console.warn('Failed to sync event with Supabase database:', e);
    }

    return eventData;
  },

  /**
   * Delete an event
   */
  async deleteEvent(userId, eventId) {
    // 1. Delete locally
    const events = localDb.get(userId, 'events', []) || [];
    localDb.set(userId, 'events', events.filter(e => e.id !== eventId));

    // 2. Sync to Supabase
    try {
      const supabase = await initFocusSupabase();
      if (supabase) {
        if (eventId.startsWith('local_')) {
          await supabase.from('google_calendar_events').delete().eq('id', eventId);
        } else {
          // Soft delete synced items
          await supabase.from('google_calendar_events').update({
            is_deleted: true,
            is_dirty: true,
            updated_at: Date.now()
          }).eq('id', eventId);
        }
      }
    } catch (e) {
      console.warn('Failed to delete event from Supabase database:', e);
    }
  },

  /**
   * Search through events
   */
  async searchEvents(userId, query) {
    if (!query || query.trim() === '') return [];
    const events = await this.getEvents(userId);
    const q = query.toLowerCase();

    return events.filter(e => 
      (e.summary && e.summary.toLowerCase().includes(q)) || 
      (e.description && e.description.toLowerCase().includes(q)) || 
      (e.location && e.location.toLowerCase().includes(q))
    );
  }
};
