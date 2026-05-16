function Dashboard({ applications }) {
  return (
    <div>

      <div className="dashboard-headline">
        <h2>Loan Applications</h2>

        <p className="subtitle">
          Real-time submitted applicant details
        </p>
      </div>

      <div className="dashboard-table">
        <table>

          <thead>
            <tr>
              <th>Applicant</th>
              <th>Loan Type</th>
              <th>Income</th>
              <th>Credit Score</th>
              <th>Loan Amount</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            {applications.length > 0 ? (
              applications.map((app) => (

                <tr key={app.id}>

                  <td>{app.fullName}</td>

                  <td>
                    {app.preferredLoanType}
                  </td>

                  <td>
                    ₹ {app.monthlyIncome}
                  </td>

                  <td>
                    {app.creditScore}
                  </td>

                  <td>
                    ₹ {app.preferredAmount}
                  </td>

                  <td>

                    <span
                      className={`status ${
                        app.status === "Approved"
                          ? "status-approved"
                          : app.status === "Rejected"
                          ? "status-pending"
                          : "status-under-review"
                      }`}
                    >
                      {app.status}
                    </span>

                  </td>

                </tr>

              ))
            ) : (

              <tr>
                <td
                  colSpan="6"
                  style={{
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  No applications submitted
                </td>
              </tr>

            )}

          </tbody>

        </table>
      </div>

    </div>
  );
}

export default Dashboard;