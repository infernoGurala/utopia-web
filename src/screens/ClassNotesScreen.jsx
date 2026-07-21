import { useState, useEffect, useRef } from 'react';
import { SupabaseGlobalService } from '../services/SupabaseGlobalService';
import { Folder, FileText, ArrowLeft, ChevronRight, Plus, Edit2, Trash2, Check, Pencil, Users } from 'lucide-react';
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
  
  const [items, setItems] = useState([]);
  const [folderIcons, setFolderIcons] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [classData, setClassData] = useState(null);

  const className = classData?.name || classNameParam;
  const universityFolder = userProfile?.selectedUniversityId || '';

  // Root path for class notes: {university}/{classId}/Notes/
  const rootPath = universityFolder ? `${universityFolder}/${classId}/Notes` : '';
  const latestFetchedPath = useRef('');

  const [currentPath, setCurrentPath] = useState(rootPath);
  const [pathHistory, setPathHistory] = useState([rootPath]);

  // Update path/history when universityFolder, classId or folder query param changes
  useEffect(() => {
    if (universityFolder && classId) {
      const newRoot = `${universityFolder}/${classId}/Notes`;
      const folderParam = searchParams.get('folder');
      if (folderParam && folderParam.startsWith(newRoot)) {
        setCurrentPath(folderParam);
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
      const [contents, icons] = await Promise.all([
        SupabaseGlobalService.getDirectoryContents(path),
        SupabaseGlobalService.getFolderIcons(path)
      ]);
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

  const getIconForItem = (path, name, type) => {
    const override = folderIcons[path];
    if (override) return getLucideIcon(override, 20);

    const key = name.toLowerCase();
    if (key.includes('doc') || key.includes('note')) return getLucideIcon('article', 20);
    if (key.includes('assign')) return getLucideIcon('assignment', 20);
    if (key.includes('quiz') || key.includes('test')) return getLucideIcon('quiz', 20);
    if (key.includes('unit')) return getLucideIcon('topic', 20);
    if (key.includes('sem')) return getLucideIcon('bookmark', 20);
    if (key.includes('lab')) return getLucideIcon('biotech', 20);
    if (key.includes('exam') || key.includes('prep')) return getLucideIcon('quiz', 20);

    return type === 'file' ? <FileText size={20} /> : <Folder size={20} />;
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
    <div className="max-w-5xl font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate('/app/notes?tab=classes')} className="p-1.5 text-sub hover:text-text hover:bg-surface rounded transition-colors" title="Back to Classes">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text mb-0.5 select-none">
                {className}
              </h1>
              {ownerName && (
                <p className="text-sub text-xs">Owned by {ownerName}</p>
              )}
            </div>
          </div>

          {/* Class Info Bar */}
          <div className="flex items-center gap-4 text-xs text-sub ml-9">
            {classData?.memberCount && (
              <span className="flex items-center gap-1">
                <Users size={12} />
                {classData.memberCount} members
              </span>
            )}
            {classData?.classCode && (
              <span className="px-2 py-0.5 bg-surface border border-border rounded font-mono text-xs text-sub">
                {classData.classCode}
              </span>
            )}
          </div>

          {/* Breadcrumbs */}
          <div className="flex flex-wrap items-center gap-1.5 text-sub text-sm mt-2 ml-9">
            {getBreadcrumbs().map((label, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight size={14} className="text-dim" />}
                <button
                  onClick={() => {
                    const newHistory = pathHistory.slice(0, idx + 1);
                    const newPath = newHistory[newHistory.length - 1];
                    setSearchParams({ classId, className, folder: newPath });
                  }}
                  className={`hover:text-text transition-colors truncate max-w-[150px] font-medium ${idx === pathHistory.length - 1 ? 'text-text font-semibold' : ''}`}
                >
                  {label}
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar select-none">
          {pathHistory.length > 1 && (
            <button onClick={goBack} className="flex items-center gap-1 text-text hover:bg-surface px-3 py-1.5 rounded border border-border transition-colors font-medium text-xs">
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          )}

          {/* Edit Mode Toggle */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium text-xs transition-colors ${
              isEditMode
                ? 'bg-text text-bg'
                : 'bg-surface hover:bg-border/30 text-text border border-border'
            }`}
          >
            {isEditMode ? <Check size={14} /> : <Pencil size={14} />}
            <span>{isEditMode ? 'Done' : 'Edit'}</span>
          </button>

          {isEditMode && (
            <>
              <button onClick={handleCreateFolder} className="flex items-center gap-1 bg-surface hover:bg-border/30 text-text px-3 py-1.5 rounded font-medium text-xs border border-border transition-colors">
                <Plus size={14} /> <span>Folder</span>
              </button>
              <button onClick={handleCreateNote} className="flex items-center gap-1 bg-text text-bg px-3 py-1.5 rounded font-medium text-xs transition-colors">
                <Plus size={14} /> <span>Note</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
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
            {items.length === 0 ? (
              <div className="col-span-full py-12 text-center text-sub bg-surface/40 border border-border rounded">
                {isEditMode ? 'No notes yet. Create one to get started!' : 'This class has no notes yet.'}
              </div>
            ) : (
              items.map((item, idx) => {
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
                      <h3 className="text-text font-medium text-sm truncate">
                        {formatDisplayName(item.name)}
                      </h3>
                    </div>

                    {isEditMode && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.type === 'file' && (
                          <button onClick={(e) => handleRename(e, item)} className="p-1 text-sub hover:text-text rounded">
                            <Edit2 size={14} />
                          </button>
                        )}
                        <button onClick={(e) => handleDelete(e, item)} className="p-1 text-sub hover:text-text rounded">
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
    </div>
  );
}
