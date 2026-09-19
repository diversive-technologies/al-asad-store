'use client';

import { useEffect, useState } from 'react';

export interface UseObjectUrlResult {
  /** A `blob:` address for the file in hand, or null before one is chosen. */
  readonly url: string | null;
  /** Holds a newly chosen file, releasing the one it replaces. */
  readonly hold: (file: File) => void;
  /** Lets go of the file in hand, if any, so nothing is shown and nothing is pinned. */
  readonly release: () => void;
}

/**
 * A customer's own file — a photograph — shown from the device and nowhere else.
 *
 * The address is made when the file is chosen and revoked when a new file
 * replaces it and when the component holding it unmounts, so the file lives
 * exactly as long as it is on screen or waiting to be. Nothing else holds it and
 * nothing writes it anywhere (§24, §30.4). One implementation, so the guarantee
 * is fixed in one place.
 */
export function useObjectUrl(): UseObjectUrlResult {
  const [url, setUrl] = useState<string | null>(null);

  /* STATE-04 — a browser resource with a lifetime: the cleanup releases the old
     address when a new one replaces it, and the last one on unmount. */
  useEffect(() => {
    if (url === null) return undefined;
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [url]);

  return {
    url,
    hold: (file) => {
      setUrl(URL.createObjectURL(file));
    },
    release: () => {
      setUrl(null);
    },
  };
}
