import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'glass' | 'neo' | 'dark';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-white border border-slate-100 shadow-sm',
      glass: 'glass-card',
      neo: 'neo-brutalist-card',
      dark: 'bg-slate-950 text-white border border-white/5',
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={cn('rounded-3xl p-6', variants[variant], className)}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export { Card };
