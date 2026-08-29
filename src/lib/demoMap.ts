import { GameMap, Checkpoint, CheckpointType } from './types';
import { generateId } from './utils';

/**
 * 模擬示範用的自動生成地圖。
 * 讓測試者（或領袖）不需真實 GPS 即可體驗完整流程：
 * 領袖設置一張地圖 → 扮演玩家用模擬定位走訪每個寶藏。
 */

function offsetMeters(lat: number, lng: number, dLatM: number, dLngM: number): { lat: number; lng: number } {
  const dLat = dLatM / 111320;
  const dLng = dLngM / (111320 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

interface DemoCP {
  emoji: string;
  label: string;
  radius: number;
  dx: number; // meters east (+)
  dy: number; // meters north (+)
  hint?: string;
  points?: number;
  type?: CheckpointType;
  content?: string;
}

const DEMO_POINTS: DemoCP[] = [
  { emoji: '🚩', label: '起點大樹', radius: 30, dx: 50, dy: 0, hint: '草地旁的榕樹下' },
  { emoji: '⭐', label: '涼亭寶藏', radius: 25, dx: -10, dy: 100, hint: '湖邊涼亭的柱子旁' },
  { emoji: '💎', label: '噴水池', radius: 20, dx: -130, dy: 70, hint: '廣場中央噴水池', points: 5 },
  { emoji: '🏆', label: '大門雕像', radius: 25, dx: -70, dy: -80, hint: '入口處的雕像底座' },
  { emoji: '🎁', label: '終點禮物', radius: 20, dx: 90, dy: -50, hint: '終點旗幟下', points: 10, type: 'link', content: 'https://example.com/radar-hunt' },
];

/**
 * 建立一張「示範尋寶地圖」（位於台北，座標只作模擬用途）。
 */
export function createDemoMap(): GameMap {
  const base = { lat: 25.033, lng: 121.565 };
  const checkpoints: Checkpoint[] = DEMO_POINTS.map((d, i) => {
    const p = offsetMeters(base.lat, base.lng, d.dy, d.dx);
    return {
      id: generateId(),
      latitude: p.lat,
      longitude: p.lng,
      emoji: d.emoji,
      label: d.label,
      radius: d.radius,
      hint: d.hint || '',
      points: d.points && d.points > 0 ? d.points : 1,
      order: i,
      type: d.type || 'text',
      content: d.content || `這是「${d.label}」的內容訊息。`,
    };
  });

  return {
    id: generateId(),
    name: '🌳 示範尋寶地圖',
    description: '自動生成的示範地圖，用於體驗完整流程（領袖設置 → 玩家尋寶）。位置僅供模擬，非真實景點。',
    creatorName: '示範領袖',
    createdAt: Date.now(),
    centerLat: base.lat,
    centerLng: base.lng,
    zoomRange: 3000,
    gameMode: 'score',
    timingMode: 'stopwatch',
    showUserLocation: true,
    nearbyHints: true,
    checkpoints,
  };
}
