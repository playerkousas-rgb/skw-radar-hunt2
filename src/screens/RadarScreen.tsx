import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Navigation, Map as MapIcon, List, Volume2,
  VolumeX, Target, RotateCcw, CheckCircle, AlertTriangle,
  MoreVertical, Trash2, Download, X
} from 'lucide-react';
import { saveFoundCheckpoints, saveActiveMap } from '../lib/storage';
import { GameMap, Checkpoint, ViewType } from '../lib/types';
import { calculateDistance, formatDistance, getDirectionAngle, getDirectionLabel, getNearestCheckpoint, playSound, vibrateDevice } from '../lib/utils';
import RadarView from '../components/RadarView';
import NearbyAlert from '../components/NearbyAlert';
import CPDetailModal from '../components/CPDetailModal';
import GlowButton from '../components/GlowButton';
import LiveMapView from '../components/LiveMapView';

interface Props {
  map: GameMap;
  currentLocation: { lat: number; lng: number };
  foundCheckpoints: string[];
  onBack: () => void;
  onChangeView: (view: ViewType) => void;
  gpsEnabled: boolean;
}

// 單次屏幕閃光元件（只閃一下，不會不停閃）
function ScreenFlash() {
  useEffect(() => {
    const originalBg = document.documentElement.style.backgroundColor || '#0f172a';

    // 強烈黃橙色閃光（可調整顏色）
    document.documentElement.style.transition = 'none';
    document.documentElement.style.backgroundColor = '#fbbf24';   // 亮橙黃

    const timer = setTimeout(() => {
      document.documentElement.style.transition = 'background-color 0.5s ease-out';
      document.documentElement.style.backgroundColor = originalBg;
    }, 220);   // 只閃 0.22 秒，感覺明顯但不煩人

    return () => clearTimeout(timer);
  }, []);

  return null;
}

export default function RadarScreen({ map, currentLocation, foundCheckpoints, onBack, onChangeView, gpsEnabled }: Props) {
  const [detailCP, setDetailCP] = useState<Checkpoint | null>(null);
  const [detailDist, setDetailDist] = useState<number>(0);
  const [nearbyAlert, setNearbyAlert] = useState<{ show: boolean; distance: number; name: string }>({
    show: false, distance: 0, name: ''
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [localFound, setLocalFound] = useState<string[]>(foundCheckpoints);
  const lastNearbyAlert = useRef<number>(0);

  // Sync with props
  useEffect(() => {
    setLocalFound(foundCheckpoints);
  }, [foundCheckpoints]);

  const unfoundCPs = map.checkpoints.filter(cp => !localFound.includes(cp.id));
  const nearest = unfoundCPs.length > 0
    ? getNearestCheckpoint(unfoundCPs, currentLocation.lat, currentLocation.lng)
    : null;

  // Auto-scale radar range
  const radarRange = nearest
    ? Math.max(50, Math.min(50000, nearest.distance * 2.5))
    : 5000;

  // Check for nearby alerts
  useEffect(() => {
    if (!nearest) return;

    if (nearest.distance <= nearest.checkpoint.radius * 3 && nearest.distance > nearest.checkpoint.radius) {
      const now = Date.now();
      if (now - lastNearbyAlert.current > 15000) {
        lastNearbyAlert.current = now;
        setNearbyAlert({
          show: true,
          distance: nearest.distance,
          name: nearest.checkpoint.label
        });
        if (soundEnabled) playSound('nearby');
      }
    }
  }, [currentLocation, nearest, soundEnabled]);

  const progress = localFound.length / Math.max(map.checkpoints.length, 1);
  const directionToNearest = nearest
    ? getDirectionAngle(currentLocation.lat, currentLocation.lng, nearest.checkpoint.latitude, nearest.checkpoint.longitude)
    : 0;

  const openCPDetail = (cp: Checkpoint) => {
    const dist = calculateDistance(currentLocation.lat, currentLocation.lng, cp.latitude, cp.longitude);
    setDetailCP(cp);
    setDetailDist(dist);
  };

  const handleClearProgress = async () => {
    if (!confirm('確定要清除所有尋寶進度嗎？這將重置你已找到的所有寶藏。')) return;
    await saveFoundCheckpoints(map.id, []);
    setLocalFound([]);
    setShowMenu(false);
    playSound('click');
  };

  const handleImportNewMap = async () => {
    if (localFound.length > 0 && !confirm('導入新地圖將會清除當前進度，確定要繼續嗎？')) return;
    await saveActiveMap(null);
    await saveFoundCheckpoints(map.id, []);
    onChangeView('member-import');
  };

  const isComplete = localFound.length === map.checkpoints.length;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* GPS Warning */}
      {!gpsEnabled && (
        <div className="bg-red-500/20 border-b border-red-500/50 p-2 text-center shrink-0">
          <p className="text-red-400 text-xs font-semibold flex items-center justify-center gap-1">
            <AlertTriangle size={14} />
            GPS 未啟用 - 請允許位置權限才能尋寶
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/50 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
          <ArrowLeft size={20} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100 text-sm truncate max-w-[120px]">{map.name}</h1>
          <p className="text-[10px] text-slate-500">{localFound.length}/{map.checkpoints.length} 已找到</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowMap(!showMap)}
            className={`p-2 rounded-lg transition-colors ${showMap ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <MapIcon size={18} />
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition-colors ${soundEnabled ? 'text-cyan-400' : 'text-slate-500'}`}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={() => setShowMenu(true)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-800 shrink-0">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Main Content - Map or Radar */}
      <div className="h-[55vh] shrink-0 relative">
        {showMap ? (
          <LiveMapView
            checkpoints={map.checkpoints}
            userLat={currentLocation.lat}
            userLng={currentLocation.lng}
            zoomRange={radarRange}
            foundIds={localFound}
            onCPPress={openCPDetail}
            showUser={true}
            interactive={true}
            height="100%"
            darkMode={true}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-900">
            {!isComplete && nearest ? (
              <RadarView
                distance={nearest.distance}
                direction={directionToNearest}
                emoji={nearest.checkpoint.emoji}
                size={260}
                maxRange={radarRange}
              />
            ) : isComplete ? (
              <div className="text-center">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                  className="text-6xl mb-4"
                >
                  🎉
                </motion.div>
                <h2 className="text-2xl font-black text-cyan-400 mb-2">全部找到！</h2>
              </div>
            ) : (
              <div className="text-center text-slate-500">
                <Target size={48} className="mx-auto mb-2 opacity-30" />
                <p>沒有待尋寶藏</p>
              </div>
            )}
          </div>
        )}

        {/* In Range Indicator */}
        {nearest && nearest.distance <= nearest.checkpoint.radius && !isComplete && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-4 left-1/2 -translate-x-1/2"
          >
            <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/30">
              <Target size={18} />
              <span className="font-bold">🎯 在範圍內！</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Panel - Nearest Treasure Info */}
      <div className="flex-1 bg-slate-900 border-t border-slate-800 overflow-hidden flex flex-col">
        {!isComplete && nearest ? (
          <>
            <div className="p-3 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-300">🎯 最近寶藏</h3>
              <span className="text-xs text-slate-500">{unfoundCPs.length} 個剩餘</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {/* Nearest Card */}
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center text-3xl shrink-0">
                    {nearest.checkpoint.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-100 text-lg truncate">{nearest.checkpoint.label}</h4>
                    <p className="text-xs text-slate-500">
                      {CHECKPOINT_TYPES.find(t => t.type === nearest.checkpoint.type)?.label} • {nearest.checkpoint.radius}m 半徑
                    </p>

                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-cyan-400 font-mono">
                        {formatDistance(nearest.distance)}
                      </span>
                      <span className="text-sm text-slate-500">
                        方向: {getDirectionLabel(directionToNearest)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hint */}
                {nearest.checkpoint.hint && nearest.distance > nearest.checkpoint.radius && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <p className="text-sm text-amber-400">💡 提示: {nearest.checkpoint.hint}</p>
                  </div>
                )}

                {/* Action */}
                <button
                  onClick={() => openCPDetail(nearest.checkpoint)}
                  className="w-full mt-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 transition-colors"
                >
                  查看詳情
                </button>
              </div>

              {/* Other unfound treasures */}
              {unfoundCPs.length > 1 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">其他待尋寶藏:</p>
                  <div className="space-y-2">
                    {unfoundCPs.filter(cp => cp.id !== nearest.checkpoint.id).slice(0, 3).map((cp, idx) => {
                      const dist = calculateDistance(currentLocation.lat, currentLocation.lng, cp.latitude, cp.longitude);
                      return (
                        <div key={cp.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg">
                          <span className="text-xl">{cp.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-300 truncate">{cp.label}</p>
                          </div>
                          <span className="text-sm text-cyan-400 font-mono">{formatDistance(dist)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : isComplete ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-4"
            >
              🎉
            </motion.div>
            <h2 className="text-2xl font-black text-cyan-400 mb-2">完成！</h2>
            <p className="text-slate-400 mb-6">你已找到所有 {map.checkpoints.length} 個寶藏</p>
            <div className="flex gap-3">
              <GlowButton
                title="查看成就"
                onClick={() => onChangeView('achievements')}
                variant="primary"
                size="md"
                icon={<CheckCircle size={18} />}
              />
              <GlowButton
                title="重新開始"
                onClick={() => window.location.reload()}
                variant="ghost"
                size="md"
                icon={<RotateCcw size={18} />}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Target size={48} className="mb-2 opacity-30" />
            <p>沒有待尋寶藏</p>
          </div>
        )}
      </div>

      {/* Nearby alert */}
      <NearbyAlert
        isVisible={nearbyAlert.show}
        distance={nearbyAlert.distance}
        checkpointName={nearbyAlert.name}
        onDismiss={() => setNearbyAlert({ ...nearbyAlert, show: false })}
      />

      {/* 靠近時只閃一次屏幕（不會不停閃） */}
      {nearest && nearest.distance <= nearest.checkpoint.radius * 1.5 && !isComplete && (
        <ScreenFlash key={Date.now()} />
      )}

      {/* Detail modal */}
      <CPDetailModal
        visible={!!detailCP}
        checkpoint={detailCP}
        distance={detailDist}
        isFound={detailCP ? localFound.includes(detailCP.id) : false}
        onClose={() => setDetailCP(null)}
      />

      {/* Menu Modal */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
            onClick={() => setShowMenu(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-lg bg-slate-900 rounded-t-3xl border-t border-slate-700 p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-100">選項</h2>
                <button onClick={() => setShowMenu(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                  <X size={22} className="text-slate-400" />
                </button>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleClearProgress}
                  className="w-full flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-left"
                >
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <Trash2 size={20} className="text-red-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">清除進度</p>
                    <p className="text-sm text-slate-500">重新開始尋寶（保留地圖）</p>
                  </div>
                </button>
                <button
                  onClick={handleImportNewMap}
                  className="w-full flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-left"
                >
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Download size={20} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">導入新地圖</p>
                    <p className="text-sm text-slate-500">加載其他領袖的地圖</p>
                  </div>
                </button>
                <button
                  onClick={() => { setShowMenu(false); onChangeView('settings'); }}
                  className="w-full flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-left"
                >
                  <div className="p-2 bg-violet-500/20 rounded-lg">
                    <List size={20} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">設定</p>
                    <p className="text-sm text-slate-500">音效、震動等選項</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CHECKPOINT_TYPES = [
  { type: 'text', label: '文字' },
  { type: 'image', label: '圖片' },
  { type: 'emoji', label: '表情' },
  { type: 'link', label: '連結' },
];
