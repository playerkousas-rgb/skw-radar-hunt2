export interface Checkpoint {
  id: string;
  latitude: number;
  longitude: number;
  emoji: string;
  label: string;
  content?: string;
  imageUrl?: string;
  radius: number;
  hint?: string;
  found?: boolean;
  order: number;
  type: 'text' | 'image' | 'emoji' | 'link'; // 4種寶藏類型
  reward?: string; // 額外獎勵內容
}

export interface GameMap {
  id: string;
  name: string;
  description: string;
  checkpoints: Checkpoint[];
  createdAt: number;
  creatorName: string;
  centerLat: number;
  centerLng: number;
  zoomRange?: number;
  isPublic?: boolean;
  password?: string;
}

export type RoleType = 'leader' | 'member' | null;
export type TabType = 'radar' | 'live' | 'list';
export type ViewType = 'role-select' | 'leader-home' | 'leader-edit' | 'leader-export' | 
                       'member-import' | 'member-radar' | 'member-map' | 'member-list' | 
                       'achievements' | 'history' | 'settings';

export type CheckpointType = 'text' | 'image' | 'emoji' | 'link';

export const CHECKPOINT_TYPES: { type: CheckpointType; label: string; icon: string; description: string }[] = [
  { type: 'text', label: '文字寶藏', icon: '📝', description: '到達後顯示文字訊息' },
  { type: 'image', label: '圖片寶藏', icon: '🖼️', description: '到達後顯示圖片' },
  { type: 'emoji', label: '表情寶藏', icon: '🎭', description: '到達後顯示特殊表情' },
  { type: 'link', label: '連結寶藏', icon: '🔗', description: '到達後顯示網址連結' },
];

export interface UserAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  progress: number;
  maxProgress: number;
}

export interface TreasureHistory {
  id: string;
  mapId: string;
  mapName: string;
  completedAt: number;
  checkpointsFound: number;
  totalCheckpoints: number;
  timeSpent: number;
  distanceWalked: number;
}

export interface UserStats {
  totalMapsPlayed: number;
  totalMapsCreated: number;
  totalCheckpointsFound: number;
  totalDistanceWalked: number;
  favoriteMap?: string;
  currentStreak: number;
  longestStreak: number;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  mapId: string;
  mapName: string;
  checkpointsFound: number;
  totalCheckpoints: number;
  timeSpent: number;
  completedAt: number;
  distanceWalked: number;
}

export const ZOOM_PRESETS = [
  { label: '室內', value: 50, icon: '🏠' },
  { label: '大樓', value: 200, icon: '🏢' },
  { label: '公園', value: 500, icon: '🌳' },
  { label: '校園', value: 1000, icon: '🏫' },
  { label: '社區', value: 3000, icon: '🏘️' },
  { label: '城市', value: 10000, icon: '🌆' },
  { label: '地區', value: 30000, icon: '🗺️' },
];

export const EMOJI_LIST = [
  '🏁', '⭐', '💎', '🔑', '🎯', '🏆', '🎪', '🎭',
  '🚀', '🌟', '💡', '🔮', '🎲', '🎮', '🏴‍☠️', '🗺️',
  '📍', '🔥', '❤️', '🌈', '⚡', '🎵', '🍀', '👑',
  '🎁', '🔔', '🌸', '🦊', '🐉', '🌙', '☀️', '🍕',
  '🧩', '🎈', '💰', '🏅', '🌺', '🦋', '🐾', '🔱',
];

export const ACHIEVEMENTS: UserAchievement[] = [
  { id: 'first_treasure', name: '初次探索', description: '找到第一個寶藏', icon: '🎯', progress: 0, maxProgress: 1 },
  { id: 'treasure_hunter', name: '尋寶獵人', description: '找到10個寶藏', icon: '🏆', progress: 0, maxProgress: 10 },
  { id: 'master_hunter', name: '大師獵人', description: '找到50個寶藏', icon: '👑', progress: 0, maxProgress: 50 },
  { id: 'speed_runner', name: '速通達人', description: '5分鐘內完成一張地圖', icon: '⚡', progress: 0, maxProgress: 1 },
  { id: 'marathon', name: '跑者', description: '總距離超過10公里', icon: '🏃', progress: 0, maxProgress: 10000 },
  { id: 'creator', name: '創作者', description: '創建3張地圖', icon: '🗺️', progress: 0, maxProgress: 3 },
  { id: 'perfect_run', name: '完美尋寶', description: '100%完成一張地圖', icon: '💎', progress: 0, maxProgress: 1 },
  { id: 'social_butterfly', name: '社交達人', description: '分享3次成就', icon: '🦋', progress: 0, maxProgress: 3 },
];

export interface UserSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  backgroundTracking: boolean;
  offlineMaps: boolean;
  highContrast: boolean;
  language: 'zh' | 'en';
  playerName: string;
}
