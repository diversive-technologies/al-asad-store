import { cn } from '@/lib/utils/cn';

const PULSE = 'animate-pulse motion-reduce:animate-none';

/**
 * NEXT-14 — the studio's own layout, empty.
 *
 * The same `.mm-scene` grid, and every block the panel will hold — title, a
 * two-line lead, the style chooser, the unit and progress row, the first fields —
 * so nothing moves when the served list arrives. The drawing is a FRAME, not a
 * guessed garment: the stage's height is fixed, so whichever garment comes first
 * cannot move anything around it.
 */
export function StudioSkeleton() {
  const bar = cn('bg-surface-muted rounded-card', PULSE);

  return (
    <div className="mm-scene" aria-hidden>
      <div className="mm-scene-stage">
        <div className={cn('bg-surface rounded-pill h-8 w-56', PULSE)} />
        <div className="mm-flat-frame">
          <div className={cn('bg-surface rounded-card size-full max-w-xs', PULSE)} />
        </div>
      </div>

      <div className="mm-scene-panel">
        <div className="mm-panel-inner">
          <div className={cn(bar, 'mb-8 h-3 w-32')} />
          <div className={cn(bar, 'h-12 w-72 max-w-full')} />
          <div className="mt-4 flex flex-col gap-2">
            <div className={cn(bar, 'h-4 w-full max-w-md')} />
            <div className={cn(bar, 'h-4 w-2/3 max-w-sm')} />
          </div>
          <div className={cn(bar, 'mt-8 h-16 w-72 max-w-full')} />
          <div className="mt-10 flex items-end justify-between gap-4">
            <div className={cn(bar, 'h-8 w-40')} />
            <div className={cn(bar, 'h-3 w-44')} />
          </div>
          <div className="mt-8 flex flex-col gap-6">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className={cn(bar, 'h-16')} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
