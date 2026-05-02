import InputForm from "./components/InputForm";
import ChatUI from "./components/ChatUI";
import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
  return (
    <div className="app-container">

      {/* Header */}
      <div className="header">
        <h1>Loan Recommendation Agent</h1>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="grid-layout">

          <div className="card">
            <InputForm />
          </div>

          <div className="card">
            <ChatUI />
          </div>

          <div className="card full-width">
            <Dashboard />
          </div>

        </div>
      </div>

    </div>
  );
}

export default App;