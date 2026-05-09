import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { BookOpen, Users, Crown, Pen, Eye, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const colorPalette = [
  { bg: 'bg-primary/10', text: 'text-primary', accent: 'border-primary/30' },
  { bg: 'bg-teal/10', text: 'text-teal', accent: 'border-teal/30' },
  { bg: 'bg-peach/10', text: 'text-peach', accent: 'border-peach/30' },
  { bg: 'bg-green/10', text: 'text-green', accent: 'border-green/30' },
  { bg: 'bg-blue/10', text: 'text-blue', accent: 'border-blue/30' },
  { bg: 'bg-lavender/10', text: 'text-lavender', accent: 'border-lavender/30' },
  { bg: 'bg-gold/10', text: 'text-gold', accent: 'border-gold/30' },
  { bg: 'bg-red/10', text: 'text-red', accent: 'border-red/30' },
];

export default function ClassesScreen() {
  const { user } = useAuth();
  const { userProfile } = useTheme();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadClasses();
    }
  }, [user]);

  const loadClasses = async () => {
    setLoading(true);
    setError('');
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
      setError('Failed to load classes. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleInfo = (cls) => {
    if (cls.creatorUid === user.uid) {
      return { label: 'Admin', icon: <Crown size={12} />, style: 'bg-gold/10 text-gold border border-gold/20' };
    }
    if (cls.role === 'writer') {
      return { label: 'Writer', icon: <Pen size={12} />, style: 'bg-primary/10 text-primary border border-primary/20' };
    }
    return { label: 'Reader', icon: <Eye size={12} />, style: 'bg-surface border border-border/50 text-sub' };
  };

  const handleClassClick = (cls) => {
    // Navigate to the class-specific notes using the community notes path
    // Classes in the app use their own folder structure under the university
    navigate(`/app/class-notes?classId=${cls.id}&className=${encodeURIComponent(cls.name)}`);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-bold text-text mb-2">My Classes</h1>
          <p className="text-sub text-lg">Manage your enrolled courses and access class-specific notes.</p>
        </div>
        <button 
          onClick={loadClasses} 
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-xl transition-colors"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red/10 text-red rounded-2xl border border-red/20 flex items-start gap-3">
          <div>{error}</div>
          <button onClick={loadClasses} className="ml-auto text-sm font-medium underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {classes.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-surface/20 border border-border/30 rounded-3xl border-dashed">
              <BookOpen size={48} className="mx-auto text-dim mb-4" />
              <p className="text-dim text-lg font-medium mb-1">No classes yet</p>
              <p className="text-dim/70 text-sm">Join a class from the mobile app using a class code.</p>
            </div>
          ) : (
            classes.map((cls, idx) => {
              const style = colorPalette[idx % colorPalette.length];
              const roleInfo = getRoleInfo(cls);

              return (
                <div 
                  key={cls.id} 
                  onClick={() => handleClassClick(cls)}
                  className={`bg-surface/30 border border-border/40 hover:${style.accent} rounded-3xl p-6 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group`}
                >
                  <div className={`w-14 h-14 ${style.bg} ${style.text} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <span className="font-bold text-xl">{(cls.classCode || cls.name?.[0] || 'C').charAt(0)}</span>
                  </div>
                  <h3 className="text-text font-semibold text-[17px] mb-1 truncate">{cls.name || 'Unnamed Class'}</h3>
                  <div className="flex items-center gap-1.5 text-dim text-sm mb-4">
                    <Users size={14} />
                    <span>{cls.memberCount || 0} members</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${roleInfo.style}`}>
                      {roleInfo.icon}
                      {roleInfo.label}
                    </span>
                    <ChevronRight size={16} className="text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
