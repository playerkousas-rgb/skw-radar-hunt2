import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Edit3, Share2, MapPin, Users, 
  ArrowLeft, ChevronRight
} from 'lucide-react';
import { GameMap } from '../lib/types';
import { generateId } from '../lib/utils';
import { loadMaps, saveMaps, deleteMap } from '../lib/storage';
import { loadUserStats, updateUserStats, saveActiveMap } from '../lib/storage';
import GlowButton from '../components/GlowButton';
import { playSound } from '../lib/utils';

interface Props {
  onBack: () => void;
  onEditMap: (map: GameMap) => void;
  onExportMap: (map: GameMap) => void;
  onViewLeaderboard: () => void;
}

export default function LeaderHomeScreen({ onBack, onEditMap, onExportMap, onViewLeaderboard }: Props) {
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [newMapDesc, setNewMapDesc] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [stats, setStats] = useState({ totalMapsCreated: 0, totalCheckpoints: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [loadedMaps, userStats] = await Promise.all([
      loadMaps(),
      loadUserStats(),
    ]);
    setMaps(loadedMaps);
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
    setShowCreate(false);
    playSound('success');
    
    // Auto open edit
    onEditMap(newMap);
  };

  const handleDeleteMap = async (mapId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('確定要刪除這張地圖嗎？')) return;
    
    await deleteMap(mapId);
    const updated = maps.filter(m => m.id !== mapId);
    setMaps(updated);
    playSound('click');
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
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
        <div className="w-10" />
      </div>

      <div className="p-4 pb-24 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <p className="text-2xl font-black text-cyan-400">{maps.length}</p>
            <p className="text-xs text-slate-500">地圖數量</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <p className="text-2xl font-black text-amber-400">{stats.totalCheckpoints}</p>
            <p className="text-xs text-slate-500">寶藏總數</p>
          </div>
        </div>

        {/* Create Button */}
        <GlowButton
          title={showCreate ? "取消" : "創建新地圖"}
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
              className="bg-slate-800/50 rounded-xl p-4 border border-cyan-500/30 space-y-3"
            >
              <input
                type="text"
                placeholder="地圖名稱 *"
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
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
              <GlowButton
                title="創建地圖"
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
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">我的地圖</h2>
          
          {maps.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <MapPin size={48} className="mx-auto mb-4 opacity-30" />
              <p>還沒有地圖</p>
              <p className="text-sm mt-1">創建第一張尋寶地圖吧！</p>
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
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-xl flex items-center justify-center text-2xl">
                        🗺️
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-100">{map.name}</h3>
                        <p className="text-xs text-slate-500">
                          {map.checkpoints.length} 個寶藏點 • {new Date(map.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteMap(map.id, e)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <button
                      onClick={() => onEditMap(map)}
                      className="flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
                    >
                      <Edit3 size={16} className="text-cyan-400" />
                      <span className="text-slate-300">編輯</span>
                    </button>
                    <button
                      onClick={() => onExportMap(map)}
                      className="flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
                    >
                      <Share2 size={16} className="text-emerald-400" />
                      <span className="text-slate-300">分享</span>
                    </button>
                    <button
                      onClick={() => {/* View stats */}}
                      className="flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
                    >
                      <Users size={16} className="text-violet-400" />
                      <span className="text-slate-300">統計</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
