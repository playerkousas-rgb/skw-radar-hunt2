import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Users, Play, Copy, Check, Share2, QrCode,
  Clock, Trophy, Flag, StopCircle, Timer, MapPin
} from 'lucide-react';
import { GameSession, GameMap } from '../lib/types';
import { copyToClipboard, playSound, mapChecksum, formatTime } from '../lib/utils';
import { loadAllResults } from '../lib/storage';
import { PlayerResult } from '../lib/types';
import GlowButton from '../components/GlowButton';

interface Props {
  session: GameSession;
  map: GameMap;
  onBack: () => void;
  onStartGame: (delaySec?: number) => Promise<string | undefined>;
  onEndSession: () => void;
}

export default function LeaderSessionScreen({ session, map, onBack, onStartGame, onEndSession }: Props) {
  const [startUrl, setStartUrl] = useState('');
  const [copied, setCopied] = useState<'code' | 'url' | null>(null);
  const [delaySec, setDelaySec] = useState(10);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [verificationInput, setVerificationInput] = useState('');
  const [verifiedResults, setVerifiedResults] = useState<PlayerResult[]>([]);
  const [showQR, setShowQR] = useState(true);
  const [syncCode, setSyncCode] = useState<string>('');

  // Poll for new results (when members finish)
  useEffect(() => {
    const loadResults = async () => {
      const all = await loadAllResults();
      const relevant = all.filter(r => r.verificationCode.startsWith(session.code));
      setResults(relevant);
    };
    loadResults();
    const interval = setInterval(loadResults, 3000);
    return () => clearInterval(interval);
  }, [session.code]);

  // Countdown when starting
  useEffect(() => {
    if (session.status !== 'starting' || !session.startTime) {
      setCountdown(null);
      return;
    }
    const tick = () => {
      const remaining = session.startTime! - Date.now();
      if (remaining <= 0) {
        setCountdown(0);
      } else {
        setCountdown(Math.ceil(remaining / 1000));
        requestAnimationFrame(tick);
      }
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [session.status, session.startTime]);

  const joinUrl = useMemo(() => {
    // Encode map for join link (members can import directly)
    const importData = btoa(unescape(encodeURIComponent(JSON.stringify({
      t: 'rh', v: 2,
      id: map.id, n: map.name, d: map.description, c: map.creatorName, z: map.zoomRange || 5000,
      p: map.checkpoints.map(cp => ({
        i: cp.id, a: Math.round(cp.latitude * 100000) / 100000, o: Math.round(cp.longitude * 100000) / 100000,
        e: cp.emoji, l: cp.label, x: cp.content || '', u: cp.imageUrl || '',
        r: cp.radius, h: cp.hint || '', t: cp.type || 'text', w: cp.reward || '',
      })),
    }))));
    return `${window.location.origin}${window.location.pathname}?import=${encodeURIComponent(importData)}&join=${session.code}`;
  }, [map, session.code]);

  const qrUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(joinUrl)}`;
  }, [joinUrl]);

  const handleStart = async () => {
    const url = await onStartGame(delaySec);
    if (url) setStartUrl(url);
    playSound('success');
  };

  const handleCopy = async (text: string, type: 'code' | 'url') => {
    await copyToClipboard(text);
    setCopied(type);
    playSound('click');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleVerify = () => {
    const code = verificationInput.trim().toUpperCase();
    if (!code) return;
    const match = results.find(r => r.verificationCode === code);
    if (match) {
      if (!verifiedResults.find(v => v.verificationCode === code)) {
        setVerifiedResults([match, ...verifiedResults]);
        playSound('success');
      }
      setVerificationInput('');
    } else {
      playSound('alert');
    }
  };

  const allResults = [...verifiedResults];
  // Sort by completion, then time
  allResults.sort((a, b) => {
    if (a.checkpointsFound !== b.checkpointsFound) return b.checkpointsFound - a.checkpointsFound;
    return a.timeSpent - b.timeSpent;
  });

  const isRunning = session.status === 'running' || session.status === 'starting';
  const canStart = session.status === 'waiting';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm shrink-0 safe-area-top">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100 flex items-center gap-2">
            {isRunning ? '🚀 遊戲進行中' : '🎮 遊戲房間'}
          </h1>
          <p className="text-xs text-slate-500">{map.name}</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {/* Room Code */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-2xl p-5 border border-cyan-500/30 text-center"
        >
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">房間代碼</p>
          <div className="flex items-center justify-center gap-3">
            <p className="text-4xl font-black tracking-[0.3em] text-cyan-400 font-mono">
              {session.code}
            </p>
            <button
              onClick={() => handleCopy(session.code, 'code')}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg"
            >
              {copied === 'code' ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} className="text-slate-400" />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            將此代碼或下方 QR 碼分享給參加者
          </p>
        </motion.div>

        {/* Map Info */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-xl flex items-center justify-center text-2xl">
            🗺️
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-200">{map.name}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <MapPin size={12} /> {map.checkpoints.length} 個寶藏點
              <span>•</span>
              創建於 {new Date(session.createdAt).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* QR Code for quick join */}
        {canStart && showQR && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <QrCode size={16} className="text-cyan-400" />
                快速加入 QR 碼
              </h3>
              <button
                onClick={() => setShowQR(false)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                隱藏
              </button>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-white rounded-xl p-3">
                <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center">
                參加者掃描此 QR 碼即可自動匯入地圖並輸入房間代碼
              </p>
            </div>
          </div>
        )}

        {/* Share Link */}
        {canStart && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
              <Share2 size={16} className="text-emerald-400" />
              加入連結
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinUrl}
                readOnly
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono truncate"
              />
              <button
                onClick={() => handleCopy(joinUrl, 'url')}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors flex items-center gap-1"
              >
                {copied === 'url' ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Start Controls */}
        {canStart && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Play size={16} className="text-cyan-400" />
              開始遊戲
            </h3>
            <div>
              <label className="text-xs text-slate-500 mb-2 block">倒數秒數: <span className="text-cyan-400 font-bold">{delaySec} 秒</span></label>
              <div className="flex gap-2">
                {[3, 5, 10, 15, 30, 60].map(s => (
                  <button
                    key={s}
                    onClick={() => setDelaySec(s)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${delaySec === s ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>
            <GlowButton
              title="🚀 倒數開始！"
              onClick={handleStart}
              variant="primary"
              size="lg"
              className="w-full"
              icon={<Flag size={20} />}
            />
            <p className="text-xs text-slate-500 text-center">
              按下後會生成開始連結，分享給所有參加者點擊即可同步倒數
            </p>
          </div>
        )}

        {/* Start URL (after clicking start) */}
        <AnimatePresence>
          {isRunning && startUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-3"
            >
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <Timer size={16} />
                {countdown && countdown > 0 ? `倒數 ${countdown} 秒...` : '遊戲已開始！'}
              </h3>
              <p className="text-xs text-emerald-200/80">
                分享此連結給尚未開始的參加者，點擊後將自動同步倒數：
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={startUrl}
                  readOnly
                  className="flex-1 bg-slate-900/80 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs text-emerald-200 font-mono"
                />
                <button
                  onClick={() => copyToClipboard(startUrl)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg font-bold"
                >
                  <Copy size={16} />
                </button>
              </div>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: '開始尋寶！', url: startUrl }).catch(() => { });
                  }
                }}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 flex items-center justify-center gap-2"
              >
                <Share2 size={16} /> 使用系統分享
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results / Leaderboard */}
        {isRunning && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              成績榜 ({allResults.length} 人完成)
            </h3>

            {/* Verification code input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={verificationInput}
                onChange={e => setVerificationInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                placeholder="輸入參加者的完成驗證碼 (XXXXXX-XXXX)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-sm uppercase focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleVerify}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-bold text-sm"
              >
                驗證
              </button>
            </div>

            {allResults.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <Clock size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">等待參加者完成...</p>
                <p className="text-xs mt-1">參加者完成後會顯示驗證碼，輸入上方即可記錄成績</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allResults.map((r, idx) => (
                  <motion.div
                    key={r.verificationCode}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${idx === 0 ? 'bg-amber-500/10 border-amber-500/30' :
                      idx === 1 ? 'bg-slate-500/10 border-slate-400/30' :
                        idx === 2 ? 'bg-orange-700/10 border-orange-600/30' :
                          'bg-slate-800 border-slate-700'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg ${idx === 0 ? 'bg-amber-400 text-amber-900' :
                      idx === 1 ? 'bg-gray-300 text-gray-800' :
                        idx === 2 ? 'bg-amber-700 text-amber-100' :
                          'bg-slate-700 text-slate-400'
                      }`}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-200 truncate">{r.playerName}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{r.checkpointsFound}/{r.totalCheckpoints} 寶藏</span>
                        <span>•</span>
                        <span className="font-mono">{formatTime(r.timeSpent)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-mono">{r.verificationCode.split('-')[1]}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* End Session */}
        {isRunning && (
          <button
            onClick={() => {
              if (confirm('確定要結束這個遊戲房間？')) {
                onEndSession();
              }
            }}
            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 flex items-center justify-center gap-2 transition-colors"
          >
            <StopCircle size={18} /> 結束房間
          </button>
        )}
      </div>
    </div>
  );
}
