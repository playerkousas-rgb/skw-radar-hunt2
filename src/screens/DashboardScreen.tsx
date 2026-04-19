import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Radar, Map, List, Trophy, History, Settings, 
  Navigation, Target, Zap, ChevronRight, Play 
} from 'lucide-react';
import { GameMap, ViewType, UserStats, UserAchievement, TreasureHistory } from '../lib/types';
import { loadUserStats, loadAchievements, loadTreasureHistory, loadActiveMap } from '../lib/storage';
import GPSStatus from '../components/GPSStatus';
import ProgressCard from '../components/ProgressCard';
import GlowButton from '../components/GlowButton';

interface Props {
  onChangeView: (view: ViewType) => void;
  onStartHunt: () => void;
  gpsPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  currentLocation?: { lat: number; lng: number; accuracy?: number };
  isTracking: boolean;
}

export default function DashboardScreen({ 
  onChangeView, 
  onStartHunt, 
  gpsPermission,
  currentLocation,
  isTracking 
}: Props) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [history, setHistory] = useState<TreasureHistory[]>([]);
  const [activeMap, setActiveMap] = useState<GameMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [userStats, userAchievements, treasureHistory, currentMap] = await Promise.all([
      loadUserStats(),
      loadAchievements(),
      loadTreasureHistory(),
      loadActiveMap(),
    ]);
    setStats(userStats);
    setAchievements(userAchievements.filter(a => a.unlockedAt).slice(0, 3));
    setHistory(treasureHistory.slice(0, 3));
    setActiveMap(currentMap);
    setLoading(false);
  };

  const menuItems = [
    { id: 'radar' as ViewType, label: '雷達探索', icon: Radar, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    { id: 'map' as ViewType, label: '地圖視圖', icon: Map, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    { id: 'list' as ViewType, label: '寶藏清單', icon: List, color: 'text-violet-400', bgColor: 'bg-violet-500/10' },
    { id: 'achievements' as ViewType, label: '成就徽章', icon: Trophy, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    { id: 'history' as ViewType, label: '探索歷史', icon: History, color: 'text-rose-400', bgColor: 'bg-rose-500/10' },
    { id: 'settings' as ViewType, label: '設定', icon: Settings, color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-100">
              <span className="text-cyan-400">RADAR</span> HUNT
            </h1>
            <p className="text-sm text-slate-500">城市尋寶雷達</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
          </div>
        </div>

        {/* GPS Status */}
        <GPSStatus 
          permissionStatus={gpsPermission}
          latitude={currentLocation?.lat}
          longitude={currentLocation?.lng}
          accuracy={currentLocation?.accuracy}
          isTracking={isTracking}
        />
      </div>

      <div className="px-4 pb-20 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 rounded-xl p-3 border border-slate-700"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Target size={14} className="text-cyan-400" />
              <span className="text-xs text-slate-500">已找到</span>
            </div>
            <p className="text-xl font-black text-slate-100">{stats?.totalCheckpointsFound || 0}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-slate-800/50 rounded-xl p-3 border border-slate-700"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Navigation size={14} className="text-emerald-400" />
              <span className="text-xs text-slate-500">距離</span>
            </div>
            <p className="text-xl font-black text-slate-100">
              {((stats?.totalDistanceWalked || 0) / 1000).toFixed(1)}<span className="text-sm text-slate-500">km</span>
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/50 rounded-xl p-3 border border-slate-700"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Zap size={14} className="text-amber-400" />
              <span className="text-xs text-slate-500">連勝</span>
            </div>
            <p className="text-xl font-black text-slate-100">{stats?.currentStreak || 0}</p>
          </motion.div>
        </div>

        {/* Active Map Progress */}
        {activeMap && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <ProgressCard 
              found={0} 
              total={activeMap.checkpoints.length}
              streak={stats?.currentStreak}
            />
          </motion.div>
        )}

        {/* Start Hunt Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlowButton
            title={activeMap ? "繼續尋寶" : "開始尋寶"}
            onClick={onStartHunt}
            variant="primary"
            size="lg"
            icon={<Play size={22} />}
            className="w-full shadow-lg shadow-cyan-500/20"
          />
        </motion.div>

        {/* Menu Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-2 gap-3"
        >
          {menuItems.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              onClick={() => onChangeView(item.id)}
              className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-all text-left group"
            >
              <div className={`p-2.5 rounded-lg ${item.bgColor} ${item.color}`}>
                <item.icon size={20} />
              </div>
              <span className="font-semibold text-slate-200 group-hover:text-slate-100">
                {item.label}
              </span>
              <ChevronRight size={16} className="ml-auto text-slate-600 group-hover:text-slate-400" />
            </motion.button>
          ))}
        </motion.div>

        {/* Recent Achievements */}
        {achievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-100">最新成就</h3>
              <button 
                onClick={() => onChangeView('achievements')}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                查看全部
              </button>
            </div>
            <div className="flex gap-3">
              {achievements.map((achievement) => (
                <div 
                  key={achievement.id}
                  className="flex flex-col items-center p-3 bg-slate-700/50 rounded-xl"
                >
                  <span className="text-2xl mb-1">{achievement.icon}</span>
                  <span className="text-xs font-medium text-slate-300 text-center">{achievement.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
