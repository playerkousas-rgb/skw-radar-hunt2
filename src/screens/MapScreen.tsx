import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Navigation, Plus, Minus, Layers } from 'lucide-react';
import { GameMap, Checkpoint, ViewType } from '../lib/types';
import { calculateDistance, formatDistance, getNearestCheckpoint } from '../lib/utils';
import LiveMapView from '../components/LiveMapView';
import CPDetailModal from '../components/CPDetailModal';

interface Props {
  map: GameMap;
  currentLocation: { lat: number; lng: number };
  foundCheckpoints: string[];
  onBack: () => void;
  onChangeView: (view: ViewType) => void;
}

const ZOOM_LEVELS = [100, 200, 500, 1000, 3000, 5000, 10000, 30000];

export default function MapScreen({ map, currentLocation, foundCheckpoints, onBack, onChangeView }: Props) {
  const [detailCP, setDetailCP] = useState<Checkpoint | null>(null);
  const [zoomLevel, setZoomLevel] = useState(4);

  const unfoundCPs = map.checkpoints.filter(cp => !foundCheckpoints.includes(cp.id));
  const nearest = getNearestCheckpoint(unfoundCPs, currentLocation.lat, currentLocation.lng);

  const openCPDetail = (cp: Checkpoint) => {
    setDetailCP(cp);
  };

  const zoomIn = () => setZoomLevel(prev => Math.max(0, prev - 1));
  const zoomOut = () => setZoomLevel(prev => Math.min(ZOOM_LEVELS.length - 1, prev + 1));

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 z-10">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100">實境地圖</h1>
          <p className="text-xs text-slate-500">{map.checkpoints.length} 個寶藏點</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: '500px', height: '60vh' }}>
        <LiveMapView
          checkpoints={map.checkpoints}
          userLat={currentLocation.lat}
          userLng={currentLocation.lng}
          zoomRange={ZOOM_LEVELS[zoomLevel]}
          foundIds={foundCheckpoints}
          onCPPress={openCPDetail}
          showUser={true}
          interactive={true}
          height="100%"
          darkMode={true}
        />

        {/* Controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="bg-slate-900/90 backdrop-blur px-3 py-2 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 text-xs">
              <Navigation size={14} className="text-cyan-400" />
              <span className="font-mono text-slate-300">
                {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={zoomOut}
              disabled={zoomLevel >= ZOOM_LEVELS.length - 1}
              className="p-2 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg disabled:opacity-50"
            >
              <Minus size={16} className="text-slate-300" />
            </button>
            <span className="px-3 py-2 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg text-xs font-mono text-cyan-400 min-w-[70px] text-center">
              {formatDistance(ZOOM_LEVELS[zoomLevel])}
            </span>
            <button 
              onClick={zoomIn}
              disabled={zoomLevel <= 0}
              className="p-2 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg disabled:opacity-50"
            >
              <Plus size={16} className="text-slate-300" />
            </button>
          </div>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Layers size={20} className="text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-100">視圖範圍</p>
                  <p className="text-xs text-slate-500">{formatDistance(ZOOM_LEVELS[zoomLevel])}</p>
                </div>
              </div>
              
              {nearest && (
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{nearest.checkpoint.emoji}</span>
                    <span className="text-sm font-bold text-amber-400">{formatDistance(nearest.distance)}</span>
                  </div>
                  <p className="text-xs text-slate-500">最近寶藏</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CPDetailModal
        visible={!!detailCP}
        checkpoint={detailCP}
        distance={detailCP ? calculateDistance(currentLocation.lat, currentLocation.lng, detailCP.latitude, detailCP.longitude) : 0}
        isFound={detailCP ? foundCheckpoints.includes(detailCP.id) : false}
        onClose={() => setDetailCP(null)}
      />
    </div>
  );
}
