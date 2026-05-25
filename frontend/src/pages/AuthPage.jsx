import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const API = "http://127.0.0.1:8000";

export default function AuthPage() {
  const { login } = useAuth();
  const [mode,   setMode]   = useState("login");   // "login" | "signup"
  const [form,   setForm]   = useState({ username:"", email:"", password:"" });
  const [error,  setError]  = useState("");
  const [loading,setLoading]= useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";
      const body = mode === "login"
        ? { username: form.username, password: form.password }
        : { username: form.username, email: form.email, password: form.password };

      const res  = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Request failed");
      login(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={styles.page}>
      {/* Background grid */}
      <div style={styles.grid} />

      <div style={styles.card}>
        {/* Logo mark */}
        <div style={styles.logoMark}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="10" fill="#2563eb"/>
            <path d="M8 22 L16 10 L24 22 M12 18 H20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={styles.logoText}>LoanAI</span>
        </div>

        <h1 style={styles.heading}>
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p style={styles.sub}>
          {mode === "login"
            ? "Sign in to access your loan dashboard"
            : "Start your personalised loan journey"}
        </p>

        <form onSubmit={handle} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input style={styles.input} value={form.username} onChange={f("username")}
              placeholder="Enter username" required autoFocus />
          </div>

          {mode === "signup" && (
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input style={styles.input} type="email" value={form.email} onChange={f("email")}
                placeholder="Enter email" required />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" value={form.password} onChange={f("password")}
              placeholder="Enter password" required minLength={6} />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.btn} disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div style={styles.toggle}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setMode(m => m==="login"?"signup":"login"); setError(""); }}
            style={styles.link}>
            {mode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#060d1a", position: "relative", overflow: "hidden",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  grid: {
    position: "absolute", inset: 0, opacity: 0.07,
    backgroundImage: "linear-gradient(rgba(37,99,235,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.5) 1px, transparent 1px)",
    backgroundSize: "48px 48px",
  },
  card: {
    position: "relative", zIndex: 1, width: "100%", maxWidth: 420,
    margin: "20px", padding: "40px 36px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    backdropFilter: "blur(12px)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(37,99,235,0.15)",
  },
  logoMark: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28 },
  logoText: { fontSize: "1.15rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" },
  heading: { margin: "0 0 6px", fontSize: "1.7rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em" },
  sub: { margin: "0 0 28px", fontSize: "0.875rem", color: "#64748b" },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.04em", textTransform: "uppercase" },
  input: {
    height: 44, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)", color: "#fff",
    padding: "0 14px", fontSize: "0.9rem", outline: "none",
    transition: "border-color 0.2s",
  },
  error: {
    background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: 8, padding: "9px 12px", fontSize: "0.82rem", color: "#fca5a5",
  },
  btn: {
    height: 46, borderRadius: 12, border: "none", marginTop: 4,
    background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
    color: "#fff", fontSize: "0.9rem", fontWeight: 700,
    cursor: "pointer", letterSpacing: "-0.01em",
    boxShadow: "0 4px 20px rgba(37,99,235,0.4)",
    transition: "opacity 0.15s",
  },
  toggle: { marginTop: 22, textAlign: "center", fontSize: "0.84rem", color: "#64748b" },
  link: { background: "none", border: "none", color: "#60a5fa", fontWeight: 600,
    cursor: "pointer", fontSize: "0.84rem" },
};