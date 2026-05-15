import { useState } from "react";

function InputForm({ onSubmit }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [job, setJob] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [creditScore, setCreditScore] = useState("");
  const [preferredLoanType, setPreferredLoanType] = useState("personal");
  const [preferredAmount, setPreferredAmount] = useState("");
  const [preferredTenure, setPreferredTenure] = useState("");

  const handleSubmit = () => {
    if (
      !fullName ||
      !email ||
      !phone ||
      !age ||
      !job ||
      !monthlyIncome ||
      !monthlyExpenses ||
      !creditScore ||
      !preferredLoanType ||
      !preferredAmount ||
      !preferredTenure
    ) {
      alert("Please fill all fields");
      return;
    }

    const application = {
      fullName,
      email,
      phone,
      age: Number(age),
      job,
      monthlyIncome: Number(monthlyIncome),
      monthlyExpenses: Number(monthlyExpenses),
      creditScore: Number(creditScore),
      preferredLoanType,
      preferredAmount: Number(preferredAmount),
      preferredTenure: Number(preferredTenure),
    };

    if (onSubmit) {
      onSubmit(application);
    }

    alert("Application Submitted!");
  };

  return (
    <div>
      <h2>Loan Application</h2>

      <label>Full Name</label>
      <input
        type="text"
        placeholder="Enter full name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />

      <label>Email</label>
      <input
        type="email"
        placeholder="Enter email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label>Phone</label>
      <input
        type="tel"
        placeholder="Enter phone number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <label>Age</label>
      <input
        type="number"
        placeholder="Enter age"
        value={age}
        onChange={(e) => setAge(e.target.value)}
      />

      <label>Job</label>
      <input
        type="text"
        placeholder="Enter job title"
        value={job}
        onChange={(e) => setJob(e.target.value)}
      />

      <label>Monthly Income</label>
      <input
        type="number"
        placeholder="Enter monthly income"
        value={monthlyIncome}
        onChange={(e) => setMonthlyIncome(e.target.value)}
      />

      <label>Monthly Expenses</label>
      <input
        type="number"
        placeholder="Enter monthly expenses"
        value={monthlyExpenses}
        onChange={(e) => setMonthlyExpenses(e.target.value)}
      />

      <label>Credit Score</label>
      <input
        type="number"
        placeholder="Enter credit score"
        value={creditScore}
        onChange={(e) => setCreditScore(e.target.value)}
      />

      <label>Preferred Loan Type</label>
      <select
        value={preferredLoanType}
        onChange={(e) => setPreferredLoanType(e.target.value)}
      >
        <option value="personal">Personal</option>
        <option value="home">Home</option>
        <option value="auto">Auto</option>
        <option value="business">Business</option>
        <option value="Education">Education</option>
      </select>

      <label>Preferred Amount</label>
      <input
        type="number"
        placeholder="Enter preferred loan amount"
        value={preferredAmount}
        onChange={(e) => setPreferredAmount(e.target.value)}
      />

      <label>Preferred Tenure (months)</label>
      <input
        type="number"
        placeholder="Enter preferred tenure"
        value={preferredTenure}
        onChange={(e) => setPreferredTenure(e.target.value)}
      />

      <button onClick={handleSubmit}>Submit Application</button>
    </div>
  );
}

export default InputForm;