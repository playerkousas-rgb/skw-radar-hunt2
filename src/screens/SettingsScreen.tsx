import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, Vibrate, Map, Wifi, Palette, Globe, User, Save } from 'lucide-react';
import { ViewType, UserSettings } from '../lib/types';
import { loadSettings, saveSettings } from '../lib/storage';
import GlowButton from '../components/GlowButton';

interface Props {
  onBack: () => void;
  onChangeView: (view: ViewType) => void;
  onSaveSettings?: (settings: UserSettings) => void;
  currentSettings?: UserSettings;
}

export default function SettingsScreen({ onBack, onSaveSettings, currentSettings }: Props) {
  const [settings, setSettings] = useState<UserSettings | null>(currentSettings || null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    } else {
      loadSettingsData();
    }
  }, [currentSettings]);

  const loadSettingsData = async () => {
    const data = await loadSettings();
    setSettings(data);
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    if (!settings) return;
    await saveSettings(settings);
    onSaveSettings?.(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const settingGroups = [
    {
      title: '個人資料',
      items: [
        {
          id: 'playerName',
          icon: User,
          label: '玩家名稱',
          description: '排行榜和驗證時顯示',
          type: 'text' as const,
          value: settings.playerName,
        },
      ],
    },
    {
      title: '通知與回饋',
      items: [
        {
          id: 'soundEnabled',
          icon: Volume2,
          label: '音效提醒',
          description: '接近寶藏時播放提示音',
          type: 'toggle' as const,
          value: settings.soundEnabled,
        },
        {
          id: 'vibrationEnabled',
          icon: Vibrate,
          label: '震動反饋',
          description: '找到寶藏時震動提示',
          type: 'toggle' as const,
          value: settings.vibrationEnabled,
        },
      ],
    },
    {
      title: '定位與地圖',
      items: [
        {
          id: 'gpsHighAccuracy',
          icon: Map,
          label: '高精度 GPS',
          description: '使用更精確的定位（耗電較高）',
          type: 'toggle' as const,
          value: settings.gpsHighAccuracy ?? true,
        },
        {
          id: 'backgroundTracking',
          icon: Wifi,
          label: '背景定位',
          description: '背景中繼續追蹤位置',
          type: 'toggle' as const,
          value: settings.backgroundTracking,
        },
      ],
    },
    {
      title: '外觀',
      items: [
        {
          id: 'highContrast',
          icon: Palette,
          label: '高對比模式',
          description: '強化戶外陽光下的可見度',
          type: 'toggle' as const,
          value: settings.highContrast,
        },
        {
          id: 'language',
          icon: Globe,
          label: '語言',
          description: settings.language === 'zh' ? '中文' : 'English',
          type: 'select' as const,
          value: settings.language,
          options: [
            { value: 'zh', label: '中文' },
            { value: 'en', label: 'English' },
          ],
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 safe-area-top">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-slate-100">設定</h1>
        </div>
        <div className="w-10" />
      </div>

      <div className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
        {settingGroups.map((group, groupIndex) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
          >
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
              {group.title}
            </h2>
            <div className="space-y-2">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700"
                >
                  <div className="p-2.5 bg-slate-700/50 rounded-lg">
                    <item.icon size={20} className="text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-200">{item.label}</h3>
                    <p className="text-xs text-slate-500">{item.description}</p>
                    {item.type === 'text' && (
                      <input
                        type="text"
                        value={item.value as string}
                        onChange={(e) => updateSetting(item.id as keyof UserSettings, e.target.value as never)}
                        className="mt-2 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-sm"
                        placeholder="輸入你的名字"
                        maxLength={20}
                      />
                    )}
                  </div>
                  {item.type === 'toggle' && (
                    <button
                      onClick={() => updateSetting(item.id as keyof UserSettings, !item.value as never)}
                      className={`relative w-12 h-7 rounded-full transition-colors ${item.value ? 'bg-cyan-500' : 'bg-slate-700'
                        }`}
                    >
                      <motion.div
                        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
                        animate={{ left: item.value ? 'calc(100% - 1.5rem)' : '0.25rem' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  )}
                  {item.type === 'select' && (
                    <select
                      value={item.value as string}
                      onChange={(e) => updateSetting(item.id as keyof UserSettings, e.target.value as never)}
                      className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      {item.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Save */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="pt-4"
        >
          <GlowButton
            title={saved ? '✓ 已儲存' : '儲存設定'}
            onClick={handleSave}
            variant="primary"
            size="lg"
            className="w-full"
            icon={<Save size={20} />}
          />
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="pt-6 border-t border-slate-800 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <span className="text-sm">Radar Hunt v2.0</span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            GPS 尋寶雷達 © 2026 SKWSCOUT
          </p>
        </motion.div>
      </div>
    </div>
  );
}
