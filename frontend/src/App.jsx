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

  const getLoanRecommendation = ({
    preferredLoanType,
    creditScore,
    preferredAmount,
    preferredTenure,
  }) => {
    const loanOffers = {
      personal: [
        { minScore: 750, bank: "HDFC Bank", rate: 13.9 },
        { minScore: 700, bank: "ICICI Bank", rate: 14.4 },
        { minScore: 650, bank: "Axis Bank", rate: 14.9 },
        { minScore: 0, bank: "Bank of Baroda", rate: 16.2 },
      ],
      home: [
        { minScore: 750, bank: "SBI", rate: 8.05 },
        { minScore: 700, bank: "HDFC Bank", rate: 8.25 },
        { minScore: 650, bank: "ICICI Bank", rate: 8.35 },
        { minScore: 0, bank: "Axis Bank", rate: 8.55 },
      ],
      auto: [
        { minScore: 750, bank: "SBI", rate: 8.25 },
        { minScore: 700, bank: "HDFC Bank", rate: 8.55 },
        { minScore: 650, bank: "ICICI Bank", rate: 8.75 },
        { minScore: 0, bank: "Axis Bank", rate: 9.1 },
      ],
      business: [
        { minScore: 750, bank: "SBI", rate: 12.5 },
        { minScore: 700, bank: "HDFC Bank", rate: 12.9 },
        { minScore: 650, bank: "ICICI Bank", rate: 13.3 },
        { minScore: 0, bank: "Axis Bank", rate: 13.9 },
      ],
      education: [
        { minScore: 750, bank: "SBI", rate: 9.15 },
        { minScore: 700, bank: "HDFC Bank", rate: 9.45 },
        { minScore: 650, bank: "ICICI Bank", rate: 9.85 },
        { minScore: 0, bank: "Axis Bank", rate: 10.2 },
      ],
    };

    const offers = loanOffers[preferredLoanType] || loanOffers.personal;
    const offer = offers.find((item) => creditScore >= item.minScore) || offers[offers.length - 1];
    const rate = offer.rate;
    const monthlyRate = rate / 100 / 12;
    const n = Number(preferredTenure);
    const p = Number(preferredAmount);
    const emi = n > 0
      ? Math.round(
          (p * monthlyRate * Math.pow(1 + monthlyRate, n)) /
            (Math.pow(1 + monthlyRate, n) - 1)
        )
      : 0;

    return {
      bank: offer.bank,
      rate,
      emi,
      recommendationText: `${offer.bank} @ ${rate.toFixed(2)}% | EMI ₹${emi}`,
    };
  };

  const createLoanRecommendationText = ({
    preferredLoanType,
    creditScore,
    preferredAmount,
    preferredTenure,
  }) => {
    if (
      !preferredLoanType ||
      !preferredAmount ||
      !preferredTenure ||
      !creditScore
    ) {
      return null;
    }

    const recommendation = getLoanRecommendation({
      preferredLoanType,
      creditScore,
      preferredAmount,
      preferredTenure,
    });

    return recommendation.recommendationText;
  };

  /* MULTIPLE APPLICATIONS */

  const [applications, setApplications] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const stored = window.localStorage.getItem("loanApplications");
    if (!stored) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored);
      return parsed.map((app) => ({
        ...app,
        recommendationText:
          app.recommendationText ?? createLoanRecommendationText(app),
        status:
          app.status ??
          (app.creditScore >= 750
            ? "Approved"
            : app.creditScore >= 650
            ? "Under Review"
            : "Rejected"),
      }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "loanApplications",
        JSON.stringify(applications)
      );
    }
  }, [applications]);

  /* FORM SUBMIT */

  const handleApplicationSubmit = (applicationData) => {
    const recommendation = getLoanRecommendation(applicationData);
    const newApplication = {
      ...applicationData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      recommendationText: recommendation.recommendationText,
      status:
        applicationData.creditScore >= 750
          ? "Approved"
          : applicationData.creditScore >= 650
          ? "Under Review"
          : "Rejected",
    };

    setApplications((prev) => {
      const next = [newApplication, ...prev];
      if (typeof window !== "undefined") {
        window.localStorage.setItem("loanApplications", JSON.stringify(next));
      }
      return next;
    });
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