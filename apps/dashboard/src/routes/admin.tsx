export function AdminPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Admin</h2>
        <p>Organization settings, users, and report templates</p>
      </div>
      <div className="page-content">
        <div className="card-grid">
          <div className="card">
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
            <div className="card-title">Organization</div>
            <div className="card-subtitle">Manage org settings, quota, and retention</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
            <div className="card-title">Users</div>
            <div className="card-subtitle">Invite members, manage roles</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <div className="card-title">Report Templates</div>
            <div className="card-subtitle">Configure Handlebars templates per sector</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
            <div className="card-title">Model Registry</div>
            <div className="card-subtitle">View CV model versions and training status</div>
          </div>
        </div>
      </div>
    </div>
  );
}
