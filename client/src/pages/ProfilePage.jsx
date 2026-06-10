import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookmarks, getShortcuts } from '../api';
import { useAuth } from '../context/AuthContext';
import CategoryBadge from '../components/CategoryBadge';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [shortcuts, setShortcuts] = useState([]);
  const [tab, setTab]             = useState('bookmarks');

  useEffect(() => {
    getBookmarks().then(({ data }) => setBookmarks(data)).catch(() => {});
    getShortcuts('pending').then(({ data }) => setShortcuts(data)).catch(() => {});
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">{user?.name}</h1>
          <p className="text-gray-500 text-sm">{user?.email} · {user?.role}</p>
        </div>
        <button onClick={() => navigate('/')}
          className="bg-campus-blue text-white text-sm px-4 py-2 rounded hover:bg-blue-700">
          🗺 Go to Map
        </button>
      </div>

      <div className="flex gap-2 mb-4 border-b">
        {['bookmarks', 'shortcuts'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 px-3 text-sm capitalize border-b-2 transition ${
              tab === t ? 'border-campus-blue text-campus-blue font-medium' : 'border-transparent text-gray-500'
            }`}>{t}</button>
        ))}
      </div>

      {tab === 'bookmarks' && (
        <div className="space-y-2">
          {bookmarks.length === 0 && <p className="text-gray-400 text-sm">No bookmarks yet.</p>}
          {bookmarks.map((loc) => (
            <button key={loc.id} onClick={() => navigate('/', { state: { openLocationId: loc.id } })}
              className="w-full border rounded p-3 flex items-center gap-3 hover:bg-gray-50 transition text-left">
              <div className="flex-1">
                <p className="font-medium text-sm">{loc.name}</p>
                <CategoryBadge category={loc.category} />
              </div>
              <span className="text-xs text-campus-blue">View on map →</span>
            </button>
          ))}
        </div>
      )}

      {tab === 'shortcuts' && (
        <div className="space-y-2">
          {shortcuts.length === 0 && <p className="text-gray-400 text-sm">No shortcut requests.</p>}
          {shortcuts.map((s) => (
            <div key={s.id} className="border rounded p-3 text-sm">
              <div className="flex justify-between">
                <span>Node {s.from_node} → Node {s.to_node}</span>
                <span className={`capitalize font-medium ${
                  s.status === 'approved' ? 'text-green-600' :
                  s.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                }`}>{s.status}</span>
              </div>
              {s.description && <p className="text-gray-500 mt-1">{s.description}</p>}
              <p className="text-xs text-gray-400 mt-1">{new Date(s.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
