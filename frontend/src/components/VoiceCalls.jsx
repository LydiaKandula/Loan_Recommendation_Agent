import { useState, useEffect } from "react";
const API = "http://127.0.0.1:8000";

const STATUS_STYLE = {
  completed:     { bg:"rgba(34,197,94,0.12)",  color:"#4ade80", border:"rgba(34,197,94,0.25)"  },
  "in-progress": { bg:"rgba(37,99,235,0.12)",  color:"#60a5fa", border:"rgba(37,99,235,0.25)"  },
  initiated:     { bg:"rgba(245,158,11,0.12)", color:"#fbbf24", border:"rgba(245,158,11,0.25)" },
  ringing:       { bg:"rgba(245,158,11,0.12)", color:"#fbbf24", border:"rgba(245,158,11,0.25)" },
  answered:      { bg:"rgba(37,99,235,0.12)",  color:"#60a5fa", border:"rgba(37,99,235,0.25)"  },
  failed:        { bg:"rgba(239,68,68,0.12)",  color:"#f87171", border:"rgba(239,68,68,0.25)"  },
  "no-answer":   { bg:"rgba(239,68,68,0.12)",  color:"#f87171", border:"rgba(239,68,68,0.25)"  },
  busy:          { bg:"rgba(239,68,68,0.12)",  color:"#f87171", border:"rgba(239,68,68,0.25)"  },
};
const SENT_STYLE = { positive:"#4ade80", neutral:"#94a3b8", negative:"#f87171" };
const SENT_ICON  = { positive:"😊", neutral:"😐", negative:"😔" };

const CODES = [
  {code:"+91",label:"🇮🇳 +91"},{code:"+1",label:"🇺🇸 +1"},
  {code:"+44",label:"🇬🇧 +44"},{code:"+971",label:"🇦🇪 +971"},
  {code:"+65",label:"🇸🇬 +65"},{code:"+61",label:"🇦🇺 +61"},
];

export default function VoiceCalls({ authToken }) {
  const [logs,        setLogs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [calling,     setCalling]     = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [analysing,   setAnalysing]   = useState(null);
  const [callError,   setCallError]   = useState("");
  const [callSuccess, setCallSuccess] = useState("");
  const [form, setForm] = useState({
    countryCode:"+91", phone:"", userName:"", loanType:"personal", bank:"", emi:""
  });

  const headers = {
    "Content-Type":"application/json",
    ...(authToken ? { Authorization:`Bearer ${authToken}` } : {}),
  };

  const fetchLogs = () => {
    setLoading(true);
    fetch(`${API}/calls/logs`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(setLogs).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, []); // eslint-disable-line

  const initiateCall = async () => {
    setCallError(""); setCallSuccess("");
    if (!form.phone.trim()) { setCallError("Phone number is required"); return; }
    setCalling(true);
    try {
      const res = await fetch(`${API}/calls/initiate`, {
        method:"POST", headers,
        body: JSON.stringify({
          to_number: `${form.countryCode}${form.phone.trim()}`,
          user_name: form.userName || "there",
          loan_type: form.loanType,
          bank:      form.bank,
          emi:       parseFloat(form.emi) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Call failed");
      setCallSuccess(`✅ Call initiated! SID: ${data.callSid}`);
      setForm(p => ({...p, phone:"", userName:"", bank:"", emi:""}));
      setTimeout(fetchLogs, 2500);
    } catch(e) {
      setCallError(e.message);
    } finally { setCalling(false); }
  };

  const analyseCall = async (callSid) => {
    setAnalysing(callSid);
    try {
      const res  = await fetch(`${API}/calls/analytics/${callSid}`, { method:"POST", headers });
      const data = await res.json();
      setLogs(prev => prev.map(l => l.callSid === callSid
        ? {...l, aiSummary:data.summary, sentiment:data.sentiment} : l));
      if (selected?.callSid === callSid)
        setSelected(p => ({...p, aiSummary:data.summary, sentiment:data.sentiment}));
    } catch(e) { console.error(e); }
    finally { setAnalysing(null); }
  };

  // Refresh a single call log detail (to pick up latest transcript)
  const refreshSelected = async (callSid) => {
    try {
      const res  = await fetch(`${API}/calls/logs/${callSid}`, { headers });
      const data = await res.json();
      setSelected(data);
      setLogs(prev => prev.map(l => l.callSid === callSid ? data : l));
    } catch(e) { console.error(e); }
  };

  const fmt = (sec) => {
    if (!sec) return "—";
    const m = Math.floor(sec/60), s = sec%60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const statusBadge = (status) => {
    const s = STATUS_STYLE[status] || STATUS_STYLE.failed;
    return (
      <span style={{ padding:"3px 10px", borderRadius:999, fontSize:"0.73rem", fontWeight:600,
        background:s.bg, color:s.color, border:`1px solid ${s.border}`, whiteSpace:"nowrap" }}>
        {status || "unknown"}
      </span>
    );
  };

  const inputSx = {
    height:40, borderRadius:8, border:"1px solid rgba(255,255,255,0.1)",
    background:"rgba(255,255,255,0.04)", color:"#e2e8f0",
    padding:"0 12px", fontSize:"0.85rem", outline:"none", width:"100%",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* ── Initiate Call Panel ── */}
      <div style={{ background:"rgba(37,99,235,0.06)", border:"1px solid rgba(37,99,235,0.2)",
        borderRadius:14, padding:"20px 22px" }}>
        <h3 style={{ color:"#fff", fontSize:"0.95rem", fontWeight:700, marginBottom:4,
          display:"flex", alignItems:"center", gap:8 }}>
          <span>📞</span> Initiate Outbound Call
        </h3>
        <p style={{ color:"#64748b", fontSize:"0.8rem", marginBottom:18 }}>
          Place an AI-powered loan advisory call via Twilio
        </p>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12 }}>
          <div style={{ gridColumn:"span 2", display:"flex", flexDirection:"column", gap:5 }}>
            <label style={lblSx}>Phone Number *</label>
            <div style={{ display:"flex", gap:8 }}>
              <select value={form.countryCode} onChange={e=>setForm(p=>({...p,countryCode:e.target.value}))}
                style={{ ...inputSx, width:100, padding:"0 8px", flexShrink:0 }}>
                {CODES.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
              <input style={inputSx} placeholder="9876543210"
                value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}
                onKeyDown={e=>e.key==="Enter" && initiateCall()}/>
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={lblSx}>Customer Name</label>
            <input style={inputSx} placeholder="John" value={form.userName}
              onChange={e=>setForm(p=>({...p,userName:e.target.value}))}/>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={lblSx}>Loan Type</label>
            <select style={inputSx} value={form.loanType}
              onChange={e=>setForm(p=>({...p,loanType:e.target.value}))}>
              {["personal","home","car","business","education"].map(t=>(
                <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={lblSx}>Bank (optional)</label>
            <input style={inputSx} placeholder="HDFC" value={form.bank}
              onChange={e=>setForm(p=>({...p,bank:e.target.value}))}/>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={lblSx}>EMI ₹ (optional)</label>
            <input style={inputSx} type="number" placeholder="8200" value={form.emi}
              onChange={e=>setForm(p=>({...p,emi:e.target.value}))}/>
          </div>
        </div>

        {callError   && <p style={{ marginTop:12, fontSize:"0.8rem", color:"#fca5a5" }}>⚠️ {callError}</p>}
        {callSuccess && <p style={{ marginTop:12, fontSize:"0.8rem", color:"#4ade80" }}>{callSuccess}</p>}

        <button disabled={calling} onClick={initiateCall}
          style={{ marginTop:16, height:44, padding:"0 24px", borderRadius:10, border:"none",
            background: calling ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#2563eb,#1d4ed8)",
            color: calling ? "#64748b" : "#fff",
            fontWeight:700, fontSize:"0.88rem", cursor: calling ? "not-allowed" : "pointer",
            boxShadow: calling ? "none" : "0 4px 16px rgba(37,99,235,0.35)",
            display:"flex", alignItems:"center", gap:8, transition:"all 0.2s" }}>
          {calling ? <><Spin/> Initiating…</> : <><span>📲</span> Place Call</>}
        </button>
      </div>

      {/* ── Call Logs Table ── */}
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <h2 className="section-title" style={{ marginBottom:0 }}>Call History</h2>
          <button onClick={fetchLogs} style={{ height:32, padding:"0 14px", borderRadius:8,
            border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)",
            color:"#94a3b8", fontSize:"0.78rem", fontWeight:600, cursor:"pointer" }}>
            ↻ Refresh
          </button>
        </div>

        {loading ? <p className="loading-state">Loading call logs…</p> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>To Number</th><th>Status</th><th>Duration</th>
                  <th>Transcript</th><th>Sentiment</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign:"center", padding:"32px", color:"#64748b" }}>
                    No calls yet. Place your first call above.
                  </td></tr>
                ) : logs.map(l => (
                  <tr key={l.callSid}>
                    <td style={{ fontFamily:"var(--mono)", fontSize:"0.82rem" }}>{l.toNumber}</td>
                    <td>{statusBadge(l.status)}</td>
                    <td style={{ color:"#94a3b8" }}>{fmt(l.durationSec)}</td>
                    <td>
                      {l.transcript
                        ? <span style={{ fontSize:"0.75rem", color:"#60a5fa" }}>
                            ✓ {l.transcript.split("\n").length} lines
                          </span>
                        : <span style={{ fontSize:"0.75rem", color:"#475569" }}>—</span>
                      }
                    </td>
                    <td>
                      {l.sentiment
                        ? <span style={{ color:SENT_STYLE[l.sentiment]||"#94a3b8", fontSize:"0.82rem" }}>
                            {SENT_ICON[l.sentiment]} {l.sentiment}
                          </span>
                        : <span style={{ color:"#475569" }}>—</span>
                      }
                    </td>
                    <td style={{ color:"#64748b", fontSize:"0.78rem", whiteSpace:"nowrap" }}>
                      {l.createdAt ? new Date(l.createdAt).toLocaleString() : "—"}
                    </td>
                    <td>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => setSelected(l)} style={actionBtn("#2563eb")}>Detail</button>
                        <button disabled={analysing===l.callSid}
                          onClick={() => analyseCall(l.callSid)} style={actionBtn("#6366f1")}>
                          {analysing===l.callSid ? "…" : "Analyse"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selected && (
        <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.75)",
          backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          onClick={() => setSelected(null)}>
          <div style={{ background:"#0d1626", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:18, padding:"26px 24px", maxWidth:560, width:"100%",
            maxHeight:"88vh", overflowY:"auto",
            boxShadow:"0 24px 60px rgba(0,0,0,0.7)" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <h3 style={{ color:"#fff", fontWeight:700, fontSize:"1rem" }}>📞 Call Detail</h3>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => refreshSelected(selected.callSid)}
                  style={{ height:28, padding:"0 10px", borderRadius:6,
                    border:"1px solid rgba(255,255,255,0.1)",
                    background:"rgba(255,255,255,0.04)", color:"#94a3b8",
                    fontSize:"0.75rem", cursor:"pointer" }}>
                  ↻ Refresh
                </button>
                <button onClick={() => setSelected(null)}
                  style={{ width:28, height:28, borderRadius:6, border:"none",
                    background:"rgba(255,255,255,0.06)", color:"#94a3b8", cursor:"pointer" }}>
                  ✕
                </button>
              </div>
            </div>

            {/* Metadata rows */}
            {[
              ["Call SID",   selected.callSid,   true  ],
              ["To",         selected.toNumber         ],
              ["From",       selected.fromNumber        ],
              ["Status",     selected.status            ],
              ["Duration",   fmt(selected.durationSec)  ],
              ["Date",       selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "—"],
            ].map(([k,v,mono]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between",
                padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize:"0.76rem", color:"#64748b", fontWeight:600,
                  textTransform:"uppercase", letterSpacing:"0.04em" }}>{k}</span>
                <span style={{ fontSize:"0.83rem", color:"#e2e8f0",
                  fontFamily: mono ? "var(--mono)" : "inherit",
                  fontSize: mono ? "0.75rem" : "0.83rem" }}>{v || "—"}</span>
              </div>
            ))}

            {/* Sentiment */}
            {selected.sentiment && (
              <div style={{ display:"flex", justifyContent:"space-between",
                padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize:"0.76rem", color:"#64748b", fontWeight:600,
                  textTransform:"uppercase", letterSpacing:"0.04em" }}>Sentiment</span>
                <span style={{ color:SENT_STYLE[selected.sentiment]||"#94a3b8",
                  fontSize:"0.83rem", fontWeight:600 }}>
                  {SENT_ICON[selected.sentiment]} {selected.sentiment}
                </span>
              </div>
            )}

            {/* Transcript */}
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:"0.74rem", fontWeight:700, color:"#60a5fa",
                textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10 }}>
                Conversation Transcript
              </div>
              {selected.transcript ? (
                <div style={{ background:"rgba(255,255,255,0.03)",
                  border:"1px solid rgba(255,255,255,0.07)",
                  borderRadius:10, padding:"12px 14px",
                  maxHeight:200, overflowY:"auto" }}>
                  {selected.transcript.split("\n").map((line, i) => {
                    const isUser = line.startsWith("User:");
                    const isAI   = line.startsWith("AI:");
                    return (
                      <div key={i} style={{ marginBottom:8,
                        display:"flex", gap:8, alignItems:"flex-start" }}>
                        <span style={{ fontSize:"0.7rem", fontWeight:700, flexShrink:0,
                          color: isUser ? "#60a5fa" : isAI ? "#4ade80" : "#64748b",
                          minWidth:30 }}>
                          {isUser ? "👤" : isAI ? "🤖" : ""}
                        </span>
                        <span style={{ fontSize:"0.83rem", color:"#cbd5e1", lineHeight:1.5 }}>
                          {line.replace(/^(User:|AI:)\s*/,"").trim()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ background:"rgba(255,255,255,0.03)",
                  border:"1px solid rgba(255,255,255,0.07)",
                  borderRadius:10, padding:"14px 16px",
                  color:"#475569", fontSize:"0.82rem", textAlign:"center" }}>
                  No transcript yet. The transcript is recorded during the call.
                  Refresh after the call completes.
                </div>
              )}
            </div>

            {/* AI Summary */}
            {selected.aiSummary && (
              <div style={{ marginTop:14, background:"rgba(37,99,235,0.07)",
                border:"1px solid rgba(37,99,235,0.2)", borderRadius:10, padding:"14px 16px" }}>
                <div style={{ fontSize:"0.74rem", fontWeight:700, color:"#60a5fa",
                  textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>
                  AI Analysis
                </div>
                <p style={{ fontSize:"0.84rem", color:"#cbd5e1", lineHeight:1.6 }}>
                  {selected.aiSummary}
                </p>
              </div>
            )}

            {/* Recording */}
            {selected.recordingUrl && (
              <div style={{ marginTop:14 }}>
                <a href={selected.recordingUrl} target="_blank" rel="noreferrer"
                  style={{ color:"#60a5fa", fontSize:"0.82rem", display:"flex", alignItems:"center", gap:6 }}>
                  🎙 Listen to recording
                </a>
              </div>
            )}

            {/* Analyse button */}
            <button disabled={analysing === selected.callSid}
              onClick={() => analyseCall(selected.callSid)}
              style={{ marginTop:16, height:42, padding:"0 20px", borderRadius:9, border:"none",
                background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"#fff",
                fontWeight:700, fontSize:"0.84rem", cursor:"pointer",
                display:"flex", alignItems:"center", gap:8,
                opacity: analysing===selected.callSid ? 0.6 : 1 }}>
              {analysing === selected.callSid
                ? <><Spin/> Analysing…</>
                : <>{selected.aiSummary ? "↻ Re-analyse" : "✦ Generate AI Analysis"}</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const lblSx = { fontSize:"0.73rem", fontWeight:600, textTransform:"uppercase",
  letterSpacing:"0.05em", color:"#94a3b8" };

function actionBtn(c) {
  return { height:28, padding:"0 10px", borderRadius:6,
    border:`1px solid ${c}44`, background:`${c}18`,
    color:c, fontSize:"0.73rem", fontWeight:600, cursor:"pointer" };
}

function Spin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation:"spin 1s linear infinite", flexShrink:0 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </svg>
  );
}