import type { MetadataRoute } from 'next';

import { robotsRules } from '@/lib/utils/robots';

/**
 * §30.5 — `/robots.txt`. The rules are data in `lib/utils/robots.ts`, where they
 * are tested against every page's own `noindex`; this file only serves them.
 */
export default function robots(): MetadataRoute.Robots {
  return robotsRules();
}
