import { describe, it, expect } from 'vitest';
import { canonicalize, sha256Canonical } from '../src/crypto/canonicalize.js';

describe('RFC 8785 Canonicalization', () => {
  it('should sort object keys by UTF-16 code unit order', () => {
    const input = { z: 1, a: 2, m: 3 };
    expect(canonicalize(input)).toBe('{"a":2,"m":3,"z":1}');
  });

  it('should handle null values', () => {
    expect(canonicalize(null)).toBe('null');
    expect(canonicalize({ a: null })).toBe('{"a":null}');
  });

  it('should omit undefined object keys', () => {
    const input = { a: 1, b: undefined, c: 3 };
    expect(canonicalize(input)).toBe('{"a":1,"c":3}');
  });

  it('should handle nested objects', () => {
    const input = { b: { d: 1, c: 2 }, a: 0 };
    expect(canonicalize(input)).toBe('{"a":0,"b":{"c":2,"d":1}}');
  });

  it('should handle arrays', () => {
    const input = [3, 1, 2];
    expect(canonicalize(input)).toBe('[3,1,2]');
  });

  it('should handle booleans', () => {
    expect(canonicalize(true)).toBe('true');
    expect(canonicalize(false)).toBe('false');
  });

  it('should handle strings with special characters', () => {
    expect(canonicalize('hello "world"')).toBe('"hello \\"world\\""');
  });

  it('should handle numbers', () => {
    expect(canonicalize(42)).toBe('42');
    expect(canonicalize(3.14)).toBe('3.14');
    expect(canonicalize(-0)).toBe('0');
  });

  it('should throw on non-finite numbers', () => {
    expect(() => canonicalize(Infinity)).toThrow('RFC 8785');
    expect(() => canonicalize(NaN)).toThrow('RFC 8785');
  });

  it('should produce deterministic SHA-256 hashes', () => {
    const hash1 = sha256Canonical({ b: 1, a: 2 });
    const hash2 = sha256Canonical({ a: 2, b: 1 });
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });
});
