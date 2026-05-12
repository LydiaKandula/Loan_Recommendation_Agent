function StatsCards() {
  return (
    <div className="stats">

      <div className="stat-card">
        <h3>Total Applications</h3>
        <p>24</p>
      </div>

      <div className="stat-card">
        <h3>Approval Rate</h3>
        <p>92%</p>
      </div>

      <div className="stat-card danger">
        <h3>Pending Reviews</h3>
        <p>3</p>
      </div>

    </div>
  );
}

export default StatsCards;