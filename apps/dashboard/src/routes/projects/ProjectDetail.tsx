import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/v1';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/projects/${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: assetsData } = useQuery({
    queryKey: ['assets', projectId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/projects/${projectId}/assets`);
      if (!res.ok) throw new Error('Failed to fetch assets');
      return res.json();
    },
    enabled: !!projectId,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div className="skeleton" style={{ height: 24, width: '40%' }} />
        </div>
      </div>
    );
  }

  const projectData = project?.data;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>{projectData?.name ?? 'Project'}</h2>
        <p>{projectData?.sector ? `Sector: ${projectData.sector}` : 'No sector assigned'}</p>
      </div>
      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Assets</div>
            <div className="stat-value blue">{assetsData?.total ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Status</div>
            <div className="stat-value green">Active</div>
          </div>
        </div>

        {/* Asset Table */}
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Recent Assets</h3>
        {assetsData?.data && assetsData.data.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Captured</th>
                  <th>Phase</th>
                  <th>GPS Accuracy</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assetsData.data.map((asset: Record<string, unknown>) => (
                  <tr key={asset.id as string}>
                    <td>{(asset.asset_type as string) === 'video' ? '🎥' : '📷'} {asset.asset_type as string}</td>
                    <td>{new Date(asset.device_capture_timestamp as string).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${asset.phase === 'after' ? 'pass' : 'pending'}`}>
                        {(asset.phase as string) ?? 'n/a'}
                      </span>
                    </td>
                    <td>{asset.gps_accuracy_meters ? `±${asset.gps_accuracy_meters}m` : '—'}</td>
                    <td>
                      <span className={`badge ${asset.upload_status === 'verified' ? 'pass' : asset.upload_status === 'flagged' ? 'fail' : 'pending'}`}>
                        {asset.upload_status as string}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📸</div>
            <h3>No assets yet</h3>
            <p>Use the capture app to upload geo-tagged photos and videos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
