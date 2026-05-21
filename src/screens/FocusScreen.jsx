import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { focusService, initFocusSupabase } from '../services/focusService';
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
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, daily_note, reminders, analytics
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
    setActiveTab('daily_note');
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

  const activeSlotStyle = SLOT_STYLES[timeSlot] || SLOT_STYLES.morning;

  return (
    <div className="min-h-screen text-text transition-all duration-300 relative select-none pb-20">
      <style>{`
        @keyframes bubbleEntrance {
          0% { opacity: 0; transform: scale(0.3) translateY(80px) rotate(-10deg); filter: blur(10px); }
          70% { opacity: 0.9; transform: scale(1.05) translateY(-5px) rotate(1deg); filter: none; }
          100% { opacity: 1; transform: scale(1) translateY(0) rotate(0); }
        }
        @keyframes panelEntrance {
          0% { opacity: 0; transform: scale(0.96) translateY(30px); filter: blur(5px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: none; }
        }
        @keyframes floatingDockEntrance {
          0% { opacity: 0; transform: translateX(50px) scale(0.9); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-8px) scale(1.01); }
        }
        .animate-bubble-in {
          animation: bubbleEntrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .animate-panel-in {
          animation: panelEntrance 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-dock-in {
          animation: floatingDockEntrance 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .animate-float-slow {
          animation: gentleFloat 6s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: gentleFloat 5s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: gentleFloat 4.5s ease-in-out infinite;
        }
      `}</style>
      
      {/* Scaffold container */}
      <div className="max-w-4xl mx-auto space-y-8 px-1">
        
        {/* ========================================================================= */}
        {/* SUMPTUOUS GLASS HERO BANNER (Luxury editorial styling)                    */}
        {/* ========================================================================= */}
        <div className={`relative w-full overflow-hidden border border-border/15 shadow-xl flex flex-col justify-between p-6 md:p-8 transition-all duration-700 ease-in-out animate-fadeIn ${
          focusedBubble ? 'h-[130px] rounded-[24px]' : 'h-[240px] md:h-[280px] rounded-[32px]'
        }`}>
          {/* Dynamic visual sky underneath */}
          <img 
            src={activeSlotStyle.bgImage} 
            alt={timeSlot} 
            className="absolute inset-0 w-full h-full object-cover object-[center_35%] filter brightness-[0.9] dark:brightness-[0.7] z-0 transition-all duration-500"
          />
          
          {/* Elegant deep sunset mask */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10 dark:from-black/90 dark:via-black/55 dark:to-black/20 z-10" />
          
          {/* Top Row: Utopia & Flipped leaf accent */}
          <div className="relative z-20 flex justify-between items-center w-full">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => selectBubble(null)}>
              <h1 className="font-playfair italic text-3xl md:text-4xl font-bold tracking-tight text-white select-none hover:opacity-90 transition-opacity">
                Utopia
              </h1>
              <div className="transform rotate-[35deg] -scale-x-100 opacity-95">
                <img 
                  src="/assets/focus_screen/leaves.png" 
                  alt="leaves" 
                  className="w-5 h-5 object-contain"
                  style={{ filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                />
              </div>
            </div>

            {/* If focused, render the gorgeous shrunken floating dock right in the header! */}
            {focusedBubble ? (
              <div className="flex items-center gap-2 animate-dock-in">
                {/* Home / Overview bubble */}
                <button
                  onClick={() => selectBubble(null)}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all duration-300 hover:scale-110 shadow-lg cursor-pointer"
                  title="Dashboard Overview"
                >
                  <Home size={16} />
                </button>

                {/* Journal bubble */}
                <button
                  onClick={() => selectBubble('journal')}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg cursor-pointer ${
                    focusedBubble === 'journal' 
                      ? 'bg-blue text-bg border-blue shadow-[0_0_15px_rgba(30,102,245,0.4)]' 
                      : 'bg-white/10 text-white/70 border-white/15 hover:text-white hover:bg-white/20'
                  }`}
                  title="Daily Journal"
                >
                  <Calendar size={16} />
                </button>

                {/* Alarms bubble */}
                <button
                  onClick={() => selectBubble('alarms')}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg cursor-pointer ${
                    focusedBubble === 'alarms' 
                      ? 'bg-lavender text-bg border-lavender shadow-[0_0_15px_rgba(180,190,254,0.4)]' 
                      : 'bg-white/10 text-white/70 border-white/15 hover:text-white hover:bg-white/20'
                  }`}
                  title="Routine Alarms"
                >
                  <Bell size={16} />
                </button>

                {/* Analytics bubble */}
                <button
                  onClick={() => selectBubble('analytics')}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg cursor-pointer ${
                    focusedBubble === 'analytics' 
                      ? 'bg-peach text-bg border-peach shadow-[0_0_15px_rgba(254,100,11,0.4)]' 
                      : 'bg-white/10 text-white/70 border-white/15 hover:text-white hover:bg-white/20'
                  }`}
                  title="Analytics Matrix"
                >
                  <BarChart2 size={16} />
                </button>
              </div>
            ) : null}
          </div>

          {/* Bottom Row: Elegant serif quotes */}
          <div className={`relative z-20 flex gap-4 items-stretch max-w-xl transition-all duration-700 ${
            focusedBubble ? 'opacity-0 translate-y-4 max-h-0 overflow-hidden' : 'opacity-100 max-h-[100px]'
          }`}>
            <div className="w-0.5 rounded-full bg-primary/75 shrink-0" />
            <div className="space-y-1">
              <h2 className="font-tiro text-xl md:text-2xl font-medium tracking-tight text-white leading-none">
                {greetingText}
              </h2>
              <p className="text-[11px] md:text-xs font-medium text-white/70 leading-relaxed max-w-md italic tracking-wide">
                "{motivationalQuote}"
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-VIEW ORCHESTRATION                                                    */}
        {/* ========================================================================= */}
        {loading && activeTab !== 'daily_note' ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="transition-all duration-500">
            
            {/* ========================================================================= */}
            {/* VIEW: DASHBOARD (Cool elegant visual floating glass bubbles)             */}
            {/* ========================================================================= */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-fadeIn">
                
                {/* Micro active streak alert */}
                {streakDays > 0 && (
                  <div className="bg-gradient-to-r from-primary/10 via-surface/10 to-transparent border border-border/15 rounded-3xl p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-inner">
                        <Flame size={20} className="animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-[9px] text-dim uppercase tracking-widest font-bold mb-0.5">Current Streak Status</h4>
                        <p className="text-text font-bold text-sm">🔥 {streakDays} Day{streakDays === 1 ? '' : 's'} consistent on <span className="text-primary">{bestStreakTask}</span></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid of elegant minimal circles */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                  
                  {/* Daily Note Bubble */}
                  <button 
                    onClick={() => selectBubble('journal')}
                    className="group bg-surface border border-border/30 rounded-[48px] p-8 text-left transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(30,102,245,0.15)] hover:border-blue/40 flex flex-col justify-between min-h-[230px] cursor-pointer animate-bubble-in animate-float-slow shadow-lg shadow-black/5"
                    style={{ animationDelay: '0ms' }}
                  >
                    <div className="w-12 h-12 bg-blue/10 text-blue rounded-[22px] flex items-center justify-center group-hover:bg-blue group-hover:text-bg shadow-sm transition-all duration-500">
                      <Calendar size={22} />
                    </div>
                    <div className="mt-8">
                      <h3 className="font-bold text-text text-xl leading-snug group-hover:text-blue transition-colors duration-300">Daily Journal</h3>
                      <p className="text-xs text-text/60 mt-2 leading-relaxed font-semibold">{dailyNoteInsight}</p>
                    </div>
                  </button>

                  {/* Alarms Bubble */}
                  <button 
                    onClick={() => selectBubble('alarms')}
                    className="group bg-surface border border-border/30 rounded-[48px] p-8 text-left transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(180,190,254,0.15)] hover:border-lavender/40 flex flex-col justify-between min-h-[230px] cursor-pointer animate-bubble-in animate-float-medium shadow-lg shadow-black/5"
                    style={{ animationDelay: '100ms' }}
                  >
                    <div className="w-12 h-12 bg-lavender/10 text-lavender rounded-[22px] flex items-center justify-center group-hover:bg-lavender group-hover:text-bg shadow-sm transition-all duration-500">
                      <Bell size={22} />
                    </div>
                    <div className="mt-8">
                      <h3 className="font-bold text-text text-xl leading-snug group-hover:text-lavender transition-colors duration-300">Alarms & Alerts</h3>
                      <p className="text-xs text-text/60 mt-2 leading-relaxed font-semibold line-clamp-1">{remindersInsight}</p>
                    </div>
                  </button>

                  {/* Analytics Bubble */}
                  <button 
                    onClick={() => selectBubble('analytics')}
                    className="group bg-surface border border-border/30 rounded-[48px] p-8 text-left transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(254,100,11,0.15)] hover:border-peach/40 flex flex-col justify-between min-h-[230px] cursor-pointer animate-bubble-in animate-float-fast shadow-lg shadow-black/5"
                    style={{ animationDelay: '200ms' }}
                  >
                    <div className="w-12 h-12 bg-peach/10 text-peach rounded-[22px] flex items-center justify-center group-hover:bg-peach group-hover:text-bg shadow-sm transition-all duration-500">
                      <BarChart2 size={22} />
                    </div>
                    <div className="mt-8">
                      <h3 className="font-bold text-text text-xl leading-snug group-hover:text-peach transition-colors duration-300">Analytics Matrix</h3>
                      <p className="text-xs text-text/60 mt-2 leading-relaxed font-semibold">{activeHabitsCount} tracking metrics</p>
                    </div>
                  </button>

                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW: DAILY NOTE TRACKER (Luxury Editorial Layout)                       */}
            {/* ========================================================================= */}
            {activeTab === 'daily_note' && (
              <div className="space-y-8 animate-panel-in">
                
                {/* Date navigation bar */}
                <div className="bg-surface border border-border/30 rounded-[32px] p-6 space-y-4 shadow-md shadow-black/5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-text">
                        {parseLocalDate(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleOpenDailyNote(getLocalDateString())}
                        className="px-3.5 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold hover:bg-primary/25 transition-all"
                      >
                        Today
                      </button>
                      <input 
                        type="date"
                        value={selectedDate}
                        onChange={(e) => handleOpenDailyNote(e.target.value)}
                        className="bg-bg border border-border/30 px-3 py-1.5 rounded-xl text-xs font-bold text-text focus:outline-none focus:border-primary transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Elegant week navigation strip */}
                  <div className="border-t border-border/10 pt-4 flex items-center justify-between">
                    <button onClick={() => shiftWeek(-1)} className="p-1.5 text-dim hover:text-primary hover:bg-bg/40 rounded-xl transition-all">
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
                            className={`py-2 rounded-2xl flex flex-col items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-gradient-to-tr from-primary to-primary/80 text-bg font-bold shadow-[0_4px_15px_rgba(var(--primary-rgb),0.35)] scale-105' 
                                : 'text-text/70 hover:text-text hover:bg-bg/40'
                            }`}
                          >
                            <span className="text-[8px] font-bold tracking-widest opacity-60 uppercase">{weekdayNames[i]}</span>
                            <span className="text-xs font-bold mt-1">{day.getDate()}</span>
                            {hasNote && (
                              <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-bg' : 'bg-primary'}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <button onClick={() => shiftWeek(1)} className="p-1.5 text-dim hover:text-primary hover:bg-bg/40 rounded-xl transition-all">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    
                    {/* Left: Habits Grid + Task list */}
                    <div className="space-y-8">
                      
                      {/* Habits Section */}
                      <div className="bg-surface border border-border/30 p-6 rounded-[32px] space-y-4 shadow-md shadow-black/5">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-text text-xs uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal" /> Habits Checklist
                          </h3>
                          <button 
                            onClick={() => setIsHabitModalOpen(true)}
                            className="p-1.5 text-dim hover:text-text rounded-xl hover:bg-bg/30 transition-all"
                            title="Edit template"
                          >
                            <Edit3 size={13} />
                          </button>
                        </div>

                        {/* Sumptuous custom capsules grid */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {userHabits.map(habit => {
                            const isDone = !!noteContent.habitsState[habit];
                            return (
                              <button
                                key={habit}
                                onClick={() => toggleHabit(habit)}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-1.5 border select-none cursor-pointer ${
                                  isDone 
                                    ? 'bg-teal/20 border-teal text-teal shadow-[0_0_12px_rgba(148,226,213,0.2)] font-bold' 
                                    : 'bg-bg/40 border-border/40 text-text/80 hover:bg-bg/80 hover:text-text'
                                }`}
                              >
                                {isDone && <Check size={11} strokeWidth={3} />}
                                <span>{habit}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Task Section */}
                      <div className="bg-surface border border-border/30 p-6 rounded-[32px] space-y-4 shadow-md shadow-black/5">
                        <h3 className="font-bold text-text text-xs uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue" /> Tasks Checklist
                        </h3>

                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {noteContent.tasks.length === 0 ? (
                            <p className="text-center text-xs text-dim italic py-6">No tasks added today.</p>
                          ) : (
                            noteContent.tasks.map((task, idx) => (
                              <div key={idx} className="group flex items-center justify-between gap-3 py-2 border-b border-border/5">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <button onClick={() => toggleTask(idx)} className="text-text/60 hover:text-primary shrink-0 transition-colors">
                                    {task.completed 
                                      ? <CheckSquare size={16} className="text-primary" /> 
                                      : <Square size={16} className="text-text/40" />
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
                          className="flex items-center gap-2 bg-bg border border-border/30 p-1.5 rounded-2xl"
                        >
                          <input 
                            name="newTask"
                            type="text"
                            placeholder="Add task to your checklist..."
                            className="flex-1 bg-transparent px-3 text-xs focus:outline-none text-text"
                          />
                          <button type="submit" className="p-1.5 bg-primary text-bg rounded-xl">
                            <Plus size={12} />
                          </button>
                        </form>
                      </div>

                    </div>

                    {/* Right: Sumptuous Writing space */}
                    <div className="bg-surface border border-border/30 p-6 rounded-[32px] flex flex-col min-h-[360px] space-y-4 shadow-md shadow-black/5">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-text text-xs uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-peach" /> Journal Space
                        </h3>

                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'Synced' ? 'bg-green' : 'bg-gold animate-pulse'}`} />
                          <span className="text-[8px] text-dim font-bold uppercase tracking-wider">{saveStatus}</span>
                        </div>
                      </div>

                      <textarea
                        value={noteContent.journal}
                        onChange={handleJournalChange}
                        placeholder="Write dynamic thoughts, logs, and creative ideas. Stored live with inline db debouncing..."
                        className="flex-1 w-full bg-transparent border-none text-text/90 placeholder-text/30 focus:outline-none text-sm leading-relaxed tracking-wide resize-none font-serif italic"
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
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW: REMINDERS                                                           */}
            {/* ========================================================================= */}
            {activeTab === 'reminders' && (
              <div className="space-y-6 animate-panel-in">
                
                {/* Reminders dashboard panel */}
                <div className="bg-surface border border-border/30 rounded-[32px] p-6 flex justify-between items-center gap-4 shadow-md shadow-black/5">
                  <div>
                    <h2 className="text-xl font-bold text-text">Routine Alarms</h2>
                    <p className="text-xs text-text/60">Manage alerts. Custom schedules fallback to standard browser channels.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={triggerBrowserPush}
                      className="px-3.5 py-1.5 border border-border/30 rounded-xl text-xs font-bold text-text hover:bg-bg/50 transition-all"
                    >
                      Test
                    </button>
                    <button 
                      onClick={handleOpenNewReminderModal}
                      className="px-3.5 py-1.5 bg-primary text-bg font-bold rounded-xl text-xs hover:scale-105 active:scale-95 transition-all"
                    >
                      + Add Alarm
                    </button>
                  </div>
                </div>

                {/* Alarms strips */}
                {reminders.length === 0 ? (
                  <p className="text-center text-xs text-dim italic py-10 bg-surface border border-dashed border-border/30 rounded-[32px]">
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
                        <div key={r.id} className="bg-surface border border-border/30 p-5 rounded-[24px] flex justify-between items-center gap-4 hover:border-primary/50 transition-all duration-300 shadow-sm">
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
                              className={`w-9 h-5 rounded-full transition-all relative ${r.is_active ? 'bg-primary' : 'bg-bg border border-border/30'}`}
                            >
                              <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-bg transition-all ${r.is_active ? 'right-0.5' : 'left-0.5'}`} />
                            </button>

                            <button onClick={() => handleOpenEditReminderModal(r)} className="p-1.5 text-dim hover:text-text rounded-xl hover:bg-surface/20 transition-colors">
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
            {/* VIEW: ANALYTICS                                                           */}
            {/* ========================================================================= */}
            {activeTab === 'analytics' && !selectedTaskForHeatmap && (
              <div className="space-y-6 animate-panel-in">
                
                {/* Search strip */}
                <div className="bg-surface border border-border/30 rounded-[32px] p-6 space-y-4 shadow-md shadow-black/5">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 flex items-center gap-2 bg-bg border border-border/30 px-4 py-1.5 rounded-2xl">
                      <Search size={14} className="text-text/60" />
                      <input 
                        type="text"
                        placeholder="Search consistency logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none focus:outline-none w-full text-xs text-text"
                      />
                    </div>

                    <div className="flex bg-bg border border-border/30 p-0.5 rounded-xl gap-1 shrink-0">
                      {['all', 'habits', 'tasks'].map(type => (
                        <button
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${filterType === type ? 'bg-primary text-bg' : 'text-text/60 hover:text-text'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tracked cards */}
                {filteredTrackedTasks.length === 0 ? (
                  <p className="text-center text-xs text-dim italic py-10 bg-surface border border-dashed border-border/30 rounded-[32px]">
                    No tracked actions available. Complete habits in the Daily Journal.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredTrackedTasks.map(t => (
                      <button
                        key={t.task_name}
                        onClick={() => handleOpenHeatmap(t.task_name)}
                        className="bg-surface border border-border/30 p-5 rounded-[24px] flex justify-between items-center text-left hover:border-primary/45 hover:bg-surface/50 transition-all duration-300 shadow-sm"
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
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW: HEATMAP GRID MATRIX                                                 */}
            {/* ========================================================================= */}
            {activeTab === 'analytics' && selectedTaskForHeatmap && (
              <div className="space-y-6 animate-panel-in">
                
                {/* Header widget */}
                <div className="bg-surface border border-border/30 rounded-[32px] p-6 flex items-center gap-3 shadow-md shadow-black/5">
                  <button 
                    onClick={() => setSelectedTaskForHeatmap(null)}
                    className="p-1.5 bg-bg border border-border/30 rounded-xl text-text/60 hover:text-primary transition-all"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <div>
                    <h3 className="font-bold text-text text-sm uppercase tracking-widest">{selectedTaskForHeatmap}</h3>
                    <p className="text-[9px] text-text/60 font-bold uppercase tracking-wider mt-0.5">365-day tracking timeline</p>
                  </div>
                </div>

                {/* Heatmap */}
                <div className="bg-surface border border-border/30 p-6 rounded-[32px] space-y-4 shadow-md shadow-black/5">
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

                  {/* Cell metadata details */}
                  {selectedCellInfo && (
                    <div className="border-t border-border/10 pt-4 text-xs font-semibold text-sub flex justify-between items-center">
                      <span>
                        📅 {new Date(selectedCellInfo.date).toLocaleDateString()} : {selectedCellInfo.isDone ? 'Completed successfully' : 'No entries recorded'}
                      </span>
                      <button onClick={() => setSelectedCellInfo(null)} className="text-[10px] uppercase text-primary font-bold hover:underline">Clear</button>
                    </div>
                  )}
                </div>

                {/* Streak metrics grids */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-surface border border-border/30 p-4 rounded-[24px] text-center space-y-0.5 shadow-sm">
                    <p className="text-xl font-bold text-text">{heatmapStats.currentStreak}d</p>
                    <p className="text-[9px] text-text/60 uppercase tracking-widest font-bold">Active Streak</p>
                  </div>
                  <div className="bg-surface border border-border/30 p-4 rounded-[24px] text-center space-y-0.5 shadow-sm">
                    <p className="text-xl font-bold text-text">{heatmapStats.longestStreak}d</p>
                    <p className="text-[9px] text-text/60 uppercase tracking-widest font-bold">Longest Streak</p>
                  </div>
                  <div className="bg-surface border border-border/30 p-4 rounded-[24px] text-center space-y-0.5 shadow-sm">
                    <p className="text-xl font-bold text-text">{heatmapStats.totalDone}</p>
                    <p className="text-[9px] text-text/60 uppercase tracking-widest font-bold">Total Syncs</p>
                  </div>
                  <div className="bg-surface border border-border/30 p-4 rounded-[24px] text-center space-y-0.5 shadow-sm">
                    <p className="text-xl font-bold text-text">{heatmapStats.thisMonth}</p>
                    <p className="text-[9px] text-text/60 uppercase tracking-widest font-bold">This Month</p>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* LUXURY MODALS                                                             */}
      {/* ========================================================================= */}

      {/* Habits Configuration Template Modal */}
      {isHabitModalOpen && (
        <div className="fixed inset-0 bg-bg/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border/30 rounded-[32px] max-w-sm w-full p-6 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-text text-base">Habits Config</h3>
                <p className="text-xs text-sub">Personalize your track list template.</p>
              </div>
              <button onClick={() => setIsHabitModalOpen(false)} className="text-dim hover:text-text"><X size={16} /></button>
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
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
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
                      <button onClick={() => setUserHabits(userHabits.filter(item => item !== h))} className="text-dim hover:text-red">
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
              className="flex items-center gap-2 bg-surface/50 border border-border/30 p-1.5 rounded-2xl"
            >
              <input 
                name="newHabit"
                placeholder="Custom habit..."
                className="flex-1 bg-transparent px-2 text-xs focus:outline-none text-text"
              />
              <button type="submit" className="px-3 py-1 bg-primary text-bg rounded-xl text-[10px] font-bold">Add</button>
            </form>

            <div className="flex gap-2 justify-end border-t border-border/10 pt-4">
              <button onClick={() => setIsHabitModalOpen(false)} className="px-3.5 py-1.5 border border-border/20 rounded-xl text-xs font-bold text-sub hover:bg-surface/30">
                Cancel
              </button>
              <button onClick={() => handleSaveHabitsTemplate(userHabits, true)} className="px-3.5 py-1.5 bg-primary text-bg font-bold rounded-xl text-xs hover:scale-105 transition-transform">
                Apply Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Config Modal */}
      {isReminderModalOpen && (
        <div className="fixed inset-0 bg-bg/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border/30 rounded-[32px] max-w-sm w-full p-6 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-text text-base">{selectedReminder ? 'Edit Alarm' : 'New Alarm'}</h3>
              <button onClick={() => setIsReminderModalOpen(false)} className="text-dim hover:text-text"><X size={16} /></button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-text">
              <div className="space-y-1">
                <label className="text-[9px] text-dim uppercase tracking-widest font-bold">Label</label>
                <input 
                  type="text"
                  placeholder="e.g. Morning Meditation 🧘"
                  value={reminderForm.label}
                  onChange={(e) => setReminderForm({ ...reminderForm, label: e.target.value })}
                  className="w-full bg-surface/50 border border-border/20 px-3 py-2.5 rounded-2xl focus:outline-none focus:border-primary text-xs text-text"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-dim uppercase tracking-widest font-bold">Alarm Time</label>
                <input 
                  type="time"
                  value={reminderForm.reminder_time}
                  onChange={(e) => setReminderForm({ ...reminderForm, reminder_time: e.target.value })}
                  className="w-full bg-surface/50 border border-border/20 px-3 py-2.5 rounded-2xl focus:outline-none focus:border-primary text-xs text-text"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-dim uppercase tracking-widest font-bold">Recurrence</label>
                <select
                  value={reminderForm.type}
                  onChange={(e) => setReminderForm({ ...reminderForm, type: e.target.value })}
                  className="w-full bg-surface/50 border border-border/20 px-3 py-2.5 rounded-2xl focus:outline-none focus:border-primary text-xs text-text cursor-pointer"
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
                    className="w-full bg-surface border border-border/20 px-3 py-2.5 rounded-2xl focus:outline-none focus:border-primary text-xs text-text"
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
                          className={`w-7 h-7 rounded-xl font-bold text-[10px] flex items-center justify-center transition-all ${
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
                    className="w-full bg-surface border border-border/20 px-3 py-2.5 rounded-2xl focus:outline-none focus:border-primary text-xs text-text"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-border/10 pt-4">
              {selectedReminder ? (
                <button onClick={() => handleDeleteReminder(selectedReminder.id)} className="text-red hover:underline text-xs font-bold">
                  Delete
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <button onClick={() => setIsReminderModalOpen(false)} className="px-3.5 py-1.5 border border-border/20 rounded-xl text-xs font-bold text-sub hover:bg-surface/30">
                  Cancel
                </button>
                <button onClick={handleSaveReminder} className="px-3.5 py-1.5 bg-primary text-bg font-bold rounded-xl text-xs hover:scale-105 transition-all">
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
