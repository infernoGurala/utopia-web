import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SupabaseGlobalService } from '../services/SupabaseGlobalService';
import { ArrowLeft, Edit3, Save, FileText, ExternalLink, Eye, EyeOff } from 'lucide-react';
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
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

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

  const pdfLinks = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+\.pdf(?:[^)]*)?)\)/gi;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    if (!pdfLinks.some(p => p.url === match[2])) {
      pdfLinks.push({ text: match[1], url: match[2] });
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text hover:bg-surface/50 rounded-full transition-colors">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-2xl font-bold text-text truncate max-w-lg">
            {path ? path.split('/').pop().replace(/\.md$/i, '') : 'Note'}
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
          <>
            {pdfLinks.length > 0 && (
              <div className="mb-8 space-y-3">
                {pdfLinks.map((pdf, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2.5 bg-primary/20 text-primary rounded-xl shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-text text-sm truncate">{pdf.text}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <button 
                        onClick={() => setPdfPreviewUrl(pdfPreviewUrl === pdf.url ? null : pdf.url)}
                        className={`p-2 rounded-xl transition-colors flex items-center justify-center ${pdfPreviewUrl === pdf.url ? 'bg-primary/20 text-primary' : 'bg-surface hover:bg-border/50 text-text'}`}
                        title="View in same window"
                      >
                        {pdfPreviewUrl === pdf.url ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <a 
                        href={pdf.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 bg-primary text-bg rounded-xl transition-colors hover:scale-105 flex items-center justify-center"
                        title="Open in new window full screen"
                      >
                        <ExternalLink size={18} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {pdfPreviewUrl && (
              <div className="mb-8 rounded-2xl overflow-hidden border border-border/50 h-[70vh] bg-surface relative">
                <div className="absolute top-0 left-0 right-0 bg-surface/80 backdrop-blur-md border-b border-border p-2 flex justify-end z-10">
                  <button onClick={() => setPdfPreviewUrl(null)} className="px-3 py-1.5 bg-red/10 text-red hover:bg-red/20 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors">
                    Close Preview
                  </button>
                </div>
                <iframe 
                  src={pdfPreviewUrl} 
                  className="w-full h-full pt-10 border-none"
                  title="PDF Preview"
                />
              </div>
            )}

            <div className="prose prose-primary max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {content || '*Empty note*'}
              </ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
