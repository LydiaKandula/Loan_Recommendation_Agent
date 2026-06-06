import { useState, useEffect } from "react";

const API = "http://127.0.0.1:8000";

const LANG_OPTIONS = [
  { code:"en", label:"🇬🇧 English" },
  { code:"hi", label:"🇮🇳 Hindi"   },
  { code:"te", label:"🏳 Telugu"   },
];

const STATUS_STYLE = {
  completed:    { bg:"rgba(34,197,94,0.12)",  color:"#4ade80", border:"rgba(34,197,94,0.25)"  },
  "in-progress":{ bg:"rgba(37,99,235,0.12)",  color:"#60a5fa", border:"rgba(37,99,235,0.25)"  },
  initiated:    { bg:"rgba(245,158,11,0.12)", color:"#fbbf24", border:"rgba(245,158,11,0.25)" },
  ringing:      { bg:"rgba(245,158,11,0.12)", color:"#fbbf24", border:"rgba(245,158,11,0.25)" },
  answered:     { bg:"rgba(37,99,235,0.12)",  color:"#60a5fa", border:"rgba(37,99,235,0.25)"  },
  failed:       { bg:"rgba(239,68,68,0.12)",  color:"#f87171", border:"rgba(239,68,68,0.25)"  },
  "no-answer":  { bg:"rgba(239,68,68,0.12)",  color:"#f87171", border:"rgba(239,68,68,0.25)"  },
  busy:         { bg:"rgba(239,68,68,0.12)",  color:"#f87171", border:"rgba(239,68,68,0.25)"  },
};
const SENT_COLOR = { positive:"#4ade80", neutral:"#94a3b8", negative:"#f87171" };
const SENT_ICON  = { positive:"😊", neutral:"😐", negative:"😔" };

const CODES = [
  {code:"+91",label:"🇮🇳 +91"},{code:"+1",label:"🇺🇸 +1"},
  {code:"+44",label:"🇬🇧 +44"},{code:"+971",label:"🇦🇪 +971"},
  {code:"+65",label:"🇸🇬 +65"},{code:"+61",label:"🇦🇺 +61"},
];

// ── Loan profile panel shown above the call form ──────────────────────────────
function LoanProfileBanner({ app }) {
  if (!app) return null;
  return (
    <div style={{ background:"rgba(34,197,94,0.07)", border:"1px solid rgba(34,197,94,0.2)",
      borderRadius:12, padding:"12px 16px", marginBottom:16,
      display:"flex", flexWrap:"wrap", gap:14, alignItems:"center" }}>
      <span style={{ fontSize:"0.74rem", fontWeight:700, color:"#4ade80",
        textTransform:"uppercase", letterSpacing:"0.05em" }}>
        ✓ Loan profile loaded
      </span>
      {app.fullName      && <Chip label="Name"    value={app.fullName} />}
      {app.preferredLoanType && <Chip label="Loan"  value={app.preferredLoanType} />}
      {app.preferredAmount   && <Chip label="Amount" value={`₹${Number(app.preferredAmount).toLocaleString("en-IN")}`} />}
      {app.bank          && <Chip label="Bank"    value={app.bank} />}
      {app.emi           && <Chip label="EMI"     value={`₹${Number(app.emi).toFixed(0)}/mo`} />}
      {app.creditScore   && <Chip label="Score"   value={app.creditScore} />}
    </div>
  );
}
function Chip({ label, value }) {
  return (
    <span style={{ fontSize:"0.78rem", color:"#cbd5e1" }}>
      <span style={{ color:"#64748b" }}>{label}: </span>{value}
    </span>
  );
}

export default function VoiceCalls({ authToken, lastApplication, isActive }) {
  const [logs,        setLogs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [calling,     setCalling]     = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [analysing,   setAnalysing]   = useState(null);
  const [callError,   setCallError]   = useState("");
  const [callSuccess, setCallSuccess] = useState("");
  const [language,    setLanguage]    = useState("en");

  // Phone form — other loan fields auto-filled from lastApplication
  const [form, setForm] = useState({ countryCode:"+91", phone:"" });

  // Build headers fresh on every call so token is never stale
  const getHeaders = () => ({
    "Content-Type":"application/json",
    ...(authToken ? { Authorization:`Bearer ${authToken}` } : {}),
  });
  const headers = getHeaders();

  const fetchLogs = () => {
    setLoading(true);
    fetch(`${API}/calls/logs`, { headers: getHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(setLogs).catch(console.error)
      .finally(() => setLoading(false));
  };

  // Refetch every time this tab becomes active so recent calls always show
  useEffect(() => {
    if (isActive) fetchLogs();
  }, [isActive]); // eslint-disable-line

  // Also fetch on first mount (isActive may already be true)
  useEffect(() => { fetchLogs(); }, []); // eslint-disable-line

  const initiateCall = async () => {
    setCallError(""); setCallSuccess("");
    if (!form.phone.trim()) { setCallError("Phone number is required"); return; }

    const app = lastApplication || {};
    setCalling(true);
    try {
      const res = await fetch(`${API}/calls/initiate`, {
        method:"POST", headers: getHeaders(),
        body: JSON.stringify({
          to_number:      `${form.countryCode}${form.phone.trim()}`,
          user_name:      app.fullName      || "there",
          loan_type:      app.preferredLoanType || "loan",
          bank:           app.bank          || "",
          emi:            parseFloat(app.emi) || 0,
          // Full profile for AI context during the call
          loan_amount:    parseFloat(app.preferredAmount) || 0,
          loan_tenure:    parseInt(app.preferredTenure)   || 0,
          monthly_income: parseFloat(app.monthlyIncome)   || 0,
          credit_score:   parseInt(app.creditScore)       || 0,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Call failed");
      setCallSuccess(`✅ Call initiated! The AI advisor will speak using your loan details.`);
      setForm(p => ({...p, phone:""}));
      setTimeout(fetchLogs, 2500);
    } catch(e) {
      setCallError(e.message);
    } finally { setCalling(false); }
  };

  const analyseCall = async (callSid) => {
    setAnalysing(callSid);
    try {
      const res  = await fetch(`${API}/calls/analytics/${callSid}`,{ method:"POST", headers: getHeaders() });
      const data = await res.json();
      setLogs(prev => prev.map(l => l.callSid===callSid
        ? {...l, aiSummary:data.summary, sentiment:data.sentiment} : l));
      if (selected?.callSid === callSid)
        setSelected(p => ({...p, aiSummary:data.summary, sentiment:data.sentiment}));
    } catch(e) { console.error(e); }
    finally { setAnalysing(null); }
  };

  const refreshSelected = async (callSid) => {
    try {
      const res  = await fetch(`${API}/calls/logs/${callSid}`, { headers: getHeaders() });
      const data = await res.json();
      setSelected(data);
      setLogs(prev => prev.map(l => l.callSid===callSid ? data : l));
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
      <span style={{ padding:"3px 10px", borderRadius:999, fontSize:"0.73rem",
        fontWeight:600, background:s.bg, color:s.color, border:`1px solid ${s.border}`,
        whiteSpace:"nowrap" }}>
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

      {/* ── Loan profile banner ── */}
      <LoanProfileBanner app={lastApplication} />

      {/* ── Initiate call ── */}
      <div style={{ background:"rgba(37,99,235,0.06)", border:"1px solid rgba(37,99,235,0.2)",
        borderRadius:14, padding:"20px 22px" }}>
        <h3 style={{ color:"#fff", fontSize:"0.95rem", fontWeight:700, marginBottom:4,
          display:"flex", alignItems:"center", gap:8 }}>
          <span>📞</span> Initiate Outbound Call
        </h3>
        <p style={{ color:"#64748b", fontSize:"0.8rem", marginBottom:18 }}>
          The AI assistant will use the loan application details automatically.
          {!lastApplication && (
            <span style={{ color:"#f59e0b" }}> Submit a Loan Form first to load loan context.</span>
          )}
        </p>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12 }}>
          {/* Phone */}
          <div style={{ gridColumn:"span 2", display:"flex", flexDirection:"column", gap:5 }}>
            <label style={lblSx}>Phone Number *</label>
            <div style={{ display:"flex", gap:8 }}>
              <select value={form.countryCode}
                onChange={e=>setForm(p=>({...p,countryCode:e.target.value}))}
                style={{ ...inputSx, width:106, padding:"0 8px", flexShrink:0 }}>
                {CODES.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
              <input style={inputSx} placeholder="9876543210"
                value={form.phone}
                onChange={e=>setForm(p=>({...p,phone:e.target.value}))}
                onKeyDown={e=>e.key==="Enter" && initiateCall()}/>
            </div>
          </div>

          {/* Language */}
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={lblSx}>Call Language</label>
            <select style={inputSx} value={language} onChange={e=>setLanguage(e.target.value)}>
              {LANG_OPTIONS.map(l=>(
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        {callError   && <p style={{ marginTop:12, fontSize:"0.8rem", color:"#fca5a5" }}>⚠️ {callError}</p>}
        {callSuccess && <p style={{ marginTop:12, fontSize:"0.8rem", color:"#4ade80" }}>{callSuccess}</p>}

        <button disabled={calling} onClick={initiateCall} style={{
          marginTop:16, height:44, padding:"0 24px", borderRadius:10, border:"none",
          background: calling ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#2563eb,#1d4ed8)",
          color: calling ? "#64748b" : "#fff",
          fontWeight:700, fontSize:"0.88rem", cursor: calling ? "not-allowed" : "pointer",
          boxShadow: calling ? "none" : "0 4px 16px rgba(37,99,235,0.35)",
          display:"flex", alignItems:"center", gap:8, transition:"all 0.2s" }}>
          {calling ? <><Spin/> Calling…</> : <><span>📲</span> Place Call</>}
        </button>
      </div>

      {/* ── Call logs table ── */}
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
                  <th>To</th><th>Loan</th><th>Status</th>
                  <th>Duration</th><th>Sentiment</th><th>Date</th><th>Actions</th>
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
                    <td style={{ color:"#94a3b8", fontSize:"0.82rem", textTransform:"capitalize" }}>
                      {l.loanType || "—"}
                    </td>
                    <td>{statusBadge(l.status)}</td>
                    <td style={{ color:"#94a3b8" }}>{fmt(l.durationSec)}</td>
                    <td>
                      {l.sentiment
                        ? <span style={{ color:SENT_COLOR[l.sentiment]||"#94a3b8", fontSize:"0.82rem" }}>
                            {SENT_ICON[l.sentiment]} {l.sentiment}
                          </span>
                        : <span style={{ color:"#475569" }}>—</span>}
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

      {/* ── Detail modal ── */}
      {selected && (
        <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.75)",
          backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          onClick={() => setSelected(null)}>
          <div style={{ background:"#0d1626", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:18, padding:"26px 24px", maxWidth:560, width:"100%",
            maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 60px rgba(0,0,0,0.7)" }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <h3 style={{ color:"#fff", fontWeight:700, fontSize:"1rem" }}>📞 Call Detail</h3>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => refreshSelected(selected.callSid)}
                  style={{ height:28, padding:"0 10px", borderRadius:6,
                    border:"1px solid rgba(255,255,255,0.1)",
                    background:"rgba(255,255,255,0.04)", color:"#94a3b8",
                    fontSize:"0.75rem", cursor:"pointer" }}>↻ Refresh</button>
                <button onClick={() => setSelected(null)}
                  style={{ width:28, height:28, borderRadius:6, border:"none",
                    background:"rgba(255,255,255,0.06)", color:"#94a3b8", cursor:"pointer" }}>✕</button>
              </div>
            </div>

            {/* Metadata */}
            {[
              ["Call SID",   selected.callSid,   true  ],
              ["To",         selected.toNumber         ],
              ["Status",     selected.status           ],
              ["Duration",   fmt(selected.durationSec) ],
              ["Loan Type",  selected.loanType         ],
              ["Bank",       selected.recommendedBank  ],
              ["EMI",        selected.recommendedEmi ? `₹${Number(selected.recommendedEmi).toFixed(0)}/mo` : null],
              ["Date",       selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "—"],
            ].map(([k,v,mono]) => v ? (
              <div key={k} style={{ display:"flex", justifyContent:"space-between",
                padding:"9px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize:"0.76rem", color:"#64748b", fontWeight:600,
                  textTransform:"uppercase", letterSpacing:"0.04em" }}>{k}</span>
                <span style={{ fontSize: mono?"0.75rem":"0.83rem", color:"#e2e8f0",
                  fontFamily: mono?"var(--mono)":"inherit" }}>{v}</span>
              </div>
            ) : null)}

            {selected.sentiment && (
              <div style={{ display:"flex", justifyContent:"space-between",
                padding:"9px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize:"0.76rem", color:"#64748b", fontWeight:600,
                  textTransform:"uppercase", letterSpacing:"0.04em" }}>Sentiment</span>
                <span style={{ color:SENT_COLOR[selected.sentiment]||"#94a3b8",
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
                  border:"1px solid rgba(255,255,255,0.07)", borderRadius:10,
                  padding:"12px 14px", maxHeight:220, overflowY:"auto" }}>
                  {selected.transcript.split("\n").filter(Boolean).map((line, i) => {
                    const isUser = line.startsWith("User:");
                    const isAI   = line.startsWith("AI:");
                    return (
                      <div key={i} style={{ marginBottom:10, display:"flex", gap:9, alignItems:"flex-start" }}>
                        <span style={{ fontSize:"0.75rem", fontWeight:700, flexShrink:0,
                          color: isUser?"#60a5fa":isAI?"#4ade80":"#64748b", minWidth:28 }}>
                          {isUser?"👤":isAI?"🤖":""}
                        </span>
                        <div style={{ flex:1 }}>
                          <span style={{ fontSize:"0.7rem", fontWeight:700,
                            color: isUser?"#60a5fa":isAI?"#4ade80":"#64748b", marginRight:6 }}>
                            {isUser?"You:":isAI?"AI:":""}
                          </span>
                          <span style={{ fontSize:"0.83rem", color:"#cbd5e1", lineHeight:1.5 }}>
                            {line.replace(/^(User:|AI:)\s*/,"").trim()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ background:"rgba(255,255,255,0.03)",
                  border:"1px solid rgba(255,255,255,0.07)", borderRadius:10,
                  padding:"14px 16px", color:"#475569", fontSize:"0.82rem", textAlign:"center" }}>
                  No transcript yet. Refresh after the call completes.
                </div>
              )}
            </div>

            {/* AI summary */}
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

            {selected.recordingUrl && (
              <div style={{ marginTop:14 }}>
                <a href={selected.recordingUrl} target="_blank" rel="noreferrer"
                  style={{ color:"#60a5fa", fontSize:"0.82rem" }}>
                  🎙 Listen to recording
                </a>
              </div>
            )}

            <button disabled={analysing===selected.callSid}
              onClick={() => analyseCall(selected.callSid)}
              style={{ marginTop:16, height:42, padding:"0 20px", borderRadius:9, border:"none",
                background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"#fff",
                fontWeight:700, fontSize:"0.84rem", cursor:"pointer",
                display:"flex", alignItems:"center", gap:8,
                opacity: analysing===selected.callSid ? 0.6 : 1 }}>
              {analysing===selected.callSid
                ? <><Spin/> Analysing…</>
                : <>{selected.aiSummary ? "↻ Re-analyse" : "✦ Generate AI Analysis"}</>}
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