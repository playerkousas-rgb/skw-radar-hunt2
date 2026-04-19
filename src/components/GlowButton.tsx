import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

interface Props {
  title: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export default function GlowButton({
  title,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  className = '',
}: Props) {
  const baseStyles = 'flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200';
  
  const variantStyles = {
    primary: `
      bg-cyan-400 text-slate-900 border border-cyan-400
      hover:bg-cyan-300 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]
      active:scale-95
    `,
    secondary: `
      bg-violet-500 text-white border border-violet-500
      hover:bg-violet-400 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]
      active:scale-95
    `,
    danger: `
      bg-red-500 text-white border border-red-500
      hover:bg-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]
      active:scale-95
    `,
    ghost: `
      bg-transparent text-cyan-400 border border-cyan-400
      hover:bg-cyan-400/10
      active:scale-95
    `,
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const disabledStyles = disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${disabledStyles}
        ${className}
      `}
    >
      {loading ? (
        <Loader2 size={size === 'lg' ? 22 : size === 'sm' ? 16 : 18} className="animate-spin" />
      ) : (
        <>
          {icon}
          <span>{title}</span>
        </>
      )}
    </motion.button>
  );
}
