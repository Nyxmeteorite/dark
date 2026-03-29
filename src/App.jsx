import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Background from './components/temp';
import Landing from './pages/Landing';
import Feed from './pages/Feed';
import Search from './pages/Search';
import Jobs from './pages/Jobs';
import Profile from './pages/Profile';
import Resume from './pages/Resume';
import Messages from './pages/Messages';
import NotFound from './pages/NotFound';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 14 }}>
      <div className="navbar-logo" style={{ fontSize: 32, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--white)' }}>
        ProNet
      </div>
      <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
    </div>
  );
  return user ? children : <Navigate to="/" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/feed" replace />;
}

function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const isPublic = location.pathname === '/';

  return (
    <>
      <Background/>
      {user && !isPublic && <Navbar />}
      <div className={user && !isPublic ? 'app-layout' : ''}>
        <main className={user && !isPublic ? 'main-content' : ''}>
          <Routes>
            <Route path="/"         element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/feed"     element={<PrivateRoute><Feed /></PrivateRoute>} />
            <Route path="/search"   element={<PrivateRoute><Search /></PrivateRoute>} />
            <Route path="/jobs"     element={<PrivateRoute><Jobs /></PrivateRoute>} />
            <Route path="/profile"  element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/profile/:id" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/resume"   element={<PrivateRoute><Resume /></PrivateRoute>} />
            <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
            <Route path="*"         element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider><AppShell /></AuthProvider>
  );
}
