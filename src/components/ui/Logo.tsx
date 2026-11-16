interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 28, className = '' }: LogoProps) {
  return (
    <img
      src="/icons/icon-192.png"
      width={size}
      height={size}
      alt="Kharcha Logo"
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
