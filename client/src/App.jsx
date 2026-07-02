import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import MapPage from './pages/MapPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';

function BrokeAlert() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-yellow-100 text-yellow-800 p-4 rounded-lg shadow-2xl max-w-sm border border-yellow-300 text-center w-full mx-4">
      <p className="font-medium text-sm">
        The locations might take a min to load, I'm a broke ahhh guy, I can't afford the premium plans for hosting :)
      </p>
    </div>
  );
}

function GlobalShortcuts() {
  const navigate = useNavigate();
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/login');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <GlobalShortcuts />
          <BrokeAlert />
          <div className="flex flex-col h-screen">
            <Navbar />
            <div className="flex-1 overflow-hidden">
              <Routes>
                <Route path="/"          element={<MapPage />} />
                <Route path="/login"     element={<LoginPage />} />
                <Route path="/register"  element={<RegisterPage />} />
                <Route path="/admin"     element={
                  <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
                } />
                <Route path="/profile"   element={
                  <ProtectedRoute><ProfilePage /></ProtectedRoute>
                } />
                <Route path="*"          element={<Navigate to="/" />} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
