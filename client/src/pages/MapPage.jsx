import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, CircleMarker, Tooltip, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLocations, searchLocations, getGraph, getRoute, createLocationRequest, createShortcut, getMyLocationRequests, getMyShortcuts, submitFeatureSuggestion } from '../api';
import LocationPanel from '../components/LocationPanel';
import CategoryBadge from '../components/CategoryBadge';
import { CATEGORY_ICON_COLOR, makeIcon } from '../utils/mapIcons';

const CENTER = [22.288522625548808, 73.36403846740724];
const NEARBY_THRESHOLD_M = 30;
const STEP_ARRIVAL_M = 15; // metres to consider a waypoint reached
const CATEGORIES = ['food', 'academic', 'sports', 'admin', 'medical', 'facility', 'hostel', 'gates', 'parking', 'other'];

function bearing(from, to) {
  const dLng = (to[1] - from[1]) * Math.PI / 180;
  const lat1 = from[0] * Math.PI / 180;
  const lat2 = to[0]   * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const deg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  if (deg < 22.5  || deg >= 337.5) return 'north';
  if (deg < 67.5)  return 'north-east';
  if (deg < 112.5) return 'east';
  if (deg < 157.5) return 'south-east';
  if (deg < 202.5) return 'south';
  if (deg < 247.5) return 'south-west';
  if (deg < 292.5) return 'west';
  return 'north-west';
}

function makeLeafletIcon(color, selected) {
  return L.icon({
    iconUrl: makeIcon(color, selected),
    iconSize:   [selected ? 28 : 20, selected ? 28 : 20],
    iconAnchor: [selected ? 14 : 10, selected ? 28 : 20],
  });
}

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
  iconAnchor: [7, 7],
});

function MapController({ flyTo, fitBounds }) {
  const map = useMap();
  useEffect(() => { if (flyTo) map.flyTo(flyTo, 18, { duration: 1 }); }, [flyTo]);
  useEffect(() => { if (fitBounds) map.fitBounds(fitBounds, { padding: [40, 40], duration: 1 }); }, [fitBounds]);
  return null;
}

function MapClickHandler({ onClick }) {
  useMapEvents({ click: onClick });
  return null;
}

export default function MapPage() {
  const { user } = useAuth();
  const routerLocation = useLocation();
  const navigate = useNavigate();

  const [locations, setLocations]               = useState([]);
  const [filtered, setFiltered]                 = useState([]);
  const [search, setSearch]                     = useState('');
  const [activeCategory, setActiveCategory]     = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [graph, setGraph]                       = useState({ nodes: [], edges: [] });
  const [showGraph, setShowGraph]               = useState(false);

  // Routing
  const [routeFrom, setRouteFrom]   = useState(null);
  const [routeTo, setRouteTo]       = useState(null);
  const [routePath, setRoutePath]   = useState(null);
  const [routeInfo, setRouteInfo]   = useState(null); // { distance, minutes }
  const [userPos, setUserPos]       = useState(null);
  const [routeError, setRouteError] = useState('');

  // Fly-to
  const [flyTo, setFlyTo] = useState(null);
  const [fitBounds, setFitBounds] = useState(null);

  // Suggest flow
  const [suggestMode, setSuggestMode]             = useState(false);
  const [suggestForm, setSuggestForm]             = useState(null);
  const [suggestSubmitting, setSuggestSubmitting] = useState(false);
  const [nearbyLoc, setNearbyLoc]                 = useState(null);

  // Shortcut flow
  const [shortcutMode, setShortcutMode]   = useState(false);
  const [shortcutPins, setShortcutPins]   = useState([]); // [{lat,lng}, {lat,lng}]
  const [shortcutDesc, setShortcutDesc]   = useState('');
  const [shortcutSubmitting, setShortcutSubmitting] = useState(false);

  // Pending requests (own) — ghost overlays
  const [pendingLocReqs, setPendingLocReqs]   = useState([]);
  const [pendingShortcuts, setPendingShortcuts] = useState([]);

  // Feature suggestion
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [featureBody, setFeatureBody] = useState('');
  const [featureSubmitting, setFeatureSubmitting] = useState(false);

  // Journey
  const [journeyActive, setJourneyActive]   = useState(false);
  const [journeyStep, setJourneyStep]       = useState(0);   // index into routePath
  const [geoError, setGeoError]             = useState(null);
  const watchIdRef                          = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const searchTimer = useRef(null);

  useEffect(() => {
    getLocations().then(({ data }) => { setLocations(data); setFiltered(data); });
    getGraph().then(({ data }) => setGraph(data));
  }, []);

  useEffect(() => {
    if (!user || user.role === 'admin') return;
    getMyLocationRequests().then(({ data }) => setPendingLocReqs(data.filter((r) => r.status === 'pending'))).catch(() => {});
    getMyShortcuts().then(({ data }) => setPendingShortcuts(data.filter((s) => s.status === 'pending'))).catch(() => {});
  }, [user]);

  // Handle navigation from bookmarks — state: { openLocationId }
  useEffect(() => {
    if (routerLocation.state?.openLocationId) {
      const id = routerLocation.state.openLocationId;
      setSelectedLocation(id);
      // fly once locations are loaded
    }
  }, [routerLocation.state]);

  useEffect(() => {
    if (routerLocation.state?.openLocationId && locations.length) {
      const loc = locations.find((l) => l.id === routerLocation.state.openLocationId);
      if (loc) setFlyTo([loc.lat, loc.lng]);
      navigate('/', { replace: true, state: {} });
    }
  }, [locations, routerLocation.state]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (!search && !activeCategory) { setFiltered(locations); return; }
      searchLocations({ q: search, category: activeCategory || undefined })
        .then(({ data }) => setFiltered(data)).catch(() => {});
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search, activeCategory, locations]);

  const getUserLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition((p) => resolve([p.coords.latitude, p.coords.longitude]), reject);
  });

  const findNearestNode = useCallback((lat, lng) => {
    let best = null, bestDist = Infinity;
    for (const n of graph.nodes) {
      const d = L.latLng(lat, lng).distanceTo(L.latLng(n.y, n.x));
      if (d < bestDist) { bestDist = d; best = n; }
    }
    return best;
  }, [graph.nodes]);

  const handleGetRoute = useCallback(async () => {
    setRouteError('');
    setRoutePath(null);
    if (!routeFrom || !routeTo) return;
    try {
      let fromNode, toNode;

      if (routeFrom === 'user') {
        const pos = userPos || await getUserLocation().then((p) => { setUserPos(p); return p; });
        fromNode = findNearestNode(pos[0], pos[1]);
      } else {
        const fromId = parseInt(routeFrom);
        const loc = locations.find((l) => l.id === fromId);
        fromNode = graph.nodes.find((n) => n.location_id === fromId)
          || (loc && findNearestNode(loc.lat, loc.lng));
      }

      const toId = parseInt(routeTo);
      const toLoc = locations.find((l) => l.id === toId);
      toNode = graph.nodes.find((n) => n.location_id === toId)
        || (toLoc && findNearestNode(toLoc.lat, toLoc.lng));

      if (!fromNode || !toNode) { setRouteError('No graph nodes near these locations.'); return; }

      const { data } = await getRoute(fromNode.id, toNode.id);
      
      let finalCoordinates = data.coordinates;
      let extraDist = 0;
      if (routeFrom === 'user' && userPos && finalCoordinates.length > 0) {
        // Visually connect the user's exact GPS location to the start of the graph
        finalCoordinates = [{ x: userPos[1], y: userPos[0] }, ...finalCoordinates];
        extraDist = L.latLng(userPos[0], userPos[1]).distanceTo(L.latLng(data.coordinates[0].y, data.coordinates[0].x));
      }

      setRoutePath(finalCoordinates);
      const dist = (data.totalDistance || data.distance || 0) + extraDist;
      setRouteInfo({ distance: dist, minutes: Math.ceil(dist / 80) }); // ~80 m/min walking
      setSidebarOpen(false);
      if (finalCoordinates?.length) {
        const lats = finalCoordinates.map((n) => n.y);
        const lngs = finalCoordinates.map((n) => n.x);
        setFlyTo(null);
        setFitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]]);
      }
    } catch { setRouteError('No path found between these locations.'); }
  }, [routeFrom, routeTo, userPos, locations, graph.nodes, findNearestNode]);

  useEffect(() => {
    if (routeFrom && routeTo) handleGetRoute();
  }, [routeFrom, routeTo]);

  const handleMapClick = useCallback((e) => {
    const { lat, lng } = e.latlng;

    // Close sidebar on mobile whenever map is clicked
    setSidebarOpen(false);

    if (shortcutMode) {
      setShortcutPins((prev) => {
        if (prev.length >= 2) return [prev[1], { lat, lng }];
        return [...prev, { lat, lng }];
      });
      return;
    }

    if (!suggestMode) return;
    if (!user || user.role === 'admin') return;
    const clicked = L.latLng(lat, lng);
    const nearby = locations.find((loc) => L.latLng(loc.lat, loc.lng).distanceTo(clicked) < NEARBY_THRESHOLD_M);
    if (nearby) setNearbyLoc(nearby);
    else setSuggestForm({ name: '', description: '', category: 'other', lat, lng });
  }, [user, locations, shortcutMode, suggestMode]);

  const handleSuggestSubmit = async (e) => {
    e.preventDefault();
    setSuggestSubmitting(true);
    try {
      const { data } = await createLocationRequest(suggestForm);
      setPendingLocReqs((prev) => [...prev, data]);
      alert('Request submitted! The admin will review it.');
      setSuggestForm(null);
      setSuggestMode(false);
    } catch { alert('Failed to submit request.'); }
    finally { setSuggestSubmitting(false); }
  };

  const handleShortcutSubmit = async (e) => {
    e.preventDefault();
    if (shortcutPins.length < 2) return;
    setShortcutSubmitting(true);
    try {
      const { data } = await createShortcut({
        from_lat: shortcutPins[0].lat, from_lng: shortcutPins[0].lng,
        to_lat:   shortcutPins[1].lat, to_lng:   shortcutPins[1].lng,
        description: shortcutDesc,
      });
      setPendingShortcuts((prev) => [...prev, data]);
      alert('Shortcut request submitted!');
      setShortcutMode(false);
      setShortcutPins([]);
      setShortcutDesc('');
    } catch { alert('Failed to submit shortcut.'); }
    finally { setShortcutSubmitting(false); }
  };

  const handleFeatureSubmit = async (e) => {
    e.preventDefault();
    if (!featureBody.trim()) return;
    setFeatureSubmitting(true);
    try {
      await submitFeatureSuggestion({ body: featureBody });
      alert('Feature suggestion submitted successfully! Thank you.');
      setFeatureModalOpen(false);
      setFeatureBody('');
    } catch {
      alert('Failed to submit suggestion. Please try again.');
    } finally {
      setFeatureSubmitting(false);
    }
  };

  const endJourney = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setJourneyActive(false);
    setJourneyStep(0);
  }, []);

  const startJourney = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('no_support');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setGeoError(null);
        setJourneyActive(true);
        setJourneyStep(0);
        // Watch position for live tracking
        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => {
            const lat = p.coords.latitude;
            const lng = p.coords.longitude;
            setUserPos([lat, lng]);
            setFlyTo([lat, lng]);
            // Advance step if close enough to current waypoint
            setJourneyStep((step) => {
              if (!routePath || step >= routePath.length - 1) return step;
              const wp = routePath[step];
              const dist = L.latLng(lat, lng).distanceTo(L.latLng(wp.y, wp.x));
              return dist < STEP_ARRIVAL_M ? step + 1 : step;
            });
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 3000 }
        );
      },
      (err) => {
        setGeoError(err.code === 1 ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [routePath]);

  // Clean up watch on unmount
  useEffect(() => () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); }, []);

  const nodeMap = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));

  const locationName = (id) => id === 'user' ? '📍 My Location' : locations.find((l) => l.id === id)?.name || '—';

  return (
    <div className="flex h-full relative">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen((o) => !o)}
        className="sm:hidden absolute top-2 left-2 z-[1000] bg-white border rounded-full w-9 h-9 flex items-center justify-center shadow text-lg"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <aside className={`
        ${ sidebarOpen ? 'translate-x-0' : '-translate-x-full' }
        sm:translate-x-0 sm:relative sm:flex
        absolute inset-y-0 left-0 z-[999]
        w-72 bg-white border-r flex flex-col shrink-0
        transition-transform duration-200
      `}>
        <div className="p-3 border-b">
          <input
            type="text"
            placeholder="Search locations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-campus-blue"
          />
          <div className="flex flex-wrap gap-1 mt-2">
            {['all', ...CATEGORIES].map((c) => (
              <button key={c} onClick={() => setActiveCategory(activeCategory === c || c === 'all' ? null : c)}
                className={`text-xs px-2 py-0.5 rounded-full border capitalize transition ${
                  (activeCategory === c || (c === 'all' && !activeCategory)) ? 'bg-campus-blue text-white border-campus-blue' : 'text-gray-600 border-gray-300 hover:border-campus-blue'
                }`}>{c}</button>
            ))}
          </div>
        </div>

        {/* Routing panel */}
        <div className="p-3 border-b space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">Get Directions</p>
          <select value={routeFrom || ''} onChange={(e) => setRouteFrom(e.target.value || null)}
            className="w-full border rounded px-2 py-1 text-sm">
            <option value="">From…</option>
            <option value="user">📍 My Location</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={routeTo || ''} onChange={(e) => setRouteTo(e.target.value || null)}
            className="w-full border rounded px-2 py-1 text-sm">
            <option value="">To…</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {routeError && <p className="text-xs text-red-500">{routeError}</p>}
          {routePath && (
            <button onClick={() => { setRoutePath(null); setRouteFrom(null); setRouteTo(null); setFitBounds(null); setRouteInfo(null); }}
              className="text-xs text-red-400 hover:text-red-600">✕ Clear route</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((loc) => (
            <button key={loc.id}
              onClick={() => { setSelectedLocation(loc.id); setFlyTo([loc.lat, loc.lng]); setSidebarOpen(false); }}
              className={`w-full text-left px-3 py-2 border-b hover:bg-gray-50 transition ${selectedLocation === loc.id ? 'bg-blue-50' : ''}`}>
              <div className="font-medium text-sm truncate">{loc.name}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <CategoryBadge category={loc.category} />
                {loc.category !== 'academic' && loc.category !== 'admin' && (
                  <span className="text-xs text-amber-500 ml-1">
                    {'★'.repeat(Math.round(loc.avg_rating || 0))}
                    {'☆'.repeat(5 - Math.round(loc.avg_rating || 0))}
                  </span>
                )}
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-xs text-gray-400 text-center p-6">No locations found</p>}
        </div>

        {user?.role === 'admin' && (
          <div className="p-3 border-t">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={showGraph} onChange={(e) => setShowGraph(e.target.checked)} />
              Show graph overlay
            </label>
          </div>
        )}
        <div className="p-3 border-t flex flex-col gap-2">
          <button onClick={() => { setSuggestMode((v) => !v); setSidebarOpen(false); }}
            className={`w-full text-sm py-1.5 rounded border transition ${suggestMode ? 'bg-blue-50 border-campus-blue text-campus-blue' : 'border-gray-300 text-gray-600 hover:border-campus-blue'}`}>
            {suggestMode ? '✕ Cancel suggestion' : '📍 Suggest a location'}
          </button>
          <button onClick={() => { setFeatureModalOpen(true); setSidebarOpen(false); }}
            className="sm:hidden w-full text-sm py-1.5 rounded border border-campus-blue text-campus-blue hover:bg-blue-50 transition">
            💡 Suggest Feature
          </button>
        </div>
      </aside>

      {/* Mobile search bar */}
      {!sidebarOpen && (
        <div className="sm:hidden absolute top-2 left-12 right-2 z-[1000]">
          <input
            type="text"
            placeholder="Search locations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSidebarOpen(true)}
            className="w-full border rounded-full px-4 py-1.5 text-sm shadow bg-white focus:outline-none focus:ring-2 focus:ring-campus-blue"
          />
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <button
          onClick={() => setFeatureModalOpen(true)}
          className="hidden sm:flex absolute top-4 left-4 z-[1000] bg-white border border-campus-blue text-campus-blue px-3 py-1.5 rounded shadow text-sm font-semibold hover:bg-blue-50"
        >
          💡 Suggest Feature
        </button>

        {shortcutMode && (
          <div className="absolute top-14 sm:top-3 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-50 border border-yellow-400 rounded px-4 py-2 text-sm shadow flex items-center gap-3">
            <span>
              {shortcutPins.length === 0 && 'Click on the map to place the start point'}
              {shortcutPins.length === 1 && 'Now click to place the end point'}
              {shortcutPins.length === 2 && 'Both points placed — submit below'}
            </span>
            <button type="button" onClick={() => { setShortcutMode(false); setShortcutPins([]); }} className="text-yellow-700 underline text-xs shrink-0">Cancel</button>
          </div>
        )}
        {suggestMode && (
          <div className="absolute top-14 sm:top-3 left-1/2 -translate-x-1/2 z-[1000] bg-blue-50 border border-campus-blue rounded px-4 py-2 text-sm shadow flex items-center gap-3">
            <span>Click on the map to suggest a new location</span>
            <button type="button" onClick={() => { setSuggestMode(false); }} className="text-campus-blue underline text-xs shrink-0">Cancel</button>
          </div>
        )}

        <MapContainer center={CENTER} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <ZoomControl position="bottomright" />
          <MapController flyTo={flyTo} fitBounds={fitBounds} />
          <MapClickHandler onClick={handleMapClick} />

          {userPos && <Marker position={userPos} icon={userIcon}><Tooltip>You</Tooltip></Marker>}

          {locations.map((loc) => {
            const color = CATEGORY_ICON_COLOR[loc.category] || CATEGORY_ICON_COLOR.other;
            return (
              <Marker key={loc.id} position={[loc.lat, loc.lng]}
                icon={makeLeafletIcon(color, selectedLocation === loc.id)}
                eventHandlers={{ click: () => { setSelectedLocation(loc.id); setFlyTo([loc.lat, loc.lng]); } }}>
                <Tooltip>{loc.name}</Tooltip>
              </Marker>
            );
          })}

          {routePath && routePath.length > 1 && (
            <Polyline positions={routePath.map((n) => [n.y, n.x])}
              pathOptions={{ color: '#3b82f6', weight: 4, dashArray: '6 4' }} />
          )}

          {shortcutPins.map((pin, i) => (
            <Marker key={i} position={[pin.lat, pin.lng]}>
              <Tooltip permanent>{i === 0 ? 'Start' : 'End'}</Tooltip>
            </Marker>
          ))}

          {/* Ghost: pending location requests */}
          {pendingLocReqs.map((r) => (
            <CircleMarker key={`plr-${r.id}`} center={[r.lat, r.lng]} radius={10}
              pathOptions={{ color: '#f59e0b', fillColor: '#fef3c7', fillOpacity: 0.7, dashArray: '4 3' }}>
              <Tooltip>⏳ {r.name} (pending)</Tooltip>
            </CircleMarker>
          ))}

          {/* Ghost: pending shortcut requests */}
          {pendingShortcuts.map((s) => s.from_lat && (
            <>
              <CircleMarker key={`psc-f-${s.id}`} center={[s.from_lat, s.from_lng]} radius={7}
                pathOptions={{ color: '#f59e0b', fillOpacity: 0.7, dashArray: '3 2' }}>
                <Tooltip>⏳ Shortcut start (pending)</Tooltip>
              </CircleMarker>
              <CircleMarker key={`psc-t-${s.id}`} center={[s.to_lat, s.to_lng]} radius={7}
                pathOptions={{ color: '#f59e0b', fillOpacity: 0.7, dashArray: '3 2' }}>
                <Tooltip>⏳ Shortcut end (pending)</Tooltip>
              </CircleMarker>
              <Polyline key={`psc-l-${s.id}`}
                positions={[[s.from_lat, s.from_lng],[s.to_lat, s.to_lng]]}
                pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '5 4', opacity: 0.7 }} />
            </>
          ))}

          {(showGraph) && graph.nodes.map((n) => (
            <CircleMarker key={n.id} center={[n.y, n.x]}
              radius={4}
              pathOptions={{ color: '#7c3aed', fillOpacity: 1 }}>
              <Tooltip>{n.id}</Tooltip>
            </CircleMarker>
          ))}
          {showGraph && graph.edges.map((e) => {
            const from = nodeMap[e.from_node], to = nodeMap[e.to_node];
            if (!from || !to) return null;
            return <Polyline key={e.id} positions={[[from.y, from.x], [to.y, to.x]]}
              pathOptions={{ color: '#7c3aed', weight: 1.5, opacity: 0.6 }} />;
          })}
        </MapContainer>
      </div>

      {/* Route info bottom sheet */}
      {routeInfo && !journeyActive && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] sm:left-72 bg-white border-t shadow-lg px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-lg font-bold text-campus-blue">
                {routeInfo.distance >= 1000
                  ? `${(routeInfo.distance / 1000).toFixed(1)} km`
                  : `${Math.round(routeInfo.distance)} m`}
              </p>
              <p className="text-xs text-gray-500">Distance</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-campus-blue">{routeInfo.minutes} min</p>
              <p className="text-xs text-gray-500">Walking time</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startJourney}
              className="text-sm bg-green-600 text-white rounded px-3 py-1.5 hover:bg-green-700">
              🚶 Start Journey
            </button>
            <button
              onClick={() => { setRoutePath(null); setRouteFrom(null); setRouteTo(null); setFitBounds(null); setRouteInfo(null); }}
              className="text-sm text-red-500 border border-red-300 rounded px-3 py-1.5 hover:bg-red-50">
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active journey HUD */}
      {journeyActive && routePath && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] sm:left-72 bg-gray-900 text-white px-5 py-4">
          {journeyStep >= routePath.length - 1 ? (
            <div className="flex items-center justify-between">
              <p className="font-semibold text-green-400">🎉 You have arrived!</p>
              <button onClick={endJourney} className="text-sm bg-white text-gray-900 rounded px-3 py-1.5">End Journey</button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Head</p>
                <p className="font-semibold capitalize">
                  {bearing(
                    [routePath[journeyStep].y,   routePath[journeyStep].x],
                    [routePath[journeyStep + 1].y, routePath[journeyStep + 1].x]
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Step {journeyStep + 1} of {routePath.length - 1}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-0.5">Remaining</p>
                <p className="font-semibold">
                  {routeInfo?.distance >= 1000
                    ? `${(routeInfo.distance / 1000).toFixed(1)} km`
                    : `${Math.round(routeInfo?.distance || 0)} m`}
                </p>
              </div>
              <button onClick={endJourney} className="text-sm bg-red-600 rounded px-3 py-1.5 hover:bg-red-700 shrink-0">End</button>
            </div>
          )}
        </div>
      )}

      {/* Geo error modal */}
      {geoError && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 space-y-3">
            <h2 className="font-semibold text-base">📍 Location access needed</h2>
            {geoError === 'denied' ? (
              <>
                <p className="text-sm text-gray-600">Location permission was denied. To enable it:</p>
                <ol className="text-sm text-gray-600 list-decimal pl-4 space-y-1">
                  <li>Open your browser <strong>Settings</strong></li>
                  <li>Go to <strong>Privacy &amp; Security → Site Settings → Location</strong></li>
                  <li>Find this site and set it to <strong>Allow</strong></li>
                  <li>Reload the page and try again</li>
                </ol>
              </>
            ) : geoError === 'no_support' ? (
              <p className="text-sm text-gray-600">Your browser doesn't support geolocation. Please use a modern browser.</p>
            ) : (
              <p className="text-sm text-gray-600">Couldn't get your location. Make sure GPS is enabled and try again.</p>
            )}
            <button onClick={() => setGeoError(null)} className="w-full bg-campus-blue text-white py-1.5 rounded text-sm">OK</button>
          </div>
        </div>
      )}

      {/* Mobile floating cancel bar — shown when a mode is active */}
      {(suggestMode || shortcutMode) && (
        <div className="sm:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 bg-white border rounded-full shadow-lg px-5 py-2.5 text-sm">
          <span className="text-gray-700">
            {suggestMode && 'Tap map to suggest a location'}
            {shortcutMode && shortcutPins.length === 0 && 'Tap map to place start point'}
            {shortcutMode && shortcutPins.length === 1 && 'Tap map to place end point'}
            {shortcutMode && shortcutPins.length === 2 && 'Both points placed'}
          </span>
          <button
            onClick={() => { setSuggestMode(false); setShortcutMode(false); setShortcutPins([]); }}
            className="text-red-500 font-medium shrink-0"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Location Drawer */}
      {selectedLocation && (
        <LocationPanel locationId={selectedLocation} onClose={() => setSelectedLocation(null)}
          onGetDirections={(id) => { setRouteTo(id); }} />
      )}

      {/* Shortcut form when 2 nodes picked */}
      {shortcutMode && shortcutPins.length === 2 && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/40">
          <form onSubmit={handleShortcutSubmit} className="bg-white rounded-lg shadow-xl p-6 w-80 space-y-3">
            <h2 className="font-semibold text-base">Suggest Shortcut</h2>
            <p className="text-xs text-gray-500">
              Start: {shortcutPins[0].lat.toFixed(5)}, {shortcutPins[0].lng.toFixed(5)}<br/>
              End: {shortcutPins[1].lat.toFixed(5)}, {shortcutPins[1].lng.toFixed(5)}
            </p>
            <div>
              <label className="block text-xs font-medium mb-0.5">Description (optional)</label>
              <textarea value={shortcutDesc} onChange={(e) => setShortcutDesc(e.target.value)}
                rows={2} className="w-full border rounded px-2 py-1 text-sm resize-none" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={shortcutSubmitting}
                className="flex-1 bg-campus-blue text-white py-1.5 rounded text-sm disabled:opacity-50">
                {shortcutSubmitting ? 'Submitting…' : 'Submit'}
              </button>
              <button type="button" onClick={() => { setShortcutMode(false); setShortcutPins([]); }}
                className="flex-1 border py-1.5 rounded text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Already exists popup */}
      {nearbyLoc && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 space-y-3">
            <h2 className="font-semibold text-base">Location already exists</h2>
            <p className="text-sm text-gray-600"><span className="font-medium">{nearbyLoc.name}</span> is already registered near this spot.</p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button onClick={() => { setSelectedLocation(nearbyLoc.id); setNearbyLoc(null); }}
                  className="flex-1 bg-campus-blue text-white py-1.5 rounded text-sm">View location</button>
                <button onClick={() => setNearbyLoc(null)} className="flex-1 border py-1.5 rounded text-sm">Close</button>
              </div>
              <button onClick={() => { setSuggestForm({ name: '', description: '', category: 'other', lat: nearbyLoc.lat, lng: nearbyLoc.lng }); setNearbyLoc(null); }}
                className="w-full border border-campus-blue text-campus-blue py-1.5 rounded text-sm hover:bg-blue-50">
                Suggest another place at this spot?
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Suggestion Modal */}
      {featureModalOpen && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-bold text-lg">💡 Suggest a Feature</h2>
            <p className="text-sm text-gray-600">Have an idea to improve MapMyCampus? Let the admins know!</p>
            <form onSubmit={handleFeatureSubmit} className="space-y-3">
              <textarea
                value={featureBody}
                onChange={(e) => setFeatureBody(e.target.value)}
                placeholder="I would love it if..."
                rows={4}
                className="w-full border rounded p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-campus-blue"
                required
              />
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setFeatureModalOpen(false)} className="px-4 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={featureSubmitting} className="px-4 py-1.5 bg-campus-blue text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suggest Location Form */}
      {suggestForm && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/40">
          <form onSubmit={handleSuggestSubmit} className="bg-white rounded-lg shadow-xl p-6 w-80 space-y-3">
            <h2 className="font-semibold text-base">Suggest a Location</h2>
            <p className="text-xs text-gray-500">📍 {suggestForm.lat.toFixed(6)}, {suggestForm.lng.toFixed(6)}</p>
            {[{k:'name',label:'Name'}].map(({k,label}) => (
              <div key={k}>
                <label className="block text-xs font-medium mb-0.5">{label}</label>
                <input type="text" value={suggestForm[k]}
                  onChange={(e) => setSuggestForm((f) => ({ ...f, [k]: e.target.value }))}
                  className="w-full border rounded px-2 py-1 text-sm" required />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium mb-0.5">Category</label>
              <select value={suggestForm.category} onChange={(e) => setSuggestForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border-gray-300 rounded p-1.5 text-sm border focus:ring-campus-blue">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-0.5">Description</label>
              <textarea value={suggestForm.description} onChange={(e) => setSuggestForm((f) => ({ ...f, description: e.target.value }))}
                rows={2} className="w-full border rounded px-2 py-1 text-sm resize-none" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={suggestSubmitting}
                className="flex-1 bg-campus-blue text-white py-1.5 rounded text-sm disabled:opacity-50">
                {suggestSubmitting ? 'Submitting…' : 'Submit'}
              </button>
              <button type="button" onClick={() => { setSuggestForm(null); setSuggestMode(false); }} className="flex-1 border py-1.5 rounded text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
