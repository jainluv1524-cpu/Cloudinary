import { describe, it, expect } from 'vitest';
import {
  CreateProjectSchema,
  AssetFilterSchema,
  SearchQuerySchema,
  isAllowedTransformation,
} from '../src/schemas/index.js';

describe('CreateProjectSchema', () => {
  it('should accept valid project data', () => {
    const result = CreateProjectSchema.safeParse({
      name: 'Test Project',
      sector: 'forestry',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const result = CreateProjectSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

describe('AssetFilterSchema', () => {
  it('should accept valid filters', () => {
    const result = AssetFilterSchema.safeParse({
      phase: 'before',
      asset_type: 'image',
      limit: 50,
    });
    expect(result.success).toBe(true);
  });

  it('should clamp limit to max 100', () => {
    const result = AssetFilterSchema.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });

  it('should validate bbox format', () => {
    const valid = AssetFilterSchema.safeParse({ bbox: '1.0,2.0,3.0,4.0' });
    expect(valid.success).toBe(true);

    const invalid = AssetFilterSchema.safeParse({ bbox: 'not,a,bbox' });
    expect(invalid.success).toBe(false);
  });
});

describe('isAllowedTransformation', () => {
  it('should allow named transforms', () => {
    expect(isAllowedTransformation('report_thumb')).toBe(true);
    expect(isAllowedTransformation('report_full')).toBe(true);
  });

  it('should allow safe delivery parameters', () => {
    expect(isAllowedTransformation('w_400,h_300,c_fill,f_auto,q_auto')).toBe(true);
  });

  it('should reject unknown parameters', () => {
    expect(isAllowedTransformation('e_gen_fill')).toBe(false);
    expect(isAllowedTransformation('l_text:Arial_50:hack')).toBe(false);
  });
});
