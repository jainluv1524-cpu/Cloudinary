import type { SigningPayload } from '../types/index.js';
import { canonicalize } from './canonicalize.js';

/**
 * Build the exact byte sequence the capture app signs.
 * This is the canonical JSON of the signing payload.
 * Any edit to caption, phase, or location invalidates the signature.
 */
export function buildSigningPayload(input: {
  sha256: string;
  exif_hash: string;
  captured_at: string;
  gps: SigningPayload['gps'];
  project_id: string;
  observation_type: string;
  phase: SigningPayload['phase'];
  caption: string | null;
}): string {
  const payload: SigningPayload = {
    v: 1,
    sha256: input.sha256,
    exif_hash: input.exif_hash,
    captured_at: input.captured_at,
    gps: input.gps,
    project_id: input.project_id,
    observation_type: input.observation_type,
    phase: input.phase,
    caption: input.caption,
  };

  return canonicalize(payload);
}
