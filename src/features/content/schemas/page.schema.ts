import { z } from 'zod';

/**
 * SSOT-09 — the wire contract for section 21's `ContentQuery.page(slug, locale)`.
 *
 * The body is a list of typed blocks rather than a string of HTML, and that is
 * deliberate: CMP-13 prohibits `dangerouslySetInnerHTML` unless the content is
 * sanitised in a dedicated reviewed module. Modelling the body as blocks means
 * editorial content can never carry markup into the page at all, so there is
 * nothing to sanitise and no injection surface to review.
 */
const pageBlockSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('HEADING'), id: z.string().min(1), text: z.string().min(1) }),
  z.object({ kind: z.literal('PARAGRAPH'), id: z.string().min(1), text: z.string().min(1) }),
  z.object({
    kind: z.literal('DEFINITION'),
    id: z.string().min(1),
    term: z.string().min(1),
    description: z.string().min(1),
  }),
]);

export type PageBlock = z.infer<typeof pageBlockSchema>;

export const staticPageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  intro: z.string().min(1),
  blocks: z.array(pageBlockSchema),
});

export type StaticPage = z.infer<typeof staticPageSchema>;
