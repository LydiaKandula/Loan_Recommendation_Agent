import { useState } from "react";

function InputForm({ onSubmitSuccess }) {

  const [form, setForm] = useState({
    income: "",
    credit_score: "",
    loan_amount: "",
    purpose: "",
    tenure: ""
  });

  const handleSubmit = () => {
    onSubmitSuccess(form);
  };

  return (
    <div className="card form-card">

      <h2>📋 Loan Application</h2>

      <div className="form-grid">

        <input placeholder="Monthly Income"
          onChange={(e)=>setForm({...form, income:e.target.value})}/>

        <input placeholder="Credit Score (300-900)"
          onChange={(e)=>setForm({...form, credit_score:e.target.value})}/>

        <input placeholder="Loan Amount"
          onChange={(e)=>setForm({...form, loan_amount:e.target.value})}/>

        <select onChange={(e)=>setForm({...form, purpose:e.target.value})}>
          <option>Select Purpose</option>
          <option>Home</option>
          <option>Personal</option>
          <option>Education</option>
          <option>Vehicle</option>
        </select>

        <select onChange={(e)=>setForm({...form, tenure:e.target.value})}>
          <option>Select Tenure</option>
          <option value="12">12 Months</option>
          <option value="24">24 Months</option>
          <option value="36">36 Months</option>
        </select>

      </div>

      <button className="primary-btn" onClick={handleSubmit}>
        Submit Application
      </button>

    </div>
  );
}

export default InputForm;