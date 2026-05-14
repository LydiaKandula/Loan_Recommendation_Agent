import { useState } from "react";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import StatsCards from "./components/StatsCards";
import InputForm from "./components/InputForm";
import ChatUI from "./components/ChatUI";
import Dashboard from "./components/Dashboard";

import "./App.css";

function App() {

  const [activePage, setActivePage] =
    useState("Dashboard");

  return (
    <div className="app">

      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <div className="main">

        <Navbar />

        {activePage === "Dashboard" && <StatsCards />}

        <div className="content-grid">

          {activePage === "Dashboard" && (
            <div className="panel full">
              <Dashboard />
            </div>
          )}

          {activePage === "Loan Form" && (
            <div className="panel full">
              <InputForm />
            </div>
          )}

          {activePage === "Chat Assistant" && (
            <div className="panel full">
              <ChatUI />
            </div>
          )}

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