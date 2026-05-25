const API_BASE = "http://127.0.0.1:8000";

export default API_BASE;

// ✅ Helper: POST /chat (submit loan application)
export async function submitApplication(data) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ✅ Helper: GET /applications (dashboard list)
export async function fetchApplications() {
  const res = await fetch(`${API_BASE}/applications`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ✅ Helper: GET /logs (logs page)
export async function fetchLogs() {
  const res = await fetch(`${API_BASE}/logs`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
