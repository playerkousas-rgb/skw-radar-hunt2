import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, X } from 'lucide-react';
import { playSound, vibrateDevice } from '../lib/utils';

interface Props {
  isVisible: boolean;
  distance: number;
  checkpointName: string;
  onDismiss: () => void;
}

export default function NearbyAlert({ isVisible, distance, checkpointName, onDismiss }: Props) {
  useEffect(() => {
    if (isVisible) {
      playSound('nearby');
      vibrateDevice([100, 50, 100]);
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-4 left-4 right-4 z-50"
        >
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-md border border-amber-500/40 rounded-2xl p-4 shadow-lg shadow-amber-500/10">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                >
                  <Radar size={24} className="text-amber-400" />
                </motion.div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-100">接近目標！</h3>
                <p className="text-sm text-amber-200/80 mt-1">
                  距離 <span className="font-bold">{checkpointName}</span> 只有 {Math.round(distance)}公尺
                </p>
              </div>
              <button 
                onClick={onDismiss}
                className="p-2 hover:bg-amber-500/10 rounded-lg transition-colors"
              >
                <X size={18} className="text-amber-400" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
