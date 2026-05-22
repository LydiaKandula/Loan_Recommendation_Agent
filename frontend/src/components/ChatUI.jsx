import { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = "http://127.0.0.1:8000";

// BCP-47 tags for STT/TTS per language
const LANG_CONFIG = {
  en: { label: "English", flag: "🇬🇧", stt: "en-US", tts: "en-US" },
  hi: { label: "हिंदी",   flag: "🇮🇳", stt: "hi-IN", tts: "hi-IN" },
  te: { label: "తెలుగు",  flag: "🏳",  stt: "te-IN", tts: "te-IN" },
};

function ChatUI({ lastApplication }) {
  // ── State ────────────────────────────────────────────────────────────────
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState("");
  const [isListening,   setIsListening]   = useState(false);
  const [isSpeaking,    setIsSpeaking]    = useState(false);
  const [wsStatus,      setWsStatus]      = useState("connecting");
  const [isTyping,      setIsTyping]      = useState(false);
  const [language,      setLanguage]      = useState("en");
  const [voiceEnabled,  setVoiceEnabled]  = useState(true);

  // User switcher
  const [userList,      setUserList]      = useState([]);
  const [activeUser,    setActiveUser]    = useState(null);   // full profile object
  const [loadingUser,   setLoadingUser]   = useState(false);
  const [showSwitcher,  setShowSwitcher]  = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const socketRef       = useRef(null);
  const recognitionRef  = useRef(null);
  const bottomRef       = useRef(null);
  const contextSentRef  = useRef(false);
  const pageActiveRef   = useRef(true);
  const langRef         = useRef(language);          // always current inside callbacks
  const voiceEnabledRef = useRef(voiceEnabled);

  // keep refs in sync with state
  useEffect(() => { langRef.current = language; },        [language]);
  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);

  // On mount, use lastApplication as the initial user
  useEffect(() => {
    if (lastApplication && !activeUser) {
      setActiveUser(lastApplication);
    }
  }, [lastApplication]); // eslint-disable-line

  // ── Fetch all users for switcher ─────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/users`)
      .then(r => r.ok ? r.json() : [])
      .then(setUserList)
      .catch(() => setUserList([]));
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addMessage = useCallback((role, text) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role, text }]);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback((text, ttsLang) => {
    if (!voiceEnabledRef.current)       return;
    if (!pageActiveRef.current)         return;
    window.speechSynthesis.cancel();

    try {
      const cfg        = LANG_CONFIG[langRef.current] || LANG_CONFIG.en;
      const lang       = ttsLang || cfg.tts;
      const u          = new SpeechSynthesisUtterance(text);
      u.lang           = lang;
      u.rate           = 0.95;
      u.pitch          = 1;

      // ── Voice selection: prefer a native voice for the language ──────────
      const voices     = window.speechSynthesis.getVoices();
      const native     = voices.find(v => v.lang === lang)
                      || voices.find(v => v.lang.startsWith(lang.split("-")[0]));
      if (native) u.voice = native;

      u.onstart  = () => setIsSpeaking(true);
      u.onend    = () => setIsSpeaking(false);
      u.onerror  = () => setIsSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {
      setIsSpeaking(false);
    }
  }, []);

  // Voices load async in Chrome — re-trigger speak after they arrive
  useEffect(() => {
    const onVoicesChanged = () => {};  // just triggers re-render so voices are ready
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
  }, []);

  // ── Page visibility ───────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => {
      pageActiveRef.current = !document.hidden;
      if (document.hidden) stopSpeaking();
    };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, [stopSpeaking]);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const sendContext = useCallback((ws, user, lang) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "context", user: user || null, language: lang }));
  }, []);

  const connectWS = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    setWsStatus("connecting");
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat`);
    socketRef.current = ws;

    ws.onopen = () => {
      setWsStatus("open");
      if (!contextSentRef.current) {
        contextSentRef.current = true;
        sendContext(ws, activeUser || lastApplication, langRef.current);
      }
    };

    ws.onmessage = (event) => {
      try {
        const data    = JSON.parse(event.data);
        const text    = data.text || "";
        const ttsLang = data.ttsLang;
        setIsTyping(false);
        if (data.type === "greeting" || data.type === "message") {
          addMessage("ai", text);
          speak(text, ttsLang);
        } else if (data.type === "error") {
          addMessage("ai", `⚠️ ${text}`);
        }
      } catch {
        setIsTyping(false);
        addMessage("ai", event.data);
        speak(event.data);
      }
    };

    ws.onerror = () => setWsStatus("closed");
    ws.onclose = () => { setWsStatus("closed"); setIsTyping(false); };
  }, [activeUser, lastApplication, sendContext, addMessage, speak]);

  useEffect(() => {
    contextSentRef.current = false;
    connectWS();
    return () => {
      stopSpeaking();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [connectWS, stopSpeaking]);

  // ── Speech Recognition (re-init when language changes) ───────────────────
  useEffect(() => {
    // Stop any active recognition first
    try { recognitionRef.current?.stop(); } catch {}

    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { recognitionRef.current = null; return; }

      const r          = new SR();
      r.continuous     = false;
      r.lang           = LANG_CONFIG[language]?.stt || "en-US";
      r.interimResults = false;
      r.maxAlternatives = 1;
      recognitionRef.current = r;
    } catch {
      recognitionRef.current = null;
    }
  }, [language]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

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
    if (!r) {
      alert("Speech recognition is not supported in this browser.\nTry Chrome or Edge.");
      return;
    }
    if (isListening) {
      try { r.stop(); } catch {}
      setIsListening(false);
      return;
    }

    stopSpeaking();

    // Re-set lang in case it changed
    r.lang = LANG_CONFIG[language]?.stt || "en-US";

    r.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setIsListening(false);
      sendMessage(transcript);
    };
    r.onerror = (e) => {
      console.warn("STT error:", e.error);
      setIsListening(false);
      if (e.error === "not-allowed") {
        alert("Microphone access denied.\nPlease allow microphone permission in your browser settings.");
      }
    };
    r.onend = () => setIsListening(false);

    try {
      r.start();
      setIsListening(true);
    } catch (err) {
      console.warn("STT start error:", err);
      setIsListening(false);
    }
  }, [isListening, language, stopSpeaking, sendMessage]);

  // ── Language change ───────────────────────────────────────────────────────
  const handleLanguageChange = (newLang) => {
    if (newLang === language) return;
    setLanguage(newLang);
    stopSpeaking();
    setMessages([]);
    setIsTyping(false);

    // Re-send context with new language — this resets server-side history too
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type:     "context",
        user:     activeUser || lastApplication || null,
        language: newLang,
      }));
    }
  };

  // ── User switching ────────────────────────────────────────────────────────
  const handleUserSwitch = async (userId) => {
    setShowSwitcher(false);
    setLoadingUser(true);
    try {
      const res  = await fetch(`${API_BASE}/users/${userId}`);
      if (!res.ok) throw new Error("Not found");
      const user = await res.json();

      setActiveUser(user);
      setMessages([]);
      setIsTyping(false);
      stopSpeaking();

      // Send new context to backend — resets conversation history server-side
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type:     "context",
          user,
          language: langRef.current,
        }));
      } else {
        // WS was closed — reconnect, context will be sent in onopen
        contextSentRef.current = false;
        connectWS();
      }
    } catch (e) {
      addMessage("ai", "⚠️ Could not load user profile.");
    } finally {
      setLoadingUser(false);
    }
  };

  const handleReconnect = () => {
    contextSentRef.current = false;
    connectWS();
  };

  // ── Quick suggestion chips (language-aware) ───────────────────────────────
  const suggestions = {
    en: ["What's my EMI breakdown?", "Am I eligible?", "Improve my credit score?", "Compare loan options"],
    hi: ["मेरी EMI कितनी होगी?", "क्या मैं पात्र हूँ?", "क्रेडिट स्कोर कैसे बढ़ाएं?", "लोन विकल्प तुलना करें"],
    te: ["నా EMI ఎంత?", "నేను అర్హుడినా?", "క్రెడిట్ స్కోర్ పెంచడం ఎలా?", "లోన్ ఆప్షన్లు చూపండి"],
  };

  const currentUser = activeUser || lastApplication;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 560 }}>

      {/* ── TOP BAR ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>

        {/* Left: status dot + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 9, height: 9, borderRadius: "50%", display: "inline-block", flexShrink: 0,
            background: wsStatus === "open" ? "#22c55e" : wsStatus === "connecting" ? "#f59e0b" : "#ef4444",
            boxShadow: wsStatus === "open" ? "0 0 8px rgba(34,197,94,0.8)" : "none",
          }} />
          <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.96rem" }}>
            Loan AI Assistant
          </span>
        </div>

        {/* Right: controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>

          {/* Language selector */}
          <div style={{ display: "flex", gap: 4 }}>
            {Object.entries(LANG_CONFIG).map(([code, cfg]) => (
              <button
                key={code}
                onClick={() => handleLanguageChange(code)}
                title={cfg.label}
                style={{
                  height: 32, padding: "0 10px", borderRadius: 8, border: "none",
                  fontSize: "0.76rem", fontWeight: 600, cursor: "pointer",
                  background: language === code ? "rgba(37,99,235,0.8)" : "rgba(255,255,255,0.06)",
                  color: language === code ? "#fff" : "#94a3b8",
                  transition: "all 0.15s",
                }}
              >
                {cfg.flag} {cfg.label}
              </button>
            ))}
          </div>

          {/* Voice toggle */}
          <button
            onClick={() => { setVoiceEnabled(v => !v); if (isSpeaking) stopSpeaking(); }}
            title={voiceEnabled ? "Mute AI voice" : "Unmute AI voice"}
            style={chipStyle(voiceEnabled ? "#22c55e" : "#64748b")}
          >
            {voiceEnabled ? "🔊" : "🔇"}
          </button>

          {isSpeaking && (
            <button onClick={stopSpeaking} style={chipStyle("#ef4444")}>Stop</button>
          )}
          {wsStatus === "closed" && (
            <button onClick={handleReconnect} style={chipStyle("#2563eb")}>↩ Reconnect</button>
          )}
          {messages.length > 0 && (
            <button onClick={() => { setMessages([]); stopSpeaking(); }} style={chipStyle("#475569")}>Clear</button>
          )}
        </div>
      </div>

      {/* ── USER SWITCHER ── */}
      <div style={{ marginBottom: 10, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Current user pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, flex: 1,
            background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)",
            borderRadius: 10, padding: "7px 12px", fontSize: "0.8rem",
          }}>
            <span style={{ fontSize: "1rem" }}>👤</span>
            {loadingUser ? (
              <span style={{ color: "#94a3b8" }}>Loading user...</span>
            ) : currentUser ? (
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 600 }}>{currentUser.fullName}</span>
                <span style={{ color: "#93c5fd" }}>💼 {currentUser.preferredLoanType}</span>
                <span style={{ color: "#93c5fd" }}>₹{Number(currentUser.preferredAmount).toLocaleString("en-IN")}</span>
                {currentUser.emi   && <span style={{ color: "#4ade80" }}>EMI ₹{Number(currentUser.emi).toFixed(0)}/mo</span>}
                {currentUser.bank  && <span style={{ color: "#fbbf24" }}>🏦 {currentUser.bank}</span>}
                <span style={{ color: "#94a3b8" }}>Score: {currentUser.creditScore}</span>
              </div>
            ) : (
              <span style={{ color: "#64748b" }}>No user selected — submit a loan form first, or switch below</span>
            )}
          </div>

          {/* Switch user button */}
          <button
            onClick={() => setShowSwitcher(s => !s)}
            style={{
              height: 36, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
              background: showSwitcher ? "rgba(37,99,235,0.4)" : "rgba(255,255,255,0.05)",
              color: "#cbd5e1", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", flexShrink: 0,
            }}
          >
            {showSwitcher ? "✕ Close" : "⇄ Switch User"}
          </button>
        </div>

        {/* Dropdown list */}
        {showSwitcher && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100,
            background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            maxHeight: 240, overflowY: "auto",
          }}>
            {userList.length === 0 ? (
              <div style={{ padding: "14px 16px", color: "#64748b", fontSize: "0.84rem" }}>
                No registered users found.
              </div>
            ) : (
              userList.map(u => {
                const isActive = currentUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => !isActive && handleUserSwitch(u.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "11px 16px", cursor: isActive ? "default" : "pointer",
                      background: isActive ? "rgba(37,99,235,0.15)" : "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: isActive ? "#2563eb" : "#1e293b",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem", color: "#fff", fontWeight: 700, flexShrink: 0,
                    }}>
                      {(u.fullName || "?")[0].toUpperCase()}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.86rem" }}>
                        {u.fullName}
                        {isActive && <span style={{ marginLeft: 6, color: "#4ade80", fontSize: "0.72rem" }}>● Active</span>}
                      </div>
                      <div style={{ color: "#64748b", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.email} · {u.preferredLoanType} · Score {u.creditScore}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── CONNECTION BANNER ── */}
      {wsStatus === "closed" && (
        <div style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 10, padding: "7px 14px", marginBottom: 10,
          fontSize: "0.8rem", color: "#fca5a5"
        }}>
          ⚠️ Disconnected from backend. Click <b>Reconnect</b> or restart uvicorn.
        </div>
      )}

      {/* ── MESSAGES ── */}
      <div style={{
        flex: 1, overflowY: "auto", background: "#0a1020",
        borderRadius: 16, padding: "14px 12px",
        border: "1px solid rgba(255,255,255,0.05)",
        display: "flex", flexDirection: "column", gap: 10,
        minHeight: 260, maxHeight: 400,
      }}>
        {messages.length === 0 && wsStatus === "connecting" && (
          <p style={{ color: "#475569", margin: "auto", textAlign: "center", fontSize: "0.84rem" }}>
            Connecting…
          </p>
        )}
        {messages.length === 0 && wsStatus === "open" && (
          <p style={{ color: "#475569", margin: "auto", textAlign: "center", fontSize: "0.84rem" }}>
            Waiting for greeting…
          </p>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 7 }}>
            {msg.role === "ai" && <Avatar label="🤖" bg="#1e3a5f" />}
            <div style={{
              maxWidth: "76%", padding: "10px 14px", borderRadius: 14,
              fontSize: "0.87rem", lineHeight: 1.65,
              background: msg.role === "user" ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#172033",
              color: msg.role === "user" ? "#fff" : "#dbeafe",
              borderBottomRightRadius: msg.role === "user" ? 3 : 14,
              borderBottomLeftRadius:  msg.role === "ai"   ? 3 : 14,
              whiteSpace: "pre-wrap",
            }}>
              {msg.text}
            </div>
            {msg.role === "user" && <Avatar label="👤" bg="#1e40af" />}
          </div>
        ))}

        {isTyping && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
            <Avatar label="🤖" bg="#1e3a5f" />
            <div style={{ background: "#172033", borderRadius: 14, borderBottomLeftRadius: 3, padding: "11px 16px", display: "flex", gap: 5, alignItems: "center" }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#4b9cf5", display: "inline-block", animation: "bounce 1.2s infinite", animationDelay: `${i * 0.18}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── QUICK CHIPS ── */}
      {messages.length <= 1 && wsStatus === "open" && (
        <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
          {(suggestions[language] || suggestions.en).map(q => (
            <button key={q} onClick={() => sendMessage(q)} style={{
              background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)",
              borderRadius: 999, padding: "5px 12px", color: "#93c5fd",
              fontSize: "0.75rem", cursor: "pointer", fontWeight: 500, height: "auto",
            }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* ── INPUT ROW ── */}
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        <input
          type="text"
          value={input}
          disabled={wsStatus !== "open"}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder={
            wsStatus !== "open" ? "Waiting for connection…" :
            language === "hi"   ? "यहाँ लिखें…" :
            language === "te"   ? "ఇక్కడ టైప్ చేయండి…" :
                                  "Ask anything about your loan…"
          }
          style={{
            flex: 1, height: 44, borderRadius: 12, padding: "0 16px",
            background: "#0f172a", border: "1px solid rgba(255,255,255,0.09)",
            color: "#fff", fontSize: "0.88rem", outline: "none",
            opacity: wsStatus !== "open" ? 0.45 : 1, maxWidth: "100%",
          }}
        />

        {/* MIC button */}
        <button
          onClick={handleVoice}
          disabled={wsStatus !== "open"}
          title={isListening ? `Listening in ${LANG_CONFIG[language]?.label}… (click to stop)` : `Speak in ${LANG_CONFIG[language]?.label}`}
          style={{
            width: 44, height: 44, borderRadius: "50%", border: "none", flexShrink: 0,
            background: isListening ? "#ef4444" : "#1e293b",
            color: isListening ? "#fff" : "#94a3b8",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: wsStatus !== "open" ? "not-allowed" : "pointer",
            animation: isListening ? "pulse-ring 1s infinite" : "none",
            transition: "background 0.2s",
          }}
        >
          {isListening
            ? <span style={{ fontSize: 14, fontWeight: 700 }}>■</span>
            : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"/>
                <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V20H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.08A7 7 0 0 0 19 11z"/>
              </svg>
            )
          }
        </button>

        {/* SEND button */}
        <button
          onClick={() => sendMessage()}
          disabled={wsStatus !== "open" || !input.trim()}
          style={{
            height: 44, padding: "0 20px", borderRadius: 12, border: "none", flexShrink: 0,
            background: wsStatus === "open" && input.trim() ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#1e293b",
            color: wsStatus === "open" && input.trim() ? "#fff" : "#4b5563",
            fontWeight: 600, fontSize: "0.86rem",
            cursor: wsStatus !== "open" || !input.trim() ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {language === "hi" ? "भेजें" : language === "te" ? "పంపు" : "Send"}
        </button>
      </div>

      {/* Mic language hint */}
      {isListening && (
        <div style={{ marginTop: 6, textAlign: "center", fontSize: "0.76rem", color: "#f87171", animation: "pulse-opacity 1s infinite" }}>
          🎙 Listening in {LANG_CONFIG[language]?.label}… speak now, then pause
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%,80%,100% { transform:translateY(0); opacity:0.4; }
          40%          { transform:translateY(-6px); opacity:1; }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.55); }
          70%  { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        @keyframes pulse-opacity {
          0%,100% { opacity:1; } 50% { opacity:0.5; }
        }
      `}</style>
    </div>
  );
}

// Small reusable avatar circle
function Avatar({ label, bg }) {
  return (
    <span style={{
      width: 28, height: 28, borderRadius: "50%", background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "0.72rem", flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

function chipStyle(color) {
  return {
    background: `${color}22`, border: `1px solid ${color}44`,
    color, borderRadius: 8, padding: "4px 12px",
    fontSize: "0.76rem", fontWeight: 600, cursor: "pointer", height: "auto",
  };
}

export default ChatUI;