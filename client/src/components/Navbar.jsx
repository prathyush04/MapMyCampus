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
    <nav className="bg-campus-blue text-white shrink-0 z-50">
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
              {/* Login and Register links are hidden for anonymous guests. Use Ctrl+K to login as admin. */}
            </>
          )}
        </div>
        {/* Mobile: hamburger + notifications for non-guests */}
        {user && !user.email?.startsWith('guest_') && (
          <div className="flex sm:hidden items-center gap-3">
            <NotificationsDropdown />
            <button onClick={() => setMenuOpen((o) => !o)} className="text-white text-xl leading-none">
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        )}
      </div>
      {menuOpen && (
        <div className="sm:hidden bg-campus-blue border-t border-blue-700 px-4 pb-3 flex flex-col gap-3">
          {user && !user.email?.startsWith('guest_') && (
            <>
              {user.role === 'admin' && <Link to="/admin" onClick={() => setMenuOpen(false)} className="text-sm hover:underline">Admin</Link>}
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="text-sm hover:underline">{user.name || user.email}</Link>
              <button onClick={handleLogout} className="text-sm text-left hover:underline">Logout</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
