import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SupabaseGlobalService } from '../services/SupabaseGlobalService';
import { ArrowLeft, Edit3, Save, FileText, ExternalLink, Eye, EyeOff, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

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
  
  const [className, setClassName] = useState('');
  const [breadcrumbHistory, setBreadcrumbHistory] = useState([]);

  // Load class name if it is a class note
  useEffect(() => {
    if (!path) return;
    const parts = path.split('/');
    if (parts.length >= 3 && parts[2] === 'Notes') {
      const classId = parts[1];
      const fetchClassName = async () => {
        try {
          const classDoc = await getDoc(doc(db, 'classes', classId));
          if (classDoc.exists()) {
            setClassName(classDoc.data()?.name || 'Class');
          } else {
            setClassName('Class');
          }
        } catch (err) {
          console.warn('Failed to load class name for breadcrumbs:', err);
          setClassName('Class');
        }
      };
      fetchClassName();
    }
  }, [path]);

  // Construct breadcrumbs
  useEffect(() => {
    if (!path) {
      setBreadcrumbHistory([]);
      return;
    }

    const parts = path.split('/');
    if (parts.length < 2) {
      setBreadcrumbHistory([]);
      return;
    }

    const formatDisplayName = (name) => {
      if (!name) return '';
      return name.replace(/__[0-9a-f]{4}$/i, '').replace(/\.md$/i, '');
    };

    const history = [];

    if (parts[1] === 'Community') {
      // Community notes flow
      const uniLabel = parts[0] || 'University';
      const rootFolder = `${parts[0]}/Community`;
      
      // Root university/community breadcrumb
      history.push({
        label: uniLabel,
        url: `/app/notes?tab=community&folder=${encodeURIComponent(rootFolder)}`,
        isActive: false
      });

      // Subfolders
      for (let i = 2; i < parts.length - 1; i++) {
        const folderPath = parts.slice(0, i + 1).join('/');
        history.push({
          label: formatDisplayName(parts[i]),
          url: `/app/notes?tab=community&folder=${encodeURIComponent(folderPath)}`,
          isActive: false
        });
      }

      // Active file
      history.push({
        label: formatDisplayName(parts[parts.length - 1]),
        url: '#',
        isActive: true
      });
    } else if (parts.length >= 3 && parts[2] === 'Notes') {
      // Class notes flow
      const classId = parts[1];
      const classLabel = className || 'Class';

      // 1. Classes tab
      history.push({
        label: 'Classes',
        url: '/app/notes?tab=classes',
        isActive: false
      });

      // 2. Class home
      history.push({
        label: classLabel,
        url: `/app/class-notes?classId=${classId}&className=${encodeURIComponent(classLabel)}`,
        isActive: false
      });

      // 3. Subfolders (if any)
      for (let i = 3; i < parts.length - 1; i++) {
        const folderPath = parts.slice(0, i + 1).join('/');
        history.push({
          label: formatDisplayName(parts[i]),
          url: `/app/class-notes?classId=${classId}&className=${encodeURIComponent(classLabel)}&folder=${encodeURIComponent(folderPath)}`,
          isActive: false
        });
      }

      // 4. Active file
      history.push({
        label: formatDisplayName(parts[parts.length - 1]),
        url: '#',
        isActive: true
      });
    }

    setBreadcrumbHistory(history);
  }, [path, className]);

  const handleBack = () => {
    if (breadcrumbHistory.length > 1) {
      const parentUrl = breadcrumbHistory[breadcrumbHistory.length - 2].url;
      navigate(parentUrl);
    } else {
      navigate('/app/notes');
    }
  };

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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button onClick={handleBack} className="p-2 -ml-2 text-text hover:bg-surface/50 rounded-full transition-colors">
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

        {/* Breadcrumb Trail */}
        {breadcrumbHistory.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-sub text-sm font-medium ml-10">
            {breadcrumbHistory.map((item, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight size={14} className="text-dim shrink-0" />}
                {item.isActive ? (
                  <span className="text-primary truncate max-w-[150px] font-semibold">
                    {item.label}
                  </span>
                ) : (
                  <button
                    onClick={() => navigate(item.url)}
                    className="hover:text-primary transition-colors truncate max-w-[150px]"
                  >
                    {item.label}
                  </button>
                )}
              </span>
            ))}
          </div>
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
                {getFilteredContent(content) || '*Empty note*'}
              </ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const getFilteredContent = (rawContent) => {
  if (!rawContent) return '';
  const lines = rawContent.split('\n');
  const filteredLines = [];
  
  const isPdfLinkLine = (line) => {
    const trimmed = line.trim().replace(/^[-*+\d.]\s+/, ''); // strip list bullet
    return /^\[[^\]]+\]\([^)]+\.pdf(?:[^)]*)?\)$/i.test(trimmed);
  };

  const isFilesHeader = (line) => {
    const trimmed = line.trim().toLowerCase().replace(/[#*\s:]/g, '');
    return trimmed === 'files';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isPdfLinkLine(line)) {
      continue;
    }
    
    if (isFilesHeader(line)) {
      let hasOnlyPdfLinksAfter = false;
      let foundPdfLink = false;
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) continue;
        if (isPdfLinkLine(nextLine)) {
          foundPdfLink = true;
          hasOnlyPdfLinksAfter = true;
        } else {
          hasOnlyPdfLinksAfter = false;
          break;
        }
      }
      if (foundPdfLink && hasOnlyPdfLinksAfter) {
        continue;
      }
    }
    
    filteredLines.push(line);
  }
  
  return filteredLines.join('\n');
};
