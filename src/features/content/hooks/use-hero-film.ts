'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

import { useMediaQuery } from '@/hooks/use-media-query';
import { useTheme } from '@/hooks/use-theme';

import type { ThemedAsset } from '../schemas/homepage.schema';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** HTMLMediaElement.HAVE_METADATA — duration and dimensions are known. */
const HAVE_METADATA = 1;

export interface HeroFilm {
  /** The film is offered at all: there is one, and the reader did not ask for less motion. */
  readonly isEnabled: boolean;
  /** The film can play, so it may fade in over the still. */
  readonly isReady: boolean;
}

/** What survives a source swap: which cut is attached, and where to carry on from. */
interface FilmPosition {
  applied: string | null;
  resumeAt: number;
}

/**
 * Attaches one cut of the film to the element and plays it from where the last
 * cut was; answers the cleanup.
 *
 * STATE-04: a <video> element is an external system holding playback state React
 * cannot express. "Swap the source but carry on from the same instant" has no
 * declarative form — changing a `src` prop reloads the media and drops the
 * position — so the swap is driven imperatively.
 */
function playFilm(
  element: HTMLVideoElement,
  source: string,
  position: FilmPosition,
  onReady: () => void,
): () => void {
  const startPlayback = (): void => {
    // The two cuts are the same film graded differently, but nothing guarantees
    // identical lengths, so a position past the end of the incoming file is
    // clamped rather than left for the browser to reject.
    element.currentTime = Number.isFinite(element.duration)
      ? Math.min(position.resumeAt, element.duration)
      : position.resumeAt;

    // Muted autoplay is permitted; if a browser still declines, the still simply
    // remains, which is a good state rather than an error.
    void element.play().catch(() => undefined);
    onReady();
  };

  /*
   * The listener is attached FIRST and unconditionally. React runs effect →
   * cleanup → effect on mount in development; attaching inside the branch below
   * means the second run skips it while the cleanup has already removed the first
   * one, so `loadedmetadata` fires with nothing listening and the film never
   * starts. Measured, not theorised.
   */
  element.addEventListener('loadedmetadata', startPlayback);

  // Idempotent: `load()` resets `currentTime` to zero, so a second swap that
  // re-read the element would capture that zero and restart the film.
  if (position.applied !== source) {
    // Read BEFORE the source changes; on first mount it is zero, where the film starts.
    position.resumeAt = element.currentTime;
    position.applied = source;
    element.src = source;
    element.load();
  } else if (element.readyState >= HAVE_METADATA && element.paused) {
    // Already loaded and nothing will fire again — resume directly.
    startPlayback();
  }

  return () => {
    element.removeEventListener('loadedmetadata', startPlayback);
  };
}

/**
 * The hero film's playback: one cut per colour scheme, swapped without losing the
 * reader's place when the theme changes.
 *
 * A11Y-10: a reader who asked for less motion gets the still, no autoplay, and
 * none of the video bytes.
 *
 * `videoRef` is the component's, attached to its `<video>`: a ref handed back
 * inside the hook's answer would make every field of that answer a ref read
 * during render (react-hooks/refs).
 */
export function useHeroFilm(
  videoRef: RefObject<HTMLVideoElement | null>,
  video: ThemedAsset | null,
): HeroFilm {
  const position = useRef<FilmPosition>({ applied: null, resumeAt: 0 });
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  useEffect(() => {
    const element = videoRef.current;
    if (element === null || video === null || prefersReducedMotion) return;

    return playFilm(element, video[theme], position.current, () => {
      setIsReady(true);
    });
  }, [videoRef, theme, video, prefersReducedMotion]);

  return { isEnabled: video !== null && !prefersReducedMotion, isReady };
}
