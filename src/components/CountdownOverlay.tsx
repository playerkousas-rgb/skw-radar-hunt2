import { motion } from 'framer-motion';

interface Props {
  count: number;
}

export default function CountdownOverlay({ count }: Props) {
  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/95 flex items-center justify-center backdrop-blur-md">
      <motion.div
        key={count}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 2, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="w-48 h-48 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-2xl shadow-cyan-500/50 mx-auto mb-8"
        >
          <span className="text-8xl font-black text-white">
            {count === 0 ? 'GO!' : count}
          </span>
        </motion.div>
        <p className="text-xl font-bold text-cyan-400 tracking-widest">
          {count === 0 ? '出發！' : '準備開始'}
        </p>
        <p className="text-slate-500 text-sm mt-2">請保持手機穩定</p>
      </motion.div>
    </div>
  );
}
