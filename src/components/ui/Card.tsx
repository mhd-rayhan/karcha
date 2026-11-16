import type { ComponentChildren, JSX } from 'preact';

export function Card({
  className = '',
  children,
  ...props
}: JSX.HTMLAttributes<HTMLDivElement> & { children: ComponentChildren }) {
  return (
    <div
      className={`rounded-lg border border-border bg-card text-card-foreground shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = '',
  children,
}: { className?: string; children: ComponentChildren }) {
  return <div className={`flex flex-col space-y-1.5 p-5 ${className}`}>{children}</div>;
}

export function CardTitle({
  className = '',
  children,
}: { className?: string; children: ComponentChildren }) {
  return (
    <h3 className={`text-base font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className = '',
  children,
}: { className?: string; children: ComponentChildren }) {
  return <p className={`text-xs text-muted-foreground ${className}`}>{children}</p>;
}

export function CardContent({
  className = '',
  children,
}: { className?: string; children: ComponentChildren }) {
  return <div className={`p-5 pt-0 ${className}`}>{children}</div>;
}
