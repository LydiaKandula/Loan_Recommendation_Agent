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

  /* MULTIPLE APPLICATIONS */

  const [applications, setApplications] = useState([]);

  /* FORM SUBMIT */

  const handleApplicationSubmit = (applicationData) => {
    const newApplication = {
      ...applicationData,

      id: Date.now(),

      status:
        applicationData.creditScore >= 750
          ? "Approved"
          : applicationData.creditScore >= 650
          ? "Under Review"
          : "Rejected",
    };

    setApplications((prev) => [
      newApplication,
      ...prev,
    ]);
  };

  /* SIDEBAR RESIZE */

  useEffect(() => {
    const handleMouseMove = (e) => {
      const newWidth = e.clientX;

      if (newWidth >= 220 && newWidth <= 450) {
        setSidebarWidth(newWidth);
      }
    };

    const stopResize = () => {
      document.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      document.removeEventListener(
        "mouseup",
        stopResize
      );
    };

    const startResize = () => {
      document.addEventListener(
        "mousemove",
        handleMouseMove
      );

      document.addEventListener(
        "mouseup",
        stopResize
      );
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

          {/* CHAT */}

          {activePage === "Chat Assistant" && (
            <div className="panel full">
              <ChatUI />
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