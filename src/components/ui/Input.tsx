import type { JSX } from 'preact';

export interface InputProps extends JSX.HTMLAttributes<HTMLInputElement> {
  className?: string;
  type?: string;
  placeholder?: string;
  value?: any;
  required?: boolean;
  step?: string | number;
  autoComplete?: string;
  autoFocus?: boolean;
  onInput?: (e: any) => void;
  onChange?: (e: any) => void;
}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
