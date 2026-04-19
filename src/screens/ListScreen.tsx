import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, CheckCircle2, Clock, Filter } from 'lucide-react';
import { GameMap, Checkpoint, ViewType } from '../lib/types';
import { calculateDistance } from '../lib/utils';
import CheckpointCard from '../components/CheckpointCard';
import CPDetailModal from '../components/CPDetailModal';

interface Props {
  map: GameMap;
  currentLocation: { lat: number; lng: number };
  foundCheckpoints: string[];
  onBack: () => void;
  onChangeView: (view: ViewType) => void;
}

type FilterType = 'all' | 'found' | 'unfound';

export default function ListScreen({ map, currentLocation, foundCheckpoints, onBack, onChangeView }: Props) {
  const [detailCP, setDetailCP] = useState<Checkpoint | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const allCPs = useMemo(() => {
    return map.checkpoints
      .map(cp => ({
        ...cp,
        distance: calculateDistance(currentLocation.lat, currentLocation.lng, cp.latitude, cp.longitude),
        isFound: foundCheckpoints.includes(cp.id),
      }))
      .sort((a, b) => {
        if (a.isFound !== b.isFound) return a.isFound ? 1 : -1;
        return a.distance - b.distance;
      });
  }, [map.checkpoints, currentLocation, foundCheckpoints]);

  const filteredCPs = allCPs.filter(cp => {
    if (filter === 'found') return cp.isFound;
    if (filter === 'unfound') return !cp.isFound;
    return true;
  }).filter(cp => 
    cp.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cp.emoji.includes(searchQuery)
  );

  const progress = foundCheckpoints.length / Math.max(map.checkpoints.length, 1);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100">寶藏清單</h1>
          <p className="text-xs text-slate-500">{foundCheckpoints.length}/{map.checkpoints.length} 已找到</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Progress */}
      <div className="h-1 bg-slate-800">
        <motion.div 
          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Search & Filter */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="搜尋寶藏..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex gap-2">
          {[
            { id: 'all', label: '全部', count: allCPs.length },
            { id: 'unfound', label: '待尋', count: allCPs.filter(cp => !cp.isFound).length },
            { id: 'found', label: '已找', count: foundCheckpoints.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as FilterType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded ${filter === tab.id ? 'bg-cyan-500/20' : 'bg-slate-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-3">
          {filteredCPs.map((cp, index) => (
            <CheckpointCard
              key={cp.id}
              checkpoint={cp}
              index={index}
              showDistance={true}
              isFound={cp.isFound}
              onPress={() => setDetailCP(cp)}
            />
          ))}
        </div>

        {filteredCPs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Filter size={48} className="mb-4 opacity-30" />
            <p className="text-sm">沒有符合條件的寶藏點</p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-sm text-slate-300">
                已找到: <span className="font-bold text-emerald-400">{foundCheckpoints.length}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <span className="text-sm text-slate-300">
                剩餘: <span className="font-bold text-amber-400">{map.checkpoints.length - foundCheckpoints.length}</span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-cyan-400">{Math.round(progress * 100)}%</span>
          </div>
        </div>
      </div>

      <CPDetailModal
        visible={!!detailCP}
        checkpoint={detailCP}
        distance={detailCP ? calculateDistance(currentLocation.lat, currentLocation.lng, detailCP.latitude, detailCP.longitude) : 0}
        isFound={detailCP ? foundCheckpoints.includes(detailCP.id) : false}
        onClose={() => setDetailCP(null)}
      />
    </div>
  );
}
