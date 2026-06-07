import { useState, useRef, useEffect, useCallback } from "react";

const LANG_CFG = {
  en: { label:"English", flag:"🇬🇧", stt:"en-IN" },
  hi: { label:"हिंदी",   flag:"🇮🇳", stt:"hi-IN" },
  te: { label:"తెలుగు",  flag:"🏳",  stt:"te-IN" },
};
const CHIPS = {
  en: ["What's my EMI breakdown?","Am I eligible?","How to improve credit score?","Compare loan options"],
  hi: ["मेरी EMI कितनी होगी?","क्या मैं पात्र हूँ?","क्रेडिट स्कोर कैसे बढ़ाएं?","लोन विकल्प तुलना करें"],
  te: ["నా EMI ఎంత?","నేను అర్హుడినా?","క్రెడిట్ స్కోర్ పెంచడం ఎలా?","లోన్ ఆప్షన్లు చూపండి"],
};

// Preprocess text for browser TTS — same logic as backend _speak_text()
function speakPreprocess(text) {
  return (text || "")
    .replace(/[*#`]/g, "")
    // EMI → spaced letters (browser TTS speaks them clearly)
    .replace(/\bEMIs?\b/g, "E M I")
    // Hyphenated number-word: "12-month" → "12 month"
    .replace(/(\d)-([a-zA-Z])/g, "$1 $2")
    // Hyphenated word-number: "month-12" → "month 12"
    .replace(/([a-zA-Z])-(\d)/g, "$1 $2")
    // Currency
    .replace(/₹/g, " rupees ")
    .replace(/Rs\./g, " rupees ")
    // Percent
    .replace(/%/g, " percent")
    // Collapse spaces
    .replace(/\s+/g, " ").trim();
}

export default function ChatUI({ lastApplication, authToken, isActive }) {
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [isListening,  setIsListening]  = useState(false);
  const [isSpeaking,   setIsSpeaking]   = useState(false);
  const [wsStatus,     setWsStatus]     = useState("idle"); // idle|connecting|open|closed
  const [isTyping,     setIsTyping]     = useState(false);
  const [language,     setLanguage]     = useState("en");
  const [voiceGender,  setVoiceGender]  = useState("female");
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const wsRef         = useRef(null);
  const recRef        = useRef(null);
  const bottomRef     = useRef(null);
  const ctxSentRef    = useRef(false);
  const audioCtxRef   = useRef(null);
  const langRef       = useRef(language);
  const genderRef     = useRef(voiceGender);
  const voiceRef      = useRef(voiceEnabled);
  const isActiveRef   = useRef(isActive);   // ← track active without re-running effects

  useEffect(() => { langRef.current    = language;     }, [language]);
  useEffect(() => { genderRef.current  = voiceGender;  }, [voiceGender]);
  useEffect(() => { voiceRef.current   = voiceEnabled; }, [voiceEnabled]);
  useEffect(() => { isActiveRef.current = isActive;    }, [isActive]);

  /* ── Audio helpers ── */
  const stopAudio = useCallback(() => {
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const playAudio = useCallback((text, b64) => {
    // ✅ KEY FIX: never play audio when chat tab is not visible
    if (!voiceRef.current || !isActiveRef.current) return;
    stopAudio();

    if (b64) {
      try {
        const bin = atob(b64);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        ctx.decodeAudioData(buf.buffer, decoded => {
          if (!voiceRef.current || !isActiveRef.current) { ctx.close(); return; }
          const src = ctx.createBufferSource();
          src.buffer = decoded;
          src.connect(ctx.destination);
          src.onended = () => { setIsSpeaking(false); ctx.close(); audioCtxRef.current = null; };
          setIsSpeaking(true);
          src.start(0);
        }, () => { setIsSpeaking(false); ctx.close(); });
      } catch (e) { console.warn(e); setIsSpeaking(false); }
    } else {
      try {
        const u = new SpeechSynthesisUtterance(speakPreprocess(text));
        u.lang = LANG_CFG[langRef.current]?.stt || "en-IN"; u.rate = 0.9;
        u.onstart = () => setIsSpeaking(true);
        u.onend   = () => setIsSpeaking(false);
        u.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(u);
      } catch { setIsSpeaking(false); }
    }
  }, [stopAudio]);

  // Stop audio when tab switches away
  useEffect(() => {
    if (!isActive) stopAudio();
  }, [isActive, stopAudio]);

  /* ── WebSocket — only open when chat tab is active ── */
  const sendCtx = useCallback((ws, lang, gender) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      type: "context", user: lastApplication || null,
      language: lang, voiceGender: gender, token: authToken || null,
    }));
  }, [lastApplication, authToken]);

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsStatus("connecting");
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/chat");
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("open");
      if (!ctxSentRef.current) {
        ctxSentRef.current = true;
        sendCtx(ws, langRef.current, genderRef.current);
      }
    };
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === "audio") { playAudio("", d.audio); return; }
        setIsTyping(false);
        if (d.type === "greeting" || d.type === "message") addMsg("ai", d.text);
        else if (d.type === "error") addMsg("ai", `⚠️ ${d.text}`);
      } catch { setIsTyping(false); addMsg("ai", e.data); }
    };
    ws.onerror = () => setWsStatus("closed");
    ws.onclose = () => { setWsStatus("closed"); setIsTyping(false); };
  }, [sendCtx, playAudio]); // eslint-disable-line

  const addMsg = useCallback((role, text) =>
    setMessages(p => [...p, { id: Date.now() + Math.random(), role, text }]), []);

  // ✅ KEY FIX: only connect when this tab is active — prevents login-time audio
  useEffect(() => {
    if (!isActive) return;
    ctxSentRef.current = false;
    connectWS();
    // Do NOT close WS on tab switch (keep connection alive, just stop audio above)
    return () => {};
  }, [isActive]); // eslint-disable-line

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopAudio();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []); // eslint-disable-line

  // STT reinit on language change
  useEffect(() => {
    try { recRef.current?.stop(); } catch {}
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { recRef.current = null; return; }
      const r = new SR();
      r.continuous = false; r.lang = LANG_CFG[language]?.stt || "en-IN";
      r.interimResults = false; r.maxAlternatives = 1;
      recRef.current = r;
    } catch { recRef.current = null; }
  }, [language]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  /* ── Send ── */
  const sendMsg = useCallback((text) => {
    const t = (typeof text === "string" ? text : input).trim();
    if (!t) return;
    addMsg("user", t); setInput(""); stopAudio();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsTyping(true);
      wsRef.current.send(JSON.stringify({ type: "message", text: t }));
    } else {
      addMsg("ai", "⚠️ Not connected. Make sure uvicorn is running.");
    }
  }, [input, addMsg, stopAudio]);

  /* ── Voice input ── */
  const handleVoice = useCallback(() => {
    const r = recRef.current;
    if (!r) { alert("Speech recognition not supported. Try Chrome or Edge."); return; }
    if (isListening) { try { r.stop(); } catch {} setIsListening(false); return; }
    stopAudio();
    r.lang = LANG_CFG[language]?.stt || "en-IN";
    r.onresult = (e) => { setIsListening(false); sendMsg(e.results[0][0].transcript); };
    r.onerror  = (e) => {
      setIsListening(false);
      if (e.error === "not-allowed") alert("Microphone access denied.");
    };
    r.onend = () => setIsListening(false);
    try { r.start(); setIsListening(true); } catch { setIsListening(false); }
  }, [isListening, language, stopAudio, sendMsg]);

  /* ── Language / gender ── */
  const changeLang = (l) => {
    if (l === language) return;
    setLanguage(l); setMessages([]); setIsTyping(false); stopAudio();
    wsRef.current?.readyState === WebSocket.OPEN && wsRef.current.send(JSON.stringify({
      type: "context", user: lastApplication || null,
      language: l, voiceGender: genderRef.current, token: authToken || null,
    }));
  };
  const changeGender = (g) => {
    setVoiceGender(g); setMessages([]); setIsTyping(false); stopAudio();
    wsRef.current?.readyState === WebSocket.OPEN && wsRef.current.send(JSON.stringify({
      type: "context", user: lastApplication || null,
      language: langRef.current, voiceGender: g, token: authToken || null,
    }));
  };
  const reconnect = () => { ctxSentRef.current = false; connectWS(); };

  /* ── Render ── */
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:540, gap:10 }}>

      {/* Controls */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", flexShrink:0,
            background: wsStatus==="open" ? "#22c55e" : wsStatus==="connecting" ? "#f59e0b" : "#ef4444",
            boxShadow: wsStatus==="open" ? "0 0 8px rgba(34,197,94,0.8)" : "none" }}/>
          <span style={{ fontWeight:700, fontSize:"0.92rem", color:"#fff" }}>AI Chat Assistant</span>
          {lastApplication?.fullName && (
            <span style={{ fontSize:"0.72rem", fontWeight:600, color:"#93c5fd",
              background:"rgba(37,99,235,0.15)", border:"1px solid rgba(37,99,235,0.25)",
              borderRadius:999, padding:"2px 9px" }}>
              {lastApplication.fullName}
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap:5, alignItems:"center", flexWrap:"wrap" }}>
          {Object.entries(LANG_CFG).map(([c, cfg]) => (
            <button key={c} onClick={() => changeLang(c)} style={{
              height:29, padding:"0 9px", borderRadius:7, border:"none",
              fontSize:"0.73rem", fontWeight:600, cursor:"pointer",
              background: language===c ? "rgba(37,99,235,0.85)" : "rgba(255,255,255,0.05)",
              color: language===c ? "#fff" : "#64748b", transition:"all 0.15s" }}>
              {cfg.flag} {cfg.label}
            </button>
          ))}
          <div style={{ display:"flex", gap:2, background:"rgba(255,255,255,0.04)", borderRadius:7, padding:"2px 3px" }}>
            {["female","male"].map(g => (
              <button key={g} onClick={() => changeGender(g)} style={{
                height:25, padding:"0 9px", borderRadius:5, border:"none",
                fontSize:"0.72rem", fontWeight:600, cursor:"pointer",
                background: voiceGender===g ? (g==="female"?"rgba(236,72,153,0.65)":"rgba(59,130,246,0.65)") : "transparent",
                color: voiceGender===g ? "#fff" : "#64748b", transition:"all 0.15s" }}>
                {g==="female" ? "♀ Ritu" : "♂ Shubh"}
              </button>
            ))}
          </div>
          <button onClick={() => { setVoiceEnabled(v=>!v); if(isSpeaking) stopAudio(); }}
            style={chipBtn(voiceEnabled ? "#22c55e" : "#64748b")}>
            {voiceEnabled ? "🔊" : "🔇"}
          </button>
          {isSpeaking && <button onClick={stopAudio} style={chipBtn("#ef4444")}>■ Stop</button>}
          {wsStatus === "closed" && <button onClick={reconnect} style={chipBtn("#2563eb")}>↩ Reconnect</button>}
          {messages.length > 0 && <button onClick={() => { setMessages([]); stopAudio(); }} style={chipBtn("#475569")}>Clear</button>}
        </div>
      </div>

      {/* User context strip */}
      {lastApplication && (
        <div style={{ display:"flex", gap:14, flexWrap:"wrap",
          background:"rgba(37,99,235,0.07)", border:"1px solid rgba(37,99,235,0.18)",
          borderRadius:9, padding:"7px 12px", fontSize:"0.78rem" }}>
          <span style={{ color:"#93c5fd" }}>💼 {lastApplication.preferredLoanType}</span>
          <span style={{ color:"#93c5fd" }}>₹{Number(lastApplication.preferredAmount).toLocaleString("en-IN")}</span>
          {lastApplication.emi  && <span style={{ color:"#4ade80" }}>EMI ₹{Number(lastApplication.emi).toFixed(0)}/mo</span>}
          {lastApplication.bank && <span style={{ color:"#fbbf24" }}>🏦 {lastApplication.bank}</span>}
          <span style={{ color:"#64748b" }}>Score: {lastApplication.creditScore}</span>
        </div>
      )}

      {wsStatus === "closed" && (
        <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
          borderRadius:9, padding:"7px 14px", fontSize:"0.78rem", color:"#fca5a5" }}>
          ⚠️ Backend disconnected. Click <b>Reconnect</b> or restart uvicorn.
        </div>
      )}

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", background:"#080e1a", borderRadius:14,
        padding:"14px 12px", border:"1px solid rgba(255,255,255,0.05)",
        display:"flex", flexDirection:"column", gap:10, minHeight:260, maxHeight:400 }}>
        {messages.length === 0 && wsStatus === "connecting" && (
          <p style={{ color:"#475569", margin:"auto", textAlign:"center", fontSize:"0.82rem" }}>Connecting…</p>
        )}
        {messages.length === 0 && wsStatus === "open" && (
          <p style={{ color:"#475569", margin:"auto", textAlign:"center", fontSize:"0.82rem" }}>Waiting for AI greeting…</p>
        )}
        {messages.length === 0 && wsStatus === "idle" && (
          <p style={{ color:"#475569", margin:"auto", textAlign:"center", fontSize:"0.82rem" }}>
            Open this tab to start chatting with the AI.
          </p>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ display:"flex",
            justifyContent: m.role==="user" ? "flex-end" : "flex-start",
            alignItems:"flex-end", gap:7 }}>
            {m.role === "ai" && <Av l="🤖" b="#1e3a5f"/>}
            <div style={{ maxWidth:"76%", padding:"10px 14px", borderRadius:14,
              fontSize:"0.875rem", lineHeight:1.65, whiteSpace:"pre-wrap",
              background: m.role==="user" ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#172033",
              color: m.role==="user" ? "#fff" : "#dbeafe",
              borderBottomRightRadius: m.role==="user" ? 3 : 14,
              borderBottomLeftRadius:  m.role==="ai"   ? 3 : 14 }}>
              {m.text}
            </div>
            {m.role === "user" && <Av l="👤" b="#1e40af"/>}
          </div>
        ))}
        {isTyping && (
          <div style={{ display:"flex", alignItems:"flex-end", gap:7 }}>
            <Av l="🤖" b="#1e3a5f"/>
            <div style={{ background:"#172033", borderRadius:14, borderBottomLeftRadius:3,
              padding:"10px 16px", display:"flex", gap:5, alignItems:"center" }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#4b9cf5",
                  animation:"bnc 1.2s infinite", animationDelay:`${i*0.18}s` }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Quick chips */}
      {messages.length <= 1 && wsStatus === "open" && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {(CHIPS[language] || CHIPS.en).map(q => (
            <button key={q} onClick={() => sendMsg(q)} style={{
              background:"rgba(37,99,235,0.08)", border:"1px solid rgba(37,99,235,0.2)",
              borderRadius:999, padding:"5px 11px", color:"#93c5fd",
              fontSize:"0.74rem", cursor:"pointer", fontWeight:500, height:"auto" }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div style={{ display:"flex", gap:7, alignItems:"center" }}>
        <input type="text" value={input} disabled={wsStatus !== "open"}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMsg()}
          placeholder={
            wsStatus !== "open" ? "Open Chat Assistant tab to connect…" :
            language === "hi"   ? "यहाँ लिखें…" :
            language === "te"   ? "ఇక్కడ టైప్ చేయండి…" :
                                  "Ask anything about your loan…"
          }
          style={{ flex:1, height:44, borderRadius:11, padding:"0 15px",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)",
            color:"#fff", fontSize:"0.875rem", outline:"none",
            opacity: wsStatus !== "open" ? 0.45 : 1, maxWidth:"100%" }}/>

        <button onClick={handleVoice} disabled={wsStatus !== "open"}
          title={isListening ? "Listening… click to stop" : `Speak in ${LANG_CFG[language]?.label}`}
          style={{ width:44, height:44, borderRadius:"50%", border:"none", flexShrink:0,
            background: isListening ? "#ef4444" : "rgba(255,255,255,0.06)",
            color: isListening ? "#fff" : "#64748b",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor: wsStatus !== "open" ? "not-allowed" : "pointer",
            animation: isListening ? "pulse-ring 1s infinite" : "none", transition:"background 0.2s" }}>
          {isListening
            ? <span style={{ fontSize:13, fontWeight:700 }}>■</span>
            : <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
                <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"/>
                <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V20H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.08A7 7 0 0 0 19 11z"/>
              </svg>}
        </button>

        <button onClick={() => sendMsg()} disabled={wsStatus !== "open" || !input.trim()}
          style={{ height:44, padding:"0 18px", borderRadius:11, border:"none", flexShrink:0,
            background: wsStatus === "open" && input.trim() ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "rgba(255,255,255,0.05)",
            color: wsStatus === "open" && input.trim() ? "#fff" : "#4b5563",
            fontWeight:700, fontSize:"0.85rem",
            cursor: wsStatus !== "open" || !input.trim() ? "not-allowed" : "pointer", transition:"background 0.2s" }}>
          {language === "hi" ? "भेजें" : language === "te" ? "పంపు" : "Send"}
        </button>
      </div>

      {isListening && (
        <div style={{ textAlign:"center", fontSize:"0.73rem", color:"#f87171", animation:"pulse-opacity 1s infinite" }}>
          🎙 Listening in {LANG_CFG[language]?.label}… speak now, then pause
        </div>
      )}

      <style>{`
        @keyframes bnc{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-6px);opacity:1}}
        @keyframes pulse-ring{0%{box-shadow:0 0 0 0 rgba(239,68,68,.55)}70%{box-shadow:0 0 0 10px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}
        @keyframes pulse-opacity{0%,100%{opacity:1}50%{opacity:.5}}
      `}</style>
    </div>
  );
}

function Av({ l, b }) {
  return <span style={{ width:28, height:28, borderRadius:"50%", background:b,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:"0.7rem", flexShrink:0 }}>{l}</span>;
}
function chipBtn(c) {
  return { background:`${c}22`, border:`1px solid ${c}44`, color:c,
    borderRadius:7, padding:"3px 10px", fontSize:"0.73rem", fontWeight:600,
    cursor:"pointer", height:"auto" };
}