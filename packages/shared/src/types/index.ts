// Domain types — single source of truth for all services
// See: docs/architecture/DATABASE_SCHEMA.md

// ─── Enums ───────────────────────────────────────────

export type OrgType = 'government' | 'ngo' | 'partner' | 'funder';

export type UserRole = 'platform_admin' | 'org_admin' | 'member' | 'viewer';

export type AssetType = 'image' | 'video';

export type Phase = 'before' | 'after';

export type UploadStatus = 'pending' | 'verified' | 'flagged';

export type VerificationState = 'pass' | 'fail' | 'unknown';

export type SignatureTier = 'device' | 'server';

export type AssetLifecycleState =
  | 'captured'
  | 'uploading'
  | 'uploaded'
  | 'verifying'
  | 'verified'
  | 'enriching'
  | 'ready'
  | 'upload_failed'
  | 'quarantined'
  | 'reviewed'
  | 'rejected';

export type ChangeEventStatus = 'queued' | 'claimed' | 'downloading' | 'aligning' | 'detecting' | 'diff_upload' | 'persisted' | 'failed';

export type EvidencePackageStatus = 'draft' | 'finalized' | 'exported';

export type ActorType = 'system' | 'user' | 'ml_model' | 'device';

export type AuditAction = 'upload' | 'transform' | 'tag' | 'pair' | 'detect' | 'package' | 'export' | 'verify';

export type GpsProvider = 'gps' | 'network' | 'fused' | 'passive';

export type ManifestRole = 'photo' | 'diff' | 'map' | 'chart' | 'video_clip' | 'qr';

// ─── Domain Types ────────────────────────────────────

export interface Org {
  id: string;
  name: string;
  type: OrgType;
  settings: Record<string, unknown>;
  quota_bytes: number;
  bytes_used: number;
  retention_years: number;
  created_at: string;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  sector: string | null;
  geometry: { type: 'Polygon'; coordinates: number[][][] } | null;
  start_date: string | null;
  end_date: string | null;
  config: ProjectConfig;
  parent_project_id: string | null;
  created_at: string;
}

export interface ObservationTypeConfig {
  type: string;
  label: string;
  model: string;
  gps_radius: number;
  phase_field: string;
}

export interface ProjectConfig {
  observation_types: ObservationTypeConfig[];
  metrics_schema?: Record<string, string>;
  report_template?: string;
}

export interface Asset {
  id: string;
  project_id: string;
  org_id: string;
  cloudinary_public_id: string;
  cloudinary_asset_id: string | null;
  asset_type: AssetType;

  // Device capture (immutable)
  device_capture_timestamp: string;
  device_commit_hash: string;
  device_id: string;
  device_public_key: string;
  capture_signature: string;
  device_monotonic_ms: number | null;

  // GPS
  gps_point: { lat: number; lon: number } | null;
  gps_accuracy_meters: number | null;
  gps_altitude: number | null;
  gps_provider: GpsProvider | null;
  gps_timestamp: string | null;

  // Caption
  caption: string | null;
  caption_signature: string | null;
  caption_language: string | null;
  caption_created_at: string | null;

  // EXIF
  exif: Record<string, unknown>;
  exif_hash: string;

  // Integrity
  sha256_hash: string;
  signature_tier: SignatureTier;
  verification: VerificationState;
  upload_started_at: string | null;
  ntp_offset_seconds: number | null;

  // Video
  duration_seconds: number | null;
  keyframe_timestamps: number[] | null;
  keyframe_cloudinary_ids: string[] | null;
  thumbnail_cloudinary_id: string | null;

  // AI enrichment
  ai_tags: string[];
  custom_metadata: Record<string, unknown>;

  // Cloudinary signal harvest
  phash: string | null;
  dominant_colors: string[] | null;
  cloudinary_quality_score: number | null;
  face_count: number | null;
  cloudinary_metadata_at: string | null;

  // Observation context
  observation_type: string | null;
  phase: Phase | null;
  app_version: string | null;

  // Server timestamps (immutable)
  server_upload_timestamp: string | null;
  server_received_at: string;

  upload_status: UploadStatus;
  created_at: string;
}

export interface AssetDerivative {
  id: string;
  parent_asset_id: string;
  cloudinary_public_id: string;
  transformation: string;
  kind: string;
  is_generative: boolean;
  created_at: string;
}

export interface Observation {
  id: string;
  asset_id: string;
  project_id: string;
  org_id: string;
  observer_id: string | null;
  observation_type: string;
  metrics: Record<string, unknown>;
  notes: string | null;
  created_at: string;
}

export interface ChangeEvent {
  id: string;
  project_id: string;
  org_id: string;
  before_asset_id: string;
  after_asset_id: string;
  change_type: string;
  change_metrics: Record<string, unknown>;
  detection_method: string | null;
  model_version: string;
  confidence: number;
  diff_asset_cloudinary_id: string | null;
  status: ChangeEventStatus;
  failure_reason: string | null;
  gps_distance_meters: number | null;
  time_difference_hours: number | null;
  created_at: string;
}

export interface EvidencePackage {
  id: string;
  project_id: string;
  org_id: string;
  name: string | null;
  asset_ids: string[];
  change_event_ids: string[];
  report_cloudinary_url: string | null;
  audit_trail: Record<string, unknown>;
  status: EvidencePackageStatus;
  template_version: string | null;
  generated_at: string;
}

export interface ReportManifestEntry {
  id: number;
  evidence_package_id: string;
  ordinal: number;
  role: ManifestRole;
  cloudinary_public_id: string | null;
  derivative_public_id: string | null;
  sha256_hash: string | null;
  byte_size: number | null;
  verified_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  asset_id: string | null;
  change_event_id: string | null;
  evidence_package_id: string | null;
  action: AuditAction;
  actor_type: ActorType;
  actor_id: string | null;
  details: Record<string, unknown>;
  previous_hash: string | null;
  current_hash: string;
  hashed_at: string;
  details_canonical: string | null;
  created_at: string;
}

export interface ModelRegistryEntry {
  id: string;
  key: string;
  version: string;
  sector: string;
  status: 'trained' | 'prebuilt' | 'unsupported';
  weights_uri: string | null;
  metrics: Record<string, unknown>;
  created_at: string;
}

export interface ReportTemplate {
  id: string;
  org_id: string;
  sector: string | null;
  name: string;
  description: string | null;
  handlebars_template: string;
  config: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
}

// ─── Capture App Types ───────────────────────────────

export interface FrozenExif {
  Make: string;
  Model: string;
  LensModel?: string;
  Orientation: number;
  ColorSpace?: string;
  ImageWidth: number;
  ImageHeight: number;
}

export interface FrozenGps {
  lat: number;
  lon: number;
  accuracy_m: number;
  altitude_m: number | null;
  provider: GpsProvider;
}

export interface SigningPayload {
  v: 1;
  sha256: string;
  exif_hash: string;
  captured_at: string;
  gps: FrozenGps | null;
  project_id: string;
  observation_type: string;
  phase: Phase;
  caption: string | null;
}

export interface LocalCaptureCommit {
  commitId: string;
  version: 1;
  imagePath: string;
  mimeType: 'image/jpeg' | 'image/heic' | 'video/mp4';
  exif: FrozenExif;
  gps: FrozenGps | null;
  signingPayload: SigningPayload;
  signature: string;
  devicePublicKey: string;
  createdAt: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  uploadAttempts: number;
  lastAttemptAt?: string;
  lastError?: string;
}

// ─── API Response Envelope ───────────────────────────

export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiError {
  code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR' | 'RATE_LIMITED' | 'STORAGE_LIMIT_REACHED';
  message: string;
  details?: Record<string, unknown>;
  request_id?: string;
}

export interface ApiErrorResponse {
  data: null;
  error: ApiError;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  next_cursor: string | null;
  truncated?: boolean;
  total_matched?: number;
  facet_counts?: Record<string, Record<string, number>>;
}

// ─── Integrity Check Result ──────────────────────────

export interface IntegrityCheckResult {
  check_name: string;
  state: VerificationState;
  details: Record<string, unknown>;
}

export interface AssetIntegrityResult {
  asset_id: string;
  checks: IntegrityCheckResult[];
  overall: VerificationState;
}
