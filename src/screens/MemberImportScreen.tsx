import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, QrCode, Keyboard, Check, AlertCircle, Download,
  Trash2, FileText
} from 'lucide-react';
import { GameMap } from '../lib/types';
import { decodeMapFromExport, generateId, playSound } from '../lib/utils';
import { saveActiveMap, loadActiveMap } from '../lib/storage';
import GlowButton from '../components/GlowButton';

interface Props {
  onBack: () => void;
  onMapImported: (map: GameMap, joinCode?: string) => void;
  initialImportCode?: string;
}

export default function MemberImportScreen({ onBack, onMapImported, initialImportCode }: Props) {
  const [importCode, setImportCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [savedMaps, setSavedMaps] = useState<GameMap[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadSavedMaps();

    // Check URL for import
    const params = new URLSearchParams(window.location.search);
    const importData = params.get('import');
    const joinCode = params.get('join');
    if (importData) {
      setImportCode(importData);
      // Auto-import
      setTimeout(() => handleImport(importData, joinCode || undefined), 500);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (initialImportCode) {
      setImportCode(initialImportCode);
    }
  }, [initialImportCode]);

  const loadSavedMaps = async () => {
    const active = await loadActiveMap();
    if (active) {
      setSavedMaps([active]);
    }
  };

  const handleImport = async (code?: string, joinCode?: string) => {
    setError('');
    setSuccess(false);
    setImporting(true);

    const data = (code || importCode).trim();
    if (!data) {
      setError('請輸入匯入代碼或掃描 QR 碼');
      setImporting(false);
      return;
    }

    const map = decodeMapFromExport(data);
    if (!map) {
      setError('無效的匯入代碼，請檢查後重試');
      setImporting(false);
      return;
    }

    // Ensure unique ID
    map.id = generateId();
    map.createdAt = Date.now();

    await saveActiveMap(map);
    setSuccess(true);
    playSound('success');

    setTimeout(() => {
      onMapImported(map, joinCode);
    }, 800);
  };

  const handleSubmit = () => {
    handleImport();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        // Try JSON first
        try {
          const json = JSON.parse(content);
          if (json.checkpoints) {
            handleImport(JSON.stringify(json));
            return;
          }
        } catch {
          // Not JSON, maybe base64
        }
        // Try direct decode
        handleImport(content);
      } catch {
        setError('無法讀取檔案');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 safe-area-top">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100">📥 導入地圖</h1>
          <p className="text-xs text-slate-500">加入領袖的尋寶遊戲</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="p-4 pb-24 space-y-5 max-w-md mx-auto">
        {/* Import Methods */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => alert('請使用領袖分享的 QR 碼截圖或直接輸入代碼（瀏覽器需 HTTPS 才能使用相機）')}
            className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-cyan-500/50 transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <QrCode size={24} className="text-cyan-400" />
            </div>
            <span className="text-xs text-slate-300">掃描 QR</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-violet-500/50 transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <Download size={24} className="text-violet-400" />
            </div>
            <span className="text-xs text-slate-300">載入檔案</span>
          </button>

          <button
            onClick={() => {
              // Focus the textarea
              const ta = document.getElementById('import-code-input') as HTMLTextAreaElement;
              ta?.focus();
            }}
            className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-emerald-500/50 transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Keyboard size={24} className="text-emerald-400" />
            </div>
            <span className="text-xs text-slate-300">貼上代碼</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.txt,.html"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Code Input */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
            <FileText size={14} />
            貼上匯入代碼或分享連結
          </label>
          <textarea
            id="import-code-input"
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
            placeholder="貼上領袖給你的代碼或連結..."
            rows={4}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-xs"
          />

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-2 text-red-400 text-sm"
            >
              <AlertCircle size={14} />
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-2 text-emerald-400 text-sm"
            >
              <Check size={14} />
              導入成功！正在進入...
            </motion.div>
          )}

          <GlowButton
            title={importing ? '匯入中...' : '導入地圖'}
            onClick={handleSubmit}
            variant="primary"
            size="lg"
            className="w-full mt-4"
            disabled={!importCode.trim() || success || importing}
            loading={importing}
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
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-200 truncate">{map.name}</h3>
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
          <h3 className="font-bold text-slate-300 mb-3 text-sm">📖 如何取得地圖</h3>
          <div className="space-y-2 text-sm text-slate-500">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0">1</span>
              <p>請領袖建立房間並提供 QR 碼或加入連結</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0">2</span>
              <p>掃描 QR 碼或點擊連結會自動匯入</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0">3</span>
              <p>輸入房間代碼加入，等待領袖開始遊戲</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0">4</span>
              <p>倒數後開始 GPS 雷達尋寶！</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
