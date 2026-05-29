import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { focusService } from '../services/focusService';
import UtopiaLoader from '../components/UtopiaLoader';
import {
  Flame, Plus, Trash2, Check, X, Calendar, RefreshCw, Archive,
  Download, Upload, Sliders, ChevronLeft, ChevronRight, Edit3, MessageSquare
} from 'lucide-react';

const COLORS = [
  '#08BB68', // Mint Green
  '#1D9BF0', // Ocean Blue
  '#FD3D61', // Coral Pink
  '#9D4EDD', // Rich Lavender
  '#FF7E47', // Sunset Orange
  '#FFB703', // Golden Yellow
  '#00AFB9', // Soft Teal
  '#E07A5F', // Deep Peach
];

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function HabitsScreen() {
  const { user } = useAuth();
  const userId = user?.uid || '';

  // Core States
  const [habits, setHabits] = useState([]);
  const [records, setRecords] = useState({}); // habitId -> List of records
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [lastSyncLabel, setLastSyncLabel] = useState('Never synced');

  // Interactive 7 Days
  const [last7Days, setLast7Days] = useState([]);

  // Editor states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [habitForm, setHabitForm] = useState({
    name: '',
    description: '',
    type: 'binary', // binary, measurable
    targetValue: 1.0,
    unit: '',
    frequencyType: 'daily', // daily, days_of_week, weekly, monthly, interval
    frequencyValue: 1,
    daysOfWeek: [], // Mon=0 ... Sun=6
    reminderTime: '08:00',
    reminderActive: false,
    color: '#08BB68'
  });

  // Measurable Logger Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logModalData, setLogModalData] = useState({
    habit: null,
    date: '',
    value: 0,
    note: ''
  });

  useEffect(() => {
    if (userId) {
      generate7Days();
      loadData();
    }
  }, [userId, showArchived]);

  const generate7Days = () => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d);
    }
    setLast7Days(days);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const fetchedHabits = await focusService.getHabits(userId, showArchived);
      setHabits(fetchedHabits);

      const recordsMap = {};
      for (const h of fetchedHabits) {
        const recs = await focusService.getRecordsForHabit(userId, h.id);
        recordsMap[h.id] = recs;
      }
      setRecords(recordsMap);

      // Sync time label
      const lastSync = localStorage.getItem(`utopia_focus_${userId}_last_sync_time`);
      if (lastSync) {
        const diff = Date.now() - new Date(lastSync).getTime();
        if (diff < 60000) setLastSyncLabel('Synced just now');
        else if (diff < 3600000) setLastSyncLabel(`Synced ${Math.floor(diff / 60000)}m ago`);
        else if (diff < 86400000) setLastSyncLabel(`Synced ${Math.floor(diff / 3600000)}h ago`);
        else setLastSyncLabel(`Synced ${Math.floor(diff / 86400000)}d ago`);
      } else {
        setLastSyncLabel('Never synced');
      }
    } catch (e) {
      console.error('Failed to load habits data:', e);
    } finally {
      setLoading(false);
    }
  };

  const triggerManualSync = async () => {
    setSyncing(true);
    try {
      // Direct remote refetch simulating cloud sync
      await loadData();
      localStorage.setItem(`utopia_focus_${userId}_last_sync_time`, new Date().toISOString());
      setLastSyncLabel('Synced just now');
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  // ──────────────────────────── CRUD Handlers ────────────────────────────

  const handleOpenCreate = () => {
    setEditingHabit(null);
    setHabitForm({
      name: '',
      description: '',
      type: 'binary',
      targetValue: 1.0,
      unit: '',
      frequencyType: 'daily',
      frequencyValue: 1,
      daysOfWeek: [],
      reminderTime: '08:00',
      reminderActive: false,
      color: '#08BB68'
    });
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (habit) => {
    setEditingHabit(habit);
    setHabitForm({
      name: habit.name || '',
      description: habit.description || '',
      type: habit.type || 'binary',
      targetValue: habit.target_value || 1.0,
      unit: habit.unit || '',
      frequencyType: habit.frequency_type || 'daily',
      frequencyValue: habit.frequency_value || 1,
      daysOfWeek: habit.days_of_week ? habit.days_of_week.split(',').map(Number) : [],
      reminderTime: habit.reminder_time || '08:00',
      reminderActive: !!habit.reminder_time,
      color: habit.color || '#08BB68'
    });
    setIsEditorOpen(true);
  };

  const handleSaveHabit = async (e) => {
    e.preventDefault();
    if (!habitForm.name.trim()) return;

    const payload = {
      id: editingHabit ? editingHabit.id : '',
      name: habitForm.name.trim(),
      description: habitForm.description.trim() || null,
      type: habitForm.type,
      target_value: habitForm.type === 'binary' ? 1.0 : parseFloat(habitForm.targetValue) || 1.0,
      unit: habitForm.type === 'binary' ? null : habitForm.unit.trim() || null,
      frequency_type: habitForm.frequencyType,
      frequency_value: habitForm.frequencyType === 'daily' ? 1 : parseInt(habitForm.frequencyValue) || 1,
      days_of_week: habitForm.frequencyType === 'days_of_week' ? habitForm.daysOfWeek.join(',') : null,
      reminder_time: habitForm.reminderActive ? habitForm.reminderTime : null,
      color: habitForm.color,
      is_archived: editingHabit ? editingHabit.is_archived : false,
      created_at: editingHabit ? editingHabit.created_at : new Date().toISOString()
    };

    try {
      await focusService.saveHabit(userId, payload);
      setIsEditorOpen(false);
      loadData();
    } catch (err) {
      console.error('Error saving habit:', err);
    }
  };

  const handleToggleArchive = async (habit) => {
    const updated = {
      ...habit,
      is_archived: !habit.is_archived
    };
    try {
      await focusService.saveHabit(userId, updated);
      loadData();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (!window.confirm('Are you sure you want to delete this habit permanently and all its history?')) return;
    try {
      await focusService.deleteHabit(userId, habitId);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // ──────────────────────────── Record Progress Logging ────────────────────────────

  const getRecordForDate = (habitId, dateStr) => {
    const habitRecords = records[habitId] || [];
    return habitRecords.find(r => r.date === dateStr);
  };

  const handleToggleBinary = async (habit, date) => {
    const dateStr = getLocalDateString(date);
    const existing = getRecordForDate(habit.id, dateStr);

    const completed = existing ? !existing.completed : true;
    const value = completed ? 1.0 : 0.0;

    const payload = {
      id: existing ? existing.id : '',
      habit_id: habit.id,
      date: dateStr,
      value,
      target_value: 1.0,
      completed,
      note: existing ? existing.note : null
    };

    try {
      await focusService.saveRecord(userId, payload);
      // Fast updates locally
      const recs = await focusService.getRecordsForHabit(userId, habit.id);
      setRecords(prev => ({ ...prev, [habit.id]: recs }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenMeasurableModal = (habit, date) => {
    const dateStr = getLocalDateString(date);
    const existing = getRecordForDate(habit.id, dateStr);

    setLogModalData({
      habit,
      date: dateStr,
      value: existing ? existing.value : 0,
      note: existing ? existing.note || '' : ''
    });
    setIsLogModalOpen(true);
  };

  const handleSaveMeasurableLog = async () => {
    const { habit, date, value, note } = logModalData;
    const completed = value >= habit.target_value;
    const existing = getRecordForDate(habit.id, date);

    const payload = {
      id: existing ? existing.id : '',
      habit_id: habit.id,
      date,
      value: parseFloat(value) || 0,
      target_value: habit.target_value,
      completed,
      note: note.trim() || null
    };

    try {
      await focusService.saveRecord(userId, payload);
      setIsLogModalOpen(false);
      const recs = await focusService.getRecordsForHabit(userId, habit.id);
      setRecords(prev => ({ ...prev, [habit.id]: recs }));
    } catch (e) {
      console.error(e);
    }
  };

  // ──────────────────────────── Backup Helpers ────────────────────────────

  const handleTriggerExport = async () => {
    try {
      const json = await focusService.exportHabitsBackupData(userId);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `utopia_habits_backup_${getLocalDateString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    }
  };

  const handleTriggerImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (text) {
          await focusService.importHabitsFromJson(userId, text);
          alert('Backup imported successfully!');
          loadData();
        }
      } catch (err) {
        alert(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // ──────────────────────────── Calculation Metrics ────────────────────────────

  const calculateStreaks = (habitId) => {
    const habitRecords = records[habitId] || [];
    const active = habitRecords.filter(r => r.completed);
    if (active.length === 0) return { current: 0, longest: 0 };

    active.sort((a, b) => a.date.localeCompare(b.date));
    const dates = active.map(d => new Date(d.date));

    // Longest streak
    let longest = 1;
    let currentLongest = 1;
    for (let i = 1; i < dates.length; i++) {
      const diffTime = Math.abs(dates[i] - dates[i - 1]);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentLongest++;
        if (currentLongest > longest) longest = currentLongest;
      } else if (diffDays > 1) {
        currentLongest = 1;
      }
    }

    // Current streak
    let current = 0;
    const dateSet = new Set(active.map(d => d.date));
    const today = new Date();
    let checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const checkDateStr = getLocalDateString(checkDate);
    
    const yesterday = new Date(checkDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    if (dateSet.has(checkDateStr) || dateSet.has(yesterdayStr)) {
      let dateToTest = dateSet.has(checkDateStr) ? checkDate : yesterday;
      while (true) {
        const testStr = getLocalDateString(dateToTest);
        if (dateSet.has(testStr)) {
          current++;
          dateToTest.setDate(dateToTest.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return { current, longest: Math.max(longest, current) };
  };

  // ──────────────────────────── Rendering Sub-components ────────────────────────────

  const renderDaysHeader = () => {
    return (
      <div className="grid grid-cols-[1fr_repeat(7,44px)] gap-2 mb-4 items-center select-none font-sans px-1">
        <span className="text-dim text-[9px] font-bold uppercase tracking-wider">Configure Habits</span>
        {last7Days.map((date, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <span className="text-[10px] text-dim font-bold uppercase tracking-tighter">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}
            </span>
            <span className="text-xs text-text font-bold mt-0.5">{date.getDate()}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderHabitRow = (habit) => {
    const { current } = calculateStreaks(habit.id);
    const habitColor = habit.color || '#08BB68';

    return (
      <div key={habit.id} className="grid grid-cols-[1fr_repeat(7,44px)] gap-2 items-center p-3 card-premium-mono mb-3 rounded-none font-sans">
        
        {/* Title and metadata */}
        <div className="flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: habitColor }} />
            <h4 className="text-text font-serif font-light text-base md:text-lg truncate uppercase leading-snug tracking-tight">
              {habit.name}
            </h4>
          </div>
          
          <div className="flex items-center gap-3">
            {current > 0 && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-text bg-surface px-1.5 py-0.5 border border-border/10">
                <Flame size={10} className="fill-text" />
                <span>{current}D STREAK</span>
              </div>
            )}
            <span className="text-dim text-[10px] font-medium tracking-wide lowercase">
              {habit.type === 'binary' ? 'checklist' : `${habit.target_value} ${habit.unit || 'units'}`}
            </span>
          </div>
        </div>

        {/* 7 Checkbox days */}
        {last7Days.map((date, idx) => {
          const dateStr = getLocalDateString(date);
          const record = getRecordForDate(habit.id, dateStr);
          const completed = record?.completed;

          if (habit.type === 'binary') {
            return (
              <button
                key={idx}
                onClick={() => handleToggleBinary(habit, date)}
                className={`w-11 h-11 border transition-all flex items-center justify-center cursor-pointer rounded-none ${
                  completed
                    ? 'border-transparent text-bg shadow-sm'
                    : 'border-border/30 hover:border-border text-transparent bg-transparent'
                }`}
                style={{ backgroundColor: completed ? habitColor : 'transparent' }}
              >
                <Check size={18} strokeWidth={3} className={completed ? 'text-white' : ''} />
              </button>
            );
          } else {
            // Measurable log button
            const val = record ? record.value : 0;
            const percent = Math.min(100, Math.round((val / habit.target_value) * 100));

            return (
              <button
                key={idx}
                onClick={() => handleOpenMeasurableModal(habit, date)}
                className="w-11 h-11 border border-border/30 hover:border-border transition-all flex flex-col items-center justify-center cursor-pointer relative bg-transparent rounded-none"
              >
                <span className="text-[10px] font-bold text-text z-10">{val}</span>
                <span className="text-[7px] text-dim z-10 tracking-tighter mt-0.5">{percent}%</span>
                
                {/* Visual progressive fill */}
                {percent > 0 && (
                  <div
                    className="absolute bottom-0 left-0 right-0 transition-all opacity-20"
                    style={{
                      height: `${percent}%`,
                      backgroundColor: habitColor
                    }}
                  />
                )}
                {record?.note && (
                  <MessageSquare size={7} className="absolute top-1 right-1 text-dim" />
                )}
              </button>
            );
          }
        })}

        {/* Options overlay */}
        <div className="col-span-full pt-2 mt-2 border-t border-border/10 flex items-center justify-end gap-3 px-1 select-none">
          {habit.description && (
            <span className="text-[10px] text-dim mr-auto font-serif italic truncate max-w-[50%]">
              "{habit.description}"
            </span>
          )}
          <button
            onClick={() => handleOpenEdit(habit)}
            className="p-1 text-dim hover:text-text transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold"
          >
            <Edit3 size={11} /> Edit
          </button>
          <button
            onClick={() => handleToggleArchive(habit)}
            className="p-1 text-dim hover:text-text transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold"
          >
            <Archive size={11} /> {habit.is_archived ? 'Restore' : 'Archive'}
          </button>
          <button
            onClick={() => handleDeleteHabit(habit.id)}
            className="p-1 text-dim hover:text-red transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold"
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>

      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-1 py-4 font-sans select-none pb-24">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-border/20">
        <div>
          <h1 className="text-4xl font-serif font-light text-text uppercase tracking-tighter leading-none flex items-center gap-3">
            Habit <span className="font-serif italic lowercase font-light text-dim">guide</span>
          </h1>
          <span className="editorial-text-spaced text-dim text-[8px] tracking-[0.3em] block mt-1">
            {lastSyncLabel}
          </span>
        </div>

        {/* Action Panel */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="btn-premium-mono py-2 px-4 flex items-center gap-2 border border-border cursor-pointer text-bg font-sans"
          >
            <Plus size={14} className="text-bg" />
            <span className="text-[10px] font-bold uppercase tracking-wider">New Habit</span>
          </button>

          <button
            onClick={triggerManualSync}
            disabled={syncing}
            className="p-2 border border-border/30 hover:border-border bg-surface rounded-none transition-all cursor-pointer flex items-center justify-center text-text disabled:opacity-50"
            title="Manual sync with cloud"
          >
            <RefreshCw size={13} className={`text-text ${syncing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleTriggerExport}
            className="p-2 border border-border/30 hover:border-border bg-surface rounded-none transition-all cursor-pointer flex items-center justify-center text-text"
            title="Export Backup"
          >
            <Download size={13} />
          </button>

          <label className="p-2 border border-border/30 hover:border-border bg-surface rounded-none transition-all cursor-pointer flex items-center justify-center text-text">
            <Upload size={13} />
            <input type="file" accept=".json" onChange={handleTriggerImport} className="hidden" />
          </label>

          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 border text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer ${
              showArchived
                ? 'bg-text text-bg border-text'
                : 'border-border/30 hover:border-border bg-surface text-text'
            }`}
          >
            {showArchived ? 'Show Active' : 'Show Archived'}
          </button>
        </div>
      </div>

      {/* Main Core Content */}
      {loading ? (
        <div className="py-24 flex items-center justify-center select-none">
          <UtopiaLoader />
        </div>
      ) : habits.length === 0 ? (
        <div className="py-20 text-center card-premium-mono p-8 rounded-none">
          <h3 className="font-serif font-light text-2xl text-text mb-3 uppercase">No habits found</h3>
          <p className="text-xs text-dim max-w-sm mx-auto mb-6">
            Configure atomic habits, trace checklist compliance, and maintain streaks beautifully.
          </p>
          <button
            onClick={handleOpenCreate}
            className="btn-premium-mono py-2.5 px-6 border cursor-pointer inline-flex items-center gap-2 text-bg font-sans"
          >
            <Plus size={14} className="text-bg" />
            <span>Create First Habit</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto hide-scrollbar">
          <div className="min-w-[640px]">
            {renderDaysHeader()}
            {habits.map(renderHabitRow)}
          </div>
        </div>
      )}

      {/* ──────────────────────────── EDIT SLIDE-OVER SHEET ──────────────────────────── */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 animate-fadeIn font-sans px-4 select-none">
          <div className="w-full max-w-md bg-card border-l border-border h-full flex flex-col p-6 shadow-2xl overflow-y-auto">
            
            {/* Slide Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/10 mb-6">
              <h3 className="text-2xl font-serif font-light text-text uppercase">
                {editingHabit ? 'Edit Habit' : 'New Habit'}
              </h3>
              <button onClick={() => setIsEditorOpen(false)} className="p-1 hover:bg-surface border border-transparent hover:border-border/20 transition-all rounded-none cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveHabit} className="flex-1 space-y-6">
              {/* Habit Name */}
              <div className="space-y-1">
                <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Habit Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drink Water"
                  value={habitForm.name}
                  onChange={(e) => setHabitForm({ ...habitForm, name: e.target.value })}
                  className="w-full bg-transparent border border-border/30 focus:border-text rounded-none px-4 py-2.5 text-xs font-semibold text-text focus:outline-none transition-colors placeholder:text-dim/40"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Stay hydrated throughout the day"
                  value={habitForm.description}
                  onChange={(e) => setHabitForm({ ...habitForm, description: e.target.value })}
                  className="w-full bg-transparent border border-border/30 focus:border-text rounded-none px-4 py-2.5 text-xs font-semibold text-text focus:outline-none transition-colors placeholder:text-dim/40"
                />
              </div>

              {/* Habit Type (Yes-No vs Measurable) */}
              <div className="space-y-2">
                <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Goal Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHabitForm({ ...habitForm, type: 'binary' })}
                    className={`py-3 border text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors ${
                      habitForm.type === 'binary' ? 'bg-text text-bg border-text' : 'border-border/30 hover:border-border text-text bg-transparent'
                    }`}
                  >
                    Yes / No
                  </button>
                  <button
                    type="button"
                    onClick={() => setHabitForm({ ...habitForm, type: 'measurable' })}
                    className={`py-3 border text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors ${
                      habitForm.type === 'measurable' ? 'bg-text text-bg border-text' : 'border-border/30 hover:border-border text-text bg-transparent'
                    }`}
                  >
                    Measurable
                  </button>
                </div>
              </div>

              {/* Measurable Configuration */}
              {habitForm.type === 'measurable' && (
                <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Target Value</label>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      required
                      value={habitForm.targetValue}
                      onChange={(e) => setHabitForm({ ...habitForm, targetValue: e.target.value })}
                      className="w-full bg-transparent border border-border/30 focus:border-text rounded-none px-4 py-2 text-xs font-semibold text-text focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Unit</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ml, pages, km"
                      value={habitForm.unit}
                      onChange={(e) => setHabitForm({ ...habitForm, unit: e.target.value })}
                      className="w-full bg-transparent border border-border/30 focus:border-text rounded-none px-4 py-2 text-xs font-semibold text-text focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Frequency Schedule */}
              <div className="space-y-2">
                <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Frequency</label>
                <select
                  value={habitForm.frequencyType}
                  onChange={(e) => setHabitForm({ ...habitForm, frequencyType: e.target.value })}
                  className="w-full bg-card border border-border/30 rounded-none px-4 py-2.5 text-xs text-text focus:border-text focus:outline-none uppercase font-bold"
                >
                  <option value="daily">Every single day</option>
                  <option value="days_of_week">Specific days of the week</option>
                  <option value="weekly">Times per week</option>
                  <option value="monthly">Times per month</option>
                  <option value="interval">Interval (Every X days)</option>
                </select>
              </div>

              {/* Days of Week Multi-select */}
              {habitForm.frequencyType === 'days_of_week' && (
                <div className="space-y-2 animate-fadeIn">
                  <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Select Days</label>
                  <div className="flex justify-between gap-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                      const selected = habitForm.daysOfWeek.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const updated = selected
                              ? habitForm.daysOfWeek.filter(d => d !== idx)
                              : [...habitForm.daysOfWeek, idx];
                            setHabitForm({ ...habitForm, daysOfWeek: updated });
                          }}
                          className={`w-9 h-9 border text-[10px] font-bold rounded-full cursor-pointer transition-colors ${
                            selected ? 'bg-text text-bg border-text' : 'border-border/30 hover:border-border text-text bg-transparent'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Cycle Value */}
              {['weekly', 'monthly', 'interval'].includes(habitForm.frequencyType) && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="block text-text text-[9px] font-bold uppercase tracking-widest">
                    {habitForm.frequencyType === 'weekly'
                      ? 'Times per week'
                      : habitForm.frequencyType === 'monthly'
                      ? 'Times per month'
                      : 'Every X days'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={habitForm.frequencyValue}
                    onChange={(e) => setHabitForm({ ...habitForm, frequencyValue: e.target.value })}
                    className="w-24 bg-transparent border border-border/30 focus:border-text rounded-none px-4 py-2 text-xs font-semibold text-text focus:outline-none"
                  />
                </div>
              )}

              {/* Color accent Selection */}
              <div className="space-y-2">
                <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Accent Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((col, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setHabitForm({ ...habitForm, color: col })}
                      className="w-7 h-7 rounded-full cursor-pointer transition-all border flex items-center justify-center text-white"
                      style={{
                        backgroundColor: col,
                        borderColor: habitForm.color === col ? 'var(--text)' : 'transparent',
                        borderWidth: habitForm.color === col ? '2.5px' : '0px'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Reminder Alarm */}
              <div className="pt-4 border-t border-border/10 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-text uppercase">Daily Reminder</h4>
                  <p className="text-[10px] text-dim mt-0.5">Activate daily scheduler alerts</p>
                </div>
                <div className="flex items-center gap-2">
                  {habitForm.reminderActive && (
                    <input
                      type="time"
                      value={habitForm.reminderTime}
                      onChange={(e) => setHabitForm({ ...habitForm, reminderTime: e.target.value })}
                      className="bg-surface border border-border/20 rounded-none px-2 py-1 text-xs text-text font-bold"
                    />
                  )}
                  <input
                    type="checkbox"
                    checked={habitForm.reminderActive}
                    onChange={(e) => setHabitForm({ ...habitForm, reminderActive: e.target.checked })}
                    className="w-4 h-4 cursor-pointer accent-text"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <button
                type="submit"
                className="w-full btn-premium-mono py-3.5 px-6 border cursor-pointer text-bg font-sans"
              >
                <span>Save Habit</span>
              </button>

            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────── MEASURABLE LOG DIALOG MODAL ──────────────────────────── */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn font-sans px-4 select-none">
          <div className="w-full max-w-sm bg-card border border-border p-6 shadow-2xl rounded-none relative">
            <h3 className="text-xl font-serif font-light text-text uppercase mb-4 leading-none pr-6">
              {logModalData.habit?.name}
            </h3>
            <p className="text-[10px] text-dim uppercase font-bold tracking-wider mb-6">
              Log Progress · {logModalData.date}
            </p>

            <button
              onClick={() => setIsLogModalOpen(false)}
              className="absolute top-4 right-4 text-dim hover:text-text cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>

            <div className="space-y-5">
              {/* Input Value */}
              <div className="space-y-1">
                <label className="block text-text text-[9px] font-bold uppercase tracking-widest">
                  Progress Amount ({logModalData.habit?.unit || 'units'})
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLogModalData({ ...logModalData, value: Math.max(0, parseFloat(logModalData.value) - 1) })}
                    className="w-8 h-8 border border-border/30 hover:border-border text-text bg-surface font-bold text-lg leading-none cursor-pointer flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={logModalData.value}
                    onChange={(e) => setLogModalData({ ...logModalData, value: e.target.value })}
                    className="flex-grow bg-transparent border border-border/30 focus:border-text rounded-none px-3 py-2 text-center text-xs font-semibold focus:outline-none"
                  />
                  <button
                    onClick={() => setLogModalData({ ...logModalData, value: (parseFloat(logModalData.value) || 0) + 1 })}
                    className="w-8 h-8 border border-border/30 hover:border-border text-text bg-surface font-bold text-lg leading-none cursor-pointer flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Note / Comments */}
              <div className="space-y-1">
                <label className="block text-text text-[9px] font-bold uppercase tracking-widest">Daily Note (Comments)</label>
                <textarea
                  placeholder="Optional log comments..."
                  value={logModalData.note}
                  onChange={(e) => setLogModalData({ ...logModalData, note: e.target.value })}
                  rows={3}
                  className="w-full bg-transparent border border-border/30 focus:border-text rounded-none px-3 py-2 text-xs font-medium text-text focus:outline-none resize-none placeholder:text-dim/40"
                />
              </div>

              <button
                onClick={handleSaveMeasurableLog}
                className="w-full btn-premium-mono py-3 px-6 border cursor-pointer text-bg font-sans"
              >
                <span>Save Log Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
