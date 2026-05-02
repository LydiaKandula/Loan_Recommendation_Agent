function Dashboard() {
  const logs = [
    { user: "Ravi", income: "$50,000", status: "Personal Loan" },
    { user: "Sita", income: "$70,000", status: "Home Loan" },
    { user: "Amit", income: "$120,000", status: "All Loans" },
    { user: "Priya", income: "$85,000", status: "Auto Loan" },
  ];

  return (
    <div>
      <h2>Application Dashboard</h2>
      <p style={{ color: "var(--text)", marginBottom: "20px" }}>
        Recent loan applications and eligibility
      </p>

      {/* Card Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {logs.map((log, index) => (
          <div
            key={index}
            style={{
              background: "Black",
              padding: "18px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              transition: "0.3s",
            }}
          >
            <h3 style={{ marginBottom: "6px" }}>{log.user}</h3>

            <p style={{ color: "var(--text-lighter)", marginBottom: "10px" }}>
              Income: {log.income}
            </p>

            <div
              style={{
                display: "inline-block",
                padding: "6px 12px",
                borderRadius: "20px",
                background: "var(--primary)",
                color: "var(--text)",
                fontSize: "13px",
              }}
            >
              {log.status}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div
        style={{
          marginTop: "24px",
          padding: "16px",
          background: "rgba(16, 185, 129, 0.1)",
          borderRadius: "10px",
          textAlign: "center",
          color: "var(--text)",
          fontWeight: "600",
        }}
      >
        Total Applications: {logs.length} | Approval Rate: 100%
      </div>
    </div>
  );
}

export default Dashboard;