import { randomUUID } from 'crypto';

// uuid@14 ships ESM-only with no CommonJS build, which breaks under Jest's
// default CJS transform for anything that transitively imports it (e.g.
// ConnectionsService). This test-only shim keeps behavior equivalent
// (real random UUIDs) while staying CommonJS-compatible.
export function v4(): string {
  return randomUUID();
}
