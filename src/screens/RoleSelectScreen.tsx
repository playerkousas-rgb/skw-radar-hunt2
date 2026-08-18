import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Search, LogOut, MapPin, Users, Compass, Gamepad2, User, HelpCircle } from 'lucide-react';
import GlowButton from '../components/GlowButton';
import { RoleType } from '../lib/types';
import { saveSettings } from '../lib/storage';

interface Props {
  onSelectRole: (role: Exclude<RoleType, null>) => void;
  currentRole?: RoleType;
  onLogout?: () => void;
  playerName?: string;
  onShowHelp?: () => void;
}

export default function RoleSelectScreen({ onSelectRole, currentRole, onLogout, playerName, onShowHelp }: Props) {
  const [name, setName] = useState(playerName || '');
  const [editingName, setEditingName] = useState(!playerName || playerName === '尋寶者');

  const handleSaveName = async () => {
    if (name.trim()) {
      await saveSettings({
        soundEnabled: true, vibrationEnabled: true,
        backgroundTracking: false, offlineMaps: false, highContrast: false,
        language: 'zh', playerName: name.trim(),
        compassCalibrated: false, gpsHighAccuracy: true,
      });
    }
  };

  const handleSelect = async (role: Exclude<RoleType, null>) => {
    if (name.trim()) await handleSaveName();
    onSelectRole(role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col safe-area-top">
      {/* Help button top-right */}
      {onShowHelp && (
        <button
          onClick={onShowHelp}
          className="absolute top-4 right-4 z-10 p-2.5 bg-slate-800/70 hover:bg-slate-700 backdrop-blur border border-slate-700 rounded-full text-slate-400 hover:text-cyan-400 transition-colors active:scale-95"
          aria-label="使用說明"
        >
          <HelpCircle size={20} />
        </button>
      )}
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/4 -left-32 w-64 h-64 bg-cyan-500 rounded-full blur-[128px]"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          className="absolute bottom-1/4 -right-32 w-64 h-64 bg-violet-500 rounded-full blur-[128px]"
        />
      </div>

      <div className="relative flex-1 flex flex-col justify-center px-6 py-8 max-w-md mx-auto w-full">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-violet-500 rounded-full blur-xl opacity-30"
            />
            <div className="relative w-20 h-20 mx-auto bg-gradient-to-br from-cyan-400 to-violet-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-500/20">
              <span className="text-4xl">🎯</span>
            </div>
          </div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 mb-1">
            RADAR HUNT
          </h1>
          <p className="text-slate-400 text-sm tracking-widest uppercase">GPS 真人尋寶遊戲</p>
        </motion.div>

        {/* Player Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-4">
            <label className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <User size={14} />
              你的名字（排行榜顯示用）
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setEditingName(true)}
                placeholder="輸入你的名稱"
                maxLength={15}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </motion.div>

        {/* Role Cards */}
        <div className="space-y-3">
          {/* Leader */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className={`group ${currentRole === 'leader' ? 'ring-2 ring-cyan-400 rounded-2xl' : ''}`}
          >
            <button
              onClick={() => handleSelect('leader')}
              className="w-full text-left bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-5 hover:border-cyan-500/50 transition-all active:scale-98"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/10 rounded-xl group-hover:bg-amber-500/20 transition-colors shrink-0">
                  <Crown size={26} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-100 mb-1">👑 我是領袖</h2>
                  <p className="text-sm text-slate-400 mb-2">
                    創建地圖、開房間、邀請成員、看成績
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="flex items-center gap-1 bg-slate-700/50 px-2 py-0.5 rounded text-[10px] text-slate-400">
                      <MapPin size={10} /> 埋寶藏
                    </span>
                    <span className="flex items-center gap-1 bg-slate-700/50 px-2 py-0.5 rounded text-[10px] text-slate-400">
                      <Users size={10} /> 開房間
                    </span>
                    <span className="flex items-center gap-1 bg-slate-700/50 px-2 py-0.5 rounded text-[10px] text-slate-400">
                      <Gamepad2 size={10} /> 同步開始
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </motion.div>

          {/* Member */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className={`group ${currentRole === 'member' ? 'ring-2 ring-violet-400 rounded-2xl' : ''}`}
          >
            <button
              onClick={() => handleSelect('member')}
              className="w-full text-left bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-5 hover:border-violet-500/50 transition-all active:scale-98"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-violet-500/10 rounded-xl group-hover:bg-violet-500/20 transition-colors shrink-0">
                  <Compass size={26} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-100 mb-1">🎯 我是玩家</h2>
                  <p className="text-sm text-slate-400 mb-2">
                    加入房間、用 GPS 雷達尋寶、繳交成績
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="flex items-center gap-1 bg-slate-700/50 px-2 py-0.5 rounded text-[10px] text-slate-400">
                      <Search size={10} /> 雷達導航
                    </span>
                    <span className="flex items-center gap-1 bg-slate-700/50 px-2 py-0.5 rounded text-[10px] text-slate-400">
                      <Users size={10} /> 多人同步
                    </span>
                    <span className="flex items-center gap-1 bg-slate-700/50 px-2 py-0.5 rounded text-[10px] text-slate-400">
                      🏁 驗證成績
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </motion.div>
        </div>

        {/* Logout */}
        {currentRole && onLogout && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onLogout}
            className="mt-4 w-full py-3 text-slate-500 text-sm flex items-center justify-center gap-2 hover:text-slate-300 transition-colors"
          >
            <LogOut size={16} /> 切換身份
          </motion.button>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-slate-600 mb-4">
            ✨ 多人房間 • GPS 濾波 • 同步倒數 • 成績驗證
          </p>
          <div className="pt-4 border-t border-slate-800/30">
            <p className="text-[10px] text-slate-700 tracking-[0.3em] font-bold">
              COPYRIGHT 2026 SKWSCOUT
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
