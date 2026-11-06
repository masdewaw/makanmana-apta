import { cn } from '@/lib/utils'

export function BrandLogo({ iconOnly = false, className }: { iconOnly?: boolean; className?: string }) {
  return <span className={cn('brand-lockup', className)} aria-label="MakanMana" role="img">
    <img className="brand-logo-icon" src="/brand/makanmana-mark.svg" alt="" width="36" height="36" />
    {!iconOnly && <span className="brand-name" aria-hidden="true">makanmana<span>.</span></span>}
  </span>
}
