import { useState, useEffect, useRef, useCallback } from 'react';
import { RoleType, ViewType, GameMap, GameSession, SessionPlayer, PlayerResult, UserSettings } from './lib/types';
import {
  loadRole, saveRole, loadActiveMap, saveActiveMap,
  loadFoundCheckpoints, saveFoundCheckpoints, recordFoundCheckpoint,
  addTreasureHistory, clearFoundCheckpoints,
  updateUserStats, loadUserStats, loadSettings, saveSettings,
  unlockAchievement, saveActiveSession, loadActiveSession,
  addPlayerResult, addLeaderboardEntry, saveSessionToHistory,
} from './lib/storage';
import TreasureLogScreen from './screens/TreasureLogScreen';
import {
  calculateDistance, playSound,
  vibrateDevice, generateId, generateRoomCode, generateVerificationCode,
  filterGPS, createGPSFilter, mapChecksum, encodeMapForExport, decodeMapFromExport,
  sumCheckpointPoints, getNearestCheckpoint,
} from './lib/utils';
import { createDemoMap } from './lib/demoMap';

// Screens
import RoleSelectScreen from './screens/RoleSelectScreen';
import LeaderHomeScreen from './screens/LeaderHomeScreen';
import LeaderEditScreen from './screens/LeaderEditScreen';
import LeaderExportScreen from './screens/LeaderExportScreen';
import LeaderSessionScreen from './screens/LeaderSessionScreen';
import MemberImportScreen from './screens/MemberImportScreen';
import MemberJoinScreen from './screens/MemberJoinScreen';
import MemberWaitingScreen from './screens/MemberWaitingScreen';
import RadarScreen from './screens/RadarScreen';
import ResultScreen from './screens/ResultScreen';
import AchievementsScreen from './screens/AchievementsScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import HelpScreen from './screens/HelpScreen';
import GPSPermissionModal from './components/GPSPermissionModal';
import CountdownOverlay from './components/CountdownOverlay';

import './App.css';

function App() {
  const [role, setRole] = useState<RoleType>(null);
  const [view, setView] = useState<ViewType>('role-select');
  const [activeMap, setActiveMap] = useState<GameMap | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; accuracy?: number }>({
    lat: 25.033,
    lng: 121.565,
  });
  const [gpsPermission, setGpsPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [showGPSModal, setShowGPSModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [foundCheckpoints, setFoundCheckpoints] = useState<string[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    soundEnabled: true,
    vibrationEnabled: true,
    playerName: '尋寶者',
    gpsHighAccuracy: true,
    compassCalibrated: false,
    backgroundTracking: false,
    offlineMaps: false,
    highContrast: false,
    language: 'zh',
  });

  // Session state
  const [session, setSession] = useState<GameSession | null>(null);
  const [playerId, setPlayerId] = useState<string>(generateId());
  const [countdown, setCountdown] = useState<number | null>(null);
  const [finalResult, setFinalResult] = useState<PlayerResult | null>(null);

  const watchId = useRef<number | null>(null);
  const huntStartTime = useRef<number>(0);
  const totalDistance = useRef<number>(0);
  const lastPosition = useRef<{ lat: number; lng: number } | null>(null);
  const gpsFilter = useRef(createGPSFilter());

  // ===== Mock / demo mode (no real GPS needed) =====
  const [mockMode, setMockMode] = useState(false);
  const mockInterval = useRef<number | null>(null);
  const foundRef = useRef<Set<string>>(new Set());
  const activeMapRef = useRef<GameMap | null>(null);
  const currentLocationRef = useRef(currentLocation);
  const checkArrivalRef = useRef<(loc: { lat: number; lng: number; accuracy?: number }) => void>(() => {});

  // Keep refs in sync with latest state so the mock tick always reads fresh data
  useEffect(() => { foundRef.current = new Set(foundCheckpoints); }, [foundCheckpoints]);
  useEffect(() => { activeMapRef.current = activeMap; }, [activeMap]);
  useEffect(() => { currentLocationRef.current = currentLocation; }, [currentLocation]);

  const stopMockEngine = () => {
    if (mockInterval.current !== null) {
      clearInterval(mockInterval.current);
      mockInterval.current = null;
    }
  };

  // Auto-walk the "member" through the unfound checkpoints and let the normal
  // arrival logic trigger finds — this simulates playing once end-to-end.
  const mockTick = () => {
    const map = activeMapRef.current;
    if (!map) return;
    const cur = currentLocationRef.current;
    const unfound = map.checkpoints.filter(cp => !foundRef.current.has(cp.id));
    if (unfound.length === 0) { stopMockEngine(); return; }

    const mode = map.gameMode || 'free';
    // 越野式必須依序；其他模式取最近未尋寶藏
    const nearest = getNearestCheckpoint(unfound, cur.lat, cur.lng);
    const target = mode === 'course' ? unfound[0] : (nearest?.checkpoint || unfound[0]);

    const speedMps = 35;         // 模擬步行速度（加快以利測試）
    const dtSec = 0.3;           // tick 間隔（秒）
    const d = calculateDistance(cur.lat, cur.lng, target.latitude, target.longitude);
    const step = Math.min(d, speedMps * dtSec);
    const f = d > 0 ? step / d : 0;
    let nlat = cur.lat + (target.latitude - cur.lat) * f;
    let nlng = cur.lng + (target.longitude - cur.lng) * f;

    // 已進入觸發範圍 → 直接對齊寶藏點，令抵達邏輯觸發
    const trig = Math.max(target.radius, 5);
    if (d <= trig) { nlat = target.latitude; nlng = target.longitude; }

    const newLoc = { lat: nlat, lng: nlng, accuracy: 5 };
    setCurrentLocation(newLoc);
    currentLocationRef.current = newLoc;

    // 累計模擬步行距離
    if (lastPosition.current && huntStartTime.current > 0) {
      totalDistance.current += calculateDistance(
        lastPosition.current.lat, lastPosition.current.lng, newLoc.lat, newLoc.lng
      );
    }
    lastPosition.current = { lat: nlat, lng: nlng };

    checkArrivalRef.current(newLoc);
  };

  const startMockEngine = () => {
    stopMockEngine();
    mockInterval.current = window.setInterval(mockTick, 300);
  };

  // 模擬「領袖設置一張地圖 → 成員自動遊玩一次」的完整示範流程
  const startMockHunt = async (demoMap: GameMap) => {
    if (watchId.current) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
    stopMockEngine();

    await saveRole('member'); setRole('member');
    await saveActiveMap(demoMap); setActiveMap(demoMap); activeMapRef.current = demoMap;
    await saveFoundCheckpoints(demoMap.id, []); setFoundCheckpoints([]); foundRef.current = new Set();
    await saveActiveSession(null); setSession(null);

    setGpsPermission('granted'); setShowGPSModal(false);
    setMockMode(true);

    const startTime = Date.now();
    huntStartTime.current = startTime;
    totalDistance.current = 0;
    lastPosition.current = null;
    gpsFilter.current = createGPSFilter();

    const center = {
      lat: demoMap.centerLat || demoMap.checkpoints[0]?.latitude || currentLocation.lat,
      lng: demoMap.centerLng || demoMap.checkpoints[0]?.longitude || currentLocation.lng,
    };
    const initLoc = { lat: center.lat, lng: center.lng, accuracy: 5 };
    setCurrentLocation(initLoc);
    currentLocationRef.current = initLoc;
    lastPosition.current = { lat: initLoc.lat, lng: initLoc.lng };

    setView('member-radar');
    if (settings.soundEnabled) playSound('click');
    startMockEngine();
  };

  // Parse URL for import / start signal / join
  const parseURLParams = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const result: { import?: string; start?: string; join?: string; auto?: string } = {};
    if (params.get('import')) result.import = params.get('import')!;
    if (params.get('start')) result.start = params.get('start')!;
    if (params.get('join')) result.join = params.get('join')!;
    if (params.get('auto')) result.auto = params.get('auto')!;
    return result;
  }, []);

  useEffect(() => {
    initApp();
    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      if (mockInterval.current) clearInterval(mockInterval.current);
    };
  }, []);

  // Persist the personal-auto-start delay (seconds) from an `&auto=N` link param
  const stashAutoStart = (raw?: string) => {
    const sec = parseInt(raw || '');
    if (!isNaN(sec) && sec > 0 && sec <= 600) {
      sessionStorage.setItem('autoStartSec', String(sec));
    }
  };

  const initApp = async () => {
    const [savedRole, savedMap, userSettings, savedSession] = await Promise.all([
      loadRole(),
      loadActiveMap(),
      loadSettings(),
      loadActiveSession(),
    ]);

    setRole(savedRole);
    setSettings(userSettings);

    if (savedMap) setActiveMap(savedMap);
    if (savedSession) setSession(savedSession);
    setLoading(false);

    const urlParams = parseURLParams();

    // Helper: handle start signal for a given map + join code
    const tryStartCountdown = (map: GameMap, joinCode?: string, startSignal?: string) => {
      if (!startSignal) return false;
      try {
        const signal = JSON.parse(decodeURIComponent(atob(startSignal)));
        if (signal.mapChecksum === mapChecksum(map)) {
          const code = joinCode || signal.code || 'AUTO';
          const newSession: GameSession = {
            code,
            mapId: map.id,
            mapName: map.name,
            creatorName: '領袖',
            createdAt: Date.now(),
            startTime: signal.startTime,
            players: [{
              id: playerId,
              name: userSettings.playerName || '尋寶者',
              joinedAt: Date.now(),
              ready: true,
              finishedAt: null,
            }],
            status: 'starting',
          };
          saveActiveSession(newSession).then(() => {
            setSession(newSession);
          });
          setRole('member');
          saveRole('member');
          setActiveMap(map);
          saveActiveMap(map);
          startCountdown(signal.startTime, map, newSession);
          return true;
        }
      } catch { /* ignore */ }
      return false;
    };

    // Case 1: URL has import (map data) - process first
    if (urlParams.import) {
      const map = decodeMapFromExport(urlParams.import);
      if (map) {
        // If the same map (same coordinates) is already active, keep its id so
        // found-checkpoint progress survives a refresh / re-scanned QR code.
        if (savedMap && mapChecksum(savedMap) === mapChecksum(map)) {
          map.id = savedMap.id;
        } else {
          map.id = generateId();
        }
        map.createdAt = Date.now();
        await saveActiveMap(map);
        setActiveMap(map);

        // If start signal is also present, go straight to countdown
        if (urlParams.start && tryStartCountdown(map, urlParams.join, urlParams.start)) {
          window.history.replaceState({}, '', window.location.pathname);
          checkGPSPermission();
          return;
        }

        // Otherwise go to join or import screen
        setRole('member');
        await saveRole('member');
        if (urlParams.join && urlParams.join !== 'AUTO') {
          sessionStorage.setItem('pendingJoinCode', urlParams.join.toUpperCase());
        }
        if (urlParams.auto) stashAutoStart(urlParams.auto);
        setView('member-join');
        checkGPSPermission();
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }
    }

    // Case 2: Start signal for already-saved map
    if (urlParams.start && savedMap) {
      try {
        const signal = JSON.parse(decodeURIComponent(atob(urlParams.start)));
        if (signal.mapChecksum === mapChecksum(savedMap)) {
          const newSession: GameSession = {
            code: signal.code || (savedSession?.code || 'AUTO'),
            mapId: savedMap.id,
            mapName: savedMap.name,
            creatorName: '領袖',
            createdAt: Date.now(),
            startTime: signal.startTime,
            players: savedSession?.players || [{
              id: playerId,
              name: userSettings.playerName || '尋寶者',
              joinedAt: Date.now(),
              ready: true,
              finishedAt: null,
            }],
            status: 'starting',
          };
          await saveActiveSession(newSession);
          setSession(newSession);
          setRole('member');
          await saveRole('member');
          startCountdown(signal.startTime, savedMap, newSession);
          checkGPSPermission();
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }
      } catch { /* ignore */ }
    }

    // Case 3: Join by room code (no map data yet)
    if (urlParams.join) {
      setRole('member');
      await saveRole('member');
      sessionStorage.setItem('pendingJoinCode', urlParams.join.toUpperCase());
      if (urlParams.auto) stashAutoStart(urlParams.auto);
      setView('member-join');
      checkGPSPermission();
      return;
    }

    // Case 4: Direct map import only
    if (urlParams.import) {
      setRole('member');
      await saveRole('member');
      setView('member-import');
      checkGPSPermission();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (savedRole === 'leader') {
      setView('leader-home');
    } else if (savedRole === 'member') {
      if (savedSession && savedSession.status !== 'finished') {
        if (savedSession.status === 'waiting') {
          setView('member-waiting');
        } else if (savedSession.startTime && savedSession.startTime > Date.now()) {
          setView('member-waiting');
        } else {
          // Active game in session
          if (savedMap) {
            setView('member-radar');
            loadFoundCheckpoints(savedMap.id).then(setFoundCheckpoints);
            // Restore start time
            huntStartTime.current = savedSession.startTime || Date.now();
          } else {
            setView('member-import');
          }
        }
      } else if (savedMap) {
        setView('member-radar');
        loadFoundCheckpoints(savedMap.id).then(setFoundCheckpoints);
      } else {
        setView('member-import');
      }
    }

    checkGPSPermission();
  };

  const startCountdown = async (startTime: number, map: GameMap, sess: GameSession) => {
    const beginHunt = async () => {
      huntStartTime.current = startTime;
      totalDistance.current = 0;
      lastPosition.current = null;
      gpsFilter.current = createGPSFilter();
      setFoundCheckpoints([]);
      await saveFoundCheckpoints(map.id, []);
      // Update session status
      const running: GameSession = { ...sess, status: 'running' };
      await saveActiveSession(running);
      setSession(running);
      setActiveMap(map);
      setView('member-radar');
      if (settings.soundEnabled) playSound('success');
      if (settings.vibrationEnabled) vibrateDevice([100, 50, 200]);
      if (gpsPermission !== 'granted') setShowGPSModal(true);
    };

    const now = Date.now();
    if (startTime > now) {
      // Countdown to start
      setCountdown(Math.ceil((startTime - now) / 1000));
      setView('member-waiting');
    } else {
      // Start immediately
      await beginHunt();
      return;
    }

    // Tick countdown
    const tick = () => {
      const remaining = startTime - Date.now();
      if (remaining <= 0) {
        // Show "GO!" briefly, then dismiss the overlay and begin
        setCountdown(0);
        beginHunt();
        setTimeout(() => setCountdown(null), 900);
        return;
      }
      setCountdown(Math.ceil(remaining / 1000));
      setTimeout(tick, 200);
    };
    setTimeout(tick, 100);
  };

  const checkGPSPermission = () => {
    if (!navigator.geolocation) {
      setGpsPermission('denied');
      setShowGPSModal(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const filtered = filterGPS(gpsFilter.current, pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy || 30, pos.timestamp);
        setCurrentLocation({ lat: filtered.lat, lng: filtered.lng, accuracy: filtered.accuracy });
        setGpsPermission('granted');
        startTracking();
      },
      (err) => {
        setGpsPermission(err.code === 1 ? 'denied' : 'prompt');
        setShowGPSModal(true);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const requestGPSPermission = async () => {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 15000, maximumAge: 0,
        });
      });
      const filtered = filterGPS(gpsFilter.current, pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy || 30, pos.timestamp);
      setCurrentLocation({ lat: filtered.lat, lng: filtered.lng, accuracy: filtered.accuracy });
      setGpsPermission('granted');
      setShowGPSModal(false);
      startTracking();
    } catch {
      setGpsPermission('denied');
    }
  };

  const startTracking = () => {
    if (watchId.current) return;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const filtered = filterGPS(
          gpsFilter.current,
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy || 30,
          pos.timestamp
        );
        const newLoc = { lat: filtered.lat, lng: filtered.lng, accuracy: filtered.accuracy };

        if (lastPosition.current && huntStartTime.current > 0) {
          const moved = calculateDistance(
            lastPosition.current.lat, lastPosition.current.lng,
            newLoc.lat, newLoc.lng
          );
          // Only count movement > accuracy*0.3 to avoid GPS jitter adding fake distance
          if (moved > Math.max(2, (newLoc.accuracy || 10) * 0.3)) {
            totalDistance.current += moved;
            lastPosition.current = { lat: newLoc.lat, lng: newLoc.lng };
          }
        } else if (huntStartTime.current > 0) {
          lastPosition.current = { lat: newLoc.lat, lng: newLoc.lng };
        }

        setCurrentLocation(newLoc);
        checkCheckpointArrival(newLoc);
      },
      () => { },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const checkCheckpointArrival = async (loc: { lat: number; lng: number; accuracy?: number }) => {
    if (!activeMap || gpsPermission !== 'granted') return;
    let unfound = activeMap.checkpoints.filter(cp => !foundCheckpoints.includes(cp.id));
    // 越野式 (course): only the next checkpoint in the leader-set order can trigger
    if ((activeMap.gameMode || 'free') === 'course' && unfound.length > 0) {
      unfound = [unfound[0]];
    }

    for (const cp of unfound) {
      const dist = calculateDistance(loc.lat, loc.lng, cp.latitude, cp.longitude);
      // Require good accuracy to trigger (avoid false triggers from GPS drift)
      const accuracy = loc.accuracy || 50;
      const triggerRadius = Math.max(cp.radius, accuracy * 0.7);
      if (dist <= triggerRadius) {
        // Only record if we haven't just found something (debounce)
        if (foundCheckpoints.includes(cp.id)) break;
        const newFound = await recordFoundCheckpoint(activeMap.id, cp.id);
        setFoundCheckpoints(newFound);
        if (settings.soundEnabled) playSound('found');
        if (settings.vibrationEnabled) vibrateDevice([100, 50, 100, 50, 200]);
        if (newFound.length === activeMap.checkpoints.length) {
          await completeHunt(newFound);
        }
        break;
      }
    }
  };
  // Keep the mock engine pointed at the latest arrival handler (after this definition)
  checkArrivalRef.current = checkCheckpointArrival;

  const completeHunt = async (finalFound?: string[]) => {
    if (!activeMap) return;
    const finalFoundList = finalFound || foundCheckpoints;
    const startTime = huntStartTime.current || Date.now();
    const finishTime = Date.now();
    const timeSpent = Math.max(1, Math.floor((finishTime - startTime) / 1000));
    const dist = Math.floor(totalDistance.current);
    // Capture-points score (default 1 point per checkpoint)
    const score = sumCheckpointPoints(activeMap.checkpoints, finalFoundList);
    const totalScore = sumCheckpointPoints(activeMap.checkpoints);

    const historyEntry = {
      id: generateId(),
      mapId: activeMap.id,
      mapName: activeMap.name,
      completedAt: finishTime,
      checkpointsFound: finalFoundList.length,
      totalCheckpoints: activeMap.checkpoints.length,
      timeSpent,
      distanceWalked: dist,
      score,
      totalScore,
    };

    await addTreasureHistory(historyEntry);

    // Leaderboard entry (unique id per run — the same player can appear multiple times)
    await addLeaderboardEntry({
      id: generateId(),
      playerName: settings.playerName || '尋寶者',
      mapId: activeMap.id,
      mapName: activeMap.name,
      checkpointsFound: finalFoundList.length,
      totalCheckpoints: activeMap.checkpoints.length,
      timeSpent,
      completedAt: finishTime,
      distanceWalked: dist,
      score,
      totalScore,
    });

    // Update stats
    const stats = await loadUserStats();
    await updateUserStats({
      ...stats,
      totalMapsPlayed: stats.totalMapsPlayed + 1,
      totalCheckpointsFound: stats.totalCheckpointsFound + finalFoundList.length,
      totalDistanceWalked: stats.totalDistanceWalked + dist,
      currentStreak: stats.currentStreak + 1,
      longestStreak: Math.max(stats.longestStreak, stats.currentStreak + 1),
    });

    // Achievements
    await unlockAchievement('first_treasure');
    if (finalFoundList.length >= 10) await unlockAchievement('treasure_hunter');
    if (finalFoundList.length === activeMap.checkpoints.length && timeSpent <= 300) await unlockAchievement('speed_runner');
    if (finalFoundList.length === activeMap.checkpoints.length) await unlockAchievement('perfect_run');
    if (dist >= 10000) await unlockAchievement('marathon');

    // Build result (always, even for solo play)
    const sessionCode = session?.code || 'SOLO';
    const result: PlayerResult = {
      playerId,
      playerName: settings.playerName || '尋寶者',
      mapId: activeMap.id,
      mapName: activeMap.name,
      startTime,
      finishTime,
      timeSpent,
      checkpointsFound: finalFoundList.length,
      totalCheckpoints: activeMap.checkpoints.length,
      distanceWalked: dist,
      score,
      totalScore,
      gameMode: activeMap.gameMode || 'free',
      timingMode: activeMap.timingMode || 'stopwatch',
      verificationCode: generateVerificationCode(sessionCode),
    };

    if (session) {
      await addPlayerResult(result);

      // Update session
      const me: SessionPlayer = {
        id: playerId,
        name: settings.playerName || '尋寶者',
        joinedAt: Date.now(),
        ready: true,
        finishedAt: finishTime,
        result,
      };
      const updatedPlayers = session.players.filter(p => p.id !== playerId).concat(me);
      const updatedSession: GameSession = { ...session, players: updatedPlayers, status: 'running' };
      await saveActiveSession(updatedSession);
      setSession(updatedSession);
    }

    playSound('success');
    vibrateDevice([100, 50, 100, 50, 200, 100, 300]);

    setFinalResult(result);
    setView('result');
  };

  const handleSelectRole = async (selectedRole: Exclude<RoleType, null>) => {
    await saveRole(selectedRole);
    setRole(selectedRole);

    if (selectedRole === 'leader') {
      setView('leader-home');
    } else {
      const [savedMap, savedSession] = await Promise.all([loadActiveMap(), loadActiveSession()]);
      // Restore waiting-room context if an active (not yet finished) session exists,
      // so leaving the waiting room via the back button no longer loses it.
      if (savedSession && savedSession.status === 'waiting' && savedMap) {
        setActiveMap(savedMap);
        setSession(savedSession);
        setView('member-waiting');
        if (gpsPermission !== 'granted') setShowGPSModal(true);
        return;
      }
      if (savedSession && savedSession.startTime && savedSession.startTime > Date.now() && savedMap) {
        setActiveMap(savedMap);
        setSession(savedSession);
        setView('member-waiting');
        if (gpsPermission !== 'granted') setShowGPSModal(true);
        return;
      }
      if (savedMap) {
        setActiveMap(savedMap);
        setView('member-radar');
        huntStartTime.current = Date.now();
        totalDistance.current = 0;
        loadFoundCheckpoints(savedMap.id).then(setFoundCheckpoints);
        if (gpsPermission !== 'granted') setShowGPSModal(true);
      } else {
        setView('member-import');
      }
    }
  };

  const handleLogout = async () => {
    stopMockEngine();
    setMockMode(false);
    await saveRole(null);
    await saveActiveSession(null);
    setRole(null);
    setView('role-select');
    setActiveMap(null);
    activeMapRef.current = null;
    setFoundCheckpoints([]);
    foundRef.current = new Set();
    setSession(null);
    setFinalResult(null);
    setCountdown(null);
    huntStartTime.current = 0;
    totalDistance.current = 0;
    lastPosition.current = null;
  };

  // Leave the member radar back to home — must stop the mock engine so it
  // doesn't keep walking (and mutating state) in the background.
  const handleMemberBackToHome = () => {
    stopMockEngine();
    setMockMode(false);
    setView('role-select');
  };

  // Play again — also restart the mock engine when we're in demo mode
  const handlePlayAgain = async () => {
    setFinalResult(null);
    setView('member-radar');
    huntStartTime.current = session?.startTime && session.startTime < Date.now() + 60000
      ? session.startTime
      : Date.now();
    totalDistance.current = 0;
    lastPosition.current = null;
    setFoundCheckpoints([]);
    foundRef.current = new Set();
    if (activeMap) {
      await saveFoundCheckpoints(activeMap.id, []);
      activeMapRef.current = activeMap;
    }
    if (mockMode) startMockEngine();
  };

  // Create a new session from leader side
  const handleCreateSession = async (map: GameMap) => {
    const newSession: GameSession = {
      code: generateRoomCode(),
      mapId: map.id,
      mapName: map.name,
      creatorName: settings.playerName || '領袖',
      createdAt: Date.now(),
      startTime: null,
      players: [{
        id: 'leader',
        name: settings.playerName || '領袖',
        joinedAt: Date.now(),
        ready: true,
        finishedAt: null,
      }],
      status: 'waiting',
    };
    await saveActiveSession(newSession);
    await saveSessionToHistory(newSession);
    setSession(newSession);
    setActiveMap(map);
    setView('leader-session');
  };

  // Personal auto-start mode: member opened a link with &auto=N — join the room
  // and start the hunt after the personal countdown. Time is counted from the
  // member's own start moment, so differing departure times stay fair.
  const handleAutoStartSession = async (map: GameMap, code: string, delaySec: number, name?: string) => {
    let playerName = settings.playerName || '尋寶者';
    if (name && name.trim()) {
      playerName = name.trim().slice(0, 15);
      const existing = await loadSettings();
      await saveSettings({ ...existing, playerName });
      setSettings({ ...existing, playerName });
    }

    await saveActiveMap(map);
    setActiveMap(map);
    await saveFoundCheckpoints(map.id, []);
    setFoundCheckpoints([]);

    const startTime = Date.now() + delaySec * 1000;
    const newSession: GameSession = {
      code: code.toUpperCase(),
      mapId: map.id,
      mapName: map.name,
      creatorName: '領袖',
      createdAt: Date.now(),
      startTime,
      players: [{
        id: playerId,
        name: playerName,
        joinedAt: Date.now(),
        ready: true,
        finishedAt: null,
      }],
      status: 'starting',
    };
    await saveActiveSession(newSession);
    setSession(newSession);
    await startCountdown(startTime, map, newSession);
  };

  // Join session by code (member). Optionally updates the player name first
  // (members can set it on the join screen so the leaderboard isn't full of
  // generic "尋寶者" entries).
  const handleJoinSession = async (code: string, map: GameMap, name?: string) => {
    if (name && name.trim()) {
      const trimmed = name.trim().slice(0, 15);
      const existing = await loadSettings();
      await saveSettings({ ...existing, playerName: trimmed });
      setSettings({ ...existing, playerName: trimmed });
    }
    await saveActiveMap(map);
    setActiveMap(map);
    await saveFoundCheckpoints(map.id, []);
    setFoundCheckpoints([]);

    const newPlayer: SessionPlayer = {
      id: playerId,
      name: (name && name.trim()) ? name.trim().slice(0, 15) : (settings.playerName || '尋寶者'),
      joinedAt: Date.now(),
      ready: false,
      finishedAt: null,
    };

    const newSession: GameSession = {
      code: code.toUpperCase(),
      mapId: map.id,
      mapName: map.name,
      creatorName: '領袖',
      createdAt: Date.now(),
      startTime: null,
      players: [newPlayer],
      status: 'waiting',
    };
    await saveActiveSession(newSession);
    setSession(newSession);
    setView('member-waiting');
  };

  // Clear the member's found progress for the active map (storage + state in sync)
  const handleClearProgress = async () => {
    if (!activeMap) return;
    await clearFoundCheckpoints(activeMap.id);
    setFoundCheckpoints([]);
  };

  // Broadcast channel for same-device/tab sync (testing)
  const bcRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel('radar-hunt-sync');
      bcRef.current.onmessage = (e) => {
        const msg = e.data;
        if (msg?.type === 'start' && activeMap && session && msg.code === session.code) {
          // Received start signal from leader tab
          if (msg.mapChecksum === mapChecksum(activeMap) && msg.startTime > Date.now() - 5000) {
            const newSession: GameSession = { ...session, startTime: msg.startTime, status: 'starting' };
            saveActiveSession(newSession).then(() => {
              setSession(newSession);
              if (view === 'member-waiting' || view === 'member-radar') {
                startCountdown(msg.startTime, activeMap, newSession);
              }
            });
          }
        }
      };
    } catch { /* BroadcastChannel not supported */ }
    return () => { bcRef.current?.close(); };
  }, [activeMap, session, view]);

  // Trigger synchronized start
  const handleStartGame = async (delaySec = 5) => {
    if (!session || !activeMap) return '';
    const startTime = Date.now() + delaySec * 1000;
    const updated: GameSession = { ...session, startTime, status: 'starting' };
    await saveActiveSession(updated);
    await saveSessionToHistory(updated);
    setSession(updated);

    // Broadcast to same-device tabs
    try {
      bcRef.current?.postMessage({
        type: 'start', code: session.code, startTime, mapChecksum: mapChecksum(activeMap)
      });
    } catch { /* ignore */ }

    // Generate start URL with full map data
    const signal = btoa(encodeURIComponent(JSON.stringify({
      code: session.code,
      startTime,
      mapChecksum: mapChecksum(activeMap),
    })));
    const mapData = encodeMapForExport(activeMap);
    return `${window.location.origin}${window.location.pathname}?import=${encodeURIComponent(mapData)}&join=${session.code}&start=${signal}`;
  };

  // Update settings
  const handleSaveSettings = async (newSettings: typeof settings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <>
      {role === 'member' && (
        <GPSPermissionModal
          isOpen={showGPSModal}
          status={gpsPermission}
          onRequestPermission={requestGPSPermission}
          onContinueAnyway={() => setShowGPSModal(false)}
          onMockDemo={() => startMockHunt(createDemoMap())}
        />
      )}

      {countdown !== null && <CountdownOverlay count={countdown} />}

      {view === 'help' ? (
        <HelpScreen
          onBack={() => {
            if (!role) { setView('role-select'); return; }
            if (role === 'leader') { setView('leader-home'); return; }
            if (session?.status === 'waiting' || (session?.startTime && session.startTime > Date.now())) {
              setView('member-waiting');
            } else {
              setView(activeMap ? 'member-radar' : 'member-import');
            }
          }}
          onChangeView={setView}
        />
      ) : view === 'role-select' || !role ? (
        <RoleSelectScreen
          onSelectRole={handleSelectRole}
          currentRole={role}
          onLogout={role ? handleLogout : undefined}
          playerName={settings.playerName}
          onShowHelp={() => setView('help')}
          onMockDemo={() => startMockHunt(createDemoMap())}
        />
      ) : role === 'leader' ? (
        view === 'leader-home' ? (
          <LeaderHomeScreen
            onBack={() => setView('role-select')}
            onEditMap={(map) => { setActiveMap(map); setView('leader-edit'); }}
            onExportMap={(map) => { setActiveMap(map); setView('leader-export'); }}
            onStartSession={handleCreateSession}
            onViewLeaderboard={() => setView('leaderboard')}
            onShowHelp={() => setView('help')}
          />
        ) : view === 'leader-edit' && activeMap ? (
          <LeaderEditScreen
            map={activeMap}
            onBack={() => setView('leader-home')}
            onMapUpdated={setActiveMap}
          />
        ) : view === 'leader-export' && activeMap ? (
          <LeaderExportScreen
            map={activeMap}
            onBack={() => setView('leader-home')}
          />
        ) : view === 'leader-session' && session && activeMap ? (
          <LeaderSessionScreen
            session={session}
            map={activeMap}
            onBack={() => { setView('leader-home'); }}
            onStartGame={handleStartGame}
            onEndSession={async () => {
              await saveActiveSession(null);
              setSession(null);
              setView('leader-home');
            }}
          />
        ) : view === 'leaderboard' ? (
          <LeaderboardScreen onBack={() => setView('leader-home')} />
        ) : (
          <LeaderHomeScreen
            onBack={() => setView('role-select')}
            onEditMap={(map) => { setActiveMap(map); setView('leader-edit'); }}
            onExportMap={(map) => { setActiveMap(map); setView('leader-export'); }}
            onStartSession={handleCreateSession}
            onViewLeaderboard={() => setView('leaderboard')}
            onShowHelp={() => setView('help')}
          />
        )
      ) : (
        view === 'member-import' ? (
          <MemberImportScreen
            onBack={() => setView('role-select')}
            onMapImported={(map, joinCode) => {
              setActiveMap(map);
              saveActiveMap(map);
              const pendingJoin = joinCode || sessionStorage.getItem('pendingJoinCode');
              sessionStorage.removeItem('pendingJoinCode');
              if (pendingJoin && pendingJoin !== 'AUTO') {
                handleJoinSession(pendingJoin, map);
              } else {
                setView('member-radar');
                huntStartTime.current = Date.now();
                totalDistance.current = 0;
                loadFoundCheckpoints(map.id).then(setFoundCheckpoints);
                if (gpsPermission !== 'granted') setShowGPSModal(true);
              }
            }}
          />
        ) : view === 'member-join' ? (
          <MemberJoinScreen
            onBack={() => setView('role-select')}
            onJoinSession={handleJoinSession}
            onOpenImport={() => setView('member-import')}
            onAutoStart={handleAutoStartSession}
            initialCode={sessionStorage.getItem('pendingJoinCode') || ''}
            initialMap={activeMap}
            initialPlayerName={settings.playerName}
          />
        ) : view === 'member-waiting' && session && activeMap ? (
          <MemberWaitingScreen
            session={session}
            map={activeMap}
            playerName={settings.playerName}
            currentLocation={currentLocation}
            gpsAccuracy={currentLocation.accuracy}
            onBack={() => setView('role-select')}
            onStartNow={(startTime?: number) => startCountdown(startTime ?? Date.now(), activeMap, session)}
          />
        ) : view === 'member-radar' && activeMap ? (
          <RadarScreen
            map={activeMap}
            currentLocation={currentLocation}
            foundCheckpoints={foundCheckpoints}
            onBack={handleMemberBackToHome}
            onChangeView={setView}
            gpsEnabled={gpsPermission === 'granted'}
            session={session}
            startTime={huntStartTime.current}
            onClearProgress={handleClearProgress}
            onFinishHunt={() => completeHunt(foundCheckpoints)}
          />
        ) : view === 'result' && finalResult ? (
          <ResultScreen
            result={finalResult}
            session={session}
            onBackToHome={handleLogout}
            onPlayAgain={handlePlayAgain}
          />
        ) : view === 'leaderboard' ? (
          <LeaderboardScreen onBack={() => setView('member-radar')} />
        ) : view === 'treasure-log' && activeMap ? (
          <TreasureLogScreen
            map={activeMap}
            startTime={huntStartTime.current}
            onBack={() => setView('member-radar')}
          />
        ) : view === 'history' ? (
          <HistoryScreen onBack={() => setView('member-radar')} onChangeView={setView} />
        ) : view === 'achievements' ? (
          <AchievementsScreen onBack={() => setView('member-radar')} onChangeView={setView} />
        ) : view === 'settings' ? (
          <SettingsScreen
            onBack={() => setView(session ? 'member-waiting' : 'member-radar')}
            onChangeView={setView}
            onSaveSettings={handleSaveSettings}
            currentSettings={settings}
          />
        ) : (
          <MemberImportScreen
            onBack={() => setView('role-select')}
            onMapImported={(map, joinCode) => {
              setActiveMap(map);
              saveActiveMap(map);
              const pendingJoin = joinCode || sessionStorage.getItem('pendingJoinCode');
              sessionStorage.removeItem('pendingJoinCode');
              if (pendingJoin && pendingJoin !== 'AUTO') {
                handleJoinSession(pendingJoin, map);
              } else {
                setView('member-radar');
                huntStartTime.current = Date.now();
                totalDistance.current = 0;
                loadFoundCheckpoints(map.id).then(setFoundCheckpoints);
              }
            }}
          />
        )
      )}
    </>
  );
}

export default App;
