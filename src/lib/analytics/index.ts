import 'server-only';

/**
 * M-03 — server-side behaviour events. Nothing here is importable from a Client
 * Component: every module is `server-only`.
 */
export type { EventInput, EventType } from './events';
export {
  recordPageEvents,
  recordPageEventsIf,
  recordRequestEvents,
  visitorHeaders,
} from './record';
export type { VisitorHeaders } from './record';
