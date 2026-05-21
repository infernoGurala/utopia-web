import { createClient } from '@supabase/supabase-js';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getSupabase } from './supabase';

let focusSupabaseClient = null;
let isInitialized = false;

export const initFocusSupabase = async () => {
  if (isInitialized && focusSupabaseClient) return focusSupabaseClient;

  try {
    const configDoc = await getDoc(doc(db, 'config', 'supabase-focus-1'));
    if (configDoc.exists()) {
      const data = configDoc.data();
      const { url, anon_key } = data;
      if (url && anon_key) {
        focusSupabaseClient = createClient(url, anon_key);
        isInitialized = true;
        console.log('Focus Supabase: Dedicated configuration initialized.');
        return focusSupabaseClient;
      }
    }
  } catch (error) {
    console.warn('Dedicated supabase-focus-1 config missing, trying primary instance:', error);
  }

  // Fallback to primary client
  try {
    focusSupabaseClient = getSupabase();
    if (focusSupabaseClient) {
      isInitialized = true;
      console.log('Focus Supabase: Primary fallback active.');
      return focusSupabaseClient;
    }
  } catch (fallbackError) {
    console.error('Focus Supabase initialization fallback failed:', fallbackError);
  }

  return null;
};

export const getFocusSupabase = () => {
  return focusSupabaseClient;
};

// Helper to get local yyyy-mm-dd string from a Date object
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ----------------------------------------------------
// LOCAL STORAGE BACKUPS (Ensures 100% functional fallback)
// ----------------------------------------------------
const getLocalKey = (userId, type) => `utopia_focus_${userId}_${type}`;

const localDb = {
  get(userId, type, defaultVal = null) {
    try {
      const val = localStorage.getItem(getLocalKey(userId, type));
      return val ? JSON.parse(val) : defaultVal;
    } catch {
      return defaultVal;
    }
  },
  set(userId, type, data) {
    try {
      localStorage.setItem(getLocalKey(userId, type), JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }
};

export const focusService = {
  /**
   * Save a note: saves locally first, then attempts Supabase sync
   */
  async saveNote(userId, date, habitsState, tasks, journal) {
    const nowStr = new Date().toISOString();
    const noteObj = {
      user_id: userId,
      date,
      habits_state: habitsState,
      tasks: tasks || [],
      journal: journal || '',
      updated_at: nowStr
    };

    // 1. Write to local storage immediately
    const notesCache = localDb.get(userId, 'notes', {});
    notesCache[date] = noteObj;
    localDb.set(userId, 'notes', notesCache);

    // Derive and store local completions for streaks
    const completionsCache = localDb.get(userId, 'completions', []);
    // Clear old completions for this date
    let updatedCompletions = completionsCache.filter(c => c.date !== date);
    
    // Extract new completions from habits
    Object.entries(habitsState).forEach(([habitName, completed]) => {
      updatedCompletions.push({
        user_id: userId,
        date,
        task_name: habitName.toLowerCase().trim(),
        completed: !!completed,
        completion_count: completed ? 1 : 0
      });
    });

    // Extract new completions from tasks
    (tasks || []).forEach(task => {
      const label = task.label?.toLowerCase().trim() || '';
      if (label) {
        updatedCompletions.push({
          user_id: userId,
          date,
          task_name: label,
          completed: !!task.completed,
          completion_count: task.completed ? 1 : 0
        });
      }
    });
    localDb.set(userId, 'completions', updatedCompletions);

    // 2. Try syncing with Supabase in background
    try {
      const supabase = getFocusSupabase();
      if (!supabase) return noteObj;

      // Upsert note
      await supabase
        .from('daily_notes')
        .upsert({
          user_id: userId,
          date,
          habits_state: habitsState,
          tasks: tasks || [],
          journal: journal || '',
          updated_at: nowStr,
          created_at: nowStr
        }, { onConflict: 'user_id,date' });

      // Sync completions table
      await supabase
        .from('habit_completions')
        .delete()
        .match({ user_id: userId, date });

      const remoteCompletions = updatedCompletions.filter(c => c.date === date);
      if (remoteCompletions.length > 0) {
        await supabase.from('habit_completions').insert(remoteCompletions);
      }
    } catch (e) {
      console.warn('Supabase note sync delayed (using local cache):', e);
    }

    return noteObj;
  },

  /**
   * Load note for date
   */
  async loadNote(userId, date) {
    // Try Supabase first
    try {
      const supabase = getFocusSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('daily_notes')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .maybeSingle();

        if (!error && data) {
          // Keep local cache fresh
          const notesCache = localDb.get(userId, 'notes', {});
          notesCache[date] = data;
          localDb.set(userId, 'notes', notesCache);
          return data;
        }
      }
    } catch (e) {
      console.warn('Failed to load note from Supabase, loading from cache:', e);
    }

    // Fallback to local storage
    const notesCache = localDb.get(userId, 'notes', {});
    return notesCache[date] || null;
  },

  /**
   * Delete note
   */
  async deleteNote(userId, date) {
    // 1. Delete from local cache
    const notesCache = localDb.get(userId, 'notes', {});
    delete notesCache[date];
    localDb.set(userId, 'notes', notesCache);

    const completionsCache = localDb.get(userId, 'completions', []);
    const filtered = completionsCache.filter(c => c.date !== date);
    localDb.set(userId, 'completions', filtered);

    // 2. Try Supabase delete
    try {
      const supabase = getFocusSupabase();
      if (supabase) {
        await supabase.from('daily_notes').delete().match({ user_id: userId, date });
        await supabase.from('habit_completions').delete().match({ user_id: userId, date });
      }
    } catch (e) {
      console.warn('Supabase delete delayed (deleted locally):', e);
    }
  },

  /**
   * Get dates with notes
   */
  async getNoteDates(userId, startDate, endDate) {
    // Fallback Set from local storage
    const localDates = new Set();
    const notesCache = localDb.get(userId, 'notes', {});
    Object.keys(notesCache).forEach(date => {
      if (date >= startDate && date <= endDate) {
        localDates.add(date);
      }
    });

    try {
      const supabase = getFocusSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('daily_notes')
          .select('date')
          .eq('user_id', userId)
          .gte('date', startDate)
          .lte('date', endDate);

        if (!error && data) {
          data.forEach(d => localDates.add(d.date));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch note dates from Supabase:', e);
    }

    return localDates;
  },

  /**
   * Fetch configured habits for user
   */
  async getUserHabits(userId) {
    let habitsList = localDb.get(userId, 'user_habits', null);

    try {
      const supabase = getFocusSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('focus_user_habits')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          habitsList = data.habits;
          localDb.set(userId, 'user_habits', habitsList);
        }
      }
    } catch (e) {
      console.warn('Failed to load user habits from Supabase:', e);
    }

    return habitsList || ['Drink Water 💧', 'Read 📚', 'Meditation 🧘'];
  },

  /**
   * Save configured habits template
   */
  async saveUserHabits(userId, habits) {
    // 1. Save locally
    localDb.set(userId, 'user_habits', habits);

    // 2. Sync to Supabase
    try {
      const supabase = getFocusSupabase();
      if (supabase) {
        await supabase
          .from('focus_user_habits')
          .upsert({ user_id: userId, habits }, { onConflict: 'user_id' });
      }
    } catch (e) {
      console.warn('Failed to sync user habits to Supabase:', e);
    }
  },

  /**
   * Fetch completions for specific task/habit
   */
  async getCompletionsForTask(userId, taskName, days = 365) {
    const formattedTask = taskName.toLowerCase().trim();
    const localCompletions = localDb.get(userId, 'completions', []);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = getLocalDateString(startDate);

    // Local filter
    let results = localCompletions.filter(c => c.task_name === formattedTask && c.date >= startDateStr);

    try {
      const supabase = getFocusSupabase();
      if (supabase) {
        const endDateStr = getLocalDateString();
        const { data, error } = await supabase
          .from('habit_completions')
          .select('*')
          .eq('user_id', userId)
          .eq('task_name', formattedTask)
          .gte('date', startDateStr)
          .lte('date', endDateStr)
          .order('date', { ascending: true });

        if (!error && data && data.length > 0) {
          // Merge results preferring remote or unique
          const seen = new Set(results.map(c => c.date));
          data.forEach(c => {
            if (!seen.has(c.date)) {
              results.push(c);
            }
          });
          results.sort((a, b) => a.date.localeCompare(b.date));
        }
      }
    } catch (e) {
      console.warn('Failed to load completions from Supabase:', e);
    }

    return results;
  },

  /**
   * Get all tasks/habits ever tracked by this user
   */
  async getAllTrackedTasks(userId) {
    let localComps = localDb.get(userId, 'completions', []);

    try {
      const supabase = getFocusSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('habit_completions')
          .select('task_name, date, completed')
          .eq('user_id', userId);

        if (!error && data) {
          // Merge into local cache representation
          const merged = [...localComps];
          const keys = new Set(merged.map(c => `${c.date}_${c.task_name}`));
          data.forEach(c => {
            const k = `${c.date}_${c.task_name}`;
            if (!keys.has(k)) {
              merged.push(c);
            }
          });
          localComps = merged;
          localDb.set(userId, 'completions', merged);
        }
      }
    } catch (e) {
      console.warn('Failed to get all tracked tasks from Supabase:', e);
    }

    const taskMap = {};
    localComps.forEach(row => {
      const name = row.task_name;
      if (!taskMap[name]) {
        taskMap[name] = { task_name: name, last_active: row.date, total_completed: 0 };
      }
      if (row.date > taskMap[name].last_active) {
        taskMap[name].last_active = row.date;
      }
      if (row.completed) {
        taskMap[name].total_completed += 1;
      }
    });

    return Object.values(taskMap).sort((a, b) => b.last_active.localeCompare(a.last_active));
  },

  /**
   * Calculate current streak for task
   */
  async getCurrentStreak(userId, taskName) {
    const formattedTask = taskName.toLowerCase().trim();
    const localComps = localDb.get(userId, 'completions', []);
    
    // Filter active items
    const active = localComps.filter(c => c.task_name === formattedTask && c.completed);
    if (active.length === 0) return 0;

    // Sort descending by date
    active.sort((a, b) => b.date.localeCompare(a.date));

    const dateSet = new Set(active.map(d => d.date));
    let streak = 0;
    const now = new Date();
    let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const checkDateStr = getLocalDateString(checkDate);
    const yesterday = new Date(checkDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    // If last active was not today or yesterday, streak is broken
    if (!dateSet.has(checkDateStr) && !dateSet.has(yesterdayStr)) {
      return 0;
    }

    let dateToTest = dateSet.has(checkDateStr) ? checkDate : yesterday;

    while (true) {
      const testStr = getLocalDateString(dateToTest);
      if (dateSet.has(testStr)) {
        streak++;
        dateToTest.setDate(dateToTest.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  },

  /**
   * Calculate longest streak for task
   */
  async getLongestStreak(userId, taskName) {
    const formattedTask = taskName.toLowerCase().trim();
    const localComps = localDb.get(userId, 'completions', []);

    // Filter active items
    const active = localComps.filter(c => c.task_name === formattedTask && c.completed);
    if (active.length === 0) return 0;

    // Sort ascending by date
    active.sort((a, b) => a.date.localeCompare(b.date));

    const dates = active.map(d => new Date(d.date));
    let longest = 1;
    let current = 1;

    for (let i = 1; i < dates.length; i++) {
      const diffTime = Math.abs(dates[i] - dates[i-1]);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        current++;
        if (current > longest) longest = current;
      } else if (diffDays > 1) {
        current = 1;
      }
    }
    return longest;
  },

  /**
   * Find best active streak (must be >= 3 days)
   */
  async getBestActiveStreak(userId) {
    const tasks = await this.getAllTrackedTasks(userId);
    let bestTask = null;
    let bestStreak = 0;

    for (const t of tasks) {
      const streak = await this.getCurrentStreak(userId, t.task_name);
      if (streak >= 3 && streak > bestStreak) {
        bestStreak = streak;
        bestTask = t.task_name;
      }
    }

    if (!bestTask) return null;
    return { task_name: bestTask, streak: bestStreak };
  },

  /**
   * Get scheduled reminders
   */
  async getReminders(userId) {
    let localReminders = localDb.get(userId, 'reminders', []);

    try {
      const supabase = getFocusSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('reminders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          localReminders = data;
          localDb.set(userId, 'reminders', data);
        }
      }
    } catch (e) {
      console.warn('Failed to load reminders from Supabase:', e);
    }

    return localReminders;
  },

  /**
   * Save a reminder
   */
  async saveReminder(userId, reminder) {
    const now = new Date().toISOString();
    const reminderData = {
      ...reminder,
      user_id: userId,
      updated_at: now
    };
    if (!reminderData.id) {
      reminderData.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      reminderData.created_at = now;
    }

    // 1. Save locally
    const currentList = localDb.get(userId, 'reminders', []);
    const filteredList = currentList.filter(r => r.id !== reminderData.id);
    const newList = [reminderData, ...filteredList];
    localDb.set(userId, 'reminders', newList);

    // 2. Sync to Supabase
    try {
      const supabase = getFocusSupabase();
      if (supabase) {
        await supabase
          .from('reminders')
          .upsert(reminderData, { onConflict: 'id' });
      }
    } catch (e) {
      console.warn('Failed to sync reminder to Supabase:', e);
    }

    return reminderData;
  },

  /**
   * Delete a reminder
   */
  async deleteReminder(reminderId) {
    // 1. Delete locally
    const userId = reminderId.split('_')[0] || ''; // Fallback placeholder
    const currentList = localStorage.getItem('utopia_focus_reminders') ? JSON.parse(localStorage.getItem('utopia_focus_reminders')) : [];
    // Clean up reminders cache for any matching ID
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('utopia_focus_') && key.endsWith('_reminders')) {
        try {
          const list = JSON.parse(localStorage.getItem(key));
          const filtered = list.filter(r => r.id !== reminderId);
          localStorage.setItem(key, JSON.stringify(filtered));
        } catch {}
      }
    }

    // 2. Sync to Supabase
    try {
      const supabase = getFocusSupabase();
      if (supabase) {
        await supabase
          .from('reminders')
          .delete()
          .eq('id', reminderId);
      }
    } catch (e) {
      console.warn('Failed to delete reminder on Supabase:', e);
    }
  }
};
