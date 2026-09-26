export function DashboardHome() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>AI-Powered Media Intelligence Platform</p>
      </div>
      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Assets</div>
            <div className="stat-value green">0</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Verified</div>
            <div className="stat-value blue">0</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Change Pairs</div>
            <div className="stat-value amber">0</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Reports</div>
            <div className="stat-value green">0</div>
          </div>
        </div>

        <div className="card" style={{ padding: '40px', textAlign: 'center' as const }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🛰️</div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            Welcome to Impact Platform
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
            Capture tamper-proof field media, detect changes with AI, and generate
            audit-ready reports with full traceability.
          </p>
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <a href="/projects" className="btn btn-primary">View Projects</a>
            <a href="/search" className="btn btn-secondary">Search Assets</a>
          </div>
        </div>
      </div>
    </div>
  );
}
