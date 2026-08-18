import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Users, ChevronRight, AlertCircle,
  FileText, Download, ArrowRight, Check
} from 'lucide-react';
import { GameMap } from '../lib/types';
import { decodeMapFromExport, playSound } from '../lib/utils';
import GlowButton from '../components/GlowButton';

interface Props {
  onBack: () => void;
  onJoinSession: (code: string, map: GameMap) => void;
  onOpenImport: () => void;
  initialCode?: string;
}

export default function MemberJoinScreen({ onBack, onJoinSession, onOpenImport, initialCode }: Props) {
  const [roomCode, setRoomCode] = useState(initialCode || '');
  const [importCode, setImportCode] = useState('');
  const [error, setError] = useState('');
  const [activeMap, setActiveMap] = useState<GameMap | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check URL for import data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const importData = params.get('import');
    if (importData) {
      setImportCode(importData);
      const map = decodeMapFromExport(importData);
      if (map) {
        setActiveMap(map);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleImportCode = () => {
    setError('');
    const map = decodeMapFromExport(importCode.trim());
    if (!map) {
      setError('無效的地圖代碼，請領袖重新提供');
      playSound('alert');
      return;
    }
    setActiveMap(map);
    playSound('click');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const map = decodeMapFromExport(content);
        if (map) {
          setActiveMap(map);
          playSound('success');
        } else {
          setError('檔案無法讀取，請確認格式');
        }
      } catch {
        setError('無法讀取檔案');
      }
    };
    reader.readAsText(file);
  };

  const handleJoin = () => {
    const code = roomCode.trim().toUpperCase();
    if (code.length < 4) {
      setError('請輸入有效的房間代碼（至少 4 位）');
      playSound('alert');
      return;
    }
    if (!activeMap) {
      setError('請先匯入地圖（掃 QR 碼或貼上代碼）');
      return;
    }
    playSound('success');
    onJoinSession(code, activeMap);
  };

  const step = activeMap ? 'ready' : (roomCode.length >= 4 ? 'import' : 'code');

  return (
    <div className="min-h-screen bg-slate-950 safe-area-top">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100">🎮 加入遊戲</h1>
          <p className="text-xs text-slate-500">輸入房間代碼開始</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="p-4 space-y-5 max-w-md mx-auto pb-20">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step === 'code' ? 'bg-cyan-500 text-slate-900' : 'bg-cyan-500/20 text-cyan-400'
          }`}>1</div>
          <div className={`w-8 h-0.5 ${step !== 'code' ? 'bg-cyan-500' : 'bg-slate-700'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step === 'import' ? 'bg-cyan-500 text-slate-900' : activeMap ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-500'
          }`}>2</div>
          <div className={`w-8 h-0.5 ${activeMap ? 'bg-cyan-500' : 'bg-slate-700'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step === 'ready' && activeMap ? 'bg-emerald-500 text-slate-900' : 'bg-slate-700 text-slate-500'
          }`}>3</div>
        </div>

        {/* Room Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700"
        >
          <label className="text-sm text-slate-400 mb-3 flex items-center gap-2">
            <Users size={16} className="text-cyan-400" />
            房間代碼
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="例如：ABC123"
            maxLength={6}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-center text-3xl font-mono tracking-[0.5em] text-cyan-400 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 uppercase"
            autoFocus
          />
          {initialCode && (
            <p className="text-xs text-violet-400 mt-2 text-center">✨ 已自動填入連結中的房間代碼</p>
          )}
        </motion.div>

        {/* Map Import */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700 space-y-3"
        >
          <h3 className="text-sm text-slate-400 flex items-center gap-2">
            <FileText size={16} className="text-violet-400" />
            地圖資料
          </h3>

          {activeMap ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center text-2xl">
                🗺️
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-emerald-300">{activeMap.name}</p>
                <p className="text-xs text-emerald-400/70">{activeMap.checkpoints.length} 個寶藏點</p>
              </div>
              <Check size={20} className="text-emerald-400" />
            </div>
          ) : (
            <>
              <textarea
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="掃描領袖 QR 碼後貼上，或點下方載入檔案..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500 font-mono text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 flex items-center justify-center gap-2 transition-colors"
                >
                  <Download size={16} /> 載入檔案
                </button>
                <button
                  onClick={handleImportCode}
                  disabled={!importCode.trim()}
                  className="py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <ChevronRight size={16} /> 確認地圖
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt,.html"
                onChange={handleFileUpload}
                className="hidden"
              />
              <p className="text-xs text-slate-600 text-center">提示：掃 QR 碼後若直接開啟，會自動匯入地圖</p>
            </>
          )}
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        {/* Join Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlowButton
            title={activeMap ? '🚀 加入房間' : '先匯入地圖'}
            onClick={handleJoin}
            variant={activeMap && roomCode.length >= 4 ? 'primary' : 'ghost'}
            size="lg"
            className="w-full"
            icon={<ArrowRight size={20} />}
            disabled={roomCode.trim().length < 4 || !activeMap}
          />
        </motion.div>

        {/* Solo option */}
        <button
          onClick={onOpenImport}
          className="w-full py-3 text-slate-500 text-sm hover:text-slate-300 transition-colors"
        >
          或直接匯入地圖（單人玩）→
        </button>

        {/* Instructions */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-xs font-bold text-slate-500 mb-2">📖 加入流程</h3>
          <div className="space-y-2 text-xs text-slate-500">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold shrink-0">1</span>
              <p>向領袖索取房間代碼與 QR Code/連結</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold shrink-0">2</span>
              <p>輸入房間代碼（6 位英數字）</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold shrink-0">3</span>
              <p>掃 QR 碼或貼上地圖代碼</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold shrink-0">4</span>
              <p>點「加入房間」，等待領袖開始遊戲</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
