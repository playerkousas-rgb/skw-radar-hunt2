import { Checkpoint, GameMap, LeaderboardEntry, UserSettings, PlayerResult } from './types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Generate a short readable room code (6 chars, no confusing chars)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateRoomCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

// Generate a short verification code for result reporting
export function generateVerificationCode(sessionCode: string): string {
  const tail = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${sessionCode}-${tail}`;
}

// Simple checksum for map data (used for start signal)
export function mapChecksum(map: GameMap): string {
  const str = map.id + map.checkpoints.map(c => `${c.latitude.toFixed(5)}${c.longitude.toFixed(5)}`).join('');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).slice(0, 6);
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function getNearestCheckpoint(
  checkpoints: Checkpoint[],
  lat: number,
  lng: number
): { checkpoint: Checkpoint; distance: number } | null {
  if (checkpoints.length === 0) return null;
  let nearest: Checkpoint = checkpoints[0];
  let minDist = calculateDistance(lat, lng, nearest.latitude, nearest.longitude);
  for (const cp of checkpoints) {
    const dist = calculateDistance(lat, lng, cp.latitude, cp.longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = cp;
    }
  }
  return { checkpoint: nearest, distance: minDist };
}

export function getDirectionAngle(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function getDirectionLabel(angle: number): string {
  const directions = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
  const index = Math.round(angle / 45) % 8;
  return directions[index];
}

// Compact encode/decode for export
export function encodeMapForExport(map: GameMap): string {
  const compact = {
    t: 'rh',
    v: 2,
    id: map.id,
    n: map.name,
    d: map.description,
    c: map.creatorName,
    z: map.zoomRange || 5000,
    p: map.checkpoints.map((cp) => ({
      i: cp.id,
      a: Math.round(cp.latitude * 100000) / 100000,
      o: Math.round(cp.longitude * 100000) / 100000,
      e: cp.emoji,
      l: cp.label,
      x: cp.content || '',
      u: cp.imageUrl || '',
      r: cp.radius,
      h: cp.hint || '',
      t: cp.type || 'text',
      w: cp.reward || '',
    })),
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
}

export function decodeMapFromExport(data: string): GameMap | null {
  try {
    // Try base64 decode first
    let jsonStr: string;
    try {
      jsonStr = decodeURIComponent(escape(atob(data)));
    } catch {
      // Try plain JSON
      jsonStr = data;
    }
    
    const parsed = JSON.parse(jsonStr);

    if (parsed.t === 'rh') {
      return {
        id: parsed.id || generateId(),
        name: parsed.n,
        description: parsed.d || '',
        creatorName: parsed.c || 'Unknown',
        zoomRange: parsed.z || 5000,
        createdAt: Date.now(),
        centerLat: parsed.p?.[0]?.a || 0,
        centerLng: parsed.p?.[0]?.o || 0,
        checkpoints: (parsed.p || []).map((p: any, idx: number) => ({
          id: p.i || generateId(),
          latitude: p.a,
          longitude: p.o,
          emoji: p.e || '📍',
          label: p.l || `寶藏 ${idx + 1}`,
          content: p.x || '',
          imageUrl: p.u || undefined,
          radius: p.r || 50,
          hint: p.h || '',
          type: p.t || 'text',
          reward: p.w || '',
          order: idx,
        })),
      };
    }

    // Legacy format
    if (parsed.checkpoints && Array.isArray(parsed.checkpoints)) {
      return parsed as GameMap;
    }

    return null;
  } catch (e) {
    console.error('Failed to decode map:', e);
    return null;
  }
}

// Generate QR code data
export function generateQRCodeData(map: GameMap): string {
  return encodeMapForExport(map);
}

// Device feedback
export function vibrateDevice(pattern: number | number[] = 50): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

export function playSound(type: 'found' | 'nearby' | 'success' | 'alert' | 'click' = 'found'): void {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  switch (type) {
    case 'found':
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      break;
    case 'nearby':
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
      break;
    case 'success':
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
      break;
    case 'alert':
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      break;
    case 'click':
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
      break;
  }
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Share functionality
export async function shareMap(map: GameMap): Promise<boolean> {
  const data = encodeMapForExport(map);
  const shareData = {
    title: `🎯 ${map.name}`,
    text: `來玩 Radar Hunt 尋寶遊戲！\n地圖: ${map.name}\n寶藏點數: ${map.checkpoints.length}\n作者: ${map.creatorName}`,
    url: `${window.location.origin}?import=${encodeURIComponent(data)}`,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// Generate leaderboard rank
export function getRankBadge(rank: number): { color: string; label: string } {
  if (rank === 1) return { color: 'bg-yellow-400 text-yellow-900', label: '🥇 冠軍' };
  if (rank === 2) return { color: 'bg-gray-300 text-gray-800', label: '🥈 亞軍' };
  if (rank === 3) return { color: 'bg-amber-600 text-amber-100', label: '🥉 季軍' };
  if (rank <= 10) return { color: 'bg-cyan-500/20 text-cyan-400', label: '🏆 Top 10' };
  return { color: 'bg-slate-700 text-slate-400', label: `#${rank}` };
}

// ========== GPS Accuracy Improvements ==========

// Kalman-like simple 1D filter for smoothing GPS positions
export interface GPSFilter {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  variance: number;
}

export function createGPSFilter(): GPSFilter {
  return { lat: 0, lng: 0, accuracy: 999, timestamp: 0, variance: 1000 };
}

export function filterGPS(
  filter: GPSFilter,
  lat: number,
  lng: number,
  accuracy: number,
  timestamp: number,
  maxSpeedMps = 10 // running speed ~10 m/s, anything faster likely GPS error
): { lat: number; lng: number; accuracy: number; filtered: boolean } {
  if (filter.timestamp === 0 || accuracy > 100) {
    // First fix or very bad accuracy: accept directly
    filter.lat = lat;
    filter.lng = lng;
    filter.accuracy = accuracy;
    filter.timestamp = timestamp;
    filter.variance = accuracy * accuracy;
    return { lat, lng, accuracy, filtered: false };
  }

  const dt = (timestamp - filter.timestamp) / 1000;
  if (dt <= 0) return { lat: filter.lat, lng: filter.lng, accuracy: filter.accuracy, filtered: true };

  // Predict: assume stationary with growing uncertainty
  const predictionVariance = filter.variance + (dt * maxSpeedMps) * (dt * maxSpeedMps);
  
  // Distance from predicted
  const dist = calculateDistance(filter.lat, filter.lng, lat, lng);
  const maxExpectedDist = maxSpeedMps * dt + accuracy;
  
  // Outlier detection: reject if moved impossibly fast and accuracy is bad
  if (dist > maxExpectedDist * 2 && accuracy > filter.accuracy * 1.5) {
    // Likely GPS jump - ignore
    return { lat: filter.lat, lng: filter.lng, accuracy: filter.accuracy, filtered: true };
  }

  // Kalman gain: trust new measurement based on its accuracy
  const measurementVariance = accuracy * accuracy;
  const K = predictionVariance / (predictionVariance + measurementVariance);
  
  filter.lat = filter.lat + K * (lat - filter.lat);
  filter.lng = filter.lng + K * (lng - filter.lng);
  filter.accuracy = Math.sqrt((1 - K) * predictionVariance);
  filter.variance = (1 - K) * predictionVariance;
  filter.timestamp = timestamp;

  return { lat: filter.lat, lng: filter.lng, accuracy: filter.accuracy, filtered: K < 0.5 };
}

// Calculate GPS accuracy quality level
export function getGPSQuality(accuracy: number | undefined): { level: 'excellent' | 'good' | 'fair' | 'poor'; color: string; label: string; icon: string } {
  if (!accuracy || accuracy > 50) return { level: 'poor', color: 'text-red-400', label: '訊號弱', icon: '📶' };
  if (accuracy > 20) return { level: 'fair', color: 'text-amber-400', label: '一般', icon: '📶' };
  if (accuracy > 10) return { level: 'good', color: 'text-emerald-400', label: '良好', icon: '📶' };
  return { level: 'excellent', color: 'text-cyan-400', label: '極佳', icon: '📡' };
}

// Compass / heading helpers (device orientation)
export function getBearingFromDeviceOrientation(alpha: number | null, webkitCompassHeading?: number | null): number | null {
  // iOS uses webkitCompassHeading (true heading)
  if (webkitCompassHeading != null && !isNaN(webkitCompassHeading)) {
    return webkitCompassHeading;
  }
  // Android: alpha is rotation around Z axis but relative to when orientation was first obtained
  if (alpha != null && !isNaN(alpha)) {
    // Rough approximation (alpha=0 means north on some devices, east on others)
    return (360 - alpha) % 360;
  }
  return null;
}

// Compress result into shareable code
export function encodeResult(result: PlayerResult): string {
  const compact = {
    c: result.verificationCode,
    n: result.playerName,
    m: result.mapName,
    t: result.timeSpent,
    f: result.checkpointsFound,
    tot: result.totalCheckpoints,
    d: Math.round(result.distanceWalked),
    s: result.startTime,
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
}

export function decodeResult(encoded: string): PlayerResult | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const p = JSON.parse(json);
    return {
      playerId: p.c,
      playerName: p.n,
      mapId: '',
      mapName: p.m,
      startTime: p.s,
      finishTime: p.s + p.t * 1000,
      timeSpent: p.t,
      checkpointsFound: p.f,
      totalCheckpoints: p.tot,
      distanceWalked: p.d,
      verificationCode: p.c,
    };
  } catch {
    return null;
  }
}
