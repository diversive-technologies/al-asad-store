/**
 * STRUCT-04 / STRUCT-06 — the public barrel. Other features and `app/` import
 * from here; reaching into this feature's internals is PROHIBITED.
 */
export { fetchHealth } from './api/fetch-health';
export { FoundationStatus, type FoundationStatusProps } from './components/FoundationStatus';
export { healthSchema, type Health } from './schemas/health.schema';
