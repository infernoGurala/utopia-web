import { useState, useEffect, useRef } from 'react';
import { SupabaseGlobalService } from '../services/SupabaseGlobalService';
import { Folder, FileText, ArrowLeft, ChevronRight, Plus, Edit2, Trash2, Check, Pencil, Users, Settings } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getLucideIcon } from '../utils/IconMap';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import UtopiaLoader from '../components/UtopiaLoader';

export default function ClassNotesScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userProfile } = useTheme();
  const { user = null } = useAuth() || {};

  const classId = searchParams.get('classId') || '';
  const classNameParam = searchParams.get('className') || 'Class';
  const className = classData?.name || classNameParam;

  const universityFolder = userProfile?.selectedUniversityId || '';

  // The root path for class notes: {university}/{classId}/Notes/
  const rootPath = universityFolder ? `${universityFolder}/${classId}/Notes` : '';
  const latestFetchedPath = useRef('');

  const [items, setItems] = useState([]);
  const [folderIcons, setFolderIcons] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [classData, setClassData] = useState(null);

  const [currentPath, setCurrentPath] = useState(rootPath);
  const [pathHistory, setPathHistory] = useState([rootPath]);

  // Update path/history when universityFolder, classId or folder query param changes
  useEffect(() => {
    if (universityFolder && classId) {
      const newRoot = `${universityFolder}/${classId}/Notes`;
      const folderParam = searchParams.get('folder');
      if (folderParam && folderParam.startsWith(newRoot)) {
        setCurrentPath(folderParam);
        // Reconstruct pathHistory from newRoot to folderParam
        const suffix = folderParam.substring(newRoot.length);
        const parts = suffix.split('/').filter(Boolean);
        const history = [newRoot];
        let running = newRoot;
        for (const part of parts) {
          running = `${running}/${part}`;
          history.push(running);
        }
        setPathHistory(history);
      } else {
        setCurrentPath(newRoot);
        setPathHistory([newRoot]);
      }
    }
  }, [universityFolder, classId, searchParams]);

  // Load class metadata
  useEffect(() => {
    if (classId) {
      loadClassData();
    }
  }, [classId]);

  // Load directory when path changes
  useEffect(() => {
    if (currentPath) {
      loadDirectory(currentPath);
    }
  }, [currentPath]);

  const loadClassData = async () => {
    try {
      const classDoc = await getDoc(doc(db, 'classes', classId));
      if (classDoc.exists()) {
        const data = classDoc.data();
        setClassData(data);
        // Fetch owner name
        if (data.creatorUid) {
          const ownerDoc = await getDoc(doc(db, 'users', data.creatorUid));
          if (ownerDoc.exists()) {
            setOwnerName(ownerDoc.data()?.displayName || 'Unknown');
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load class data:', err);
    }
  };

  const loadDirectory = async (path) => {
    if (!path) return;
    latestFetchedPath.current = path;
    setLoading(true);
    setError('');
    try {
      const contents = await SupabaseGlobalService.getDirectoryContents(path);
      const icons = await SupabaseGlobalService.getFolderIcons(path);
      if (latestFetchedPath.current === path) {
        setItems(contents);
        setFolderIcons(icons);
      }
    } catch (err) {
      console.error(err);
      if (latestFetchedPath.current === path) {
        setError('Failed to load class notes.');
      }
    } finally {
      if (latestFetchedPath.current === path) {
        setLoading(false);
      }
    }
  };

  const navigateTo = (item) => {
    if (item.type === 'dir') {
      const newPath = item.path;
      setSearchParams({ classId, className, folder: newPath });
    } else {
      navigate(`/app/note?path=${encodeURIComponent(item.path)}`);
    }
  };

  const goBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      newHistory.pop();
      const newPath = newHistory[newHistory.length - 1];
      setSearchParams({ classId, className, folder: newPath });
    } else {
      navigate('/app/notes?tab=classes');
    }
  };

  const handleCreateFolder = async () => {
    if (!currentPath) return;
    const name = prompt("Enter folder name:");
    if (!name) return;
    try {
      await SupabaseGlobalService.createFolder(
        `${currentPath}/${name}`, name, currentPath, user.uid,
        universityFolder, classId
      );
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
      await SupabaseGlobalService.createNote(
        `${currentPath}/${name}.md`, `${name}.md`, currentPath, user.uid,
        universityFolder, classId
      );
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
        const newPath = `${currentPath}/${newName}`;
        await SupabaseGlobalService.renameNote(item.path, newName, newPath);
      }
      loadDirectory(currentPath);
    } catch (err) {
      setError("Failed to rename");
    }
  };

  const handleDelete = async (e, item) => {
    e.stopPropagation();
    const confirmDelete = window.confirm(`Delete "${formatDisplayName(item.name)}"?`);
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
  };

  const colorPalette = [
    { bg: 'bg-surface border border-border/30', text: 'text-text', border: 'hover:border-text' },
    { bg: 'bg-transparent border border-border/60', text: 'text-text', border: 'hover:border-text' },
  ];

  const getIconForItem = (path, name, type) => {
    const override = folderIcons[path];
    if (override) return getLucideIcon(override, 24);

    const key = name.toLowerCase();
    if (key.includes('doc') || key.includes('note')) return getLucideIcon('article', 24);
    if (key.includes('assign')) return getLucideIcon('assignment', 24);
    if (key.includes('quiz') || key.includes('test')) return getLucideIcon('quiz', 24);
    if (key.includes('unit')) return getLucideIcon('topic', 24);
    if (key.includes('sem')) return getLucideIcon('bookmark', 24);
    if (key.includes('lab')) return getLucideIcon('biotech', 24);
    if (key.includes('exam') || key.includes('prep')) return getLucideIcon('quiz', 24);

    return type === 'file' ? <FileText size={24} /> : <Folder size={24} />;
  };

  const formatDisplayName = (name) => {
    if (!name) return '';
    return name.replace(/__[0-9a-f]{4}$/i, '').replace(/\.md$/i, '');
  };

  // Build breadcrumb from pathHistory relative to root
  const getBreadcrumbs = () => {
    return pathHistory.map((path, idx) => {
      if (idx === 0) return className;
      const segment = path.split('/').pop();
      return formatDisplayName(segment);
    });
  };

  return (
    <div className="max-w-5xl">
      {/* Class Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate('/app/notes?tab=classes')} className="p-2 text-dim hover:text-text hover:bg-surface/50 rounded-xl transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl tracking-tight leading-none mb-1 select-none">
                <span className="font-sans font-black uppercase text-2xl md:text-3xl tracking-tight mr-1.5">
                  {className.split(' ')[0] || ''}
                </span>
                {className.substring((className.split(' ')[0] || '').length) && (
                  <span className="font-serif font-light italic text-3xl md:text-4xl text-dim lowercase">
                    {className.substring((className.split(' ')[0] || '').length)}
                  </span>
                )}
              </h1>
              {ownerName && (
                <p className="editorial-text-spaced text-dim text-[9px] mt-1 select-none">Owned by {ownerName}</p>
              )}
            </div>
          </div>

          {/* Class Info Bar */}
          <div className="flex items-center gap-4 text-sm text-dim ml-12">
            {classData?.memberCount && (
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                {classData.memberCount} members
              </span>
            )}
            {classData?.classCode && (
              <span className="px-2.5 py-0.5 bg-surface border border-border/50 rounded-none font-mono text-xs text-sub">
                {classData.classCode}
              </span>
            )}
          </div>

          {/* Breadcrumbs */}
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-sub text-[15px] mt-3 ml-12">
            {getBreadcrumbs().map((label, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight size={16} className="text-dim" />}
                <button
                  onClick={() => {
                    const newHistory = pathHistory.slice(0, idx + 1);
                    const newPath = newHistory[newHistory.length - 1];
                    setSearchParams({ classId, className, folder: newPath });
                  }}
                  className={`hover:text-primary transition-colors truncate max-w-[150px] font-medium ${idx === pathHistory.length - 1 ? 'text-primary' : ''}`}
                >
                  {label}
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar select-none">
          {pathHistory.length > 1 && (
            <button onClick={goBack} className="flex shrink-0 items-center gap-1 md:gap-2 text-text hover:bg-surface/50 px-3 md:px-4 py-2 rounded-none border border-border/40 transition-colors font-medium text-xs uppercase tracking-wider">
              <ArrowLeft size={16} />
              <span className="hidden md:inline">Back</span>
            </button>
          )}

          {/* Edit Mode Toggle */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-none font-medium transition-all duration-300 text-xs uppercase tracking-wider ${
              isEditMode
                ? 'bg-text text-bg'
                : 'bg-surface hover:bg-border/20 text-text border border-border/50'
            }`}
          >
            {isEditMode ? <Check size={16} /> : <Pencil size={16} />}
            <span>{isEditMode ? 'Done' : 'Edit'}</span>
          </button>

          {isEditMode && (
            <>
              <button onClick={handleCreateFolder} className="flex shrink-0 items-center gap-1 md:gap-2 bg-surface hover:bg-border/20 text-text px-3 md:px-4 py-2 rounded-none font-medium transition-colors border border-border/50 text-xs uppercase tracking-wider">
                <Plus size={16} /> <span className="hidden md:inline">Folder</span>
              </button>
              <button onClick={handleCreateNote} className="flex shrink-0 items-center gap-1 md:gap-2 bg-text text-bg px-3 md:px-4 py-2 rounded-none font-medium transition-colors text-xs uppercase tracking-wider">
                <Plus size={16} /> <span className="hidden md:inline">Note</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div>
        {error && (
          <div className="mb-6 p-4 bg-red/10 text-red rounded-2xl border border-red/20 flex items-start gap-3">
            <div className="mt-0.5"><Folder size={18} /></div>
            <div>{error}</div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20 select-none">
            <UtopiaLoader />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.length === 0 ? (
              <div className="col-span-full py-20 text-center text-dim bg-surface border border-border rounded-none border-dashed">
                {isEditMode ? 'No notes yet. Create one to get started!' : 'This class has no notes yet.'}
              </div>
            ) : (
              items.map((item, idx) => {
                const style = colorPalette[idx % colorPalette.length];

                return (
                  <div
                    key={item.path || idx}
                    onClick={() => navigateTo(item)}
                    className="card-premium-mono rounded-none p-5 flex items-center gap-4 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-none flex items-center justify-center ${style.bg} ${style.text}`}>
                      {getIconForItem(item.path, item.name, item.type)}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center h-full">
                      <h3 className="text-text font-serif font-light italic truncate text-[15px] lowercase tracking-tight select-none">
                        {formatDisplayName(item.name)}
                      </h3>
                    </div>

                    {isEditMode && (
                      <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.type === 'file' && (
                          <button onClick={(e) => handleRename(e, item)} className="p-1.5 text-dim hover:text-text hover:bg-surface rounded-none">
                            <Edit2 size={13} />
                          </button>
                        )}
                        <button onClick={(e) => handleDelete(e, item)} className="p-1.5 text-dim hover:text-text hover:bg-surface rounded-none">
                          <Trash2 size={13} />
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
    </div>
  );
}
