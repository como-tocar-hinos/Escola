import React, { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Eye, EyeOff } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
      <div className="space-y-1.5 w-full relative">
        {label && (
          <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={isPassword ? (showPassword ? 'text' : 'password') : type}
            className={cn(
              'flex w-full rounded-2xl border-2 border-slate-50 bg-slate-50/50 px-5 py-3 text-sm font-bold transition-all placeholder:text-slate-400 focus:border-red-600 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus:border-red-500',
              isPassword && 'pr-12',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {error && <p className="text-[10px] font-bold text-red-500 ml-4">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
