import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationsDropdown from './NotificationsDropdown';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setMenuOpen(false);
  };

  return (
    <nav className="bg-slate-900/95 backdrop-blur-md text-gray-100 shrink-0 z-50 shadow-glass border-b border-slate-800 transition-colors duration-300">
      <div className="flex items-center px-4 h-12 gap-4">
        <Link to="/" className="font-bold text-lg tracking-tight">🗺 MapMyCampus</Link>
        <div className="flex-1" />
        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-4">
          {user ? (
            user.email?.startsWith('guest_') ? (
              <></> // Complete anonymity, no profile or logout
            ) : (
              <>
                {user.role === 'admin' && <Link to="/admin" className="text-sm hover:underline">Admin</Link>}
                <Link to="/profile" className="text-sm hover:underline">{user.name || user.email}</Link>
                <NotificationsDropdown />
                <button onClick={handleLogout} className="text-sm hover:underline">Logout</button>
              </>
            )
          ) : (
            <>
              <Link to="/login" className="text-xs text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all flex items-center gap-1">
                🔒 Admin
              </Link>
            </>
          )}
        </div>
        {/* Mobile: hamburger + notifications for non-guests */}
        {/* Mobile: hamburger + notifications */}
        <div className="flex sm:hidden items-center gap-3">
          {user && !user.email?.startsWith('guest_') && <NotificationsDropdown />}
          <button onClick={() => setMenuOpen((o) => !o)} className="text-white text-xl leading-none">
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="sm:hidden bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 pb-3 pt-2 flex flex-col gap-3 shadow-glass">
          {(!user || user.email?.startsWith('guest_')) ? (
            <Link to="/login" onClick={() => setMenuOpen(false)} className="text-sm hover:text-blue-200 transition-colors flex items-center gap-2">
              🔒 Admin Login
            </Link>
          ) : (
            <>
              {user.role === 'admin' && <Link to="/admin" onClick={() => setMenuOpen(false)} className="text-sm hover:text-blue-200 transition-colors">Admin Dashboard</Link>}
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="text-sm hover:text-blue-200 transition-colors">{user.name || user.email}</Link>
              <button onClick={handleLogout} className="text-sm text-left hover:text-red-300 transition-colors">Logout</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
