import { motion } from 'framer-motion';
import { Crown, Search, LogOut, MapPin, Users, Compass } from 'lucide-react';
import GlowButton from '../components/GlowButton';
import { RoleType } from '../lib/types';

interface Props {
  onSelectRole: (role: Exclude<RoleType, null>) => void;
  currentRole?: RoleType;
  onLogout?: () => void;
}

export default function RoleSelectScreen({ onSelectRole, currentRole, onLogout }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Background */}
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

      <div className="relative flex-1 flex flex-col justify-center px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="relative inline-block mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-violet-500 rounded-full blur-xl opacity-30"
            />
            <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-cyan-400 to-violet-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-500/20">
              <span className="text-4xl">🎯</span>
            </div>
          </div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 mb-2">
            RADAR HUNT
          </h1>
          <p className="text-slate-400 text-sm tracking-widest uppercase">城市追蹤尋寶</p>
        </motion.div>

        {/* Role Selection Cards */}
        <div className="space-y-4 max-w-sm mx-auto w-full">
          {/* Leader Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className={`group ${currentRole === 'leader' ? 'ring-2 ring-cyan-400 rounded-2xl' : ''}`}
          >
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:border-cyan-500/30 transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-amber-500/10 rounded-xl group-hover:bg-amber-500/20 transition-colors">
                  <Crown size={28} className="text-amber-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-100 mb-1">👑 領袖模式</h2>
                  <p className="text-sm text-slate-400">
                    創建尋寶地圖、設定寶藏點、管理遊戲
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1 bg-slate-700/50 px-2 py-1 rounded">
                  <MapPin size={12} /> 放置寶藏
                </span>
                <span className="flex items-center gap-1 bg-slate-700/50 px-2 py-1 rounded">
                  <Users size={12} /> 邀請成員
                </span>
                <span className="flex items-center gap-1 bg-slate-700/50 px-2 py-1 rounded">
                  📤 分享地圖
                </span>
              </div>
              
              {currentRole === 'leader' ? (
                <div className="flex gap-2">
                  <GlowButton
                    title="繼續創作"
                    onClick={() => onSelectRole('leader')}
                    variant="primary"
                    size="lg"
                    className="flex-1"
                    icon={<Crown size={18} />}
                  />
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors"
                    >
                      <LogOut size={20} className="text-slate-400" />
                    </button>
                  )}
                </div>
              ) : (
                <GlowButton
                  title="埋下寶藏"
                  onClick={() => onSelectRole('leader')}
                  variant="primary"
                  size="lg"
                  className="w-full"
                  icon={<Crown size={18} />}
                />
              )}
            </div>
          </motion.div>

          {/* Member Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className={`group ${currentRole === 'member' ? 'ring-2 ring-violet-400 rounded-2xl' : ''}`}
          >
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:border-violet-500/30 transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-violet-500/10 rounded-xl group-hover:bg-violet-500/20 transition-colors">
                  <Compass size={28} className="text-violet-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-100 mb-1">🎯 成員模式</h2>
                  <p className="text-sm text-slate-400">
                    導入地圖、使用雷達尋寶
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1 bg-slate-700/50 px-2 py-1 rounded">
                  <Search size={12} /> GPS 尋寶
                </span>
                <span className="flex items-center gap-1 bg-slate-700/50 px-2 py-1 rounded">
                  📥 導入地圖
                </span>
                <span className="flex items-center gap-1 bg-slate-700/50 px-2 py-1 rounded">
                  🗺️ 實境導航
                </span>
              </div>
              
              {currentRole === 'member' ? (
                <div className="flex gap-2">
                  <GlowButton
                    title="開始尋寶"
                    onClick={() => onSelectRole('member')}
                    variant="secondary"
                    size="lg"
                    className="flex-1"
                    icon={<Compass size={18} />}
                  />
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors"
                    >
                      <LogOut size={20} className="text-slate-400" />
                    </button>
                  )}
                </div>
              ) : (
                <GlowButton
                  title="加入尋寶"
                  onClick={() => onSelectRole('member')}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  icon={<Compass size={18} />}
                />
              )}
            </div>
          </motion.div>
        </div>

        {/* Footer Info & Copyright */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 text-center"
        >
          <p className="text-xs text-slate-600 mb-8">
            ✨ 支援 4 種寶藏類型 • GPS 精確定位 • QR碼分享
          </p>
          
          <div className="pt-8 border-t border-slate-800/30">
            <p className="text-[10px] text-slate-700 tracking-[0.3em] font-bold">
              COPYRIGHT 2026 SKWSCOUT
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
