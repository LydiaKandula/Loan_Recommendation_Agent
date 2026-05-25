export default function StatsCards({ applications }) {
  const approved = applications.filter(a => a.status === "Approved").length;
  const pending  = applications.filter(a => a.status === "Under Review").length;
  const rejected = applications.filter(a => a.status === "Rejected").length;

  return (
    <div className="stats-row">
      {[
        { label:"Approved Loans",     value: approved, cls:"green" },
        { label:"Under Review",        value: pending,  cls:"amber" },
        { label:"Rejected",            value: rejected, cls:"red"   },
      ].map(s => (
        <div className="stat-card" key={s.label}>
          <div className="stat-label">{s.label}</div>
          <div className={`stat-number ${s.cls}`}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}