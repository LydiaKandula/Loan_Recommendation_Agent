function Dashboard() {

  const applications = [
    {
      user: "Ravi",
      income: "$50,000",
      status: "Personal Loan",
    },

    {
      user: "Sita",
      income: "$70,000",
      status: "Home Loan",
    },

    {
      user: "Amit",
      income: "$120,000",
      status: "All Loans",
    },

    {
      user: "Priya",
      income: "$85,000",
      status: "Auto Loan",
    },
  ];

  return (
    <div>

      <h2>Application Dashboard</h2>

      <p className="subtitle">
        Recent applications
      </p>

      <div className="dashboard-grid">

        {applications.map((item, index) => (

          <div
            className="dashboard-card"
            key={index}
          >

            <h3>{item.user}</h3>

            <p>
              Income: {item.income}
            </p>

            <span className="status">
              {item.status}
            </span>

          </div>
        ))}
      </div>

    </div>
  );
}

export default Dashboard;