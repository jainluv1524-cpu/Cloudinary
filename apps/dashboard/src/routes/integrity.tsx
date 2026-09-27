import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/v1';

export function IntegrityPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Integrity Audit</h2>
        <p>Global audit chain verification and evidence integrity status</p>
      </div>
      <div className="page-content">
        {/* Integrity Overview */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Chain Verified</div>
            <div className="stat-value green">✓</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Assets</div>
            <div className="stat-value blue">0</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Signature Pass</div>
            <div className="stat-value green">0</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Flagged</div>
            <div className="stat-value red">0</div>
          </div>
        </div>

        {/* Integrity Checks Legend */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Verification Checks</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            <CheckDescription
              name="SHA-256 Hash"
              description="File hash matches the device commit hash"
              icon="🔒"
            />
            <CheckDescription
              name="EXIF Hash"
              description="Frozen EXIF matches RFC 8785 canonical hash"
              icon="📷"
            />
            <CheckDescription
              name="Capture Signature"
              description="Ed25519 device signature verification"
              icon="✍️"
            />
            <CheckDescription
              name="Caption Signature"
              description="Caption text signed at capture time"
              icon="💬"
            />
            <CheckDescription
              name="Sync Delay"
              description="Upload dwell time within 15 minutes"
              icon="⏱️"
            />
            <CheckDescription
              name="Audit Chain"
              description="Hash chain integrity from genesis"
              icon="⛓️"
            />
          </div>
        </div>

        {/* Explanation */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Three-State Integrity</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
            Every check returns one of three states:
          </p>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <span className="badge pass">PASS — Verified</span>
            <span className="badge fail">FAIL — Evidence tampered</span>
            <span className="badge unknown">UNKNOWN — Cannot verify</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12, lineHeight: 1.6 }}>
            Only <strong style={{ color: 'var(--accent-danger)' }}>FAIL</strong> blocks a report.{' '}
            <strong style={{ color: 'var(--accent-warning)' }}>UNKNOWN</strong> is never reported as PASS.
            Clock skew uses signed NTP offset, not server_received_at − device_capture_timestamp.
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckDescription({ name, description, icon }: { name: string; description: string; icon: string }) {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      padding: 12,
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{description}</div>
      </div>
    </div>
  );
}
