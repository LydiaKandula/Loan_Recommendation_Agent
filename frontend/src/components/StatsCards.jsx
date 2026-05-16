function StatsCards() {
  return (
    <div className="stats">

      <div className="stat-card approved">
  <h3>Approved Loans</h3>
  <p>245</p>
</div>

<div className="stat-card pending">
  <h3>Pending Loans</h3>
  <p>48</p>
</div>

<div className="stat-card rejected">
  <h3>Rejected Loans</h3>
  <p>12</p>
</div>
    </div>
  );
}

export default StatsCards;