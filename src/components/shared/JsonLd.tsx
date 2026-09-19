import { serializeJsonLd, type JsonLdDocument } from '@/lib/utils/json-ld';

export interface JsonLdProps {
  /** One JSON-LD document, built by a structured-data builder from served content. */
  data: JsonLdDocument;
}

/**
 * §30.5's structured data, as the script a search engine reads. Rendered in the
 * page body, which Google and the schema.org validator both read, so a route adds
 * it beside what it describes rather than through `<head>` (NEXT-11 governs the
 * metadata object, and JSON-LD is not part of it).
 *
 * A plain `<script>` rather than `next/script`: this is data the browser never
 * executes, and `next/script` exists to schedule code.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // SECURITY: the body is served content (product names, descriptions, image
      // addresses) and is written ONLY by `serializeJsonLd`, the reviewed module
      // that escapes `<`, `>`, `&`, U+2028 and U+2029 so nothing in it can close
      // this script or open another (CMP-13, SEC-04). Tested with hostile strings.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
