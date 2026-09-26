-- Impact Media Intelligence Platform
-- Migration 001: Core Schema
-- Extensions + All tables + RLS + Functions + Indexes

-- ═══════════════════════════════════════════════════════
-- EXTENSIONS
-- ═══════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ═══════════════════════════════════════════════════════
-- CUSTOM TYPES
-- ═══════════════════════════════════════════════════════
CREATE TYPE integrity_state AS ENUM ('pass', 'fail', 'unknown');

-- ═══════════════════════════════════════════════════════
-- ORGANIZATIONS
-- ═══════════════════════════════════════════════════════
CREATE TABLE orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('government', 'ngo', 'partner', 'funder')),
  settings JSONB DEFAULT '{}',
  quota_bytes BIGINT NOT NULL DEFAULT 53687091200,
  bytes_used BIGINT NOT NULL DEFAULT 0,
  retention_years INT NOT NULL DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs_select_own" ON orgs FOR SELECT
  USING (
    id = (auth.jwt() ->> 'org_id')::uuid
    OR (auth.jwt() ->> 'role') = 'platform_admin'
  );

CREATE POLICY "orgs_admin_update" ON orgs FOR UPDATE
  USING (
    ((auth.jwt() ->> 'org_id')::uuid = id AND (auth.jwt() ->> 'role') = 'org_admin')
    OR (auth.jwt() ->> 'role') = 'platform_admin'
  )
  WITH CHECK (
    ((auth.jwt() ->> 'org_id')::uuid = id AND (auth.jwt() ->> 'role') = 'org_admin')
    OR (auth.jwt() ->> 'role') = 'platform_admin'
  );

-- ═══════════════════════════════════════════════════════
-- INVITE TOKENS
-- ═══════════════════════════════════════════════════════
CREATE TABLE invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) NOT NULL,
  token_hash TEXT NOT NULL, -- SHA-256 of the actual token; never store raw
  role TEXT NOT NULL DEFAULT 'org_admin',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- PROJECTS
-- ═══════════════════════════════════════════════════════
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) NOT NULL,
  name TEXT NOT NULL,
  sector TEXT,
  geometry GEOMETRY(POLYGON, 4326),
  start_date DATE,
  end_date DATE,
  config JSONB DEFAULT '{}',
  parent_project_id UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_geometry ON projects USING GIST(geometry);
CREATE INDEX idx_projects_parent ON projects(parent_project_id);
CREATE INDEX idx_projects_parent_sector ON projects(parent_project_id, sector);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_org_read" ON projects FOR SELECT
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "projects_org_write" ON projects FOR ALL
  USING      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- ═══════════════════════════════════════════════════════
-- ASSETS
-- ═══════════════════════════════════════════════════════
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  org_id UUID REFERENCES orgs(id) NOT NULL,

  cloudinary_public_id TEXT UNIQUE NOT NULL,
  cloudinary_asset_id TEXT,
  asset_type TEXT CHECK (asset_type IN ('image', 'video')),

  -- Device capture (immutable)
  device_capture_timestamp TIMESTAMPTZ NOT NULL,
  device_commit_hash TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_public_key TEXT NOT NULL,
  capture_signature TEXT NOT NULL,
  device_monotonic_ms BIGINT,

  -- GPS
  gps_point GEOGRAPHY(POINT, 4326),
  gps_accuracy_meters FLOAT,
  gps_altitude FLOAT,
  gps_provider TEXT,
  gps_timestamp TIMESTAMPTZ,

  -- Caption
  caption TEXT,
  caption_signature TEXT,
  caption_language TEXT,
  caption_created_at TIMESTAMPTZ,

  -- EXIF
  exif JSONB,
  exif_hash TEXT NOT NULL,

  -- Integrity
  sha256_hash TEXT NOT NULL,
  signature_tier TEXT DEFAULT 'server' CHECK (signature_tier IN ('device', 'server')),
  verification TEXT DEFAULT 'unknown' CHECK (verification IN ('pass', 'fail', 'unknown')),
  upload_started_at TIMESTAMPTZ,
  ntp_offset_seconds NUMERIC,
  exif_verified_at TIMESTAMPTZ,
  caption_verified_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  quarantined_at TIMESTAMPTZ,

  -- Video
  duration_seconds FLOAT,
  keyframe_timestamps FLOAT[],
  keyframe_cloudinary_ids TEXT[],
  thumbnail_cloudinary_id TEXT,

  -- AI enrichment
  ai_tags JSONB DEFAULT '[]',
  custom_metadata JSONB DEFAULT '{}',

  -- Cloudinary signal harvest
  phash TEXT,
  dominant_colors TEXT[],
  cloudinary_quality_score FLOAT,
  face_count INT,
  cloudinary_metadata_at TIMESTAMPTZ,

  -- Observation context
  observation_type TEXT,
  phase TEXT CHECK (phase IN ('before', 'after')),
  app_version TEXT,

  -- Server timestamps (immutable)
  server_upload_timestamp TIMESTAMPTZ,
  server_received_at TIMESTAMPTZ DEFAULT now(),

  upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'verified', 'flagged')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_assets_project_time ON assets(project_id, device_capture_timestamp);
CREATE INDEX idx_assets_gps ON assets USING GIST(gps_point);
CREATE INDEX idx_assets_gps_accuracy ON assets(gps_accuracy_meters) WHERE gps_accuracy_meters IS NOT NULL;
CREATE INDEX idx_assets_commit_hash ON assets(device_commit_hash);
CREATE INDEX idx_assets_status ON assets(upload_status);
CREATE INDEX idx_assets_observation ON assets(project_id, observation_type, phase);
CREATE INDEX idx_assets_sha256 ON assets(sha256_hash);
CREATE INDEX idx_assets_phash ON assets USING GIN (phash gin_trgm_ops);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_org_scope" ON assets FOR SELECT
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
-- NO insert policy: webhook uses service role. See AGENTS.md §3.4.

-- Column immutability: REVOKE UPDATE on evidence columns
REVOKE UPDATE (
  sha256_hash, exif_hash, device_capture_timestamp, device_monotonic_ms,
  device_commit_hash, device_id, device_public_key, capture_signature,
  server_upload_timestamp, server_received_at,
  cloudinary_public_id, cloudinary_asset_id
) ON assets FROM anon, authenticated;

-- Trigger: immutability guard (fires for ALL roles including service_role)
CREATE OR REPLACE FUNCTION prevent_evidence_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.sha256_hash IS DISTINCT FROM NEW.sha256_hash
    OR OLD.exif_hash IS DISTINCT FROM NEW.exif_hash
    OR OLD.device_capture_timestamp IS DISTINCT FROM NEW.device_capture_timestamp
    OR OLD.device_commit_hash IS DISTINCT FROM NEW.device_commit_hash
    OR OLD.capture_signature IS DISTINCT FROM NEW.capture_signature
    OR OLD.cloudinary_public_id IS DISTINCT FROM NEW.cloudinary_public_id
    OR OLD.server_received_at IS DISTINCT FROM NEW.server_received_at
  THEN
    RAISE EXCEPTION 'Evidence columns are immutable. Create a derivative instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assets_immutability
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION prevent_evidence_mutation();

-- ═══════════════════════════════════════════════════════
-- ASSET DERIVATIVES
-- ═══════════════════════════════════════════════════════
CREATE TABLE asset_derivatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_asset_id UUID REFERENCES assets(id) NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  transformation TEXT NOT NULL,
  kind TEXT NOT NULL, -- 'thumbnail', 'report_full', 'diff', 'social', 'privacy', etc.
  is_generative BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_derivatives_parent ON asset_derivatives(parent_asset_id);

ALTER TABLE asset_derivatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "derivatives_via_parent" ON asset_derivatives FOR SELECT
  USING (
    parent_asset_id IN (SELECT id FROM assets WHERE org_id = (auth.jwt() ->> 'org_id')::uuid)
  );

-- ═══════════════════════════════════════════════════════
-- OBSERVATIONS
-- ═══════════════════════════════════════════════════════
CREATE TABLE observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id),
  project_id UUID REFERENCES projects(id),
  org_id UUID REFERENCES orgs(id),
  observer_id UUID,
  observation_type TEXT,
  metrics JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_observations_asset ON observations(asset_id);
CREATE INDEX idx_observations_project ON observations(project_id);

ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "observations_org_scope" ON observations FOR SELECT
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "observations_org_write" ON observations FOR ALL
  USING      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- ═══════════════════════════════════════════════════════
-- CHANGE EVENTS
-- ═══════════════════════════════════════════════════════
CREATE TABLE change_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  org_id UUID REFERENCES orgs(id),
  before_asset_id UUID REFERENCES assets(id),
  after_asset_id UUID REFERENCES assets(id),
  change_type TEXT,
  change_metrics JSONB NOT NULL DEFAULT '{}',
  detection_method TEXT,
  model_version TEXT,
  confidence FLOAT,
  diff_asset_cloudinary_id TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'claimed', 'downloading', 'aligning', 'detecting', 'diff_upload', 'persisted', 'failed')),
  failure_reason TEXT,
  gps_distance_meters FLOAT,
  time_difference_hours FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_change_project ON change_events(project_id);
CREATE INDEX idx_change_assets ON change_events(before_asset_id, after_asset_id);

ALTER TABLE change_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "change_events_org_read" ON change_events FOR SELECT
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "change_events_org_write" ON change_events FOR ALL
  USING      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- ═══════════════════════════════════════════════════════
-- EVIDENCE PACKAGES (Reports)
-- ═══════════════════════════════════════════════════════
CREATE TABLE evidence_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  org_id UUID REFERENCES orgs(id),
  name TEXT,
  asset_ids UUID[],
  change_event_ids UUID[],
  report_cloudinary_url TEXT,
  audit_trail JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'exported')),
  template_version TEXT,
  generated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE evidence_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packages_org_scope" ON evidence_packages FOR SELECT
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "packages_org_write" ON evidence_packages FOR ALL
  USING      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- ═══════════════════════════════════════════════════════
-- REPORT MANIFEST ENTRIES
-- ═══════════════════════════════════════════════════════
CREATE TABLE report_manifest_entries (
  id BIGSERIAL PRIMARY KEY,
  evidence_package_id UUID NOT NULL REFERENCES evidence_packages(id),
  ordinal INT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('photo', 'diff', 'map', 'chart', 'video_clip', 'qr')),
  cloudinary_public_id TEXT,
  derivative_public_id TEXT,
  sha256_hash TEXT,
  byte_size BIGINT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evidence_package_id, ordinal)
);

CREATE INDEX idx_manifest_package ON report_manifest_entries(evidence_package_id);

-- ═══════════════════════════════════════════════════════
-- AUDIT LOGS (append-only hash chain)
-- ═══════════════════════════════════════════════════════
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  asset_id UUID REFERENCES assets(id),
  change_event_id UUID REFERENCES change_events(id),
  evidence_package_id UUID REFERENCES evidence_packages(id),
  action TEXT NOT NULL,
  actor_type TEXT CHECK (actor_type IN ('system', 'user', 'ml_model', 'device')),
  actor_id TEXT,
  details JSONB,
  previous_hash TEXT,
  current_hash TEXT NOT NULL,
  hashed_at TIMESTAMPTZ NOT NULL,
  details_canonical TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_asset ON audit_logs(asset_id);
CREATE INDEX idx_audit_chain ON audit_logs(current_hash);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_org" ON audit_logs FOR SELECT
  USING (
    asset_id IN (SELECT id FROM assets WHERE org_id = (auth.jwt() ->> 'org_id')::uuid)
    OR change_event_id IN (SELECT id FROM change_events WHERE org_id = (auth.jwt() ->> 'org_id')::uuid)
    OR evidence_package_id IN (SELECT id FROM evidence_packages WHERE org_id = (auth.jwt() ->> 'org_id')::uuid)
  );

-- ═══════════════════════════════════════════════════════
-- REPORT TEMPLATES
-- ═══════════════════════════════════════════════════════
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id),
  sector TEXT,
  name TEXT NOT NULL,
  description TEXT,
  handlebars_template TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_org_scope" ON report_templates FOR SELECT
  USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "templates_org_write" ON report_templates FOR ALL
  USING      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- ═══════════════════════════════════════════════════════
-- MODEL REGISTRY
-- ═══════════════════════════════════════════════════════
CREATE TABLE model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  sector TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('trained', 'prebuilt', 'unsupported')),
  weights_uri TEXT,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed data
INSERT INTO model_registry (key, version, sector, status) VALUES
  ('forestry', '0.1.0', 'forestry', 'trained'),
  ('water', '0.0.0', 'water', 'unsupported'),
  ('infrastructure', '0.0.0', 'infrastructure', 'unsupported'),
  ('agriculture', '0.0.0', 'agriculture', 'unsupported');

-- ═══════════════════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════════════════

-- Audit log append with advisory lock + stored hashed_at
CREATE OR REPLACE FUNCTION append_audit_log(
  p_asset_id UUID,
  p_action TEXT,
  p_actor_type TEXT,
  p_actor_id TEXT,
  p_details JSONB,
  p_details_canonical TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_previous_hash TEXT;
  v_current_hash TEXT;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_asset_id::text, 0));

  SELECT current_hash INTO v_previous_hash
  FROM audit_logs
  WHERE asset_id = p_asset_id
  ORDER BY id DESC
  LIMIT 1;

  v_current_hash := encode(
    sha256(
      convert_to(
        COALESCE(v_previous_hash, 'genesis')
        || '|' || p_action
        || '|' || p_actor_type
        || '|' || COALESCE(p_actor_id, '')
        || '|' || COALESCE(p_details_canonical, 'null')
        || '|' || to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
        'UTF8'
      )
    ),
    'hex'
  );

  INSERT INTO audit_logs (
    asset_id, action, actor_type, actor_id, details,
    previous_hash, current_hash, hashed_at, details_canonical
  )
  VALUES (
    p_asset_id, p_action, p_actor_type, p_actor_id, p_details,
    v_previous_hash, v_current_hash, v_now, p_details_canonical
  );
END;
$$;

-- Verify audit chain
CREATE OR REPLACE FUNCTION verify_audit_chain(p_asset_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_log audit_logs%rowtype;
  v_expected_hash TEXT;
  v_previous_hash TEXT := 'genesis';
BEGIN
  FOR v_log IN
    SELECT * FROM audit_logs WHERE asset_id = p_asset_id ORDER BY id ASC
  LOOP
    v_expected_hash := encode(
      sha256(
        convert_to(
          v_previous_hash
          || '|' || v_log.action
          || '|' || v_log.actor_type
          || '|' || COALESCE(v_log.actor_id, '')
          || '|' || COALESCE(v_log.details_canonical, 'null')
          || '|' || to_char(v_log.hashed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'UTF8'
        )
      ),
      'hex'
    );

    IF v_log.current_hash != v_expected_hash THEN
      RETURN FALSE;
    END IF;

    v_previous_hash := v_log.current_hash;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Verify asset integrity
CREATE OR REPLACE FUNCTION verify_asset_integrity(p_asset_id UUID)
RETURNS TABLE (
  check_name TEXT,
  state      integrity_state,
  details    JSONB
) AS $$
DECLARE
  v_asset       assets%rowtype;
  v_sync_delay  NUMERIC;
BEGIN
  SELECT * INTO v_asset FROM assets WHERE id = p_asset_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'asset % not found', p_asset_id;
  END IF;

  -- Check 1: EXIF hash (verified in API)
  RETURN QUERY SELECT
    'exif_hash_match'::text,
    'unknown'::integrity_state,
    jsonb_build_object(
      'reason',   'requires RFC 8785 canonicalization; verified in API layer',
      'stored',   v_asset.exif_hash,
      'verified', v_asset.exif_verified_at
    );

  -- Check 2: SHA-256 matches commit hash
  RETURN QUERY SELECT
    'sha256_matches_commit'::text,
    CASE
      WHEN v_asset.sha256_hash IS NULL OR v_asset.device_commit_hash IS NULL
        THEN 'unknown'::integrity_state
      WHEN v_asset.sha256_hash = v_asset.device_commit_hash
        THEN 'pass'::integrity_state
      ELSE 'fail'::integrity_state
    END,
    jsonb_build_object(
      'sha256',     v_asset.sha256_hash,
      'commit_hash', v_asset.device_commit_hash
    );

  -- Check 3: Caption signature (verified in API)
  RETURN QUERY SELECT
    'caption_signature'::text,
    CASE
      WHEN v_asset.caption IS NULL              THEN 'pass'::integrity_state
      WHEN v_asset.caption_signature IS NULL    THEN 'fail'::integrity_state
      ELSE 'unknown'::integrity_state
    END,
    jsonb_build_object(
      'has_caption',      v_asset.caption IS NOT NULL,
      'has_signature',    v_asset.caption_signature IS NOT NULL,
      'signature_tier',   v_asset.signature_tier
    );

  -- Check 4: Sync delay
  v_sync_delay := EXTRACT(EPOCH FROM (v_asset.server_received_at - v_asset.upload_started_at));
  RETURN QUERY SELECT
    'sync_delay'::text,
    CASE
      WHEN v_asset.upload_started_at IS NULL OR v_asset.server_received_at IS NULL
        THEN 'unknown'::integrity_state
      WHEN v_sync_delay < 0   THEN 'fail'::integrity_state
      WHEN v_sync_delay <= 900 THEN 'pass'::integrity_state
      ELSE 'fail'::integrity_state
    END,
    jsonb_build_object(
      'upload_started_at',  v_asset.upload_started_at,
      'server_received_at', v_asset.server_received_at,
      'sync_delay_seconds', v_sync_delay
    );

  -- Check 5: Clock skew (requires NTP offset)
  RETURN QUERY SELECT
    'clock_skew'::text,
    CASE
      WHEN v_asset.ntp_offset_seconds IS NULL THEN 'unknown'::integrity_state
      WHEN ABS(v_asset.ntp_offset_seconds) <= 300 THEN 'pass'::integrity_state
      ELSE 'fail'::integrity_state
    END,
    jsonb_build_object(
      'ntp_offset_seconds', v_asset.ntp_offset_seconds,
      'device_capture_timestamp', v_asset.device_capture_timestamp,
      'note', 'raw delta vs server is not a skew measurement; see sync_delay check'
    );

  -- Check 6: Audit chain
  RETURN QUERY SELECT
    'audit_chain_intact'::text,
    CASE WHEN verify_audit_chain(p_asset_id) THEN 'pass'::integrity_state
         ELSE 'fail'::integrity_state END,
    jsonb_build_object('chain_verified', verify_audit_chain(p_asset_id));
END;
$$ LANGUAGE plpgsql;

-- Project tree recursive CTE
CREATE OR REPLACE FUNCTION get_project_tree(root_project_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  parent_project_id UUID,
  depth INT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE tree AS (
    SELECT p.id, p.name, p.parent_project_id, 0 AS depth
    FROM projects p
    WHERE p.id = root_project_id

    UNION ALL

    SELECT p.id, p.name, p.parent_project_id, t.depth + 1
    FROM projects p
    JOIN tree t ON p.parent_project_id = t.id
  )
  SELECT tree.id, tree.name, tree.parent_project_id, tree.depth FROM tree;
END;
$$ LANGUAGE plpgsql;
