import type { UserSettings } from '../lib/types';

declare global {
  interface Window {
    ScoutStoreGate?: { getAppStoreUrl?: (slug: string) => string };
  }
}

export default function StoreSupportTop({ language }: { language: UserSettings['language'] }) {
  const href = window.ScoutStoreGate?.getAppStoreUrl?.('skw-radar-hunt2') || undefined;
  const isEnglish = language === 'en';
  const description = isEnglish
    ? 'Like or save this app in SCOUT APP STORE (opens in a new tab)'
    : '前往主站讚好或收藏此程式（開新分頁）';

  return (
    <header className="store-topbar" hidden={!href}>
      <a
        id="storeSupportTop"
        className="support-btn"
        href={href}
        target="_blank"
        rel="noopener"
        hidden={!href}
        lang={isEnglish ? 'en' : 'zh-Hant-HK'}
        aria-label={description}
        title={description}
      >
        <span aria-hidden="true">♡</span> {isEnglish ? 'Like / Save' : '讚好／收藏'}
      </a>
    </header>
  );
}
