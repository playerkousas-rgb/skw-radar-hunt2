import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Map as MapIcon, Volume2, VolumeX, Target,
  MoreVertical, Trophy, Clock, Navigation as NavIcon, Signal, Flag, CheckCircle,
  BookOpen, HelpCircle
} from 'lucide-react';
import { saveFoundCheckpoints, saveActiveMap } from '../lib/storage';
import { GameMap, Checkpoint, ViewType, GameSession } from '../lib/types';
import {
  calculateDistance, formatDistance, getDirectionLabel,
  getNearestCheckpoint, playSound, vibrateDevice, formatTime, getGPSQuality
} from '../lib/utils';
import RadarView from '../components/RadarView';
import NearbyAlert from '../components/NearbyAlert';
import CPDetailModal from '../components/CPDetailModal';
import TreasureFoundCard from '../components/TreasureFoundCard';
import GlowButton from '../components/GlowButton';
import LiveMapView from '../components/LiveMapView';

interface Props {
  map: GameMap;
  currentLocation: { lat: number; lng: number; accuracy?: number };
  foundCheckpoints: string[];
  onBack: () => void;
  onChangeView: (view: ViewType) => void;
  gpsEnabled: boolean;
  session?: GameSession | null;
  startTime?: number;
  onFinishHunt?: () => void;
}

export default function RadarScreen({
  map, currentLocation, foundCheckpoints, onBack, onChangeView,
  gpsEnabled, session, startTime: startTimeProp, onFinishHunt
}: Props) {
  const [detailCP, setDetailCP] = useState<Checkpoint | null>(null);
  const [detailDist, setDetailDist] = useState<number>(0);
  const [nearbyAlert, setNearbyAlert] = useState<{ show: boolean; distance: number; name: string }>({
    show: false, distance: 0, name: ''
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [localFound, setLocalFound] = useState<string[]>(foundCheckpoints);
  const [foundPopup, setFoundPopup] = useState<Checkpoint | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const lastNearbyAlert = useRef<number>(0);
  const lastFoundRef = useRef<Set<string>>(new Set(foundCheckpoints));

  // Determine start time (from session or prop)
  const huntStart = startTimeProp || (session?.startTime && session.startTime < Date.now() + 60000 ? session.startTime : Date.now());

  // Sync with props & detect new found checkpoints
  useEffect(() => {
    const prevSet = lastFoundRef.current;
    for (const id of foundCheckpoints) {
      if (!prevSet.has(id)) {
        const cp = map.checkpoints.find(c => c.id === id);
        if (cp) {
          setFoundPopup(cp);
          playSound('found');
          vibrateDevice([100, 50, 100, 50, 200]);
        }
        prevSet.add(id);
      }
    }
    setLocalFound(foundCheckpoints);
  }, [foundCheckpoints, map.checkpoints]);

  // Live timer
  useEffect(() => {
    const update = () => setElapsedTime(Math.floor((Date.now() - huntStart) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [huntStart]);

  const unfoundCPs = map.checkpoints.filter(cp => !localFound.includes(cp.id));
  const nearest = unfoundCPs.length > 0
    ? getNearestCheckpoint(unfoundCPs, currentLocation.lat, currentLocation.lng)
    : null;

  const radarRange = nearest
    ? Math.max(50, Math.min(50000, nearest.distance * 2.5))
    : 500;

  // Nearby alert
  useEffect(() => {
    if (!nearest) return;
    if (nearest.distance <= nearest.checkpoint.radius * 3 && nearest.distance > nearest.checkpoint.radius) {
      const now = Date.now();
      if (now - lastNearbyAlert.current > 8000) {
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
  const isComplete = localFound.length === map.checkpoints.length;
  const gpsQuality = getGPSQuality(currentLocation.accuracy);
  const directionToNearest = nearest
    ? calculateBearing(currentLocation.lat, currentLocation.lng, nearest.checkpoint.latitude, nearest.checkpoint.longitude)
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
    lastFoundRef.current = new Set();
    setShowMenu(false);
    playSound('click');
  };

  const handleImportNewMap = async () => {
    if (localFound.length > 0 && !confirm('導入新地圖將清除當前進度，確定繼續？')) return;
    await saveActiveMap(null);
    await saveFoundCheckpoints(map.id, []);
    onChangeView('member-import');
  };

  const handleFinish = () => {
    if (localFound.length === 0) {
      alert('你還沒找到任何寶藏！');
      return;
    }
    if (onFinishHunt) {
      onFinishHunt();
    } else {
      onChangeView('result' as ViewType);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col safe-area-top">
      {/* GPS Warning */}
      {!gpsEnabled && (
        <div className="bg-red-500/20 border-b border-red-500/50 p-2 text-center shrink-0">
          <p className="text-red-400 text-xs font-semibold flex items-center justify-center gap-1">
            <Target size={14} />
            GPS 未啟用 - 請允許位置權限才能尋寶
          </p>
        </div>
      )}

      {/* Header with timer & progress */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center justify-between p-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg active:scale-95 transition-transform">
            <ArrowLeft size={20} className="text-slate-300" />
          </button>
          <div className="text-center flex-1 min-w-0 px-2">
            <h1 className="font-bold text-slate-100 text-sm truncate">{map.name}</h1>
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-0.5">
                <Target size={10} className="text-cyan-400" />
                <span className="text-cyan-400 font-bold">{localFound.length}/{map.checkpoints.length}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5 font-mono text-emerald-400">
                <Clock size={10} /> {formatTime(elapsedTime)}
              </span>
              {session && <>
                <span>•</span>
                <span className="text-violet-400 font-mono">{session.code}</span>
              </>}
            </div>
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
        <div className="h-1.5 bg-slate-800 relative">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5 }}
          />
          {map.checkpoints.map((_, i) => (
            <div
              key={i}
              className={`absolute top-0 h-full w-px ${i < localFound.length ? 'bg-slate-950/50' : 'bg-slate-700'}`}
              style={{ left: `${((i + 1) / map.checkpoints.length) * 100}%` }}
            />
          ))}
        </div>
      </div>

      {/* GPS quality pill (top-right floating) */}
      <div className="absolute top-16 right-3 z-20">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur border border-slate-700 text-xs ${gpsQuality.color}`}>
          <Signal size={12} />
          <span className="font-medium">{gpsQuality.label}</span>
          {currentLocation.accuracy && <span className="text-slate-500">±{Math.round(currentLocation.accuracy)}m</span>}
        </div>
      </div>

      {/* Treasure log floating button (top-left) */}
      <button
        onClick={() => onChangeView('treasure-log')}
        className="absolute top-16 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur border border-violet-500/40 text-violet-300 text-xs hover:bg-violet-500/20 active:scale-95 transition-all"
      >
        <BookOpen size={14} />
        <span className="font-medium">{localFound.length} 收藏</span>
      </button>

      {/* Main Content - Map or Radar */}
      <div className="h-[48vh] md:h-[55vh] shrink-0 relative">
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
          <div className="h-full flex items-center justify-center bg-slate-900 relative">
            {!isComplete && nearest ? (
              <>
                <RadarView
                  distance={nearest.distance}
                  direction={directionToNearest}
                  emoji={nearest.checkpoint.emoji}
                  size={Math.min(window.innerWidth - 80, 300)}
                  maxRange={radarRange}
                />
                {/* In range banner */}
                <AnimatePresence>
                  {nearest.distance <= nearest.checkpoint.radius && (
                    <motion.div
                      initial={{ scale: 0, y: -20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0 }}
                      className="absolute top-4 left-1/2 -translate-x-1/2"
                    >
                      <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/30 backdrop-blur-sm">
                        <Target size={18} />
                        <span className="font-bold">🎯 在範圍內！仔細找一下！</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : isComplete ? (
              <div className="text-center">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                  className="text-7xl mb-4"
                >
                  🏆
                </motion.div>
                <h2 className="text-2xl font-black text-cyan-400 mb-2">全部找到！</h2>
                <p className="text-slate-400">用時 {formatTime(elapsedTime)}</p>
              </div>
            ) : (
              <div className="text-center text-slate-500">
                <Target size={48} className="mx-auto mb-2 opacity-30" />
                <p>沒有待尋寶藏</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div className="flex-1 bg-slate-900 border-t border-slate-800 overflow-hidden flex flex-col">
        {!isComplete && nearest ? (
          <>
            <div className="p-3 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-300">🎯 最近寶藏</h3>
              <span className="text-xs text-slate-500">剩餘 {unfoundCPs.length} 個</span>
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
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-cyan-400 font-mono">
                        {formatDistance(nearest.distance)}
                      </span>
                      <span className="text-sm text-slate-500">
                        向{getDirectionLabel(directionToNearest)}
                      </span>
                    </div>
                  </div>
                </div>

                {nearest.checkpoint.hint && nearest.distance > nearest.checkpoint.radius && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <p className="text-sm text-amber-400">💡 提示: {nearest.checkpoint.hint}</p>
                  </div>
                )}

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
                    {unfoundCPs.filter(cp => cp.id !== nearest.checkpoint.id).slice(0, 4).map((cp) => {
                      const dist = calculateDistance(currentLocation.lat, currentLocation.lng, cp.latitude, cp.longitude);
                      return (
                        <div key={cp.id} className="flex items-center gap-3 p-2.5 bg-slate-800/50 rounded-lg">
                          <span className="text-xl">{cp.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-300 truncate">{cp.label}</p>
                          </div>
                          <span className="text-sm text-cyan-400 font-mono shrink-0">{formatDistance(dist)}</span>
                        </div>
                      );
                    })}
                    {unfoundCPs.length > 5 && (
                      <p className="text-xs text-slate-600 text-center py-1">...還有 {unfoundCPs.length - 5} 個</p>
                    )}
                  </div>
                </div>
              )}

              {/* Finish button */}
              <button
                onClick={handleFinish}
                className="w-full mt-4 py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 hover:border-amber-500/60 text-amber-400 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Flag size={18} />
                🏁 結束並繳交成績（已找到 {localFound.length}/{map.checkpoints.length}）
              </button>
            </div>
          </>
        ) : isComplete ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-7xl mb-4"
            >
              🎉
            </motion.div>
            <h2 className="text-2xl font-black text-cyan-400 mb-2">恭喜完成！</h2>
            <p className="text-slate-400 mb-1">你已找到全部 {map.checkpoints.length} 個寶藏</p>
            <p className="text-slate-500 text-sm mb-6">用時 {formatTime(elapsedTime)}</p>
            <div className="w-full max-w-xs space-y-3">
              <GlowButton
                title="🏁 查看成績"
                onClick={handleFinish}
                variant="primary"
                size="lg"
                className="w-full"
                icon={<Trophy size={20} />}
              />
              <GlowButton
                title="回首頁"
                onClick={onBack}
                variant="ghost"
                size="md"
                className="w-full"
                icon={<NavIcon size={18} />}
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

      {/* Found checkpoint popup */}
      <TreasureFoundCard
        isOpen={foundPopup !== null}
        checkpoint={foundPopup}
        progress={{ current: localFound.length, total: map.checkpoints.length }}
        onClose={() => setFoundPopup(null)}
      />

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
              className="w-full max-w-lg mx-auto bg-slate-900 rounded-t-3xl border-t border-slate-700 p-6 safe-area-bottom"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-100">選項</h2>
                <button onClick={() => setShowMenu(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => { setShowMenu(false); onChangeView('achievements'); }}
                  className="w-full flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-left"
                >
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Trophy size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">成就</p>
                    <p className="text-sm text-slate-500">查看已解鎖的成就</p>
                  </div>
                </button>
                <button
                  onClick={() => { setShowMenu(false); onChangeView('leaderboard'); }}
                  className="w-full flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-left"
                >
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Trophy size={20} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">排行榜</p>
                    <p className="text-sm text-slate-500">查看成績排行</p>
                  </div>
                </button>
                <button
                  onClick={() => { setShowMenu(false); onChangeView('settings'); }}
                  className="w-full flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-left"
                >
                  <div className="p-2 bg-violet-500/20 rounded-lg">
                    <Clock size={20} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">設定</p>
                    <p className="text-sm text-slate-500">音效、震動、名字</p>
                  </div>
                </button>
                <button
                  onClick={() => { setShowMenu(false); onChangeView('help'); }}
                  className="w-full flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-left"
                >
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <HelpCircle size={20} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">使用說明</p>
                    <p className="text-sm text-slate-500">玩法教學、常見問題</p>
                  </div>
                </button>
                <button
                  onClick={handleClearProgress}
                  className="w-full flex items-center gap-3 p-4 bg-slate-800 hover:bg-red-500/20 rounded-xl transition-colors text-left"
                >
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <span className="text-red-400">↺</span>
                  </div>
                  <div>
                    <p className="font-semibold text-red-400">清除進度</p>
                    <p className="text-sm text-slate-500">重新開始尋寶（保留地圖）</p>
                  </div>
                </button>
                <button
                  onClick={handleImportNewMap}
                  className="w-full flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-left"
                >
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <span className="text-cyan-400">📥</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">導入新地圖</p>
                    <p className="text-sm text-slate-500">加載其他領袖的地圖</p>
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

// Bearing calculation (degrees from north, clockwise)
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const toDeg = (r: number) => r * 180 / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const CHECKPOINT_TYPES = [
  { type: 'text', label: '文字' },
  { type: 'image', label: '圖片' },
  { type: 'emoji', label: '表情' },
  { type: 'link', label: '連結' },
];
