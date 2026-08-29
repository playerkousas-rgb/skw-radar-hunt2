import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode } from 'lucide-react';

interface Props {
  value: string;
  size?: number;
  /** Renders a white padded card like the previous external-QR styling. */
  framed?: boolean;
  className?: string;
}

/**
 * 本地產生的 QR Code（不依賴外部 api.qrserver.com）。
 * 使用 `qrcode` 套件直接在裝置上把文字轉成 data URL，離線也能顯示。
 */
export default function QRCodeImage({ value, size = 240, framed = true, className }: Props) {
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setError(false);
    if (!value) { setDataUrl(''); return; }
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    }).then((url) => {
      if (active) setDataUrl(url);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => { active = false; };
  }, [value, size]);

  if (error) {
    return (
      <div className={`bg-slate-800 rounded-xl flex flex-col items-center justify-center ${className}`}
        style={{ width: size, height: size }}>
        <QrCode size={36} className="text-slate-600 mb-1" />
        <p className="text-[10px] text-slate-500 text-center px-2">QR 碼產生失敗<br />請改用連結分享</p>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className={`bg-slate-800 rounded-xl flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}>
        <span className="text-slate-500 text-sm animate-pulse">產生中…</span>
      </div>
    );
  }

  if (framed) {
    return (
      <div className="bg-white rounded-xl inline-block shadow-xl" style={{ padding: size * 0.04 }}>
        <img src={dataUrl} alt="QR Code" width={size} height={size} className="block" />
      </div>
    );
  }

  return <img src={dataUrl} alt="QR Code" width={size} height={size} className={className} />;
}
