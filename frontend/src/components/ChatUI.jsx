import { useState, useRef, useEffect } from "react";

function ChatUI({ chat, setChat, userId }) {
  const [message, setMessage] = useState("");
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  /* =========================
     INIT WEBSOCKET ONCE
  ========================= */
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = new WebSocket("ws://127.0.0.1:8000/ws/chat");

      socketRef.current.onmessage = (event) => {
        const botReply = event.data;

        setChat((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].bot = botReply;
          return updated;
        });
      };
    }

    return () => {
      /* ❌ DO NOT CLOSE SOCKET → keeps chat alive */
    };
  }, []);

  /* =========================
     STOP VOICE ON TAB SWITCH
  ========================= */
  useEffect(() => {
    const stopVoice = () => {
      window.speechSynthesis.cancel();
    };

    document.addEventListener("visibilitychange", stopVoice);

    return () => {
      document.removeEventListener("visibilitychange", stopVoice);
    };
  }, []);

  /* =========================
     SEND MESSAGE
  ========================= */
  const sendMessage = () => {
    if (!message.trim()) return;

    const userMessage = message;

    setChat((prev) => [
      ...prev,
      {
        user: userMessage,
        bot: "Thinking...",
      },
    ]);

    /* SEND TO BACKEND */
    if (
      socketRef.current &&
      socketRef.current.readyState === 1
    ) {
      socketRef.current.send(userMessage);
    }

    setMessage("");
  };

  /* =========================
     ENTER KEY FIX
  ========================= */
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  /* =========================
     AUTO SCROLL
  ========================= */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chat]);

  return (
    <div>

      <div className="assistant-header">
        <h3>Loan AI Assistant</h3>
      </div>

      <div className="chat-box">
        {chat.length === 0 ? (
          <p>Start conversation...</p>
        ) : (
          chat.map((item, index) => (
            <div key={index}>
              <div className="user-row">
                <div className="user-message">{item.user}</div>
              </div>

              <div className="bot-row">
                <div className="bot-message">{item.bot}</div>
              </div>
            </div>
          ))
        )}

        <div ref={chatEndRef}></div>
      </div>

      <div className="chat-input">
        <input
          value={message}
          placeholder="Ask something..."
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default ChatUI;