/**
 * store_gate_v1.0.js — 關站與指定入口（SCOUT APP STORE／通告圖書館）白名單閘門（SG1–SG19、docs/50-app-store-whitelist-and-shutdown.md）
 * © SCOUT SYSTEM · COPYRIGHT SCOUT SYSTEM
 *
 * 用法（放喺 index.html 嘅 <head> 最頂，零依賴；支援單一或多個指定入口）：
 *   <script src="/store_gate_v1.0.js"></script>
 *   <script>
 *     initStoreGate({
 *       appKey: 'myapp',
 *       mode: 'entry-gate', // 'open' | 'entry-gate' | 'iframe-only' | 'closed'
 *       // ① 用官方入口註冊表（建議）：只寫 id，網址／標籤／順序由真理倉統一維護
 *       portalIds: ['appstore', 'library', 'member', 'district'],
 *       // ② SG19（2026-11-17 新標準）：門照開，但攔截卡只出 APP STORE 一粒掣
 *       silentPortalIds: ['library'],   // 放行但唔畫掣（同 portalIds 任一寫法等效）
 *       // ② 或自訂入口（例如臨時活動頁、旅團門戶）
 *       portals: [
 *         { labelZh: '前往 SCOUT APP STORE', labelEn: 'Go to SCOUT APP STORE', url: 'https://scoutappstore.vercel.app/' },
 *         { labelZh: '前往通告圖書館', labelEn: 'Go to Notice Library', url: 'https://scout-circulars.vercel.app/' },
 *       ],
 *       allowStandalone: true,
 *     });
 *   </script>
 *
 * SG19（2026-11-17 用戶定案）—— 「按鈕」同「放行來源」係兩件事：
 *   子 App 預設應同時放行 appstore 同 library（library 係引流入口），
 *   但用家直開網址被攔截時，提示卡**只顯示 appstore 一粒掣**。
 *   寫法兩種等效：portalIds: ['appstore','library'], silentPortalIds: ['library']
 *             或 portalIdsAdmit: 'all', silentPortalIds: ['library','member','district','gemini']
 *
 * SG18（2026-11-17 用戶定案）—— 子 App 內置「讚好／收藏」一鍵回跳主站：
 *   getAppStoreUrl(slug) → 開新分頁返 APP STORE 詳情卡。
 *   **嚴禁**子 App 直連主站 Supabase／複製 anon key／自行呼叫 bump_hearts／bump_stars。
 *
 * 官方五個入口（PORTAL_REGISTRY，2026-11-15 用戶定案；詳情 docs/50 §0.1）：
 *   1. appstore  1. APP STORE     https://scoutappstore.vercel.app/        （playerkousas-rgb/website）
 *   2. library   2. 圖書館         https://scout-circulars.vercel.app/      （playerkousas-rgb/scout-circulars）
 *   3. member    3. 成員系統       https://member-portal-sigma-swart.vercel.app/（playerkousas-rgb/member-portal）
 *   4. district  4. 區管理系統     https://scout-district-portal.vercel.app/（playerkousas-rgb/scout-district-portal）
 *   5. gemini    5. GEMINI         https://gemini-woad-sigma.vercel.app/  （playerkousas-rgb/GEMINI，**private repo**）
 *      ⚠️ 2026-11-15 修正：GEMINI 係用戶自己嘅 Vercel app，唔係 Google Gemini；可以正常放行。
 *   ⚠️ 註冊表只係「邊個入口有資格放行」，唔等於全部入口都改好：library／member／district 現時連結帶
 *      rel="noopener noreferrer"（會清空 Referer），要先改 rel="noopener" 先放行得到（docs/50 §4.4）。
 *
 * SG17（2026-11-15 用戶定案「唔使先逐個入口講」）—— 每個入口登記埋「幾時納入 portalIds」：
 *   admit: 'always'      → DEFAULT_PORTAL_IDS（appstore：分享／QR 都由佢產生，所以一定係入口）
 *   admit: 'conditional' → CONDITIONAL_PORTAL_IDS（library：要先改好 noreferrer 先生效）
 *   admit: 'optional'    → OPTIONAL_PORTAL_IDS（member／district：唔做 App 目錄，逐個 App 決定）
 *   admit: 'never'       → NEVER_ADMIT_PORTAL_IDS（現時**冇任何入口**用此級；GEMINI 已改回可放行）
 *   所以新子 App 最省事嘅寫法係 portalIds: DEFAULT_PORTAL_IDS（＝只認 APP STORE）；
 *   要「1–4 全開」就寫 { portalIdsAdmit: 'all' }（唔會誤包 Gemini）。
 *
 * 四種模式：
 *   - 'open'        ：公開直連（預設，唔攔截）
 *   - 'entry-gate'  ：頂層跳板白名單（專治唔適合 <iframe> 嘅 App：保留 Safari localStorage、
 *                     SameSite=Lax Cookie、PWA 加入主畫面、Web Push；驗 Referer origin 是否屬任一指定入口 +
 *                     sessionStorage 同分頁通行證 + 可選放行已裝主畫面 standalone PWA）
 *   - 'iframe-only' ：純 <iframe> 白名單（配合 vercel.iframe-whitelist.json 嘅 CSP frame-ancestors；
 *                     直打網址時清晰告知用家有白名單並引導前往指定入口）
 *   - 'closed'      ：軟關站／維護告示（告知用家網站暫時關閉並引導返回指定入口）
 *   - 其他未知值    ：F4 fail closed，一律當攔截處理，唔會因串錯字而誤開
 *
 * 誠實限制（docs/47）：
 *   此檔屬前端入口提示與防誤傳閘門，擋一般用家直開舊書籤／轉發連結；
 *   防唔到 DevTools 改 sessionStorage 或 curl 偽造 Referer。敏感資料／收費 API 須配後端驗票（SG5 嚴格級）。
 */

const VERSION = 'v1.0';

const DEFAULT_STORE_URL = 'https://scoutappstore.vercel.app/';
const DEFAULT_LIBRARY_URL = 'https://scout-circulars.vercel.app/';
const DEFAULT_ALLOWED_ORIGINS = ['https://scoutappstore.vercel.app'];

/**
 * PORTAL_REGISTRY — 官方五個準入白名單入口（真理倉 docs/50 §0.1 唯一來源）
 * 2026-11-15 用戶定案：1. APP STORE · 2. 圖書館 · 3. 成員系統 · 4. 區管理系統
 * 子 App 用 portalIds: ['appstore','library','member','district']（可只揀子集）即可；
 * 改網址／改排序只改呢個表，唔使逐個 App 改 index.html。
 */
const PORTAL_REGISTRY = Object.freeze({
  appstore: Object.freeze({
    id: 'appstore',
    kind: 'outbound', // 派發方向：由呢個門口撳出去開子 App（有 Referer，可做 entry-gate）
    admit: 'always', // SG17：預設就要納入 portalIds（分享／QR 都由佢產生）
    role: 'main', // 1. 真正主站（全方位）：唯一應該帶分享連結／QR 嘅入口
    order: 1,
    labelZh: '1. 前往 APP STORE',
    labelEn: '1. Go to APP STORE',
    nameZh: 'APP STORE',
    url: 'https://scoutappstore.vercel.app/',
    origin: 'https://scoutappstore.vercel.app',
    repo: 'playerkousas-rgb/website',
  }),
  library: Object.freeze({
    id: 'library',
    kind: 'outbound', // 派發方向：由呢個門口撳出去開子 App（有 Referer，可做 entry-gate）
    admit: 'conditional', // SG17：要先喺圖書館改 L5662 `noreferrer`，未改之前放佢入 portalIds 只會撞卡
    role: 'feed', // 2. 每天更新通告嘅引流入口：新 APP 即時可入
    order: 2,
    labelZh: '2. 前往圖書館',
    labelEn: '2. Go to Library',
    nameZh: '圖書館',
    url: 'https://scout-circulars.vercel.app/',
    origin: 'https://scout-circulars.vercel.app',
    repo: 'playerkousas-rgb/scout-circulars',
  }),
  member: Object.freeze({
    id: 'member',
    kind: 'outbound', // 派發方向：由呢個門口撳出去開子 App（有 Referer，可做 entry-gate）
    admit: 'optional', // SG17：成員系統唔做 App 目錄，只連 APP STORE／圖書館＋4 本 BOOK → 逐個 App 決定
    role: 'internal', // 3. 自家出產副系統（成員系統）
    order: 3,
    labelZh: '3. 前往成員系統',
    labelEn: '3. Go to Member Portal',
    nameZh: '成員系統',
    url: 'https://member-portal-sigma-swart.vercel.app/',
    origin: 'https://member-portal-sigma-swart.vercel.app',
    repo: 'playerkousas-rgb/member-portal',
  }),
  // 5. GEMINI（2026-11-15 用戶第二次澄清 —— 重要修正）
  //    用戶原文：「我岩岩用無痕 https://gemini-woad-sigma.vercel.app/ 呢個係岩既 LINK 尼 WOR，
  //    我覺得你誤會了我說的 GEMINI 和真的 GEMINI，我說的是我的 REPO "GEMINI"」＋「因為果個係私人 REPO」。
  //    → 呢個 GEMINI **唔係** Google 嘅 Gemini／Canvas，而係用戶自己一個 **private repo**
  //      部署出嚟嘅 Vercel app（同其他子 App 一樣，係目錄入面一件貨）。所以：
  //      · 佢屬 **Vercel 派發線（`outbound`）**、我哋托管、改得到 header；
  //      · 可以掛 `store_gate_v1.0.js`，亦**可以**做 `entry-gate` 放行來源；
  //      · 用 `portalIds` 引用同 1–4 完全一樣，冇任何特殊待遇。
  //    ⚠️ 唯一保留：private repo → agent 用 GitHub API 可能讀唔到原始碼
  //      （`403 Resource not accessible by integration`）。讀唔到**唔等於**唔存在，
  //      更唔可以推論成「死連」。
  gemini: Object.freeze({
    id: 'gemini',
    kind: 'outbound', // 同 1–4 一樣：由呢個門口撳出去開子 App（有 Referer，可做 entry-gate）
    gateable: true, // 自己 repo／自己部署 → header 改得到
    admit: 'optional', // SG17：可以納入 portalIds，但要先確認該 GEMINI app 改好連結（預設唔加）
    stats: 'gemini-side', // 統計喺佢自己嗰邊（用戶：那邊我也有完善的統計）
    repoVisibility: 'private', // 原始碼 agent 可能讀唔到（403），唔影響放行能力
    role: 'subapp',
    order: 5,
    labelZh: '5. 前往 GEMINI',
    labelEn: '5. Go to GEMINI',
    nameZh: 'GEMINI',
    url: 'https://gemini-woad-sigma.vercel.app/',
    origin: 'https://gemini-woad-sigma.vercel.app',
    repo: 'playerkousas-rgb/GEMINI', // private repo；agent 可能讀唔到，唔准當佢唔存在
  }),
  district: Object.freeze({
    id: 'district',
    kind: 'outbound', // 派發方向：由呢個門口撳出去開子 App（有 Referer，可做 entry-gate）
    admit: 'optional', // SG17：區管理系統（卡片／/embed）只連自家系統 → 逐個 App 決定
    role: 'internal', // 4. 自家出產副系統（區管理系統）
    order: 4,
    labelZh: '4. 前往區管理系統',
    labelEn: '4. Go to District Portal',
    nameZh: '區管理系統',
    url: 'https://scout-district-portal.vercel.app/',
    origin: 'https://scout-district-portal.vercel.app',
    repo: 'playerkousas-rgb/scout-district-portal',
  }),
});

/** 官方入口順序：1 APP STORE → 2 圖書館 → 3 成員系統 → 4 區管理系統（＋5 Gemini 創作，方向相反） */
const PORTAL_IDS = Object.freeze(
  Object.keys(PORTAL_REGISTRY).sort((a, b) => PORTAL_REGISTRY[a].order - PORTAL_REGISTRY[b].order),
);

/**
 * 可直接管閘嘅派發入口（可做 entry-gate 放行來源）
 * 五個入口**全部**屬此類 —— 都係我哋自己托管嘅 Vercel 子站（GEMINI 係 private repo，一樣托管喺 Vercel）。
 */
const OUTBOUND_PORTAL_IDS = Object.freeze(
  Object.keys(PORTAL_REGISTRY)
    .filter((k) => PORTAL_REGISTRY[k].kind === 'outbound')
    .sort((a, b) => PORTAL_REGISTRY[a].order - PORTAL_REGISTRY[b].order),
);

/**
 * @deprecated 2026-11-15 修正後**永遠係空陣列**。
 * 舊版錯誤咁把 `gemini` 當成「Canvas 派發線（Google 網域、管唔到閘）」；
 * 用戶澄清佢個 GEMINI 係自己 private repo 部署嘅 Vercel app，可以正常管閘。
 * 保留個名只為唔整爛舊 caller，唔好再用。
 */
const CANVAS_PORTAL_IDS = Object.freeze([]);

/** @deprecated 舊名，等於 CANVAS_PORTAL_IDS（永遠空） */
const INBOUND_PORTAL_IDS = CANVAS_PORTAL_IDS;

/**
 * SG17：`portalIds` 預設值 = 一定要納入嘅入口。
 * 只有 APP STORE（`admit: 'always'`）—— 因為分享連結／QR code 只由佢產生（SG9），
 * 佢一定係每一隻子 App 嘅入口；圖書館要改完 `noreferrer` 先生效（`conditional`），
 * 成員／區管理系統唔做 App 目錄（`optional`），Gemini 管唔到閘（`never`）。
 * 所以「五個入口係唔係要先逐個講」＝**唔使**：子 App 一律寫 `portalIds: DEFAULT_PORTAL_IDS` 就係
 * 「經 APP STORE 入」，之後任何一個入口要加入，都只係本 repo 改一行 + 該 App 加一個 id。
 */
const PORTAL_ORDER = Object.freeze(
  Object.keys(PORTAL_REGISTRY).sort((a, b) => PORTAL_REGISTRY[a].order - PORTAL_REGISTRY[b].order),
);

const DEFAULT_PORTAL_IDS = Object.freeze(
  PORTAL_ORDER.filter((k) => PORTAL_REGISTRY[k].admit === 'always'),
);

/** 要先行動／先確認之後才可加入 `portalIds` 嘅入口（SG17）：library → 改 `noreferrer` */
const CONDITIONAL_PORTAL_IDS = Object.freeze(
  PORTAL_ORDER.filter((k) => PORTAL_REGISTRY[k].admit === 'conditional'),
);

/** 逐個 App 自行決定要唔要加嘅入口（SG17）：member／district（自家副系統，唔做 App 目錄） */
const OPTIONAL_PORTAL_IDS = Object.freeze(
  PORTAL_ORDER.filter((k) => PORTAL_REGISTRY[k].admit === 'optional'),
);

/** 永遠唔可以放入 `portalIds` 做放行來源（SG17）：gemini */
const NEVER_ADMIT_PORTAL_IDS = Object.freeze(
  PORTAL_ORDER.filter((k) => PORTAL_REGISTRY[k].admit === 'never'),
);

/**
 * SG17：`portalIds` 缺漏時嘅安全預設值。
 * 唔傳 `portalIds` 但傳咗 `portalIdsAdmit`（例如 `'all'`）→ 自動展開成真正可以管閘嘅入口；
 * 咩都唔傳 → 只認 APP STORE（永遠唔會靜靜地連 Gemini 都當入口）。
 */
function resolvePortalIds(portalIds, admit) {
  if (Array.isArray(portalIds) && portalIds.length > 0) return portalIds;
  if (admit === 'all' || admit === 'every') {
    return [...OUTBOUND_PORTAL_IDS];
  }
  if (Array.isArray(admit) && admit.length > 0) return admit;
  return [...DEFAULT_PORTAL_IDS];
}

/** 由 registry id 取入口資料；唔識嘅 id 回 null（由呼叫方 fail-safe 過濾） */
function getPortal(id, overrides = {}) {
  const hit = PORTAL_REGISTRY[String(id || '').trim().toLowerCase()];
  if (!hit) return null;
  return { ...hit, ...(overrides || {}) };
}

/**
 * SG18：組出「返回主站該 App 詳情卡」嘅深層連結（子 App 內置讚好／收藏掣用）。
 * 子 App **嚴禁**直連主站 Supabase／複製 anon key／自行呼叫 bump_hearts／bump_stars；
 * 一律用呢個 helper 開新分頁返主站，由用家自己撳 ❤️／⭐（收藏清單存喺主站同源 localStorage）。
 *
 *   getAppStoreUrl('aircraft-encyclopedia') → 'https://scoutappstore.vercel.app/?app=aircraft-encyclopedia'
 *   getAppStoreUrl('')                       → 'https://scoutappstore.vercel.app/'
 *
 * ⚠️ 唔會出 `//?app=`：先去掉 registry url 尾斜線再串 query。
 * ⚠️ slug 由主站 migrations/20261116-app-slug-seed.sql 或 apps.slug 核實，**唔准靠 repo 名猜**。
 */
function getAppStoreUrl(appSlug) {
  const base = String((PORTAL_REGISTRY.appstore && PORTAL_REGISTRY.appstore.url) || DEFAULT_STORE_URL)
    .trim()
    .replace(/\/+$/, '');
  const slug = String(appSlug == null ? '' : appSlug).trim();
  return slug ? `${base}/?app=${encodeURIComponent(slug)}` : `${base}/`;
}

/** 由 portalIds: ['appstore','library'] 展開成完整入口物件清單（未知 id 靜靜略過） */
function portalsFromIds(ids, labelMap = {}, options = {}) {
  if (!Array.isArray(ids)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of ids) {
    const hit = getPortal(raw);
    if (!hit || seen.has(hit.id)) continue;
    // 2026-11-15 修正：五個入口全部可以放入 portalIds（GEMINI 都係我哋自己托管、管得到閘）。
    // 舊版呢度有個 `kind === 'canvas'` 過濾，已移除；`options.includeCanvas` 仍然收貨但無作用。
    seen.add(hit.id);
    const ov = labelMap[hit.id] || {};
    out.push({
      ...hit,
      origin: hit.origin || parseAllowedOrigin(hit.url) || DEFAULT_ALLOWED_ORIGINS[0],
      labelZh: ov.labelZh || hit.labelZh,
      labelEn: ov.labelEn || hit.labelEn,
    });
  }
  return out.sort((a, b) => a.order - b.order);
}

const COPY = {
  zh: {
    whitelistBadge: '白名單保護 · 指定入口限定',
    // SG19（2026-11-17 定案）：預設用「簡短人話」——零技術術語，唔講「白名單」。
    // 舊字串（whitelistTitleSingle／whitelistBodySingle／Multi）**保留**做 alias：
    //   ① 向下相容：任何 App 已用 customTitle 也唔受影響；
    //   ② 想講清楚「為統一入口及版本管理」嘅 App 仍然可以自行指定；
    //   ③ 測試同時鎖兩組字串，防止其中一組被靜靜改走。
    whitelistTitleShort: '需經由 SCOUT APP STORE 開啟',
    whitelistBodyShort: '請按下方按鈕前往 APP STORE 開啟。',
    whitelistTitleSingle: '此程式需經 SCOUT APP STORE 開啟',
    whitelistTitleMulti: '此程式需經指定入口網站開啟',
    whitelistBodySingle: '為統一入口及版本管理，本程式已啟用白名單限制，不支援直接開啟獨立網址。請由 SCOUT APP STORE 進入。',
    whitelistBodyMulti: '為統一入口及版本管理，本程式已啟用白名單限制，不支援直接開啟獨立網址。請由以下任一指定入口進入：',
    iframeBody: '本工具僅供嵌入白名單網站內使用，不支援直接開啟獨立網址。請前往指定主站開啟。',
    closedBadge: '暫停開放 · 系統維護',
    closedTitle: '此網站目前暫時關閉',
    closedBody: '本程式現正暫停開放或進行維護。請前往以下入口查看其他可用工具或最新通告。',
    cta: '前往 SCOUT APP STORE',
    countdownPrefix: '將於 ',
    countdownSuffix: ' 秒後自動前往主站…',
    installHint: '想「加入主畫面」用 App 模式開啟？請先由上述入口進入本程式，再用瀏覽器選單「加入主畫面」（直接開網址安裝會得到打不開的圖示）。',
    autoRedirectHint: '唔想等？直接撳上面任何一個入口掣。',
    supportText: '書架位置有限：長期冇人收藏／Like 嘅 App 會收起，騰返個位俾新 App。覺得有用就按一下❤️，一個就夠。',
    supportCta: '按❤️支持',
    supportDismiss: '唔使喇',
  },
  en: {
    whitelistBadge: 'Whitelist Only · Designated Portals',
    whitelistTitleSingle: 'Please open this app via SCOUT APP STORE',
    whitelistTitleMulti: 'Please open this app via a designated portal',
    whitelistBodySingle: 'Direct URL access is disabled. This app is protected by an entry whitelist and must be launched from SCOUT APP STORE.',
    whitelistBodyMulti: 'Direct URL access is disabled. Please launch this app from one of the designated portals below:',
    // SG19：簡短版（預設）
    whitelistTitleShort: 'Open via SCOUT APP STORE',
    whitelistBodyShort: 'Please use the button below to open this app from SCOUT APP STORE.',
    // SG19 順手補齊：舊版 COPY.en 漏咗呢三個 → 英文模式下 renderSupportNudge 會出 undefined
    supportText: 'Shelf space is limited: apps that nobody saves or likes get taken down to make room for new ones. If this is useful, tap ❤️ — once is enough.',
    supportCta: 'Give a ❤️',
    supportDismiss: 'Not now',
    iframeBody: 'This tool can only be opened inside a whitelisted portal view, not via a standalone URL.',
    closedBadge: 'Temporarily Closed · Maintenance',
    closedTitle: 'This site is temporarily closed',
    closedBody: 'This app is currently paused or under maintenance. Please visit a portal below for available tools and updates.',
    cta: 'Go to SCOUT APP STORE',
    countdownPrefix: 'Redirecting to portal in ',
    countdownSuffix: 's…',
    installHint: 'To install this as a Home Screen app, open it from one of the portals above first, then use your browser\u2019s "Add to Home Screen". Installing straight from the raw URL creates an icon that cannot open.',
  },
};

/** 嚴格解析 Origin（F5/A9）：防 https://scoutappstore.vercel.app.evil.com 前綴偽造 */
function parseAllowedOrigin(rawUrl, allowLocalhost = false) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const u = new URL(rawUrl);
    if (u.protocol === 'https:') return u.origin;
    if (allowLocalhost && u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
      return u.origin;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * SG19：靜默放行入口清單。
 * `silentPortalIds` 內嘅入口會加入白名單放行（`matchedPortalId` 正常回報），
 * 但**唔會**渲染成攔截卡按鈕 —— 用家直開網址撞卡時只見到 APP STORE 一粒掣。
 * 目的：圖書館係引流入口（要有 Referer 放行得到），但唔係「主站」，
 * 唔應該喺攔截卡同 APP STORE 並排爭位（一張卡兩粒掣＝用家唔知撳邊個）。
 */
function getSilentIds(options = {}) {
  const list = Array.isArray(options.silentPortalIds) ? options.silentPortalIds : [];
  return new Set(list.map((v) => String(v || '').trim().toLowerCase()).filter(Boolean));
}

/** 正規化指定入口清單：自訂 portals 優先，其次官方 portalIds（四大入口註冊表），最後 storeUrl 單一入口 */
function normalizePortals(options = {}) {
  const allowLocalhost = Boolean(options.allowLocalhost);
  const silentIds = getSilentIds(options);
  const toEntry = (item, silent = false) => {
    if (!item || typeof item !== 'object') return null;
    const origin = parseAllowedOrigin(item.url, allowLocalhost);
    if (!origin) return null;
    const id = item.id ? String(item.id) : '';
    return {
      id,
      url: item.url,
      origin,
      // SG19：silent 入口照放行（仍然喺白名單），但唔畫成掣
      silent: silent || (!!id && silentIds.has(id.toLowerCase())),
      labelZh: String(item.labelZh || item.label || COPY.zh.cta),
      labelEn: String(item.labelEn || item.label || COPY.en.cta),
    };
  };
  const merged = [];
  const seenOrigin = new Set();
  const pushAll = (list) => {
    for (const entry of list) {
      if (!entry || seenOrigin.has(entry.origin)) continue;
      seenOrigin.add(entry.origin);
      merged.push(entry);
    }
  };
  // 自訂 portals 同官方 portalIds 可以並存：以 Origin 去重，先列自訂、再接官方未重複嘅入口
  if (Array.isArray(options.portals) && options.portals.length > 0) {
    pushAll(options.portals.map((p) => toEntry(p)).filter(Boolean));
  }
  if (Array.isArray(options.portalIds) && options.portalIds.length > 0) {
    pushAll(portalsFromIds(options.portalIds).map((p) => toEntry(p)).filter(Boolean));
  } else if (options.portalIdsAdmit) {
    // SG17：冇寫死 portalIds 時，可以用 portalIdsAdmit 一次過揀：
    //   'all' → OUTBOUND_PORTAL_IDS（1–4，Gemini 永遠唔會入圍）
    //   陣列 → 逐個指名
    //   唔傳 → DEFAULT_PORTAL_IDS（只有 APP STORE）
    pushAll(portalsFromIds(resolvePortalIds(options.portalIds, options.portalIdsAdmit)).map((p) => toEntry(p)).filter(Boolean));
  }
  // SG19：silentPortalIds 內、頭先未出現過嘅入口一樣要加入白名單（否則靜默放行根本唔生效）
  if (silentIds.size > 0) {
    pushAll(portalsFromIds([...silentIds]).map((p) => toEntry(p, true)).filter(Boolean));
  }
  if (merged.length > 0) return merged;
  const fallbackUrl = parseAllowedOrigin(options.storeUrl || DEFAULT_STORE_URL, allowLocalhost)
    ? (options.storeUrl || DEFAULT_STORE_URL)
    : DEFAULT_STORE_URL;
  return [{
    id: 'appstore',
    url: fallbackUrl,
    origin: parseAllowedOrigin(fallbackUrl, allowLocalhost) || DEFAULT_ALLOWED_ORIGINS[0],
    silent: false,
    labelZh: COPY.zh.cta,
    labelEn: COPY.en.cta,
  }];
}

/** 偵測已加入主畫面嘅 PWA（對齊 docs/46 I4） */
function isStandaloneApp(win) {
  if (!win) return false;
  try {
    if (win.matchMedia && win.matchMedia('(display-mode: standalone)').matches) return true;
  } catch {
    /* 舊環境無 matchMedia */
  }
  return Boolean(win.navigator && win.navigator.standalone === true);
}

function readSessionPass(win, passKey) {
  try {
    return Boolean(win && win.sessionStorage && win.sessionStorage.getItem(passKey) === '1');
  } catch {
    return false;
  }
}

function writeSessionPass(win, passKey) {
  try {
    if (win && win.sessionStorage) win.sessionStorage.setItem(passKey, '1');
  } catch {
    /* Safari 私隱模式或封鎖 storage 時唔可以 throw */
  }
}

function detectCopyLang(doc) {
  const root = doc && doc.documentElement;
  if (!root) return 'zh';
  const dl = (root.getAttribute('data-lang') || '').toLowerCase();
  const hl = (root.getAttribute('lang') || '').toLowerCase();
  if (dl === 'en' || hl === 'en' || hl.startsWith('en-')) return 'en';
  return 'zh';
}

/** 純邏輯判定：方便單元測試同 runtime 共用 */
function evaluateStoreGate(options = {}, env = {}) {
  const mode = options.mode || 'open';
  const appKey = String(options.appKey || 'scoutapp').replace(/[^a-zA-Z0-9_-]/g, '') || 'scoutapp';
  const passKey = `${appKey}.store_pass`;
  const allowLocalhost = Boolean(options.allowLocalhost);
  const allowStandalone = options.allowStandalone !== false;
  const portals = normalizePortals(options);

  // SG19：allowedOrigins 係「**額外**放行來源」，唔可以蓋過 portals。
  // 舊寫法（有 allowedOrigins 就完全取代 portals）會令 silentPortalIds 嘅入口
  // 放行得到但 matchedPortalId 變空 → SG10 統計認唔出入口。改為聯集。
  const extraAllowed = Array.isArray(options.allowedOrigins) && options.allowedOrigins.length
    ? options.allowedOrigins
    : [];
  const allowedSet = new Set(
    [...portals.map((p) => p.origin), ...extraAllowed]
      .map((o) => parseAllowedOrigin(o, allowLocalhost))
      .filter(Boolean),
  );

  if (mode === 'open') {
    return { allowed: true, reason: 'open', mode };
  }
  if (mode === 'closed') {
    return { allowed: false, reason: 'closed', mode };
  }
  // SG8：入口網站自己永遠唔會被自己嘅閘擋死（否則四大入口一齊鎖死）。
  // 判定：當前頁面自己嘅 origin ∈ 白名單入口清單 → 放行；closed 已喺上面優先處理（關站蓋過一切），
  // open 亦已喺上面直接放行，所以呢兩行唔會改變原有行為。
  if (mode === 'iframe-only' || mode === 'entry-gate') {
    const selfOrigin = parseAllowedOrigin(env.selfOrigin || '', allowLocalhost);
    if (selfOrigin && allowedSet.has(selfOrigin)) {
      return { allowed: true, reason: 'self-portal', mode, matchedOrigin: selfOrigin };
    }
  }

  if (mode === 'iframe-only') {
    const inIframe = Boolean(env.inIframe);
    return inIframe
      ? { allowed: true, reason: 'in-iframe', mode }
      : { allowed: false, reason: 'not-in-iframe', mode };
  }
  if (mode === 'entry-gate') {
    if (allowStandalone && env.standalone) {
      return { allowed: true, reason: 'standalone-pwa', mode };
    }
    if (env.hasSessionPass) {
      return { allowed: true, reason: 'session-pass', mode };
    }
    const refOrigin = parseAllowedOrigin(env.referrer || '', allowLocalhost);
    if (refOrigin && allowedSet.has(refOrigin)) {
      // SG19：先由 portals 認；認唔到（例如入口只喺 allowedOrigins 出現）就查官方註冊表，
      // 令 matchedPortalId 唔會無故變空（SG10 統計靠佢分辨「邊個入口引流」）。
      const hit = portals.find((p) => p.origin === refOrigin)
        || PORTAL_IDS.map((id) => getPortal(id)).find((p) => p && p.origin === refOrigin);
      return {
        allowed: true,
        reason: 'referrer-whitelist',
        mode,
        matchedOrigin: refOrigin,
        matchedPortalId: hit ? hit.id : '',
        grantSessionPass: true,
        passKey,
      };
    }
    return { allowed: false, reason: 'missing-whitelist-entry', mode };
  }

  // F4 fail closed：未知 mode 一律攔截，唔會靜靜放行
  return { allowed: false, reason: 'invalid-mode-fail-closed', mode };
}

function renderGateOverlay(doc, win, decision, options = {}) {
  if (!doc || !doc.documentElement) return null;
  const portals = normalizePortals(options);
  // SG19：「按鈕」同「放行來源」分離 —— silent 入口照放行但唔畫掣。
  // 只畫一粒掣時（沉默咗圖書館之後嘅常態），文案用 Short 版 + 掣文字去編號前綴。
  const shown = portals.filter((p) => !p.silent);
  const actionPortals = shown.length > 0 ? shown : portals;
  const primaryUrl = actionPortals[0].url;
  const isMulti = actionPortals.length > 1;
  const lang = options.lang === 'en' ? 'en' : detectCopyLang(doc);
  const c = COPY[lang] || COPY.zh;
  const isClosed = decision.reason === 'closed';
  const isIframe = decision.reason === 'not-in-iframe';

  const badge = isClosed ? c.closedBadge : c.whitelistBadge;
  const defaultTitle = isClosed
    ? c.closedTitle
    : (isMulti ? c.whitelistTitleMulti : c.whitelistTitleShort);
  const defaultBody = isClosed
    ? c.closedBody
    : (isIframe ? c.iframeBody : (isMulti ? c.whitelistBodyMulti : c.whitelistBodyShort));
  const title = options.customTitle || defaultTitle;
  const body = options.customMessage || defaultBody;

  doc.documentElement.setAttribute('data-store-gated', decision.reason);

  if (!doc.getElementById('scoutStoreGateStyle')) {
    const style = doc.createElement('style');
    style.id = 'scoutStoreGateStyle';
    style.textContent = [
      'html[data-store-gated] body { margin: 0 !important; min-height: 100vh; background: #1f2430 !important; color: #f5f2eb !important; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; display: flex; align-items: center; justify-content: center; }',
      'html[data-store-gated] body > :not(#scoutStoreGate) { display: none !important; }',
      '#scoutStoreGate { box-sizing: border-box; width: min(92vw, 440px); margin: 24px auto; padding: 28px 24px; border-radius: 16px; background: #282f3d; border: 1px solid rgba(232, 200, 122, 0.28); box-shadow: 0 18px 42px rgba(0, 0, 0, 0.42); text-align: left; line-height: 1.6; }',
      '#scoutStoreGate .sg-badge { display: inline-block; font-size: 12px; font-weight: 600; color: #e8c87a; background: rgba(232, 200, 122, 0.12); padding: 4px 10px; border-radius: 10px; margin-bottom: 12px; }',
      '#scoutStoreGate h1 { margin: 0 0 10px; font-size: 20px; line-height: 1.35; color: #ffffff; }',
      '#scoutStoreGate p { margin: 0 0 20px; font-size: 14px; color: #d3d7e0; }',
      '#scoutStoreGate .sg-actions { display: flex; flex-direction: column; gap: 10px; }',
      '#scoutStoreGate .sg-cta { display: inline-flex; align-items: center; justify-content: center; width: 100%; box-sizing: border-box; padding: 12px 16px; border-radius: 10px; background: #e8c87a; color: #1f2430; font-weight: 700; font-size: 15px; text-decoration: none; }',
      '#scoutStoreGate .sg-cta.sg-secondary { background: transparent; color: #e8c87a; border: 1px solid rgba(232, 200, 122, 0.45); font-weight: 600; }',
      '#scoutStoreGate .sg-cta:focus-visible { outline: 2px solid #ffffff; outline-offset: 2px; }',
      '#scoutStoreGate .sg-sub { margin-top: 12px; margin-bottom: 0; font-size: 12px; color: #9aa3b5; text-align: center; }',
    ].join('\n');
    (doc.head || doc.documentElement).appendChild(style);
  }

  const mount = () => {
    if (!doc.body) return null;
    let box = doc.getElementById('scoutStoreGate');
    if (!box) {
      box = doc.createElement('div');
      box.id = 'scoutStoreGate';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-labelledby', 'scoutStoreGateTitle');
      doc.body.appendChild(box);
    }
    while (box.firstChild) box.removeChild(box.firstChild);

    const badgeEl = doc.createElement('div');
    badgeEl.className = 'sg-badge';
    badgeEl.textContent = badge;

    const h1 = doc.createElement('h1');
    h1.id = 'scoutStoreGateTitle';
    h1.textContent = title;

    const p = doc.createElement('p');
    p.textContent = body;

    const actions = doc.createElement('div');
    actions.className = 'sg-actions';

    actionPortals.forEach((portal, idx) => {
      const a = doc.createElement('a');
      a.className = idx === 0 ? 'sg-cta' : 'sg-cta sg-secondary';
      a.href = portal.url;
      a.target = '_top';
      a.rel = 'noopener';
      const rawLabel = lang === 'en' ? portal.labelEn : portal.labelZh;
      // SG19：只得一粒掣時去掉「1. 」編號前綴（編號只有多過一粒掣才有意義）。
      // 只食開頭嘅 `^\d+\.\s*`，唔會破壞自訂 label 中間嘅數字。
      a.textContent = isMulti ? rawLabel : String(rawLabel).replace(/^\d+\.\s*/, '');
      actions.appendChild(a);
    });

    box.appendChild(badgeEl);
    box.appendChild(h1);
    box.appendChild(p);
    box.appendChild(actions);

    // SG7：直開網址時講清楚「加入主畫面」要由入口入，防止裝出一個打不開嘅圖示
    if (options.showInstallHint !== false && !isClosed && win && win.navigator && win.navigator.serviceWorker) {
      const hint = doc.createElement('p');
      hint.className = 'sg-sub';
      hint.textContent = c.installHint;
      box.appendChild(hint);
    }

    const sec = Number(options.autoRedirectSeconds || 0);
    if (sec > 0 && win && typeof win.setTimeout === 'function') {
      const sub = doc.createElement('p');
      sub.className = 'sg-sub';
      // 講清楚「會自動去邊個入口」，避免用家唔知跳去邊（預設永遠係第一粒＝APP STORE）
      const primaryName = isMulti
        ? (lang === 'en' ? actionPortals[0].labelEn : actionPortals[0].labelZh)
        : '';
      sub.textContent = isMulti
        ? `${c.countdownPrefix}${sec}${c.countdownSuffix}（${primaryName}）`
        : `${c.countdownPrefix}${sec}${c.countdownSuffix}`;
      box.appendChild(sub);
      const autoTarget = (options.autoRedirectPortalId && getPortal(options.autoRedirectPortalId))
        ? getPortal(options.autoRedirectPortalId).url
        : primaryUrl;
      win.setTimeout(() => {
        try {
          (win.top || win).location.replace(autoTarget);
        } catch {
          win.location.replace(autoTarget);
        }
      }, sec * 1000);
    }
    return box;
  };

  if (doc.body) {
    mount();
  } else if (typeof doc.addEventListener === 'function') {
    doc.addEventListener('DOMContentLoaded', mount, { once: true });
  }
  return decision;
}

function initStoreGate(options = {}, win = typeof window !== 'undefined' ? window : null) {
  const doc = (options && options.document) || (win && win.document) || null;
  const appKey = String((options && options.appKey) || 'scoutapp').replace(/[^a-zA-Z0-9_-]/g, '') || 'scoutapp';
  const passKey = `${appKey}.store_pass`;

  let inIframe = false;
  if (win) {
    try {
      inIframe = win.self !== win.top;
    } catch {
      inIframe = true; // 跨源存取 win.top 拋錯即代表身處 iframe 內
    }
  }

  let selfOrigin = '';
  try {
    selfOrigin = (win && win.location && win.location.origin) || '';
  } catch {
    selfOrigin = '';
  }

  const decision = evaluateStoreGate(options, {
    inIframe,
    standalone: isStandaloneApp(win),
    hasSessionPass: readSessionPass(win, passKey),
    referrer: doc ? doc.referrer || '' : '',
    selfOrigin,
  });

  if (decision.allowed) {
    if (decision.grantSessionPass) {
      writeSessionPass(win, decision.passKey);
    }
    reportGateDecision(win, decision, options);
    if (options.supportNudge && typeof doc !== 'undefined' && doc && doc.body) {
      renderSupportNudge(doc, win, options, decision);
    } else if (options.supportNudge && typeof doc !== 'undefined' && doc && typeof doc.addEventListener === 'function') {
      doc.addEventListener('DOMContentLoaded', () => renderSupportNudge(doc, win, options, decision), { once: true });
    }
    return decision;
  }

  renderGateOverlay(doc, win, decision, options);
  reportGateDecision(win, decision, options);
  return decision;
}

/**
 * SG13：輕量「支持提示」（非阻塞、可關、每 N 日最多一次）
 * 目的唔係防抄（技術上防唔到），而係令「用得着嘅人」有一個極低門檻嘅表態位置，
 * 同時令創作者可以用 clicks／stars／hearts 判斷「值唔值得繼續更新」。
 * 規則：① 只喺獲放行時顯示 ② 永遠唔遮住內容、唔阻擋操作 ③ 有「唔使喇」 ④ 每 N 日最多一次
 *
 * ⚠️ SG18（2026-11-17）：A 組子 App 嘅標準做法係「常駐回跳掣」（子 App 自己頂欄／頁尾
 *    用 getAppStoreUrl(slug) 開新分頁返主站詳情卡），**預設唔開** supportNudge。
 *    兩者並存 = 同一個用家被騷擾兩次；所以由 App 自己揀其一，A 組預設揀 SG18。
 *    （SG13 保留作可選機制，唔會被移除。）
 */
function readLocal(win, key) {
  try {
    return win && win.localStorage ? win.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeLocal(win, key, value) {
  try {
    if (win && win.localStorage) win.localStorage.setItem(key, String(value));
  } catch {
    /* 私隱模式／封鎖 storage 時靜默 */
  }
}

function renderSupportNudge(doc, win, options = {}, decision = {}) {
  const cfg = options.supportNudge;
  if (!cfg || !cfg.url || !doc || !doc.body) return null;
  // 用戶邏輯：經 APP STORE（main）正常入嘅，clicks 已經睇得到，唔需要再提佢。
  // 預設 skipPortalIds: ['appstore']，可用 skipPortalIds: [] 關閉呢個行為。
  const skip = Array.isArray(cfg.skipPortalIds) ? cfg.skipPortalIds : ['appstore'];
  if (decision && decision.matchedPortalId && skip.includes(decision.matchedPortalId)) return null;
  const key = `${String(options.appKey || 'scoutapp')}.support_nudge_at`;
  const days = Number(cfg.days) > 0 ? Number(cfg.days) : 30;
  const last = Number(readLocal(win, key) || 0);
  if (last && Date.now() - last < days * 86400000) return null;

  const lang = options.lang === 'en' ? 'en' : detectCopyLang(doc);
  const c = COPY[lang] || COPY.zh;

  if (!doc.getElementById('scoutSupportNudgeStyle')) {
    const style = doc.createElement('style');
    style.id = 'scoutSupportNudgeStyle';
    style.textContent = [
      '#scoutSupportNudge { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 2147483000; box-sizing: border-box; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 14px; border-radius: 14px; background: rgba(40, 47, 61, 0.97); border: 1px solid rgba(232, 200, 122, 0.35); color: #f5f2eb; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 13px; line-height: 1.5; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4); }',
      '#scoutSupportNudge p { margin: 0; flex: 1 1 220px; }',
      '#scoutSupportNudge a { flex: 0 0 auto; padding: 7px 13px; border-radius: 9px; background: #e8c87a; color: #1f2430; font-weight: 700; text-decoration: none; }',
      '#scoutSupportNudge button { flex: 0 0 auto; padding: 7px 11px; border-radius: 9px; background: transparent; color: #9aa3b5; border: 1px solid rgba(154, 163, 181, 0.45); font-size: 12px; cursor: pointer; }',
      '#scoutSupportNudge a:focus-visible, #scoutSupportNudge button:focus-visible { outline: 2px solid #ffffff; outline-offset: 2px; }',
    ].join('\n');
    (doc.head || doc.documentElement).appendChild(style);
  }

  const box = doc.createElement('div');
  box.id = 'scoutSupportNudge';
  box.setAttribute('role', 'complementary');

  const p = doc.createElement('p');
  p.textContent = cfg.textZh || c.supportText;
  if (lang === 'en') p.textContent = cfg.textEn || c.supportText;

  const a = doc.createElement('a');
  a.href = cfg.url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = lang === 'en' ? c.supportCta : (cfg.ctaZh || c.supportCta);

  const btn = doc.createElement('button');
  btn.type = 'button';
  btn.textContent = lang === 'en' ? c.supportDismiss : (cfg.dismissZh || c.supportDismiss);
  btn.addEventListener = btn.addEventListener || function () {};
  btn.onclick = () => {
    writeLocal(win, key, Date.now());
    if (box.parentNode && typeof box.parentNode.removeChild === 'function') box.parentNode.removeChild(box);
  };

  box.appendChild(p);
  box.appendChild(a);
  box.appendChild(btn);
  doc.body.appendChild(box);
  return box;
}

/** 由外部呼叫（例如 APP STORE 後台）也可以直接記錄已提示時間 */
function markSupportNudgeSeen(win, appKey) {
  writeLocal(win, `${String(appKey || 'scoutapp')}.support_nudge_at`, Date.now());
}

/**
 * SG10：逐入口到訪統計（opt-in，預設完全唔發任何請求）
 * 只有設咗 options.trackEndpoint 先會回報，而且只送最小欄位：
 * appKey / mode / reason / matchedPortalId —— 唔送 IP、唔送 UA、唔送 Referer 全文、唔送任何個人資料。
 * 用 sendBeacon（失敗 fallback 去 fetch keepalive），離場／快速跳轉都報得到。
 */
function buildTrackPayload(decision, options = {}) {
  return {
    appKey: String(options.appKey || 'scoutapp'),
    mode: String(decision.mode || ''),
    reason: String(decision.reason || ''),
    portal: String(decision.matchedPortalId || ''), // '' = 非入口進入（直開／PWA／session pass）
    v: VERSION,
  };
}

function reportGateDecision(win, decision, options = {}) {
  if (!win || !options.trackEndpoint) return null;
  const payload = buildTrackPayload(decision, options);
  if (typeof options.onGateDecision === 'function') {
    try {
      options.onGateDecision(payload);
    } catch {
      /* 回報失敗唔可以影響用家開 App */
    }
  }
  try {
    const body = JSON.stringify(payload);
    if (win.navigator && typeof win.navigator.sendBeacon === 'function') {
      win.navigator.sendBeacon(options.trackEndpoint, body);
      return payload;
    }
    if (typeof win.fetch === 'function') {
      win.fetch(options.trackEndpoint, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    }
  } catch {
    /* 統計永遠唔可以阻住開 App（SG3） */
  }
  return payload;
}

if (typeof globalThis !== 'undefined') {
  globalThis.initStoreGate = initStoreGate;
  globalThis.ScoutStoreGate = {
    VERSION,
    DEFAULT_STORE_URL,
    DEFAULT_LIBRARY_URL,
    DEFAULT_ALLOWED_ORIGINS,
    PORTAL_REGISTRY,
    PORTAL_IDS,
    PORTAL_ORDER,
    OUTBOUND_PORTAL_IDS,
    CANVAS_PORTAL_IDS,
    INBOUND_PORTAL_IDS,
    DEFAULT_PORTAL_IDS,
    CONDITIONAL_PORTAL_IDS,
    OPTIONAL_PORTAL_IDS,
    NEVER_ADMIT_PORTAL_IDS,
    resolvePortalIds,
    getPortal,
    getAppStoreUrl,
    portalsFromIds,
    buildTrackPayload,
    reportGateDecision,
    renderSupportNudge,
    markSupportNudgeSeen,
    parseAllowedOrigin,
    normalizePortals,
    isStandaloneApp,
    evaluateStoreGate,
    initStoreGate,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VERSION,
    DEFAULT_STORE_URL,
    DEFAULT_LIBRARY_URL,
    DEFAULT_ALLOWED_ORIGINS,
    PORTAL_REGISTRY,
    PORTAL_IDS,
    PORTAL_ORDER,
    OUTBOUND_PORTAL_IDS,
    CANVAS_PORTAL_IDS,
    INBOUND_PORTAL_IDS,
    DEFAULT_PORTAL_IDS,
    CONDITIONAL_PORTAL_IDS,
    OPTIONAL_PORTAL_IDS,
    NEVER_ADMIT_PORTAL_IDS,
    resolvePortalIds,
    getPortal,
    getAppStoreUrl,
    portalsFromIds,
    buildTrackPayload,
    reportGateDecision,
    renderSupportNudge,
    markSupportNudgeSeen,
    parseAllowedOrigin,
    normalizePortals,
    isStandaloneApp,
    evaluateStoreGate,
    initStoreGate,
  };
}
