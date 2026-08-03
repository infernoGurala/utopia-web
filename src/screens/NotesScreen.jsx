import { useState, useEffect, useRef } from 'react';
import { SupabaseGlobalService } from '../services/SupabaseGlobalService';
import { TrashService } from '../services/TrashService';
import { Folder, FileText, ArrowLeft, ChevronRight, Plus, Edit2, Trash2, Check, Pencil, Users, Crown, Pen, Eye } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getLucideIcon } from '../utils/IconMap';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, doc, getDoc, query, where, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../services/firebase';
import TrashScreen from './TrashScreen';
import UtopiaLoader from '../components/UtopiaLoader';

export default function NotesScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userProfile } = useTheme();
  const { user } = useAuth();
  
  // Tab state: 'community' or 'classes'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'community');
  const latestFetchedPath = useRef('');

  // --- Community Notes States ---
  const [items, setItems] = useState([]);
  const [folderIcons, setFolderIcons] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  
  const defaultUni = userProfile?.selectedUniversityId ? `${userProfile.selectedUniversityId}/Community` : '';
  
  // Reconstruct path history on mount if folder param is present in URL
  const getInitialPathHistory = () => {
    const folder = searchParams.get('folder');
    if (folder) {
      const parts = folder.split('/');
      const history = [];
      let running = '';
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === 'Community' && i > 0) {
          running = `${parts[i-1]}/Community`;
          history.push(running);
        } else if (running) {
          running = `${running}/${parts[i]}`;
          history.push(running);
        }
      }
      if (history.length > 0) return history;
      return [folder];
    }
    return [defaultUni];
  };

  const [currentPath, setCurrentPath] = useState(searchParams.get('folder') || defaultUni);
  const [pathHistory, setPathHistory] = useState(getInitialPathHistory());

  // --- Class List States ---
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState('');

  // --- Search & Filter States ---
  const searchQuery = '';

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
      const folderParam = searchParams.get('folder');
      if (folderParam) {
        setCurrentPath(folderParam);
        const parts = folderParam.split('/');
        const history = [];
        let running = '';
        for (let i = 0; i < parts.length; i++) {
          if (parts[i] === 'Community' && i > 0) {
            running = `${parts[i-1]}/Community`;
            history.push(running);
          } else if (running) {
            running = `${running}/${parts[i]}`;
            history.push(running);
          }
        }
        if (history.length === 0) {
          history.push(folderParam);
        }
        setPathHistory(history);
      } else if (newUni) {
        setCurrentPath(newUni);
        setPathHistory([newUni]);
      }
    }
  }, [userProfile, searchParams]);

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
    latestFetchedPath.current = path;
    setLoading(true);
    setError('');
    try {
      if (!path || path === '') {
        const unis = await SupabaseGlobalService.getUniversities();
        if (latestFetchedPath.current === path) {
          setItems(unis.map(u => ({ ...u, type: 'dir', name: u.path.split('/')[0] })));
          setFolderIcons({});
        }
      } else {
        const contents = await SupabaseGlobalService.getDirectoryContents(path);
        
        let icons = {};
        try {
          icons = await SupabaseGlobalService.getFolderIcons(path);
        } catch (e) {
          console.warn('Failed to load folder icons:', e);
        }

        let trashedPaths = new Set();
        try {
          const uniId = userProfile?.selectedUniversityId || path.split('/')[0] || '';
          if (uniId) {
            const trashService = new TrashService(uniId);
            trashedPaths = await trashService.getTrashedPaths();
          }
        } catch (e) {
          console.warn('Failed to load trash paths:', e);
        }

        if (latestFetchedPath.current === path) {
          const visibleContents = contents.filter(item => !trashedPaths.has(item.path));
          setItems(visibleContents);
          setFolderIcons(icons);
        }
      }
    } catch (err) {
      console.error(err);
      if (latestFetchedPath.current === path) {
        setError('Failed to load community notes.');
      }
    } finally {
      if (latestFetchedPath.current === path) {
        setLoading(false);
      }
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
      setSearchParams({ tab: activeTab, folder: newPath });
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
      const newPath = newHistory[newHistory.length - 1];
      setCurrentPath(newPath);
      setSearchParams({ tab: activeTab, folder: newPath });
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
      return getLucideIcon(override, 20);
    }

    const key = name.toLowerCase();
    if (key.includes('thermo')) return getLucideIcon('local_fire', 20);
    if (key.includes('math') || key.includes('calculus') || key.includes('algebra')) return getLucideIcon('math', 20);
    if (key.includes('electric') || key.includes('beee') || key.includes('circuit')) return getLucideIcon('electrical', 20);
    if (key.includes('chemistry') || key.includes('chem')) return getLucideIcon('science', 20);
    if (key.includes('economics') || key.includes('econ') || key.includes('manage')) return getLucideIcon('bar_chart', 20);
    if (key.includes('code') || key.includes('programming') || key.includes('pps') || key.includes('dsa') || key.includes('algorithm')) return getLucideIcon('code', 20);
    if (key.includes('iot') || key.includes('sensor') || key.includes('embedded')) return getLucideIcon('sensors', 20);
    if (key.includes('physics') || key.includes('mechanics') || key.includes('dynamics')) return getLucideIcon('speed', 20);
    if (key.includes('civil') || key.includes('structure') || key.includes('concrete')) return getLucideIcon('architecture', 20);
    if (key.includes('lab')) return getLucideIcon('biotech', 20);
    if (key.includes('design') || key.includes('drawing') || key.includes('cad')) return getLucideIcon('draw', 20);
    if (key.includes('network') || key.includes('computer network')) return getLucideIcon('lan', 20);
    if (key.includes('database') || key.includes('dbms') || key.includes('sql')) return getLucideIcon('storage', 20);
    if (key.includes('operating') || key.includes('os')) return getLucideIcon('developer_board', 20);
    if (key.includes('machine') || key.includes('manufacturing') || key.includes('workshop')) return getLucideIcon('precision_mfg', 20);
    if (key.includes('english') || key.includes('communication') || key.includes('language')) return getLucideIcon('language', 20);
    if (key.includes('exam') || key.includes('prep') || key.includes('question') || key.includes('bank')) return getLucideIcon('quiz', 20);
    if (key.includes('archive')) return getLucideIcon('archive', 20);
    if (key.includes('doc')) return getLucideIcon('school', 20);
    if (key.includes('sem')) return getLucideIcon('bookmark', 20);
    if (key.includes('unit')) return getLucideIcon('topic', 20);

    return type === 'file' ? <FileText size={20} /> : <Folder size={20} />;
  };

  const formatDisplayName = (name) => {
    if (!name) return '';
    return name.replace(/__[0-9a-f]{4}$/i, '').replace(/\.md$/i, '');
  };

  const getRoleInfo = (cls) => {
    if (cls.creatorUid === user.uid) {
      return { label: 'Admin', icon: <Crown size={12} />, style: 'bg-text text-bg font-medium' };
    }
    if (cls.role === 'writer') {
      return { label: 'Writer', icon: <Pen size={12} />, style: 'border border-text text-text font-medium' };
    }
    return { label: 'Reader', icon: <Eye size={12} />, style: 'border border-border text-sub' };
  };

  return (
    <div className="max-w-5xl font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text mb-1 select-none">Notebooks</h1>
          
          {activeTab === 'community' ? (
            <div className="flex flex-wrap items-center gap-1.5 text-sub text-sm">
              {pathHistory.map((path, idx) => {
                const displayName = idx === 0 
                  ? formatDisplayName(userProfile?.selectedUniversityId || 'University')
                  : formatDisplayName(path.split('/').pop());

                return (
                  <span key={idx} className="flex items-center gap-1.5">
                    {idx > 0 && <ChevronRight size={14} className="text-dim" />}
                    <button 
                      onClick={() => {
                        const newHistory = pathHistory.slice(0, idx + 1);
                        setPathHistory(newHistory);
                        setCurrentPath(path);
                        setSearchParams({ tab: activeTab, folder: path });
                      }} 
                      className="hover:text-text transition-colors truncate max-w-[150px] font-medium"
                    >
                      {displayName}
                    </button>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-sub text-sm">Access your enrolled courses and view class-specific notes.</p>
          )}
        </div>
        
        {/* Actions Menu */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          {activeTab === 'community' && pathHistory.length > 1 && (
            <button onClick={goBack} className="flex items-center gap-1 text-text hover:bg-surface px-3 py-1.5 rounded border border-border text-xs font-medium transition-colors">
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          )}

          {activeTab === 'classes' && (
            <button 
              onClick={loadClasses} 
              disabled={classesLoading}
              className="flex items-center bg-surface hover:bg-border/30 text-text px-3 py-1.5 rounded text-xs font-medium transition-colors border border-border"
            >
              {classesLoading ? 'Loading...' : 'Refresh'}
            </button>
          )}

          {/* Edit Mode Toggle for Community Notes */}
          {activeTab === 'community' && (
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                isEditMode 
                  ? 'bg-text text-bg' 
                  : 'bg-surface hover:bg-border/30 text-text border border-border'
              }`}
            >
              {isEditMode ? <Check size={14} /> : <Pencil size={14} />}
              <span>{isEditMode ? 'Done' : 'Edit'}</span>
            </button>
          )}

          {/* Edit mode actions for Community Notes */}
          {activeTab === 'community' && isEditMode && currentPath && (
            <>
              <button 
                onClick={() => setShowTrash(true)} 
                className="flex items-center gap-1 text-sub hover:text-text hover:bg-surface px-3 py-1.5 rounded text-xs font-medium border border-border transition-colors"
              >
                <Trash2 size={14} />
                <span>Trash</span>
              </button>
              <button onClick={handleCreateFolder} className="flex items-center gap-1 bg-surface hover:bg-border/30 text-text px-3 py-1.5 rounded text-xs font-medium border border-border transition-colors">
                <Plus size={14} /> <span>Folder</span>
              </button>
              <button onClick={handleCreateNote} className="flex items-center gap-1 bg-text text-bg px-3 py-1.5 rounded text-xs font-medium transition-colors">
                <Plus size={14} /> <span>Note</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => handleTabChange('community')}
          className={`pb-2.5 px-4 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
            activeTab === 'community'
              ? 'border-text text-text'
              : 'border-transparent text-sub hover:text-text'
          }`}
        >
          Community
        </button>
        <button
          onClick={() => handleTabChange('classes')}
          className={`pb-2.5 px-4 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
            activeTab === 'classes'
              ? 'border-text text-text'
              : 'border-transparent text-sub hover:text-text'
          }`}
        >
          Classes
        </button>
      </div>

      {/* Active Tab Content */}
      <div>
        {activeTab === 'community' ? (
          <div>
            {error && (
              <div className="mb-4 p-3 bg-red/10 text-red rounded border border-red/20 text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-16">
                <UtopiaLoader />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.filter(item => 
                  formatDisplayName(item.name).toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="col-span-full py-12 text-center text-sub bg-surface/40 border border-border rounded">
                    {searchQuery ? "No matching folders or notes found." : "This folder is empty."}
                  </div>
                ) : (
                  items.filter(item => 
                    formatDisplayName(item.name).toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((item, idx) => {
                    return (
                      <div 
                        key={item.path || idx}
                        onClick={() => navigateTo(item)}
                        className="card-premium-mono rounded p-4 flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded flex items-center justify-center bg-surface border border-border text-text shrink-0">
                          {getIconForItem(item.path, item.name, item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-text font-medium text-sm truncate">{formatDisplayName(item.name)}</h3>
                        </div>
                        
                        {isEditMode && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.type === 'file' && (
                              <button onClick={(e) => handleRename(e, item)} className="p-1 text-sub hover:text-text rounded cursor-pointer">
                                <Edit2 size={14} />
                              </button>
                            )}
                            <button onClick={(e) => handleDelete(e, item)} className="p-1 text-sub hover:text-text rounded cursor-pointer">
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
              <div className="mb-4 p-3 bg-red/10 text-red rounded border border-red/20 text-sm flex items-center justify-between">
                <span>{classesError}</span>
                <button onClick={loadClasses} className="text-xs font-semibold underline">Retry</button>
              </div>
            )}

            {classesLoading ? (
              <div className="flex justify-center py-16">
                <UtopiaLoader />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Join Class Card */}
                <div className="card-premium-mono rounded p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-9 h-9 bg-surface text-text rounded flex items-center justify-center mb-3 border border-border">
                      <Plus size={18} />
                    </div>
                    <h3 className="font-semibold text-text text-sm mb-1">Join a Class</h3>
                    <p className="text-sub text-xs">Enter a class code to enroll in a course.</p>
                  </div>
                  <form onSubmit={handleJoinClass} className="space-y-2">
                    <input 
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Class Code (e.g. AB12CD)"
                      className="w-full bg-transparent border border-border focus:border-text px-3 py-1.5 rounded text-xs text-text focus:outline-none transition-colors uppercase tracking-wider"
                    />
                    <button 
                      type="submit" 
                      disabled={isJoining}
                      className="w-full py-1.5 btn-premium-mono rounded cursor-pointer text-xs"
                    >
                      {isJoining ? 'Joining...' : 'Join Class'}
                    </button>
                    {joinError && <p className="text-red text-xs mt-1">{joinError}</p>}
                    {joinSuccess && <p className="text-green text-xs mt-1">{joinSuccess}</p>}
                  </form>
                </div>

                {classes.filter(cls => 
                  (cls.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (cls.classCode || '').toLowerCase().includes(searchQuery.toLowerCase())
                ).map((cls) => {
                  const roleInfo = getRoleInfo(cls);

                  return (
                    <div 
                      key={cls.id} 
                      onClick={() => navigate(`/app/class-notes?classId=${cls.id}&className=${encodeURIComponent(cls.name)}`)}
                      className="card-premium-mono rounded p-5 cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-9 h-9 bg-surface text-text rounded flex items-center justify-center mb-3 border border-border font-medium text-sm">
                          {(cls.classCode || cls.name?.[0] || 'C').charAt(0)}
                        </div>
                        <h3 className="text-text font-semibold text-sm mb-1 truncate">
                          {cls.name || 'Unnamed Class'}
                        </h3>
                        <div className="flex items-center gap-1.5 text-sub text-xs mb-3">
                          <Users size={12} />
                          <span>{cls.memberCount || 0} members</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${roleInfo.style}`}>
                          {roleInfo.icon}
                          {roleInfo.label}
                        </span>
                        <ChevronRight size={14} className="text-dim group-hover:translate-x-0.5 transition-transform" />
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
