export interface SuggestionTermsProps {
  terms: readonly string[];
  heading: string;
  /** What the customer has typed, emboldened wherever it appears in a term. */
  highlight: string;
  onSelect: (term: string) => void;
}

/**
 * The left column: terms to search for.
 *
 * The typed fragment is shown in BOLD inside each term, with the rest muted —
 * "**Track** Pants", "**Track**suits". That is not decoration: it is what makes
 * the row read as "your search, continued" rather than as an unrelated
 * suggestion, and it shows at a glance why each one is being offered.
 *
 * No `'use client'`. It holds no state; the one handler comes from the parent,
 * which is already a Client Component (MOD-06).
 */
export function SuggestionTerms({ terms, heading, highlight, onSelect }: SuggestionTermsProps) {
  return (
    <section aria-labelledby="search-terms-heading" className="min-w-0">
      <div className="search-overlay-heading">
        <h2 id="search-terms-heading">{heading}</h2>
      </div>

      <ul className="flex flex-col">
        {terms.map((term) => (
          <li key={term}>
            <button
              type="button"
              onClick={() => {
                onSelect(term);
              }}
              className="text-fg-muted hover:text-fg w-full py-2 text-start text-sm transition-colors"
            >
              {splitOnMatch(term, highlight).map((part, index) =>
                part.isMatch ? (
                  // CMP-10: the key is the part's position, which is stable for
                  // a given term — the text itself repeats across parts.
                  <strong key={index} className="text-fg font-semibold">
                    {part.text}
                  </strong>
                ) : (
                  <span key={index}>{part.text}</span>
                ),
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface Part {
  text: string;
  isMatch: boolean;
}

/**
 * Splits a term around the first case-insensitive occurrence of the fragment.
 *
 * Case-insensitive on purpose: someone typing "track" should see the bold land
 * on "Track". The ORIGINAL casing is preserved in the output, so the suggestion
 * still reads the way the operator wrote it.
 */
function splitOnMatch(term: string, fragment: string): Part[] {
  const needle = fragment.trim();
  if (needle.length === 0) return [{ text: term, isMatch: false }];

  const at = term.toLowerCase().indexOf(needle.toLowerCase());
  if (at === -1) return [{ text: term, isMatch: false }];

  return [
    { text: term.slice(0, at), isMatch: false },
    { text: term.slice(at, at + needle.length), isMatch: true },
    { text: term.slice(at + needle.length), isMatch: false },
  ].filter((part) => part.text.length > 0);
}
