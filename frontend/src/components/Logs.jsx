import { useState, useEffect } from "react";
const API = "http://127.0.0.1:8000";

export default function Logs({ authToken }) {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const headers = authToken ? { Authorization:`Bearer ${authToken}` } : {};

  useEffect(() => {
    fetch(`${API}/logs`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  if (loading) return <p className="loading-state">Loading logs…</p>;

  return (
    <div>
      <h2 className="section-title">Interaction Logs</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Type</th><th>User Message</th><th>AI Response</th><th>Time</th></tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan="5" style={{textAlign:"center",padding:"32px",color:"#64748b"}}>No interactions yet.</td></tr>
            ) : logs.map(l => (
              <tr key={l.id}>
                <td style={{color:"#64748b",fontFamily:"var(--mono)",fontSize:"0.78rem"}}>{l.id}</td>
                <td><span className={l.communication_type==="voice"?"badge badge-blue":"badge badge-green"}>{l.communication_type}</span></td>
                <td style={{maxWidth:240,wordBreak:"break-word"}}>{l.user_message}</td>
                <td style={{maxWidth:340,wordBreak:"break-word",color:"#94a3b8"}}>{l.ai_response}</td>
                <td style={{whiteSpace:"nowrap",color:"#64748b",fontSize:"0.78rem"}}>{l.created_at ? new Date(l.created_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}