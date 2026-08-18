import { ReactNode } from 'react';

interface Props {
  className?: string;
  children?: ReactNode;
}

/**
 * Shared copyright footer — Scout System.
 * 使用於各畫面底部，保持全 App 版權聲明一致。
 */
export default function CopyrightFooter({ className = '', children }: Props) {
  return (
    <div className={`text-center ${className}`}>
      {children}
      <p className="text-[10px] text-slate-600 tracking-[0.3em] font-bold select-none">
        COPYRIGHT © 2026 SCOUT SYSTEM
      </p>
      <p className="text-[9px] text-slate-700 mt-0.5 select-none">
        ALL RIGHTS RESERVED
      </p>
    </div>
  );
}
