export default function Sidebar({ onAddOrder }) {
  return (
    <aside className="sidebar">
      {/* Quick Actions */}
      <div className="sidebar-section">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn" onClick={onAddOrder}>
            <span className="icon">add</span>
            Add Order
          </button>
        </div>
      </div>

      {/* Stats placeholder */}
      <div className="sidebar-section">
        <h3>Statistics</h3>
        <div className="stats">
          <div className="stat-item">
            <span className="stat-label">Total Orders:</span>
            <span className="stat-value">—</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Today:</span>
            <span className="stat-value">—</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">This Week:</span>
            <span className="stat-value">—</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pending:</span>
            <span className="stat-value">—</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
