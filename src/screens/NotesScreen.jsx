import { useState, useEffect, useRef } from 'react';
import { GoogleDriveService, ROOT_FOLDER_ID } from '../services/GoogleDriveService';
import { 
  Folder, FileText, ArrowLeft, ChevronRight, Plus, Search, Users, Crown, 
  Pen, Eye, ExternalLink, RefreshCw, Upload, UploadCloud, X, CheckCircle, 
  AlertCircle, FolderPlus, FileUp
} from 'lucide-react';
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
  const [isSilentRefreshing, setIsSilentRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Folder ID & Navigation History
  const initialFolderId = searchParams.get('folderId') || ROOT_FOLDER_ID;
  const initialFolderName = searchParams.get('folderName') || 'Home';
  
  const [currentFolderId, setCurrentFolderId] = useState(initialFolderId);
  const [pathHistory, setPathHistory] = useState([
    { id: ROOT_FOLDER_ID, name: 'Home' }
  ]);

  // --- Drag and Drop & Upload States ---
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef(null);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [showUploadDrawer, setShowUploadDrawer] = useState(false);

  // --- New Folder Modal State ---
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderError, setFolderError] = useState('');

  // --- Class List States ---
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState('');

  // --- Join Class States ---
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  // Current active folder name helper
  const currentFolderName = pathHistory[pathHistory.length - 1]?.name || 'Home';

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
  const loadDirectory = async (folderId, isSilent = false) => {
    latestFetchedFolderId.current = folderId;
    if (!isSilent) setLoading(true);
    else setIsSilentRefreshing(true);
    setError('');

    try {
      const contents = await GoogleDriveService.getDirectoryContents(folderId);
      if (latestFetchedFolderId.current === folderId) {
        setItems(contents);
      }
    } catch (err) {
      console.error("Failed to load Google Drive directory:", err);
      if (latestFetchedFolderId.current === folderId && !isSilent) {
        setError(err.message || 'Failed to load folders from Google Drive.');
      }
    } finally {
      if (latestFetchedFolderId.current === folderId) {
        setLoading(false);
        setIsSilentRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'community') {
      loadDirectory(currentFolderId);
    }
  }, [currentFolderId, activeTab]);

  // --- Bi-Directional Auto-Sync: Poll Google Drive every 25 seconds for new files ---
  useEffect(() => {
    if (activeTab !== 'community') return;

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && !loading) {
        loadDirectory(currentFolderId, true);
      }
    }, 25000);

    return () => clearInterval(intervalId);
  }, [currentFolderId, activeTab, loading]);

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

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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

  // --- Upload Files Process Handler ---
  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    
    setShowUploadDrawer(true);
    const newQueueItems = Array.from(files).map((f) => ({
      id: `${f.name}_${Date.now()}_${Math.random()}`,
      file: f,
      name: f.name,
      size: f.size,
      status: 'uploading', // 'uploading' | 'done' | 'error'
      errorMsg: ''
    }));

    setUploadQueue(prev => [...prev, ...newQueueItems]);

    // Process uploads sequentially to avoid rate limits
    for (const item of newQueueItems) {
      try {
        await GoogleDriveService.uploadFile(item.file, currentFolderId);
        setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'done' } : q));
      } catch (err) {
        console.error("Upload error for", item.name, err);
        setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', errorMsg: err.message || 'Upload failed' } : q));
      }
    }

    // Refresh directory so newly uploaded items show immediately
    loadDirectory(currentFolderId, true);
  };

  // --- Drag and Drop Listeners ---
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (activeTab === 'community' && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    dragCounter.current = 0;

    if (activeTab !== 'community') return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  // --- New Folder Creator ---
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    setFolderError('');
    try {
      await GoogleDriveService.createFolder(newFolderName.trim(), currentFolderId);
      setNewFolderName('');
      setIsFolderModalOpen(false);
      loadDirectory(currentFolderId);
    } catch (err) {
      console.error("Failed to create folder:", err);
      setFolderError(err.message || 'Failed to create folder.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className="max-w-5xl font-sans relative min-h-[85vh]"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden File Input for Toolbar Upload Button */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadFiles(e.target.files);
            e.target.value = ''; // reset
          }
        }}
        multiple
        className="hidden"
      />

      {/* Full-Screen Drag & Drop Overlay */}
      {isDraggingOver && activeTab === 'community' && (
        <div className="fixed inset-0 z-50 bg-bg/85 backdrop-blur-md flex flex-col items-center justify-center border-2 border-dashed border-text/60 transition-all pointer-events-none select-none">
          <div className="p-8 rounded-2xl bg-surface/90 border border-border text-center shadow-2xl max-w-md mx-4 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-full bg-text/10 text-text mx-auto flex items-center justify-center mb-4 animate-bounce">
              <UploadCloud size={32} />
            </div>
            <h3 className="text-xl font-bold text-text mb-1">Drop files to upload</h3>
            <p className="text-sub text-sm mb-3">
              Uploading directly to Google Drive folder: <br />
              <span className="font-semibold text-text">"{currentFolderName}"</span>
            </p>
            <p className="text-[11px] text-dim">
              Supports Markdown (.md), PDF (.pdf), Text (.txt), Images, etc.
            </p>
          </div>
        </div>
      )}

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
                className="pl-8 pr-3 py-1.5 bg-surface border border-border focus:border-text rounded text-xs text-text focus:outline-none transition-colors w-40 md:w-52"
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
            <>
              {/* Upload to Drive Button */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center btn-premium-mono px-3 py-1.5 rounded text-xs font-medium transition-colors gap-1.5 cursor-pointer"
                title="Upload files to this folder in Google Drive"
              >
                <Upload size={13} />
                <span>Upload</span>
              </button>

              {/* Create Folder Button */}
              <button 
                onClick={() => { setIsFolderModalOpen(true); setFolderError(''); }}
                className="flex items-center bg-surface hover:bg-border/30 text-text px-3 py-1.5 rounded text-xs font-medium transition-colors border border-border gap-1.5 cursor-pointer"
                title="Create New Folder in Google Drive"
              >
                <FolderPlus size={13} />
                <span className="hidden sm:inline">New Folder</span>
              </button>

              {/* Refresh / Sync Button */}
              <button 
                onClick={() => loadDirectory(currentFolderId)} 
                disabled={loading || isSilentRefreshing}
                className="flex items-center bg-surface hover:bg-border/30 text-text px-3 py-1.5 rounded text-xs font-medium transition-colors border border-border gap-1 cursor-pointer"
                title="Sync & refresh from Google Drive"
              >
                <RefreshCw size={12} className={loading || isSilentRefreshing ? "animate-spin text-text" : ""} />
                <span className="hidden sm:inline">Sync</span>
              </button>
            </>
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

            {/* Drag & Drop Quick Drop Zone Banner */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="mb-4 border border-dashed border-border/80 hover:border-text/60 bg-surface/30 hover:bg-surface/60 transition-all rounded p-3 text-center cursor-pointer flex items-center justify-center gap-2 group"
            >
              <FileUp size={15} className="text-sub group-hover:text-text transition-colors" />
              <span className="text-xs text-sub group-hover:text-text transition-colors">
                Drag and drop files here to upload directly to <strong className="text-text font-medium">{currentFolderName}</strong> (or click to browse)
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <UtopiaLoader />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredItems.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-sub bg-surface/40 border border-border rounded">
                    {searchQuery ? "No matching folders or notes found." : "This folder is empty. Drag and drop notes here to get started!"}
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
                              {item.size && ` • ${formatFileSize(item.size)}`}
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

      {/* Floating Upload Progress Drawer */}
      {showUploadDrawer && uploadQueue.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 w-80 md:w-96 bg-surface border border-border rounded-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          <div className="p-3 bg-bg border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload size={14} className="text-text" />
              <span className="text-xs font-semibold text-text">
                Drive Uploads ({uploadQueue.filter(q => q.status === 'done').length}/{uploadQueue.length})
              </span>
            </div>
            <button 
              onClick={() => {
                setShowUploadDrawer(false);
                setUploadQueue([]);
              }}
              className="text-sub hover:text-text p-1 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          
          <div className="max-h-60 overflow-y-auto divide-y divide-border p-2 space-y-1">
            {uploadQueue.map(item => (
              <div key={item.id} className="p-2 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="text-text font-medium truncate">{item.name}</p>
                  <p className="text-sub text-[10px]">{formatFileSize(item.size)}</p>
                  {item.errorMsg && (
                    <p className="text-red text-[10px] mt-0.5 line-clamp-2 leading-tight">{item.errorMsg}</p>
                  )}
                </div>
                <div>
                  {item.status === 'uploading' && (
                    <RefreshCw size={14} className="animate-spin text-text shrink-0" />
                  )}
                  {item.status === 'done' && (
                    <CheckCircle size={15} className="text-green shrink-0" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle size={15} className="text-red shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderPlus size={18} className="text-text" />
                <h3 className="text-base font-semibold text-text">New Folder</h3>
              </div>
              <button 
                onClick={() => setIsFolderModalOpen(false)} 
                className="text-sub hover:text-text"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs text-sub mb-1">Folder Name</label>
                <input
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Unit 3 - Operating Systems"
                  className="w-full bg-bg border border-border focus:border-text px-3 py-2 rounded text-xs text-text focus:outline-none transition-colors"
                />
              </div>

              {folderError && (
                <p className="text-red text-xs">{folderError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-3 py-1.5 border border-border hover:bg-bg rounded text-xs text-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="px-4 py-1.5 btn-premium-mono rounded text-xs font-medium transition-colors"
                >
                  {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

