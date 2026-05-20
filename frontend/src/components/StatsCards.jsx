function StatsCards({ applications }) {

  const approved = applications.filter(
    (app) => app.status === "Approved"
  ).length;

  const pending = applications.filter(
    (app) => app.status === "Under Review"
  ).length;

  const rejected = applications.filter(
    (app) => app.status === "Rejected"
  ).length;

  return (
    <div className="stats">

      <div className="stat-card approved">
        <h3>Approved Loans</h3>

        <p>{approved}</p>
      </div>

      <div className="stat-card pending">
        <h3>Pending Loans</h3>

        <p>{pending}</p>
      </div>

      <div className="stat-card rejected">
        <h3>Rejected Loans</h3>

        <p>{rejected}</p>
      </div>

    </div>
  );
}

export default StatsCards;
