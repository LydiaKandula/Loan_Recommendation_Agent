const API_BASE = "http://127.0.0.1:8000";

function Navbar({ authUser, onLogout }) {
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("authToken");
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } catch {}
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    onLogout();
  };

  return (
    <div className="topbar">
      <h2>Loan Recommendation AI</h2>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="live-status">Live System</div>

        {authUser && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 999, padding: "5px 12px 5px 6px",
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.72rem", color: "#fff", fontWeight: 700, flexShrink: 0,
              }}>
                {(authUser.fullName || authUser.username || "?")[0].toUpperCase()}
              </span>
              <span style={{ fontSize: "0.82rem", color: "#cbd5e1", fontWeight: 500 }}>
                {authUser.fullName || authUser.username}
              </span>
            </div>

            <button
              onClick={handleLogout}
              style={{
                height: 34, padding: "0 14px", borderRadius: 10,
                border: "1px solid rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.08)",
                color: "#f87171", fontSize: "0.8rem", fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Navbar;