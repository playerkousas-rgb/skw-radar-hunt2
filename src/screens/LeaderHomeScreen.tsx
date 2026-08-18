import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit3, Share2, MapPin, Users,
  ArrowLeft, ChevronRight, Play, Trophy, Map, HelpCircle
} from 'lucide-react';
import { GameMap, DIFFICULTY_LABELS, DifficultyLevel, GAME_MODE_LABELS, GameModeType, TIMING_MODE_LABELS, TimingModeType } from '../lib/types';
import { generateId } from '../lib/utils';
import { loadMaps, saveMaps, deleteMap } from '../lib/storage';
import { loadUserStats, updateUserStats } from '../lib/storage';
import { loadSettings } from '../lib/storage';
import GlowButton from '../components/GlowButton';
import { playSound } from '../lib/utils';

interface Props {
  onBack: () => void;
  onEditMap: (map: GameMap) => void;
  onExportMap: (map: GameMap) => void;
  onStartSession: (map: GameMap) => void;
  onViewLeaderboard: () => void;
  onShowHelp?: () => void;
}

export default function LeaderHomeScreen({ onBack, onEditMap, onExportMap, onStartSession, onViewLeaderboard, onShowHelp }: Props) {
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [newMapDesc, setNewMapDesc] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [newMapDifficulty, setNewMapDifficulty] = useState<DifficultyLevel>('normal');
  const [newGameMode, setNewGameMode] = useState<GameModeType>('free');
  const [newTimingMode, setNewTimingMode] = useState<TimingModeType>('stopwatch');
  const [newTimeLimitMin, setNewTimeLimitMin] = useState(15);
  const [newShowLocation, setNewShowLocation] = useState(true);
  const [newNearbyHints, setNewNearbyHints] = useState(true);
  const [stats, setStats] = useState({ totalMapsCreated: 0, totalCheckpoints: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [loadedMaps, userStats, settings] = await Promise.all([
      loadMaps(),
      loadUserStats(),
      loadSettings(),
    ]);
    setMaps(loadedMaps);
    setCreatorName(settings.playerName || '領袖');
    const totalCPs = loadedMaps.reduce((sum: number, m: GameMap) => sum + m.checkpoints.length, 0);
    setStats({
      totalMapsCreated: userStats.totalMapsCreated || 0,
      totalCheckpoints: totalCPs,
    });
  };

  const createMap = async () => {
    if (!newMapName.trim()) return;

    const newMap: GameMap = {
      id: generateId(),
      name: newMapName.trim(),
      description: newMapDesc.trim(),
      checkpoints: [],
      createdAt: Date.now(),
      creatorName: creatorName.trim() || '無名領袖',
      centerLat: 25.033,
      centerLng: 121.565,
      zoomRange: 2000,
      difficulty: newMapDifficulty,
      gameMode: newGameMode,
      timingMode: newTimingMode,
      timeLimitSec: newTimingMode === 'countdown' ? newTimeLimitMin * 60 : undefined,
      showUserLocation: newShowLocation,
      nearbyHints: newNearbyHints,
    };

    const updated = [...maps, newMap];
    await saveMaps(updated);
    setMaps(updated);

    await updateUserStats({
      ...(await loadUserStats()),
      totalMapsCreated: stats.totalMapsCreated + 1,
    });

    setNewMapName('');
    setNewMapDesc('');
    setNewGameMode('free');
    setNewTimingMode('stopwatch');
    setNewShowLocation(true);
    setNewNearbyHints(true);
    setShowCreate(false);
    playSound('success');

    onEditMap(newMap);
  };

  const handleDeleteMap = async (mapId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('確定要刪除這張地圖嗎？此動作無法復原。')) return;
    await deleteMap(mapId);
    setMaps(maps.filter(m => m.id !== mapId));
    playSound('click');
  };

  return (
    <div className="min-h-screen bg-slate-950 safe-area-top">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100">👑 領袖中心</h1>
          <p className="text-xs text-slate-500">管理你的尋寶地圖</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onViewLeaderboard}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="排行榜"
          >
            <Trophy size={20} className="text-amber-400" />
          </button>
          {onShowHelp && (
            <button
              onClick={onShowHelp}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-cyan-400"
              aria-label="使用說明"
            >
              <HelpCircle size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 pb-24 space-y-4 max-w-lg mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <p className="text-2xl font-black text-cyan-400">{maps.length}</p>
            <p className="text-xs text-slate-500">地圖</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <p className="text-2xl font-black text-amber-400">{stats.totalCheckpoints}</p>
            <p className="text-xs text-slate-500">寶藏</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <p className="text-2xl font-black text-violet-400">{stats.totalMapsCreated}</p>
            <p className="text-xs text-slate-500">已創建</p>
          </div>
        </div>

        {/* Create Button */}
        <GlowButton
          title={showCreate ? '取消' : '➕ 創建新地圖'}
          onClick={() => setShowCreate(!showCreate)}
          variant="primary"
          size="lg"
          className="w-full"
          icon={showCreate ? undefined : <Plus size={20} />}
        />

        {/* Create Form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-slate-800/50 rounded-xl p-4 border border-cyan-500/30 space-y-3 overflow-hidden"
            >
              <input
                type="text"
                placeholder="地圖名稱 * (例如: 校園尋寶)"
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
              <input
                type="text"
                placeholder="地圖描述（選填）"
                value={newMapDesc}
                onChange={(e) => setNewMapDesc(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="text"
                placeholder="你的名字（選填）"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              {/* 玩法 */}
              <div>
                <label className="text-xs text-slate-500 mb-2 block">玩法模式</label>
                <div className="space-y-2">
                  {(Object.keys(GAME_MODE_LABELS) as GameModeType[]).map(mode => {
                    const m = GAME_MODE_LABELS[mode];
                    const active = newGameMode === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => setNewGameMode(mode)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                          active ? 'bg-cyan-500/20 border-cyan-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-2xl shrink-0">{m.icon}</span>
                        <div className="min-w-0">
                          <div className={`font-bold text-sm ${active ? 'text-cyan-300' : 'text-slate-200'}`}>{m.label}</div>
                          <div className="text-[11px] text-slate-500 leading-snug">{m.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 計時 */}
              <div>
                <label className="text-xs text-slate-500 mb-2 block">計時方式</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(TIMING_MODE_LABELS) as TimingModeType[]).map(tmode => {
                    const t = TIMING_MODE_LABELS[tmode];
                    const active = newTimingMode === tmode;
                    return (
                      <button
                        key={tmode}
                        onClick={() => setNewTimingMode(tmode)}
                        className={`py-2.5 px-1 rounded-lg text-center transition-all ${
                          active ? 'bg-violet-500 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        <div className="text-lg">{t.icon}</div>
                        <div className="text-[10px] mt-0.5">{t.label}</div>
                      </button>
                    );
                  })}
                </div>
                {newTimingMode === 'countdown' && (
                  <div className="mt-2">
                    <label className="text-[11px] text-slate-500 mb-1.5 block">
                      限時：<span className="text-violet-300 font-bold">{newTimeLimitMin} 分鐘</span>（時間到自動結算）
                    </label>
                    <div className="grid grid-cols-6 gap-1.5">
                      {[5, 10, 15, 20, 30, 45, 60].filter((v, i, a) => a.length <= 6 || i < 6).map(min => (
                        <button
                          key={min}
                          onClick={() => setNewTimeLimitMin(min)}
                          className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                            newTimeLimitMin === min ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {min}m
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 顯示與提示 */}
              <div className="space-y-2">
                <label className="text-xs text-slate-500 block">顯示與提示</label>

                <div className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-xl">
                  <span className="text-xl shrink-0">📍</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-200">顯示自身位置</div>
                    <div className="text-[11px] text-slate-500 leading-snug">關閉後地圖不顯示你的位置點（考驗方向感，GPS 仍會記錄）</div>
                  </div>
                  <button
                    onClick={() => setNewShowLocation(!newShowLocation)}
                    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${newShowLocation ? 'bg-cyan-500' : 'bg-slate-700'}`}
                    aria-label="顯示自身位置"
                  >
                    <motion.div
                      className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
                      animate={{ left: newShowLocation ? 'calc(100% - 1.5rem)' : '0.25rem' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-xl">
                  <span className="text-xl shrink-0">🔔</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-200">提示目標在附近</div>
                    <div className="text-[11px] text-slate-500 leading-snug">關閉後接近寶藏時不再有提示音、「在範圍內」通知</div>
                  </div>
                  <button
                    onClick={() => setNewNearbyHints(!newNearbyHints)}
                    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${newNearbyHints ? 'bg-cyan-500' : 'bg-slate-700'}`}
                    aria-label="提示目標在附近"
                  >
                    <motion.div
                      className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
                      animate={{ left: newNearbyHints ? 'calc(100% - 1.5rem)' : '0.25rem' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-2 block">路線難度</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(DIFFICULTY_LABELS) as DifficultyLevel[]).map(lvl => {
                    const d = DIFFICULTY_LABELS[lvl];
                    const active = newMapDifficulty === lvl;
                    return (
                      <button
                        key={lvl}
                        onClick={() => setNewMapDifficulty(lvl)}
                        className={`py-2 rounded-lg text-center transition-all ${
                          active ? 'bg-cyan-500 text-slate-900 font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        <div className="text-lg">{d.emoji}</div>
                        <div className="text-[10px]">{d.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <GlowButton
                title="創建並開始編輯"
                onClick={createMap}
                variant="primary"
                size="md"
                className="w-full"
                disabled={!newMapName.trim()}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map List */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">我的地圖</h2>

          {maps.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-700/50">
              <MapPin size={48} className="mx-auto mb-4 opacity-30" />
              <p className="mb-1">還沒有地圖</p>
              <p className="text-sm">點擊上方按鈕創建第一張尋寶地圖吧！</p>
            </div>
          ) : (
            maps.map((map, index) => (
              <motion.div
                key={map.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-xl flex items-center justify-center text-2xl shrink-0">
                        🗺️
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-100 truncate flex items-center gap-1.5">
                          {map.difficulty && <span>{DIFFICULTY_LABELS[map.difficulty].emoji}</span>}
                          {map.name}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">
                          {map.difficulty ? DIFFICULTY_LABELS[map.difficulty].label + ' • ' : ''}
                          {map.checkpoints.length} 個寶藏點 • {new Date(map.createdAt).toLocaleDateString()}
                        </p>
                        {map.description && (
                          <p className="text-xs text-slate-600 truncate mt-0.5">{map.description}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteMap(map.id, e)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>

                  {/* Quick action: Start session */}
                  {map.checkpoints.length > 0 && (
                    <button
                      onClick={() => onStartSession(map)}
                      className="w-full mb-2 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 rounded-lg text-slate-900 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-emerald-500/20"
                    >
                      <Play size={16} fill="currentColor" />
                      🚀 開房間！開始多人遊戲
                    </button>
                  )}

                  {/* Other actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onEditMap(map)}
                      className="flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm text-slate-300"
                    >
                      <Edit3 size={14} className="text-cyan-400" />
                      編輯
                    </button>
                    <button
                      onClick={() => onExportMap(map)}
                      className="flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm text-slate-300"
                    >
                      <Share2 size={14} className="text-emerald-400" />
                      分享
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Tips */}
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
          <h3 className="font-bold text-cyan-400 text-sm mb-2">💡 快速上手</h3>
          <ol className="text-xs text-cyan-200/70 space-y-1 list-decimal list-inside">
            <li>創建地圖，點擊地圖放置寶藏點</li>
            <li>設定每個寶藏的觸發半徑（越小越精準）</li>
            <li>點「開房間」產生房間代碼和 QR 碼</li>
            <li>分享給成員，倒數後同步出發！</li>
            <li>成員完成後出示驗證碼，你輸入即可記錄成績</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
