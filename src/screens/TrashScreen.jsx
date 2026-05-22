import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Folder, FileText, Clock, User, X } from 'lucide-react';
import { TrashService } from '../services/TrashService';

export default function TrashScreen({ universityId, onClose, onRestored }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');

  const trashService = new TrashService(universityId);

  useEffect(() => {
    loadTrash();
  }, [universityId]);

  const loadTrash = async () => {
    setLoading(true);
    setError('');
    try {
      const trashItems = await trashService.getTrashItems();
      setItems(trashItems);
    } catch (err) {
      console.error('Failed to load trash:', err);
      setError('Failed to load trash items.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item) => {
    if (processing) return;
    setProcessing(item.id);
    try {
      await trashService.restore(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      onRestored?.();
    } catch (err) {
      console.error('Failed to restore:', err);
      setError(`Failed to restore "${item.name}"`);
    } finally {
      setProcessing(null);
    }
  };

  const handlePermanentDelete = async (item) => {
    if (processing) return;
    const confirmed = window.confirm(`Permanently delete "${item.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setProcessing(item.id);
    try {
      await trashService.permanentlyDelete(item.id, item.path);
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (err) {
      console.error('Failed to permanently delete:', err);
      setError(`Failed to delete "${item.name}"`);
    } finally {
      setProcessing(null);
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 backdrop-blur-sm p-4">
      <div className="glass-premium rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red/10 rounded-xl flex items-center justify-center text-red">
              <Trash2 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">Trash</h2>
              <p className="text-sm text-sub">Items are auto-deleted after 30 days</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-dim hover:text-text hover:bg-surface rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red/10 text-red rounded-xl border border-red/20 text-sm flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Trash2 size={48} className="text-dim mb-4" />
              <p className="text-sub font-medium text-lg">Trash is empty</p>
              <p className="text-dim text-sm mt-1">Deleted items will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const daysLeft = trashService.daysRemaining(item.permanentDeleteAt);
                const isProcessing = processing === item.id;

                return (
                  <div 
                    key={item.id} 
                    className={`glass-premium rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                      {item.type === 'dir' ? <Folder size={20} /> : <FileText size={20} />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-text font-medium truncate">{item.name?.replace(/\.md$/i, '')}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-dim">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatRelativeTime(item.deletedAt)}
                        </span>
                        {item.deletedByName && (
                          <span className="flex items-center gap-1">
                            <User size={11} />
                            {item.deletedByName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-red font-semibold mt-1">
                        Auto-deletes in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRestore(item)}
                        disabled={isProcessing}
                        className="p-2 text-green hover:bg-green/10 rounded-xl transition-colors"
                        title="Restore"
                      >
                        <RotateCcw size={18} />
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item)}
                        disabled={isProcessing}
                        className="p-2 text-red hover:bg-red/10 rounded-xl transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
