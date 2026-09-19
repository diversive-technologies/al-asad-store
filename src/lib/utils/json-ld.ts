/**
 * §30.5's structured data, written into the page as `<script type="application/ld+json">`.
 *
 * SECURITY — that script is an XSS sink. Its body is raw text to the HTML parser,
 * which ends it at the first `</script` it meets whatever JSON quoting surrounds
 * it, so a product name of `</script><script>…` would close the block and run
 * the rest as markup. Every value in it comes from the backend — names,
 * descriptions, image addresses — so none of it can be trusted to be free of that.
 *
 * `serializeJsonLd` is the ONE place such a script's body is produced (CMP-13,
 * SEC-04). It escapes, as JSON `\uXXXX` sequences a JSON parser reads back as the
 * same characters:
 *
 * - `<` and `>` — so no tag can open or close, and `<!--` cannot start a comment
 *   that changes how the parser reads the rest of the script;
 * - `&` — never needed by JSON, and one less character an HTML reader treats
 *   specially;
 * - U+2028 and U+2029 — legal inside a JSON string but line terminators to an
 *   older JavaScript parser, which a consumer may still be.
 *
 * Nothing else changes, so the data a search engine reads is exactly the data
 * built — `JSON.parse` of the output equals the input.
 */

/** Any value a JSON-LD document may hold. `undefined` drops a key, as it does in JSON. */
export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonLdValue[]
  | { readonly [key: string]: JsonLdValue | undefined };

/** A JSON-LD document: an object at the top, as `@context` requires. */
export type JsonLdDocument = { readonly [key: string]: JsonLdValue | undefined };

const UNSAFE_CHARACTERS = /[<>&\u2028\u2029]/g;

const ESCAPES: Readonly<Record<string, string>> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/** The body of a JSON-LD script, safe to place inside one. See the file header. */
export function serializeJsonLd(document: JsonLdDocument): string {
  return JSON.stringify(document).replace(
    UNSAFE_CHARACTERS,
    (character) => ESCAPES[character] ?? character,
  );
}
