import type { ComponentChildren, JSX } from 'preact';

export interface SelectProps extends JSX.HTMLAttributes<HTMLSelectElement> {
  className?: string;
  value?: any;
  disabled?: boolean;
  onChange?: (e: any) => void;
  children: ComponentChildren;
}

export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
