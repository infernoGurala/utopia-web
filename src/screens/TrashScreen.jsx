import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Folder, FileText, Clock, User, X } from 'lucide-react';
import { TrashService } from '../services/TrashService';
import UtopiaLoader from '../components/UtopiaLoader';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 font-sans">
      <div className="bg-card border border-border rounded-lg w-full max-w-xl max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Trash2 size={18} className="text-red" />
            <div>
              <h2 className="text-base font-bold text-text">Trash</h2>
              <p className="text-xs text-sub">Items are auto-deleted after 30 days</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 text-sub hover:text-text rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-3 p-2.5 bg-red/10 text-red rounded border border-red/20 text-xs flex items-center gap-2">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <UtopiaLoader />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Trash2 size={36} className="text-dim mb-3" />
              <p className="text-text font-medium text-sm">Trash is empty</p>
              <p className="text-sub text-xs mt-0.5">Deleted items will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const daysLeft = trashService.daysRemaining(item.permanentDeleteAt);
                const isProcessing = processing === item.id;

                return (
                  <div 
                    key={item.id} 
                    className={`card-premium-mono rounded p-3 flex items-center gap-3 transition-opacity ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {/* Icon */}
                    <div className="w-8 h-8 bg-surface rounded flex items-center justify-center text-text shrink-0 border border-border">
                      {item.type === 'dir' ? <Folder size={16} /> : <FileText size={16} />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-text font-medium text-xs truncate">{item.name?.replace(/\.md$/i, '')}</h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-sub">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatRelativeTime(item.deletedAt)}
                        </span>
                        {item.deletedByName && (
                          <span className="flex items-center gap-1">
                            <User size={10} />
                            {item.deletedByName}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-red font-medium mt-0.5">
                        Auto-deletes in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleRestore(item)}
                        disabled={isProcessing}
                        className="p-1.5 text-sub hover:text-green hover:bg-surface rounded transition-colors"
                        title="Restore"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item)}
                        disabled={isProcessing}
                        className="p-1.5 text-sub hover:text-red hover:bg-surface rounded transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 size={16} />
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
