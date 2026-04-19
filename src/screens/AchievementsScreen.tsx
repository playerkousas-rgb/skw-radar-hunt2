import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Lock, Star, Share2 } from 'lucide-react';
import { UserAchievement } from '../lib/types';
import { loadAchievements, unlockAchievement } from '../lib/storage';
import { ViewType } from '../lib/types';

interface Props {
  onBack: () => void;
  onChangeView: (view: ViewType) => void;
}

export default function AchievementsScreen({ onBack }: Props) {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievementsData();
  }, []);

  const loadAchievementsData = async () => {
    const data = await loadAchievements();
    setAchievements(data);
    setLoading(false);
  };

  const unlockedCount = achievements.filter(a => a.unlockedAt).length;
  const totalCount = achievements.length;
  const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  const handleShare = async (achievement: UserAchievement) => {
    if (navigator.share) {
      await navigator.share({
        title: `🎯 Radar Hunt 成就解鎖！`,
        text: `我剛剛解鎖了「${achievement.name}」成就！${achievement.description}`,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

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
          <h1 className="font-bold text-slate-100">成就徽章</h1>
          <p className="text-xs text-slate-500">{unlockedCount}/{totalCount} 已解鎖</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="p-4 pb-24 space-y-4">
        {/* Progress overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-5 border border-amber-500/20"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-500/20 rounded-2xl">
              <Trophy size={32} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-amber-100">探險家進度</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-sm font-bold text-amber-400">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Achievements grid */}
        <div className="grid grid-cols-1 gap-3">
          {achievements.map((achievement, index) => {
            const isUnlocked = !!achievement.unlockedAt;
            const progressPercent = (achievement.progress / achievement.maxProgress) * 100;
            
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative p-4 rounded-xl border transition-all ${
                  isUnlocked
                    ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30'
                    : 'bg-slate-800/50 border-slate-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-xl ${
                    isUnlocked ? 'bg-amber-500/20' : 'bg-slate-700/50'
                  }`}>
                    <span className="text-2xl">{achievement.icon}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold ${isUnlocked ? 'text-amber-100' : 'text-slate-300'}`}>
                        {achievement.name}
                      </h3>
                      {isUnlocked && <Star size={14} className="text-amber-400 fill-amber-400" />}
                    </div>
                    <p className={`text-sm mt-0.5 ${isUnlocked ? 'text-amber-200/70' : 'text-slate-500'}`}>
                      {achievement.description}
                    </p>

                    {/* Progress bar */}
                    {!isUnlocked && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500">進度</span>
                          <span className="text-slate-400">{achievement.progress}/{achievement.maxProgress}</span>
                        </div>
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-cyan-500 rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {isUnlocked && achievement.unlockedAt && (
                      <p className="text-xs text-amber-400/60 mt-2">
                        解鎖於: {new Date(achievement.unlockedAt).toLocaleDateString('zh-TW')}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2">
                    {isUnlocked ? (
                      <button
                        onClick={() => handleShare(achievement)}
                        className="p-2 hover:bg-amber-500/20 rounded-lg transition-colors"
                      >
                        <Share2 size={18} className="text-amber-400" />
                      </button>
                    ) : (
                      <div className="p-2">
                        <Lock size={18} className="text-slate-600" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
