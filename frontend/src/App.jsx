import { useState, useEffect, useRef } from "react";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import StatsCards from "./components/StatsCards";
import InputForm from "./components/InputForm";
import ChatUI from "./components/ChatUI";
import Dashboard from "./components/Dashboard";

import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarWidth, setSidebarWidth] = useState(260);

  /* ✅ GLOBAL CHAT STATE (PERSISTENT) */
  const [chat, setChat] = useState([]);

  /* USER CONTEXT */
  const [currentUserId, setCurrentUserId] = useState(null);

  const [applications, setApplications] = useState([]);

  /* =========================
     FETCH APPLICATIONS
  ========================= */
  useEffect(() => {
    fetch("http://127.0.0.1:8000/applications")
      .then((res) => res.json())
      .then((data) => setApplications(data))
      .catch((err) => console.log(err));
  }, []);

  /* =========================
     FORM SUBMIT
  ========================= */
  const handleApplicationSubmit = async (applicationData) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(applicationData),
      });

      const data = await res.json();

      /* STORE USER */
      setCurrentUserId(data.user_id);

      /* ADD CHAT MESSAGE */
      setChat((prev) => [
        ...prev,
        {
          user: "Loan Application Submitted",
          bot: data.ai_message,
        },
      ]);

      const newApplication = {
        ...applicationData,
        id: Date.now(),
        status:
          applicationData.creditScore >= 750
            ? "Approved"
            : applicationData.creditScore >= 650
            ? "Under Review"
            : "Rejected",
        recommendationText: data.ai_message,
        createdAt: new Date().toISOString(),
      };

      setApplications((prev) => [newApplication, ...prev]);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="app">

      {/* SIDEBAR */}
      <div className="sidebar" style={{ width: sidebarWidth }}>
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
        />
      </div>

      <div className="resize-handle"></div>

      <div className="main">
        <Navbar />

        {activePage === "Dashboard" && (
          <StatsCards applications={applications} />
        )}

        <div className="content-grid">

          {/* DASHBOARD */}
          {activePage === "Dashboard" && (
            <div className="panel full">
              <Dashboard applications={applications} />
            </div>
          )}

          {/* FORM */}
          {activePage === "Loan Form" && (
            <div className="panel full loan-form">
              <InputForm onSubmit={handleApplicationSubmit} />
            </div>
          )}

          {/* ✅ CHAT (ALWAYS MOUNTED) */}
          <div
            className="panel full"
            style={{
              display:
                activePage === "Chat Assistant"
                  ? "block"
                  : "none",
            }}
          >
            <ChatUI
              chat={chat}
              setChat={setChat}
              userId={currentUserId}
            />
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;