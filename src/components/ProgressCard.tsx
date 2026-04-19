import { motion } from 'framer-motion';
import { Target, Trophy, Zap } from 'lucide-react';

interface Props {
  found: number;
  total: number;
  streak?: number;
  bestTime?: number;
}

export default function ProgressCard({ found, total, streak = 0, bestTime }: Props) {
  const progress = total > 0 ? found / total : 0;
  const percentage = Math.round(progress * 100);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Target size={20} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100">探索進度</h3>
            <p className="text-xs text-slate-500">{found} / {total} 寶藏點</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-cyan-400">{percentage}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-1.5">
          <Zap size={14} className="text-amber-400" />
          <span className="text-xs text-slate-400">連勝: <span className="text-amber-400 font-bold">{streak}</span></span>
        </div>
        {bestTime !== undefined && (
          <div className="flex items-center gap-1.5">
            <Trophy size={14} className="text-violet-400" />
            <span className="text-xs text-slate-400">
              最佳: <span className="text-violet-400 font-bold">{Math.floor(bestTime / 60)}m{bestTime % 60}s</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
