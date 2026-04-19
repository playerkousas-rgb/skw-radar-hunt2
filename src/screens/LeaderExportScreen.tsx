import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Copy, Check, Share2, QrCode, Download,
  Link as LinkIcon, MessageCircle, Mail
} from 'lucide-react';
import { GameMap } from '../lib/types';
import { encodeMapForExport, copyToClipboard, shareMap, generateQRCodeData } from '../lib/utils';
import { playSound } from '../lib/utils';

interface Props {
  map: GameMap;
  onBack: () => void;
}

export default function LeaderExportScreen({ map, onBack }: Props) {
  const [encodedData, setEncodedData] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'qr'>('code');
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    const encoded = encodeMapForExport(map);
    setEncodedData(encoded);
    setShareUrl(`${window.location.origin}?import=${encodeURIComponent(encoded)}`);
  }, [map]);

  const handleCopy = async () => {
    const success = await copyToClipboard(encodedData);
    if (success) {
      setCopied(true);
      playSound('success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      playSound('success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    await shareMap(map);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${map.name.replace(/\s+/g, '_')}_map.json`;
    a.click();
    URL.revokeObjectURL(url);
    playSound('success');
  };

  // Simple QR code using API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100">分享地圖</h1>
          <p className="text-xs text-slate-500">{map.name}</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="p-4 pb-24 space-y-6">
        {/* Map Info */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-xl flex items-center justify-center text-3xl">
              🗺️
            </div>
            <div>
              <h2 className="font-bold text-slate-100">{map.name}</h2>
              <p className="text-sm text-slate-400">{map.checkpoints.length} 個寶藏點</p>
              <p className="text-xs text-slate-500">作者: {map.creatorName}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'code'
                ? 'bg-cyan-500 text-slate-900'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <LinkIcon size={18} className="inline mr-2" />
            連結
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'qr'
                ? 'bg-cyan-500 text-slate-900'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <QrCode size={18} className="inline mr-2" />
            QR 碼
          </button>
        </div>

        {/* Code Tab */}
        {activeTab === 'code' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Shareable Link */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <label className="text-sm text-slate-400 mb-2 block">🔗 分享連結</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            {/* Export Code */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <label className="text-sm text-slate-400 mb-2 block">📝 匯入代碼（進階）</label>
              <textarea
                value={encodedData}
                readOnly
                rows={4}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono break-all"
              />
              <button
                onClick={handleCopy}
                className="mt-2 w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? '已複製' : '複製代碼'}
              </button>
            </div>

            {/* JSON Download */}
            <button
              onClick={handleDownload}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors flex items-center justify-center gap-2"
            >
              <Download size={18} />
              下載 JSON 檔案
            </button>
          </motion.div>
        )}

        {/* QR Tab */}
        {activeTab === 'qr' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="bg-white rounded-2xl p-6 inline-block">
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="w-48 h-48"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="white" width="200" height="200"/><text x="50%" y="50%" text-anchor="middle" fill="black">QR 碼生成失敗</text></svg>';
                }}
              />
            </div>
            <p className="text-sm text-slate-500 mt-4">讓成員掃描此 QR 碼來導入地圖</p>
          </motion.div>
        )}

        {/* Quick Share */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <label className="text-sm text-slate-400 mb-3 block">🚀 快速分享</label>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <Share2 size={24} className="text-cyan-400" />
              <span className="text-xs text-slate-400">系統</span>
            </button>
            <button
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareUrl)}`, '_blank')}
              className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <MessageCircle size={24} className="text-emerald-400" />
              <span className="text-xs text-slate-400">WhatsApp</span>
            </button>
            <button
              onClick={() => window.open(`mailto:?subject=Radar Hunt 地圖邀請&body=${encodeURIComponent(shareUrl)}`, '_blank')}
              className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <Mail size={24} className="text-amber-400" />
              <span className="text-xs text-slate-400">郵件</span>
            </button>
            <button
              onClick={() => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareUrl)}`, '_blank')}
              className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <span className="text-2xl">💚</span>
              <span className="text-xs text-slate-400">LINE</span>
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <h3 className="font-bold text-amber-400 mb-2">💡 如何讓成員加入</h3>
          <ol className="text-sm text-amber-200/80 space-y-1 list-decimal list-inside">
            <li>複製連結或分享 QR 碼給成員</li>
            <li>成員點擊連結或掃描 QR 碼</li>
            <li>成員選擇"成員模式"開始尋寶</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
