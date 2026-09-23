import Link from 'next/link';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
  href?: string | null;
  /** light = dark text on light bg; dark = light text on dark sidebar */
  tone?: 'light' | 'dark';
  showWordmark?: boolean;
  size?: 'sm' | 'md';
  subtitle?: string;
  className?: string;
};

/** Abstract layered mark — org hierarchy / flow. Not letter initials. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-full w-full', className)}
      aria-hidden
    >
      <rect x="3" y="17" width="12" height="12" rx="3" fill="currentColor" opacity="0.35" />
      <rect x="10" y="9" width="12" height="12" rx="3" fill="currentColor" opacity="0.65" />
      <rect x="17" y="3" width="12" height="12" rx="3" fill="currentColor" />
    </svg>
  );
}

export function BrandLogo({
  href = '/',
  tone = 'light',
  showWordmark = true,
  size = 'md',
  subtitle,
  className,
}: BrandLogoProps) {
  const markBox = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const titleClass = size === 'sm' ? 'text-base' : 'text-sm';

  const content = (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <span
        className={cn(
          markBox,
          'flex shrink-0 items-center justify-center rounded-[0.55rem] p-1.5',
          tone === 'dark'
            ? 'bg-white/10 text-[var(--brand)]'
            : 'bg-[var(--primary)] text-white shadow-sm',
        )}
      >
        <BrandMark />
      </span>
      {showWordmark ? (
        <span className="min-w-0">
          <span
            className={cn(
              'block truncate font-semibold tracking-tight',
              titleClass,
              tone === 'dark' ? 'text-white' : 'text-[var(--ink)]',
            )}
          >
            OrgFlow
          </span>
          {subtitle ? (
            <span
              className={cn(
                'block truncate text-[11px] font-medium',
                tone === 'dark' ? 'text-[var(--sidebar-muted)]' : 'text-[var(--muted)]',
              )}
            >
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );

  if (href === null) return content;

  return (
    <Link href={href} className="inline-flex min-w-0 rounded-md focus-visible:outline-none">
      {content}
    </Link>
  );
}
