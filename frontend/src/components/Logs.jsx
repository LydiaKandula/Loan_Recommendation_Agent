// frontend/src/components/Logs.jsx
import { useState, useEffect } from "react";

const API_BASE = "http://127.0.0.1:8000";

function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/logs`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setLogs(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="subtitle">Loading logs...</p>;
  if (error)   return <p className="subtitle" style={{ color: "#ef4444" }}>Error: {error}</p>;

  return (
    <div>
      <h2>Interaction Logs</h2>
      <p className="subtitle">All backend chat and voice interactions</p>

      <div className="dashboard-table">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>User Message</th>
              <th>AI Response</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: "999px",
                        fontSize: "0.78rem",
                        background: log.communication_type === "voice"
                          ? "rgba(139,92,246,0.15)"
                          : "rgba(37,99,235,0.15)",
                        color: log.communication_type === "voice" ? "#a78bfa" : "#93c5fd",
                      }}
                    >
                      {log.communication_type}
                    </span>
                  </td>
                  <td style={{ maxWidth: "260px", wordBreak: "break-word" }}>
                    {log.user_message}
                  </td>
                  <td style={{ maxWidth: "340px", wordBreak: "break-word" }}>
                    {log.ai_response}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {log.created_at
                      ? new Date(log.created_at).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                  No logs yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Logs;