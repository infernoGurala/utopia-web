import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { themes, defaultTheme } from '../theme/themes';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [currentThemeId, setCurrentThemeId] = useState(defaultTheme);
  const [userProfile, setUserProfile] = useState(null);

  // Fetch user profile and listen for theme changes
  useEffect(() => {
    if (!user) {
      setCurrentThemeId(defaultTheme);
      setUserProfile(null);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile(data);
        if (data.themeAccent && themes[data.themeAccent]) {
          setCurrentThemeId(data.themeAccent);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const theme = themes[currentThemeId] || themes[defaultTheme];
    const root = document.documentElement;

    Object.keys(theme).forEach((key) => {
      if (key !== 'isDark') {
        root.style.setProperty(`--${key}`, theme[key]);
      }
    });

    if (theme.isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [currentThemeId]);

  return (
    <ThemeContext.Provider value={{ currentThemeId, userProfile }}>
      {children}
    </ThemeContext.Provider>
  );
}
