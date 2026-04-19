import { motion } from 'framer-motion';
import { MapPin, CheckCircle2, Lock, Navigation } from 'lucide-react';
import { Colors } from '../lib/colors';
import { Checkpoint } from '../lib/types';
import { formatDistance } from '../lib/utils';

interface Props {
  checkpoint: Checkpoint & { distance?: number };
  index?: number;
  showDistance?: boolean;
  isFound?: boolean;
  onPress?: () => void;
}

export default function CheckpointCard({ 
  checkpoint, 
  index = 0, 
  showDistance = false, 
  isFound = false, 
  onPress 
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onPress}
      className={`
        relative flex items-center gap-3 p-4 rounded-xl border cursor-pointer
        transition-all duration-200
        ${isFound 
          ? 'bg-emerald-950/30 border-emerald-500/30' 
          : 'bg-slate-800/50 border-slate-700 hover:border-cyan-500/30 hover:bg-slate-800'
        }
      `}
    >
      {/* Order badge */}
      <div className={`
        flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold font-mono
        ${isFound 
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
        }
      `}>
        {checkpoint.order}
      </div>

      {/* Emoji */}
      <div className={`
        flex items-center justify-center w-12 h-12 rounded-xl text-2xl
        ${isFound 
          ? 'bg-emerald-500/10' 
          : 'bg-amber-500/10'
        }
      `}>
        {checkpoint.emoji}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`font-bold truncate ${isFound ? 'text-emerald-100' : 'text-slate-100'}`}>
            {checkpoint.label}
          </h3>
          {isFound && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
        </div>
        
        {showDistance && checkpoint.distance !== undefined && (
          <div className="flex items-center gap-2 mt-1">
            <Navigation size={12} className={isFound ? 'text-emerald-400' : 'text-amber-400'} />
            <span className={`text-sm font-mono ${isFound ? 'text-emerald-400' : 'text-amber-400'}`}>
              {formatDistance(checkpoint.distance)}
            </span>
            <span className="text-xs text-slate-500">| {checkpoint.radius}m 半徑</span>
          </div>
        )}
        
        {!showDistance && (
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={12} className="text-slate-500" />
            <span className="text-xs text-slate-500 truncate">
              {checkpoint.latitude.toFixed(5)}, {checkpoint.longitude.toFixed(5)}
            </span>
          </div>
        )}

        {checkpoint.hint && !isFound && (
          <div className="flex items-center gap-1 mt-1">
            <Lock size={10} className="text-amber-400" />
            <span className="text-xs text-amber-400/80 italic">提示: {checkpoint.hint}</span>
          </div>
        )}
      </div>

      {/* Arrow */}
      <div className="text-slate-600">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </motion.div>
  );
}
