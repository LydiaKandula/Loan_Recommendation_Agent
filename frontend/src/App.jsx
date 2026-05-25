import { useState, useEffect, useRef } from "react";
import { useAuth } from "./context/AuthContext";
import AuthPage      from "./pages/AuthPage";
import Dashboard     from "./components/Dashboard";
import StatsCards    from "./components/StatsCards";
import InputForm     from "./components/InputForm";
import ChatUI        from "./components/ChatUI";
import Logs          from "./components/Logs";
import "./App.css";

const API = "http://127.0.0.1:8000";

const NAV = [
  { id:"Dashboard",      icon:"▦",  label:"Dashboard" },
  { id:"Loan Form",      icon:"✦",  label:"Loan Form" },
  { id:"Chat Assistant", icon:"◈",  label:"Chat Assistant" },
  { id:"Logs",           icon:"≡",  label:"Logs" },
];

export default function App() {
  const { auth, logout } = useAuth();
  const [page, setPage]           = useState("Dashboard");
  const [applications, setApps]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [lastApp, setLastApp]     = useState(null);

  const headers = auth?.token
    ? { "Content-Type":"application/json", Authorization:`Bearer ${auth.token}` }
    : { "Content-Type":"application/json" };

  const fetchApps = () => {
    setLoading(true);
    fetch(`${API}/applications`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(setApps)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (auth) fetchApps(); }, [auth]);  // eslint-disable-line

  const handleSubmit = (data) => {
    fetch(`${API}/chat`, { method:"POST", headers, body: JSON.stringify(data) })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(result => {
        const enriched = {
          ...data,
          bank: result.bank || null,
          emi:  result.emi  || null,
          aiMessage: result.ai_message || null,
          status: data.creditScore >= 750 ? "Approved" : data.creditScore >= 650 ? "Under Review" : "Rejected",
        };
        setLastApp(enriched);
        fetchApps();
        setPage("Chat Assistant");
        alert(result.bank
          ? `✅ Best loan: ${result.bank} — EMI ₹${result.emi}/month`
          : "No matching loan found. Chat can help explore options.");
      })
      .catch(err => { console.error(err); alert("Submission failed. Is the backend running?"); });
  };

  if (!auth) return <AuthPage />;

  return (
    <div className="shell">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="9" fill="#2563eb"/>
            <path d="M8 22 L16 10 L24 22 M12 18 H20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>LoanAI</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(n => (
            <button key={n.id} className={`nav-btn ${page===n.id?"active":""}`}
              onClick={() => setPage(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill">
            <span className="user-avatar">{auth.username[0].toUpperCase()}</span>
            <span className="user-name">{auth.username}</span>
          </div>
          <button className="logout-btn" onClick={logout} title="Sign out">⏻</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main">
        {/* TOP BAR */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="page-title">{page}</h1>
          </div>
          <div className="live-badge">
            <span className="live-dot" /> Live
          </div>
        </header>

        {/* CONTENT — all panels rendered, hidden with CSS — no remount on tab switch */}
        <div className="content">

          {/* DASHBOARD */}
          <div style={{ display: page==="Dashboard" ? "contents" : "none" }}>
            {loading
              ? <div className="loading-state">Loading applications…</div>
              : <>
                  <StatsCards applications={applications} />
                  <div className="panel"><Dashboard applications={applications} /></div>
                </>
            }
          </div>

          {/* LOAN FORM */}
          <div style={{ display: page==="Loan Form" ? "block" : "none" }}>
            <div className="panel"><InputForm onSubmit={handleSubmit} /></div>
          </div>

          {/* CHAT — always mounted, never remounts */}
          <div style={{ display: page==="Chat Assistant" ? "block" : "none" }}>
            <div className="panel chat-panel">
              <ChatUI lastApplication={lastApp} authToken={auth?.token} />
            </div>
          </div>

          {/* LOGS */}
          <div style={{ display: page==="Logs" ? "block" : "none" }}>
            <div className="panel"><Logs authToken={auth?.token} /></div>
          </div>

        </div>
      </main>
    </div>
  );
}