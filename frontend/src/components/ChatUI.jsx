import { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = "http://127.0.0.1:8000";

const LANG_CONFIG = {
  en: { label: "English", flag: "🇬🇧", stt: "en-IN" },
  hi: { label: "हिंदी",   flag: "🇮🇳", stt: "hi-IN" },
  te: { label: "తెలుగు",  flag: "🏳",  stt: "te-IN" },
};

// ── One best voice per language per gender ────────────────────────────────────
// Chosen for naturalness with Sarvam Bulbul v3:
//   Female: "priya" (warm, clear, works all 3 languages)
//   Male:   "aryan" → "aditya" (neutral Indian accent, all languages)
// "shubh" is the v3 default male; "priya" is consistently rated best female.
const BEST_VOICE = {
  en: { female: "priya",  male: "aditya" },
  hi: { female: "priya",  male: "aditya" },
  te: { female: "priya",  male: "aditya" },
};

const CHIPS = {
  en: ["What's my EMI breakdown?", "Am I eligible?", "How to improve credit score?", "Compare loan options"],
  hi: ["मेरी EMI कितनी होगी?", "क्या मैं पात्र हूँ?", "क्रेडिट स्कोर कैसे बढ़ाएं?", "लोन विकल्प तुलना करें"],
  te: ["నా EMI ఎంత?", "నేను అర్హుడినా?", "క్రెడిట్ స్కోర్ పెంచడం ఎలా?", "లోన్ ఆప్షన్లు చూపండి"],
};

function ChatUI({ lastApplication, authUser }) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [messages,     setMessages]    = useState([]);
  const [input,        setInput]       = useState("");
  const [isListening,  setIsListening] = useState(false);
  const [isSpeaking,   setIsSpeaking]  = useState(false);
  const [wsStatus,     setWsStatus]    = useState("connecting");
  const [isTyping,     setIsTyping]    = useState(false);
  const [language,     setLanguage]    = useState("en");
  const [voiceGender,  setVoiceGender] = useState("female");
  const [voiceEnabled, setVoiceEnabled]= useState(true);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const socketRef      = useRef(null);
  const recognitionRef = useRef(null);
  const bottomRef      = useRef(null);
  const contextSentRef = useRef(false);
  const pageActiveRef  = useRef(true);
  const audioCtxRef    = useRef(null);
  const langRef        = useRef(language);
  const genderRef      = useRef(voiceGender);
  const voiceEnRef     = useRef(voiceEnabled);

  useEffect(() => { langRef.current   = language;      }, [language]);
  useEffect(() => { genderRef.current = voiceGender;   }, [voiceGender]);
  useEffect(() => { voiceEnRef.current= voiceEnabled;  }, [voiceEnabled]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addMessage = useCallback((role, text) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role, text }]);
  }, []);

  const stopSpeaking = useCallback(() => {
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  // Play Sarvam base64 WAV; fallback to browser TTS
  const speak = useCallback((text, audioB64) => {
    if (!voiceEnRef.current || !pageActiveRef.current) return;
    stopSpeaking();

    if (audioB64) {
      try {
        const binary = atob(audioB64);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        ctx.decodeAudioData(bytes.buffer, buf => {
          if (!voiceEnRef.current || !pageActiveRef.current) { ctx.close(); return; }
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.onended = () => { setIsSpeaking(false); ctx.close(); audioCtxRef.current = null; };
          setIsSpeaking(true);
          src.start(0);
        }, () => { setIsSpeaking(false); ctx.close(); });
      } catch { setIsSpeaking(false); }
    } else {
      // Browser TTS fallback (no Sarvam key)
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang  = LANG_CONFIG[langRef.current]?.stt || "en-IN";
        u.rate  = 0.95;
        const voices = window.speechSynthesis.getVoices();
        const native = voices.find(v => v.lang.startsWith(u.lang.split("-")[0]));
        if (native) u.voice = native;
        u.onstart = () => setIsSpeaking(true);
        u.onend   = () => setIsSpeaking(false);
        u.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(u);
      } catch { setIsSpeaking(false); }
    }
  }, [stopSpeaking]);

  // ── Page visibility ───────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => { pageActiveRef.current = !document.hidden; if (document.hidden) stopSpeaking(); };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, [stopSpeaking]);

  // ── Build context payload ─────────────────────────────────────────────────
  const buildContext = useCallback((lang, gender) => ({
    type:         "context",
    user:         lastApplication || null,
    language:     lang,
    voiceGender:  gender,
    voiceSpeaker: BEST_VOICE[lang]?.[gender] || "priya",
  }), [lastApplication]);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    setWsStatus("connecting");
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/chat");
    socketRef.current = ws;

    ws.onopen = () => {
      setWsStatus("open");
      if (!contextSentRef.current) {
        contextSentRef.current = true;
        ws.send(JSON.stringify(buildContext(langRef.current, genderRef.current)));
      }
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setIsTyping(false);
        if (data.type === "greeting" || data.type === "message") {
          addMessage("ai", data.text);
          speak(data.text, data.audio || null);
        } else if (data.type === "error") {
          addMessage("ai", `⚠️ ${data.text}`);
        }
      } catch { setIsTyping(false); addMessage("ai", event.data); }
    };
    ws.onerror = () => setWsStatus("closed");
    ws.onclose = () => { setWsStatus("closed"); setIsTyping(false); };
  }, [buildContext, addMessage, speak]);

  useEffect(() => {
    contextSentRef.current = false;
    connectWS();
    return () => { stopSpeaking(); socketRef.current?.close(); socketRef.current = null; };
  }, [connectWS, stopSpeaking]);

  // Re-send context when language or gender changes
  const sendContext = (lang, gender) => {
    setMessages([]); setIsTyping(false); stopSpeaking();
    const payload = buildContext(lang, gender);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    } else { contextSentRef.current = false; connectWS(); }
  };

  // ── Speech Recognition ────────────────────────────────────────────────────
  useEffect(() => {
    try { recognitionRef.current?.stop(); } catch {}
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { recognitionRef.current = null; return; }
      const r = new SR();
      r.continuous = false; r.lang = LANG_CONFIG[language]?.stt || "en-IN";
      r.interimResults = false; r.maxAlternatives = 1;
      recognitionRef.current = r;
    } catch { recognitionRef.current = null; }
  }, [language]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback((text) => {
    const trimmed = (typeof text === "string" ? text : input).trim();
    if (!trimmed) return;
    addMessage("user", trimmed);
    setInput("");
    stopSpeaking();
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      setIsTyping(true);
      socketRef.current.send(JSON.stringify({ type: "message", text: trimmed }));
    } else {
      addMessage("ai", "⚠️ Not connected. Make sure uvicorn is running on port 8000.");
    }
  }, [input, addMessage, stopSpeaking]);

  // ── Voice input ───────────────────────────────────────────────────────────
  const handleVoice = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) { alert("Speech recognition not supported. Try Chrome or Edge."); return; }
    if (isListening) { try { r.stop(); } catch {} setIsListening(false); return; }
    stopSpeaking();
    r.lang     = LANG_CONFIG[language]?.stt || "en-IN";
    r.onresult = (e) => { setIsListening(false); sendMessage(e.results[0][0].transcript); };
    r.onerror  = (e) => { setIsListening(false); if (e.error === "not-allowed") alert("Microphone access denied. Allow it in browser settings."); };
    r.onend    = () => setIsListening(false);
    try { r.start(); setIsListening(true); } catch { setIsListening(false); }
  }, [isListening, language, stopSpeaking, sendMessage]);

  // ── Language change ───────────────────────────────────────────────────────
  const handleLanguageChange = (l) => {
    if (l === language) return;
    setLanguage(l);
    sendContext(l, voiceGender);
  };

  // ── Gender change ─────────────────────────────────────────────────────────
  const handleGenderChange = (g) => {
    if (g === voiceGender) return;
    setVoiceGender(g);
    sendContext(language, g);
  };

  const activeVoice = BEST_VOICE[language]?.[voiceGender] || "priya";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:560 }}>

      {/* ── TOP BAR ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <span style={{ width:9, height:9, borderRadius:"50%", display:"inline-block", flexShrink:0,
            background: wsStatus==="open" ? "#22c55e" : wsStatus==="connecting" ? "#f59e0b" : "#ef4444",
            boxShadow: wsStatus==="open" ? "0 0 8px rgba(34,197,94,0.8)" : "none" }} />
          <span style={{ color:"#fff", fontWeight:700, fontSize:"0.96rem" }}>Loan AI Assistant</span>
          {authUser && (
            <span style={{ fontSize:"0.74rem", color:"#64748b" }}>
              — {authUser.fullName || authUser.username}
            </span>
          )}
        </div>

        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          {/* Language */}
          <div style={{ display:"flex", gap:3 }}>
            {Object.entries(LANG_CONFIG).map(([code, cfg]) => (
              <button key={code} onClick={() => handleLanguageChange(code)}
                style={{ height:30, padding:"0 9px", borderRadius:8, border:"none",
                  fontSize:"0.74rem", fontWeight:600, cursor:"pointer",
                  background: language===code ? "rgba(37,99,235,0.85)" : "rgba(255,255,255,0.06)",
                  color: language===code ? "#fff" : "#94a3b8", transition:"all 0.15s" }}>
                {cfg.flag} {cfg.label}
              </button>
            ))}
          </div>

          {/* Gender toggle */}
          <div style={{ display:"flex", gap:2, background:"rgba(255,255,255,0.05)", borderRadius:8, padding:"2px 3px" }}>
            {["female","male"].map(g => (
              <button key={g} onClick={() => handleGenderChange(g)}
                title={`${g === "female" ? "♀ Female" : "♂ Male"} voice (${activeVoice})`}
                style={{ height:26, padding:"0 10px", borderRadius:6, border:"none",
                  fontSize:"0.72rem", fontWeight:600, cursor:"pointer",
                  background: voiceGender===g ? (g==="female" ? "rgba(236,72,153,0.65)" : "rgba(59,130,246,0.65)") : "transparent",
                  color: voiceGender===g ? "#fff" : "#64748b", transition:"all 0.15s" }}>
                {g === "female" ? "♀" : "♂"}
              </button>
            ))}
            <span style={{ fontSize:"0.7rem", color:"#475569", display:"flex", alignItems:"center", paddingRight:6, paddingLeft:2 }}>
              {activeVoice}
            </span>
          </div>

          {/* Voice mute */}
          <button onClick={() => { setVoiceEnabled(v => !v); if(isSpeaking) stopSpeaking(); }}
            style={chip(voiceEnabled ? "#22c55e" : "#64748b")} title={voiceEnabled ? "Mute" : "Unmute"}>
            {voiceEnabled ? "🔊" : "🔇"}
          </button>

          {isSpeaking && <button onClick={stopSpeaking} style={chip("#ef4444")}>■ Stop</button>}
          {wsStatus==="closed" && (
            <button onClick={() => { contextSentRef.current=false; connectWS(); }} style={chip("#2563eb")}>↩ Reconnect</button>
          )}
          {messages.length > 0 && (
            <button onClick={() => { setMessages([]); stopSpeaking(); }} style={chip("#475569")}>Clear</button>
          )}
        </div>
      </div>

      {/* Loan context banner */}
      {lastApplication && (
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center",
          background:"rgba(37,99,235,0.07)", border:"1px solid rgba(37,99,235,0.18)",
          borderRadius:10, padding:"7px 14px", marginBottom:8, fontSize:"0.78rem" }}>
          <span style={{ color:"#93c5fd" }}>💼 {lastApplication.preferredLoanType}</span>
          <span style={{ color:"#93c5fd" }}>₹{Number(lastApplication.preferredAmount).toLocaleString("en-IN")}</span>
          {lastApplication.emi  && <span style={{ color:"#4ade80" }}>EMI ₹{Number(lastApplication.emi).toFixed(0)}/mo</span>}
          {lastApplication.bank && <span style={{ color:"#fbbf24" }}>🏦 {lastApplication.bank}</span>}
          <span style={{ color:"#64748b" }}>Score: {lastApplication.creditScore}</span>
        </div>
      )}

      {wsStatus==="closed" && (
        <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
          borderRadius:10, padding:"7px 14px", marginBottom:8, fontSize:"0.78rem", color:"#fca5a5" }}>
          ⚠️ Disconnected from backend. Click <b>Reconnect</b> or restart uvicorn.
        </div>
      )}

      {/* ── MESSAGES ── */}
      <div style={{ flex:1, overflowY:"auto", background:"#080e1a", borderRadius:16,
        padding:"14px 12px", border:"1px solid rgba(255,255,255,0.05)",
        display:"flex", flexDirection:"column", gap:10, minHeight:280, maxHeight:420 }}>

        {messages.length===0 && wsStatus==="connecting" && (
          <p style={{ color:"#475569", margin:"auto", textAlign:"center", fontSize:"0.82rem" }}>Connecting…</p>
        )}
        {messages.length===0 && wsStatus==="open" && (
          <p style={{ color:"#475569", margin:"auto", textAlign:"center", fontSize:"0.82rem" }}>Waiting for AI greeting…</p>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{ display:"flex",
            justifyContent: msg.role==="user" ? "flex-end" : "flex-start",
            alignItems:"flex-end", gap:7 }}>
            {msg.role==="ai" && <Av bg="#1e3a5f">🤖</Av>}
            <div style={{ maxWidth:"76%", padding:"10px 14px", borderRadius:14,
              fontSize:"0.87rem", lineHeight:1.65,
              background: msg.role==="user" ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#172033",
              color: msg.role==="user" ? "#fff" : "#dbeafe",
              borderBottomRightRadius: msg.role==="user" ? 3 : 14,
              borderBottomLeftRadius:  msg.role==="ai"   ? 3 : 14,
              whiteSpace:"pre-wrap" }}>
              {msg.text}
            </div>
            {msg.role==="user" && <Av bg="#1e40af">👤</Av>}
          </div>
        ))}

        {isTyping && (
          <div style={{ display:"flex", alignItems:"flex-end", gap:7 }}>
            <Av bg="#1e3a5f">🤖</Av>
            <div style={{ background:"#172033", borderRadius:14, borderBottomLeftRadius:3,
              padding:"10px 16px", display:"flex", gap:5, alignItems:"center" }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#4b9cf5",
                  animation:"bounce 1.2s infinite", animationDelay:`${i*0.18}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      {messages.length<=1 && wsStatus==="open" && (
        <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
          {(CHIPS[language]||CHIPS.en).map(q => (
            <button key={q} onClick={() => sendMessage(q)}
              style={{ background:"rgba(37,99,235,0.08)", border:"1px solid rgba(37,99,235,0.2)",
                borderRadius:999, padding:"5px 11px", color:"#93c5fd",
                fontSize:"0.74rem", cursor:"pointer", fontWeight:500, height:"auto" }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* ── INPUT ROW ── */}
      <div style={{ display:"flex", gap:7, marginTop:9, alignItems:"center" }}>
        <input type="text" value={input} disabled={wsStatus!=="open"}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==="Enter" && !e.shiftKey && sendMessage()}
          placeholder={
            wsStatus!=="open" ? "Waiting for connection…" :
            language==="hi"   ? "यहाँ लिखें…" :
            language==="te"   ? "ఇక్కడ టైప్ చేయండి…" :
                                "Ask anything about your loan…"
          }
          style={{ flex:1, height:44, borderRadius:12, padding:"0 16px",
            background:"#0f172a", border:"1px solid rgba(255,255,255,0.09)",
            color:"#fff", fontSize:"0.88rem", outline:"none",
            opacity: wsStatus!=="open" ? 0.45 : 1, maxWidth:"100%" }} />

        <button onClick={handleVoice} disabled={wsStatus!=="open"}
          title={isListening ? "Listening… click to stop" : `Speak in ${LANG_CONFIG[language]?.label}`}
          style={{ width:44, height:44, borderRadius:"50%", border:"none", flexShrink:0,
            background: isListening ? "#ef4444" : "#1e293b",
            color: isListening ? "#fff" : "#94a3b8",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor: wsStatus!=="open" ? "not-allowed" : "pointer",
            animation: isListening ? "pulse-ring 1s infinite" : "none",
            transition:"background 0.2s" }}>
          {isListening
            ? <span style={{ fontSize:13, fontWeight:700 }}>■</span>
            : <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"/>
                <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V20H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.08A7 7 0 0 0 19 11z"/>
              </svg>}
        </button>

        <button onClick={() => sendMessage()} disabled={wsStatus!=="open"||!input.trim()}
          style={{ height:44, padding:"0 20px", borderRadius:12, border:"none", flexShrink:0,
            background: wsStatus==="open"&&input.trim() ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#1e293b",
            color: wsStatus==="open"&&input.trim() ? "#fff" : "#4b5563",
            fontWeight:600, fontSize:"0.86rem",
            cursor: wsStatus!=="open"||!input.trim() ? "not-allowed" : "pointer",
            transition:"background 0.2s" }}>
          {language==="hi" ? "भेजें" : language==="te" ? "పంపు" : "Send"}
        </button>
      </div>

      {isListening && (
        <div style={{ marginTop:5, textAlign:"center", fontSize:"0.74rem",
          color:"#f87171", animation:"pulse-opacity 1s infinite" }}>
          🎙 Listening in {LANG_CONFIG[language]?.label}… speak now, then pause
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-6px);opacity:1} }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(239,68,68,.55)} 70%{box-shadow:0 0 0 10px rgba(239,68,68,0)} 100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} }
        @keyframes pulse-opacity { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
    </div>
  );
}

function Av({ bg, children }) {
  return (
    <span style={{ width:28, height:28, borderRadius:"50%", background:bg,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:"0.7rem", flexShrink:0 }}>
      {children}
    </span>
  );
}

function chip(color) {
  return { background:`${color}22`, border:`1px solid ${color}44`, color,
    borderRadius:8, padding:"4px 11px", fontSize:"0.74rem",
    fontWeight:600, cursor:"pointer", height:"auto" };
}

export default ChatUI;