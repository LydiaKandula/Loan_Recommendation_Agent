//Dashboard.jsx

function Dashboard({ applications }) {
  return (
    <div>

      <div className="dashboard-headline">
        <h2>Loan Applications</h2>

        
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

            )}

          </tbody>

        </table>
      </div>

    </div>
  );
}

export default Dashboard;