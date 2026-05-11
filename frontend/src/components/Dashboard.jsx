import { useState } from "react";
import InputForm from "./InputForm";
import ChatUI from "./ChatUI";

function Dashboard() {
  const [userData, setUserData] = useState(null);

  return (
    <div className="app-container">

      {/* 🔷 Top Navigation Bar */}
      <div className="topbar">
        <h2>🏦 Loan Advisor</h2>
      </div>

      {/* 🔷 Main Content */}
      <div className="content">

        {/* 📝 Show Form First */}
        {!userData ? (
          <InputForm onSubmitSuccess={setUserData} />
        ) : (
          <div className="dashboard-grid">

            {/* ✅ Success Card */}
            <div className="card success-card">
              <h3>✅ Application Submitted</h3>
              <p>Your details have been saved successfully.</p>
              <p>Now you can chat with our AI assistant for recommendations.</p>
            </div>

            {/* 🤖 Chat Section */}
            <div className="card">
              <ChatUI userData={userData} />
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default Dashboard;