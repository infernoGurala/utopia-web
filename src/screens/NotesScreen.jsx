import { useState, useEffect } from 'react';
import { SupabaseGlobalService } from '../services/SupabaseGlobalService';
import { TrashService } from '../services/TrashService';
import { Folder, FileText, ArrowLeft, ChevronRight, Plus, Edit2, Trash2, Check, Pencil, BookOpen, Users, Crown, Pen, Eye, Search, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getLucideIcon } from '../utils/IconMap';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, doc, getDoc, query, where, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../services/firebase';
import TrashScreen from './TrashScreen';

const colorPalette = [
  { bg: 'bg-primary/10', text: 'text-primary', border: 'hover:border-primary/40', accent: 'border-primary/30' },
  { bg: 'bg-teal/10', text: 'text-teal', border: 'hover:border-teal/40', accent: 'border-teal/30' },
  { bg: 'bg-peach/10', text: 'text-peach', border: 'hover:border-peach/40', accent: 'border-peach/30' },
  { bg: 'bg-green/10', text: 'text-green', border: 'hover:border-green/40', accent: 'border-green/30' },
  { bg: 'bg-blue/10', text: 'text-blue', border: 'hover:border-blue/40', accent: 'border-blue/30' },
  { bg: 'bg-lavender/10', text: 'text-lavender', border: 'hover:border-lavender/40', accent: 'border-lavender/30' },
  { bg: 'bg-gold/10', text: 'text-gold', border: 'hover:border-gold/40', accent: 'border-gold/30' },
  { bg: 'bg-red/10', text: 'text-red', border: 'hover:border-red/40', accent: 'border-red/30' },
];

export default function NotesScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userProfile } = useTheme();
  const { user } = useAuth();
  
  // Tab state: 'community' or 'classes'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'community');

  // --- Community Notes States ---
  const [items, setItems] = useState([]);
  const [folderIcons, setFolderIcons] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  
  const defaultUni = userProfile?.selectedUniversityId ? `${userProfile.selectedUniversityId}/Community` : '';
  const [currentPath, setCurrentPath] = useState(defaultUni);
  const [pathHistory, setPathHistory] = useState([defaultUni]);

  // --- Class List States ---
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState('');

  // --- Search & Filter States ---
  const [searchQuery, setSearchQuery] = useState('');

  // --- Recent Notes States ---
  const [recentNotes, setRecentNotes] = useState([]);

  // --- Join Class States ---
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  // Load recent notes
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`utopia_recent_notes_${user.uid}`);
      if (stored) {
        setRecentNotes(JSON.parse(stored));
      }
    }
  }, [user]);

  const addToRecentNotes = (item) => {
    if (item.type !== 'file') return;
    const newRecent = [
      { path: item.path, name: item.name, timestamp: new Date().getTime() },
      ...recentNotes.filter(n => n.path !== item.path)
    ].slice(0, 5); // keep last 5
    setRecentNotes(newRecent);
    localStorage.setItem(`utopia_recent_notes_${user.uid}`, JSON.stringify(newRecent));
  };

  // Derive universityId from the path for trash operations
  const universityId = userProfile?.selectedUniversityId || currentPath?.split('/')[0] || '';

  // Synchronize Tab and URL params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && (tabParam === 'community' || tabParam === 'classes')) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // --- Community Notes Effects ---
  useEffect(() => {
    if (userProfile) {
      const newUni = userProfile.selectedUniversityId ? `${userProfile.selectedUniversityId}/Community` : '';
      if (newUni !== pathHistory[0]) {
        setCurrentPath(newUni);
        setPathHistory([newUni]);
      }
    }
  }, [userProfile]);

  useEffect(() => {
    if (activeTab === 'community') {
      loadDirectory(currentPath);
    }
  }, [currentPath, activeTab]);

  // --- Class List Effects ---
  useEffect(() => {
    if (user && activeTab === 'classes') {
      loadClasses();
    }
  }, [user, activeTab]);

  // --- Fetch Directory Contents ---
  const loadDirectory = async (path) => {
    setLoading(true);
    setError('');
    try {
      if (!path || path === '') {
        const unis = await SupabaseGlobalService.getUniversities();
        setItems(unis.map(u => ({ ...u, type: 'dir', name: u.path.split('/')[0] })));
        setFolderIcons({});
      } else {
        const contents = await SupabaseGlobalService.getDirectoryContents(path);
        setItems(contents);
        
        const icons = await SupabaseGlobalService.getFolderIcons(path);
        setFolderIcons(icons);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load community notes.');
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch Class List ---
  const loadClasses = async () => {
    setClassesLoading(true);
    setClassesError('');
    try {
      const membershipsRef = collection(db, 'users', user.uid, 'memberships');
      const membershipsSnap = await getDocs(membershipsRef);
      
      const classPromises = membershipsSnap.docs.map(async (membershipDoc) => {
        const classId = membershipDoc.id;
        const membershipData = membershipDoc.data();
        const role = membershipData.role || 'reader';
        
        try {
          const classDocRef = doc(db, 'classes', classId);
          const classDocSnap = await getDoc(classDocRef);
          
          if (classDocSnap.exists()) {
            return { id: classId, role, ...classDocSnap.data() };
          }
        } catch (err) {
          console.warn(`Failed to fetch class ${classId}:`, err);
        }
        return null;
      });
      
      const resolvedClasses = (await Promise.all(classPromises)).filter(c => c !== null);
      setClasses(resolvedClasses);
    } catch (err) {
      console.error('Failed to load classes:', err);
      setClassesError('Failed to load classes. Please check your connection and try again.');
    } finally {
      setClassesLoading(false);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCode.trim() || !user) return;
    setIsJoining(true);
    setJoinError('');
    setJoinSuccess('');
    try {
      const classesRef = collection(db, 'classes');
      const q = query(classesRef, where('classCode', '==', joinCode.trim()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setJoinError('Class code not found. Please verify the code.');
        setIsJoining(false);
        return;
      }
      
      const classDoc = querySnapshot.docs[0];
      const classId = classDoc.id;
      const classData = classDoc.data();
      
      const membershipRef = doc(db, 'users', user.uid, 'memberships', classId);
      const membershipSnap = await getDoc(membershipRef);
      if (membershipSnap.exists()) {
        setJoinError('You are already a member of this class.');
        setIsJoining(false);
        return;
      }
      
      await setDoc(membershipRef, {
        role: 'reader',
        joinedAt: new Date().toISOString()
      });
      
      await updateDoc(doc(db, 'classes', classId), {
        memberCount: increment(1)
      });
      
      setJoinSuccess(`Successfully joined "${classData.name}"!`);
      setJoinCode('');
      loadClasses();
    } catch (err) {
      console.error('Error joining class:', err);
      setJoinError('An error occurred. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const navigateTo = (item) => {
    if (item.type === 'dir') {
      const newPath = !currentPath || currentPath === '' ? `${item.name}/Community` : item.path;
      setPathHistory([...pathHistory, newPath]);
      setCurrentPath(newPath);
    } else {
      addToRecentNotes(item);
      navigate(`/app/note?path=${encodeURIComponent(item.path)}`);
    }
  };

  const goBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      newHistory.pop();
      setPathHistory(newHistory);
      setCurrentPath(newHistory[newHistory.length - 1]);
    }
  };

  const handleCreateFolder = async () => {
    if (!currentPath) return;
    const name = prompt("Enter folder name:");
    if (!name) return;
    try {
      await SupabaseGlobalService.createFolder(`${currentPath}/${name}`, name, currentPath, user.uid);
      loadDirectory(currentPath);
    } catch (err) {
      setError("Failed to create folder");
    }
  };

  const handleCreateNote = async () => {
    if (!currentPath) return;
    const name = prompt("Enter note name:");
    if (!name) return;
    try {
      await SupabaseGlobalService.createNote(`${currentPath}/${name}.md`, `${name}.md`, currentPath, user.uid);
      loadDirectory(currentPath);
    } catch (err) {
      setError("Failed to create note");
    }
  };

  const handleRename = async (e, item) => {
    e.stopPropagation();
    const newName = prompt("Enter new name:", item.name);
    if (!newName || newName === item.name) return;
    try {
      if (item.type === 'file') {
        const newPath = `${item.folder_path}/${newName}`;
        await SupabaseGlobalService.renameNote(item.path, newName, newPath);
      } else {
        setError("Folder renaming is complex and disabled in MVP");
      }
      loadDirectory(currentPath);
    } catch (err) {
      setError("Failed to rename");
    }
  };

  const handleDelete = async (e, item) => {
    e.stopPropagation();
    
    if (universityId) {
      const confirmTrash = window.confirm(`Move "${formatDisplayName(item.name)}" to trash?`);
      if (!confirmTrash) return;
      try {
        const trashService = new TrashService(universityId);
        await trashService.moveToTrash({
          path: item.path,
          name: item.name,
          type: item.type === 'dir' ? 'dir' : 'file',
        });
        loadDirectory(currentPath);
      } catch (err) {
        console.error('Failed to move to trash:', err);
        setError("Failed to move to trash");
      }
    } else {
      const confirmDelete = window.confirm(`Are you sure you want to permanently delete ${item.name}?`);
      if (!confirmDelete) return;
      try {
        if (item.type === 'file') {
          await SupabaseGlobalService.deleteNote(item.path);
        } else {
          await SupabaseGlobalService.deleteFolder(item.path);
        }
        loadDirectory(currentPath);
      } catch (err) {
        setError("Failed to delete");
      }
    }
  };

  const getIconForItem = (path, name, type) => {
    const override = folderIcons[path];
    if (override) {
      return getLucideIcon(override, 24);
    }

    const key = name.toLowerCase();
    if (key.includes('thermo')) return getLucideIcon('local_fire', 24);
    if (key.includes('math') || key.includes('calculus') || key.includes('algebra')) return getLucideIcon('math', 24);
    if (key.includes('electric') || key.includes('beee') || key.includes('circuit')) return getLucideIcon('electrical', 24);
    if (key.includes('chemistry') || key.includes('chem')) return getLucideIcon('science', 24);
    if (key.includes('economics') || key.includes('econ') || key.includes('manage')) return getLucideIcon('bar_chart', 24);
    if (key.includes('code') || key.includes('programming') || key.includes('pps') || key.includes('dsa') || key.includes('algorithm')) return getLucideIcon('code', 24);
    if (key.includes('iot') || key.includes('sensor') || key.includes('embedded')) return getLucideIcon('sensors', 24);
    if (key.includes('physics') || key.includes('mechanics') || key.includes('dynamics')) return getLucideIcon('speed', 24);
    if (key.includes('civil') || key.includes('structure') || key.includes('concrete')) return getLucideIcon('architecture', 24);
    if (key.includes('lab')) return getLucideIcon('biotech', 24);
    if (key.includes('design') || key.includes('drawing') || key.includes('cad')) return getLucideIcon('draw', 24);
    if (key.includes('network') || key.includes('computer network')) return getLucideIcon('lan', 24);
    if (key.includes('database') || key.includes('dbms') || key.includes('sql')) return getLucideIcon('storage', 24);
    if (key.includes('operating') || key.includes('os')) return getLucideIcon('developer_board', 24);
    if (key.includes('machine') || key.includes('manufacturing') || key.includes('workshop')) return getLucideIcon('precision_mfg', 24);
    if (key.includes('english') || key.includes('communication') || key.includes('language')) return getLucideIcon('language', 24);
    if (key.includes('exam') || key.includes('prep') || key.includes('question') || key.includes('bank')) return getLucideIcon('quiz', 24);
    if (key.includes('archive')) return getLucideIcon('archive', 24);
    if (key.includes('doc')) return getLucideIcon('school', 24);
    if (key.includes('sem')) return getLucideIcon('bookmark', 24);
    if (key.includes('unit')) return getLucideIcon('topic', 24);

    return type === 'file' ? <FileText size={24} /> : <Folder size={24} />;
  };

  const formatDisplayName = (name) => {
    if (!name) return '';
    return name.replace(/__[0-9a-f]{4}$/i, '').replace(/\.md$/i, '');
  };

  const getRoleInfo = (cls) => {
    if (cls.creatorUid === user.uid) {
      return { label: 'Admin', icon: <Crown size={12} />, style: 'bg-gold/10 text-gold border border-gold/20' };
    }
    if (cls.role === 'writer') {
      return { label: 'Writer', icon: <Pen size={12} />, style: 'bg-primary/10 text-primary border border-primary/20' };
    }
    return { label: 'Reader', icon: <Eye size={12} />, style: 'bg-surface border border-border/50 text-sub' };
  };

  return (
    <div className="max-w-5xl">
      {/* Dynamic Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-text mb-2">Notebooks</h1>
          
          {activeTab === 'community' ? (
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-sub text-[15px] md:text-[17px]">
              {pathHistory.map((path, idx) => {
                const displayName = idx === 0 
                  ? formatDisplayName(userProfile?.selectedUniversityId || 'University')
                  : formatDisplayName(path.split('/').pop());

                return (
                  <span key={idx} className="flex items-center gap-1.5 md:gap-2">
                    {idx > 0 && <ChevronRight size={16} className="text-dim" />}
                    <button 
                      onClick={() => {
                        const newHistory = pathHistory.slice(0, idx + 1);
                        setPathHistory(newHistory);
                        setCurrentPath(path);
                      }} 
                      className="hover:text-primary transition-colors truncate max-w-[120px] md:max-w-[150px] font-medium"
                    >
                      {displayName}
                    </button>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-sub text-[15px] md:text-[17px]">Access your enrolled courses and view class-specific notes.</p>
          )}
        </div>
        
        {/* Actions Menu */}
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {activeTab === 'community' && pathHistory.length > 1 && (
            <button onClick={goBack} className="flex shrink-0 items-center gap-1 md:gap-2 text-text hover:bg-surface/50 px-3 md:px-4 py-2 rounded-xl transition-colors font-medium">
              <ArrowLeft size={18} />
              <span className="hidden md:inline">Back</span>
            </button>
          )}

          {activeTab === 'classes' && (
            <button 
              onClick={loadClasses} 
              disabled={classesLoading}
              className="flex shrink-0 items-center bg-surface/50 hover:bg-surface text-text px-4 py-2 rounded-xl font-medium transition-colors border border-border/50 text-sm"
            >
              {classesLoading ? 'Loading...' : 'Refresh'}
            </button>
          )}

          {/* Edit Mode Toggle for Community Notes */}
          {activeTab === 'community' && (
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                isEditMode 
                  ? 'bg-primary text-bg shadow-lg shadow-primary/25' 
                  : 'bg-surface/50 hover:bg-surface text-text border border-border/50'
              }`}
            >
              {isEditMode ? <Check size={18} /> : <Pencil size={18} />}
              <span className="text-sm">{isEditMode ? 'Done' : 'Edit'}</span>
            </button>
          )}

          {/* Edit mode actions for Community Notes */}
          {activeTab === 'community' && isEditMode && currentPath && (
            <>
              <button 
                onClick={() => setShowTrash(true)} 
                className="flex shrink-0 items-center gap-1 md:gap-2 text-dim hover:text-red hover:bg-red/10 px-3 md:px-4 py-2 rounded-xl transition-colors font-medium border border-border/50"
              >
                <Trash2 size={18} />
                <span className="hidden md:inline text-sm">Trash</span>
              </button>
              <button onClick={handleCreateFolder} className="flex shrink-0 items-center gap-1 md:gap-2 bg-surface/50 hover:bg-surface text-text px-3 md:px-4 py-2 rounded-xl font-medium transition-colors border border-border/50">
                <Plus size={18} /> <span className="hidden md:inline text-sm">Folder</span>
              </button>
              <button onClick={handleCreateNote} className="flex shrink-0 items-center gap-1 md:gap-2 bg-primary/20 hover:bg-primary/30 text-primary px-3 md:px-4 py-2 rounded-xl font-medium transition-colors">
                <Plus size={18} /> <span className="hidden md:inline text-sm">Note</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modern sliding segmented control pill tab selector */}
      <div className="flex bg-surface/40 p-1.5 rounded-2xl border border-border/30 max-w-md mb-8 relative z-10">
        <button
          onClick={() => handleTabChange('community')}
          className={`flex-1 py-3 text-xs md:text-sm font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activeTab === 'community'
              ? 'bg-primary text-bg shadow-lg shadow-primary/20'
              : 'text-sub hover:text-text'
          }`}
        >
          Community Notes
        </button>
        <button
          onClick={() => handleTabChange('classes')}
          className={`flex-1 py-3 text-xs md:text-sm font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activeTab === 'classes'
              ? 'bg-primary text-bg shadow-lg shadow-primary/20'
              : 'text-sub hover:text-text'
          }`}
        >
          Class Notes
        </button>
      </div>

      {/* Quick Access / Recent Notes Section */}
      {recentNotes.length > 0 && activeTab === 'community' && !searchQuery && (
        <div className="mb-8 animate-fadeIn">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-dim mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Quick Access
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {recentNotes.map((note) => (
              <button
                key={note.path}
                onClick={() => navigate(`/app/note?path=${encodeURIComponent(note.path)}`)}
                className="flex items-center gap-3 bg-surface/30 hover:bg-surface border border-border/20 rounded-2xl px-5 py-3 shrink-0 text-left transition-all hover:scale-102 hover:shadow-md cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text truncate max-w-[130px]">{formatDisplayName(note.name)}</h4>
                  <p className="text-[9px] text-dim mt-0.5">Opened {new Date(note.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Input Container */}
      <div className="relative mb-8 max-w-md animate-fadeIn z-10">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dim">
          <Search size={15} />
        </div>
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={activeTab === 'community' ? "Search folders & notes..." : "Search courses & class codes..."}
          className="w-full bg-surface/20 hover:bg-surface/40 border border-border/20 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-text placeholder-text/30 focus:outline-none focus:border-primary focus:bg-surface/30 focus:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] transition-all"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-dim hover:text-text transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Active Tab Screen Area */}
      <div>
        {activeTab === 'community' ? (
          <div>
            {error && (
              <div className="mb-6 p-4 bg-red/10 text-red rounded-2xl border border-red/20 flex items-start gap-3">
                <div className="mt-0.5"><Folder size={18} /></div>
                <div>{error}</div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.filter(item => 
                  formatDisplayName(item.name).toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="col-span-full py-20 text-center text-dim bg-surface/20 border border-border/30 rounded-3xl border-dashed">
                    {searchQuery ? "No matching folders or notes found." : "This folder is empty."}
                  </div>
                ) : (
                  items.filter(item => 
                    formatDisplayName(item.name).toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((item, idx) => {
                    const style = colorPalette[idx % colorPalette.length];

                    return (
                      <div 
                        key={item.path || idx}
                        onClick={() => navigateTo(item)}
                        className={`bg-surface/30 hover:bg-surface border border-border/40 ${style.border} rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${style.bg} ${style.text}`}>
                          {getIconForItem(item.path, item.name, item.type)}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center h-full">
                          <h3 className="text-text font-semibold truncate text-[15px]">{formatDisplayName(item.name)}</h3>
                        </div>
                        
                        {isEditMode && (
                          <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.type === 'file' && (
                              <button onClick={(e) => handleRename(e, item)} className="p-1.5 text-dim hover:text-text hover:bg-surface rounded-lg">
                                <Edit2 size={14} />
                              </button>
                            )}
                            <button onClick={(e) => handleDelete(e, item)} className="p-1.5 text-dim hover:text-red hover:bg-red/10 rounded-lg">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            {classesError && (
              <div className="mb-6 p-4 bg-red/10 text-red rounded-2xl border border-red/20 flex items-start gap-3">
                <div>{classesError}</div>
                <button onClick={loadClasses} className="ml-auto text-sm font-medium underline">Retry</button>
              </div>
            )}

            {classesLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Join Class Inline Card */}
                <div className="bg-surface/30 border border-border/40 rounded-3xl p-6 flex flex-col justify-between hover:shadow-lg transition-all relative overflow-hidden group min-h-[220px]">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none" />
                  <div>
                    <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Plus size={24} />
                    </div>
                    <h3 className="text-text font-bold text-[17px] mb-1">Join New Class</h3>
                    <p className="text-dim text-[11px] leading-relaxed mb-4">Enter a class code to join the course and view class notes.</p>
                  </div>
                  <form onSubmit={handleJoinClass} className="space-y-2 relative z-10">
                    <input 
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Class Code (e.g. AB12CD)"
                      className="w-full bg-bg border border-border/40 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-text focus:outline-none focus:border-primary transition-all uppercase tracking-wider"
                    />
                    <button 
                      type="submit" 
                      disabled={isJoining}
                      className="w-full py-2.5 bg-primary text-bg rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary/10"
                    >
                      {isJoining ? 'Joining...' : 'Join Class'}
                    </button>
                    {joinError && <p className="text-red text-[10px] font-semibold mt-1">{joinError}</p>}
                    {joinSuccess && <p className="text-green text-[10px] font-semibold mt-1">{joinSuccess}</p>}
                  </form>
                </div>

                {classes.filter(cls => 
                  (cls.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (cls.classCode || '').toLowerCase().includes(searchQuery.toLowerCase())
                ).map((cls, idx) => {
                  const style = colorPalette[idx % colorPalette.length];
                  const roleInfo = getRoleInfo(cls);

                  return (
                    <div 
                      key={cls.id} 
                      onClick={() => navigate(`/app/class-notes?classId=${cls.id}&className=${encodeURIComponent(cls.name)}`)}
                      className={`bg-surface/30 border border-border/40 hover:${style.accent} rounded-3xl p-6 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group`}
                    >
                      <div className={`w-14 h-14 ${style.bg} ${style.text} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                        <span className="font-bold text-xl">{(cls.classCode || cls.name?.[0] || 'C').charAt(0)}</span>
                      </div>
                      <h3 className="text-text font-semibold text-[17px] mb-1 truncate">{cls.name || 'Unnamed Class'}</h3>
                      <div className="flex items-center gap-1.5 text-dim text-sm mb-4">
                        <Users size={14} />
                        <span>{cls.memberCount || 0} members</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${roleInfo.style}`}>
                          {roleInfo.icon}
                          {roleInfo.label}
                        </span>
                        <ChevronRight size={16} className="text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trash Modal */}
      {showTrash && universityId && (
        <TrashScreen 
          universityId={universityId} 
          onClose={() => setShowTrash(false)}
          onRestored={() => loadDirectory(currentPath)}
        />
      )}
    </div>
  );
}
