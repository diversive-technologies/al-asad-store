/**
 * Copying a piece of text for the customer, in whichever way this browser allows,
 * and saying honestly whether it worked.
 *
 * Two ways, tried in order:
 *
 * 1. **The Clipboard API.** Every current browser has it, but only in a SECURE
 *    context — so it is simply absent on a phone opening the store over the LAN
 *    at `http://192.168…`, which is how this store is tested by hand — and it can
 *    refuse: a denied permission, a document without focus.
 * 2. **A selection and the `copy` command.** Deprecated, and still the one thing
 *    that works where the API is missing. The text is put in a visually hidden
 *    element and SELECTED as a range rather than focused in a field, so nothing
 *    takes focus away from the button that was pressed and no phone keyboard
 *    opens.
 *
 * `false` means the text is NOT on the clipboard, and the caller must then show
 * it for the customer to copy themselves: a copy that fails silently is a
 * customer pasting yesterday's clipboard into a message to a friend.
 *
 * Read through `globalThis`, as `browser-storage.ts` is, so a server render and a
 * test process — where neither `navigator.clipboard` nor `document` exists — take
 * the same "could not copy" branch.
 */
export function copyText(text: string): Promise<boolean> {
  const clipboard: Clipboard | undefined = globalThis.navigator?.clipboard;

  /*
   * No API at all: copy NOW, inside the press itself, rather than after an await.
   * The copy command only runs within the gesture that asked for it, and Safari
   * is the strictest about how long that lasts.
   */
  if (clipboard === undefined) return Promise.resolve(copyThroughSelection(text));

  return writeThroughClipboardApi(clipboard, text).then(
    (isCopied) => isCopied || copyThroughSelection(text),
  );
}

async function writeThroughClipboardApi(clipboard: Clipboard, text: string): Promise<boolean> {
  // ERR-05(1): the Clipboard API signals a refusal only by rejecting.
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function copyThroughSelection(text: string): boolean {
  const doc: Document | undefined = globalThis.document;
  const selection = doc?.getSelection() ?? null;
  if (doc === undefined || selection === null) return false;

  const holder = doc.createElement('span');
  holder.textContent = text;
  /*
   * `sr-only` keeps the text rendered — a `display: none` element's text is not
   * copied — while taking no room and showing nothing. `aria-hidden` keeps a
   * screen reader from reading a URL that exists for one call.
   */
  holder.className = 'sr-only';
  holder.setAttribute('aria-hidden', 'true');
  doc.body.append(holder);

  const range = doc.createRange();
  range.selectNodeContents(holder);
  selection.removeAllRanges();
  selection.addRange(range);

  const copied = runCopyCommand(doc);

  selection.removeAllRanges();
  holder.remove();
  return copied;
}

function runCopyCommand(doc: Document): boolean {
  // ERR-05(1): some browsers throw from `execCommand` rather than answering false.
  try {
    return doc.execCommand('copy');
  } catch {
    return false;
  }
}
