import { useState, useEffect, useRef } from 'react';
import { GoogleDriveService, ROOT_FOLDER_ID } from '../services/GoogleDriveService';
import { Folder, FileText, ArrowLeft, ChevronRight, Plus, Search, Users, Crown, Pen, Eye, ExternalLink, RefreshCw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getLucideIcon } from '../utils/IconMap';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, doc, getDoc, query, where, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../services/firebase';
import UtopiaLoader from '../components/UtopiaLoader';

export default function NotesScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Tab state: 'community' or 'classes'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'community');
  const latestFetchedFolderId = useRef('');

  // --- Google Drive Community Notes States ---
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Folder ID & Navigation History
  const initialFolderId = searchParams.get('folderId') || ROOT_FOLDER_ID;
  const initialFolderName = searchParams.get('folderName') || 'Home';
  
  const [currentFolderId, setCurrentFolderId] = useState(initialFolderId);
  const [pathHistory, setPathHistory] = useState([
    { id: ROOT_FOLDER_ID, name: 'Home' }
  ]);

  // --- Class List States ---
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState('');

  // --- Join Class States ---
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  // Synchronize Tab and URL params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && (tabParam === 'community' || tabParam === 'classes')) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab, folderId: currentFolderId });
  };

  // --- Fetch Directory Contents from Google Drive ---
  const loadDirectory = async (folderId) => {
    latestFetchedFolderId.current = folderId;
    setLoading(true);
    setError('');
    try {
      const contents = await GoogleDriveService.getDirectoryContents(folderId);
      if (latestFetchedFolderId.current === folderId) {
        setItems(contents);
      }
    } catch (err) {
      console.error("Failed to load Google Drive directory:", err);
      if (latestFetchedFolderId.current === folderId) {
        setError(err.message || 'Failed to load folders from Google Drive.');
      }
    } finally {
      if (latestFetchedFolderId.current === folderId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'community') {
      loadDirectory(currentFolderId);
    }
  }, [currentFolderId, activeTab]);

  // --- Class List Effects ---
  useEffect(() => {
    if (user && activeTab === 'classes') {
      loadClasses();
    }
  }, [user, activeTab]);

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
      const nextHistory = [...pathHistory, { id: item.id, name: item.name }];
      setPathHistory(nextHistory);
      setCurrentFolderId(item.id);
      setSearchParams({ tab: activeTab, folderId: item.id, folderName: item.name });
    } else {
      if (item.mimeType === 'application/pdf' || item.name.toLowerCase().endsWith('.pdf')) {
        if (item.webViewLink) {
          window.open(item.webViewLink, '_blank', 'noopener,noreferrer');
        }
      } else {
        navigate(`/app/note?fileId=${item.id}&name=${encodeURIComponent(item.name)}&folderId=${currentFolderId}`);
      }
    }
  };

  const goBack = () => {
    if (pathHistory.length > 1) {
      const nextHistory = [...pathHistory];
      nextHistory.pop();
      setPathHistory(nextHistory);
      const parent = nextHistory[nextHistory.length - 1];
      setCurrentFolderId(parent.id);
      setSearchParams({ tab: activeTab, folderId: parent.id, folderName: parent.name });
    }
  };

  const jumpToBreadcrumb = (idx) => {
    const nextHistory = pathHistory.slice(0, idx + 1);
    setPathHistory(nextHistory);
    const target = nextHistory[idx];
    setCurrentFolderId(target.id);
    setSearchParams({ tab: activeTab, folderId: target.id, folderName: target.name });
  };

  const formatDisplayName = (name) => {
    if (!name) return '';
    return name.replace(/\.md$/i, '').replace(/\.txt$/i, '');
  };

  const getIconForItem = (name, type, mimeType) => {
    const key = name.toLowerCase();
    if (mimeType === 'application/pdf' || key.endsWith('.pdf')) {
      return <FileText size={20} className="text-red" />;
    }
    if (key.includes('ai') || key.includes('ml') || key.includes('machine learning')) return getLucideIcon('biotech', 20);
    if (key.includes('cse') || key.includes('computer') || key.includes('code') || key.includes('software') || key.includes('dsa') || key.includes('algorithm')) return getLucideIcon('code', 20);
    if (key.includes('data') || key.includes('database') || key.includes('dbms') || key.includes('sql')) return getLucideIcon('storage', 20);
    if (key.includes('civil') || key.includes('structure') || key.includes('cad')) return getLucideIcon('architecture', 20);
    if (key.includes('mech') || key.includes('thermo') || key.includes('fluid') || key.includes('workshop')) return getLucideIcon('speed', 20);
    if (key.includes('math') || key.includes('calculus') || key.includes('algebra')) return getLucideIcon('math', 20);
    if (key.includes('electric') || key.includes('beee') || key.includes('circuit')) return getLucideIcon('electrical', 20);
    if (key.includes('chem')) return getLucideIcon('science', 20);
    if (key.includes('sem')) return getLucideIcon('bookmark', 20);
    if (key.includes('unit') || key.includes('module')) return getLucideIcon('topic', 20);

    return type === 'file' ? <FileText size={20} /> : <Folder size={20} />;
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

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text mb-1 select-none">Notebooks</h1>
          
          {activeTab === 'community' ? (
            <div className="flex flex-wrap items-center gap-1.5 text-sub text-sm">
              {pathHistory.map((folder, idx) => (
                <span key={folder.id} className="flex items-center gap-1.5">
                  {idx > 0 && <ChevronRight size={14} className="text-dim" />}
                  <button 
                    onClick={() => jumpToBreadcrumb(idx)} 
                    className={`hover:text-text transition-colors truncate max-w-[180px] ${idx === pathHistory.length - 1 ? 'text-text font-semibold' : 'font-medium'}`}
                  >
                    {folder.name}
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sub text-sm">Access your enrolled courses and view class-specific notes.</p>
          )}
        </div>
        
        {/* Actions Menu */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          {activeTab === 'community' && (
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sub" />
              <input
                type="text"
                placeholder="Search notes & folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-surface border border-border focus:border-text rounded text-xs text-text focus:outline-none transition-colors w-48 md:w-56"
              />
            </div>
          )}

          {activeTab === 'community' && pathHistory.length > 1 && (
            <button onClick={goBack} className="flex items-center gap-1 text-text hover:bg-surface px-3 py-1.5 rounded border border-border text-xs font-medium transition-colors">
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          )}

          {activeTab === 'community' && (
            <button 
              onClick={() => loadDirectory(currentFolderId)} 
              disabled={loading}
              className="flex items-center bg-surface hover:bg-border/30 text-text px-3 py-1.5 rounded text-xs font-medium transition-colors border border-border gap-1"
              title="Refresh Google Drive"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
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
          Google Drive Notes
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
              <div className="mb-4 p-3 bg-red/10 text-red rounded border border-red/20 text-sm flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => loadDirectory(currentFolderId)} className="text-xs font-semibold underline ml-2">Retry</button>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-16">
                <UtopiaLoader />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredItems.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-sub bg-surface/40 border border-border rounded">
                    {searchQuery ? "No matching folders or notes found." : "This folder is empty."}
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isPdf = item.mimeType === 'application/pdf' || item.name.toLowerCase().endsWith('.pdf');

                    return (
                      <div 
                        key={item.id}
                        onClick={() => navigateTo(item)}
                        className="card-premium-mono rounded p-4 flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded flex items-center justify-center bg-surface border border-border text-text shrink-0">
                          {getIconForItem(item.name, item.type, item.mimeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-text font-medium text-sm truncate">{formatDisplayName(item.name)}</h3>
                          {item.type === 'file' && (
                            <p className="text-sub text-[11px] mt-0.5 truncate">
                              {isPdf ? 'PDF Document' : 'Markdown Note'}
                            </p>
                          )}
                        </div>
                        
                        {isPdf && (
                          <div className="text-sub opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink size={14} />
                          </div>
                        )}
                        {item.type === 'dir' && (
                          <ChevronRight size={16} className="text-dim group-hover:translate-x-0.5 transition-transform" />
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
    </div>
  );
}
