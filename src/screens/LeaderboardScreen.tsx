import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Clock, Navigation, Share2, Filter } from 'lucide-react';
import { LeaderboardEntry } from '../lib/types';
import { loadLeaderboard, loadActiveMap } from '../lib/storage';
import { formatTime, formatDistance, getRankBadge } from '../lib/utils';

interface Props {
  onBack: () => void;
}

export default function LeaderboardScreen({ onBack }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'current'>('all');
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    const activeMap = await loadActiveMap();
    setCurrentMapId(activeMap?.id || null);
    
    const allEntries = await loadLeaderboard(filter === 'current' ? activeMap?.id : undefined);
    setEntries(allEntries.slice(0, 50)); // Top 50
    setLoading(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Radar Hunt 排行榜',
        text: `我在 Radar Hunt 的排名是 ${entries.findIndex(e => e.playerName === '我') + 1 || 'N/A'}！來挑戰我吧！`,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100">🏆 排行榜</h1>
          <p className="text-xs text-slate-500">全球玩家排名</p>
        </div>
        <button onClick={handleShare} className="p-2 hover:bg-slate-800 rounded-lg">
          <Share2 size={22} className="text-cyan-400" />
        </button>
      </div>

      <div className="p-4 pb-24">
        {/* Filter */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-cyan-500 text-slate-900'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            全部地圖
          </button>
          <button
            onClick={() => setFilter('current')}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
              filter === 'current'
                ? 'bg-cyan-500 text-slate-900'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            當前地圖
          </button>
        </div>

        {/* Podium */}
        {entries.length >= 3 && (
          <div className="flex justify-center items-end gap-4 mb-8 py-4">
            {/* 2nd */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-3xl shadow-lg shadow-gray-400/20"
              >
                🥈
              </motion.div>
              <p className="mt-2 text-sm font-bold text-slate-300 truncate max-w-[80px]">{entries[1].playerName}</p>
              <p className="text-xs text-slate-500">{formatTime(entries[1].timeSpent)}</p>
              <div className="w-16 h-16 bg-slate-800 rounded-t-lg mt-2" />
            </div>
            
            {/* 1st */}
            <div className="flex flex-col items-center -mt-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center text-4xl shadow-lg shadow-yellow-400/30"
              >
                🥇
              </motion.div>
              <p className="mt-2 text-base font-black text-yellow-400 truncate max-w-[100px]">{entries[0].playerName}</p>
              <p className="text-xs text-slate-400">{formatTime(entries[0].timeSpent)}</p>
              <div className="w-20 h-20 bg-slate-800 rounded-t-lg mt-2" />
            </div>
            
            {/* 3rd */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-3xl shadow-lg shadow-amber-600/20"
              >
                🥉
              </motion.div>
              <p className="mt-2 text-sm font-bold text-slate-300 truncate max-w-[80px]">{entries[2].playerName}</p>
              <p className="text-xs text-slate-500">{formatTime(entries[2].timeSpent)}</p>
              <div className="w-16 h-10 bg-slate-800 rounded-t-lg mt-2" />
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
            排行榜</h2>
          
          {entries.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Trophy size={48} className="mx-auto mb-4 opacity-30" />
              <p>還沒有記錄</p>
              <p className="text-sm mt-1">完成地圖後將會顯示在此</p>
            </div>
          ) : (
            entries.map((entry, index) => {
              const rank = index + 1;
              const badge = getRankBadge(rank);
              const completionRate = (entry.checkpointsFound / entry.totalCheckpoints) * 100;
              
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    rank <= 3 
                      ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/30' 
                      : 'bg-slate-800/50 border-slate-700'
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${badge.color}`}>
                    {rank}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 truncate">{entry.playerName}</span>
                      <span className="text-xs text-slate-500">@{entry.mapName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {formatTime(entry.timeSpent)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Navigation size={12} /> {formatDistance(entry.distanceWalked || 0)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Score */}
                  <div className="text-right">
                    <p className="font-bold text-cyan-400">{Math.round(completionRate)}%</p>
                    <p className="text-xs text-slate-500">{entry.checkpointsFound}/{entry.totalCheckpoints}</p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
