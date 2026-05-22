import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider, { useAuth } from './contexts/AuthContext';
import ThemeProvider from './contexts/ThemeContext';
import LoginScreen from './screens/LoginScreen';
import WebLayout from './components/WebLayout';
import AttendanceScreen from './screens/AttendanceScreen';
import NotesScreen from './screens/NotesScreen';
import ProfileScreen from './screens/ProfileScreen';
import NoteEditorScreen from './screens/NoteEditorScreen';
import ClassNotesScreen from './screens/ClassNotesScreen';
import FocusScreen from './screens/FocusScreen';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

import MobileWarningModal from './components/MobileWarningModal';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <MobileWarningModal />
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route 
              path="/app" 
              element={
                <ProtectedRoute>
                  <WebLayout />
                </ProtectedRoute>
              } 
            >
              <Route index element={<Navigate to="focus" replace />} />
              <Route path="notes" element={<NotesScreen />} />
              <Route path="class-notes" element={<ClassNotesScreen />} />
              <Route path="attendance" element={<AttendanceScreen />} />
              <Route path="profile" element={<ProfileScreen />} />
              <Route path="note" element={<NoteEditorScreen />} />
              <Route path="focus" element={<FocusScreen />} />
            </Route>
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
