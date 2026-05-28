export default function SuccessModal({ data, onClose }) {
  const statusColor = data.status === "Approved" ? "#22c55e"
                    : data.status === "Under Review" ? "#f59e0b" : "#ef4444";

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    }}>
      <div style={{
        background:"#0d1626", border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:20, padding:"36px 32px", maxWidth:460, width:"100%",
        boxShadow:"0 32px 80px rgba(0,0,0,0.7)",
        animation:"slideUp 0.3s ease",
      }}>
        {/* Check icon */}
        <div style={{
          width:60, height:60, borderRadius:"50%",
          background:"rgba(37,99,235,0.15)", border:"1px solid rgba(37,99,235,0.3)",
          display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 20px", fontSize:28,
        }}>✅</div>

        <h2 style={{ textAlign:"center", color:"#fff", fontSize:"1.3rem",
          fontWeight:700, marginBottom:6, letterSpacing:"-0.02em" }}>
          Application Submitted!
        </h2>
        <p style={{ textAlign:"center", color:"#64748b", fontSize:"0.85rem", marginBottom:24 }}>
          We've processed your loan application, {data.name}.
        </p>

        {/* Details grid */}
        <div style={{
          background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:12, padding:"18px 20px", display:"flex", flexDirection:"column", gap:12,
          marginBottom:24,
        }}>
          <Row label="Loan Type"  value={data.loanType?.charAt(0).toUpperCase() + data.loanType?.slice(1)} />
          <Row label="Amount"     value={`₹${Number(data.amount).toLocaleString("en-IN")}`} />
          {data.bank && <Row label="Recommended Bank" value={data.bank} highlight />}
          {data.emi  && <Row label="Monthly EMI"      value={`₹${Number(data.emi).toFixed(0)}/month`} highlight />}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:"0.78rem", color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>Status</span>
            <span style={{
              padding:"3px 12px", borderRadius:999, fontSize:"0.78rem", fontWeight:700,
              background:`${statusColor}18`, color:statusColor, border:`1px solid ${statusColor}40`
            }}>{data.status}</span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{
            flex:1, height:44, borderRadius:11, border:"none",
            background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
            color:"#fff", fontWeight:700, fontSize:"0.88rem",
            cursor:"pointer", letterSpacing:"-0.01em",
            boxShadow:"0 4px 16px rgba(37,99,235,0.35)",
          }}>
            💬 Chat with AI Assistant
          </button>
        </div>

        <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <span style={{ fontSize:"0.78rem", color:"#64748b", fontWeight:600,
        textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</span>
      <span style={{ fontSize:"0.88rem", color: highlight ? "#4ade80" : "#e2e8f0",
        fontWeight: highlight ? 700 : 500 }}>{value}</span>
    </div>
  );
}