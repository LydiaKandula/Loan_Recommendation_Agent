import { useState } from "react";

function InputForm() {
  const [income, setIncome] = useState("");
  const [creditScore, setCreditScore] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (income && creditScore) {
      setSubmitted(true);
      setIncome("");
      setCreditScore("");
    } else {
      alert("⚠️ Please fill in all fields");
    }
  };

  return (
    <div>
      <h2>Loan Application</h2>
      <p style={{ color: "var(--text-light)", marginBottom: "20px" }}>
        Enter your financial details to get a loan recommendation
      </p>

      <div className="form-group">
        <label>Annual Income</label>
        <input
          type="number"
          placeholder="Enter annual income (e.g., 50000)"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Credit Score</label>
        <input
          type="number"
          placeholder="Enter credit score (e.g., 750)"
          value={creditScore}
          onChange={(e) => setCreditScore(e.target.value)}
        />
      </div>

      <button onClick={handleSubmit}>Submit Application</button>

      {submitted && (
        <div className="success-message">
          ✅ Application submitted successfully!
        </div>
      )}
    </div>
  );
}

export default InputForm;