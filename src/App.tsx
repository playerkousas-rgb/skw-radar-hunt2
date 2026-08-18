import { useState, useEffect, useRef, useCallback } from 'react';
import { RoleType, ViewType, GameMap, GameSession, SessionPlayer, PlayerResult, UserSettings } from './lib/types';
import {
  loadRole, saveRole, loadActiveMap, saveActiveMap,
  loadFoundCheckpoints, saveFoundCheckpoints, recordFoundCheckpoint,
  addTreasureHistory, clearFoundCheckpoints,
  updateUserStats, loadUserStats, loadSettings, saveSettings,
  unlockAchievement, saveActiveSession, loadActiveSession,
  addPlayerResult, loadLeaderboard, addLeaderboardEntry, saveSessionToHistory,
  loadFoundLog,
} from './lib/storage';
import TreasureLogScreen from './screens/TreasureLogScreen';
import {
  calculateDistance, playSound,
  vibrateDevice, generateId, generateRoomCode, generateVerificationCode,
  filterGPS, createGPSFilter, mapChecksum, encodeMapForExport, decodeMapFromExport,
} from './lib/utils';

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

  // Parse URL for import / start signal / join
  const parseURLParams = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const result: { import?: string; start?: string; join?: string } = {};
    if (params.get('import')) result.import = params.get('import')!;
    if (params.get('start')) result.start = params.get('start')!;
    if (params.get('join')) result.join = params.get('join')!;
    return result;
  }, []);

  useEffect(() => {
    initApp();
    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

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
        map.id = generateId();
        map.createdAt = Date.now();
        await saveActiveMap(map);
        setActiveMap(map);

        // If start signal is also present, go straight to countdown
        if (urlParams.start && tryStartCountdown(map, urlParams.join, urlParams.start)) {
          checkGPSPermission();
          return;
        }

        // Otherwise go to join or import screen
        setRole('member');
        await saveRole('member');
        if (urlParams.join && urlParams.join !== 'AUTO') {
          sessionStorage.setItem('pendingJoinCode', urlParams.join.toUpperCase());
        }
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
    const now = Date.now();
    if (startTime > now) {
      // Countdown to start
      setCountdown(Math.ceil((startTime - now) / 1000));
      setView('member-waiting');
    } else {
      // Start immediately
      huntStartTime.current = startTime;
      totalDistance.current = 0;
      lastPosition.current = null;
      gpsFilter.current = createGPSFilter();
      setFoundCheckpoints([]);
      await saveFoundCheckpoints(map.id, []);
      setActiveMap(map);
      setView('member-radar');
      if (gpsPermission !== 'granted') setShowGPSModal(true);
      return;
    }

    // Tick countdown
    const tick = () => {
      const remaining = startTime - Date.now();
      if (remaining <= 0) {
        setCountdown(null);
        huntStartTime.current = startTime;
        totalDistance.current = 0;
        lastPosition.current = null;
        gpsFilter.current = createGPSFilter();
        setFoundCheckpoints([]);
        saveFoundCheckpoints(map.id, []);
        // Update session status
        const running: GameSession = { ...sess, status: 'running' };
        saveActiveSession(running);
        setSession(running);
        setActiveMap(map);
        setView('member-radar');
        if (settings.soundEnabled) playSound('success');
        if (settings.vibrationEnabled) vibrateDevice([100, 50, 200]);
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
    const unfound = activeMap.checkpoints.filter(cp => !foundCheckpoints.includes(cp.id));

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

  const completeHunt = async (finalFound?: string[]) => {
    if (!activeMap) return;
    const finalFoundList = finalFound || foundCheckpoints;
    const startTime = huntStartTime.current || Date.now();
    const finishTime = Date.now();
    const timeSpent = Math.max(1, Math.floor((finishTime - startTime) / 1000));
    const dist = Math.floor(totalDistance.current);

    const historyEntry = {
      id: generateId(),
      mapId: activeMap.id,
      mapName: activeMap.name,
      completedAt: finishTime,
      checkpointsFound: finalFoundList.length,
      totalCheckpoints: activeMap.checkpoints.length,
      timeSpent,
      distanceWalked: dist,
    };

    await addTreasureHistory(historyEntry);

    // Leaderboard entry
    await addLeaderboardEntry({
      id: playerId,
      playerName: settings.playerName || '尋寶者',
      mapId: activeMap.id,
      mapName: activeMap.name,
      checkpointsFound: finalFoundList.length,
      totalCheckpoints: activeMap.checkpoints.length,
      timeSpent,
      completedAt: finishTime,
      distanceWalked: dist,
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
      const savedMap = await loadActiveMap();
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
    await saveRole(null);
    await saveActiveSession(null);
    setRole(null);
    setView('role-select');
    setActiveMap(null);
    setFoundCheckpoints([]);
    setSession(null);
    huntStartTime.current = 0;
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

  // Join session by code (member)
  const handleJoinSession = async (code: string, map: GameMap) => {
    await saveActiveMap(map);
    setActiveMap(map);
    await saveFoundCheckpoints(map.id, []);
    setFoundCheckpoints([]);

    const newPlayer: SessionPlayer = {
      id: playerId,
      name: settings.playerName || '尋寶者',
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
            initialCode={sessionStorage.getItem('pendingJoinCode') || ''}
          />
        ) : view === 'member-waiting' && session && activeMap ? (
          <MemberWaitingScreen
            session={session}
            map={activeMap}
            playerName={settings.playerName}
            currentLocation={currentLocation}
            gpsAccuracy={currentLocation.accuracy}
            onBack={() => setView('role-select')}
            onStartNow={() => startCountdown(Date.now(), activeMap, session)}
          />
        ) : view === 'member-radar' && activeMap ? (
          <RadarScreen
            map={activeMap}
            currentLocation={currentLocation}
            foundCheckpoints={foundCheckpoints}
            onBack={() => setView('role-select')}
            onChangeView={setView}
            gpsEnabled={gpsPermission === 'granted'}
            session={session}
            startTime={huntStartTime.current}
            onFinishHunt={() => completeHunt(foundCheckpoints)}
          />
        ) : view === 'result' && finalResult ? (
          <ResultScreen
            result={finalResult}
            session={session}
            onBackToHome={handleLogout}
            onPlayAgain={() => {
              setFinalResult(null);
              setView('member-radar');
              huntStartTime.current = session?.startTime && session.startTime < Date.now() + 60000
                ? session.startTime
                : Date.now();
              totalDistance.current = 0;
              setFoundCheckpoints([]);
              if (activeMap) saveFoundCheckpoints(activeMap.id, []);
            }}
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
