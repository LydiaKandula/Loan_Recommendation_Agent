import { useState } from "react";

const COUNTRY_CODES = [
  { code:"+91",  label:"🇮🇳 +91"  },
  { code:"+1",   label:"🇺🇸 +1"   },
  { code:"+44",  label:"🇬🇧 +44"  },
  { code:"+971", label:"🇦🇪 +971" },
  { code:"+65",  label:"🇸🇬 +65"  },
  { code:"+61",  label:"🇦🇺 +61"  },
  { code:"+49",  label:"🇩🇪 +49"  },
  { code:"+33",  label:"🇫🇷 +33"  },
  { code:"+81",  label:"🇯🇵 +81"  },
  { code:"+86",  label:"🇨🇳 +86"  },
];

// ✅ FIX: F must be defined OUTSIDE InputForm.
// When defined inside, React treats it as a new component type on every
// re-render (every keystroke), so it unmounts+remounts the input element
// and the user loses focus after typing a single character.
function Field({ label, name, type = "text", min, max, step, placeholder,
                 value, onChange, error, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <label style={lblSx}>{label}</label>
      {children || (
        <input
          type={type} min={min} max={max} step={step}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          style={{
            ...inputSx,
            border: `1px solid ${error ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.1)"}`,
          }}
        />
      )}
      {error && <span style={{ fontSize:"0.73rem", color:"#fca5a5" }}>{error}</span>}
    </div>
  );
}

export default function InputForm({ onSubmit }) {
  const [form, setForm] = useState({
    fullName:"", email:"", countryCode:"+91", phone:"",
    age:"", job:"", monthlyIncome:"", monthlyExpenses:"",
    creditScore:"", preferredLoanType:"personal",
    preferredAmount:"", preferredTenure:"",
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  // Single change handler — updates one field and clears its error
  const set = (k) => (e) => {
    const v = e.target.value;
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim())
      e.fullName = "Full name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      e.email = "Valid email required";
    if (!form.phone.trim() || !/^\d{6,15}$/.test(form.phone.replace(/\s/g, "")))
      e.phone = "Valid phone number required (digits only)";
    if (!form.age || +form.age < 18 || +form.age > 100)
      e.age = "Age must be 18–100";
    if (!form.job.trim())
      e.job = "Job title is required";
    if (!form.monthlyIncome || +form.monthlyIncome <= 0)
      e.monthlyIncome = "Monthly income required";
    if (form.monthlyExpenses !== "" && +form.monthlyExpenses > +form.monthlyIncome)
      e.monthlyExpenses = "Expenses cannot exceed income";
    if (!form.creditScore || +form.creditScore < 300 || +form.creditScore > 850)
      e.creditScore = "Credit score must be 300–850";
    if (!form.preferredAmount || +form.preferredAmount <= 0)
      e.preferredAmount = "Loan amount required";
    if (!form.preferredTenure || +form.preferredTenure < 1 || +form.preferredTenure > 360)
      e.preferredTenure = "Tenure must be 1–360 months";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    onSubmit({
      fullName:          form.fullName.trim(),
      email:             form.email.trim(),
      phone:             `${form.countryCode}${form.phone.trim()}`,
      age:               +form.age,
      job:               form.job.trim(),
      monthlyIncome:     +form.monthlyIncome,
      monthlyExpenses:   +form.monthlyExpenses || 0,
      creditScore:       +form.creditScore,
      preferredLoanType: form.preferredLoanType,
      preferredAmount:   +form.preferredAmount,
      preferredTenure:   +form.preferredTenure,
    });
    setTimeout(() => setLoading(false), 5000);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 style={{ fontSize:"1.1rem", fontWeight:700, color:"#fff",
        letterSpacing:"-0.02em", marginBottom:4 }}>
        Loan Application
      </h2>
      <p style={{ fontSize:"0.82rem", color:"#64748b", marginBottom:24 }}>
        Fill in your details to get a personalised loan recommendation
      </p>

      <div className="form-grid">

        <Field label="Full Name" name="fullName" placeholder="Enter full name"
          value={form.fullName} onChange={set("fullName")} error={errors.fullName} />

        <Field label="Email" name="email" type="email" placeholder="Enter email"
          value={form.email} onChange={set("email")} error={errors.email} />

        {/* Phone with country code */}
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          <label style={lblSx}>Phone Number</label>
          <div style={{ display:"flex", gap:8 }}>
            <select
              value={form.countryCode}
              onChange={set("countryCode")}
              style={{ ...inputSx, width:108, padding:"0 8px", flexShrink:0 }}>
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <input
              type="tel"
              placeholder="9876543210"
              value={form.phone}
              onChange={set("phone")}
              style={{
                ...inputSx, flex:1,
                border:`1px solid ${errors.phone ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.1)"}`,
              }}
            />
          </div>
          {errors.phone && <span style={{ fontSize:"0.73rem", color:"#fca5a5" }}>{errors.phone}</span>}
        </div>

        <Field label="Age" name="age" type="number" min="18" max="100" placeholder="25"
          value={form.age} onChange={set("age")} error={errors.age} />

        <Field label="Job Title" name="job" placeholder="e.g. Software Engineer"
          value={form.job} onChange={set("job")} error={errors.job} />

        <Field label="Monthly Income ₹" name="monthlyIncome" type="number"
          min="0" step="100" placeholder="50000"
          value={form.monthlyIncome} onChange={set("monthlyIncome")} error={errors.monthlyIncome} />

        <Field label="Monthly Expenses ₹" name="monthlyExpenses" type="number"
          min="0" step="100" placeholder="20000"
          value={form.monthlyExpenses} onChange={set("monthlyExpenses")} error={errors.monthlyExpenses} />

        <Field label="Credit Score" name="creditScore" type="number"
          min="300" max="850" placeholder="300–850"
          value={form.creditScore} onChange={set("creditScore")} error={errors.creditScore} />

        {/* Loan Type select */}
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          <label style={lblSx}>Loan Type</label>
          <select value={form.preferredLoanType} onChange={set("preferredLoanType")}
            style={inputSx}>
            {["personal","home","car","business","education"].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        <Field label="Loan Amount ₹" name="preferredAmount" type="number"
          min="0" step="1000" placeholder="300000"
          value={form.preferredAmount} onChange={set("preferredAmount")} error={errors.preferredAmount} />

        <Field label="Tenure (months)" name="preferredTenure" type="number"
          min="1" max="360" placeholder="36"
          value={form.preferredTenure} onChange={set("preferredTenure")} error={errors.preferredTenure} />

      </div>

      {/* Submit button */}
      <button type="submit" disabled={loading} style={{
        marginTop:28, height:50, padding:"0 32px", borderRadius:12, border:"none",
        background: loading
          ? "rgba(255,255,255,0.06)"
          : "linear-gradient(135deg,#2563eb,#1d4ed8)",
        color: loading ? "#64748b" : "#fff",
        fontSize:"0.92rem", fontWeight:700, letterSpacing:"-0.01em",
        cursor: loading ? "not-allowed" : "pointer",
        boxShadow: loading ? "none" : "0 4px 20px rgba(37,99,235,0.4)",
        display:"flex", alignItems:"center", gap:10,
        transition:"all 0.2s",
      }}>
        {loading ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              style={{ animation:"spin 1s linear infinite" }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            Processing…
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Submit Application
          </>
        )}
      </button>

      <style>{`
        @keyframes spin { from { transform:rotate(0) } to { transform:rotate(360deg) } }
        input:focus, select:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.2);
          outline: none;
        }
      `}</style>
    </form>
  );
}

// Shared styles — defined at module level (never recreated)
const lblSx = {
  fontSize:"0.74rem", fontWeight:600,
  textTransform:"uppercase", letterSpacing:"0.05em",
  color:"#94a3b8",
};

const inputSx = {
  height:42, borderRadius:9,
  border:"1px solid rgba(255,255,255,0.1)",
  background:"rgba(255,255,255,0.04)",
  color:"#e2e8f0", padding:"0 13px",
  fontSize:"0.875rem", outline:"none",
  width:"100%",
  transition:"border-color 0.2s, box-shadow 0.2s",
};