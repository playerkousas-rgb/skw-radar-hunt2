import { 
  GameMap, RoleType, TreasureHistory, UserStats, UserAchievement, 
  ACHIEVEMENTS, LeaderboardEntry, UserSettings, GameSession, SessionPlayer, PlayerResult
} from './types';

const MAPS_KEY = 'treasure_maps';
const ACTIVE_MAP_KEY = 'active_map';
const ROLE_KEY = 'user_role';
const FOUND_KEY = 'found_checkpoints';
const HISTORY_KEY = 'treasure_history';
const STATS_KEY = 'user_stats';
const ACHIEVEMENTS_KEY = 'user_achievements';
const SETTINGS_KEY = 'user_settings';
const LEADERBOARD_KEY = 'leaderboard';
const SESSION_KEY = 'active_session';
const RESULTS_KEY = 'session_results';
const SAVED_SESSIONS_KEY = 'saved_sessions';

// Maps
export async function saveMaps(maps: GameMap[]): Promise<void> {
  localStorage.setItem(MAPS_KEY, JSON.stringify(maps));
}

export async function loadMaps(): Promise<GameMap[]> {
  const raw = localStorage.getItem(MAPS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function deleteMap(mapId: string): Promise<void> {
  const maps = await loadMaps();
  const filtered = maps.filter(m => m.id !== mapId);
  await saveMaps(filtered);
}

// Active Map
export async function saveActiveMap(map: GameMap | null): Promise<void> {
  if (map) {
    localStorage.setItem(ACTIVE_MAP_KEY, JSON.stringify(map));
  } else {
    localStorage.removeItem(ACTIVE_MAP_KEY);
  }
}

export async function loadActiveMap(): Promise<GameMap | null> {
  const raw = localStorage.getItem(ACTIVE_MAP_KEY);
  return raw ? JSON.parse(raw) : null;
}

// Role
export async function saveRole(role: RoleType): Promise<void> {
  if (role) {
    localStorage.setItem(ROLE_KEY, role);
  } else {
    localStorage.removeItem(ROLE_KEY);
  }
}

export async function loadRole(): Promise<RoleType> {
  const raw = localStorage.getItem(ROLE_KEY);
  return (raw as RoleType) || null;
}

// Found Checkpoints
interface FoundLogEntry { id: string; time: number; }

export async function saveFoundCheckpoints(mapId: string, ids: string[]): Promise<void> {
  localStorage.setItem(`${FOUND_KEY}_${mapId}`, JSON.stringify(ids));
}

export async function recordFoundCheckpoint(mapId: string, id: string): Promise<string[]> {
  const existing = await loadFoundCheckpoints(mapId);
  if (existing.includes(id)) return existing;
  const updated = [...existing, id];
  localStorage.setItem(`${FOUND_KEY}_${mapId}`, JSON.stringify(updated));
  // Also save log with timestamps
  const logKey = `found_log_${mapId}`;
  const existingLogRaw = localStorage.getItem(logKey);
  const log: FoundLogEntry[] = existingLogRaw ? JSON.parse(existingLogRaw) : [];
  log.push({ id, time: Date.now() });
  localStorage.setItem(logKey, JSON.stringify(log));
  return updated;
}

export async function loadFoundCheckpoints(mapId: string): Promise<string[]> {
  const raw = localStorage.getItem(`${FOUND_KEY}_${mapId}`);
  return raw ? JSON.parse(raw) : [];
}

export async function loadFoundLog(mapId: string): Promise<FoundLogEntry[]> {
  const raw = localStorage.getItem(`found_log_${mapId}`);
  return raw ? JSON.parse(raw) : [];
}

export async function clearFoundCheckpoints(mapId: string): Promise<void> {
  localStorage.removeItem(`${FOUND_KEY}_${mapId}`);
  localStorage.removeItem(`found_log_${mapId}`);
}

// History
export async function addTreasureHistory(history: TreasureHistory): Promise<void> {
  const existing = await loadTreasureHistory();
  const updated = [history, ...existing];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function loadTreasureHistory(): Promise<TreasureHistory[]> {
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

// User Stats
export async function saveUserStats(stats: UserStats): Promise<void> {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export async function loadUserStats(): Promise<UserStats> {
  const raw = localStorage.getItem(STATS_KEY);
  return raw ? JSON.parse(raw) : {
    totalMapsPlayed: 0,
    totalMapsCreated: 0,
    totalCheckpointsFound: 0,
    totalDistanceWalked: 0,
    currentStreak: 0,
    longestStreak: 0,
  };
}

export async function updateUserStats(updates: Partial<UserStats>): Promise<UserStats> {
  const current = await loadUserStats();
  const updated = { ...current, ...updates };
  await saveUserStats(updated);
  return updated;
}

// Achievements
export async function loadAchievements(): Promise<UserAchievement[]> {
  const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
  if (!raw) return [...ACHIEVEMENTS];
  const saved = JSON.parse(raw);
  return ACHIEVEMENTS.map(base => ({
    ...base,
    ...saved.find((s: UserAchievement) => s.id === base.id),
  }));
}

export async function saveAchievements(achievements: UserAchievement[]): Promise<void> {
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
}

export async function unlockAchievement(id: string): Promise<void> {
  const achievements = await loadAchievements();
  const index = achievements.findIndex(a => a.id === id);
  if (index !== -1 && !achievements[index].unlockedAt) {
    achievements[index].unlockedAt = Date.now();
    achievements[index].progress = achievements[index].maxProgress;
    await saveAchievements(achievements);
  }
}

export async function updateAchievementProgress(id: string, progress: number): Promise<void> {
  const achievements = await loadAchievements();
  const index = achievements.findIndex(a => a.id === id);
  if (index !== -1 && !achievements[index].unlockedAt) {
    achievements[index].progress = Math.min(progress, achievements[index].maxProgress);
    if (achievements[index].progress >= achievements[index].maxProgress) {
      achievements[index].unlockedAt = Date.now();
    }
    await saveAchievements(achievements);
  }
}

// Settings
const DEFAULT_SETTINGS: UserSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  backgroundTracking: false,
  offlineMaps: false,
  highContrast: false,
  language: 'zh',
  playerName: '尋寶者',
  compassCalibrated: false,
  gpsHighAccuracy: true,
};

export async function loadSettings(): Promise<UserSettings> {
  const raw = localStorage.getItem(SETTINGS_KEY);
  return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Leaderboard
export async function addLeaderboardEntry(entry: LeaderboardEntry): Promise<void> {
  const existing = await loadLeaderboard();
  const updated = [...existing, entry]
    .sort((a, b) => {
      // Sort by score (capture-points; falls back to found-count), then by time
      const scoreA = a.score ?? a.checkpointsFound;
      const scoreB = b.score ?? b.checkpointsFound;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.timeSpent - b.timeSpent;
    })
    .slice(0, 100); // Keep top 100
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
}

export async function loadLeaderboard(mapId?: string): Promise<LeaderboardEntry[]> {
  const raw = localStorage.getItem(LEADERBOARD_KEY);
  const all = raw ? JSON.parse(raw) : [];
  if (mapId) {
    return all.filter((e: LeaderboardEntry) => e.mapId === mapId);
  }
  return all;
}

export async function getPlayerRank(playerId: string, mapId?: string): Promise<number> {
  const entries = await loadLeaderboard(mapId);
  const index = entries.findIndex(e => e.id === playerId);
  return index === -1 ? -1 : index + 1;
}

// ========== Session / Multiplayer ==========

export async function saveActiveSession(session: GameSession | null): Promise<void> {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export async function loadActiveSession(): Promise<GameSession | null> {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function addPlayerResult(result: PlayerResult): Promise<void> {
  const existing = await loadAllResults();
  const updated = [result, ...existing];
  localStorage.setItem(RESULTS_KEY, JSON.stringify(updated));
}

export async function loadAllResults(): Promise<PlayerResult[]> {
  const raw = localStorage.getItem(RESULTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function loadResultsForSession(sessionCode: string): Promise<PlayerResult[]> {
  const all = await loadAllResults();
  // Verification codes start with session code prefix
  return all.filter(r => r.verificationCode.startsWith(sessionCode));
}

// Save multiple sessions for leader to track
export async function saveSessionToHistory(session: GameSession): Promise<void> {
  const existing = await loadSavedSessions();
  const updated = [session, ...existing.filter(s => s.code !== session.code)].slice(0, 50);
  localStorage.setItem(SAVED_SESSIONS_KEY, JSON.stringify(updated));
}

export async function loadSavedSessions(): Promise<GameSession[]> {
  const raw = localStorage.getItem(SAVED_SESSIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function deleteSavedSession(code: string): Promise<void> {
  const existing = await loadSavedSessions();
  const updated = existing.filter(s => s.code !== code);
  localStorage.setItem(SAVED_SESSIONS_KEY, JSON.stringify(updated));
}
