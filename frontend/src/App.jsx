import { useState, useEffect, useRef } from "react";

import Sidebar    from "./components/Sidebar";
import Navbar     from "./components/Navbar";
import StatsCards from "./components/StatsCards";
import InputForm  from "./components/InputForm";
import ChatUI     from "./components/ChatUI";
import Dashboard  from "./components/Dashboard";
import Logs       from "./components/Logs";

import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

function App() {
  const [activePage, setActivePage]       = useState("Dashboard");
  const [sidebarWidth, setSidebarWidth]   = useState(260);
  const sidebarRef                        = useRef(null);

  const [applications, setApplications]   = useState([]);
  const [loading, setLoading]             = useState(false);

  // ✅ Stores the most recently submitted form + AI recommendation result
  // Passed into ChatUI so the AI knows who it's talking to
  const [lastApplication, setLastApplication] = useState(null);

  const fetchApplications = () => {
    setLoading(true);
    fetch(`${API_BASE}/applications`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((data) => setApplications(data))
      .catch((err) => console.error("Fetch error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchApplications(); }, []);

  // ✅ Submit form → POST /chat → get AI recommendation back
  // Merge the form data WITH the recommendation result, store as lastApplication
  const handleApplicationSubmit = (applicationData) => {
    fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(applicationData),
    })
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((result) => {
        // result = { bank, emi, ai_message } from recommendation_service
        const enriched = {
          ...applicationData,
          bank:    result.bank    || null,
          emi:     result.emi     || null,
          aiMessage: result.ai_message || result.message || null,
          status:
            applicationData.creditScore >= 750 ? "Approved" :
            applicationData.creditScore >= 650 ? "Under Review" : "Rejected",
        };

        // ✅ Save as lastApplication so ChatUI can use it
        setLastApplication(enriched);

        fetchApplications();

        // Auto-navigate to Chat Assistant after form submit
        setActivePage("Chat Assistant");
        alert(
          result.bank
            ? `✅ Best loan found: ${result.bank} — EMI ₹${result.emi}/month\n\nChat Assistant will now help you explore further.`
            : "No matching loan found. Chat Assistant can help you explore options."
        );
      })
      .catch((err) => {
        console.error("Submit error:", err);
        alert("Submission failed. Is the backend running?");
      });
  };

  /* Sidebar resize */
  useEffect(() => {
    const handleMouseMove = (e) => {
      const w = e.clientX;
      if (w >= 220 && w <= 450) setSidebarWidth(w);
    };
    const stopResize  = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopResize);
    };
    const startResize = () => {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", stopResize);
    };
    const handle = document.querySelector(".resize-handle");
    if (handle) handle.addEventListener("mousedown", startResize);
    return () => { if (handle) handle.removeEventListener("mousedown", startResize); };
  }, []);

  return (
    <div className="app">

      <div ref={sidebarRef} className="sidebar" style={{ width: `${sidebarWidth}px` }}>
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
      </div>

      <div className="resize-handle" />

      <div className="main">
        <Navbar />

        {activePage === "Dashboard" && <StatsCards applications={applications} />}

        <div className="content-grid">

          {activePage === "Dashboard" && (
            <div className="panel full">
              {loading
                ? <p className="subtitle">Loading applications...</p>
                : <Dashboard applications={applications} />
              }
            </div>
          )}

          {activePage === "Loan Form" && (
            <div className="panel full loan-form">
              <InputForm onSubmit={handleApplicationSubmit} />
            </div>
          )}

          {/* ✅ Pass lastApplication so ChatUI greets with the user's actual data */}
          {activePage === "Chat Assistant" && (
            <div className="panel full">
              <ChatUI lastApplication={lastApplication} />
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