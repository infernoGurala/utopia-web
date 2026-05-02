import { useState, useEffect } from 'react';
import { SupabaseGlobalService } from '../services/SupabaseGlobalService';
import { Folder, FileText, ArrowLeft, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLucideIcon } from '../utils/IconMap';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function CommunityNotesScreen() {
  const navigate = useNavigate();
  const { userProfile } = useTheme();
  const { user } = useAuth();
  
  const [items, setItems] = useState([]);
  const [folderIcons, setFolderIcons] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const defaultUni = userProfile?.selectedUniversityId ? `${userProfile.selectedUniversityId}/Community` : '';
  const [currentPath, setCurrentPath] = useState(defaultUni);
  const [pathHistory, setPathHistory] = useState([defaultUni]);

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
    loadDirectory(currentPath);
  }, [currentPath]);

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

  const navigateTo = (item) => {
    if (item.type === 'dir') {
      const newPath = !currentPath || currentPath === '' ? `${item.name}/Community` : item.path;
      setPathHistory([...pathHistory, newPath]);
      setCurrentPath(newPath);
    } else {
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
    const confirmDelete = window.confirm(`Are you sure you want to delete ${item.name}?`);
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

  const getIconForFolder = (path, name) => {
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

    return <Folder size={24} />;
  };

  const formatDisplayName = (name) => {
    if (!name) return '';
    return name.replace(/__[0-9a-f]{4}$/i, '');
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-bold text-text mb-2">Community Notes</h1>
          <div className="flex items-center gap-2 text-sub text-lg">
            <button onClick={() => { setPathHistory(['']); setCurrentPath(''); }} className="hover:text-primary transition-colors">Root</button>
            {pathHistory.slice(1).map((path, idx) => (
              <span key={idx} className="flex items-center gap-2">
                <ChevronRight size={16} />
                <span className="truncate max-w-[150px]">{formatDisplayName(path.split('/').pop())}</span>
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {pathHistory.length > 1 && (
            <button onClick={goBack} className="flex items-center gap-2 text-text hover:bg-surface/50 px-4 py-2 rounded-xl transition-colors font-medium">
              <ArrowLeft size={18} />
              Back
            </button>
          )}
          {currentPath && (
            <>
              <button onClick={handleCreateFolder} className="flex items-center gap-2 bg-surface/50 hover:bg-surface text-text px-4 py-2 rounded-xl font-medium transition-colors border border-border/50">
                <Plus size={18} /> Folder
              </button>
              <button onClick={handleCreateNote} className="flex items-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary px-4 py-2 rounded-xl font-medium transition-colors">
                <Plus size={18} /> Note
              </button>
            </>
          )}
        </div>
      </div>

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
            {items.length === 0 ? (
              <div className="col-span-full py-20 text-center text-dim bg-surface/20 border border-border/30 rounded-3xl border-dashed">
                This folder is empty.
              </div>
            ) : (
              items.map((item, idx) => (
                <div 
                  key={item.path || idx}
                  onClick={() => navigateTo(item)}
                  className="bg-surface/30 hover:bg-surface border border-border/40 hover:border-primary/40 rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.type === 'dir' ? 'bg-primary/10 text-primary' : 'bg-teal/10 text-teal'}`}>
                    {item.type === 'dir' ? getIconForFolder(item.path, item.name) : <FileText size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-text font-semibold truncate text-[15px]">{formatDisplayName(item.name)}</h3>
                    <p className="text-dim text-xs mt-1 truncate">
                      {item.type === 'dir' ? 'Directory' : 'Markdown Note'}
                    </p>
                  </div>
                  
                  {/* Actions */}
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
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
