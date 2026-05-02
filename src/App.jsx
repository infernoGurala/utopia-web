import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider, { useAuth } from './contexts/AuthContext';
import ThemeProvider from './contexts/ThemeContext';
import LoginScreen from './screens/LoginScreen';
import WebLayout from './components/WebLayout';
import AttendanceScreen from './screens/AttendanceScreen';
import CommunityNotesScreen from './screens/CommunityNotesScreen';
import ProfileScreen from './screens/ProfileScreen';
import ClassesScreen from './screens/ClassesScreen';
import SciwordleScreen from './screens/SciwordleScreen';
import NoteEditorScreen from './screens/NoteEditorScreen';

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

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
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
              <Route index element={<Navigate to="community" replace />} />
              <Route path="community" element={<CommunityNotesScreen />} />
              <Route path="classes" element={<ClassesScreen />} />
              <Route path="attendance" element={<AttendanceScreen />} />
              <Route path="sciwordle" element={<SciwordleScreen />} />
              <Route path="profile" element={<ProfileScreen />} />
              <Route path="note" element={<NoteEditorScreen />} />
            </Route>
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
