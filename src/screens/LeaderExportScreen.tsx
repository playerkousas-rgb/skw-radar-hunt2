import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Copy, Check, Share2, QrCode, Download,
  Link as LinkIcon, MessageCircle, Mail
} from 'lucide-react';
import { GameMap } from '../lib/types';
import { encodeMapForExport, copyToClipboard, shareMap, playSound } from '../lib/utils';

interface Props {
  map: GameMap;
  onBack: () => void;
}

// Simple QR code using external API with fallback
function QRCodeDisplay({ url, size = 220 }: { url: string; size?: number }) {
  const [error, setError] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&margin=10`;

  if (error) {
    return (
      <div className="bg-slate-800 rounded-xl p-8 flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <QrCode size={48} className="text-slate-600 mb-2" />
        <p className="text-xs text-slate-500 text-center">QR 碼載入失敗<br />請使用連結分享</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-3 rounded-xl inline-block shadow-xl">
      <img
        src={qrUrl}
        alt="QR Code"
        width={size}
        height={size}
        onError={() => setError(true)}
        className="block"
      />
    </div>
  );
}

export default function LeaderExportScreen({ map, onBack }: Props) {
  const [encodedData, setEncodedData] = useState('');
  const [copied, setCopied] = useState<'code' | 'url' | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'qr'>('qr');
  const [shareUrl, setShareUrl] = useState('');
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    const encoded = encodeMapForExport(map);
    setEncodedData(encoded);
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    setShareUrl(`${baseUrl}?import=${encodeURIComponent(encoded)}`);
    setJoinUrl(`${baseUrl}?import=${encodeURIComponent(encoded)}&join=AUTO`);
  }, [map]);

  const handleCopy = async (text: string, type: 'code' | 'url') => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(type);
      playSound('success');
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleShare = async () => {
    await shareMap(map);
  };

  const handleDownload = () => {
    // Create a simple HTML page with the map data for offline sharing
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${map.name} - Radar Hunt</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:sans-serif;padding:20px;max-width:500px;margin:0 auto;background:#0A0E1A;color:#F1F5F9}
h1{color:#00F0FF}pre{background:#111827;padding:15px;border-radius:8px;overflow:auto;word-break:break-all;font-size:11px}
button{background:#00F0FF;color:#0A0E1A;border:none;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:16px;cursor:pointer}
</style></head><body>
<h1>🎯 ${map.name}</h1>
<p>由 ${map.creatorName} 建立</p>
<p>${map.checkpoints.length} 個寶藏點</p>
<p>請安裝 Radar Hunt App 或造訪 ${window.location.origin} 開始尋寶</p>
<p>匯入代碼:</p>
<pre id="code">${encodedData}</pre>
<button onclick="navigator.clipboard.writeText(document.getElementById('code').textContent)">複製代碼</button>
<p style="margin-top:20px;font-size:12px;color:#64748B">Radar Hunt © 2026</p>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${map.name.replace(/\s+/g, '_')}_RadarHunt.html`;
    a.click();
    URL.revokeObjectURL(url);
    playSound('success');
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${map.name.replace(/\s+/g, '_')}_map.json`;
    a.click();
    URL.revokeObjectURL(url);
    playSound('success');
  };

  return (
    <div className="min-h-screen bg-slate-950 safe-area-top">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100">📤 分享地圖</h1>
          <p className="text-xs text-slate-500">{map.name}</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="p-4 pb-24 space-y-5 max-w-md mx-auto">
        {/* Map Info */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-xl flex items-center justify-center text-3xl shrink-0">
            🗺️
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-100 text-lg truncate">{map.name}</h2>
            <p className="text-sm text-slate-400">{map.checkpoints.length} 個寶藏點</p>
            <p className="text-xs text-slate-500">作者: {map.creatorName}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'qr'
                ? 'bg-cyan-500 text-slate-900'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <QrCode size={16} />
            QR 碼
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'code'
                ? 'bg-cyan-500 text-slate-900'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <LinkIcon size={16} />
            連結/代碼
          </button>
        </div>

        {/* QR Tab */}
        {activeTab === 'qr' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="flex justify-center">
              <QRCodeDisplay url={joinUrl} size={220} />
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
              <p className="text-sm text-emerald-400 font-medium">💡 讓成員掃描此 QR 碼</p>
              <p className="text-xs text-emerald-200/70 mt-1">掃描後自動匯入地圖並進入加入流程</p>
            </div>
            <button
              onClick={() => handleCopy(joinUrl, 'url')}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors flex items-center justify-center gap-2"
            >
              {copied === 'url' ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
              {copied === 'url' ? '已複製！' : '複製加入連結'}
            </button>
          </motion.div>
        )}

        {/* Code Tab */}
        {activeTab === 'code' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Shareable Link */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <label className="text-sm text-slate-400 mb-2 block">🔗 分享連結（含地圖）</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono truncate"
                />
                <button
                  onClick={() => handleCopy(shareUrl, 'url')}
                  className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors shrink-0"
                >
                  {copied === 'url' ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            {/* Export Code */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <label className="text-sm text-slate-400 mb-2 block">📝 匯入代碼（文字分享）</label>
              <textarea
                value={encodedData}
                readOnly
                rows={4}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono break-all resize-none"
              />
              <button
                onClick={() => handleCopy(encodedData, 'code')}
                className="mt-2 w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                {copied === 'code' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                {copied === 'code' ? '已複製' : '複製代碼'}
              </button>
            </div>

            {/* Download options */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadJSON}
                className="py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Download size={16} />
                JSON 檔案
              </button>
              <button
                onClick={handleDownload}
                className="py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Download size={16} />
                離網頁
              </button>
            </div>
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
              <Share2 size={22} className="text-cyan-400" />
              <span className="text-[10px] text-slate-400">系統</span>
            </button>
            <button
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`🎯 來玩 Radar Hunt 尋寶！${map.name} - ${joinUrl}`)}`, '_blank')}
              className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <MessageCircle size={22} className="text-emerald-400" />
              <span className="text-[10px] text-slate-400">WhatsApp</span>
            </button>
            <button
              onClick={() => window.open(`mailto:?subject=Radar Hunt 尋寶邀請 - ${map.name}&body=${encodeURIComponent(`來參加 ${map.name} 尋寶遊戲！\n${joinUrl}`)}`, '_blank')}
              className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <Mail size={22} className="text-amber-400" />
              <span className="text-[10px] text-slate-400">郵件</span>
            </button>
            <button
              onClick={() => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(`🎯 來玩 Radar Hunt 尋寶！${map.name} - ${joinUrl}`)}`, '_blank')}
              className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <span className="text-2xl">💚</span>
              <span className="text-[10px] text-slate-400">LINE</span>
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <h3 className="font-bold text-amber-400 text-sm mb-2">💡 如何讓成員加入</h3>
          <ol className="text-xs text-amber-200/80 space-y-1 list-decimal list-inside">
            <li>點「開房間」按鈕建立多人遊戲房間</li>
            <li>分享房間代碼或 QR 碼給所有成員</li>
            <li>成員進入遊戲後輸入代碼加入房間</li>
            <li>你按下「開始」後會倒數同步出發</li>
            <li>成員完成後出示驗證碼，你輸入即成績</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
