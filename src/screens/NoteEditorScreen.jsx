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
import UtopiaLoader from '../components/UtopiaLoader';

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
      <div className="flex justify-center py-16">
        <UtopiaLoader />
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
    <div className="max-w-4xl mx-auto font-sans">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-1.5 text-sub hover:text-text hover:bg-surface rounded transition-colors" title="Back">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-text truncate max-w-lg">
              {path ? path.split('/').pop().replace(/\.md$/i, '') : 'Note'}
            </h1>
          </div>
          
          {isEditing ? (
            <button onClick={handleSave} className="flex items-center gap-1.5 bg-green/20 text-green px-3 py-1.5 rounded font-medium text-sm transition-colors hover:bg-green/30">
              <Save size={16} /> Save
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 btn-premium-mono-outline px-3 py-1.5 rounded text-sm transition-colors">
              <Edit3 size={16} /> Edit
            </button>
          )}
        </div>

        {/* Breadcrumb Trail */}
        {breadcrumbHistory.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-sub text-xs ml-8">
            {breadcrumbHistory.map((item, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight size={12} className="text-dim shrink-0" />}
                {item.isActive ? (
                  <span className="text-text truncate max-w-[150px] font-medium">
                    {item.label}
                  </span>
                ) : (
                  <button
                    onClick={() => navigate(item.url)}
                    className="hover:text-text transition-colors truncate max-w-[150px]"
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
        <div className="mb-4 p-3 bg-red/10 text-red rounded border border-red/20 text-sm">
          {error}
        </div>
      )}

      <div className="card-premium-mono rounded p-6 min-h-[60vh]">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[60vh] bg-transparent border-none outline-none resize-none text-text font-mono text-sm leading-relaxed"
            placeholder="Type your markdown here..."
          />
        ) : (
          <>
            {pdfLinks.length > 0 && (
              <div className="mb-6 space-y-2">
                {pdfLinks.map((pdf, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-surface border border-border rounded">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText size={18} className="text-text shrink-0" />
                      <h3 className="font-medium text-text text-sm truncate">{pdf.text}</h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <button 
                        onClick={() => setPdfPreviewUrl(pdfPreviewUrl === pdf.url ? null : pdf.url)}
                        className={`p-1.5 rounded transition-colors ${pdfPreviewUrl === pdf.url ? 'bg-text text-bg' : 'text-sub hover:text-text hover:bg-bg'}`}
                        title="Toggle Preview"
                      >
                        {pdfPreviewUrl === pdf.url ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <a 
                        href={pdf.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 text-sub hover:text-text rounded transition-colors"
                        title="Open in new window"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {pdfPreviewUrl && (
              <div className="mb-6 rounded border border-border h-[65vh] bg-surface relative">
                <div className="absolute top-0 left-0 right-0 bg-surface border-b border-border p-2 flex justify-end z-10">
                  <button onClick={() => setPdfPreviewUrl(null)} className="px-2.5 py-1 text-red hover:bg-red/10 rounded text-xs font-medium transition-colors">
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

            <div className="prose max-w-none text-sm">
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
    const trimmed = line.trim().replace(/^[-*+\d.]\s+/, '');
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
