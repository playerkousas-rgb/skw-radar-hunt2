import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Clock, Navigation, Flag, Copy, Check,
  Share2, Home, RotateCcw, Star, Zap
} from 'lucide-react';
import { PlayerResult, GameSession } from '../lib/types';
import { formatTime, formatDistance, copyToClipboard, playSound, encodeResult } from '../lib/utils';
import GlowButton from '../components/GlowButton';

interface Props {
  result: PlayerResult;
  session: GameSession | null;
  onBackToHome: () => void;
  onPlayAgain: () => void;
}

export default function ResultScreen({ result, session, onBackToHome, onPlayAgain }: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const completionRate = (result.checkpointsFound / result.totalCheckpoints) * 100;
  const isPerfect = result.checkpointsFound === result.totalCheckpoints;
  // Full result code — carries name/time/score so the leader can register the
  // result even from another device (no server needed)
  const fullResultCode = encodeResult(result);

  const handleCopy = async () => {
    await copyToClipboard(result.verificationCode);
    setCopied(true);
    playSound('success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyFull = async () => {
    await copyToClipboard(fullResultCode);
    setCopiedFull(true);
    playSound('success');
    setTimeout(() => setCopiedFull(false), 2000);
  };

  const score = result.score ?? result.checkpointsFound;
  const totalScore = result.totalScore ?? result.totalCheckpoints;
  const timingMode = result.timingMode || 'stopwatch';
  const showTime = timingMode !== 'none';

  const handleShare = async () => {
    const text = `🎯 Radar Hunt - ${result.mapName}
👤 ${result.playerName}
⭐ 得分: ${score}/${totalScore}
🏆 完成度: ${result.checkpointsFound}/${result.totalCheckpoints} (${Math.round(completionRate)}%)${showTime ? `
⏱️ 用時: ${formatTime(result.timeSpent)}` : ''}
🚶 距離: ${formatDistance(result.distanceWalked)}
🔑 驗證碼: ${result.verificationCode}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Radar Hunt 成績', text });
      } catch { /* ignore */ }
    } else {
      await copyToClipboard(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col safe-area-top">
      {/* Header */}
      <div className="p-4 text-center shrink-0">
        <p className="text-xs text-slate-500 uppercase tracking-widest">尋寶完成</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8 flex flex-col items-center">
        {/* Celebration */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8 }}
          className="relative mb-6"
        >
          <div className="w-40 h-40 rounded-full bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/30">
            <span className="text-7xl">{isPerfect ? '🏆' : '🎉'}</span>
          </div>
          {isPerfect && (
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -top-2 -right-2 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-xl shadow-lg"
            >
              ⭐
            </motion.div>
          )}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-2"
        >
          {isPerfect ? '完美通關！' : '尋寶完成！'}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-slate-500 text-sm mb-8"
        >
          {result.mapName}
        </motion.p>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`w-full max-w-sm grid gap-3 mb-6 ${showTime ? 'grid-cols-3' : 'grid-cols-2'}`}
        >
          <div className="bg-slate-800/60 rounded-xl p-4 text-center border border-slate-700">
            <Trophy size={24} className="mx-auto mb-2 text-amber-400" />
            <p className="text-2xl font-black text-slate-100">{result.checkpointsFound}</p>
            <p className="text-xs text-slate-500">/{result.totalCheckpoints} 寶藏</p>
          </div>
          {showTime && (
            <div className="bg-slate-800/60 rounded-xl p-4 text-center border border-slate-700">
              <Clock size={24} className="mx-auto mb-2 text-cyan-400" />
              <p className="text-2xl font-black text-slate-100">{formatTime(result.timeSpent)}</p>
              <p className="text-xs text-slate-500">用時</p>
            </div>
          )}
          <div className="bg-slate-800/60 rounded-xl p-4 text-center border border-slate-700">
            <Navigation size={24} className="mx-auto mb-2 text-emerald-400" />
            <p className="text-2xl font-black text-slate-100">{formatDistance(result.distanceWalked)}</p>
            <p className="text-xs text-slate-500">步行距離</p>
          </div>
        </motion.div>

        {/* Score banner (capture-points mode) */}
        {(result.totalScore ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55 }}
            className="w-full max-w-sm bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl p-4 border border-amber-500/40 mb-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs text-amber-200/70 mb-0.5">⭐ 本次得分</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-amber-400 font-mono">{score}</span>
                <span className="text-lg text-slate-500">/ {totalScore} 分</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-amber-400">
                {Math.round((score / Math.max(totalScore, 1)) * 100)}%
              </p>
              <p className="text-[10px] text-slate-500">得分率</p>
            </div>
          </motion.div>
        )}

        {/* Completion bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-sm bg-slate-800/60 rounded-xl p-4 border border-slate-700 mb-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">完成度</span>
            <span className="text-sm font-bold text-cyan-400">{Math.round(completionRate)}%</span>
          </div>
          <div className="h-3 bg-slate-900 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
            />
          </div>
          {result.timeSpent <= 300 && isPerfect && (
            <div className="mt-3 flex items-center gap-2 text-amber-400 text-sm">
              <Zap size={16} />
              <span>速通達人！5分鐘內完美完成</span>
            </div>
          )}
        </motion.div>

        {/* Verification Code */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className={`w-full max-w-sm rounded-xl p-5 border mb-6 ${
              session
                ? 'bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border-violet-500/30'
                : 'bg-slate-800/60 border-slate-700'
            }`}
          >
            <h3 className={`text-sm font-bold mb-2 flex items-center gap-2 ${
              session ? 'text-violet-300' : 'text-slate-400'
            }`}>
              <Flag size={16} />
              {session ? '🏁 請向領袖出示此驗證碼' : '📋 你的成績代碼'}
            </h3>
            <div className="flex items-center gap-3 bg-slate-900/60 rounded-lg p-3">
              <p className={`flex-1 text-2xl font-mono font-black tracking-widest ${
                session ? 'text-violet-300' : 'text-cyan-400'
              }`}>
                {result.verificationCode}
              </p>
              <button
                onClick={handleCopy}
                className={`p-2 rounded-lg ${
                  session ? 'bg-violet-500/20 hover:bg-violet-500/30' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {copied ? <Check size={20} className="text-emerald-400" /> : <Copy size={20} className={session ? 'text-violet-400' : 'text-slate-400'} />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {session
                ? '領袖輸入此代碼即可記錄你的成績至排行榜'
                : '截圖此頁面或分享給朋友看看你的成績！'}
            </p>
          </motion.div>

        {/* Full result code (for cross-device verification) */}
        {session && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="w-full max-w-sm bg-slate-800/60 rounded-xl p-4 border border-slate-700 mb-6"
          >
            <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
              📋 完整成績代碼
            </h3>
            <p className="text-[11px] text-slate-500 mb-2">
              若領袖的「驗證碼」比對不到你的成績（不同裝置），改給他這組代碼即可自動登錄
            </p>
            <div className="flex gap-2">
              <textarea
                value={fullResultCode}
                readOnly
                rows={2}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-slate-400 font-mono break-all resize-none"
              />
              <button
                onClick={handleCopyFull}
                className="px-3 bg-slate-700 hover:bg-slate-600 rounded-lg shrink-0"
              >
                {copiedFull ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-slate-400" />}
              </button>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="w-full max-w-sm space-y-3"
        >
          <GlowButton
            title="分享成績"
            onClick={handleShare}
            variant="primary"
            size="lg"
            className="w-full"
            icon={<Share2 size={20} />}
          />
          <div className="flex gap-3">
            <GlowButton
              title="再玩一次"
              onClick={onPlayAgain}
              variant="secondary"
              size="md"
              className="flex-1"
              icon={<RotateCcw size={18} />}
            />
            <GlowButton
              title="回首頁"
              onClick={onBackToHome}
              variant="ghost"
              size="md"
              className="flex-1"
              icon={<Home size={18} />}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
