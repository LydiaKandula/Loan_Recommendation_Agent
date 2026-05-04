function Dashboard({ applications }) {
  return (
    <div>
      <h2>Application Dashboard</h2>

      {applications.length === 0 ? (
        <p>No applications yet</p>
      ) : (
        applications.map((app, index) => (
          <div key={index}>
            <h3>{app.user}</h3>
            <p>{app.income}</p>
            <p>{app.status}</p>
          </div>
        ))
      )}

      <p>Total Applications: {applications.length}</p>
    </div>
  );
}

export default Dashboard;