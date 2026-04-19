import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, MapPin, Trash2, Navigation, 
  Type, Image as ImageIcon, Smile, Link, Target,
  X, Search
} from 'lucide-react';
import { GameMap, Checkpoint, CHECKPOINT_TYPES, CheckpointType, EMOJI_LIST } from '../lib/types';
import { saveMaps, loadMaps } from '../lib/storage';
import { generateId, playSound } from '../lib/utils';
import LiveMapView from '../components/LiveMapView';
import GlowButton from '../components/GlowButton';

interface Props {
  map: GameMap;
  onBack: () => void;
  onMapUpdated?: (map: GameMap) => void;
}

export default function LeaderEditScreen({ map, onBack, onMapUpdated }: Props) {
  const [currentMap, setCurrentMap] = useState<GameMap>(map);
  const [showForm, setShowForm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Form fields
  const [cpLat, setCpLat] = useState('');
  const [cpLng, setCpLng] = useState('');
  const [cpEmoji, setCpEmoji] = useState('🎯');
  const [cpLabel, setCpLabel] = useState('');
  const [cpContent, setCpContent] = useState('');
  const [cpRadius, setCpRadius] = useState('3');
  const [cpHint, setCpHint] = useState('');
  const [cpImageUrl, setCpImageUrl] = useState('');
  const [cpLink, setCpLink] = useState('');
  const [cpType, setCpType] = useState<CheckpointType>('text');

  // Listen for map events
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'map_click') {
          setCpLat(data.lat.toFixed(6));
          setCpLng(data.lng.toFixed(6));
          if (!showForm) setShowForm(true);
        }
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [showForm]);

  const saveMap = async (updated: GameMap) => {
    setCurrentMap(updated);
    onMapUpdated?.(updated);
    const maps = await loadMaps();
    const idx = maps.findIndex((m) => m.id === updated.id);
    if (idx >= 0) maps[idx] = updated;
    else maps.push(updated);
    await saveMaps(maps);
  };

  const resetForm = () => {
    setCpLat('');
    setCpLng('');
    setCpEmoji('🎯');
    setCpLabel('');
    setCpContent('');
    setCpRadius('3');
    setCpHint('');
    setCpImageUrl('');
    setCpLink('');
    setCpType('text');
  };

  const addCheckpoint = async () => {
    const lat = parseFloat(cpLat);
    const lng = parseFloat(cpLng);
    const radius = parseInt(cpRadius) || 3;

    if (isNaN(lat) || isNaN(lng)) {
      alert('請先在地圖上點擊選擇位置');
      return;
    }

    let content = '';
    let imageUrl = '';

    switch (cpType) {
      case 'text':
        content = cpContent;
        break;
      case 'image':
        imageUrl = cpImageUrl;
        break;
      case 'link':
        content = cpLink;
        break;
      case 'emoji':
        content = cpEmoji;
        break;
    }

    const newCP: Checkpoint = {
      id: generateId(),
      latitude: lat,
      longitude: lng,
      emoji: cpEmoji,
      label: cpLabel || `寶藏 ${currentMap.checkpoints.length + 1}`,
      content,
      imageUrl: imageUrl || undefined,
      radius,
      hint: cpHint || undefined,
      type: cpType,
      order: currentMap.checkpoints.length,
    };

    const updated = {
      ...currentMap,
      checkpoints: [...currentMap.checkpoints, newCP],
    };

    if (updated.checkpoints.length === 1) {
      updated.centerLat = lat;
      updated.centerLng = lng;
    }

    await saveMap(updated);
    resetForm();
    setShowForm(false);
    playSound('success');
  };

  const quickDrop = async () => {
    const lat = parseFloat(cpLat);
    const lng = parseFloat(cpLng);
    if (isNaN(lat) || isNaN(lng)) {
      alert('請先在地圖上點擊選擇位置');
      return;
    }

    const newCP: Checkpoint = {
      id: generateId(),
      latitude: lat,
      longitude: lng,
      emoji: '📍',
      label: `寶藏 ${currentMap.checkpoints.length + 1}`,
      content: '',
      radius: 3,
      order: currentMap.checkpoints.length,
      type: 'text',
    };

    const updated = {
      ...currentMap,
      checkpoints: [...currentMap.checkpoints, newCP],
    };

    await saveMap(updated);
    setCpLat('');
    setCpLng('');
    playSound('click');
  };

  const deleteCheckpoint = async (id: string) => {
    if (!confirm('刪除這個寶藏點？')) return;
    const updated = currentMap.checkpoints.filter((cp) => cp.id !== id);
    await saveMap({ ...currentMap, checkpoints: updated });
    playSound('click');
  };

  // Calculate center
  const centerLat = currentMap.checkpoints.length > 0
    ? currentMap.checkpoints.reduce((s, c) => s + c.latitude, 0) / currentMap.checkpoints.length
    : currentMap.centerLat;
  const centerLng = currentMap.checkpoints.length > 0
    ? currentMap.checkpoints.reduce((s, c) => s + c.longitude, 0) / currentMap.checkpoints.length
    : currentMap.centerLng;

  const pendingLat = cpLat ? parseFloat(cpLat) : null;
  const pendingLng = cpLng ? parseFloat(cpLng) : null;

  const getTypeIcon = (type: CheckpointType) => {
    switch (type) {
      case 'text': return <Type size={14} />;
      case 'image': return <ImageIcon size={14} />;
      case 'emoji': return <Smile size={14} />;
      case 'link': return <Link size={14} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100 truncate max-w-[150px]">{currentMap.name}</h1>
          <p className="text-xs text-slate-500">{currentMap.checkpoints.length} 個寶藏點</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Map - Fixed height 60% of screen */}
      <div className="h-[60vh] shrink-0 relative">
        <LiveMapView
          checkpoints={currentMap.checkpoints}
          userLat={centerLat}
          userLng={centerLng}
          zoomRange={500}
          foundIds={[]}
          showUser={false}
          interactive={true}
          height="100%"
          darkMode={true}
          leaderMode={true}
          pendingLat={pendingLat}
          pendingLng={pendingLng}
          pendingEmoji={cpEmoji}
          pendingRadius={parseInt(cpRadius) || 3}
        />

        {/* Quick action overlay */}
        {cpLat && cpLng && (
          <div className="absolute top-4 left-4 right-4 flex gap-2">
            <button
              onClick={quickDrop}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900 py-2 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
            >
              <Navigation size={16} />
              快速放置
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex-1 bg-slate-800/90 border border-cyan-500/50 text-cyan-400 hover:bg-slate-700 py-2 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              詳細設定
            </button>
          </div>
        )}

        {/* Selected coordinate */}
        {cpLat && cpLng && (
          <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-cyan-500/30 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-400">已選位置</p>
            <p className="text-sm text-cyan-400 font-mono">
              {parseFloat(cpLat).toFixed(5)}, {parseFloat(cpLng).toFixed(5)}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Panel - Treasure List */}
      <div className="flex-1 bg-slate-900 border-t border-slate-800 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-slate-300">
            📋 寶藏點清單 ({currentMap.checkpoints.length})
          </h3>
          <button
            onClick={() => { setCpLat(''); setCpLng(''); }}
            className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1"
          >
            清除選擇
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {currentMap.checkpoints.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Target size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">點擊上方地圖放置寶藏</p>
              <p className="text-xs mt-1 text-slate-600">可使用搜尋功能尋找地點</p>
            </div>
          ) : (
            currentMap.checkpoints.map((cp, idx) => (
              <motion.div
                key={cp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl border border-slate-700"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-lg flex items-center justify-center text-xl shrink-0">
                  {cp.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-cyan-400 font-mono">#{idx + 1}</span>
                    <span className="font-semibold text-slate-200 truncate">{cp.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {getTypeIcon(cp.type)}
                    <span>{CHECKPOINT_TYPES.find(t => t.type === cp.type)?.label}</span>
                    <span className="text-slate-600">•</span>
                    <span>{cp.radius}m 半徑</span>
                  </div>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    {cp.latitude.toFixed(5)}, {cp.longitude.toFixed(5)}
                  </p>
                </div>
                <button
                  onClick={() => deleteCheckpoint(cp.id)}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 size={18} className="text-red-400" />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-lg bg-slate-900 rounded-t-3xl border-t border-slate-700 max-h-[70vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-100">📍 詳細設定</h2>
                  <button 
                    onClick={() => { setShowForm(false); resetForm(); }}
                    className="p-2 hover:bg-slate-800 rounded-lg"
                  >
                    <X size={22} className="text-slate-400" />
                  </button>
                </div>

                {/* Position */}
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">已選位置</p>
                  <p className="text-lg text-cyan-400 font-mono">
                    {cpLat ? parseFloat(cpLat).toFixed(6) : '--'}, {cpLng ? parseFloat(cpLng).toFixed(6) : '--'}
                  </p>
                </div>

                {/* Emoji & Name */}
                <div className="flex gap-3">
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-14 h-14 bg-slate-800 rounded-xl text-2xl flex items-center justify-center border border-slate-700 hover:border-cyan-500 transition-colors"
                    >
                      {cpEmoji}
                    </button>
                    
                    {showEmojiPicker && (
                      <div className="absolute top-full mt-2 left-0 bg-slate-800 border border-slate-700 rounded-xl p-3 grid grid-cols-8 gap-2 z-20 w-64 max-h-48 overflow-y-auto">
                        {EMOJI_LIST.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => { setCpEmoji(emoji); setShowEmojiPicker(false); }}
                            className="text-xl hover:bg-slate-700 rounded p-1"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">寶藏名稱</label>
                    <input
                      type="text"
                      value={cpLabel}
                      onChange={(e) => setCpLabel(e.target.value)}
                      placeholder="給寶藏起個名字..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-2">
                  {CHECKPOINT_TYPES.map((type) => (
                    <button
                      key={type.type}
                      onClick={() => setCpType(type.type)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        cpType === type.type
                          ? 'bg-cyan-500/20 border-cyan-500'
                          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-2xl">{type.icon}</span>
                      <div className="font-semibold text-slate-200 text-sm mt-1">{type.label}</div>
                    </button>
                  ))}
                </div>

                {/* Type-specific fields */}
                {cpType === 'text' && (
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">文字內容</label>
                    <textarea
                      value={cpContent}
                      onChange={(e) => setCpContent(e.target.value)}
                      placeholder="輸入提示、謊語或任何內容..."
                      rows={3}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                {cpType === 'image' && (
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">圖片連結</label>
                    <input
                      type="url"
                      value={cpImageUrl}
                      onChange={(e) => setCpImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                {cpType === 'link' && (
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">網址連結</label>
                    <input
                      type="url"
                      value={cpLink}
                      onChange={(e) => setCpLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                {cpType === 'emoji' && (
                  <div className="bg-slate-800 rounded-xl p-4 text-center">
                    <p className="text-sm text-slate-400 mb-2">到達後顯示的表情</p>
                    <span className="text-4xl">{cpEmoji}</span>
                  </div>
                )}

                {/* Radius */}
                <div>
                  <label className="text-xs text-slate-500 mb-2 block">
                    觸發半徑: {cpRadius}m
                  </label>
                  <div className="flex gap-2">
                    {['1', '2', '3', '5', '10', '20', '50'].map((r) => (
                      <button
                        key={r}
                        onClick={() => setCpRadius(r)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          cpRadius === r
                            ? 'bg-cyan-500 text-slate-900'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {r}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hint */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    尋寶提示（選填）
                  </label>
                  <input
                    type="text"
                    value={cpHint}
                    onChange={(e) => setCpHint(e.target.value)}
                    placeholder="幫助成員找到寶藏的提示..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-4">
                  <GlowButton
                    title="取消"
                    onClick={() => { setShowForm(false); resetForm(); }}
                    variant="ghost"
                    size="md"
                    className="flex-1"
                  />
                  <GlowButton
                    title="添加寶藏"
                    onClick={addCheckpoint}
                    variant="primary"
                    size="md"
                    className="flex-[2]"
                    disabled={!cpLat || !cpLng}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
