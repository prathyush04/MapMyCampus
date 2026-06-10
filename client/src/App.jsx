import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import MapPage from './pages/MapPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
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
