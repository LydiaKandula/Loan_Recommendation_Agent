import { useState } from "react";
import InputForm from "./components/InputForm";
import ChatUI from "./components/ChatUI";
import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
  const [applications, setApplications] = useState([]);

  return (
    <div className="app-container">

      <div className="header">
        <h1>Loan Recommendation Agent</h1>
      </div>

      <div className="main-content">
        <div className="grid-layout">

          <div className="card">
            <InputForm setApplications={setApplications} />
          </div>

          <div className="card">
            <ChatUI />
          </div>

          <div className="card full-width">
            <Dashboard applications={applications} />
          </div>

        </div>
      </div>

    </div>
  );
}

export default App;