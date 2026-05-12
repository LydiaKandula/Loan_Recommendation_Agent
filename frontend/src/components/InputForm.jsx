import { useState } from "react";

function InputForm() {

  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [creditScore, setCreditScore] = useState("");

  const handleSubmit = () => {

    if (!name || !income || !creditScore) {
      alert("Please fill all fields");
      return;
    }

    alert("Application Submitted!");

    setName("");
    setIncome("");
    setCreditScore("");
  };

  return (
    <div>

      <h2>Loan Application</h2>

      <p className="subtitle">
        Enter your details
      </p>

      <label>Name</label>

      <input
        type="text"
        placeholder="Enter name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label>Annual Income</label>

      <input
        type="number"
        placeholder="Enter annual income"
        value={income}
        onChange={(e) => setIncome(e.target.value)}
      />

      <label>Credit Score</label>

      <input
        type="number"
        placeholder="Enter credit score"
        value={creditScore}
        onChange={(e) => setCreditScore(e.target.value)}
      />

      <button onClick={handleSubmit}>
        Submit Application
      </button>

    </div>
  );
}

export default InputForm;