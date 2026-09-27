// Verification service — validates signatures, EXIF hashes, and caption signatures.
// This runs in the API (server-side) because:
// - Ed25519 verification needs the device public key (stored in DB)
// - EXIF hash verification needs RFC 8785 canonicalization
// - Caption signature verification needs the signing payload
//
// RULES:
// - Integrity checks return three states: pass, fail, unknown (§3.7)
// - Only 'fail' blocks a report. Never report 'unknown' as 'pass' (§3.7)
// - Clock skew uses NTP offset, not server_received_at - device_capture_timestamp (§3.7)

import nacl from 'tweetnacl';
import { decodeBase64 } from 'tweetnacl-util';
import { sha256Canonical } from '@impact/shared';
import type { VerificationState } from '@impact/shared';

interface VerificationResult {
  check: string;
  state: VerificationState;
  details: Record<string, unknown>;
}

/**
 * Verify the capture signature against the stored public key.
 * The signature is Ed25519 over the canonical JSON signing payload.
 */
export function verifyCaptureSignature(
  signatureBase64: string,
  publicKeyBase64: string,
  signingPayloadCanonical: string,
): VerificationResult {
  try {
    if (!signatureBase64 || !publicKeyBase64 || !signingPayloadCanonical) {
      return {
        check: 'capture_signature',
        state: 'unknown',
        details: { reason: 'Missing signature, public key, or signing payload' },
      };
    }

    const signature = decodeBase64(signatureBase64);
    const publicKey = decodeBase64(publicKeyBase64);
    const message = new TextEncoder().encode(signingPayloadCanonical);

    const valid = nacl.sign.detached.verify(message, signature, publicKey);

    return {
      check: 'capture_signature',
      state: valid ? 'pass' : 'fail',
      details: { valid, signature_tier: 'device' },
    };
  } catch (err) {
    return {
      check: 'capture_signature',
      state: 'fail',
      details: { error: String(err) },
    };
  }
}

/**
 * Verify the EXIF hash matches the stored frozen EXIF.
 * Uses RFC 8785 canonical JSON for deterministic hashing.
 */
export function verifyExifHash(
  storedExif: Record<string, unknown>,
  storedExifHash: string,
): VerificationResult {
  try {
    if (!storedExif || !storedExifHash) {
      return {
        check: 'exif_hash',
        state: 'unknown',
        details: { reason: 'Missing EXIF data or hash' },
      };
    }

    const computedHash = sha256Canonical(storedExif);
    const matches = computedHash === storedExifHash;

    return {
      check: 'exif_hash',
      state: matches ? 'pass' : 'fail',
      details: { computed: computedHash, stored: storedExifHash, matches },
    };
  } catch (err) {
    return {
      check: 'exif_hash',
      state: 'fail',
      details: { error: String(err) },
    };
  }
}

/**
 * Verify the caption signature.
 * The caption is signed with the device key at capture time.
 */
export function verifyCaptionSignature(
  caption: string | null,
  captionSignature: string | null,
  publicKeyBase64: string,
): VerificationResult {
  // No caption means no verification needed — pass
  if (!caption) {
    return {
      check: 'caption_signature',
      state: 'pass',
      details: { reason: 'No caption present' },
    };
  }

  // Caption exists but no signature — fail
  if (!captionSignature) {
    return {
      check: 'caption_signature',
      state: 'fail',
      details: { reason: 'Caption present but no signature' },
    };
  }

  try {
    const signature = decodeBase64(captionSignature);
    const publicKey = decodeBase64(publicKeyBase64);
    const message = new TextEncoder().encode(caption);

    const valid = nacl.sign.detached.verify(message, signature, publicKey);

    return {
      check: 'caption_signature',
      state: valid ? 'pass' : 'fail',
      details: { valid },
    };
  } catch (err) {
    return {
      check: 'caption_signature',
      state: 'fail',
      details: { error: String(err) },
    };
  }
}

/**
 * Compute sync delay = server_received_at - upload_started_at.
 * Not a skew measurement (§3.7).
 */
export function checkSyncDelay(
  uploadStartedAt: string | null,
  serverReceivedAt: string,
): VerificationResult {
  if (!uploadStartedAt) {
    return {
      check: 'sync_delay',
      state: 'unknown',
      details: { reason: 'Missing upload_started_at' },
    };
  }

  const delayMs = new Date(serverReceivedAt).getTime() - new Date(uploadStartedAt).getTime();
  const delaySeconds = delayMs / 1000;

  return {
    check: 'sync_delay',
    state: delaySeconds >= 0 && delaySeconds <= 900 ? 'pass' : 'fail',
    details: { sync_delay_seconds: delaySeconds },
  };
}
