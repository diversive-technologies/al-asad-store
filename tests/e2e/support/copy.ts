/** Escapes text so it matches itself inside a `RegExp`. */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A registry message as a whole-text pattern in which every `{placeholder}`
 * matches any text — so a journey can find "Size L is sold out…" without knowing
 * which size in advance, from the same words the page draws (SSOT-07) rather
 * than a second copy of them. Each placeholder is a capture group, in order.
 */
export function messagePattern(template: string): RegExp {
  const pieces = template.split(/\{\w+\}/);
  return new RegExp(`^${pieces.map(escapeRegExp).join('(.+?)')}$`);
}

/** Text that starts with `prefix` — an accessible name that goes on to carry a count or state. */
export function startsWith(prefix: string): RegExp {
  return new RegExp(`^${escapeRegExp(prefix)}`);
}

/**
 * The first placeholder's value in `text`, read by `template`. Fails loudly
 * rather than answering an empty string: a journey that reads the wrong words
 * should stop there, not carry on with a blank.
 */
export function readPlaceholder(template: string, text: string): string {
  const value = messagePattern(template).exec(text.trim())?.[1];
  if (value === undefined) throw new Error(`"${text}" does not read as "${template}".`);
  return value;
}
