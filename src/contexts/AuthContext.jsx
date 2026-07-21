import { createContext, useContext, useState, useEffect } from 'react';
import { auth, signInWithGoogle as firebaseSignIn, logoutUser as firebaseSignOut } from '../services/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { initSupabase } from '../services/supabase';

const AuthContext = createContext({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInMock: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // If logged in anonymously or via Google, check if we need mock fields
        const isAnonymous = currentUser.isAnonymous;
        setUser({
          uid: currentUser.uid,
          displayName: currentUser.displayName || (isAnonymous ? 'Beast Destroyer' : 'Student'),
          email: currentUser.email || (isAnonymous ? 'destroyer@utopia.edu' : 'student@university.edu'),
          photoURL: currentUser.photoURL,
          isAnonymous,
        });
        try {
          await initSupabase();
        } catch (err) {
          console.error("Supabase init failed", err);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await firebaseSignIn();
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  const signInMock = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
      // The onAuthStateChanged listener will fire and set the user.
    } catch (err) {
      console.warn("Mock anonymous sign in failed, falling back to client-only mock user:", err);
      setUser({
        uid: 'mock-user-123',
        displayName: 'Beast Destroyer',
        email: 'destroyer@utopia.edu',
        photoURL: null,
        isMock: true,
      });
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut();
      setUser(null);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInMock, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
