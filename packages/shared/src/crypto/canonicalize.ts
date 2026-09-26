// RFC 8785 — JSON Canonicalization Scheme (JCS)
// Produces deterministic, byte-identical canonical JSON.
// Both TypeScript and Python MUST produce identical output (AGENTS.md §3.8).

import { createHash } from 'crypto';

/**
 * Canonicalize a value according to RFC 8785 (JCS).
 * - Object keys sorted by UTF-16 code unit order
 * - No insignificant whitespace
 * - Numbers formatted per ECMAScript
 * - null preserved, undefined keys omitted
 */
export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    // RFC 8785 §3.2.2.3: ECMAScript number serialization
    if (!isFinite(value)) {
      throw new Error('RFC 8785: non-finite numbers are not allowed');
    }
    // JSON.stringify handles -0, integers, and floats correctly for ECMAScript
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    // RFC 8785 §3.2.2.2: JSON string with required escaping
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalize(item));
    return '[' + items.join(',') + ']';
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // RFC 8785 §3.2.3: Sort keys by UTF-16 code unit order
    const keys = Object.keys(obj).sort((a, b) => {
      // Compare by UTF-16 code units
      const aLen = a.length;
      const bLen = b.length;
      const minLen = Math.min(aLen, bLen);
      for (let i = 0; i < minLen; i++) {
        const aCode = a.charCodeAt(i);
        const bCode = b.charCodeAt(i);
        if (aCode !== bCode) {
          return aCode - bCode;
        }
      }
      return aLen - bLen;
    });

    const entries: string[] = [];
    for (const key of keys) {
      const val = obj[key];
      if (val !== undefined) {
        entries.push(JSON.stringify(key) + ':' + canonicalize(val));
      }
    }
    return '{' + entries.join(',') + '}';
  }

  throw new Error(`RFC 8785: unsupported type: ${typeof value}`);
}

/**
 * SHA-256 hash of the RFC 8785 canonical JSON representation.
 * Returns lowercase hex string.
 */
export function sha256Canonical(value: unknown): string {
  const canonical = canonicalize(value);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * SHA-256 hash of raw bytes (for file hashing).
 * Returns lowercase hex string.
 */
export function sha256Hex(data: Buffer | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}
