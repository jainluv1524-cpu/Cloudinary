const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/v1';

/**
 * Typed API client for the dashboard.
 * All requests go through the API — never query Cloudinary directly (AGENTS.md §3.9).
 */
async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<{ data: T | null; error: { code: string; message: string } | null }> {
  const token = localStorage.getItem('access_token') ?? '';
  
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: res.statusText } }));
    return { data: null, error: body.error ?? { code: 'UNKNOWN', message: res.statusText } };
  }

  const body = await res.json();
  return body;
}

// ─── Projects ────────────────────────────────────

export async function fetchProjects(cursor?: string) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  return apiFetch<unknown[]>(`/projects?${params.toString()}`);
}

export async function fetchProject(projectId: string) {
  return apiFetch<Record<string, unknown>>(`/projects/${projectId}`);
}

export async function createProject(data: { name: string; sector?: string }) {
  return apiFetch<Record<string, unknown>>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Assets ──────────────────────────────────────

export async function fetchAssets(projectId: string, filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  return apiFetch<unknown[]>(`/projects/${projectId}/assets?${params.toString()}`);
}

export async function fetchAssetIntegrity(assetId: string) {
  return apiFetch<Record<string, unknown>>(`/assets/${assetId}/integrity`);
}

export async function fetchAuditTrail(assetId: string) {
  return apiFetch<unknown[]>(`/assets/${assetId}/audit-trail`);
}

// ─── Search ──────────────────────────────────────

export async function searchAssets(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return apiFetch<unknown[]>(`/search?${query.toString()}`);
}

// ─── Change Events ───────────────────────────────

export async function fetchChangeEvents(projectId: string) {
  return apiFetch<unknown[]>(`/projects/${projectId}/change-events`);
}

// ─── Reports ─────────────────────────────────────

export async function generateReport(data: {
  project_id: string;
  template_id: string;
  change_event_ids: string[];
  include_integrity_appendix: boolean;
}) {
  return apiFetch<Record<string, unknown>>('/reports/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchReportTemplates(sector?: string) {
  const params = sector ? `?sector=${sector}` : '';
  return apiFetch<unknown[]>(`/report-templates${params}`);
}
