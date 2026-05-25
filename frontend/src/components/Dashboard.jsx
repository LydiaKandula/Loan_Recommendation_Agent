export default function Dashboard({ applications }) {
  return (
    <div>
      <h2 className="section-title">Loan Applications</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Applicant</th><th>Loan Type</th><th>Amount</th>
              <th>Bank</th><th>EMI / mo</th><th>Submitted</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr><td colSpan="7" style={{textAlign:"center",padding:"32px",color:"#64748b"}}>
                No applications yet. Submit a Loan Form to get started.
              </td></tr>
            ) : applications.map(a => (
              <tr key={a.id}>
                <td style={{fontWeight:600}}>{a.fullName}</td>
                <td style={{textTransform:"capitalize"}}>{a.preferredLoanType}</td>
                <td>₹{Number(a.preferredAmount).toLocaleString("en-IN")}</td>
                <td>{a.bank || <span style={{color:"#475569"}}>—</span>}</td>
                <td>{a.emi ? `₹${Number(a.emi).toFixed(0)}` : <span style={{color:"#475569"}}>—</span>}</td>
                <td style={{color:"#64748b",fontSize:"0.8rem"}}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—"}</td>
                <td>
                  <span className={
                    a.status==="Approved"    ? "badge badge-green" :
                    a.status==="Under Review"? "badge badge-amber" :
                                               "badge badge-red"
                  }>{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}