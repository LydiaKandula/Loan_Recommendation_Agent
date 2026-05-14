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

      <div className="dashboard-headline">
        <div>
          <h2>Application Dashboard</h2>
          <p className="subtitle">Loan applicants and status overview</p>
        </div>
      </div>

      <div className="dashboard-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Income</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((item, index) => (
              <tr key={index}>
                <td>{item.user}</td>
                <td>{item.income}</td>
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