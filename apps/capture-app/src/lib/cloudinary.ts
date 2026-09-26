// Cloudinary direct upload helper for capture app.
// Uses UNSIGNED upload preset — no API secret on the client (AGENTS.md §3.5).
// Context parameters carry all evidence metadata; the webhook picks them up.

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? 'verified_capture';

interface UploadOptions {
  uri: string;
  projectId: string;
  orgId: string;
  commitHash: string;
  captureTimestamp: string;
  deviceId: string;
  devicePublicKey: string;
  captureSignature: string;
  signatureTier: 'device' | 'server';
  exifHash: string;
  gps?: {
    lat: number;
    lon: number;
    accuracy: number;
    altitude: number | null;
    provider: string;
  };
  caption?: string;
  captionSignature?: string;
  captionLanguage?: string;
  observationType: string;
  phase: 'before' | 'after';
  appVersion: string;
}

export async function uploadToCloudinary(options: UploadOptions): Promise<{ public_id: string; asset_id: string }> {
  const formData = new FormData();

  // File
  const filename = options.uri.split('/').pop() ?? 'capture.jpg';
  formData.append('file', {
    uri: options.uri,
    type: 'image/jpeg',
    name: filename,
  } as unknown as Blob);

  // Unsigned upload preset
  formData.append('upload_preset', UPLOAD_PRESET);

  // Context: all evidence metadata (key=value pipe-separated)
  const contextParts = [
    `org_id=${options.orgId}`,
    `project_id=${options.projectId}`,
    `capture_commit_hash=${options.commitHash}`,
    `capture_timestamp=${options.captureTimestamp}`,
    `device_id=${options.deviceId}`,
    `device_public_key=${options.devicePublicKey}`,
    `capture_signature=${options.captureSignature}`,
    `signature_tier=${options.signatureTier}`,
    `exif_hash=${options.exifHash}`,
    `observation_type=${options.observationType}`,
    `phase=${options.phase}`,
    `app_version=${options.appVersion}`,
  ];

  if (options.gps) {
    contextParts.push(`gps_lat=${options.gps.lat}`);
    contextParts.push(`gps_lon=${options.gps.lon}`);
    contextParts.push(`gps_accuracy=${options.gps.accuracy}`);
    contextParts.push(`gps_provider=${options.gps.provider}`);
    if (options.gps.altitude != null) {
      contextParts.push(`gps_altitude=${options.gps.altitude}`);
    }
  }

  if (options.caption) {
    contextParts.push(`caption=${options.caption}`);
    if (options.captionSignature) contextParts.push(`caption_signature=${options.captionSignature}`);
    if (options.captionLanguage) contextParts.push(`caption_language=${options.captionLanguage}`);
  }

  formData.append('context', contextParts.join('|'));

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Cloudinary upload failed: ${JSON.stringify(error)}`);
  }

  const data = await res.json();
  return { public_id: data.public_id, asset_id: data.asset_id };
}
