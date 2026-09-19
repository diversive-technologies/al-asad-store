import type { ReactNode } from 'react';

export interface WishlistPromptProps {
  heading: string;
  body: string;
  /** The one thing to do next, as a link. */
  children: ReactNode;
}

/**
 * A saved-items page with no grid to show — nobody signed in, or nothing saved
 * yet — said as a heading, a sentence and the way on.
 */
export function WishlistPrompt({ heading, body, children }: WishlistPromptProps) {
  return (
    <div className="flex flex-col items-start gap-3 py-16">
      <h2 className="text-fg text-lg font-medium">{heading}</h2>
      <p className="text-fg-muted">{body}</p>
      {children}
    </div>
  );
}
