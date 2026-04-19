import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Colors } from '../lib/colors';
import { formatDistance } from '../lib/utils';

interface Props {
  distance: number;
  direction: number;
  emoji: string;
  size?: number;
  maxRange?: number;
}

export default function RadarView({ 
  distance, 
  direction, 
  emoji, 
  size = 260, 
  maxRange = 5000 
}: Props) {
  const sweepRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);

  const normalizedDist = Math.min(distance / maxRange, 0.9);
  const dotRadius = (size / 2 - 24) * normalizedDist;
  const rad = (direction - 90) * (Math.PI / 180);
  const dotX = Math.cos(rad) * dotRadius;
  const dotY = Math.sin(rad) * dotRadius;

  const ringCount = 4;
  const rings = Array.from({ length: ringCount }, (_, i) => i + 1);

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Background glow */}
      <div 
        className="absolute rounded-full"
        style={{
          width: size * 0.9,
          height: size * 0.9,
          background: `radial-gradient(circle, ${Colors.glow} 0%, transparent 70%)`,
        }}
      />

      {/* Concentric rings */}
      {rings.map((r) => {
        const ringSize = (size / ringCount) * r;
        const ringDist = (maxRange / ringCount) * r;
        return (
          <div key={r} className="absolute">
            <div
              className="absolute rounded-full border"
              style={{
                width: ringSize,
                height: ringSize,
                borderColor: Colors.radarRing,
                left: -ringSize / 2,
                top: -ringSize / 2,
              }}
            />
            <div 
              className="absolute text-[8px] font-mono opacity-50"
              style={{
                top: -size / 2 + ringSize / 2 - 6,
                left: 8,
                color: Colors.textMuted,
              }}
            >
              {formatDistance(ringDist)}
            </div>
          </div>
        );
      })}

      {/* Pulse effect */}
      <motion.div
        ref={pulseRef}
        className="absolute rounded-full border-2"
        style={{
          width: size,
          height: size,
          borderColor: Colors.primary,
        }}
        animate={{
          scale: [0.3, 1.2],
          opacity: [0.6, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />

      {/* Sweep line */}
      <motion.div
        ref={sweepRef}
        className="absolute"
        style={{
          width: size,
          height: size,
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <div
          className="absolute h-[1.5px] origin-left"
          style={{
            width: size / 2 - 10,
            left: '50%',
            top: '50%',
            background: `linear-gradient(90deg, ${Colors.radarGreen}, transparent)`,
            transform: 'translateY(-50%)',
          }}
        />
      </motion.div>

      {/* Crosshairs */}
      <div 
        className="absolute h-px bg-slate-600/50"
        style={{ width: size - 20, top: '50%', transform: 'translateY(-50%)' }}
      />
      <div 
        className="absolute w-px bg-slate-600/50"
        style={{ height: size - 20, left: '50%', transform: 'translateX(-50%)' }}
      />

      {/* Direction labels */}
      <span className="absolute text-[10px] font-bold text-slate-500/50" style={{ top: 4, left: '50%', transform: 'translateX(-50%)' }}>N</span>
      <span className="absolute text-[10px] font-bold text-slate-500/50" style={{ bottom: 4, left: '50%', transform: 'translateX(-50%)' }}>S</span>
      <span className="absolute text-[10px] font-bold text-slate-500/50" style={{ right: 4, top: '50%', transform: 'translateY(-50%)' }}>E</span>
      <span className="absolute text-[10px] font-bold text-slate-500/50" style={{ left: 4, top: '50%', transform: 'translateY(-50%)' }}>W</span>

      {/* Target dot */}
      <motion.div
        className="absolute flex items-center justify-center w-8 h-8 rounded-full border border-cyan-400/40"
        style={{
          left: `calc(50% + ${dotX}px - 16px)`,
          top: `calc(50% + ${dotY}px - 16px)`,
          backgroundColor: 'rgba(0, 240, 255, 0.15)',
        }}
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <span className="text-lg">{emoji}</span>
      </motion.div>

      {/* Center dot */}
      <div 
        className="absolute w-3 h-3 rounded-full"
        style={{
          backgroundColor: Colors.primary,
          boxShadow: `0 0 12px ${Colors.primary}`,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Inner pulse ring */}
      <motion.div
        className="absolute rounded-full border"
        style={{
          width: 60,
          height: 60,
          borderColor: Colors.primary,
          opacity: 0.3,
        }}
        animate={{
          scale: [1, 1.5],
          opacity: [0.3, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
    </div>
  );
}
