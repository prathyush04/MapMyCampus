import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMapEvents } from 'react-leaflet';
import {
  getShortcuts, reviewShortcut,
  getLocations, createLocation, updateLocation, deleteLocation,
  getGraph, addNode, deleteNode, addEdge, deleteEdge,
  getLocationRequests, reviewLocationRequest,
} from '../api';
import CategoryBadge from '../components/CategoryBadge';
import { useSocket } from '../context/SocketContext';

const CENTER = [22.288522625548808, 73.36403846740724];
const CATEGORIES = ['food','academic','sports','admin','medical','facility','hostel','gates','parking','other'];

// ─── Map editor sub-component ─────────────────────────────────────────────────
function MapEditor({ graph, locations, onNodePlaced, onEdgePlaced, onDeleteEdge, onDeleteNode, placingLocation, onLocationPlaced }) {
  const [edgeStart, setEdgeStart] = useState(null);
  const nodeMap = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));
  const locMap = Object.fromEntries((locations || []).map(l => [l.id, l.name]));
  const skipMapClick = useRef(false);

  function ClickHandler() {
    useMapEvents({
      click(e) {
        if (skipMapClick.current) { skipMapClick.current = false; return; }
        const { lat, lng } = e.latlng;
        if (placingLocation) {
          onLocationPlaced({ lat, lng });
        } else {
          onNodePlaced({ x: lng, y: lat });
        }
      },
    });
    return null;
  }

  const handleNodeClick = (node) => {
    skipMapClick.current = true;
    if (placingLocation) {
      // Assign location to this existing node
      onLocationPlaced({ lat: node.y, lng: node.x, nodeId: node.id });
      return;
    }
    if (!edgeStart) {
      setEdgeStart(node);
    } else {
      if (edgeStart.id !== node.id) {
        const weight = Math.hypot((edgeStart.x - node.x) * 111320 * Math.cos(edgeStart.y * Math.PI / 180), (edgeStart.y - node.y) * 110540);
        onEdgePlaced({ from_node: edgeStart.id, to_node: node.id, weight, is_approved: true });
      }
      setEdgeStart(null);
    }
  };

  return (
    <MapContainer center={CENTER} zoom={17} style={{ height: '450px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickHandler />
      {graph.nodes.map((n) => {
        const locName = n.location_id ? locMap[n.location_id] : null;
        return (
        <CircleMarker
          key={n.id}
          center={[n.y, n.x]}
          radius={edgeStart?.id === n.id ? 8 : 5}
          pathOptions={{ color: placingLocation ? '#22c55e' : (edgeStart?.id === n.id ? '#ef4444' : '#7c3aed'), fillOpacity: 1 }}
          eventHandlers={{
            click: (e) => { e.originalEvent.stopPropagation(); handleNodeClick(n); },
            contextmenu: (e) => { e.originalEvent.preventDefault(); if (!placingLocation && window.confirm(`Delete node ${n.id} and its edges?`)) onDeleteNode(n.id); },
          }}
        >
          <Tooltip>{placingLocation ? `Assign location to node ${n.id}` : (locName ? `${locName} (Node ${n.id})` : `Node ${n.id}`)}</Tooltip>
        </CircleMarker>
        );
      })}
      {graph.edges.map((e) => {
        const from = nodeMap[e.from_node];
        const to   = nodeMap[e.to_node];
        if (!from || !to) return null;
        return (
          <Polyline
            key={e.id}
            positions={[[from.y, from.x], [to.y, to.x]]}
            pathOptions={{ color: '#7c3aed', weight: 2 }}
            eventHandlers={{ click: () => { if (window.confirm(`Delete edge ${e.id}?`)) onDeleteEdge(e.id); } }}
          />
        );
      })}
    </MapContainer>
  );
}

// ─── Location form ────────────────────────────────────────────────────────────
const EMPTY_LOC = { name: '', slug: '', description: '', category: 'other', lat: '', lng: '', is_active: true };

function LocationForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_LOC);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-3 p-4 border rounded bg-gray-50">
      <div className="grid grid-cols-2 gap-3">
        {[
          { k: 'name', label: 'Name', type: 'text' },
          { k: 'slug', label: 'Slug', type: 'text' },
          { k: 'lat',  label: 'Lat (auto-filled from map)', type: 'number' },
          { k: 'lng',  label: 'Lng (auto-filled from map)', type: 'number' },
        ].map(({ k, label, type }) => (
          <div key={k}>
            <label className="block text-xs font-medium mb-0.5">{label}</label>
            <input
              type={type}
              value={form[k]}
              onChange={(e) => set(k, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
              required={['name','slug'].includes(k)}
            />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs font-medium mb-0.5">Category</label>
        <select value={form.category} onChange={(e) => set('category', e.target.value)} className="border rounded px-2 py-1 text-sm">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-0.5">Description</label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
          rows={2} className="w-full border rounded px-2 py-1 text-sm resize-none" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
        Active
      </label>
      <div className="flex gap-2">
        <button type="submit" className="bg-campus-blue text-white px-4 py-1 rounded text-sm">Save</button>
        <button type="button" onClick={onCancel} className="border px-4 py-1 rounded text-sm">Cancel</button>
      </div>
    </form>
  );
}

// ─── Shortcut Card ──────────────────────────────────────────────────────
function ShortcutCard({ shortcut: s, status, onReview, graphNodes }) {
  const [edits, setEdits] = useState({
    from_lat: s.from_lat, from_lng: s.from_lng,
    to_lat:   s.to_lat,   to_lng:   s.to_lng,
    description: s.description || '',
  });
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const center = s.from_lat ? [(s.from_lat + s.to_lat) / 2, (s.from_lng + s.to_lng) / 2] : CENTER;

  const handle = async (st, note) => {
    setSubmitting(true);
    try { await onReview(s.id, st, { ...edits, rejection_note: note || undefined }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="border rounded p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-sm">{s.requester_name}</p>
          {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
          <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleString()}</p>
        </div>
        {status !== 'pending' && (
          <span className={`text-xs font-semibold capitalize ${s.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>{s.status}</span>
        )}
      </div>

      {status !== 'pending' && s.rejection_note && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">Reason: {s.rejection_note}</p>
      )}

      {status === 'pending' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[{k:'from_lat',l:'From Lat'},{k:'from_lng',l:'From Lng'},{k:'to_lat',l:'To Lat'},{k:'to_lng',l:'To Lng'}].map(({k,l}) => (
            <div key={k}>
              <label className="block text-xs font-medium mb-0.5">{l}</label>
              <input type="number" step="any" value={edits[k]}
                onChange={(e) => setEdits((f) => ({...f,[k]:parseFloat(e.target.value)}))}
                className="w-full border rounded px-2 py-1 text-xs" />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-0.5">Description</label>
            <input type="text" value={edits.description}
              onChange={(e) => setEdits((f) => ({...f,description:e.target.value}))}
              className="w-full border rounded px-2 py-1 text-xs" />
          </div>
        </div>
      )}

      {s.from_lat && (
        <>
          <p className="text-xs text-gray-400">
            Purple = existing graph nodes · Green = shortcut start · Red = shortcut end
          </p>
          <MapContainer center={center} zoom={17} style={{ height: '200px', width: '100%' }} scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {/* Existing graph nodes */}
            {graphNodes.map((n) => (
              <CircleMarker key={n.id} center={[n.y, n.x]} radius={4}
                pathOptions={{ color: '#7c3aed', fillOpacity: 0.7 }}>
                <Tooltip>{n.id}</Tooltip>
              </CircleMarker>
            ))}
            {/* Temporary shortcut endpoints */}
            <CircleMarker center={[edits.from_lat, edits.from_lng]} radius={8}
              pathOptions={{ color: '#22c55e', fillOpacity: 1 }}>
              <Tooltip permanent>Start (pending)</Tooltip>
            </CircleMarker>
            <CircleMarker center={[edits.to_lat, edits.to_lng]} radius={8}
              pathOptions={{ color: '#ef4444', fillOpacity: 1 }}>
              <Tooltip permanent>End (pending)</Tooltip>
            </CircleMarker>
            <Polyline positions={[[edits.from_lat, edits.from_lng],[edits.to_lat, edits.to_lng]]}
              pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '4 3' }} />
          </MapContainer>
        </>
      )}

      {status === 'pending' && (
        <div className="space-y-2">
          {showRejectInput ? (
            <div className="space-y-2">
              <textarea
                placeholder="Reason for rejection (optional)"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={2}
                className="w-full border border-red-300 rounded px-2 py-1 text-xs resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => handle('rejected', rejectNote)} disabled={submitting}
                  className="flex-1 bg-red-600 text-white text-xs py-1.5 rounded hover:bg-red-700 disabled:opacity-50">
                  Confirm Reject
                </button>
                <button onClick={() => { setShowRejectInput(false); setRejectNote(''); }} disabled={submitting}
                  className="flex-1 border text-xs py-1.5 rounded">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => handle('approved')} disabled={submitting}
                className="flex-1 bg-green-600 text-white text-xs py-1.5 rounded hover:bg-green-700 disabled:opacity-50">Approve</button>
              <button onClick={() => setShowRejectInput(true)} disabled={submitting}
                className="flex-1 bg-red-600 text-white text-xs py-1.5 rounded hover:bg-red-700 disabled:opacity-50">Reject with Feedback</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Location Request Card ───────────────────────────────────────────────────
function LocationRequestCard({ request: r, status, onReview, graphNodes }) {
  const [edits, setEdits] = useState({
    name: r.name, slug: r.slug || '', description: r.description || '', category: r.category,
  });
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handle = async (s, note) => {
    if (s === 'approved' && !edits.slug.trim()) { alert('Please enter a slug before approving.'); return; }
    setSubmitting(true);
    try { await onReview(r.id, s, { ...edits, rejection_note: note || undefined }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="border rounded p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-sm">{r.name} <span className="text-gray-400 font-normal">by {r.requester_name}</span></p>
          <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</p>
        </div>
        {status !== 'pending' && (
          <span className={`text-xs font-semibold capitalize ${r.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>{r.status}</span>
        )}
      </div>

      {status !== 'pending' && r.rejection_note && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">Reason: {r.rejection_note}</p>
      )}

      {status === 'pending' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[{k:'name',label:'Name'},{k:'slug',label:'Slug (required)'}].map(({k,label}) => (
            <div key={k}>
              <label className="block text-xs font-medium mb-0.5">{label}</label>
              <input type="text" value={edits[k]} onChange={(e) => setEdits((f) => ({...f,[k]:e.target.value}))}
                className="w-full border rounded px-2 py-1 text-xs" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium mb-0.5">Category</label>
              <select
              value={edits.category}
              onChange={(e) => setEdits((f) => ({ ...f, category: e.target.value }))}
              className="w-full border rounded p-1"
            >
              {['food', 'academic', 'sports', 'admin', 'medical', 'facility', 'hostel', 'gates', 'parking', 'other'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-0.5">Description</label>
            <input type="text" value={edits.description} onChange={(e) => setEdits((f) => ({...f,description:e.target.value}))}
              className="w-full border rounded px-2 py-1 text-xs" />
          </div>
        </div>
      )}

      <>
        <p className="text-xs text-gray-400">
          Purple = existing graph nodes · Blue = requested location (pending)
        </p>
        <MapContainer center={[r.lat, r.lng]} zoom={17} style={{ height: '200px', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {/* Existing graph nodes */}
          {graphNodes.map((n) => (
            <CircleMarker key={n.id} center={[n.y, n.x]} radius={4}
              pathOptions={{ color: '#7c3aed', fillOpacity: 0.7 }}>
              <Tooltip>{n.id}</Tooltip>
            </CircleMarker>
          ))}
          {/* Pending location as temporary node */}
          <CircleMarker center={[r.lat, r.lng]} radius={10}
            pathOptions={{ color: '#3b82f6', fillOpacity: 0.5, dashArray: '4 3' }}>
            <Tooltip permanent>{r.name} (pending)</Tooltip>
          </CircleMarker>
        </MapContainer>
      </>

      {status === 'pending' && (
        <div className="space-y-2">
          {showRejectInput ? (
            <div className="space-y-2">
              <textarea
                placeholder="Reason for rejection (optional)"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={2}
                className="w-full border border-red-300 rounded px-2 py-1 text-xs resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => handle('rejected', rejectNote)} disabled={submitting}
                  className="flex-1 bg-red-600 text-white text-xs py-1.5 rounded hover:bg-red-700 disabled:opacity-50">
                  Confirm Reject
                </button>
                <button onClick={() => { setShowRejectInput(false); setRejectNote(''); }} disabled={submitting}
                  className="flex-1 border text-xs py-1.5 rounded">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => handle('approved')} disabled={submitting}
                className="flex-1 bg-green-600 text-white text-xs py-1.5 rounded hover:bg-green-700 disabled:opacity-50">Approve</button>
              <button onClick={() => setShowRejectInput(true)} disabled={submitting}
                className="flex-1 bg-red-600 text-white text-xs py-1.5 rounded hover:bg-red-700 disabled:opacity-50">Reject with Feedback</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const socket = useSocket();
  const navigate = useNavigate();
  const [tab, setTab] = useState('shortcuts');

  const [shortcuts, setShortcuts]     = useState([]);
  const [shortcutTab, setShortcutTab] = useState('pending');

  const [locations, setLocations]   = useState([]);
  const [editingLoc, setEditingLoc] = useState(null);
  const [savingLoc, setSavingLoc]   = useState(false);
  const [pendingLocCoords, setPendingLocCoords] = useState(null);

  const [graph, setGraph]                       = useState({ nodes: [], edges: [] });
  const [placingLocation, setPlacingLocation]   = useState(false);

  const [locRequests, setLocRequests]           = useState([]);
  const [locReqTab, setLocReqTab]               = useState('pending');

  // Load graph whenever we need request cards (to show existing nodes)
  useEffect(() => {
    getGraph().then(({ data }) => setGraph(data)).catch(() => {});
  }, []);

  useEffect(() => {
    getShortcuts(shortcutTab).then(({ data }) => setShortcuts(data)).catch(() => {});
  }, [shortcutTab]);

  useEffect(() => {
    if (tab === 'locations' || tab === 'map') getLocations().then(({ data }) => setLocations(data)).catch(() => {});
    if (tab === 'map')       getGraph().then(({ data }) => setGraph(data)).catch(() => {});
    if (tab === 'requests')  getLocationRequests(locReqTab).then(({ data }) => setLocRequests(data)).catch(() => {});
  }, [tab, locReqTab]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => getShortcuts(shortcutTab).then(({ data }) => setShortcuts(data));
    socket.on('shortcut_approved', handler);
    return () => socket.off('shortcut_approved', handler);
  }, [socket, shortcutTab]);

  const handleShortcutReview = async (id, status, edits) => {
    await reviewShortcut(id, status, edits);
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
    // Refresh graph nodes after approval so snap logic is up to date
    if (status === 'approved') getGraph().then(({ data }) => setGraph(data)).catch(() => {});
  };

  const handleSaveLocation = async (form) => {
    setSavingLoc(true);
    try {
      if (editingLoc === 'new') {
        const { data } = await createLocation({
          ...form,
          ...(pendingLocCoords?.nodeId ? { node_id: pendingLocCoords.nodeId } : {}),
        });
        setLocations((prev) => [data, ...prev]);
        getGraph().then(({ data: g }) => setGraph(g)).catch(() => {});
      } else {
        const { data } = await updateLocation(editingLoc.id, form);
        setLocations((prev) => prev.map((l) => (l.id === data.id ? data : l)));
      }
      setEditingLoc(null);
      setPendingLocCoords(null);
    } finally {
      setSavingLoc(false);
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Delete this location? This cannot be undone.')) return;
    await deleteLocation(id);
    setLocations((prev) => prev.filter((l) => l.id !== id));
    setEditingLoc(null);
  };

  const handleNodePlaced = async ({ x, y }) => {
    const { data } = await addNode({ x, y });
    setGraph((g) => ({ ...g, nodes: [...g.nodes, data] }));
  };

  const handleEdgePlaced = async (edgeData) => {
    const { data } = await addEdge(edgeData);
    setGraph((g) => ({ ...g, edges: [...g.edges, data] }));
  };

  const handleDeleteEdge = async (id) => {
    await deleteEdge(id);
    setGraph((g) => ({ ...g, edges: g.edges.filter((e) => e.id !== id) }));
  };

  const handleDeleteNode = async (id) => {
    await deleteNode(id);
    setGraph((g) => ({
      nodes: g.nodes.filter((n) => n.id !== id),
      edges: g.edges.filter((e) => e.from_node !== id && e.to_node !== id),
    }));
  };

  const handleLocationPlaced = ({ lat, lng, nodeId }) => {
    setPlacingLocation(false);
    setPendingLocCoords({ lat, lng, nodeId });
    setEditingLoc('new');
    setTab('locations');
  };

  const handleLocReqReview = async (id, status, edits) => {
    await reviewLocationRequest(id, status, edits);
    setLocRequests((prev) => prev.filter((r) => r.id !== id));
    if (status === 'approved') getGraph().then(({ data }) => setGraph(data)).catch(() => {});
  };

  const TABS = ['shortcuts', 'locations', 'map', 'requests'];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">Admin Dashboard</h1>
        <button onClick={() => navigate('/')} className="bg-campus-blue text-white text-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded hover:bg-blue-700">
          🗺 Map
        </button>
      </div>
      <div className="flex gap-1 sm:gap-2 mb-6 border-b overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 px-4 text-sm capitalize border-b-2 transition ${
              tab === t ? 'border-campus-blue text-campus-blue font-semibold' : 'border-transparent text-gray-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Shortcuts Tab ── */}
      {tab === 'shortcuts' && (
        <div>
          <div className="flex gap-2 mb-4">
            {['pending','approved','rejected'].map((s) => (
              <button key={s} onClick={() => setShortcutTab(s)}
                className={`px-3 py-1 text-sm rounded-full border capitalize ${
                  shortcutTab === s ? 'bg-campus-blue text-white border-campus-blue' : 'text-gray-600'
                }`}>{s}</button>
            ))}
          </div>
          {shortcuts.length === 0 && <p className="text-gray-400 text-sm">No {shortcutTab} requests.</p>}
          <div className="space-y-4">
            {shortcuts.map((s) => (
              <ShortcutCard key={s.id} shortcut={s} status={shortcutTab} onReview={handleShortcutReview} graphNodes={graph.nodes} />
            ))}
          </div>
        </div>
      )}

      {/* ── Locations Tab ── */}
      {tab === 'locations' && (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setEditingLoc('new'); setPendingLocCoords(null); }}
              className="bg-campus-blue text-white text-sm px-4 py-2 rounded hover:bg-blue-700"
            >
              + Add Location manually
            </button>
            <button
              onClick={() => { setTab('map'); setPlacingLocation(true); }}
              className="border border-campus-blue text-campus-blue text-sm px-4 py-2 rounded hover:bg-blue-50"
            >
              📍 Pick location on map
            </button>
          </div>

          {editingLoc === 'new' && (
            <div className="mb-4">
              <LocationForm
                initial={pendingLocCoords ? { ...EMPTY_LOC, lat: pendingLocCoords.lat, lng: pendingLocCoords.lng } : undefined}
                onSave={handleSaveLocation}
                onCancel={() => { setEditingLoc(null); setPendingLocCoords(null); }}
              />
            </div>
          )}

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {['ID','Name','Category','Active',''].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <>
                    <tr key={loc.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{loc.id}</td>
                      <td className="px-3 py-2 font-medium">{loc.name}</td>
                      <td className="px-3 py-2"><CategoryBadge category={loc.category} /></td>
                      <td className="px-3 py-2">{loc.is_active ? '✅' : '❌'}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingLoc(editingLoc?.id === loc.id ? null : loc)}
                            className="text-xs text-campus-blue hover:underline"
                          >
                            {editingLoc?.id === loc.id ? 'Cancel' : 'Edit'}
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(loc.id)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingLoc?.id === loc.id && (
                      <tr key={`edit-${loc.id}`}>
                        <td colSpan={5} className="px-3 pb-3">
                          <LocationForm
                            initial={loc}
                            onSave={handleSaveLocation}
                            onCancel={() => setEditingLoc(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Map Editor Tab ── */}
      {tab === 'map' && (
        <div>
          {placingLocation ? (
            <div className="mb-3 flex items-center gap-3 p-2 bg-yellow-50 border border-yellow-300 rounded text-sm">
              <span>📍 Click an <strong>existing node</strong> to assign a location to it, or click <strong>empty space</strong> to create a new node</span>
              <button onClick={() => setPlacingLocation(false)} className="ml-auto text-red-400 hover:text-red-600">Cancel</button>
            </div>
          ) : (
            <div className="flex gap-2 mb-3">
              <p className="text-sm text-gray-500 flex-1">
                Click to place a node · Click two nodes to connect · Right-click a node to delete · Click an edge to delete
              </p>
              <button
                onClick={() => setPlacingLocation(true)}
                className="border border-campus-blue text-campus-blue text-sm px-3 py-1 rounded hover:bg-blue-50 shrink-0"
              >
                📍 Place location
              </button>
            </div>
          )}
          <MapEditor
            graph={graph}
            locations={locations}
            onNodePlaced={handleNodePlaced}
            onEdgePlaced={handleEdgePlaced}
            onDeleteEdge={handleDeleteEdge}
            onDeleteNode={handleDeleteNode}
            placingLocation={placingLocation}
            onLocationPlaced={handleLocationPlaced}
          />
          <div className="mt-3 text-sm text-gray-500">
            {graph.nodes.length} nodes · {graph.edges.length} edges
          </div>
        </div>
      )}

      {/* ── Location Requests Tab ── */}
      {tab === 'requests' && (
        <div>
          <div className="flex gap-2 mb-4">
            {['pending','approved','rejected'].map((s) => (
              <button key={s} onClick={() => setLocReqTab(s)}
                className={`px-3 py-1 text-sm rounded-full border capitalize ${
                  locReqTab === s ? 'bg-campus-blue text-white border-campus-blue' : 'text-gray-600'
                }`}>{s}</button>
            ))}
          </div>
          {locRequests.length === 0 && <p className="text-gray-400 text-sm">No {locReqTab} requests.</p>}
          <div className="space-y-4">
            {locRequests.map((r) => (
              <LocationRequestCard key={r.id} request={r} status={locReqTab} onReview={handleLocReqReview} graphNodes={graph.nodes} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
