import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SupabaseGlobalService } from '../services/SupabaseGlobalService';
import { ArrowLeft, Edit3, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useAuth } from '../contexts/AuthContext';

export default function NoteEditorScreen() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const path = searchParams.get('path');
  
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (path) {
      loadNote(path);
    } else {
      setError('No path provided.');
      setLoading(false);
    }
  }, [path]);

  const loadNote = async (notePath) => {
    setLoading(true);
    try {
      const text = await SupabaseGlobalService.getNoteContent(notePath);
      setContent(text);
    } catch (err) {
      console.error(err);
      setError('Failed to load note content.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (user) {
        await SupabaseGlobalService.updateNoteContent(path, content, user.uid);
      }
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setError('Failed to save note.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text hover:bg-surface/50 rounded-full transition-colors">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-2xl font-bold text-text truncate max-w-lg">
            {path ? path.split('/').pop() : 'Note'}
          </h1>
        </div>
        
        {isEditing ? (
          <button onClick={handleSave} className="flex items-center gap-2 bg-green/20 text-green px-4 py-2 rounded-xl font-medium transition-colors hover:bg-green/30">
            <Save size={18} /> Save
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-xl font-medium transition-colors hover:bg-primary/30">
            <Edit3 size={18} /> Edit
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red/10 text-red rounded-2xl border border-red/20">
          {error}
        </div>
      )}

      <div className="bg-surface/30 border border-border/40 rounded-3xl p-8 min-h-[60vh]">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[60vh] bg-transparent border-none outline-none resize-none text-text font-mono"
            placeholder="Type your markdown here..."
          />
        ) : (
          <div className="prose prose-invert prose-primary max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {content || '*Empty note*'}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
