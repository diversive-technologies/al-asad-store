/**
 * The DOM id of a measurement's ROW — what focus goes back to when the studio
 * leaves focus mode or returns from the review. Its input would open a phone's
 * keyboard, and focus mode with it.
 */
export function fieldRowId(pointId: string): string {
  return `${pointId}-field`;
}

/**
 * The DOM id of the quiet NOTE under a measurement, so its own input can name it
 * among the things that describe it — without ever calling it an error.
 */
export function fieldNoteId(pointId: string): string {
  return `${pointId}-note`;
}
