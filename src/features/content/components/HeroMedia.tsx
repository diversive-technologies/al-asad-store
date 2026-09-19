'use client';

import { useRef } from 'react';

import Image from 'next/image';

import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils/cn';

import { useHeroFilm } from '../hooks/use-hero-film';
import type { ThemedAsset } from '../schemas/homepage.schema';

export interface HeroMediaProps {
  poster: ThemedAsset;
  video: ThemedAsset | null;
}

/**
 * The hero backdrop: one still and one film per colour scheme.
 *
 * MOD-06 / PERF-01 — the smallest leaf that must be a Client Component. The
 * section around it, its headline and its call to action all stay on the
 * server. The still lives here rather than above, because a Server Component
 * cannot re-render when the reader toggles the theme, and a still graded for a
 * dark page is wrong on a light one. The film's playback is `useHeroFilm`.
 *
 * Section 30.1 — the film never blocks first render. The still is an optimised
 * `next/image` loaded eagerly at high fetch priority (Next 16 deprecates
 * `priority` for exactly these two props), present in the initial HTML, so the largest
 * contentful paint is already on screen while the video bytes are still
 * arriving. The film fades in only once it can play.
 *
 * The film COVERS the section - full width and full height, cropped rather than
 * letterboxed - so it reaches both side edges at every screen size, and
 * `hero-frame` alone decides how tall that is: never more than one screen. It
 * used to be a 16:9 stage sized from the section's HEIGHT, which left bands
 * beside the film on any viewport wider than 16:9 — and most desktop browser
 * viewports are, once the browser's own chrome comes off the screen.
 *
 * `object-top`, because on a wide screen the crop comes off the bottom: the
 * subject's head sits near the top of the frame, and the bottom is where the
 * caption and its scrim are anyway. The scrim is a gradient, not a flat wash —
 * see `hero-scrim` in globals.css: strong under the caption and clear over the
 * rest, so the film stays bright while A11Y-07 contrast holds where the text is.
 */
export function HeroMedia({ poster, video }: HeroMediaProps) {
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const film = useHeroFilm(videoRef, video);

  return (
    <div className="absolute inset-0 -z-20 overflow-hidden">
      <Image
        src={poster[theme]}
        alt=""
        aria-hidden
        fill
        loading="eager"
        fetchPriority="high"
        sizes="100vw"
        className="object-cover object-top"
      />

      {film.isEnabled ? (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          // A11Y-04: decorative - the headline beside it carries the meaning.
          aria-hidden
          className={cn(
            'absolute inset-0 h-full w-full object-cover object-top',
            'transition-opacity duration-500 motion-reduce:transition-none',
            film.isReady ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : null}

      <div className="hero-scrim absolute inset-0" aria-hidden />
    </div>
  );
}
