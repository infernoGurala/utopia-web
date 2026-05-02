import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Book } from 'lucide-react';

export default function ClassesScreen() {
  const { user } = useAuth();
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
    try {
      const membershipsRef = collection(db, 'users', user.uid, 'memberships');
      const membershipsSnap = await getDocs(membershipsRef);
      
      const classPromises = membershipsSnap.docs.map(async (membershipDoc) => {
        const classId = membershipDoc.id;
        const role = membershipDoc.data().role;
        
        const classDocRef = doc(db, 'classes', classId);
        const classDocSnap = await getDoc(classDocRef);
        
        if (classDocSnap.exists()) {
          return { id: classId, role, ...classDocSnap.data() };
        }
        return null;
      });
      
      const resolvedClasses = (await Promise.all(classPromises)).filter(c => c !== null);
      setClasses(resolvedClasses);
    } catch (err) {
      console.error(err);
      setError('Failed to load classes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-bold text-text mb-2">My Classes</h1>
          <p className="text-sub text-lg">Manage your enrolled courses and access class-specific notes.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red/10 text-red rounded-2xl border border-red/20 flex items-start gap-3">
          <div>{error}</div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {classes.length === 0 ? (
            <div className="col-span-full py-20 text-center text-dim bg-surface/20 border border-border/30 rounded-3xl border-dashed">
              You haven't joined any classes yet.
            </div>
          ) : (
            classes.map((cls) => (
              <div key={cls.id} className="bg-surface/30 border border-border/40 hover:border-primary/40 rounded-3xl p-6 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group">
                <div className="w-14 h-14 bg-peach/10 text-peach rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <span className="font-bold text-xl">{cls.classCode || 'C'}</span>
                </div>
                <h3 className="text-text font-semibold text-[17px] mb-1 truncate">{cls.name || 'Unnamed Class'}</h3>
                <p className="text-dim text-sm mb-4">{cls.memberCount || 0} members</p>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${cls.role === 'writer' || cls.creatorUid === user.uid ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface border border-border/50 text-sub'}`}>
                    {cls.creatorUid === user.uid ? 'Admin' : cls.role === 'writer' ? 'Writer' : 'Reader'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
