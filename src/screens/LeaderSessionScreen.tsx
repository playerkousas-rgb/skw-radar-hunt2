import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, Copy, Check, Share2, QrCode,
  Clock, Trophy, Flag, StopCircle, Timer, MapPin, AlertCircle
} from 'lucide-react';
import { GameSession, GameMap } from '../lib/types';
import {
  copyToClipboard, playSound, formatTime,
  formatDistance, decodeResult, generateId,
} from '../lib/utils';
import { loadAllResults, addPlayerResult, addLeaderboardEntry } from '../lib/storage';
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
  const [copied, setCopied] = useState<'code' | 'url' | 'startcode' | null>(null);
  const [delaySec, setDelaySec] = useState(10);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [verificationInput, setVerificationInput] = useState('');
  const [verifiedResults, setVerifiedResults] = useState<PlayerResult[]>([]);
  const [verifyError, setVerifyError] = useState('');
  const [showQR, setShowQR] = useState(true);
  const [showStartQR, setShowStartQR] = useState(false);
  // Personal auto-start mode (fairest timing): members' own countdown starts
  // when they open the link; their timer runs from their own departure
  const [autoMode, setAutoMode] = useState(false);
  const [autoDelay, setAutoDelay] = useState(30);

  // Poll for new results (when members finish)
  useEffect(() => {
    const loadResults = async () => {
      const all = await loadAllResults();
      const relevant = all.filter(r => r.verificationCode.startsWith(session.code));
      setResults(relevant);
    };
    const t = setTimeout(loadResults, 0);
    const interval = setInterval(loadResults, 3000);
    return () => { clearTimeout(t); clearInterval(interval); };
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
    return `${window.location.origin}${window.location.pathname}?import=${encodeURIComponent(importData)}&join=${session.code}${autoMode ? `&auto=${autoDelay}` : ''}`;
  }, [map, session.code, autoMode, autoDelay]);

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

  const handleVerify = async () => {
    const raw = verificationInput.trim();
    const code = raw.toUpperCase();
    if (!raw) return;
    setVerifyError('');

    // 1) Match a short verification code against results saved on this device
    let match = results.find(r => r.verificationCode === code);

    // 2) Otherwise, try to decode a FULL result code (member can hand it over
    //    from another device — it carries the player's name/time/score inside)
    if (!match) {
      const decoded = decodeResult(raw);
      if (decoded && decoded.verificationCode.startsWith(session.code)) {
        match = decoded;
      }
    }

    if (match) {
      const alreadyVerified = verifiedResults.some(v => v.verificationCode === match!.verificationCode);
      if (!alreadyVerified) {
        // Persist locally + add to the leaderboard so it survives reloads
        if (!results.some(r => r.verificationCode === match!.verificationCode)) {
          await addPlayerResult(match);
          setResults(prev => [match!, ...prev]);
        }
        await addLeaderboardEntry({
          id: generateId(),
          playerName: match.playerName,
          mapId: map.id,
          mapName: match.mapName || map.name,
          checkpointsFound: match.checkpointsFound,
          totalCheckpoints: match.totalCheckpoints,
          timeSpent: match.timeSpent,
          completedAt: match.finishTime || Date.now(),
          distanceWalked: match.distanceWalked,
        });
        setVerifiedResults(prev => [match!, ...prev]);
        playSound('success');
      }
      setVerificationInput('');
    } else {
      setVerifyError('找不到此驗證碼，請確認代碼與房間是否相符');
      playSound('alert');
    }
  };

  // Manual start code members can type on the waiting screen (START-<epoch ms>)
  const manualStartCode = session.startTime ? `START-${session.startTime}` : '';

  const allResults = [...verifiedResults];
  // Sort by score (capture-points; falls back to found-count), then time
  allResults.sort((a, b) => {
    const scoreA = a.score ?? a.checkpointsFound;
    const scoreB = b.score ?? b.checkpointsFound;
    if (scoreB !== scoreA) return scoreB - scoreA;
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

        {/* ⏱️ Personal auto-start mode (fairest) */}
        {canStart && (
          <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <h3 className="text-sm font-bold text-emerald-300">
                  ⏱️ 個人計時模式
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  成員掃 QR／開連結後 <span className="text-emerald-300 font-bold">{autoDelay} 秒</span>自動出發，
                  App 從各人出發一刻起算用時 — 出發時間不同也最公平，無需你按開始
                </p>
              </div>
              {/* Toggle */}
              <button
                onClick={() => setAutoMode(!autoMode)}
                className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${autoMode ? 'bg-emerald-500' : 'bg-slate-700'}`}
                aria-label="切換個人計時模式"
              >
                <motion.div
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
                  animate={{ left: autoMode ? 'calc(100% - 1.5rem)' : '0.25rem' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            {autoMode && (
              <div className="flex gap-2">
                {[10, 15, 30, 60].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setAutoDelay(sec)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      autoDelay === sec ? 'bg-emerald-500 text-slate-900 font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            )}
            {autoMode && (
              <p className="text-[10px] text-emerald-200/60 text-center">
                ✅ 上方 QR 碼／加入連結已加入自動開始參數，重新分享即可
              </p>
            )}
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
              {autoMode
                ? '💡 已開啟個人計時模式：成員掃碼後自行倒數出發，可不用此同步開始'
                : '按下後會生成開始連結，分享給所有參加者點擊即可同步倒數'}
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

              {/* Manual start code (for members typing on the waiting screen) */}
              {manualStartCode && (
                <div className="flex items-center justify-between gap-2 bg-slate-900/80 border border-emerald-500/20 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500">口頭開始代碼（成員在等待頁按 🔑 輸入）</p>
                    <p className="text-sm text-cyan-300 font-mono truncate">{manualStartCode}</p>
                  </div>
                  <button
                    onClick={async () => {
                      await copyToClipboard(manualStartCode);
                      setCopied('startcode');
                      setTimeout(() => setCopied(null), 2000);
                    }}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg shrink-0 flex items-center gap-1 text-xs text-slate-200"
                  >
                    {copied === 'startcode' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied === 'startcode' ? '已複製' : '複製'}
                  </button>
                </div>
              )}

              {/* Start QR toggle */}
              <button
                onClick={() => setShowStartQR(!showStartQR)}
                className="w-full py-2 bg-slate-700/70 hover:bg-slate-600 rounded-lg text-sm text-slate-200 flex items-center justify-center gap-2"
              >
                <QrCode size={16} />
                {showStartQR ? '隱藏開始 QR 碼' : '顯示開始 QR 碼'}
              </button>
              {showStartQR && (
                <div className="flex flex-col items-center py-2">
                  <div className="bg-white rounded-xl p-3">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(startUrl)}`}
                      alt="Start QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    讓還沒開始的成員掃描，點擊後自動同步倒數
                  </p>
                </div>
              )}
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
                onChange={e => { setVerificationInput(e.target.value); setVerifyError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                placeholder="輸入驗證碼 (XXXXXX-XXXX) 或完整成績代碼"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleVerify}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-bold text-sm shrink-0"
              >
                驗證
              </button>
            </div>

            {verifyError && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <AlertCircle size={14} />
                {verifyError}
              </div>
            )}

            {allResults.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <Clock size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">等待參加者完成...</p>
                <p className="text-xs mt-1">參加者完成後會出示驗證碼，輸入上方即可記錄成績</p>
                <p className="text-[10px] mt-1 text-slate-600">也支援貼上參加者的「完整成績代碼」</p>
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
                        {(r.timingMode || 'stopwatch') !== 'none' && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{formatTime(r.timeSpent)}</span>
                          </>
                        )}
                        {r.distanceWalked > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatDistance(r.distanceWalked)}</span>
                          </>
                        )}
                      </div>
                      {(r.score ?? 0) > 0 && (r.totalScore ?? 0) > 0 && (
                        <div className="mt-0.5 text-xs">
                          <span className="text-amber-400 font-bold">⭐ {r.score}/{r.totalScore} 分</span>
                        </div>
                      )}
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
