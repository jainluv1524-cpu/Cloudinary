import { z } from 'zod';

// ─── Observation Type Config ─────────────────────────

export const ObservationTypeConfigSchema = z.object({
  type: z.string().min(1),
  label: z.string().min(1),
  model: z.string().min(1),
  gps_radius: z.number().positive(),
  phase_field: z.string().min(1),
});

export const ProjectConfigSchema = z.object({
  observation_types: z.array(ObservationTypeConfigSchema).min(1),
  metrics_schema: z.record(z.string()).optional(),
  report_template: z.string().optional(),
});

// ─── Project ─────────────────────────────────────────

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  sector: z.string().nullable().optional(),
  geometry: z.any().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  config: ProjectConfigSchema.optional(),
  parent_project_id: z.string().uuid().nullable().optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

// ─── Asset Filters ───────────────────────────────────

export const AssetFilterSchema = z.object({
  bbox: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  tags: z.string().optional(),
  observation_type: z.string().optional(),
  phase: z.enum(['before', 'after']).optional(),
  gps_accuracy_max: z.coerce.number().positive().optional(),
  asset_type: z.enum(['image', 'video']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// ─── Search ──────────────────────────────────────────

export const SearchQuerySchema = z.object({
  q: z.string().optional(),
  bbox: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  tags: z.string().optional(),
  gps_accuracy_max: z.coerce.number().positive().optional(),
  asset_type: z.enum(['image', 'video']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// ─── Report Generation ──────────────────────────────

export const GenerateReportSchema = z.object({
  project_id: z.string().uuid(),
  template_id: z.string(),
  change_event_ids: z.array(z.string().uuid()).min(1),
  include_integrity_appendix: z.boolean().default(true),
});

// ─── Org Provisioning ────────────────────────────────

export const CreateOrgSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['government', 'ngo', 'partner', 'funder']),
});

// ─── Delivery URL ────────────────────────────────────

export const OriginalUrlSchema = z.object({
  ttl_seconds: z.number().int().min(60).max(3600).default(300),
});

export const DerivativeUrlSchema = z.object({
  transformation: z.string().min(1),
});

// ─── ML Service Requests ─────────────────────────────

export const DetectChangeSchema = z.object({
  before_url: z.string().url(),
  after_url: z.string().url(),
  sector: z.string(),
  project_id: z.string().uuid(),
  gps_before: z.object({ lat: z.number(), lon: z.number() }),
  gps_after: z.object({ lat: z.number(), lon: z.number() }),
  accuracy_before: z.number(),
  accuracy_after: z.number(),
});

export const ClassifyActivitySchema = z.object({
  asset_url: z.string().url(),
  sector: z.string(),
});

export const ExtractSignalsSchema = z.object({
  asset_url: z.string().url(),
  sector: z.string(),
});

// ─── Webhook ─────────────────────────────────────────

export const CloudinaryWebhookSchema = z.object({
  event: z.string(),
  info: z.object({
    public_id: z.string(),
    asset_id: z.string().optional(),
    resource_type: z.string(),
    context: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
    created_at: z.string(),
    bytes: z.number(),
    format: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
});

// ─── Transformation Allowlist ────────────────────────

const NAMED_TRANSFORMS = new Set([
  'report_thumb',
  'report_full',
  'report_social',
  'report_diff',
]);

const SAFE_PARAM_PREFIXES = [
  'w_', 'h_', 'c_', 'g_auto', 'f_auto', 'q_auto', 'dpr_auto', 'ar_',
];

const ALLOWED_CROP_MODES = new Set([
  'c_fill', 'c_lfill', 'c_limit', 'c_scale', 'c_pad', 'c_fill_pad', 'c_thumb',
]);

export function isAllowedTransformation(transformation: string): boolean {
  if (NAMED_TRANSFORMS.has(transformation)) return true;

  const parts = transformation.split(/[/,]/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const isAllowed = SAFE_PARAM_PREFIXES.some((prefix) => trimmed.startsWith(prefix))
      || ALLOWED_CROP_MODES.has(trimmed);

    if (!isAllowed) return false;
  }
  return true;
}
