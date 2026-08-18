import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Lock } from 'lucide-react';
import { GameMap, Checkpoint } from '../lib/types';
import { loadFoundLog } from '../lib/storage';
import { formatTime } from '../lib/utils';

interface FoundEntry {
  cp: Checkpoint;
  foundAt: number;
}

interface Props {
  map: GameMap;
  startTime: number;
  onBack: () => void;
}

export default function TreasureLogScreen({ map, startTime, onBack }: Props) {
  const [found, setFound] = useState<FoundEntry[]>([]);
  const [unfound, setUnfound] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const log = await loadFoundLog(map.id);
      // Build entries preserving order found
      const entries: FoundEntry[] = [];
      const foundIds = new Set<string>();
      for (const entry of log) {
        const cp = map.checkpoints.find(c => c.id === entry.id);
        if (cp && !foundIds.has(cp.id)) {
          entries.push({ cp, foundAt: entry.time });
          foundIds.add(cp.id);
        }
      }
      setFound(entries);
      setUnfound(map.checkpoints.filter(c => !foundIds.has(c.id)));
      setLoading(false);
    };
    load();
  }, [map]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col safe-area-top">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100 flex items-center gap-2">
            <BookOpen size={18} className="text-violet-400" />
            💎 我的收藏
          </h1>
          <p className="text-xs text-slate-500">
            已找到 {found.length}/{map.checkpoints.length} 個寶藏
          </p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full pb-20">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-400" />
          </div>
        ) : found.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <BookOpen size={64} className="mx-auto mb-4 opacity-20" />
            <p className="mb-1">還沒有找到任何寶藏</p>
            <p className="text-sm">開始尋寶後，這裡會記錄每個寶藏的內容</p>
          </div>
        ) : (
          <>
            {/* Completion summary */}
            <div className="bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-2xl p-5 border border-violet-500/30">
              <p className="text-xs text-slate-400 mb-1">完成度</p>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-black text-violet-300">{found.length}</span>
                <span className="text-xl text-slate-500">/ {map.checkpoints.length}</span>
                <span className="ml-auto text-lg font-bold text-cyan-400">
                  {Math.round(found.length / map.checkpoints.length * 100)}%
                </span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${found.length / map.checkpoints.length * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full"
                />
              </div>
            </div>

            {/* Collected story */}
            {found.length > 0 && (
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  📜 收集到的內容（依找到次序）
                </h3>
                <div className="space-y-2">
                  {found.map((entry, idx) => (
                    <motion.div
                      key={entry.cp.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-400 font-bold text-sm shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{entry.cp.emoji}</span>
                          <span className="text-sm font-semibold text-slate-200">{entry.cp.label}</span>
                          <span className="text-xs text-slate-600 font-mono ml-auto">
                            {formatTime(Math.floor((entry.foundAt - startTime) / 1000))}
                          </span>
                        </div>
                        {entry.cp.content ? (
                          <p className="text-slate-100 text-base leading-relaxed break-words">
                            {entry.cp.content}
                          </p>
                        ) : entry.cp.imageUrl ? (
                          <img
                            src={entry.cp.imageUrl}
                            alt={entry.cp.label}
                            className="rounded-lg max-h-40 w-full object-cover mt-1"
                          />
                        ) : (
                          <p className="text-slate-500 text-sm italic">（沒有內容）</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Story concatenation - great for "form a sentence" games */}
                {found.some(e => e.cp.content && e.cp.type === 'text') && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-xs font-bold text-amber-400 mb-2">✨ 拼出句子：</p>
                    <p className="text-slate-200 text-lg leading-relaxed italic">
                      「{found.filter(e => e.cp.content && e.cp.type === 'text').map(e => e.cp.content).join(' ')}」
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Not-yet-found */}
            {unfound.length > 0 && (
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  🔒 還沒找到（{unfound.length} 個）
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {unfound.map(cp => (
                    <div
                      key={cp.id}
                      className="aspect-square bg-slate-900/50 rounded-lg flex items-center justify-center border border-slate-700/50 relative opacity-50"
                    >
                      <span className="text-2xl blur-[2px] grayscale">{cp.emoji}</span>
                      <Lock size={12} className="absolute top-1 right-1 text-slate-600" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
