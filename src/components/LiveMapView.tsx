import { useEffect, useState, useMemo, useRef } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Checkpoint } from '../lib/types';
import { formatDistance } from '../lib/utils';

interface Props {
  checkpoints: Checkpoint[];
  userLat: number;
  userLng: number;
  zoomRange?: number;
  foundIds: string[];
  onCPPress?: (cp: Checkpoint) => void;
  onMapClick?: (lat: number, lng: number) => void;
  showUser?: boolean;
  interactive?: boolean;
  height?: string | number;
  darkMode?: boolean;
  leaderMode?: boolean;
  pendingLat?: number | null;
  pendingLng?: number | null;
  pendingEmoji?: string;
  pendingRadius?: number;
  allowFullscreen?: boolean;
}

function rangeToZoom(range: number): number {
  if (range <= 50) return 18;
  if (range <= 200) return 17;
  if (range <= 500) return 16;
  if (range <= 1000) return 15;
  if (range <= 3000) return 14;
  if (range <= 5000) return 13;
  if (range <= 10000) return 12;
  if (range <= 30000) return 11;
  return 10;
}

export default function LiveMapView({
  checkpoints,
  userLat,
  userLng,
  zoomRange = 5000,
  foundIds,
  onCPPress,
  onMapClick,
  showUser = true,
  interactive = true,
  height = '100%',
  darkMode = true,
  leaderMode = false,
  pendingLat = null,
  pendingLng = null,
  pendingEmoji = '📍',
  pendingRadius = 3,
  allowFullscreen = true,
}: Props) {
  const zoom = rangeToZoom(zoomRange);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Listen for messages from iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'map_click' && onMapClick) {
          onMapClick(data.lat, data.lng);
        }
        if (data.type === 'cp_click' && onCPPress) {
          const cp = checkpoints.find((c) => c.id === data.id);
          if (cp) onCPPress(cp);
        }
        if (data.type === 'map_ready') {
          setMapReady(true);
        }
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMapClick, onCPPress, checkpoints]);

  const markersJSON = useMemo(() => {
    return JSON.stringify(
      checkpoints.map((cp, idx) => ({
        id: cp.id,
        lat: cp.latitude,
        lng: cp.longitude,
        emoji: cp.emoji,
        label: cp.label,
        radius: cp.radius,
        found: foundIds.includes(cp.id),
        hint: cp.hint || '',
        hasContent: !!(cp.content || cp.imageUrl),
        order: idx + 1,
      }))
    );
  }, [checkpoints, foundIds]);

  const mapHTML = useMemo(() => {
    const tileUrl = darkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileAttr = darkMode
      ? '&copy; OSM &copy; CARTO'
      : '&copy; OpenStreetMap';

    const pendingMarkerJS = (pendingLat !== null && pendingLng !== null) ? `
      var pendingCircle = L.circle([${pendingLat}, ${pendingLng}], {
        radius: ${pendingRadius},
        color: '#00F0FF',
        fillColor: 'rgba(0,240,255,0.15)',
        fillOpacity: 0.6,
        weight: 2,
        dashArray: '6,4'
      }).addTo(map);
      var pendingIcon = L.divIcon({
        html: '<div class="pending-marker">${pendingEmoji}</div>',
        className: '', iconSize: [44, 44], iconAnchor: [22, 22]
      });
      L.marker([${pendingLat}, ${pendingLng}], { icon: pendingIcon, zIndexOffset: 2000 }).addTo(map);
    ` : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    body { background: ${darkMode ? '#0A0E1A' : '#f0f0f0'}; }
    .emoji-marker {
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; width: 34px; height: 34px;
      border-radius: 50%; border: 2px solid #F59E0B;
      background: rgba(245,158,11,0.25); text-align: center; line-height: 34px;
      cursor: pointer; transition: transform 0.15s; position: relative;
    }
    .emoji-marker:hover { transform: scale(1.15); }
    .emoji-marker.found { border-color: #10B981; background: rgba(16,185,129,0.25); }
    .marker-order {
      position: absolute; top: -8px; right: -8px;
      background: ${darkMode ? '#111827' : '#fff'}; color: #00F0FF;
      font-size: 9px; font-weight: 800; width: 18px; height: 18px;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      border: 1.5px solid #00F0FF; font-family: monospace;
    }
    .pending-marker {
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; width: 44px; height: 44px;
      border-radius: 50%; border: 3px solid #00F0FF;
      background: rgba(0,240,255,0.2); text-align: center;
      animation: bounce 0.6s ease-out;
      box-shadow: 0 0 20px rgba(0,240,255,0.4);
    }
    @keyframes bounce {
      0% { transform: scale(0.3) translateY(-20px); opacity: 0; }
      60% { transform: scale(1.1) translateY(0); opacity: 1; }
      100% { transform: scale(1) translateY(0); }
    }
    .user-marker {
      width: 16px; height: 16px; border-radius: 50%;
      background: #00F0FF; border: 3px solid rgba(0,240,255,0.3);
      box-shadow: 0 0 12px rgba(0,240,255,0.6);
    }
    .user-pulse {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(0,240,255,0.12); border: 1px solid rgba(0,240,255,0.25);
      animation: pulse 2s ease-out infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(2.5); opacity: 0; }
    }
    .cp-popup {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-width: 150px;
    }
    .cp-popup .cp-name { font-size: 13px; font-weight: 700; color: ${darkMode ? '#F1F5F9' : '#1a1a1a'}; margin-bottom: 3px; }
    .cp-popup .cp-meta { font-size: 10px; color: ${darkMode ? '#94A3B8' : '#666'}; }
    .cp-popup .cp-found { color: #10B981; font-weight: 600; font-size: 11px; margin-top: 3px; }
    .cp-popup .cp-content-hint { color: #8B5CF6; font-size: 10px; margin-top: 3px; }
    .leaflet-popup-content-wrapper {
      background: ${darkMode ? '#111827' : '#fff'};
      border: 1px solid ${darkMode ? '#1E293B' : '#ddd'};
      border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .leaflet-popup-tip { background: ${darkMode ? '#111827' : '#fff'}; }
    .coord-badge {
      position: fixed; bottom: 8px; left: 8px;
      background: ${darkMode ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.92)'};
      color: ${darkMode ? '#94A3B8' : '#666'}; font-size: 10px;
      padding: 4px 10px; border-radius: 8px;
      font-family: monospace; border: 1px solid ${darkMode ? '#1E293B' : '#ddd'};
      z-index: 1000; pointer-events: none;
    }
    .scale-badge {
      position: fixed; bottom: 8px; right: 8px;
      background: ${darkMode ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.92)'};
      color: #00F0FF; font-size: 10px; font-weight: 700;
      padding: 4px 10px; border-radius: 8px;
      font-family: monospace; border: 1px solid rgba(0,240,255,0.2);
      z-index: 1000; pointer-events: none;
    }
    ${leaderMode ? `
    .crosshair {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      pointer-events: none; z-index: 999;
    }
    .crosshair::before, .crosshair::after {
      content: ''; position: absolute; background: rgba(0,240,255,0.4);
    }
    .crosshair::before { width: 1px; height: 24px; top: -12px; left: 0; }
    .crosshair::after { width: 24px; height: 1px; top: 0; left: -12px; }
    .crosshair-dot {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 6px; height: 6px; border-radius: 50%; background: #00F0FF;
      box-shadow: 0 0 8px rgba(0,240,255,0.6);
      pointer-events: none; z-index: 999;
    }
    .place-hint {
      position: fixed; top: 50px; left: 50%; transform: translateX(-50%);
      background: rgba(0,240,255,0.15); color: #00F0FF;
      font-size: 12px; font-weight: 600; padding: 8px 16px; border-radius: 8px;
      border: 1px solid rgba(0,240,255,0.4); z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      pointer-events: none; white-space: nowrap;
    }
    ` : ''}
    #searchBox {
      position: fixed; top: ${leaderMode ? '100px' : '10px'}; left: 10px; right: 10px;
      z-index: 1001;
    }
    #searchInput {
      width: 100%; padding: 10px 14px; border-radius: 10px;
      border: 1px solid ${darkMode ? '#334155' : '#ccc'};
      background: ${darkMode ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.95)'};
      color: ${darkMode ? '#F1F5F9' : '#333'}; font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      outline: none; box-shadow: 0 2px 12px rgba(0,0,0,0.2);
    }
    #searchInput::placeholder { color: ${darkMode ? '#64748B' : '#999'}; }
    #searchInput:focus { border-color: #00F0FF; }
    #searchResults {
      margin-top: 4px; border-radius: 10px; overflow: hidden;
      background: ${darkMode ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.95)'};
      border: 1px solid ${darkMode ? '#1E293B' : '#ddd'};
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      max-height: 200px; overflow-y: auto; display: none;
    }
    .search-item {
      padding: 10px 14px; cursor: pointer; border-bottom: 1px solid ${darkMode ? '#1E293B' : '#eee'};
      font-size: 13px; color: ${darkMode ? '#F1F5F9' : '#333'};
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .search-item:hover { background: ${darkMode ? '#1A2236' : '#f5f5f5'}; }
    .search-item small { color: ${darkMode ? '#64748B' : '#999'}; display: block; margin-top: 2px; font-size: 11px; }
  </style>
</head>
<body>
  ${leaderMode ? '<div class="crosshair"></div><div class="crosshair-dot"></div><div class="place-hint">點擊地圖放置寶藏</div>' : ''}
  <div id="searchBox">
    <input id="searchInput" type="text" placeholder="🔍 搜尋地點..." autocomplete="off" />
    <div id="searchResults"></div>
  </div>
  <div id="map"></div>
  <div class="coord-badge" id="coordBadge"></div>
  <div class="scale-badge" id="scaleBadge"></div>
  <script>
    var map = L.map('map', {
      center: [${userLat}, ${userLng}],
      zoom: ${zoom},
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('${tileUrl}', { attribution: '${tileAttr}', maxZoom: 19 }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

    // User marker
    ${showUser ? `
    var userPulseIcon = L.divIcon({ html: '<div class="user-pulse"></div>', className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
    L.marker([${userLat}, ${userLng}], { icon: userPulseIcon, zIndexOffset: 900 }).addTo(map);
    var userDotIcon = L.divIcon({ html: '<div class="user-marker"></div>', className: '', iconSize: [16, 16], iconAnchor: [8, 8] });
    L.marker([${userLat}, ${userLng}], { icon: userDotIcon, zIndexOffset: 1000 }).addTo(map);
    ` : ''}

    // Checkpoints
    var markers = ${markersJSON};
    markers.forEach(function(m) {
      L.circle([m.lat, m.lng], {
        radius: m.radius,
        color: m.found ? '#10B981' : '#F59E0B',
        fillColor: m.found ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.08)',
        fillOpacity: 0.5, weight: 1.5,
        dashArray: m.found ? '' : '5,5'
      }).addTo(map);

      var icon = L.divIcon({
        html: '<div class="emoji-marker ' + (m.found ? 'found' : '') + '">' + m.emoji + '<div class="marker-order">' + m.order + '</div></div>',
        className: '', iconSize: [34, 34], iconAnchor: [17, 17]
      });
      var marker = L.marker([m.lat, m.lng], { icon: icon }).addTo(map);

      var popupHTML = '<div class="cp-popup">' +
        '<div class="cp-name">#' + m.order + ' ' + m.emoji + ' ' + m.label + '</div>' +
        '<div class="cp-meta">' + m.lat.toFixed(5) + ', ' + m.lng.toFixed(5) + ' • ' + m.radius + 'm</div>' +
        (m.found ? '<div class="cp-found">✓ 已找到!</div>' : '') +
        (m.hint && !m.found ? '<div class="cp-meta" style="margin-top:3px;font-style:italic">💡 ' + m.hint + '</div>' : '') +
        (m.hasContent ? '<div class="cp-content-hint">📄 有內容</div>' : '') +
        '</div>';
      marker.bindPopup(popupHTML, { closeButton: true, maxWidth: 240 });
      marker.on('click', function() {
        try { window.parent.postMessage(JSON.stringify({ type: 'cp_click', id: m.id }), '*'); } catch(e) {}
      });
    });

    ${pendingMarkerJS}

    // Map click
    map.on('click', function(e) {
      try {
        window.parent.postMessage(JSON.stringify({
          type: 'map_click', lat: e.latlng.lat, lng: e.latlng.lng
        }), '*');
      } catch(ex) {}
    });

    // Coordinate badge
    map.on('mousemove', function(e) {
      document.getElementById('coordBadge').textContent =
        e.latlng.lat.toFixed(5) + ', ' + e.latlng.lng.toFixed(5);
    });

    // Scale badge
    function updateScale() {
      var bounds = map.getBounds();
      var dist = map.distance(bounds.getNorthEast(), bounds.getSouthWest()) / 2;
      var badge = document.getElementById('scaleBadge');
      badge.textContent = dist < 1000 ? Math.round(dist) + 'm' : (dist/1000).toFixed(1) + 'km';
    }
    map.on('zoomend moveend', updateScale);
    updateScale();

    // Fit bounds
    ${checkpoints.length > 0 ? `
    var allPts = markers.map(function(m) { return [m.lat, m.lng]; });
    ${showUser ? `allPts.push([${userLat}, ${userLng}]);` : ''}
    if (allPts.length > 1) map.fitBounds(allPts, { padding: [50, 50], maxZoom: ${zoom} });
    ` : ''}

    // Search
    var searchInput = document.getElementById('searchInput');
    var searchResults = document.getElementById('searchResults');
    var searchTimeout = null;

    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      var q = searchInput.value.trim();
      if (q.length < 2) { searchResults.style.display = 'none'; return; }
      searchTimeout = setTimeout(function() {
        fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(q) + '&limit=5&addressdetails=1')
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (!data.length) { searchResults.style.display = 'none'; return; }
            searchResults.innerHTML = '';
            searchResults.style.display = 'block';
            data.forEach(function(item) {
              var div = document.createElement('div');
              div.className = 'search-item';
              div.innerHTML = item.display_name.split(',').slice(0,3).join(', ') +
                '<small>' + parseFloat(item.lat).toFixed(5) + ', ' + parseFloat(item.lon).toFixed(5) + '</small>';
              div.addEventListener('click', function() {
                var lat = parseFloat(item.lat);
                var lng = parseFloat(item.lon);
                map.setView([lat, lng], Math.max(map.getZoom(), 15));
                searchResults.style.display = 'none';
                searchInput.value = item.display_name.split(',').slice(0,2).join(', ');
                try {
                  window.parent.postMessage(JSON.stringify({
                    type: 'map_click', lat: lat, lng: lng
                  }), '*');
                } catch(ex) {}
              });
              searchResults.appendChild(div);
            });
          }).catch(function() {});
      }, 400);
    });

    searchInput.addEventListener('focus', function() {
      if (searchResults.children.length > 0) searchResults.style.display = 'block';
    });

    document.addEventListener('click', function(e) {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
      }
    });

    window.parent.postMessage(JSON.stringify({ type: 'map_ready' }), '*');
  </script>
</body>
</html>`;
  }, [userLat, userLng, zoom, markersJSON, showUser, interactive, darkMode, checkpoints.length, leaderMode, pendingLat, pendingLng, pendingEmoji, pendingRadius]);

  const normalHeight = typeof height === 'number' ? `${height}px` : height;

  return (
    <>
      {/* Normal View */}
      <div 
        className="relative w-full overflow-hidden rounded-[14px] bg-[#0A0E1A]"
        style={{ height: normalHeight, minHeight: '300px' }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={mapHTML}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups"
          title="Map"
        />
        {!mapReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0E1A]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-2" />
            <span className="text-slate-400 text-sm">載入地圖中...</span>
          </div>
        )}
        
        {/* Fullscreen Button */}
        {allowFullscreen && (
          <button
            onClick={() => setIsFullscreen(true)}
            className="absolute top-3 right-3 z-10 p-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
            title="全螢幕"
          >
            <Maximize2 size={18} className="text-cyan-400" />
          </button>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-[#0A0E1A]">
          {/* Close Button */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-[10000] p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl transition-colors shadow-lg"
          >
            <Minimize2 size={24} className="text-cyan-400" />
          </button>
          
          {/* Hint */}
          <div className="absolute top-4 left-4 z-[10000] bg-slate-800/90 border border-slate-600 rounded-lg px-4 py-2">
            <p className="text-sm text-slate-300">
              {leaderMode ? '點擊地圖放置寶藏' : '實境尋寶地圖'}
            </p>
          </div>

          {/* Fullscreen Map */}
          <iframe
            srcDoc={mapHTML}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups"
            title="Map Fullscreen"
          />
        </div>
      )}
    </>
  );
}
