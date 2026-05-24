import { useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

export default function AuthPage({ onAuth }) {
  const [mode,     setMode]     = useState("login");   // "login" | "signup"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (mode === "signup" && !fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";
      const body     = mode === "login"
        ? { username, password }
        : { username, password, fullName };

      const res  = await fetch(`${API_BASE}${endpoint}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Something went wrong.");
        return;
      }

      // Store session
      localStorage.setItem("authToken",  data.token);
      localStorage.setItem("authUser",   JSON.stringify({ id: data.userId, username: data.username, fullName: data.fullName }));
      onAuth(data);
    } catch {
      setError("Could not reach the server. Is uvicorn running?");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === "login" ? "signup" : "login");
    setError("");
    setUsername("");
    setPassword("");
    setFullName("");
  };

  return (
    <div style={styles.page}>
      {/* Background grid */}
      <div style={styles.grid} aria-hidden />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoDot} />
          <span style={styles.logoText}>Loan AI System</span>
        </div>

        <h1 style={styles.heading}>
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p style={styles.sub}>
          {mode === "login"
            ? "Sign in to your personal loan advisor"
            : "Set up your personal loan advisor account"}
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === "signup" && (
            <Field label="Full Name" error={null}>
              <input
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                style={styles.input}
                autoComplete="name"
              />
            </Field>
          )}

          <Field label="Username" error={null}>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase())}
              style={styles.input}
              autoComplete="username"
              spellCheck={false}
            />
          </Field>

          <Field label="Password" error={null}>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                placeholder={mode === "signup" ? "Min. 6 characters" : "Enter password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ ...styles.input, paddingRight: 44 }}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={styles.eyeBtn}
                tabIndex={-1}
              >
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </Field>

          {error && (
            <div style={styles.errorBox}>
              <span style={{ marginRight: 6 }}>⚠️</span>{error}
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading
              ? <span style={styles.spinner} />
              : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div style={styles.switchRow}>
          <span style={{ color: "#64748b" }}>
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
          </span>
          <button onClick={switchMode} style={styles.switchBtn}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#080e1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  grid: {
    position: "absolute", inset: 0, zIndex: 0,
    backgroundImage: `
      linear-gradient(rgba(37,99,235,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(37,99,235,0.06) 1px, transparent 1px)
    `,
    backgroundSize: "48px 48px",
    maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)",
  },
  card: {
    position: "relative", zIndex: 1,
    width: "100%", maxWidth: 420,
    margin: "0 16px",
    background: "rgba(15,23,42,0.9)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: "36px 36px 28px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(37,99,235,0.1)",
    animation: "fadeIn 0.4s ease both",
  },
  logoRow: {
    display: "flex", alignItems: "center", gap: 9, marginBottom: 28,
  },
  logoDot: {
    width: 10, height: 10, borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 12px rgba(34,197,94,0.8)",
  },
  logoText: {
    fontSize: "0.9rem", fontWeight: 700, color: "#f1f5f9", letterSpacing: "0.01em",
  },
  heading: {
    margin: "0 0 6px",
    fontSize: "1.6rem", fontWeight: 700, color: "#fff", lineHeight: 1.2,
  },
  sub: {
    margin: "0 0 28px",
    fontSize: "0.88rem", color: "#64748b", lineHeight: 1.5,
  },
  form: {
    display: "flex", flexDirection: "column", gap: 18,
  },
  label: {
    fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.02em",
  },
  input: {
    width: "100%", height: 44, borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "#0a1628",
    color: "#f1f5f9", fontSize: "0.9rem",
    padding: "0 14px",
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "inherit",
  },
  eyeBtn: {
    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer",
    fontSize: "1rem", lineHeight: 1, padding: 2,
    color: "#64748b",
  },
  errorBox: {
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: 10, padding: "10px 14px",
    fontSize: "0.82rem", color: "#fca5a5",
    display: "flex", alignItems: "center",
  },
  submitBtn: {
    height: 46, borderRadius: 12, border: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff", fontSize: "0.92rem", fontWeight: 700,
    cursor: "pointer", marginTop: 4,
    boxShadow: "0 4px 20px rgba(37,99,235,0.35)",
    transition: "opacity 0.2s, transform 0.15s",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "inherit",
  },
  spinner: {
    display: "inline-block",
    width: 18, height: 18, borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.25)",
    borderTopColor: "#fff",
    animation: "spin 0.7s linear infinite",
  },
  switchRow: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 22, fontSize: "0.84rem",
  },
  switchBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#60a5fa", fontWeight: 600, fontSize: "0.84rem",
    padding: 0, fontFamily: "inherit",
  },
};