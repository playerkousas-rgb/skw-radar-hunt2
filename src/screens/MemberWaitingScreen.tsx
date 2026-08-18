import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Users, Clock, MapPin, Signal, Radio, Play,
  CheckCircle2, KeyRound, QrCode, RefreshCw
} from 'lucide-react';
import { GameSession, GameMap } from '../lib/types';
import { getGPSQuality, mapChecksum, playSound, vibrateDevice } from '../lib/utils';
import GlowButton from '../components/GlowButton';

interface Props {
  session: GameSession;
  map: GameMap;
  playerName: string;
  currentLocation: { lat: number; lng: number; accuracy?: number };
  gpsAccuracy?: number;
  onBack: () => void;
  onStartNow: () => void;
}

export default function MemberWaitingScreen({
  session, map, playerName, currentLocation, gpsAccuracy, onBack, onStartNow
}: Props) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timeUntilStart, setTimeUntilStart] = useState<number | null>(null);
  const [showStartInput, setShowStartInput] = useState(false);
  const [startCode, setStartCode] = useState('');
  const [startError, setStartError] = useState('');
  const tickRef = useRef<number>(0);

  const gpsQuality = getGPSQuality(gpsAccuracy);

  useEffect(() => {
    const updateCountdown = () => {
      if (session.startTime && session.status === 'starting') {
        const remaining = Math.max(0, Math.ceil((session.startTime - Date.now()) / 1000));
        setTimeUntilStart(remaining);
      } else {
        setTimeUntilStart(null);
      }
      tickRef.current = requestAnimationFrame(updateCountdown);
    };
    tickRef.current = requestAnimationFrame(updateCountdown);
    return () => cancelAnimationFrame(tickRef.current);
  }, [session.startTime, session.status]);

  const isStarting = session.status === 'starting' && timeUntilStart !== null;
  const isRunning = session.status === 'running';

  // Auto-start when countdown hits 0
  useEffect(() => {
    if (timeUntilStart === 0) {
      playSound('success');
      vibrateDevice([200, 100, 200]);
      setTimeout(() => onStartNow(), 500);
    }
  }, [timeUntilStart, onStartNow]);

  // Listen for URL changes (if leader shares a start link, user clicks it)
  useEffect(() => {
    const checkURL = () => {
      const params = new URLSearchParams(window.location.search);
      const start = params.get('start');
      if (start) {
        try {
          const signal = JSON.parse(decodeURIComponent(atob(start)));
          if (signal.mapChecksum === mapChecksum(map) && signal.code === session.code) {
            if (signal.startTime > Date.now()) {
              // Trigger countdown
              window.history.replaceState({}, '', window.location.pathname);
              playSound('success');
              onStartNow(); // will be replaced by proper start
            }
          }
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('popstate', checkURL);
    const interval = setInterval(checkURL, 1000);
    return () => {
      window.removeEventListener('popstate', checkURL);
      clearInterval(interval);
    };
  }, [map, session.code, onStartNow]);

  const handleStartCodeSubmit = () => {
    setStartError('');
    const code = startCode.trim().toUpperCase();
    if (code.length < 6) {
      setStartError('請輸入至少 6 位開始代碼');
      return;
    }
    // Parse as timestamp? Or use a simple approach: treat code as seconds-to-start if numeric, or accept the startTime as ISO-like
    // Simpler: the leader shows a code of form "START-EPOCHMS" - decode it
    if (code.startsWith('START')) {
      const parts = code.split('-');
      if (parts.length >= 2) {
        const ts = parseInt(parts[1]);
        if (!isNaN(ts) && ts > Date.now() - 5000) {
          playSound('success');
          setStartCode('');
          setShowStartInput(false);
          onStartNow();
          return;
        }
      }
    }
    // Fallback: if numeric code is epoch seconds
    const ts = parseInt(code);
    if (!isNaN(ts) && ts > Date.now() / 1000 - 60) {
      playSound('success');
      setStartCode('');
      setShowStartInput(false);
      onStartNow();
      return;
    }
    setStartError('無效的開始代碼，請向領袖確認');
    playSound('alert');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col safe-area-top">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100">
            {isStarting || isRunning ? '🚀 準備出發！' : '⏳ 等待開始'}
          </h1>
          <p className="text-xs text-slate-500">房間 {session.code}</p>
        </div>
        <button
          onClick={() => setShowStartInput(true)}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
          title="輸入開始代碼"
        >
          <KeyRound size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center space-y-6">
        {/* Big countdown / waiting */}
        {isStarting && timeUntilStart !== null && timeUntilStart > 0 ? (
          <motion.div
            key={timeUntilStart}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <motion.div
              animate={timeUntilStart <= 3 ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.5, repeat: timeUntilStart <= 3 ? Infinity : 0 }}
              className="relative w-56 h-56 mx-auto mb-6 flex items-center justify-center"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border-2 border-cyan-400/50"
              />
              <div className={`relative w-48 h-48 rounded-full flex items-center justify-center shadow-2xl ${
                timeUntilStart <= 3
                  ? 'bg-gradient-to-br from-red-500 to-orange-500 shadow-red-500/40'
                  : 'bg-gradient-to-br from-cyan-500 to-violet-500 shadow-cyan-500/40'
              }`}>
                <span className="text-8xl font-black text-white">{timeUntilStart}</span>
              </div>
            </motion.div>
            <p className="text-2xl font-bold text-cyan-400">即將開始！</p>
            <p className="text-slate-500 mt-2 text-sm">請保持手機穩定，準備移動</p>
          </motion.div>
        ) : isRunning ? (
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-32 h-32 mx-auto mb-6 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 flex items-center justify-center"
            >
              <span className="text-5xl">🏃</span>
            </motion.div>
            <p className="text-2xl font-bold text-emerald-400">遊戲已開始！</p>
            <GlowButton
              title="開始尋寶"
              onClick={onStartNow}
              variant="primary"
              size="lg"
              className="mt-6"
              icon={<Play size={20} />}
            />
          </div>
        ) : (
          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border-2 border-cyan-500/40 flex items-center justify-center"
            >
              <Radio size={48} className="text-cyan-400" />
            </motion.div>
            <p className="text-2xl font-bold text-slate-200 mb-2">等待領袖開始</p>
            <p className="text-slate-500 text-sm mb-2">請確保 GPS 已開啟並站在起點附近</p>
            <p className="text-xs text-slate-600">
              領袖按下開始後會倒數，或你可以點右上角🔑輸入開始代碼
            </p>
          </div>
        )}

        {/* Status cards */}
        <div className="w-full max-w-sm space-y-3">
          {/* Player Info */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-xl flex items-center justify-center text-xl font-bold text-white">
              {playerName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-200">{playerName}</p>
              <p className="text-xs text-slate-500">你已就緒</p>
            </div>
            <CheckCircle2 size={24} className="text-emerald-400" />
          </div>

          {/* Map Info */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center">
              <MapPin size={22} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-200 truncate">{map.name}</p>
              <p className="text-xs text-slate-500">{map.checkpoints.length} 個寶藏點</p>
            </div>
          </div>

          {/* GPS Status */}
          <div className={`rounded-xl p-4 border flex items-center gap-3 ${
            gpsQuality.level === 'excellent' || gpsQuality.level === 'good'
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : gpsQuality.level === 'fair'
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              gpsQuality.level === 'excellent' || gpsQuality.level === 'good' ? 'bg-emerald-500/20' :
              gpsQuality.level === 'fair' ? 'bg-amber-500/20' : 'bg-red-500/20'
            }`}>
              <Signal size={22} className={gpsQuality.color} />
            </div>
            <div className="flex-1">
              <p className={`font-bold ${gpsQuality.color}`}>GPS: {gpsQuality.label}</p>
              <p className="text-xs text-slate-500">
                精度: ±{Math.round(gpsAccuracy || 999)}m
                {gpsAccuracy && gpsAccuracy > 20 && ' • 請走到空曠處'}
              </p>
            </div>
          </div>

          {/* Room Info */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex items-center gap-3">
            <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <Users size={22} className="text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-200">房間 {session.code}</p>
              <p className="text-xs text-slate-500">創建者: {session.creatorName}</p>
            </div>
          </div>
        </div>

        {/* Refresh hint */}
        {!isStarting && !isRunning && (
          <p className="text-xs text-slate-600 flex items-center gap-1">
            <RefreshCw size={12} /> 如果已收到開始連結，點擊連結或重新整理頁面
          </p>
        )}
      </div>

      {/* Start Code Input Modal */}
      <AnimatePresence>
        {showStartInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end"
            onClick={() => setShowStartInput(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-md mx-auto bg-slate-900 rounded-t-3xl border-t border-slate-700 p-6 safe-area-bottom"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <QrCode size={20} className="text-cyan-400" />
                  輸入開始代碼
                </h2>
                <button onClick={() => setShowStartInput(false)} className="text-slate-400 text-2xl">&times;</button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                向領索取開始代碼，或掃描開始 QR 碼
              </p>
              <input
                type="text"
                value={startCode}
                onChange={e => setStartCode(e.target.value.toUpperCase())}
                placeholder="輸入代碼"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-center text-xl font-mono text-cyan-400 placeholder-slate-600 focus:outline-none focus:border-cyan-500 tracking-widest uppercase"
                autoFocus
              />
              {startError && (
                <p className="text-red-400 text-sm mt-2">{startError}</p>
              )}
              <GlowButton
                title="同步開始"
                onClick={handleStartCodeSubmit}
                variant="primary"
                size="lg"
                className="w-full mt-4"
                icon={<Play size={20} />}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
