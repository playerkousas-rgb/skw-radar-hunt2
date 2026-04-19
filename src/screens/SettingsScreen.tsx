import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, Vibrate, Map, Wifi, Palette, Globe, Moon, Info, ExternalLink } from 'lucide-react';
import { ViewType } from '../lib/types';
import type { UserSettings } from '../lib/types';
import { loadSettings, saveSettings } from '../lib/storage';

interface Props {
  onBack: () => void;
  onChangeView: (view: ViewType) => void;
}

export default function SettingsScreen({ onBack }: Props) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    const data = await loadSettings();
    setSettings(data);
    setLoading(false);
  };

  const updateSetting = async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const settingGroups = [
    {
      title: '通知與回饋',
      items: [
        {
          id: 'soundEnabled',
          icon: Volume2,
          label: '音效提醒',
          description: '接近寶藏時播放提示音',
          value: settings.soundEnabled,
        },
        {
          id: 'vibrationEnabled',
          icon: Vibrate,
          label: '震動反饋',
          description: '找到寶藏時震動提示',
          value: settings.vibrationEnabled,
        },
      ],
    },
    {
      title: '地圖與定位',
      items: [
        {
          id: 'backgroundTracking',
          icon: Map,
          label: '背景定位',
          description: '背景中繼續追蹤位置',
          value: settings.backgroundTracking,
        },
        {
          id: 'offlineMaps',
          icon: Wifi,
          label: '離線地圖',
          description: '下載地圖以供離線使用',
          value: settings.offlineMaps,
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
          description: '增強文字與元素對比度',
          value: settings.highContrast,
        },
        {
          id: 'language',
          icon: Globe,
          label: '語言',
          description: settings.language === 'zh' ? '中文' : 'English',
          value: settings.language,
          isSelect: true,
          options: [
            { value: 'zh', label: '中文' },
            { value: 'en', label: 'English' },
          ],
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
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

      <div className="p-4 pb-24 space-y-6">
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
                  </div>
                  {'isSelect' in item ? (
                    <select
                      value={item.value as string}
                      onChange={(e) => updateSetting(item.id as keyof UserSettings, e.target.value as any)}
                      className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      {item.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => updateSetting(item.id as keyof UserSettings, !item.value as any)}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        item.value ? 'bg-cyan-500' : 'bg-slate-700'
                      }`}
                    >
                      <motion.div
                        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
                        animate={{ left: item.value ? 'calc(100% - 1.5rem)' : '0.25rem' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="pt-6 border-t border-slate-800"
        >
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <Info size={16} />
            <span className="text-sm">Radar Hunt v1.0</span>
          </div>
          <p className="text-center text-xs text-slate-600 mt-1">
            城市尋寶雷達 © 2026
          </p>
        </motion.div>
      </div>
    </div>
  );
}
