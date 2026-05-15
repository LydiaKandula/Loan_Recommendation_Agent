import { useState } from "react";

function Dashboard({ latestApplication }) {
  const [selectedApplication, setSelectedApplication] = useState(null);
  const applications = [
    {
      user: "Ravi",
      income: "$50,000",
      loanType: "Personal Loan",
      amount: "$150,000",
      tenure: "24",
      status: "Pending",
      recommendation: "Eligible, review credit history.",
    },
    {
      user: "Sita",
      income: "$70,000",
      loanType: "Home Loan",
      amount: "$500,000",
      tenure: "120",
      status: "Approved",
      recommendation: "Strong income profile, good match.",
    },
    {
      user: "Amit",
      income: "$120,000",
      loanType: "Business Loan",
      amount: "$750,000",
      tenure: "60",
      status: "Under Review",
      recommendation: "High loan amount, needs collateral review.",
    },
    {
      user: "Priya",
      income: "$85,000",
      loanType: "Auto Loan",
      amount: "$300,000",
      tenure: "48",
      status: "Pending",
      recommendation: "Average expenses, likely qualified.",
    },
    {
      user: "Neha",
      income: "$95,000",
      loanType: "Personal Loan",
      amount: "$220,000",
      tenure: "36",
      status: "Approved",
      recommendation: "Stable income, good fit for amount.",
    },
    {
      user: "Karan",
      income: "$45,000",
      loanType: "Education Loan",
      amount: "$120,000",
      tenure: "60",
      status: "Pending",
      recommendation: "Lower income, verify repayment capacity.",
    },
    {
      user: "Meera",
      income: "$110,000",
      loanType: "Home Loan",
      amount: "$650,000",
      tenure: "180",
      status: "Under Review",
      recommendation: "Large mortgage request, confirm assets.",
    },
    {
      user: "Aisha",
      income: "$78,000",
      loanType: "Auto Loan",
      amount: "$280,000",
      tenure: "42",
      status: "Approved",
      recommendation: "Good credit profile, strong candidate.",
    },
  ];

  const handleSelect = (item) => {
    setSelectedApplication(item);
  };

  return (
    <div>
      <div className="dashboard-headline">
        <div>
          <h2>Application Dashboard</h2>
          <p className="subtitle">Loan applicants and status overview</p>
        </div>
      </div>

      {selectedApplication && (
        <div className="dashboard-detail-card">
          <h3>Applicant detail</h3>
          <div className="detail-grid">
            <div className="detail-row">
              <span className="detail-label">Name</span>
              <span className="detail-value">{selectedApplication.user}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Loan Type</span>
              <span className="detail-value">{selectedApplication.loanType}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Amount</span>
              <span className="detail-value">{selectedApplication.amount}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Tenure</span>
              <span className="detail-value">{selectedApplication.tenure} months</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className="detail-value">
                <span className={`status status-${selectedApplication.status.toLowerCase().replace(/\s+/g, "-")}`}>
                  {selectedApplication.status}
                </span>
              </span>
            </div>
            <div className="detail-row detail-full">
              <span className="detail-label">Recommendation</span>
              <span className="detail-value">{selectedApplication.recommendation}</span>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Income</th>
              <th>Loan Type</th>
              <th>Amount</th>
              <th>Tenure (months)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((item, index) => (
              <tr
                key={index}
                className={
                  selectedApplication?.user === item.user ? "selected" : ""
                }
                onClick={() => handleSelect(item)}
              >
                <td>{item.user}</td>
                <td>{item.income}</td>
                <td>{item.loanType}</td>
                <td>{item.amount}</td>
                <td>{item.tenure}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;