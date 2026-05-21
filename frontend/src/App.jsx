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

  const sidebarRef = useRef(null);

  /* =========================
     APPLICATION DATA
  ========================= */

  const [applications, setApplications] = useState([]);

  /* ✅ NEW: store current user id */
  const [currentUserId, setCurrentUserId] = useState(null);

  /* =========================
     FETCH APPLICATIONS
  ========================= */

  useEffect(() => {

    fetch("http://127.0.0.1:8000/applications")
      .then((res) => res.json())
      .then((data) => {
        setApplications(data);
      })
      .catch((err) => {
        console.log("Backend fetch error:", err);
      });

  }, []);

  /* =========================
     FORM SUBMIT
  ========================= */

  const handleApplicationSubmit = async (applicationData) => {

  try {

    const res = await fetch("http://127.0.0.1:8000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(applicationData)
    });

    const result = await res.json();

    console.log("Backend Response:", result);

    setCurrentUserId(result.user_id);

    alert("Application Submitted!");

  } catch (err) {
    console.log(err);
    alert("Backend error");
  }
};

  /* =========================
     SIDEBAR RESIZE
  ========================= */

  useEffect(() => {

    const handleMouseMove = (e) => {
      const newWidth = e.clientX;

      if (newWidth >= 220 && newWidth <= 450) {
        setSidebarWidth(newWidth);
      }
    };

    const stopResize = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopResize);
    };

    const startResize = () => {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", stopResize);
    };

    const resizeHandle =
      document.querySelector(".resize-handle");

    if (resizeHandle) {
      resizeHandle.addEventListener(
        "mousedown",
        startResize
      );
    }

    return () => {
      if (resizeHandle) {
        resizeHandle.removeEventListener(
          "mousedown",
          startResize
        );
      }
    };

  }, []);

  /* =========================
     UI
  ========================= */

  return (
    <div className="app">

      {/* SIDEBAR */}
      <div
        ref={sidebarRef}
        className="sidebar"
        style={{ width: `${sidebarWidth}px` }}
      >
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
        />
      </div>

      {/* RESIZE HANDLE */}
      <div className="resize-handle"></div>

      {/* MAIN */}
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

          {/* LOAN FORM */}
          {activePage === "Loan Form" && (
            <div className="panel full loan-form">
              <InputForm
                onSubmit={handleApplicationSubmit}
              />
            </div>
          )}

          {/* ✅ CHAT (UPDATED) */}
          {activePage === "Chat Assistant" && (
            <div className="panel full">
              <ChatUI userId={currentUserId || 1} />
            </div>
          )}

          {/* LOGS */}
          {activePage === "Logs" && (
            <div className="panel full">
              <h2>Logs</h2>
              <p className="subtitle">
                Backend activity logs
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;