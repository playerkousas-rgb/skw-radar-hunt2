import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, QrCode, Keyboard, Camera, Link as LinkIcon,
  Check, AlertCircle, MapPin, Download, Trash2
} from 'lucide-react';
import { GameMap } from '../lib/types';
import { decodeMapFromExport, generateId } from '../lib/utils';
import { saveActiveMap, loadActiveMap } from '../lib/storage';
import { playSound } from '../lib/utils';
import GlowButton from '../components/GlowButton';

interface Props {
  onBack: () => void;
  onMapImported: (map: GameMap) => void;
}

export default function MemberImportScreen({ onBack, onMapImported }: Props) {
  const [importCode, setImportCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [savedMaps, setSavedMaps] = useState<GameMap[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSavedMaps();
    
    // Check for import from URL
    const params = new URLSearchParams(window.location.search);
    const importData = params.get('import');
    if (importData) {
      handleImport(importData);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadSavedMaps = async () => {
    const active = await loadActiveMap();
    if (active) {
      setSavedMaps([active]);
    }
  };

  const handleImport = async (code: string) => {
    setError('');
    setSuccess(false);
    
    const map = decodeMapFromExport(code);
    if (!map) {
      setError('無效的匯入代碼，請檢查後重試');
      return;
    }

    // Ensure unique ID
    map.id = generateId();
    
    await saveActiveMap(map);
    setSuccess(true);
    playSound('success');
    
    setTimeout(() => {
      onMapImported(map);
    }, 800);
  };

  const handleSubmit = () => {
    if (!importCode.trim()) return;
    handleImport(importCode.trim());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        handleImport(content);
      } catch {
        setError('無法讀取檔案');
      }
    };
    reader.readAsText(file);
  };

  // Simulated QR scanning (in real app, would use QR scanner library)
  const handleQRScan = () => {
    setShowCamera(true);
    // Simulate scan after 3 seconds
    setTimeout(() => {
      setShowCamera(false);
      alert('在實際應用中，這裡會開啟相機掃描 QR 碼');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100">📥 導入地圖</h1>
          <p className="text-xs text-slate-500">加入領袖的尋寶遊戲</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="p-4 pb-24 space-y-6">
        {/* Import Methods */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handleQRScan}
            className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-cyan-500/50 transition-all"
          >
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <QrCode size={24} className="text-cyan-400" />
            </div>
            <span className="text-sm text-slate-300">掃描 QR</span>
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-violet-500/50 transition-all"
          >
            <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <Download size={24} className="text-violet-400" />
            </div>
            <span className="text-sm text-slate-300">載入檔案</span>
          </button>
          
          <label className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-emerald-500/50 transition-all cursor-pointer">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Keyboard size={24} className="text-emerald-400" />
            </div>
            <span className="text-sm text-slate-300">輸入代碼</span>
          </label>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Code Input */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <label className="text-sm text-slate-400 mb-2 block">📝 貼上匯入代碼</label>
          <textarea
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
            placeholder="貼上領袖給你的代碼..."
            rows={4}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-sm"
          />
          
          {error && (
            <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-2 text-emerald-400 text-sm"
            >
              <Check size={16} />
              導入成功！正在跳轉...
            </motion.div>
          )}
          
          <GlowButton
            title="導入地圖"
            onClick={handleSubmit}
            variant="primary"
            size="lg"
            className="w-full mt-4"
            disabled={!importCode.trim() || success}
          />
        </div>

        {/* Saved Maps */}
        {savedMaps.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">💾 已保存的地圖</h2>
            <div className="space-y-2">
              {savedMaps.map((map) => (
                <motion.div
                  key={map.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl border border-slate-700"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-lg flex items-center justify-center text-xl">
                    🗺️
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-200">{map.name}</h3>
                    <p className="text-xs text-slate-500">{map.checkpoints.length} 個寶藏點</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onMapImported(map)}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-semibold text-sm transition-colors"
                    >
                      繼續
                    </button>
                    <button
                      onClick={async () => {
                        await saveActiveMap(null);
                        setSavedMaps([]);
                      }}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <h3 className="font-bold text-slate-300 mb-3">📖 如何取得地圖</h3>
          <div className="space-y-3 text-sm text-slate-400">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold shrink-0">1</span>
              <p>請領袖提供地圖連結或 QR 碼</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold shrink-0">2</span>
              <p>掃描 QR 碼或貼上代碼進行導入</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold shrink-0">3</span>
              <p>開始使用 GPS 雷達尋找寶藏</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
