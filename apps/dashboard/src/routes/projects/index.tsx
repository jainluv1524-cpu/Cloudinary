import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/v1';

export function ProjectsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/projects`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    },
    retry: false,
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Projects</h2>
            <p>Manage observation projects and field deployments</p>
          </div>
          <button className="btn btn-primary">+ New Project</button>
        </div>
      </div>
      <div className="page-content">
        {isLoading && (
          <div className="card-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card">
                <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '40%' }} />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="card" style={{ borderColor: 'var(--accent-danger)' }}>
            <p style={{ color: 'var(--accent-danger)' }}>
              Unable to load projects. Make sure the API is running.
            </p>
          </div>
        )}

        {data?.data && data.data.length > 0 ? (
          <div className="card-grid">
            {data.data.map((project: Record<string, string>) => (
              <Link to={`/projects/${project.id}`} key={project.id} style={{ textDecoration: 'none' }}>
                <div className="card">
                  <div className="card-title">{project.name}</div>
                  <div className="card-subtitle">
                    {project.sector && <span className="badge pass">{project.sector}</span>}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : !isLoading && (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <h3>No projects yet</h3>
            <p>Create your first project to start capturing and analysing field media.</p>
          </div>
        )}
      </div>
    </div>
  );
}
