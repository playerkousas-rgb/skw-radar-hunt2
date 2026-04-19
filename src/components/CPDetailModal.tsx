import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Radio, Navigation, FileText, Lightbulb, Image as ImageIcon } from 'lucide-react';
import { Colors } from '../lib/colors';
import { Checkpoint } from '../lib/types';
import { formatDistance } from '../lib/utils';

interface Props {
  visible: boolean;
  checkpoint: Checkpoint | null;
  distance?: number;
  isFound?: boolean;
  onClose: () => void;
}

export default function CPDetailModal({ visible, checkpoint, distance, isFound = false, onClose }: Props) {
  if (!checkpoint) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-slate-900 rounded-t-3xl border-t border-x border-slate-700 overflow-hidden max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{checkpoint.emoji}</span>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">{checkpoint.label}</h2>
                  <p className="text-xs text-slate-500 font-mono">
                    {checkpoint.latitude.toFixed(5)}, {checkpoint.longitude.toFixed(5)}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 p-5 pb-0">
              {isFound && (
                <div className="flex items-center gap-1.5 bg-emerald-500/15 px-3 py-1.5 rounded-lg">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">已找到！</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-cyan-500/10 px-3 py-1.5 rounded-lg">
                <Radio size={14} className="text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400">{checkpoint.radius}m 半徑</span>
              </div>
              {distance !== undefined && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-lg">
                  <Navigation size={14} className="text-amber-400" />
                  <span className="text-xs font-bold text-amber-400">{formatDistance(distance)}</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto max-h-[50vh]">
              {/* Image */}
              {checkpoint.imageUrl && (
                <div className="mb-4 rounded-xl overflow-hidden border border-slate-700">
                  <img 
                    src={checkpoint.imageUrl} 
                    alt={checkpoint.label}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Text content */}
              {checkpoint.content && (
                <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={16} className="text-violet-400" />
                    <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">內容</span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                    {checkpoint.content}
                  </p>
                </div>
              )}

              {/* Hint */}
              {checkpoint.hint && (
                <div className="bg-amber-500/5 rounded-xl p-4 mb-4 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={16} className="text-amber-400" />
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">提示</span>
                  </div>
                  <p className="text-amber-200/80 text-sm italic leading-relaxed">
                    {checkpoint.hint}
                  </p>
                </div>
              )}

              {/* No content message */}
              {!checkpoint.content && !checkpoint.imageUrl && !checkpoint.hint && (
                <div className="flex flex-col items-center py-8 gap-2 text-slate-500">
                  <ImageIcon size={32} />
                  <p className="text-sm">此寶藏點沒有額外內容</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 pt-0">
              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-700 transition-colors"
              >
                關閉
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
