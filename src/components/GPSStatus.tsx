import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
  isTracking?: boolean;
}

export default function GPSStatus({ 
  latitude, 
  longitude, 
  accuracy, 
  permissionStatus,
  isTracking = false 
}: Props) {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (isTracking) {
      const interval = setInterval(() => {
        setPulse((p) => (p + 1) % 3);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isTracking]);

  const getStatusColor = () => {
    switch (permissionStatus) {
      case 'granted':
        return isTracking ? 'text-emerald-400' : 'text-cyan-400';
      case 'denied':
        return 'text-red-400';
      case 'prompt':
        return 'text-amber-400';
      default:
        return 'text-slate-500';
    }
  };

  const getStatusIcon = () => {
    switch (permissionStatus) {
      case 'granted':
        return isTracking ? <Navigation size={16} className="animate-pulse" /> : <CheckCircle2 size={16} />;
      case 'denied':
        return <AlertCircle size={16} />;
      case 'prompt':
        return <MapPin size={16} className="animate-bounce" />;
      default:
        return <MapPin size={16} />;
    }
  };

  const getStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return isTracking ? '定位中' : '已授權';
      case 'denied':
        return '需要授權';
      case 'prompt':
        return '請授權';
      default:
        return '檢測中...';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-3 border border-slate-700"
    >
      <div className="flex items-center justify-between">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${
            permissionStatus === 'granted' ? 'bg-emerald-500/10' : 
            permissionStatus === 'denied' ? 'bg-red-500/10' : 'bg-amber-500/10'
          }`}>
            <span className={getStatusColor()}>
              {getStatusIcon()}
            </span>
          </div>
          <div>
            <div className={`text-sm font-semibold ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            {accuracy !== undefined && (
              <div className="text-xs text-slate-500">
                精度: ±{Math.round(accuracy)}m
              </div>
            )}
          </div>
        </div>

        {/* Signal strength */}
        {permissionStatus === 'granted' && (
          <div className="flex items-end gap-0.5 h-4">
            {[0.4, 0.6, 0.8, 1].map((level, i) => (
              <motion.div
                key={i}
                className="w-1 bg-emerald-400 rounded-sm"
                initial={{ height: 4 }}
                animate={{ 
                  height: isTracking && pulse === i ? 16 : 4 + level * 12,
                  opacity: isTracking ? 1 : 0.5
                }}
                transition={{ duration: 0.2 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Coordinates */}
      {latitude !== undefined && longitude !== undefined && (
        <div className="mt-2 pt-2 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Lat: {latitude.toFixed(6)}</span>
            <span>Lng: {longitude.toFixed(6)}</span>
          </div>
        </div>
      )}

      {/* Permission denied warning */}
      {permissionStatus === 'denied' && (
        <div className="mt-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
          <p className="text-xs text-red-300">
            請在瀏覽器設定中允許位置權限以使用雷達功能
          </p>
        </div>
      )}
    </motion.div>
  );
}
