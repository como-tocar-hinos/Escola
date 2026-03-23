import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'flex w-full rounded-2xl border-2 border-slate-50 bg-slate-50/50 px-5 py-3 text-sm font-bold transition-all placeholder:text-slate-400 focus:border-red-600 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-[10px] font-bold text-red-500 ml-4">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
