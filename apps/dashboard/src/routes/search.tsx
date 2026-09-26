import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/v1';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    asset_type: '',
    gps_accuracy_max: '',
    date_from: '',
    date_to: '',
  });

  const searchParams = new URLSearchParams();
  if (query) searchParams.set('q', query);
  if (filters.asset_type) searchParams.set('asset_type', filters.asset_type);
  if (filters.gps_accuracy_max) searchParams.set('gps_accuracy_max', filters.gps_accuracy_max);
  if (filters.date_from) searchParams.set('date_from', filters.date_from);
  if (filters.date_to) searchParams.set('date_to', filters.date_to);

  const { data, isLoading } = useQuery({
    queryKey: ['search', query, filters],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/search?${searchParams.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: query.length > 0 || Object.values(filters).some(Boolean),
    retry: false,
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Search</h2>
        <p>Find assets by tag, location, date, or GPS accuracy</p>
      </div>
      <div className="page-content">
        {/* Search bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Search by tags, captions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <select
            value={filters.asset_type}
            onChange={(e) => setFilters({ ...filters, asset_type: e.target.value })}
            style={{
              padding: '10px 16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 14,
            }}
          >
            <option value="">All types</option>
            <option value="image">📷 Photos</option>
            <option value="video">🎥 Videos</option>
          </select>
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' as const }}>
          <input
            type="date"
            placeholder="From"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            style={{
              padding: '8px 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
          />
          <input
            type="date"
            placeholder="To"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            style={{
              padding: '8px 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
          />
          <input
            type="number"
            placeholder="Max GPS accuracy (m)"
            value={filters.gps_accuracy_max}
            onChange={(e) => setFilters({ ...filters, gps_accuracy_max: e.target.value })}
            style={{
              padding: '8px 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 13,
              width: 200,
            }}
          />
        </div>

        {/* Results */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
          </div>
        )}

        {data && (
          <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
            {data.truncated
              ? `Showing ${data.data?.length ?? 0} of ${data.total_matched?.toLocaleString() ?? 0} results`
              : `${data.total ?? 0} results`}
          </div>
        )}

        {data?.data && data.data.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Captured</th>
                  <th>Tags</th>
                  <th>Accuracy</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((asset: Record<string, unknown>) => (
                  <tr key={asset.id as string}>
                    <td>{(asset.asset_type as string) === 'video' ? '🎥' : '📷'}</td>
                    <td>{new Date(asset.device_capture_timestamp as string).toLocaleString()}</td>
                    <td>
                      {(asset.ai_tags as string[])?.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="badge pending" style={{ marginRight: 4 }}>{tag}</span>
                      ))}
                    </td>
                    <td>{asset.gps_accuracy_meters ? `±${asset.gps_accuracy_meters}m` : '—'}</td>
                    <td><span className={`badge ${asset.upload_status === 'verified' ? 'pass' : 'pending'}`}>{asset.upload_status as string}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && (!data?.data || data.data.length === 0) && (query || Object.values(filters).some(Boolean)) && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No results found</h3>
            <p>Try adjusting your search filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
