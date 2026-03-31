type BrandLogoProps = {
  className?: string;
  subtitle?: string;
};

export function BrandLogo({ className, subtitle }: BrandLogoProps) {
  const rootClassName = ['brand-logo', className].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      <span className="brand-logo-wordmark">MavieHealth</span>
      {subtitle ? <span className="brand-logo-subtitle">{subtitle}</span> : null}
    </div>
  );
}
