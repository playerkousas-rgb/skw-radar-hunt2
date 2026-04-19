import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Clock, Trophy, Trash2 } from 'lucide-react';
import { TreasureHistory, ViewType } from '../lib/types';
import { loadTreasureHistory, loadUserStats, updateUserStats } from '../lib/storage';
import { formatTime } from '../lib/utils';

interface Props {
  onBack: () => void;
  onChangeView: (view: ViewType) => void;
}

export default function HistoryScreen({ onBack }: Props) {
  const [history, setHistory] = useState<TreasureHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistoryData();
  }, []);

  const loadHistoryData = async () => {
    const data = await loadTreasureHistory();
    setHistory(data);
    setLoading(false);
  };

  const handleClearHistory = async () => {
    if (confirm('確定要清除所有歷史紀錄嗎？')) {
      localStorage.removeItem('treasure_history');
      setHistory([]);
      const stats = await loadUserStats();
      await updateUserStats({ ...stats, totalMapsPlayed: 0 });
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
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100">探索歷史</h1>
          <p className="text-xs text-slate-500">{history.length} 次探索</p>
        </div>
        {history.length > 0 && (
          <button 
            onClick={handleClearHistory}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            <Trash2 size={20} className="text-red-400" />
          </button>
        )}
        {history.length === 0 && <div className="w-10" />}
      </div>

      <div className="p-4 pb-24">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Calendar size={64} className="mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">沒有探索紀錄</p>
            <p className="text-sm">完成你的第一次尋寶之旅吧！</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((record, index) => {
              const completionRate = (record.checkpointsFound / record.totalCheckpoints) * 100;
              const isPerfect = record.checkpointsFound === record.totalCheckpoints;
              
              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-xl border ${
                    isPerfect
                      ? 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/30'
                      : 'bg-slate-800/50 border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isPerfect ? 'bg-emerald-500/20' : 'bg-slate-700/50'}`}>
                        <MapPin size={20} className={isPerfect ? 'text-emerald-400' : 'text-slate-400'} />
                      </div>
                      <div>
                        <h3 className={`font-bold ${isPerfect ? 'text-emerald-100' : 'text-slate-200'}`}>
                          {record.mapName}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {new Date(record.completedAt).toLocaleDateString('zh-TW', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    {isPerfect && (
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Trophy size={18} className="text-emerald-400" />
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 pt-3 border-t border-slate-700/50">
                    <div className="flex items-center gap-1.5">
                      <Trophy size={14} className={isPerfect ? 'text-emerald-400' : 'text-amber-400'} />
                      <span className="text-sm text-slate-300">
                        {record.checkpointsFound}/{record.totalCheckpoints} 寶藏
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-cyan-400" />
                      <span className="text-sm text-slate-300">
                        {formatTime(record.timeSpent)}
                      </span>
                    </div>
                    <div className="ml-auto">
                      <span className={`text-sm font-bold ${isPerfect ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {Math.round(completionRate)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        isPerfect ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
