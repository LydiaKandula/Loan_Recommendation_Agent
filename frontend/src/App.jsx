import { useState, useEffect, useRef } from "react";

import AuthPage  from "./components/AuthPage";
import Sidebar   from "./components/Sidebar";
import Navbar    from "./components/Navbar";
import StatsCards from "./components/StatsCards";
import InputForm from "./components/InputForm";
import ChatUI    from "./components/ChatUI";
import Dashboard from "./components/Dashboard";
import Logs      from "./components/Logs";

import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

function App() {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const [authUser,   setAuthUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("authUser")); } catch { return null; }
  });

  const handleAuth = (data) => {
    setAuthUser({ id: data.userId, username: data.username, fullName: data.fullName });
  };
  const handleLogout = () => setAuthUser(null);

  // ── App state ────────────────────────────────────────────────────────────────
  const [activePage,      setActivePage]      = useState("Dashboard");
  const [sidebarWidth,    setSidebarWidth]    = useState(260);
  const sidebarRef                            = useRef(null);
  const [applications,    setApplications]   = useState([]);
  const [loading,         setLoading]        = useState(false);
  const [lastApplication, setLastApplication] = useState(null);

  const fetchApplications = () => {
    setLoading(true);
    fetch(`${API_BASE}/applications`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setApplications)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (authUser) fetchApplications(); }, [authUser]);

  const handleApplicationSubmit = (applicationData) => {
    fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(applicationData),
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(result => {
        const enriched = {
          ...applicationData,
          bank:      result.bank      || null,
          emi:       result.emi       || null,
          aiMessage: result.ai_message || result.message || null,
          status:
            applicationData.creditScore >= 750 ? "Approved" :
            applicationData.creditScore >= 650 ? "Under Review" : "Rejected",
        };
        setLastApplication(enriched);
        fetchApplications();
        setActivePage("Chat Assistant");
        alert(
          result.bank
            ? `✅ Best loan found: ${result.bank} — EMI ₹${result.emi}/month\n\nChat Assistant will now help you explore further.`
            : "No matching loan found. Chat Assistant can help you explore options."
        );
      })
      .catch(() => alert("Submission failed. Is the backend running?"));
  };

  // ── Sidebar resize ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove  = (e) => { if (e.clientX >= 220 && e.clientX <= 450) setSidebarWidth(e.clientX); };
    const onUp    = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    const onDown  = () => { document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp); };
    const handle  = document.querySelector(".resize-handle");
    if (handle) handle.addEventListener("mousedown", onDown);
    return () => { if (handle) handle.removeEventListener("mousedown", onDown); };
  }, []);

  // ── Auth gate ─────────────────────────────────────────────────────────────────
  if (!authUser) return <AuthPage onAuth={handleAuth} />;

  return (
    <div className="app">
      <div ref={sidebarRef} className="sidebar" style={{ width: `${sidebarWidth}px` }}>
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
      </div>

      <div className="resize-handle" />

      <div className="main">
        <Navbar authUser={authUser} onLogout={handleLogout} />

        {activePage === "Dashboard" && <StatsCards applications={applications} />}

        <div className="content-grid">
          {activePage === "Dashboard" && (
            <div className="panel full">
              {loading
                ? <p className="subtitle">Loading applications...</p>
                : <Dashboard applications={applications} />}
            </div>
          )}

          {activePage === "Loan Form" && (
            <div className="panel full loan-form">
              <InputForm onSubmit={handleApplicationSubmit} />
            </div>
          )}

          {activePage === "Chat Assistant" && (
            <div className="panel full">
              {/* No switch user — authUser is the logged-in user */}
              <ChatUI lastApplication={lastApplication} authUser={authUser} />
            </div>
          )}

          {activePage === "Logs" && (
            <div className="panel full">
              <Logs />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;