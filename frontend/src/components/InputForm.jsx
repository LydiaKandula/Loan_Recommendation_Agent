//InputForm.jsx

import { useState } from "react";

<<<<<<< HEAD
/* BACKEND API */
const API = "http://127.0.0.1:8000";

function InputForm({ onSubmit }) {

=======
function InputForm({ onSubmit }) {
>>>>>>> 5e1f87c2bb6868f08cbbe844b66cf68c545847d6
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
<<<<<<< HEAD

  const handleSubmit = async () => {

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
=======
  const [errors, setErrors] = useState({});

  const validateEmail = (value) => /^\S+@\S+\.\S+$/.test(value);

  const validatePhone = (value) => {
    const digits = value.replace(/\D/g, "");
    return /^\d{10,15}$/.test(digits);
  };

  const isInteger = (value) => /^\d+$/.test(value);

  const validateField = (field, value, values) => {
    const trimmed = value.trim();

    switch (field) {
      case "fullName":
        return trimmed ? "" : "Full name is required.";
      case "email":
        if (!trimmed) return "Email is required.";
        return validateEmail(trimmed) ? "" : "Enter a valid email address.";
      case "phone":
        if (!trimmed) return "Phone number is required.";
        return validatePhone(trimmed)
          ? ""
          : "Enter a valid phone number with 10–15 digits.";
      case "age":
        if (!trimmed) return "Age is required.";
        return isInteger(trimmed) && Number(trimmed) >= 18 && Number(trimmed) <= 100
          ? ""
          : "Age must be a whole number between 18 and 100.";
      case "job":
        return trimmed ? "" : "Job title is required.";
      case "monthlyIncome":
        if (!trimmed) return "Monthly income is required.";
        return Number(trimmed) > 0 ? "" : "Monthly income must be greater than zero.";
      case "monthlyExpenses":
        if (!trimmed) return "Monthly expenses are required.";
        if (Number(trimmed) < 0) return "Monthly expenses cannot be negative.";
        if (values.monthlyIncome.trim() && Number(trimmed) > Number(values.monthlyIncome)) {
          return "Expenses cannot be greater than income.";
        }
        return "";
      case "creditScore":
        if (!trimmed) return "Credit score is required.";
        return isInteger(trimmed) && Number(trimmed) >= 300 && Number(trimmed) <= 850
          ? ""
          : "Credit score must be between 300 and 850.";
      case "preferredAmount":
        if (!trimmed) return "Preferred loan amount is required.";
        return Number(trimmed) > 0 ? "" : "Preferred loan amount must be greater than zero.";
      case "preferredTenure":
        if (!trimmed) return "Preferred tenure is required.";
        return isInteger(trimmed) && Number(trimmed) >= 1 && Number(trimmed) <= 360
          ? ""
          : "Preferred tenure must be between 1 and 360 months.";
      default:
        return "";
    }
  };

  const updateField = (field, value, setter) => {
    const currentValues = {
      fullName,
      email,
      phone,
      age,
      job,
      monthlyIncome,
      monthlyExpenses,
      creditScore,
      preferredAmount,
      preferredTenure,
      preferredLoanType,
      [field]: value,
    };

    setter(value);

    setErrors((prev) => {
      const next = { ...prev };
      const fieldError = validateField(field, value, currentValues);

      if (fieldError) {
        next[field] = fieldError;
      } else {
        delete next[field];
      }

      if (field === "monthlyIncome" || field === "monthlyExpenses") {
        const expenseError = validateField(
          "monthlyExpenses",
          currentValues.monthlyExpenses,
          currentValues
        );

        if (expenseError) {
          next.monthlyExpenses = expenseError;
        } else {
          delete next.monthlyExpenses;
        }
      }

      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const values = {
      fullName,
      email,
      phone,
      age,
      job,
      monthlyIncome,
      monthlyExpenses,
      creditScore,
      preferredAmount,
      preferredTenure,
      preferredLoanType,
    };

    const nextErrors = {};
    const fieldsToValidate = [
      "fullName",
      "email",
      "phone",
      "age",
      "job",
      "monthlyIncome",
      "monthlyExpenses",
      "creditScore",
      "preferredAmount",
      "preferredTenure",
    ];

    fieldsToValidate.forEach((field) => {
      const error = validateField(field, values[field], values);
      if (error) nextErrors[field] = error;
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
>>>>>>> 5e1f87c2bb6868f08cbbe844b66cf68c545847d6
      return;
    }

    const application = {
<<<<<<< HEAD
      fullName,
      email,
      phone,
      age: Number(age),
      job,
=======
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      age: Number(age),
      job: job.trim(),
>>>>>>> 5e1f87c2bb6868f08cbbe844b66cf68c545847d6
      monthlyIncome: Number(monthlyIncome),
      monthlyExpenses: Number(monthlyExpenses),
      creditScore: Number(creditScore),
      preferredLoanType,
      preferredAmount: Number(preferredAmount),
      preferredTenure: Number(preferredTenure),
    };

<<<<<<< HEAD
    try {

      const response = await fetch(
        `${API}/submit-application`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(application),
        }
      );

      const data = await response.json();

      alert(data.message);

      if (onSubmit) {
        onSubmit(application);
      }

    } catch (error) {

      console.log(error);

      alert("Backend connection failed");
    }
  };

  return (
    
  <form onSubmit={(e) => e.preventDefault()}>

    <h2>Loan Application</h2>

    <div className="form-grid">

      <div>
        <label>Full Name</label>

        <input
          type="text"
          placeholder="Enter full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div>
        <label>Email</label>

        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label>Phone</label>

        <input
          type="tel"
          placeholder="Enter phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div>
        <label>Age</label>

        <input
          type="number"
          placeholder="Enter age"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />
      </div>

      <div>
        <label>Job</label>

        <input
          type="text"
          placeholder="Enter job title"
          value={job}
          onChange={(e) => setJob(e.target.value)}
        />
      </div>

      <div>
        <label>Monthly Income</label>

        <input
          type="number"
          placeholder="Enter monthly income"
          value={monthlyIncome}
          onChange={(e) =>
            setMonthlyIncome(e.target.value)
          }
        />
      </div>

      <div>
        <label>Monthly Expenses</label>

        <input
          type="number"
          placeholder="Enter monthly expenses"
          value={monthlyExpenses}
          onChange={(e) =>
            setMonthlyExpenses(e.target.value)
          }
        />
      </div>

      <div>
        <label>Credit Score</label>

        <input
          type="number"
          placeholder="Enter credit score"
          value={creditScore}
          onChange={(e) =>
            setCreditScore(e.target.value)
          }
        />
      </div>

      <div>
        <label>Preferred Loan Type</label>

        <select
          value={preferredLoanType}
          onChange={(e) =>
            setPreferredLoanType(e.target.value)
          }
        >
          <option value="personal">Personal</option>
          <option value="home">Home</option>
          <option value="auto">Auto</option>
          <option value="business">Business</option>
          <option value="education">Education</option>
        </select>
      </div>

      <div>
        <label>Preferred Amount</label>

        <input
          type="number"
          placeholder="Enter preferred loan amount"
          value={preferredAmount}
          onChange={(e) =>
            setPreferredAmount(e.target.value)
          }
        />
      </div>

      <div>
        <label>Preferred Tenure (months)</label>

        <input
          type="number"
          placeholder="Enter preferred tenure"
          value={preferredTenure}
          onChange={(e) =>
            setPreferredTenure(e.target.value)
          }
        />
      </div>

    </div>

    <button
      type="button"
      onClick={handleSubmit}
      style={{ marginTop: "20px" }}
    >
      Submit Application
    </button>

  </form>
);
=======
    if (onSubmit) {
      onSubmit(application);
    }

    setErrors({});
    alert("Application Submitted!");
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Loan Application</h2>

      <div className="form-grid">
        <div>
          <label>Full Name</label>
          <input
            className={errors.fullName ? "invalid" : ""}
            type="text"
            placeholder="Enter full name"
            value={fullName}
            onChange={(e) => updateField("fullName", e.target.value, setFullName)}
          />
          {errors.fullName && <p className="field-error">{errors.fullName}</p>}
        </div>

        <div>
          <label>Email</label>
          <input
            className={errors.email ? "invalid" : ""}
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => updateField("email", e.target.value, setEmail)}
          />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>

        <div>
          <label>Phone</label>
          <input
            className={errors.phone ? "invalid" : ""}
            type="tel"
            placeholder="Enter phone number"
            value={phone}
            onChange={(e) => updateField("phone", e.target.value, setPhone)}
          />
          {errors.phone && <p className="field-error">{errors.phone}</p>}
        </div>

        <div>
          <label>Age</label>
          <input
            className={errors.age ? "invalid" : ""}
            type="number"
            min="18"
            max="100"
            placeholder="Enter age"
            value={age}
            onChange={(e) => updateField("age", e.target.value, setAge)}
          />
          {errors.age && <p className="field-error">{errors.age}</p>}
        </div>

        <div>
          <label>Job</label>
          <input
            className={errors.job ? "invalid" : ""}
            type="text"
            placeholder="Enter job title"
            value={job}
            onChange={(e) => updateField("job", e.target.value, setJob)}
          />
          {errors.job && <p className="field-error">{errors.job}</p>}
        </div>

        <div>
          <label>Monthly Income</label>
          <input
            className={errors.monthlyIncome ? "invalid" : ""}
            type="number"
            min="0"
            step="0.01"
            placeholder="Enter monthly income"
            value={monthlyIncome}
            onChange={(e) => updateField("monthlyIncome", e.target.value, setMonthlyIncome)}
          />
          {errors.monthlyIncome && (
            <p className="field-error">{errors.monthlyIncome}</p>
          )}
        </div>

        <div>
          <label>Monthly Expenses</label>
          <input
            className={errors.monthlyExpenses ? "invalid" : ""}
            type="number"
            min="0"
            step="0.01"
            placeholder="Enter monthly expenses"
            value={monthlyExpenses}
            onChange={(e) => updateField("monthlyExpenses", e.target.value, setMonthlyExpenses)}
          />
          {errors.monthlyExpenses && (
            <p className="field-error">{errors.monthlyExpenses}</p>
          )}
        </div>

        <div>
          <label>Credit Score</label>
          <input
            className={errors.creditScore ? "invalid" : ""}
            type="number"
            min="300"
            max="850"
            placeholder="Enter credit score"
            value={creditScore}
            onChange={(e) => updateField("creditScore", e.target.value, setCreditScore)}
          />
          {errors.creditScore && (
            <p className="field-error">{errors.creditScore}</p>
          )}
        </div>

        <div>
          <label>Preferred Loan Type</label>
          <select
            value={preferredLoanType}
            onChange={(e) => setPreferredLoanType(e.target.value)}
          >
            <option value="personal">Personal</option>
            <option value="home">Home</option>
            <option value="auto">Auto</option>
            <option value="business">Business</option>
            <option value="education">Education</option>
          </select>
        </div>

        <div>
          <label>Preferred Amount</label>
          <input
            className={errors.preferredAmount ? "invalid" : ""}
            type="number"
            min="0"
            step="0.01"
            placeholder="Enter preferred loan amount"
            value={preferredAmount}
            onChange={(e) => updateField("preferredAmount", e.target.value, setPreferredAmount)}
          />
          {errors.preferredAmount && (
            <p className="field-error">{errors.preferredAmount}</p>
          )}
        </div>

        <div>
          <label>Preferred Tenure (months)</label>
          <input
            className={errors.preferredTenure ? "invalid" : ""}
            type="number"
            min="1"
            max="360"
            placeholder="Enter preferred tenure"
            value={preferredTenure}
            onChange={(e) => updateField("preferredTenure", e.target.value, setPreferredTenure)}
          />
          {errors.preferredTenure && (
            <p className="field-error">{errors.preferredTenure}</p>
          )}
        </div>
      </div>

      <button type="submit" style={{ marginTop: "20px" }}>
        Submit Application
      </button>
    </form>
  );
>>>>>>> 5e1f87c2bb6868f08cbbe844b66cf68c545847d6
}

export default InputForm;