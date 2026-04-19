import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import GlowButton from './GlowButton';

interface Props {
  isOpen: boolean;
  status: 'granted' | 'denied' | 'prompt' | 'unknown';
  onRequestPermission: () => void;
  onContinueAnyway: () => void;
}

export default function GPSPermissionModal({ isOpen, status, onRequestPermission, onContinueAnyway }: Props) {
  const [showInstructions, setShowInstructions] = useState(false);

  if (!isOpen) return null;

  const getStatusContent = () => {
    switch (status) {
      case 'granted':
        return {
          icon: <CheckCircle size={48} className="text-emerald-400" />,
          title: 'GPS 已啟用',
          message: '你的位置已被成功追蹤，可以開始尋寶了！',
          showButton: false,
        };
      case 'denied':
        return {
          icon: <AlertCircle size={48} className="text-red-400" />,
          title: '需要位置權限',
          message: '為了提供正確的尋寶體驗，請允許使用 GPS 功能。這是一個實境尋寶遊戲，需要你真實移動才能找到寶藏。',
          showButton: true,
          buttonText: '重新請求權限',
          secondaryAction: (
            <button 
              onClick={() => setShowInstructions(true)}
              className="text-sm text-slate-400 hover:text-slate-300 underline mt-4"
            >
              如何手動開啟 GPS？
            </button>
          ),
        };
      case 'prompt':
      case 'unknown':
      default:
        return {
          icon: <MapPin size={48} className="text-cyan-400 animate-bounce" />,
          title: '啟用 GPS 尋寶',
          message: 'Radar Hunt 是一個實境尋寶遊戲。為了讓你能夠真實地走到寶藏位置，我們需要使用你的 GPS 位置。',
          showButton: true,
          buttonText: '允許使用 GPS',
        };
    }
  };

  const content = getStatusContent();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-700"
          >
            {!showInstructions ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    {content.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100 mb-2">{content.title}</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">{content.message}</p>
                </div>

                {content.showButton && (
                  <div className="space-y-3">
                    <GlowButton
                      title={content.buttonText || ''}
                      onClick={onRequestPermission}
                      variant="primary"
                      size="lg"
                      className="w-full"
                      icon={<Navigation size={20} />}
                    />
                    
                    {status === 'denied' && (
                      <button
                        onClick={onContinueAnyway}
                        className="w-full py-3 text-slate-500 hover:text-slate-400 text-sm transition-colors"
                      >
                        繼續使用模擬模式（無法尋寶）
                      </button>
                    )}
                    
                    {content.secondaryAction}
                  </div>
                )}

                {status === 'granted' && (
                  <GlowButton
                    title="開始尋寶"
                    onClick={onContinueAnyway}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  />
                )}
              </>
            ) : (
              /* Instructions for manually enabling GPS */
              <>
                <div className="text-center mb-6">
                  <Settings size={48} className="text-amber-400 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-slate-100 mb-2">手動開啟 GPS 設定</h2>
                </div>

                <div className="space-y-4 text-sm text-slate-300">
                  <div className="bg-slate-800 rounded-xl p-4">
                    <h3 className="font-bold text-slate-100 mb-2">iOS 手機：</h3>
                    <ol className="space-y-1 list-decimal list-inside text-slate-400">
                      <li>開啟"設定" App</li>
                      <li>滑到底部找到 Safari 瀏覽器</li>
                      <li>點擊"位置"</li>
                      <li>選擇"使用 App 期間"</li>
                    </ol>
                  </div>

                  <div className="bg-slate-800 rounded-xl p-4">
                    <h3 className="font-bold text-slate-100 mb-2">Android 手機：</h3>
                    <ol className="space-y-1 list-decimal list-inside text-slate-400">
                      <li>開啟"設定" App</li>
                      <li>點擊"位置資訊"</li>
                      <li>開啟"使用位置資訊"</li>
                      <li>選擇"允許"或"僅使用期間允許"</li>
                    </ol>
                  </div>
                </div>

                <button
                  onClick={() => setShowInstructions(false)}
                  className="w-full mt-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
                >
                  返回
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
