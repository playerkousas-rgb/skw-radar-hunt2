import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Gift, FileText, Image as ImageIcon, Link as LinkIcon, Smile } from 'lucide-react';
import { Checkpoint } from '../lib/types';

interface Props {
  isOpen: boolean;
  checkpoint: Checkpoint | null;
  onClose: () => void;
}

export default function TreasureFoundCard({ isOpen, checkpoint, onClose }: Props) {
  if (!checkpoint) return null;

  const getTypeIcon = () => {
    switch (checkpoint.type) {
      case 'text': return <FileText size={24} className="text-cyan-400" />;
      case 'image': return <ImageIcon size={24} className="text-violet-400" />;
      case 'link': return <LinkIcon size={24} className="text-emerald-400" />;
      case 'emoji': return <Smile size={24} className="text-amber-400" />;
      default: return <Gift size={24} className="text-cyan-400" />;
    }
  };

  const getTypeLabel = () => {
    switch (checkpoint.type) {
      case 'text': return '文字寶藏';
      case 'image': return '圖片寶藏';
      case 'link': return '連結寶藏';
      case 'emoji': return '表情寶藏';
      default: return '寶藏';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, y: 100, rotateY: -30 }}
            animate={{ scale: 1, y: 0, rotateY: 0 }}
            exit={{ scale: 0.8, y: 50, opacity: 0 }}
            transition={{ 
              type: 'spring', 
              damping: 20, 
              stiffness: 300,
              delay: 0.1 
            }}
            className="relative w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Card Container */}
            <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-3xl border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/20 overflow-hidden">
              
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-500/10 pointer-events-none" />
              
              {/* Sparkles */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-4 right-4 w-20 h-20 bg-cyan-400/20 rounded-full blur-xl"
              />
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0.8, 0.3]
                }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                className="absolute bottom-4 left-4 w-16 h-16 bg-violet-400/20 rounded-full blur-xl"
              />

              {/* Header */}
              <div className="relative p-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-full border border-emerald-500/30"
                  >
                    <CheckCircle size={16} className="text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">發現寶藏！</span>
                  </motion.div>
                  <button 
                    onClick={onClose}
                    className="p-2 hover:bg-slate-700/50 rounded-full transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                {/* Emoji & Title */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center"
                >
                  <div className="text-6xl mb-3">{checkpoint.emoji}</div>
                  <h2 className="text-2xl font-black text-slate-100 mb-1">{checkpoint.label}</h2>
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    {getTypeIcon()}
                    <span>{getTypeLabel()}</span>
                    <span className="mx-1">•</span>
                    <span>第 {checkpoint.order + 1} 個寶藏</span>
                  </div>
                </motion.div>
              </div>

              {/* Content Area */}
              <motion.div 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="relative px-6 pb-6"
              >
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
                  
                  {/* Text Content */}
                  {checkpoint.type === 'text' && checkpoint.content && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">寶藏內容</h3>
                      <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{checkpoint.content}</p>
                    </div>
                  )}

                  {/* Image Content */}
                  {checkpoint.type === 'image' && checkpoint.imageUrl && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">寶藏圖片</h3>
                      <img 
                        src={checkpoint.imageUrl} 
                        alt="Treasure" 
                        className="w-full rounded-xl"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Link Content */}
                  {checkpoint.type === 'link' && checkpoint.content && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">寶藏連結</h3>
                      <a 
                        href={checkpoint.content} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        <LinkIcon size={18} />
                        <span className="truncate flex-1">{checkpoint.content}</span>
                      </a>
                    </div>
                  )}

                  {/* Emoji Content */}
                  {checkpoint.type === 'emoji' && (
                    <div className="text-center py-4">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">寶藏獎勵</h3>
                      <div className="text-8xl">{checkpoint.content || checkpoint.emoji}</div>
                    </div>
                  )}

                  {/* No Content */}
                  {!checkpoint.content && !checkpoint.imageUrl && checkpoint.type !== 'emoji' && (
                    <div className="text-center py-4 text-slate-500">
                      <Gift size={48} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">這個寶藏沒有額外內容</p>
                    </div>
                  )}
                </div>

                {/* Hint (if exists) */}
                {checkpoint.hint && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <span className="text-amber-400 text-lg">💡</span>
                    <div>
                      <p className="text-xs text-amber-400 font-semibold mb-0.5">提示</p>
                      <p className="text-sm text-amber-200/80">{checkpoint.hint}</p>
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-900 font-bold rounded-xl shadow-lg shadow-cyan-500/25"
                >
                  🎉 收下寶藏
                </motion.button>
              </motion.div>

              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-500" />
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-cyan-500 to-violet-500" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
