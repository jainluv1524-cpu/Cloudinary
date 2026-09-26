import { useEffect, useRef } from 'react';

export function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // MapLibre GL will be initialized here
    // For now, show a placeholder
    // TODO: Import maplibre-gl and create the map instance
  }, []);

  return (
    <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' as const }}>
      <div className="page-header">
        <h2>Map View</h2>
        <p>Visualize assets geographically with clustering</p>
      </div>
      <div style={{ flex: 1, position: 'relative' as const }}>
        <div
          ref={mapContainer}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.3 }}>🗺️</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Map View</h3>
            <p style={{ fontSize: 14 }}>
              MapLibre GL map with asset markers and GPS accuracy circles.
              <br />
              Connect to a Supabase project with PostGIS to enable viewport queries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
