'use client';

import { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import { useMediaQuery } from '@/hooks/use-media-query';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils/cn';

import type { ThemedAsset } from '../schemas/homepage.schema';

export interface HeroMediaProps {
  poster: ThemedAsset;
  video: ThemedAsset | null;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** HTMLMediaElement.HAVE_METADATA — duration and dimensions are known. */
const HAVE_METADATA = 1;

/**
 * The hero backdrop: one still and one film per colour scheme.
 *
 * MOD-06 / PERF-01 — the smallest leaf that must be a Client Component. The
 * section around it, its headline and its call to action all stay on the
 * server. The still lives here rather than above, because a Server Component
 * cannot re-render when the reader toggles the theme, and a still graded for a
 * dark page is wrong on a light one.
 *
 * Section 30.1 — the film never blocks first render. The still is an optimised
 * `next/image` with `priority`, present in the initial HTML, so the largest
 * contentful paint is already on screen while the video bytes are still
 * arriving. The film fades in only once it can play.
 */
export function HeroMedia({ poster, video }: HeroMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  /** The source currently attached, so the swap effect can be idempotent. */
  const appliedSourceRef = useRef<string | null>(null);
  /** Where to resume, carried across the source swap. */
  const resumeAtRef = useRef(0);
  const { theme } = useTheme();
  const [isFilmReady, setIsFilmReady] = useState(false);

  // A11Y-10: a reader who asked for less motion gets the still, no autoplay,
  // and none of the video bytes.
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const isFilmEnabled = video !== null && !prefersReducedMotion;

  useEffect(() => {
    const element = videoRef.current;
    if (element === null || video === null || prefersReducedMotion) return;

    const nextSource = video[theme];

    const startPlayback = (): void => {
      /*
       * The two cuts are the same film graded differently, but nothing
       * guarantees identical lengths, so a position past the end of the
       * incoming file is clamped rather than left for the browser to reject.
       */
      element.currentTime = Number.isFinite(element.duration)
        ? Math.min(resumeAtRef.current, element.duration)
        : resumeAtRef.current;

      // Muted autoplay is permitted; if a browser still declines, the still
      // simply remains, which is a good state rather than an error.
      void element.play().catch(() => undefined);
      setIsFilmReady(true);
    };

    /*
     * The listener is attached FIRST and unconditionally, before the guard
     * below can bail out.
     *
     * React runs effect → cleanup → effect on mount in development. Attaching
     * inside the guard means the second run skips it while the cleanup has
     * already removed the first one, so `loadedmetadata` fires with nothing
     * listening and the film never starts. Measured, not theorised.
     */
    element.addEventListener('loadedmetadata', startPlayback);

    /*
     * STATE-04: a <video> element is an external system holding playback state
     * React cannot express. "Swap the source but carry on from the same
     * instant" has no declarative form — changing a `src` prop reloads the
     * media and drops the position — so the swap is driven imperatively.
     *
     * The swap itself must be idempotent: `load()` resets `currentTime` to
     * zero, so a second invocation that re-read the element would capture that
     * zero and restart the film instead of continuing it.
     */
    if (appliedSourceRef.current !== nextSource) {
      // Read BEFORE the source changes. On first mount this is simply zero,
      // which is also where the film should start.
      resumeAtRef.current = element.currentTime;
      appliedSourceRef.current = nextSource;

      element.src = nextSource;
      element.load();
    } else if (element.readyState >= HAVE_METADATA && element.paused) {
      // Already loaded and nothing will fire again — resume directly.
      startPlayback();
    }

    return () => {
      element.removeEventListener('loadedmetadata', startPlayback);
    };
  }, [theme, video, prefersReducedMotion]);

  return (
    /*
     * The film is scaled by HEIGHT only, then centred.
     *
     * `object-fit: cover` scales by whichever axis needs more, so on a tall
     * viewport it crops the sides and on a wide one it crops the top and
     * bottom — which is what was cutting heads off on laptops. Sizing a 16:9
     * stage to the full height instead means the vertical framing the film was
     * shot with is always preserved: wide viewports get bands beside it, narrow
     * ones lose width from both edges evenly.
     *
     * The threshold where bands replace cropping is not a breakpoint we pick;
     * it is wherever the viewport is wider than `height x 16/9`.
     */
    <div className="bg-media-band absolute inset-0 -z-20 flex justify-center overflow-hidden">
      {/*
       * `shrink-0` is load-bearing: without it flex would compress the stage to
       * fit a narrow viewport, which is exactly the squashing this avoids.
       * `aspect-video` states the ratio up front so the stage has its final
       * width before the film's metadata arrives, and the poster underneath
       * cannot shift when it does.
       */}
      <div className="relative aspect-video h-full shrink-0">
        <Image
          src={poster[theme]}
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />

        {isFilmEnabled ? (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="none"
            // A11Y-04: decorative — the headline beside it carries the meaning.
            aria-hidden
            className={cn(
              'absolute inset-0 h-full w-full object-cover',
              'transition-opacity duration-500 motion-reduce:transition-none',
              isFilmReady ? 'opacity-100' : 'opacity-0',
            )}
          />
        ) : null}

        {/*
         * The scrim lives INSIDE the stage, over the film only. Covering the
         * whole section would tint the bands too, and the bands are meant to be
         * the page background so the film reads as sitting on the site rather
         * than in a box. A11Y-07 contrast still holds because the hero copy is
         * constrained to the stage's width.
         */}
        <div className="bg-media-scrim/45 absolute inset-0" aria-hidden />
      </div>
    </div>
  );
}
