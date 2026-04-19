import { useState, useEffect, useRef } from 'react';
import { RoleType, ViewType, GameMap } from './lib/types';
import { 
  loadRole, saveRole, loadActiveMap, saveActiveMap, 
  loadFoundCheckpoints, saveFoundCheckpoints, addTreasureHistory,
  updateUserStats, loadUserStats, loadSettings,
  unlockAchievement
} from './lib/storage';
import { 
  calculateDistance, playSound, 
  vibrateDevice, generateId
} from './lib/utils';

// Screens
import RoleSelectScreen from './screens/RoleSelectScreen';
import LeaderHomeScreen from './screens/LeaderHomeScreen';
import LeaderEditScreen from './screens/LeaderEditScreen';
import LeaderExportScreen from './screens/LeaderExportScreen';
import MemberImportScreen from './screens/MemberImportScreen';
import RadarScreen from './screens/RadarScreen';
import AchievementsScreen from './screens/AchievementsScreen';
import SettingsScreen from './screens/SettingsScreen';
import GPSPermissionModal from './components/GPSPermissionModal';

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
  const [settings, setSettings] = useState({ soundEnabled: true, vibrationEnabled: true, playerName: '尋寶者' });

  const watchId = useRef<number | null>(null);
  const huntStartTime = useRef<number>(0);
  const totalDistance = useRef<number>(0);
  const lastPosition = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    const [savedRole, savedMap, userSettings] = await Promise.all([
      loadRole(),
      loadActiveMap(),
      loadSettings(),
    ]);

    setRole(savedRole);
    setSettings(userSettings);
    
    if (savedMap) setActiveMap(savedMap);
    setLoading(false);

    // Check URL for import
    const params = new URLSearchParams(window.location.search);
    if (params.get('import')) {
      setRole('member');
      setView('member-import');
      checkGPSPermission();
      return;
    }

    if (savedRole === 'leader') {
      setView('leader-home');
    } else if (savedRole === 'member') {
      if (savedMap) {
        setView('member-radar');
        loadFoundCheckpoints(savedMap.id).then(setFoundCheckpoints);
      } else {
        setView('member-import');
      }
    }

    checkGPSPermission();
  };

  const checkGPSPermission = () => {
    if (!navigator.geolocation) {
      setGpsPermission('denied');
      setShowGPSModal(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsPermission('granted');
        startTracking();
      },
      (err) => {
        setGpsPermission(err.code === 1 ? 'denied' : 'prompt');
        setShowGPSModal(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const requestGPSPermission = async () => {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
        });
      });
      setCurrentLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
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
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        if (lastPosition.current) {
          totalDistance.current += calculateDistance(
            lastPosition.current.lat, lastPosition.current.lng,
            newLoc.lat, newLoc.lng
          );
        }
        lastPosition.current = { lat: newLoc.lat, lng: newLoc.lng };
        setCurrentLocation(newLoc);
        checkCheckpointArrival(newLoc);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const checkCheckpointArrival = async (loc: { lat: number; lng: number }) => {
    if (!activeMap || gpsPermission !== 'granted') return;
    const unfound = activeMap.checkpoints.filter(cp => !foundCheckpoints.includes(cp.id));
    
    for (const cp of unfound) {
      const dist = calculateDistance(loc.lat, loc.lng, cp.latitude, cp.longitude);
      if (dist <= cp.radius) {
        const newFound = [...foundCheckpoints, cp.id];
        setFoundCheckpoints(newFound);
        await saveFoundCheckpoints(activeMap.id, newFound);
        if (settings.soundEnabled) playSound('found');
        if (settings.vibrationEnabled) vibrateDevice([100, 50, 100, 50, 200]);
        if (newFound.length === activeMap.checkpoints.length) await completeHunt();
        break;
      }
    }
  };

  const completeHunt = async () => {
    if (!activeMap) return;
    const timeSpent = Math.floor((Date.now() - huntStartTime.current) / 1000);
    
    await addTreasureHistory({
      id: generateId(),
      mapId: activeMap.id,
      mapName: activeMap.name,
      completedAt: Date.now(),
      checkpointsFound: foundCheckpoints.length + 1,
      totalCheckpoints: activeMap.checkpoints.length,
      timeSpent,
      distanceWalked: Math.floor(totalDistance.current),
    });

    const stats = await loadUserStats();
    await updateUserStats({
      ...stats,
      totalCheckpointsFound: stats.totalCheckpointsFound + foundCheckpoints.length + 1,
      totalDistanceWalked: stats.totalDistanceWalked + Math.floor(totalDistance.current),
      currentStreak: stats.currentStreak + 1,
      longestStreak: Math.max(stats.longestStreak, stats.currentStreak + 1),
    });

    await unlockAchievement('first_treasure');
    if (foundCheckpoints.length + 1 >= 10) await unlockAchievement('treasure_hunter');
    if (timeSpent <= 300) await unlockAchievement('speed_runner');
    if (foundCheckpoints.length + 1 === activeMap.checkpoints.length) await unlockAchievement('perfect_run');
    
    playSound('success');
    vibrateDevice([100, 50, 100, 50, 200, 100, 300]);
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
    setRole(null);
    setView('role-select');
    setActiveMap(null);
    setFoundCheckpoints([]);
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

      {view === 'role-select' || !role ? (
        <RoleSelectScreen 
          onSelectRole={handleSelectRole} 
          currentRole={role}
          onLogout={role ? handleLogout : undefined}
        />
      ) : role === 'leader' ? (
        view === 'leader-home' ? (
          <LeaderHomeScreen
            onBack={() => setView('role-select')}
            onEditMap={(map) => { setActiveMap(map); setView('leader-edit'); }}
            onExportMap={(map) => { setActiveMap(map); setView('leader-export'); }}
            onViewLeaderboard={() => {}}
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
        ) : (
          <LeaderHomeScreen
            onBack={() => setView('role-select')}
            onEditMap={(map) => { setActiveMap(map); setView('leader-edit'); }}
            onExportMap={(map) => { setActiveMap(map); setView('leader-export'); }}
            onViewLeaderboard={() => {}}
          />
        )
      ) : (
        view === 'member-import' ? (
          <MemberImportScreen
            onBack={() => setView('role-select')}
            onMapImported={(map) => {
              setActiveMap(map);
              saveActiveMap(map);
              setView('member-radar');
              huntStartTime.current = Date.now();
              totalDistance.current = 0;
              loadFoundCheckpoints(map.id).then(setFoundCheckpoints);
              if (gpsPermission !== 'granted') setShowGPSModal(true);
            }}
          />
        ) : view === 'member-radar' && activeMap ? (
          <RadarScreen
            map={activeMap}
            currentLocation={currentLocation}
            foundCheckpoints={foundCheckpoints}
            onBack={() => setView('role-select')}
            onChangeView={setView}
            gpsEnabled={gpsPermission === 'granted'}
          />
        ) : view === 'achievements' ? (
          <AchievementsScreen onBack={() => setView('member-radar')} onChangeView={setView} />
        ) : view === 'settings' ? (
          <SettingsScreen onBack={() => setView('member-radar')} onChangeView={setView} />
        ) : (
          <MemberImportScreen
            onBack={() => setView('role-select')}
            onMapImported={(map) => {
              setActiveMap(map);
              saveActiveMap(map);
              setView('member-radar');
              huntStartTime.current = Date.now();
              totalDistance.current = 0;
              loadFoundCheckpoints(map.id).then(setFoundCheckpoints);
            }}
          />
        )
      )}
    </>
  );
}

export default App;
