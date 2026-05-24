import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { focusService, initFocusSupabase } from '../services/focusService';
import UtopiaLoader from '../components/UtopiaLoader';
import { 
  Sparkles, Flame, Calendar, Bell, BarChart2, Plus, Trash2, Edit3, Check, 
  Square, CheckSquare, Search, ChevronLeft, ChevronRight, Info, 
  Clock, ArrowLeft, CalendarDays, BookOpen, X, Sliders, RefreshCw, AlertCircle,
  Home
} from 'lucide-react';

const SUGGESTED_HABITS = [
  'Early wake 🌅',
  'Make bed 🛏️',
  'Exercise 🏃',
  'Water 💧',
  'Read 📚',
  'Meditation 🧘',
  'Code 💻',
  'Journal ✍️',
  'Healthy eating 🍎',
  'Review goals 🎯'
];

const SLOT_STYLES = {
  morning: {
    bgImage: '/assets/welcome_bg/one_light/morning.png',
    greeting: 'Rise & Shine',
    isDarkSky: false
  },
  afternoon: {
    bgImage: '/assets/welcome_bg/one_light/afternoon.png',
    greeting: 'Stay Focused',
    isDarkSky: false
  },
  evening: {
    bgImage: '/assets/welcome_bg/one_light/evening.png',
    greeting: 'Relax & Reflect',
    isDarkSky: true
  },
  night: {
    bgImage: '/assets/welcome_bg/one_light/night.png',
    greeting: 'Quiet Night',
    isDarkSky: true
  }
};

// Helper to get local yyyy-mm-dd string from a Date object
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to parse yyyy-mm-dd string to local Date object
const parseLocalDate = (dateStr) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  return new Date(dateStr);
};

// Helper to get week start date (Monday) as a local Date object
const getWeekStart = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

export default function FocusScreen() {
  const { user } = useAuth();
  const { currentThemeId } = useTheme();
  
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState('habits'); // habits, tasks, journal, alarms, analytics
  const [focusedBubble, setFocusedBubble] = useState(null); // null, journal, alarms, analytics
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('Synced'); // Synced, Saving, Error

  // Time & Slot Setup
  const [timeSlot, setTimeSlot] = useState('morning');
  const [greetingText, setGreetingText] = useState('Rise & Shine');
  const [motivationalQuote, setMotivationalQuote] = useState('Focus on progress, not perfection.');

  // Stats Counters
  const [streakDays, setStreakDays] = useState(0);
  const [activeHabitsCount, setActiveHabitsCount] = useState(0);
  const [upcomingRemindersCount, setUpcomingRemindersCount] = useState(0);
  const [dailyNoteInsight, setDailyNoteInsight] = useState('Write today');
  const [remindersInsight, setRemindersInsight] = useState('All clear');
  const [bestStreakTask, setBestStreakTask] = useState(null);

  // Daily Note State
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [noteDates, setNoteDates] = useState(new Set());
  const [noteContent, setNoteContent] = useState({ habitsState: {}, tasks: [], journal: '' });
  const [userHabits, setUserHabits] = useState([]);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const journalTimeoutRef = useRef(null);

  // Reminders State
  const [reminders, setReminders] = useState([]);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [reminderForm, setReminderForm] = useState({
    label: '',
    type: 'one_time',
    reminder_time: '08:00',
    remind_date: getLocalDateString(),
    weekdays: [],
    month_day: 1,
    is_active: true
  });

  // Analytics State
  const [trackedTasks, setTrackedTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, habits, tasks
  const [selectedTaskForHeatmap, setSelectedTaskForHeatmap] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [heatmapStats, setHeatmapStats] = useState({ currentStreak: 0, longestStreak: 0, totalDone: 0, thisMonth: 0 });
  const [selectedCellInfo, setSelectedCellInfo] = useState(null);

  // ----------------------------------------------------
  // Initial Setup & Time Slots
  // ----------------------------------------------------
  useEffect(() => {
    const now = new Date();
    const hr = now.getHours() + now.getMinutes() / 60;
    let slot = 'night';
    if (hr >= 5 && hr < 11.5) slot = 'morning';
    else if (hr >= 11.5 && hr < 16) slot = 'afternoon';
    else if (hr >= 16 && hr < 20) slot = 'evening';
    setTimeSlot(slot);

    const greetingVariants = {
      morning: ['Rise & Shine', 'Begin Beautifully', 'Quiet Focus', 'Morning Serenity'],
      afternoon: ['Stay Focused', 'Keep Going', 'Midday Momentum', 'Pure Energy'],
      evening: ['Relax & Reflect', 'Evening Serenity', 'Unwind Quietly', 'Gentle Wind Down'],
      night: ['Deep Sleep', 'Midnight Musings', 'Quiet Mind', 'Soft Rest']
    };
    const variants = greetingVariants[slot];
    const daySeed = now.getDate() + now.getHours();
    setGreetingText(variants[daySeed % variants.length]);

    const quotes = [
      'Focus on progress, not perfection.',
      "It is not who you are underneath, it's what you do that defines you.",
      'Nothing is permanent, except change.',
      'Every day, people straighten up their hair. Why not the heart?',
      'I am not what happened to me, I am what I choose to become.',
      'When walking, walk! When eating, eat!',
      'Do what is right, not what is popular, nor what is easy.',
      'Ignorance is the mother of all evil.',
      'Regret comes from missed opportunities; discipline weighs ounces, and regret weighs tons.',
      'The more pleasure we seek, the less happy we become.',
      'Winners are not those who never fail but those who never quit.',
      'If you want to shine like the sun, first burn like the sun.',
      'The greatest sin is to think yourself weak.',
      "Don't think about doing the thing; do the thing."
    ];
    setMotivationalQuote(quotes[now.getDate() % quotes.length]);
  }, [activeTab]);

  useEffect(() => {
    if (!user) return;

    const initialize = async () => {
      setLoading(true);
      try {
        await initFocusSupabase();
        const habits = await focusService.getUserHabits(user.uid);
        setUserHabits(habits);
        await loadDashboardData();
        await handleOpenDailyNote(getLocalDateString());
      } catch (e) {
        console.error('Focus screen initialization error:', e);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [user]);

  // ----------------------------------------------------
  // Statistics Sync & Load
  // ----------------------------------------------------
  const loadDashboardData = async () => {
    if (!user) return;
    try {
      const habits = await focusService.getUserHabits(user.uid);
      setUserHabits(habits);
      setActiveHabitsCount(habits.length);

      const best = await focusService.getBestActiveStreak(user.uid);
      setStreakDays(best ? best.streak : 0);
      setBestStreakTask(best ? best.task_name : null);

      const todayStr = getLocalDateString();
      const todayNote = await focusService.loadNote(user.uid, todayStr);
      if (habits.length === 0) {
        setDailyNoteInsight('No habits configured');
      } else {
        let completedCount = 0;
        if (todayNote && todayNote.habits_state) {
          Object.entries(todayNote.habits_state).forEach(([h, completed]) => {
            if (completed && habits.includes(h)) completedCount++;
          });
        }
        const remaining = habits.length - completedCount;
        if (remaining <= 0) {
          setDailyNoteInsight('All habits completed! 🎉');
        } else {
          setDailyNoteInsight(`${remaining} remaining today`);
        }
      }

      const allReminders = await focusService.getReminders(user.uid);
      setReminders(allReminders);
      const active = allReminders.filter(r => r.is_active);
      setUpcomingRemindersCount(active.length);

      if (active.length === 0) {
        setRemindersInsight('No active alerts');
      } else {
        const nextRem = getNextReminderInsight(active);
        setRemindersInsight(nextRem);
      }
    } catch (e) {
      console.warn('Dashboard stats sync warning:', e);
    }
  };

  // ----------------------------------------------------
  // Helpers
  // ----------------------------------------------------

  function getNextReminderInsight(activeReminders) {
    const now = new Date();
    const futureReminders = [];

    activeReminders.forEach(r => {
      const timeParts = r.reminder_time.split(':');
      if (timeParts.length < 2) return;
      const hour = parseInt(timeParts[0]);
      const minute = parseInt(timeParts[1]);

      if (r.type === 'one_time') {
        if (!r.remind_date) return;
        const dateParts = r.remind_date.split('-');
        const scheduled = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]), hour, minute);
        if (scheduled > now) futureReminders.push({ reminder: r, time: scheduled });
      } else if (r.type === 'weekly') {
        if (!r.weekdays || r.weekdays.length === 0) return;
        for (let i = 0; i < 8; i++) {
          const testDate = new Date(now);
          testDate.setDate(now.getDate() + i);
          const weekday = (testDate.getDay() + 6) % 7;
          if (r.weekdays.includes(weekday)) {
            const scheduled = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate(), hour, minute);
            if (scheduled > now) {
              futureReminders.push({ reminder: r, time: scheduled });
              break;
            }
          }
        }
      } else if (r.type === 'monthly_date') {
        if (!r.month_day) return;
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), r.month_day, hour, minute);
        if (thisMonth > now) {
          futureReminders.push({ reminder: r, time: thisMonth });
        } else {
          const nextMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
          const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
          futureReminders.push({ reminder: r, time: new Date(nextYear, nextMonth, r.month_day, hour, minute) });
        }
      }
    });

    if (futureReminders.length === 0) return 'No upcoming tasks';

    futureReminders.sort((a, b) => a.time - b.time);
    const next = futureReminders[0];

    const hr = next.time.getHours();
    const min = next.time.getMinutes().toString().padStart(2, '0');
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
    const timeStr = `${displayHr}:${min} ${ampm}`;

    return `${timeStr}: ${next.reminder.label}`;
  }

  // ----------------------------------------------------
  // Actions: Navigation & Views
  // ----------------------------------------------------
  const handleOpenDailyNote = async (dateStr) => {
    const targetDate = dateStr || getLocalDateString();
    setSelectedDate(targetDate);
    setLoading(true);
    try {
      const habits = await focusService.getUserHabits(user.uid);
      setUserHabits(habits);
      
      const note = await focusService.loadNote(user.uid, targetDate);
      if (note) {
        const habitsState = { ...note.habits_state };
        habits.forEach(h => {
          if (habitsState[h] === undefined) habitsState[h] = false;
        });
        setNoteContent({
          habitsState,
          tasks: note.tasks || [],
          journal: note.journal || ''
        });
      } else {
        const habitsState = {};
        habits.forEach(h => { habitsState[h] = false; });
        setNoteContent({ habitsState, tasks: [], journal: '' });
      }

      await loadNoteDatesForWeek(getWeekStart(parseLocalDate(targetDate)));
    } catch (e) {
      console.warn('Error fetching daily note:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReminders = async () => {
    setActiveTab('reminders');
    setLoading(true);
    try {
      const allReminders = await focusService.getReminders(user.uid);
      setReminders(allReminders);
    } catch (e) {
      console.warn('Error fetching reminders:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAnalytics = async () => {
    setActiveTab('analytics');
    setSelectedTaskForHeatmap(null);
    setLoading(true);
    try {
      const tasks = await focusService.getAllTrackedTasks(user.uid);
      setTrackedTasks(tasks);
    } catch (e) {
      console.warn('Error loading tracked tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  const selectBubble = (bubbleName) => {
    setFocusedBubble(bubbleName);
    if (!bubbleName) {
      setActiveTab('dashboard');
      loadDashboardData();
    } else if (bubbleName === 'journal') {
      setActiveTab('daily_note');
      handleOpenDailyNote(selectedDate);
    } else if (bubbleName === 'alarms') {
      setActiveTab('reminders');
      handleOpenReminders();
    } else if (bubbleName === 'analytics') {
      setActiveTab('analytics');
      handleOpenAnalytics();
    }
  };

  const handleOpenHeatmap = async (taskName) => {
    setSelectedTaskForHeatmap(taskName);
    setLoading(true);
    try {
      const completions = await focusService.getCompletionsForTask(user.uid, taskName);
      setHeatmapData(completions);

      const current = await focusService.getCurrentStreak(user.uid, taskName);
      const longest = await focusService.getLongestStreak(user.uid, taskName);
      const totalDone = completions.filter(c => c.completed).length;

      const now = new Date();
      const thisMonthComps = completions.filter(c => {
        const d = new Date(c.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && c.completed;
      }).length;

      setHeatmapStats({
        currentStreak: current,
        longestStreak: longest,
        totalDone,
        thisMonth: thisMonthComps
      });
      setSelectedCellInfo(null);
    } catch (e) {
      console.error('Error rendering task heatmap:', e);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // Operations: Daily Note & Template (Optimistic UI updates)
  // ----------------------------------------------------
  const loadNoteDatesForWeek = async (start) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startStr = getLocalDateString(start);
    const endStr = getLocalDateString(end);
    try {
      const dates = await focusService.getNoteDates(user.uid, startStr, endStr);
      setNoteDates(dates);
    } catch (e) {
      console.warn('Error loading week dots:', e);
    }
  };

  const shiftWeek = async (direction) => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + 7 * direction);
    setWeekStart(newStart);
    await loadNoteDatesForWeek(newStart);
  };

  const saveDailyNote = async (updatedContent) => {
    setSaveStatus('Saving');
    try {
      await focusService.saveNote(
        user.uid,
        selectedDate,
        updatedContent.habitsState,
        updatedContent.tasks,
        updatedContent.journal
      );
      setSaveStatus('Synced');
      setNoteDates(prev => {
        const copy = new Set(prev);
        copy.add(selectedDate);
        return copy;
      });
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('Error');
    }
  };

  const toggleHabit = (habitName) => {
    const updatedHabits = {
      ...noteContent.habitsState,
      [habitName]: !noteContent.habitsState[habitName]
    };
    const updated = { ...noteContent, habitsState: updatedHabits };
    setNoteContent(updated);
    saveDailyNote(updated);
  };

  const toggleTask = (index) => {
    const updatedTasks = [...noteContent.tasks];
    updatedTasks[index] = {
      ...updatedTasks[index],
      completed: !updatedTasks[index].completed
    };
    const updated = { ...noteContent, tasks: updatedTasks };
    setNoteContent(updated);
    saveDailyNote(updated);
  };

  const addTask = (label) => {
    if (!label.trim()) return;
    const updatedTasks = [...noteContent.tasks, { label: label.trim(), completed: false }];
    const updated = { ...noteContent, tasks: updatedTasks };
    setNoteContent(updated);
    saveDailyNote(updated);
  };

  const deleteTask = (index) => {
    const updatedTasks = noteContent.tasks.filter((_, idx) => idx !== index);
    const updated = { ...noteContent, tasks: updatedTasks };
    setNoteContent(updated);
    saveDailyNote(updated);
  };

  const editTaskLabel = (index, newLabel) => {
    const updatedTasks = [...noteContent.tasks];
    updatedTasks[index] = {
      ...updatedTasks[index],
      label: newLabel
    };
    const updated = { ...noteContent, tasks: updatedTasks };
    setNoteContent(updated);
    
    if (journalTimeoutRef.current) clearTimeout(journalTimeoutRef.current);
    journalTimeoutRef.current = setTimeout(() => {
      saveDailyNote(updated);
    }, 1000);
  };

  const handleJournalChange = (e) => {
    const text = e.target.value;
    const updated = { ...noteContent, journal: text };
    setNoteContent(updated);
    setSaveStatus('Saving');

    if (journalTimeoutRef.current) clearTimeout(journalTimeoutRef.current);
    journalTimeoutRef.current = setTimeout(() => {
      saveDailyNote(updated);
    }, 1000);
  };

  const handleSaveHabitsTemplate = async (newTemplate, forceApplyToToday) => {
    try {
      await focusService.saveUserHabits(user.uid, newTemplate);
      setUserHabits(newTemplate);

      let habitsState = { ...noteContent.habitsState };
      Object.keys(habitsState).forEach(h => {
        if (!newTemplate.includes(h)) delete habitsState[h];
      });

      newTemplate.forEach(h => {
        if (habitsState[h] === undefined || forceApplyToToday) {
          habitsState[h] = false;
        }
      });

      const updated = { ...noteContent, habitsState };
      setNoteContent(updated);
      await saveDailyNote(updated);
      setIsHabitModalOpen(false);
    } catch (e) {
      console.error('Error saving habits config:', e);
    }
  };

  const handleDeleteNote = async () => {
    if (!window.confirm("Wipe logs for this date?")) return;
    setLoading(true);
    try {
      await focusService.deleteNote(user.uid, selectedDate);
      setNoteDates(prev => {
        const copy = new Set(prev);
        copy.delete(selectedDate);
        return copy;
      });
      const habitsState = {};
      userHabits.forEach(h => { habitsState[h] = false; });
      setNoteContent({ habitsState, tasks: [], journal: '' });
      setSaveStatus('Synced');
    } catch (e) {
      console.error('Delete note error:', e);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // Operations: Reminders
  // ----------------------------------------------------
  const handleToggleReminderActive = async (reminder) => {
    const updated = { ...reminder, is_active: !reminder.is_active };
    setReminders(prev => prev.map(r => r.id === reminder.id ? updated : r));
    try {
      await focusService.saveReminder(user.uid, updated);
    } catch (e) {
      console.error('Error status toggle:', e);
    }
  };

  const handleOpenNewReminderModal = () => {
    setSelectedReminder(null);
    setReminderForm({
      label: '',
      type: 'one_time',
      reminder_time: '08:00',
      remind_date: getLocalDateString(),
      weekdays: [],
      month_day: 1,
      is_active: true
    });
    setIsReminderModalOpen(true);
  };

  const handleOpenEditReminderModal = (reminder) => {
    setSelectedReminder(reminder);
    setReminderForm({
      label: reminder.label || '',
      type: reminder.type || 'one_time',
      reminder_time: reminder.reminder_time || '08:00',
      remind_date: reminder.remind_date || getLocalDateString(),
      weekdays: reminder.weekdays || [],
      month_day: reminder.month_day || 1,
      is_active: reminder.is_active !== undefined ? reminder.is_active : true
    });
    setIsReminderModalOpen(true);
  };

  const handleSaveReminder = async () => {
    if (!reminderForm.label.trim()) return;
    setLoading(true);
    try {
      const dataToSave = {
        ...reminderForm,
        id: selectedReminder?.id || null
      };
      await focusService.saveReminder(user.uid, dataToSave);
      const allReminders = await focusService.getReminders(user.uid);
      setReminders(allReminders);
      setIsReminderModalOpen(false);
    } catch (e) {
      console.error('Save reminder error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    if (!window.confirm('Delete reminder?')) return;
    setLoading(true);
    try {
      await focusService.deleteReminder(reminderId);
      setReminders(prev => prev.filter(r => r.id !== reminderId));
      setIsReminderModalOpen(false);
    } catch (e) {
      console.error('Delete error:', e);
    } finally {
      setLoading(false);
    }
  };

  const triggerBrowserPush = () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification("Utopia Focus", { body: "Routine alerts are fully primed! 🌟" });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(p => {
        if (p === "granted") new Notification("Utopia", { body: "Browser notifications successfully linked!" });
      });
    }
  };

  // ----------------------------------------------------
  // Analytics & Filtering
  // ----------------------------------------------------
  const filteredTrackedTasks = trackedTasks.filter(t => {
    const name = t.task_name.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    if (query && !name.includes(query)) return false;

    const isHabit = userHabits.map(h => h.toLowerCase().trim()).includes(name);
    if (filterType === 'habits') return isHabit;
    if (filterType === 'tasks') return !isHabit;
    return true;
  });
  const activeSlotStyle = SLOT_STYLES[timeSlot];
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fadeIn">
      {/* Dynamic Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl tracking-tight leading-none mb-2 select-none">
            <span className="font-serif font-black uppercase text-2xl md:text-3xl tracking-tight mr-2">Focus</span>
            <span className="font-serif font-light italic text-3xl md:text-4xl text-dim lowercase">& routine</span>
          </h1>
          <p className="text-dim text-xs font-serif italic">Productive space to think and grow.</p>
        </div>
      </div>

      {/* Clean segmented tab selector */}
      <div className="flex bg-surface border border-border p-0.5 rounded-none max-w-lg mb-8 overflow-x-auto hide-scrollbar select-none font-sans">
        {[
          { id: 'habits', label: 'Habits' },
          { id: 'tasks', label: 'Tasks' },
          { id: 'journal', label: 'Journal' },
          { id: 'alarms', label: 'Alarms' },
          { id: 'analytics', label: 'Analytics' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'journal') {
                handleOpenDailyNote(selectedDate);
              } else if (tab.id === 'alarms') {
                handleOpenReminders();
              } else if (tab.id === 'analytics') {
                handleOpenAnalytics();
              } else if (tab.id === 'habits' || tab.id === 'tasks') {
                handleOpenDailyNote(selectedDate);
              }
            }}
            className={`flex-grow py-2.5 px-3 text-[10px] font-bold uppercase tracking-[0.2em] rounded-none transition-colors cursor-pointer text-center whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-text text-bg'
                : 'text-sub hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center items-center py-20 select-none">
          <UtopiaLoader />
        </div>
      ) : (
        <div className="transition-all duration-300">
          
          {/* ========================================================================= */}
          {/* TAB: HABITS                                                               */}
          {/* ========================================================================= */}
          {activeTab === 'habits' && (
            <div className="space-y-6">
              {/* Date navigation bar */}
              <div className="card-premium-mono rounded-none p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="tracking-tight leading-none flex items-baseline select-none">
                      <span className="font-serif font-light italic text-xl md:text-2xl text-text capitalize mr-2">
                        {parseLocalDate(selectedDate).toLocaleDateString(undefined, { weekday: 'long' })}
                      </span>
                      <span className="font-sans font-black text-xs uppercase tracking-[0.15em] text-dim">
                        {parseLocalDate(selectedDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                      </span>
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenDailyNote(getLocalDateString())}
                      className="px-3.5 py-1.5 border border-border text-text rounded-none text-xs font-semibold hover:bg-text hover:text-bg transition-all cursor-pointer uppercase tracking-wider"
                    >
                      Today
                    </button>
                    <input 
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleOpenDailyNote(e.target.value)}
                      className="bg-bg border border-border px-3 py-1.5 rounded-none text-xs font-semibold text-text focus:outline-none focus:border-text transition-all cursor-pointer"
                    />
                  </div>
                </div>

                {/* Elegant week navigation strip */}
                <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                  <button onClick={() => shiftWeek(-1)} className="p-2 text-dim hover:text-text hover:bg-surface border border-transparent hover:border-border rounded-none transition-all cursor-pointer">
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex-grow max-w-lg mx-auto grid grid-cols-7 gap-1 font-sans">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const day = new Date(weekStart);
                      day.setDate(weekStart.getDate() + i);
                      const dayStr = getLocalDateString(day);
                      const isSelected = dayStr === selectedDate;
                      const hasNote = noteDates.has(dayStr);
                      const weekdayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

                      return (
                        <button
                          key={i}
                          onClick={() => handleOpenDailyNote(dayStr)}
                          className={`py-2 rounded-none flex flex-col items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-text text-bg font-bold scale-105' 
                              : 'text-text/70 hover:text-text hover:bg-surface'
                          }`}
                        >
                          <span className="text-[9px] font-bold tracking-widest opacity-60 uppercase">{weekdayNames[i]}</span>
                          <span className="text-xs font-bold mt-0.5">{day.getDate()}</span>
                          {hasNote && (
                            <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-bg' : 'bg-text'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={() => shiftWeek(1)} className="p-2 text-dim hover:text-text hover:bg-surface border border-transparent hover:border-border rounded-none transition-all cursor-pointer">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Habits Checklist Card */}
              <div className="card-premium-mono p-6 rounded-none space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="flex items-baseline gap-2 select-none">
                    <span className="w-1.5 h-1.5 bg-text inline-block self-center shrink-0" />
                    <span className="font-sans font-black text-[10px] uppercase tracking-[0.2em] text-text">Habits</span>
                    <span className="font-serif font-light italic text-sm text-dim lowercase">checklist</span>
                  </h3>
                  <button 
                    onClick={() => setIsHabitModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border text-xs text-text font-medium hover:bg-text hover:text-bg rounded-none transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <Edit3 size={11} />
                    <span>Edit Template</span>
                  </button>
                </div>

                {userHabits.length === 0 ? (
                  <p className="text-center text-xs text-dim italic py-6">No habits configured. Click "Edit Habits Template" to add habits.</p>
                ) : (
                  <div className="flex flex-col gap-2 pt-1 font-sans">
                    {userHabits.map(habit => {
                      const isDone = !!noteContent.habitsState[habit];
                      return (
                        <div
                          key={habit}
                          onClick={() => toggleHabit(habit)}
                          className="flex items-center gap-3 p-3.5 bg-surface border border-border/40 rounded-none cursor-pointer group transition-all duration-200 select-none"
                        >
                          <div className={`w-4 h-4 rounded-none border border-border/80 flex items-center justify-center transition-all duration-200 shrink-0 ${
                            isDone 
                              ? 'bg-text border-text text-bg' 
                              : 'border-border/60 group-hover:border-text bg-transparent'
                          }`}>
                            {isDone && <Check size={11} strokeWidth={4} />}
                          </div>
                          <span className={`text-sm font-medium transition-all duration-200 ${
                            isDone ? 'text-dim line-through opacity-75' : 'text-text font-semibold'
                          }`}>
                            {habit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: TASKS                                                                */}
          {/* ========================================================================= */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              {/* Date navigation bar */}
              <div className="card-premium-mono rounded-none p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="tracking-tight leading-none flex items-baseline select-none">
                      <span className="font-serif font-light italic text-xl md:text-2xl text-text capitalize mr-2">
                        {parseLocalDate(selectedDate).toLocaleDateString(undefined, { weekday: 'long' })}
                      </span>
                      <span className="font-sans font-black text-xs uppercase tracking-[0.15em] text-dim">
                        {parseLocalDate(selectedDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                      </span>
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenDailyNote(getLocalDateString())}
                      className="px-3.5 py-1.5 border border-border text-text rounded-none text-xs font-semibold hover:bg-text hover:text-bg transition-all cursor-pointer uppercase tracking-wider"
                    >
                      Today
                    </button>
                    <input 
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleOpenDailyNote(e.target.value)}
                      className="bg-bg border border-border px-3 py-1.5 rounded-none text-xs font-semibold text-text focus:outline-none focus:border-text transition-all cursor-pointer"
                    />
                  </div>
                </div>

                {/* Elegant week navigation strip */}
                <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                  <button onClick={() => shiftWeek(-1)} className="p-2 text-dim hover:text-text hover:bg-surface border border-transparent hover:border-border rounded-none transition-all cursor-pointer">
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex-grow max-w-lg mx-auto grid grid-cols-7 gap-1 font-sans">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const day = new Date(weekStart);
                      day.setDate(weekStart.getDate() + i);
                      const dayStr = getLocalDateString(day);
                      const isSelected = dayStr === selectedDate;
                      const hasNote = noteDates.has(dayStr);
                      const weekdayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

                      return (
                        <button
                          key={i}
                          onClick={() => handleOpenDailyNote(dayStr)}
                          className={`py-2 rounded-none flex flex-col items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-text text-bg font-bold scale-105' 
                              : 'text-text/70 hover:text-text hover:bg-surface'
                          }`}
                        >
                          <span className="text-[9px] font-bold tracking-widest opacity-60 uppercase">{weekdayNames[i]}</span>
                          <span className="text-xs font-bold mt-0.5">{day.getDate()}</span>
                          {hasNote && (
                            <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-bg' : 'bg-text'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={() => shiftWeek(1)} className="p-2 text-dim hover:text-text hover:bg-surface border border-transparent hover:border-border rounded-none transition-all cursor-pointer">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Tasks Checklist Card */}
              <div className="card-premium-mono p-6 rounded-none space-y-4">
                 <h3 className="flex items-baseline gap-2 select-none">
                    <span className="w-1.5 h-1.5 bg-text inline-block self-center shrink-0" />
                    <span className="font-sans font-black text-[10px] uppercase tracking-[0.2em] text-text">Tasks</span>
                    <span className="font-serif font-light italic text-sm text-dim lowercase">checklist</span>
                  </h3>

                <div className="space-y-1 pr-1 max-h-[300px] overflow-y-auto font-sans">
                  {noteContent.tasks.length === 0 ? (
                    <p className="text-center text-xs text-dim italic py-6">No tasks added today.</p>
                  ) : (
                    noteContent.tasks.map((task, idx) => (
                      <div key={idx} className="group flex items-center justify-between gap-3 py-2 border-b border-border/5">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button onClick={() => toggleTask(idx)} className="text-text/60 hover:text-text shrink-0 transition-colors">
                            {task.completed 
                              ? <CheckSquare size={15} className="text-text" /> 
                              : <Square size={15} className="text-text/40" />
                            }
                          </button>
                          <input 
                            type="text"
                            value={task.label}
                            onChange={(e) => editTaskLabel(idx, e.target.value)}
                            className={`w-full bg-transparent border-none focus:outline-none text-xs font-semibold text-text ${
                              task.completed ? 'line-through text-text/40' : 'text-text/90'
                            }`}
                          />
                        </div>
                        <button onClick={() => deleteTask(idx)} className="text-text/40 hover:text-red p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Task input */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.target.newTask;
                    addTask(input.value);
                    input.value = '';
                  }}
                  className="flex items-center gap-2 bg-bg border border-border p-1.5 rounded-none focus-within:border-text transition-colors font-sans"
                >
                  <input 
                    name="newTask"
                    type="text"
                    placeholder="Add task to your checklist..."
                    className="flex-1 bg-transparent px-3 text-xs font-semibold focus:outline-none text-text placeholder-text/30"
                  />
                  <button type="submit" className="p-2 btn-premium-mono rounded-none cursor-pointer flex items-center justify-center">
                    <Plus size={12} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: JOURNAL                                                              */}
          {/* ========================================================================= */}
          {activeTab === 'journal' && (
            <div className="space-y-6">
              {/* Date navigation bar */}
              <div className="glass-premium rounded-[1.75rem] p-5 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-text tracking-tight">
                      {parseLocalDate(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenDailyNote(getLocalDateString())}
                      className="px-3.5 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold hover:bg-primary/25 hover:scale-[1.02] active:scale-[0.96] transition-all cursor-pointer"
                    >
                      Today
                    </button>
                    <input 
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleOpenDailyNote(e.target.value)}
                      className="bg-bg border border-border/35 px-3 py-1.5 rounded-xl text-xs font-semibold text-text focus:outline-none focus:border-primary transition-all cursor-pointer"
                    />
                  </div>
                </div>

                {/* Elegant week navigation strip */}
                <div className="border-t border-border/10 pt-4 flex items-center justify-between">
                  <button onClick={() => shiftWeek(-1)} className="p-2 text-dim hover:text-primary hover:bg-surface/30 rounded-xl transition-all cursor-pointer">
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex-grow max-w-lg mx-auto grid grid-cols-7 gap-1">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const day = new Date(weekStart);
                      day.setDate(weekStart.getDate() + i);
                      const dayStr = getLocalDateString(day);
                      const isSelected = dayStr === selectedDate;
                      const hasNote = noteDates.has(dayStr);
                      const weekdayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

                      return (
                        <button
                          key={i}
                          onClick={() => handleOpenDailyNote(dayStr)}
                          className={`py-2 rounded-xl flex flex-col items-center justify-center premium-transition hover:scale-[1.04] active:scale-[0.95] ${
                            isSelected 
                              ? 'bg-primary text-bg font-extrabold shadow-sm scale-105' 
                              : 'text-text/70 hover:text-text hover:bg-surface/30'
                          }`}
                        >
                          <span className="text-[9px] font-extrabold tracking-widest opacity-60 uppercase">{weekdayNames[i]}</span>
                          <span className="text-xs font-extrabold mt-0.5">{day.getDate()}</span>
                          {hasNote && (
                            <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-bg' : 'bg-primary'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={() => shiftWeek(1)} className="p-2 text-dim hover:text-primary hover:bg-surface/30 rounded-xl transition-all cursor-pointer">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Journal Card */}
              <div className="card-premium-mono p-6 rounded-none flex flex-col min-h-[350px] space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="flex items-baseline gap-2 select-none">
                    <span className="w-1.5 h-1.5 bg-text inline-block self-center shrink-0" />
                    <span className="font-sans font-black text-[10px] uppercase tracking-[0.2em] text-text">Journal</span>
                    <span className="font-serif font-light italic text-sm text-dim lowercase">space</span>
                  </h3>

                  <div className="flex items-center gap-2 select-none font-sans">
                    <span className={`w-1.5 h-1.5 bg-text ${saveStatus === 'Synced' ? 'opacity-100' : 'opacity-40 animate-pulse'}`} />
                    <span className="text-[8px] text-dim font-bold uppercase tracking-wider">{saveStatus}</span>
                  </div>
                </div>

                <textarea
                  value={noteContent.journal}
                  onChange={handleJournalChange}
                  placeholder="Write down your thoughts, reflect on your day, or log ideas here. Stored live with automatic sync..."
                  className="flex-grow w-full bg-transparent border-none text-text/90 placeholder-text/30 focus:outline-none text-sm leading-relaxed tracking-wide resize-none font-sans"
                />

                <div className="flex justify-between items-center border-t border-border/5 pt-3">
                  <button 
                    onClick={handleDeleteNote}
                    className="flex items-center gap-1.5 text-[9px] text-red/80 font-bold uppercase tracking-widest hover:underline"
                  >
                    <Trash2 size={11} /> Wipe Logs
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: ALARMS                                                               */}
          {/* ========================================================================= */}
          {activeTab === 'alarms' && (
            <div className="space-y-6">
              <div className="glass-premium rounded-[1.75rem] p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                <div>
                  <h2 className="text-xl font-extrabold text-text tracking-tight">Routine Alarms</h2>
                  <p className="text-xs font-semibold text-text/60 mt-0.5">Configure desktop and browser alerts for your routines.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={triggerBrowserPush}
                    className="flex-grow sm:flex-none px-4 py-2 border border-border/35 rounded-xl text-xs font-bold text-text hover:bg-bg/50 hover:scale-[1.02] active:scale-[0.96] premium-transition cursor-pointer"
                  >
                    Test Notification
                  </button>
                  <button 
                    onClick={handleOpenNewReminderModal}
                    className="flex-grow sm:flex-none px-4 py-2 bg-primary text-bg font-extrabold rounded-xl text-xs hover:scale-[1.03] active:scale-[0.95] premium-transition cursor-pointer"
                  >
                    + Add Alarm
                  </button>
                </div>
              </div>

              {reminders.length === 0 ? (
                <p className="text-center text-xs text-dim italic py-10 bg-surface/20 border border-dashed border-border/30 rounded-[1.75rem]">
                  No alarm configs synced. Tap Add Alarm above.
                </p>
              ) : (
                <div className="space-y-3">
                  {reminders.map(r => {
                    let recurrenceText = 'One time';
                    if (r.type === 'weekly') {
                      const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                      recurrenceText = r.weekdays ? r.weekdays.map(d => names[d]).join(', ') : 'Daily';
                    } else if (r.type === 'monthly_date') {
                      recurrenceText = `Day ${r.month_day || 1}`;
                    }

                    return (
                      <div key={r.id} className="glass-premium hover:border-primary/45 rounded-2xl p-5 flex justify-between items-center gap-4 hover:scale-[1.01] active:scale-[0.99] shadow-sm">
                        <div className="space-y-1">
                          <h4 className="font-bold text-text text-sm leading-snug">{r.label}</h4>
                          <p className="text-[10px] text-text/60 font-semibold flex items-center gap-2">
                            <span>⏰ {r.reminder_time}</span>
                            <span>•</span>
                            <span>📅 {recurrenceText}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleReminderActive(r)}
                            className={`w-9 h-5 rounded-full transition-all relative cursor-pointer ${r.is_active ? 'bg-primary' : 'bg-bg border border-border/30'}`}
                          >
                            <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-bg transition-all ${r.is_active ? 'right-0.5' : 'left-0.5'}`} />
                          </button>

                          <button onClick={() => handleOpenEditReminderModal(r)} className="p-1.5 text-dim hover:text-text rounded-xl hover:bg-surface/20 transition-colors cursor-pointer">
                            <Edit3 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: ANALYTICS                                                            */}
          {/* ========================================================================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {streakDays > 0 && (
                <div className="glass-premium border-primary/20 rounded-2xl p-4 flex items-center gap-3 shadow-sm animate-fadeIn">
                  <Flame size={20} className="text-primary animate-pulse" />
                  <span className="text-xs font-bold text-text">
                    🔥 You are on a {streakDays} day streak for <span className="text-primary">{bestStreakTask}</span>! Keep it up!
                  </span>
                </div>
              )}

              {!selectedTaskForHeatmap ? (
                <>
                  {/* Search strip */}
                  <div className="glass-premium rounded-2xl p-4 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 flex items-center gap-2 bg-bg border border-border/35 px-3 py-2 rounded-xl focus-within:border-primary/50 premium-transition">
                        <Search size={14} className="text-text/60" />
                        <input 
                          type="text"
                          placeholder="Search consistency logs..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-transparent border-none focus:outline-none w-full text-xs font-semibold text-text placeholder-text/30"
                        />
                      </div>

                      <div className="flex bg-bg/50 border border-border/35 p-1 rounded-xl gap-1 shrink-0">
                        {['all', 'habits', 'tasks'].map(type => (
                          <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${filterType === type ? 'bg-primary text-bg' : 'text-text/60 hover:text-text'}`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tracked cards */}
                  {filteredTrackedTasks.length === 0 ? (
                    <p className="text-center text-xs text-dim italic py-10 bg-surface/20 border border-dashed border-border/30 rounded-[1.75rem]">
                      No tracked actions available. Complete habits in the Daily Journal.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredTrackedTasks.map(t => (
                        <button
                          key={t.task_name}
                          onClick={() => handleOpenHeatmap(t.task_name)}
                          className="glass-premium p-5 rounded-[1.75rem] flex justify-between items-center text-left hover:border-primary/45 hover:scale-[1.015] active:scale-[0.985] shadow-sm cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span className="p-2 bg-primary/10 rounded-xl text-primary"><Sparkles size={14} /></span>
                            <div>
                              <h4 className="font-bold text-text text-xs uppercase tracking-wider">{t.task_name}</h4>
                              <p className="text-[9px] text-dim font-bold uppercase tracking-widest mt-0.5">Logged {t.total_completed} times</p>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-dim" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Heatmap Widget */}
                  <div className="glass-premium rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedTaskForHeatmap(null)}
                        className="p-2 bg-bg border border-border/35 rounded-xl text-text/60 hover:text-primary hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                      >
                        <ArrowLeft size={14} />
                      </button>
                      <div>
                        <h3 className="font-extrabold text-text text-sm uppercase tracking-widest">{selectedTaskForHeatmap}</h3>
                        <p className="text-[9px] text-text/60 font-bold uppercase tracking-wider mt-0.5">365-day tracking timeline</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedTaskForHeatmap(null)}
                      className="px-4 py-2 bg-surface border border-border/35 text-xs text-text font-bold hover:bg-bg/60 rounded-xl hover:scale-[1.02] active:scale-[0.96] premium-transition cursor-pointer"
                    >
                      Back to List
                    </button>
                  </div>

                  <div className="glass-premium p-6 rounded-[1.75rem] space-y-4 shadow-sm">
                    <div className="flex gap-2">
                      <div className="flex flex-col justify-between py-1 text-[8px] text-dim font-bold uppercase h-[90px] w-3">
                        <span>M</span>
                        <span>W</span>
                        <span>F</span>
                        <span>S</span>
                      </div>

                      <div className="flex-1 overflow-x-auto pb-2 scrollbar-none">
                        <div className="flex flex-col min-w-[620px]">
                          <div className="flex mt-1">
                            {Array.from({ length: 53 }).map((_, col) => {
                              const now = new Date();
                              const startDate = new Date(now);
                              startDate.setDate(now.getDate() - 364);
                              const firstDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                              const offset = (firstDay.getDay() + 6) % 7;
                              const gridStart = new Date(firstDay);
                              gridStart.setDate(firstDay.getDate() - offset);

                              return (
                                <div key={col} className="flex flex-col mr-[3px]">
                                  {Array.from({ length: 7 }).map((_, row) => {
                                    const cellDate = new Date(gridStart);
                                    cellDate.setDate(gridStart.getDate() + col * 7 + row);

                                    if (cellDate > now) {
                                      return <div key={row} className="w-[10px] h-[10px] my-[1.5px] bg-transparent" />;
                                    }

                                    const dateStr = getLocalDateString(cellDate);
                                    const completionRecord = heatmapData.find(c => c.date === dateStr && c.completed);
                                    const isDone = !!completionRecord;
                                    const isCurrentSelection = selectedCellInfo?.date === dateStr;

                                    return (
                                      <button
                                        key={row}
                                        onClick={() => setSelectedCellInfo({ date: dateStr, isDone })}
                                        className={`w-[10px] h-[10px] my-[1.5px] rounded-[2px] transition-all cursor-pointer ${
                                          isDone 
                                            ? 'bg-primary hover:bg-primary/80 shadow-[0_0_4px_var(--primary-glow)]' 
                                            : 'bg-surface/30 border border-border/10 hover:border-border/30'
                                        } ${isCurrentSelection ? 'ring-1 ring-text scale-110 z-10' : ''}`}
                                      />
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedCellInfo && (
                      <div className="border-t border-border/10 pt-4 text-xs font-semibold text-sub flex justify-between items-center animate-fadeIn">
                        <span>
                          📅 {new Date(selectedCellInfo.date).toLocaleDateString()} : {selectedCellInfo.isDone ? 'Completed successfully' : 'No entries recorded'}
                        </span>
                        <button onClick={() => setSelectedCellInfo(null)} className="text-[10px] uppercase text-primary font-bold hover:underline">Clear</button>
                      </div>
                    )}
                  </div>

                  {/* Streak metrics grids */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="glass-premium p-4 rounded-xl text-center space-y-1 shadow-sm">
                      <p className="text-xl font-bold text-text">{heatmapStats.currentStreak}d</p>
                      <p className="text-[9px] text-text/60 uppercase tracking-widest font-extrabold">Active Streak</p>
                    </div>
                    <div className="glass-premium p-4 rounded-xl text-center space-y-1 shadow-sm">
                      <p className="text-xl font-bold text-text">{heatmapStats.longestStreak}d</p>
                      <p className="text-[9px] text-text/60 uppercase tracking-widest font-extrabold">Longest Streak</p>
                    </div>
                    <div className="glass-premium p-4 rounded-xl text-center space-y-1 shadow-sm">
                      <p className="text-xl font-bold text-text">{heatmapStats.totalDone}</p>
                      <p className="text-[9px] text-text/60 uppercase tracking-widest font-extrabold">Total Syncs</p>
                    </div>
                    <div className="glass-premium p-4 rounded-xl text-center space-y-1 shadow-sm">
                      <p className="text-xl font-bold text-text">{heatmapStats.thisMonth}</p>
                      <p className="text-[9px] text-text/60 uppercase tracking-widest font-extrabold">This Month</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* Habits Configuration Template Modal */}
      {isHabitModalOpen && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border/30 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-text text-base">Habits Configuration</h3>
                <p className="text-xs text-sub">Personalize your track list template.</p>
              </div>
              <button onClick={() => setIsHabitModalOpen(false)} className="text-dim hover:text-text cursor-pointer"><X size={16} /></button>
            </div>

            {/* suggestions */}
            <div className="space-y-2">
              <span className="text-[9px] text-dim font-bold uppercase tracking-widest">Suggestions</span>
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_HABITS.map(h => (
                  <button
                    key={h}
                    disabled={userHabits.includes(h)}
                    onClick={() => setUserHabits([...userHabits, h])}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                      userHabits.includes(h) 
                        ? 'opacity-40 border-border/10 text-sub bg-surface/20' 
                        : 'border-border/30 text-sub hover:text-text'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* active list */}
            <div className="space-y-2">
              <span className="text-[9px] text-dim font-bold uppercase tracking-widest">Your Template</span>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {userHabits.length === 0 ? (
                  <p className="text-xs text-dim italic text-center py-4 border border-dashed border-border/20 rounded-xl">No active habits.</p>
                ) : (
                  userHabits.map(h => (
                    <div key={h} className="flex justify-between items-center p-2.5 bg-surface/30 border border-border/10 rounded-xl">
                      <span className="text-xs font-semibold text-text">{h}</span>
                      <button onClick={() => setUserHabits(userHabits.filter(item => item !== h))} className="text-dim hover:text-red cursor-pointer">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* custom item input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = e.target.newHabit.value.trim();
                if (v && !userHabits.includes(v)) {
                  setUserHabits([...userHabits, v]);
                  e.target.newHabit.value = '';
                }
              }}
              className="flex items-center gap-2 bg-surface/50 border border-border/30 p-1.5 rounded-xl"
            >
              <input 
                name="newHabit"
                placeholder="Custom habit..."
                className="flex-1 bg-transparent px-2 text-xs focus:outline-none text-text"
              />
              <button type="submit" className="px-3 py-1 bg-primary text-bg rounded-lg text-[10px] font-bold cursor-pointer">Add</button>
            </form>

            <div className="flex gap-2 justify-end border-t border-border/10 pt-4">
              <button onClick={() => setIsHabitModalOpen(false)} className="px-3.5 py-1.5 border border-border/20 rounded-xl text-xs font-bold text-sub hover:bg-surface/30 cursor-pointer">
                Cancel
              </button>
              <button onClick={() => handleSaveHabitsTemplate(userHabits, true)} className="px-3.5 py-1.5 bg-primary text-bg font-bold rounded-xl text-xs hover:scale-105 transition-transform cursor-pointer">
                Apply Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Config Modal */}
      {isReminderModalOpen && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border/30 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-text text-base">{selectedReminder ? 'Edit Alarm' : 'New Alarm'}</h3>
              <button onClick={() => setIsReminderModalOpen(false)} className="text-dim hover:text-text cursor-pointer"><X size={16} /></button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-text">
              <div className="space-y-1">
                <label className="text-[9px] text-dim uppercase tracking-widest font-bold">Label</label>
                <input 
                  type="text"
                  placeholder="e.g. Morning Meditation 🧘"
                  value={reminderForm.label}
                  onChange={(e) => setReminderForm({ ...reminderForm, label: e.target.value })}
                  className="w-full bg-surface/50 border border-border/20 px-3 py-2.5 rounded-xl focus:outline-none focus:border-primary text-xs text-text"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-dim uppercase tracking-widest font-bold">Alarm Time</label>
                <input 
                  type="time"
                  value={reminderForm.reminder_time}
                  onChange={(e) => setReminderForm({ ...reminderForm, reminder_time: e.target.value })}
                  className="w-full bg-surface/50 border border-border/20 px-3 py-2.5 rounded-xl focus:outline-none focus:border-primary text-xs text-text"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-dim uppercase tracking-widest font-bold">Recurrence</label>
                <select
                  value={reminderForm.type}
                  onChange={(e) => setReminderForm({ ...reminderForm, type: e.target.value })}
                  className="w-full bg-surface/50 border border-border/20 px-3 py-2.5 rounded-xl focus:outline-none focus:border-primary text-xs text-text cursor-pointer"
                >
                  <option value="one_time">One time</option>
                  <option value="weekly">Weekly Recurring</option>
                  <option value="monthly_date">Monthly Date</option>
                </select>
              </div>

              {reminderForm.type === 'one_time' && (
                <div className="space-y-1">
                  <label className="text-[9px] text-dim uppercase tracking-widest font-bold">Target Date</label>
                  <input 
                    type="date"
                    value={reminderForm.remind_date}
                    onChange={(e) => setReminderForm({ ...reminderForm, remind_date: e.target.value })}
                    className="w-full bg-surface border border-border/20 px-3 py-2.5 rounded-xl focus:outline-none focus:border-primary text-xs text-text"
                  />
                </div>
              )}

              {reminderForm.type === 'weekly' && (
                <div className="space-y-2">
                  <label className="text-[9px] text-dim uppercase tracking-widest font-bold">Active Days</label>
                  <div className="flex justify-between gap-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((name, i) => {
                      const isSelected = reminderForm.weekdays.includes(i);
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            const current = [...reminderForm.weekdays];
                            if (current.includes(i)) {
                              setReminderForm({ ...reminderForm, weekdays: current.filter(d => d !== i) });
                            } else {
                              setReminderForm({ ...reminderForm, weekdays: [...current, i].sort() });
                            }
                          }}
                          className={`w-7 h-7 rounded-xl font-bold text-[10px] flex items-center justify-center transition-all cursor-pointer ${
                            isSelected ? 'bg-primary text-bg' : 'bg-surface/50 border border-border/20 text-sub'
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {reminderForm.type === 'monthly_date' && (
                <div className="space-y-1">
                  <label className="text-[9px] text-dim uppercase tracking-widest font-bold">Day of Month</label>
                  <input 
                    type="number"
                    min="1"
                    max="31"
                    value={reminderForm.month_day}
                    onChange={(e) => setReminderForm({ ...reminderForm, month_day: parseInt(e.target.value) || 1 })}
                    className="w-full bg-surface border border-border/20 px-3 py-2.5 rounded-xl focus:outline-none focus:border-primary text-xs text-text"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-border/10 pt-4">
              {selectedReminder ? (
                <button onClick={() => handleDeleteReminder(selectedReminder.id)} className="text-red hover:underline text-xs font-bold cursor-pointer">
                  Delete
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <button onClick={() => setIsReminderModalOpen(false)} className="px-3.5 py-1.5 border border-border/20 rounded-xl text-xs font-bold text-sub hover:bg-surface/30 cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleSaveReminder} className="px-3.5 py-1.5 bg-primary text-bg font-bold rounded-xl text-xs hover:scale-105 transition-all cursor-pointer">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
