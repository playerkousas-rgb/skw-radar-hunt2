import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, HelpCircle, ChevronDown, ChevronUp, Crown, Compass,
  MapPin, Users, Clock, Target, Trophy, Volume2, Vibrate, Map,
  QrCode, Flag, BookOpen, Signal, Shield, Zap, Wifi, Smartphone,
  CheckCircle2, AlertTriangle, Lightbulb, Share2, Lock
} from 'lucide-react';
import { ViewType } from '../lib/types';

interface Props {
  onBack: () => void;
  onChangeView?: (view: ViewType) => void;
}

interface HelpSection {
  id: string;
  icon: any;
  title: string;
  color: string;
  bgColor: string;
  content: HelpItem[];
}

interface HelpItem {
  title: string;
  body: React.ReactNode;
}

export default function HelpScreen({ onBack }: Props) {
  const [openSection, setOpenSection] = useState<string | null>('intro');

  const sections: HelpSection[] = [
    {
      id: 'intro',
      icon: HelpCircle,
      title: '什麼是 Radar Hunt？',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      content: [
        {
          title: '🎯 GPS 真人尋寶遊戲',
          body: (
            <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
              <p>Radar Hunt 係一個以 GPS 定位為核心嘅戶外尋寶 PWA（可以加到主畫面當 App 用）。領袖預先設置寶藏位置，玩家就用手機嘅雷達畫面，跟住方向同距離去搵寶藏！</p>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-slate-800 rounded-lg p-2 text-center">
                  <div className="text-2xl mb-1">📍</div>
                  <p className="text-[10px] text-slate-400">GPS 定位</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-2 text-center">
                  <div className="text-2xl mb-1">🔊</div>
                  <p className="text-[10px] text-slate-400">音效震動</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-2 text-center">
                  <div className="text-2xl mb-1">👥</div>
                  <p className="text-[10px] text-slate-400">多人同步</p>
                </div>
              </div>
            </div>
          ),
        },
      ],
    },
    {
      id: 'roles',
      icon: Users,
      title: '兩種身份：領袖 👑 vs 玩家 🎯',
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      content: [
        {
          title: '👑 領袖（作賽設定者）',
          body: (
            <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
              <p>領袖負責準備一切，職責包括：</p>
              <ul className="space-y-1.5">
                <li className="flex gap-2"><span className="text-amber-400">▸</span><span><b className="text-amber-400">建立地圖</b>：加入多個 Checkpoint（藏寶點），每個可以有自己嘅 emoji、名稱、內容文字、提示同觸發半徑</span></li>
                <li className="flex gap-2"><span className="text-amber-400">▸</span><span><b className="text-amber-400">設定難度</b>：簡單🌱、普通🚶、困難🔥、極限💀，半徑愈小愈難搵</span></li>
                <li className="flex gap-2"><span className="text-amber-400">▸</span><span><b className="text-amber-400">遙距放點</b>：用右上角 <span className="inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded text-cyan-400"><MapPin size={12}/> 定位</span> 掣可以將你而家嘅 GPS 位置直接設做藏寶點</span></li>
                <li className="flex gap-2"><span className="text-amber-400">▸</span><span><b className="text-amber-400">開房間</b>：生成房間QR code / 連結，邀請其他玩家加入</span></li>
                <li className="flex gap-2"><span className="text-amber-400">▸</span><span><b className="text-amber-400">同步倒數</b>：領袖揀埋倒數秒數（3/5/10/15/30/60秒），大家一齊出發</span></li>
                <li className="flex gap-2"><span className="text-amber-400">▸</span><span><b className="text-amber-400">驗證成績</b>：玩家完成後會有驗證碼，領袖輸入嚟記錄排行榜</span></li>
              </ul>
            </div>
          ),
        },
        {
          title: '🎯 玩家（尋寶參加者）',
          body: (
            <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
              <p>玩家嘅任務就係搵寶藏：</p>
              <ul className="space-y-1.5">
                <li className="flex gap-2"><span className="text-violet-400">▸</span><span><b className="text-violet-400">掃 QR code / 點連結</b>：一條 link 自動入地圖、入房、等開始</span></li>
                <li className="flex gap-2"><span className="text-violet-400">▸</span><span><b className="text-violet-400">允許 GPS 權限</b>：一定要開定位先玩到（建議開「高精度」）</span></li>
                <li className="flex gap-2"><span className="text-violet-400">▸</span><span><b className="text-violet-400">等倒數</b>：入到等候室會見到倒數，歸零自動開始</span></li>
                <li className="flex gap-2"><span className="text-violet-400">▸</span><span><b className="text-violet-400">跟雷達行</b>：個掃描圈指向最近寶藏，數字就係距離</span></li>
                <li className="flex gap-2"><span className="text-violet-400">▸</span><span><b className="text-violet-400">記錄收藏</b>：搵到嘅寶藏會儲起，仲可以拼成句子</span></li>
                <li className="flex gap-2"><span className="text-violet-400">▸</span><span><b className="text-violet-400">繳交成績</b>：按「🏁 結束」掣，拎住驗證碼俾領袖</span></li>
              </ul>
            </div>
          ),
        },
      ],
    },
    {
      id: 'radar',
      icon: Target,
      title: '雷達畫面點樣睇？',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      content: [
        {
          title: '📡 雷達掃描圈',
          body: (
            <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
              <p>畫面中央嘅圓圈就係你嘅雷達，會指向最近未搵到嘅寶藏：</p>
              <ul className="space-y-1.5">
                <li className="flex gap-2"><span>🧭</span><span>雷達入面個 emoji <b>方向</b> = 寶藏嘅方位（上面=向北）</span></li>
                <li className="flex gap-2"><span>📏</span><span>數字顯示 <b>直線距離</b>，同心圓圈圈代表距離比例</span></li>
                <li className="flex gap-2"><span>🎯</span><span>上面彈出「<span className="text-emerald-400">在範圍內！</span>」就代表你入咗寶藏嘅觸發半徑，附近搵下實體標記</span></li>
                <li className="flex gap-2"><span>💡</span><span>個 <b>提示</b> 會喺距離唔太遠時出現，幫你縮細範圍</span></li>
              </ul>
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 mt-2">
                <p className="text-xs text-slate-400 mb-2"><b className="text-cyan-400">切換畫面：</b>右上角地圖掣 🗺️ 可以睇真實地圖（OpenStreetMap）</p>
              </div>
            </div>
          ),
        },
        {
          title: '📶 GPS 訊號質素',
          body: (
            <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
              <p>右上角嘅小 pill 會顯示 GPS 質素：</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"/><span className="text-emerald-400 font-semibold">極佳/良好</span><span className="text-slate-500">±10m 內，準確可靠</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-400"/><span className="text-cyan-400 font-semibold">一般</span><span className="text-slate-500">±10-25m，大約方向</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400"/><span className="text-amber-400 font-semibold">偏差</span><span className="text-slate-500">±25-50m，建議去開揚地方</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400"/><span className="text-red-400 font-semibold">極差</span><span className="text-slate-500">±50m+，喺室內或高樓遮檔</span></div>
              </div>
              <p className="text-xs text-slate-500 pt-1">💡 App 內置 Kalman 濾波器，會自動過濾異常跳點同漂移，令位置更穩定。</p>
            </div>
          ),
        },
        {
          title: '📊 頂部狀態列',
          body: (
            <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
              <p>標題列會即時顯示：</p>
              <ul className="space-y-1">
                <li><span className="text-cyan-400 font-mono font-bold">X/Y</span> 已找到 / 總數</li>
                <li><span className="text-emerald-400 font-mono">Mm Ss</span> 計時器（過咗幾耐）</li>
                <li><span className="text-violet-400 font-mono">CODE</span> 房間號碼（多人模式先有）</li>
              </ul>
              <p>下面幼條進度條顯示完成度，每條線代表一個 Checkpoint。</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'multiplayer',
      icon: QrCode,
      title: '多人同步點樣做？',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      content: [
        {
          title: '🏠 開房流程（領袖）',
          body: (
            <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
              <ol className="space-y-2">
                <li className="flex gap-2"><span className="bg-amber-500 text-slate-900 font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">1</span><span>揀好你嘅地圖 → 按「🚀 開房間」</span></li>
                <li className="flex gap-2"><span className="bg-amber-500 text-slate-900 font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">2</span><span>畫面會出現 6 位房間碼（例如 <b className="font-mono text-amber-400">KX3H7M</b>）同 QR code</span></li>
                <li className="flex gap-2"><span className="bg-amber-500 text-slate-900 font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">3</span><span>將 QR code / 連結分享俾玩家（有 WhatsApp/Email/LINE 快速分享掣）</span></li>
                <li className="flex gap-2"><span className="bg-amber-500 text-slate-900 font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">4</span><span>等玩家入到等候室（會見到已加入嘅人數）</span></li>
                <li className="flex gap-2"><span className="bg-amber-500 text-slate-900 font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">5</span><span>揀倒數秒數（3-60秒）→ 按「🚀 開始！」</span></li>
                <li className="flex gap-2"><span className="bg-amber-500 text-slate-900 font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">6</span><span>所有已開住連結嘅手機會同步倒數，歸零一齊開始</span></li>
              </ol>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-2">
                <p className="text-xs text-amber-300 flex gap-1.5"><Shield size={14} className="shrink-0 mt-0.5"/><b>同步原理：</b>連結入面有一個「絕對開始時間」，每部手機自己倒數，所以唔需要網絡連線伺服器都可以同步！</p>
              </div>
            </div>
          ),
        },
        {
          title: '📲 加入流程（玩家）',
          body: (
            <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
              <ol className="space-y-2">
                <li className="flex gap-2"><span className="bg-violet-500 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">1</span><span>掃 QR code / 點朋友傳嚟嘅連結</span></li>
                <li className="flex gap-2"><span className="bg-violet-500 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">2</span><span>瀏覽器會自動打開 App、匯入地圖、入房</span></li>
                <li className="flex gap-2"><span className="bg-violet-500 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">3</span><span>允許 GPS 位置權限（一定要！）</span></li>
                <li className="flex gap-2"><span className="bg-violet-500 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">4</span><span>入到等候室會見到房間碼、GPS 狀態、地圖資訊</span></li>
                <li className="flex gap-2"><span className="bg-violet-500 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">5</span><span>等領袖按下開始，你部手機會自動彈倒數畫面</span></li>
              </ol>
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3 mt-2">
                <p className="text-xs text-violet-300 flex gap-1.5"><AlertTriangle size={14} className="shrink-0 mt-0.5"/><b>如果冇掃描器：</b>可以揀「我是玩家」→「輸入房間碼」手動輸入，再匯入地圖檔案。</p>
              </div>
            </div>
          ),
        },
        {
          title: '🔑 驗證碼機制',
          body: (
            <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
              <p>為防止作弊，完成時每位玩家都會得到一個獨立驗證碼，格式：<b className="font-mono text-cyan-400">ROOM-XXXX</b>（4位數字）</p>
              <p>玩家完成時向領袖展示呢個碼，領袖喺房間畫面輸入就會記錄到排行榜。</p>
              <p className="text-xs text-slate-500">💡 驗證碼係根據房間、玩家同成績生成，重複或改動時間都會唔一樣。</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'checkpoints',
      icon: BookOpen,
      title: '藏寶點內容 & 拼句玩法',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      content: [
        {
          title: '💎 四種寶藏類型',
          body: (
            <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
              <p>每個 Checkpoint 可以係以下類型：</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800 rounded-lg p-2.5 border border-slate-700">
                  <p className="font-bold text-slate-200">📝 文字寶藏</p>
                  <p className="text-[11px] text-slate-500">顯示一段文字訊息</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-2.5 border border-slate-700">
                  <p className="font-bold text-slate-200">🖼️ 圖片寶藏</p>
                  <p className="text-[11px] text-slate-500">顯示圖片內容</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-2.5 border border-slate-700">
                  <p className="font-bold text-slate-200">🎭 表情寶藏</p>
                  <p className="text-[11px] text-slate-500">特殊表情符號</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-2.5 border border-slate-700">
                  <p className="font-bold text-slate-200">🔗 連結寶藏</p>
                  <p className="text-[11px] text-slate-500">點擊打開網址</p>
                </div>
              </div>
            </div>
          ),
        },
        {
          title: '📖 我的收藏（拼句玩法）',
          body: (
            <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
              <p>按左上角 <b className="text-violet-400">💎 N 收藏</b> 掣睇你搵到嘅所有寶藏，按搵到嘅先後次序排列，顯示埋搵到時間。</p>
              <p>如果領袖將 10 個寶藏嘅「內容」各寫一個字，玩家搵到嘅就會自動喺下面「<b className="text-emerald-400">拼出句子</b>」串連返埋一齊！</p>
              <p>就算你搵唔晒所有 CP（例如 10 個搵到 8 個），都一樣睇到自己搵到嘅內容，睇下你砌到半句、定幾個關鍵字 🔒</p>
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3">
                <p className="text-xs text-slate-400">未搵到嘅寶藏會顯示做 🔒 並模糊化，搵到先解鎖。</p>
              </div>
            </div>
          ),
        },
        {
          title: '🏁 結束 & 成績',
          body: (
            <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
              <p>你可以隨時按「🏁 結束並繳交成績」（唔使搵晒都得），會顯示：</p>
              <ul className="space-y-1">
                <li>✅ 尋獲數量 / 總數（百分比進度條）</li>
                <li>⏱️ 總用時</li>
                <li>📏 總步行距離（根據 GPS 軌跡估算）</li>
                <li>🔑 專屬驗證碼（俾領袖輸入）</li>
                <li>📤 分享按鈕（複製成績、截圖分享）</li>
              </ul>
              <p>搵晒所有 CP 會自動彈完成畫面 🎉</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'tips',
      icon: Lightbulb,
      title: '實用小貼士',
      color: 'text-lime-400',
      bgColor: 'bg-lime-500/10',
      content: [
        {
          title: '📱 手機設定建議',
          body: (
            <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
              <ul className="space-y-1.5">
                <li className="flex gap-2"><CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5"/><span>開啟 <b>高精度 GPS</b>（設定入面），會用埋 Wi-Fi/網絡定位</span></li>
                <li className="flex gap-2"><CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5"/><span>將 App「加到主畫面」（瀏覽器分享選單），體驗似返原生 App</span></li>
                <li className="flex gap-2"><CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5"/><span>戶外先玩！高樓大廈、室內會令 GPS 失準</span></li>
                <li className="flex gap-2"><CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5"/><span>開啟音效同震動，就近寶藏時會有提示</span></li>
                <li className="flex gap-2"><CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5"/><span>屏幕長開可以確保唔會暫停 tracking（部份手機要關省電模式）</span></li>
              </ul>
            </div>
          ),
        },
        {
          title: '🗺️ 領袖設計地圖貼士',
          body: (
            <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
              <ul className="space-y-1.5">
                <li className="flex gap-2"><Zap size={16} className="text-amber-400 shrink-0 mt-0.5"/><span>新手場：半徑 30-50m，5-10 個 CP，公園/營地範圍</span></li>
                <li className="flex gap-2"><Zap size={16} className="text-amber-400 shrink-0 mt-0.5"/><span>每個點加個 <b>提示</b>，例如「大樹下」、「閘口旁」，玩家就近時先見到</span></li>
                <li className="flex gap-2"><Zap size={16} className="text-amber-400 shrink-0 mt-0.5"/><span>用「📍 放係我而家位置」快速放點，現場埋寶超方便</span></li>
                <li className="flex gap-2"><Zap size={16} className="text-amber-400 shrink-0 mt-0.5"/><span>想玩拼句？每個 CP 嘅「內容」寫一個字/詞，由第 1 個到最後一個順序組成句子</span></li>
                <li className="flex gap-2"><Zap size={16} className="text-amber-400 shrink-0 mt-0.5"/><span>匯出連結可以分享俾其他領袖重用，大家一齊設計路線！</span></li>
              </ul>
            </div>
          ),
        },
        {
          title: '❓ 常見問題',
          body: (
            <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
              <div>
                <p className="font-semibold text-slate-200">Q：使唔使裝 App？</p>
                <p className="text-slate-400">A：唔使！直接用瀏覽器（建議 Safari/Chrome）打開就得，亦可以加到主畫面。</p>
              </div>
              <div>
                <p className="font-semibold text-slate-200">Q：使唔使連線/數據？</p>
                <p className="text-slate-400">A：GPS 唔使數據，但第一次入地圖要；多人同步靠連結入面嘅時間，出發後冇網都玩到（不過地圖瓦片要網）。</p>
              </div>
              <div>
                <p className="font-semibold text-slate-200">Q：會唔會食電好快？</p>
                <p className="text-slate-400">A：長開 GPS 會用多啲電，建議帶充電寶。設定入面可以關高精度延長續航。</p>
              </div>
              <div>
                <p className="font-semibold text-slate-200">Q：一個人都可以玩？</p>
                <p className="text-slate-400">A：可以！唔開房直接「我是玩家」→ 匯入地圖就玩得，計時同記錄一樣有。</p>
              </div>
              <div>
                <p className="font-semibold text-slate-200">Q：如何清除進度重新玩？</p>
                <p className="text-slate-400">A：雷達畫面右上 ⋮ 選單 →「清除進度」。</p>
              </div>
            </div>
          ),
        },
      ],
    },
  ];

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-slate-950 safe-area-top">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors active:scale-95"
        >
          <ArrowLeft size={22} className="text-slate-300" />
        </button>
        <div className="text-center flex items-center gap-2">
          <HelpCircle size={18} className="text-cyan-400" />
          <h1 className="font-bold text-slate-100">使用說明</h1>
        </div>
        <div className="w-10" />
      </div>

      {/* Hero banner */}
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl"/>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl"/>
        </div>
        <div className="relative px-5 py-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-cyan-400 to-violet-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-500/30 text-4xl"
          >
            🎯
          </motion.div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 mb-1">
            RADAR HUNT
          </h2>
          <p className="text-slate-400 text-sm">GPS 真人尋寶遊戲・使用手冊</p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-full text-xs text-slate-400"><MapPin size={12}/> GPS 雷達</span>
            <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-full text-xs text-slate-400"><Users size={12}/> 多人同步</span>
            <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-full text-xs text-slate-400"><Clock size={12}/> 計時挑戰</span>
            <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-full text-xs text-slate-400"><Trophy size={12}/> 成績排行</span>
          </div>
        </div>
      </div>

      {/* Quick start shortcut cards */}
      <div className="p-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">快速開始</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setOpenSection('roles')}
            className="flex flex-col items-start gap-2 p-3 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-colors text-left"
          >
            <Crown size={22} className="text-amber-400"/>
            <p className="font-bold text-slate-200 text-sm">我要做領袖</p>
            <p className="text-[11px] text-slate-500">開地圖、開房、睇成績</p>
          </button>
          <button
            onClick={() => setOpenSection('multiplayer')}
            className="flex flex-col items-start gap-2 p-3 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl hover:border-violet-500/40 transition-colors text-left"
          >
            <Compass size={22} className="text-violet-400"/>
            <p className="font-bold text-slate-200 text-sm">我要做玩家</p>
            <p className="text-[11px] text-slate-500">掃碼、等開始、去尋寶</p>
          </button>
        </div>
      </div>

      {/* Accordion sections */}
      <div className="px-4 pb-8 space-y-2">
        {sections.map((section, idx) => {
          const isOpen = openSection === section.id;
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className={`p-2.5 ${section.bgColor} rounded-lg shrink-0`}>
                  <section.icon size={20} className={section.color}/>
                </div>
                <h3 className="flex-1 font-bold text-slate-100">{section.title}</h3>
                {isOpen ? <ChevronUp size={20} className="text-slate-500"/> : <ChevronDown size={20} className="text-slate-500"/>}
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="border-t border-slate-800"
                  >
                    <div className="p-4 space-y-4">
                      {section.content.map((item, i) => (
                        <div key={i}>
                          <h4 className="font-semibold text-slate-200 mb-2 text-sm">{item.title}</h4>
                          {item.body}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 p-6 text-center">
        <p className="text-xs text-slate-500 mb-2">🎯 Radar Hunt v2.0 • GPS 真人尋寶</p>
        <p className="text-[10px] text-slate-600 tracking-widest font-bold">COPYRIGHT 2026 SKWSCOUT</p>
      </div>
    </div>
  );
}
