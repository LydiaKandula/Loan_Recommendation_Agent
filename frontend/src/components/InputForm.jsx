import { useState } from "react";
import { startAgent } from "../services/api";

function InputForm({ setApplications }) {
  const [income, setIncome] = useState("");
  const [creditScore, setCreditScore] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!income || !creditScore) {
      alert("⚠️ Please fill in all fields");
      return;
    }

    try {
      const response = await startAgent({
        income: Number(income),
        credit_score: Number(creditScore),
      });

      setApplications((prev) => [
        ...prev,
        {
          user: "You",
          income: `$${income}`,
          status: response.message,
        },
      ]);

      setSubmitted(true);
      setIncome("");
      setCreditScore("");

    } catch (error) {
      alert("Backend error ❌");
    }
  };

  return (
    <div>
      <h2>Loan Application</h2>

      <p>Enter your financial details</p>

      <div className="form-group">
        <label>Annual Income</label>
        <input
          type="number"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Credit Score</label>
        <input
          type="number"
          value={creditScore}
          onChange={(e) => setCreditScore(e.target.value)}
        />
      </div>

      <button onClick={handleSubmit}>Submit</button>

      {submitted && <p>✅ Submitted successfully</p>}
    </div>
  );
}

export default InputForm;