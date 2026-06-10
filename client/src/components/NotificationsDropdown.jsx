import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';

function notifMessage(n) {
  const p = n.payload || {};
  switch (n.type) {
    case 'shortcut_submitted':
      return { icon: '🔗', text: `${p.requester_name} submitted a shortcut request${p.description ? `: "${p.description}"` : ''}` };
    case 'location_submitted':
      return { icon: '📍', text: `${p.requester_name} requested a new location: "${p.name}" (${p.category})` };
    default:
      return { icon: '🔔', text: n.type.replace(/_/g, ' ') };
  }
}

export default function NotificationsDropdown() {
  const { user } = useAuth();
  const { notifications, unread, readAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((o) => !o); if (!open && unread) readAll(); }}
        className="relative text-sm"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white text-gray-800 rounded shadow-lg z-[9999] max-h-96 overflow-y-auto">
          <div className="p-2 font-semibold border-b text-sm">Notifications</div>
          {notifications.length === 0 && (
            <div className="p-4 text-sm text-gray-500 text-center">No notifications</div>
          )}
          {notifications.map((n) => {
            const { icon, text } = notifMessage(n);
            return (
              <div key={n.id} className={`p-3 border-b text-sm ${n.is_read ? '' : 'bg-blue-50'}`}>
                <p>{icon} {text}</p>
                <p className="text-gray-400 text-xs mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
