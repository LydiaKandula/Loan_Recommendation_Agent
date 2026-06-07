/**
 * BrowserCall.jsx
 * 
 * In-browser AI voice call — no Twilio phone call needed.
 * Uses the SAME WebSocket as the chat assistant but in a dedicated
 * "call mode" with:
 *   - Web Speech API for STT (same engine as chat voice, which works well)
 *   - Sarvam TTS via backend for AI speech (natural Indian voice)
 *   - Auto-listen after AI finishes speaking (like a real phone call)
 *   - Visual waveform / speaking indicators
 * 
 * How it works:
 *   1. User clicks "Start Call" → connects to /ws/chat with voice context
 *   2. AI greets the user (plays Sarvam audio)
 *   3. After AI finishes speaking, mic activates automatically
 *   4. User speaks → Web Speech API transcribes → sent to backend
 *   5. Backend replies with text + Sarvam audio
 *   6. Repeat until user clicks "End Call"
 */

import { useState, useRef, useEffect, useCallback } from "react";

const LANG_CFG = {
  en: { label:"English", stt:"en-IN" },
  hi: { label:"हिंदी",   stt:"hi-IN" },
  te: { label:"తెలుగు",  stt:"te-IN" },
};

// Same preprocessing as backend _tts_clean
function cleanForDisplay(text) {
  return (text || "").replace(/[*#`]/g, "").trim();
}

export default function BrowserCall({ lastApplication, authToken }) {
  const [callState,   setCallState]   = useState("idle");     // idle | connecting | active | ended
  const [transcript,  setTranscript]  = useState([]);          // [{role, text}]
  const [aiStatus,    setAiStatus]    = useState("");           // "thinking" | "speaking" | ""
  const [userStatus,  setUserStatus]  = useState("");           // "listening" | ""
  const [language,    setLanguage]    = useState("en");
  const [voiceGender, setVoiceGender] = useState("female");
  const [duration,    setDuration]    = useState(0);

  const wsRef          = useRef(null);
  const recRef         = useRef(null);
  const audioCtxRef    = useRef(null);
  const timerRef       = useRef(null);
  const autoListenRef  = useRef(true);   // keep listening after AI speaks
  const isActiveRef    = useRef(false);
  const langRef        = useRef(language);

  useEffect(() => { langRef.current = language; }, [language]);

  // ── Duration timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (callState === "active") {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      if (callState === "idle") setDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  // ── Format mm:ss ────────────────────────────────────────────────────────────
  const fmtDur = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  // ── Stop audio ──────────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    setAiStatus("");
  }, []);

  // ── Play Sarvam base64 audio, then auto-listen ──────────────────────────────
  const playAndThenListen = useCallback((b64) => {
    if (!b64) {
      // No audio — start listening immediately
      if (autoListenRef.current && isActiveRef.current) startListening();
      return;
    }
    try {
      const bin = atob(b64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      ctx.decodeAudioData(buf.buffer, decoded => {
        if (!isActiveRef.current) { ctx.close(); return; }
        const src = ctx.createBufferSource();
        src.buffer = decoded;
        src.connect(ctx.destination);
        src.onended = () => {
          setAiStatus("");
          ctx.close();
          audioCtxRef.current = null;
          // Auto-listen after AI finishes speaking
          if (autoListenRef.current && isActiveRef.current) {
            setTimeout(startListening, 300);   // 300ms pause feels natural
          }
        };
        setAiStatus("speaking");
        src.start(0);
      }, () => {
        ctx.close();
        if (autoListenRef.current && isActiveRef.current) startListening();
      });
    } catch (e) {
      console.warn("Audio play error:", e);
      if (autoListenRef.current && isActiveRef.current) startListening();
    }
  }, []); // eslint-disable-line

  // ── Start mic listening ─────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!isActiveRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn("SpeechRecognition not supported");
      return;
    }

    try { recRef.current?.stop(); } catch {}

    const r = new SR();
    r.continuous     = false;
    r.lang           = LANG_CFG[langRef.current]?.stt || "en-IN";
    r.interimResults = false;
    r.maxAlternatives = 1;
    recRef.current   = r;

    r.onstart = () => setUserStatus("listening");
    r.onend   = () => setUserStatus("");

    r.onresult = (e) => {
      const transcript = e.results[0][0].transcript.trim();
      if (!transcript) return;
      setUserStatus("");
      handleUserSpeech(transcript);
    };

    r.onerror = (e) => {
      setUserStatus("");
      if (e.error === "no-speech") {
        // Silence timeout — listen again
        if (autoListenRef.current && isActiveRef.current) {
          setTimeout(startListening, 500);
        }
      }
    };

    try { r.start(); } catch (e) { console.warn("STT start error:", e); }
  }, []); // eslint-disable-line

  // ── Send user speech to backend ─────────────────────────────────────────────
  const handleUserSpeech = useCallback((text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setTranscript(p => [...p, { role:"user", text }]);
    setAiStatus("thinking");
    wsRef.current.send(JSON.stringify({ type:"message", text }));
  }, []);

  // ── Connect WebSocket ───────────────────────────────────────────────────────
  const connectWS = useCallback((lang, gender) => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/chat");
    wsRef.current = ws;

    ws.onopen = () => {
      // Send context — backend will greet and send audio
      ws.send(JSON.stringify({
        type:        "context",
        user:        lastApplication || null,
        language:    lang,
        voiceGender: gender,
        token:       authToken || null,
      }));
      setCallState("active");
      isActiveRef.current = true;
    };

    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);

        if (d.type === "audio") {
          // Audio arrives separately — play it and then listen
          playAndThenListen(d.audio);
          return;
        }

        if (d.type === "greeting" || d.type === "message") {
          setAiStatus("thinking");   // brief thinking state before audio arrives
          setTranscript(p => [...p, { role:"ai", text: cleanForDisplay(d.text) }]);
          // If no audio backend (no Sarvam key), start listening after text
          if (!d.audio && d.audio !== undefined) {
            setTimeout(() => {
              setAiStatus("");
              if (autoListenRef.current && isActiveRef.current) startListening();
            }, 600);
          }
        }

        if (d.type === "error") {
          setTranscript(p => [...p, { role:"ai", text: `⚠️ ${d.text}` }]);
          setAiStatus("");
        }
      } catch {}
    };

    ws.onerror = () => { setCallState("ended"); isActiveRef.current = false; };
    ws.onclose = () => { setCallState("ended"); isActiveRef.current = false; };
  }, [lastApplication, authToken, playAndThenListen, startListening]);

  // ── Start call ──────────────────────────────────────────────────────────────
  const startCall = () => {
    if (callState !== "idle") return;
    setTranscript([]);
    setCallState("connecting");
    autoListenRef.current = true;
    connectWS(language, voiceGender);
  };

  // ── End call ────────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    autoListenRef.current = false;
    isActiveRef.current   = false;
    try { recRef.current?.stop(); } catch {}
    stopAudio();
    wsRef.current?.close();
    wsRef.current = null;
    setCallState("ended");
    setAiStatus("");
    setUserStatus("");
  }, [stopAudio]);

  // Cleanup on unmount
  useEffect(() => () => endCall(), []); // eslint-disable-line

  const isActive = callState === "active";

  return (
    <div style={{ maxWidth:600, margin:"0 auto", display:"flex", flexDirection:"column", gap:16 }}>

      {/* ── Header ── */}
      <div style={{ textAlign:"center" }}>
        <h3 style={{ color:"#fff", fontSize:"1.05rem", fontWeight:700, marginBottom:4 }}>
          🎙 AI Voice Advisor
        </h3>
        <p style={{ color:"#64748b", fontSize:"0.82rem" }}>
          Talk directly with the AI loan advisor from your browser — no phone needed
        </p>
      </div>

      {/* ── Call card ── */}
      <div style={{
        background: isActive
          ? "linear-gradient(145deg,rgba(37,99,235,0.12),rgba(37,99,235,0.06))"
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${isActive ? "rgba(37,99,235,0.35)" : "rgba(255,255,255,0.08)"}`,
        borderRadius:18, padding:"28px 24px", textAlign:"center",
        transition:"all 0.3s",
      }}>

        {/* Avatar */}
        <div style={{
          width:72, height:72, borderRadius:"50%", margin:"0 auto 18px",
          background: isActive ? "rgba(37,99,235,0.2)" : "rgba(255,255,255,0.06)",
          border: `2px solid ${isActive ? "rgba(37,99,235,0.5)" : "rgba(255,255,255,0.1)"}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"1.8rem",
          boxShadow: isActive ? "0 0 24px rgba(37,99,235,0.3)" : "none",
          animation: aiStatus === "speaking" ? "pulse-avatar 1.5s infinite" : "none",
        }}>
          🤖
        </div>

        {/* Status text */}
        <div style={{ fontSize:"0.85rem", color:"#94a3b8", marginBottom:16, minHeight:22 }}>
          {callState === "idle"       && "Ready to connect"}
          {callState === "connecting" && "Connecting…"}
          {callState === "active" && aiStatus === "thinking"  && (
            <span style={{ color:"#f59e0b" }}>⋯ Thinking</span>
          )}
          {callState === "active" && aiStatus === "speaking"  && (
            <span style={{ color:"#22c55e", animation:"pulse-opacity 1s infinite" }}>
              🔊 Speaking
            </span>
          )}
          {callState === "active" && userStatus === "listening" && (
            <span style={{ color:"#ef4444", animation:"pulse-opacity 1s infinite" }}>
              🎙 Listening…
            </span>
          )}
          {callState === "active" && !aiStatus && !userStatus && "Connected"}
          {callState === "ended" && "Call ended"}
        </div>

        {/* Duration */}
        {isActive && (
          <div style={{ fontSize:"1.4rem", fontWeight:700, fontFamily:"var(--mono)",
            color:"#fff", letterSpacing:"0.05em", marginBottom:18 }}>
            {fmtDur(duration)}
          </div>
        )}

        {/* Controls */}
        {callState === "idle" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12, alignItems:"center" }}>
            {/* Language + gender selectors */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
              {Object.entries(LANG_CFG).map(([c, cfg]) => (
                <button key={c} onClick={() => setLanguage(c)} style={{
                  height:32, padding:"0 12px", borderRadius:8, border:"none",
                  background: language===c ? "rgba(37,99,235,0.8)" : "rgba(255,255,255,0.06)",
                  color: language===c ? "#fff" : "#64748b",
                  fontSize:"0.78rem", fontWeight:600, cursor:"pointer",
                }}>
                  {cfg.label}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {["female","male"].map(g => (
                <button key={g} onClick={() => setVoiceGender(g)} style={{
                  height:30, padding:"0 14px", borderRadius:8, border:"none",
                  background: voiceGender===g
                    ? (g==="female" ? "rgba(236,72,153,0.65)" : "rgba(59,130,246,0.65)")
                    : "rgba(255,255,255,0.05)",
                  color: voiceGender===g ? "#fff" : "#64748b",
                  fontSize:"0.78rem", fontWeight:600, cursor:"pointer",
                }}>
                  {g==="female" ? "♀ Ritu" : "♂ Shubh"}
                </button>
              ))}
            </div>
            <button onClick={startCall} style={{
              width:64, height:64, borderRadius:"50%", border:"none",
              background:"linear-gradient(135deg,#22c55e,#16a34a)",
              color:"#fff", fontSize:"1.6rem", cursor:"pointer",
              boxShadow:"0 6px 24px rgba(34,197,94,0.45)",
              transition:"transform 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform="scale(1.08)"}
              onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
            >
              📞
            </button>
            <p style={{ color:"#64748b", fontSize:"0.75rem" }}>Click to start call</p>
          </div>
        )}

        {isActive && (
          <div style={{ display:"flex", gap:16, justifyContent:"center" }}>
            {/* Mute mic */}
            <button
              onClick={() => {
                if (userStatus === "listening") {
                  try { recRef.current?.stop(); } catch {}
                  autoListenRef.current = false;
                  setUserStatus("");
                } else {
                  autoListenRef.current = true;
                  if (!aiStatus) startListening();
                }
              }}
              style={{
                width:52, height:52, borderRadius:"50%", border:"none",
                background: userStatus === "listening" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)",
                color: userStatus === "listening" ? "#f87171" : "#94a3b8",
                fontSize:"1.2rem", cursor:"pointer",
              }}>
              {userStatus === "listening" ? "🔇" : "🎙"}
            </button>

            {/* End call */}
            <button onClick={endCall} style={{
              width:64, height:64, borderRadius:"50%", border:"none",
              background:"linear-gradient(135deg,#ef4444,#dc2626)",
              color:"#fff", fontSize:"1.5rem", cursor:"pointer",
              boxShadow:"0 6px 24px rgba(239,68,68,0.4)",
            }}>
              📵
            </button>
          </div>
        )}

        {callState === "ended" && (
          <button onClick={() => { setCallState("idle"); setTranscript([]); setDuration(0); }}
            style={{
              height:40, padding:"0 24px", borderRadius:10, border:"none",
              background:"rgba(255,255,255,0.07)", color:"#94a3b8",
              fontSize:"0.86rem", fontWeight:600, cursor:"pointer",
            }}>
            New Call
          </button>
        )}
      </div>

      {/* ── Loan context strip ── */}
      {lastApplication && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:12,
          background:"rgba(34,197,94,0.07)", border:"1px solid rgba(34,197,94,0.18)",
          borderRadius:10, padding:"9px 14px", fontSize:"0.78rem" }}>
          <span style={{ color:"#4ade80", fontWeight:700, fontSize:"0.72rem",
            textTransform:"uppercase", letterSpacing:"0.05em" }}>Loan context</span>
          {lastApplication.fullName && <span style={{ color:"#cbd5e1" }}>{lastApplication.fullName}</span>}
          {lastApplication.preferredLoanType && <span style={{ color:"#93c5fd" }}>{lastApplication.preferredLoanType} loan</span>}
          {lastApplication.bank && <span style={{ color:"#fbbf24" }}>🏦 {lastApplication.bank}</span>}
          {lastApplication.emi && <span style={{ color:"#4ade80" }}>EMI ₹{Number(lastApplication.emi).toFixed(0)}/mo</span>}
        </div>
      )}

      {/* ── Transcript ── */}
      {transcript.length > 0 && (
        <div style={{ background:"#080e1a", border:"1px solid rgba(255,255,255,0.05)",
          borderRadius:14, padding:"14px", maxHeight:280, overflowY:"auto" }}>
          <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#60a5fa",
            textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>
            Conversation
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {transcript.map((t, i) => (
              <div key={i} style={{ display:"flex",
                justifyContent: t.role==="user" ? "flex-end" : "flex-start",
                alignItems:"flex-end", gap:7 }}>
                {t.role === "ai" && <Av l="🤖" b="#1e3a5f"/>}
                <div style={{ maxWidth:"78%", padding:"9px 13px", borderRadius:12,
                  fontSize:"0.86rem", lineHeight:1.6, whiteSpace:"pre-wrap",
                  background: t.role==="user"
                    ? "linear-gradient(135deg,#2563eb,#1d4ed8)"
                    : "#172033",
                  color: t.role==="user" ? "#fff" : "#dbeafe",
                  borderBottomRightRadius: t.role==="user" ? 3 : 12,
                  borderBottomLeftRadius:  t.role==="ai"   ? 3 : 12 }}>
                  {t.text}
                </div>
                {t.role === "user" && <Av l="👤" b="#1e40af"/>}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-avatar {
          0%,100% { box-shadow: 0 0 24px rgba(37,99,235,0.3); }
          50%      { box-shadow: 0 0 40px rgba(37,99,235,0.6); }
        }
        @keyframes pulse-opacity { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  );
}

function Av({ l, b }) {
  return <span style={{ width:26, height:26, borderRadius:"50%", background:b,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:"0.68rem", flexShrink:0 }}>{l}</span>;
}