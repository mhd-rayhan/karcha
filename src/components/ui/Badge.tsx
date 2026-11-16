import type { ComponentChildren } from 'preact';

export interface BadgeProps {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
  className?: string;
  children: ComponentChildren;
}

export function Badge({ variant = 'default', className = '', children }: BadgeProps) {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors border';

  const variants = {
    default: 'border-transparent bg-primary text-primary-foreground',
    secondary: 'border-transparent bg-secondary text-secondary-foreground',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    destructive: 'border-destructive/20 bg-destructive/10 text-destructive',
    outline: 'border-border text-foreground',
  };

  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>;
}
