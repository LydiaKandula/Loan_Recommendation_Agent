import { useState, useRef, useEffect } from "react";

function ChatUI() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const chatEndRef = useRef(null);

  const sendMessage = () => {
    if (message.trim()) {
      const responses = [
        "Based on your profile, you may qualify for a personal loan.",
        "Your credit score looks good. Consider a home loan.",
        "You might be eligible for a business loan.",
        "Great financial profile! Multiple loan options available.",
      ];

      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      setChat([...chat, { user: message, bot: randomResponse }]);
      setMessage("");
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  return (
    <div>
      <h2 style={{ color: "var(--text)" }}>Chat Assistant</h2>

      <p style={{ color: "var(--text-light)", marginBottom: "20px" }}>
        Ask questions about your loan application
      </p>

      {/* Chat Box */}
      <div
        style={{
          background: "#131822",   // force light background
          borderRadius: "10px",
          padding: "16px",
          minHeight: "250px",
          maxHeight: "320px",
          overflowY: "auto",
          marginBottom: "16px",
        }}
      >
        {chat.length === 0 ? (
          <p
            style={{
              color: "#6b7280",
              textAlign: "center",
              marginTop: "60px",
            }}
          >
            Start a conversation...
          </p>
        ) : (
          chat.map((item, index) => (
            <div key={index}>
              {/* User message */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div
                  style={{
                    background: "#6366f1",
                    color: "white",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    marginBottom: "8px",
                    maxWidth: "70%",
                  }}
                >
                  {item.user}
                </div>
              </div>

              {/* Bot message */}
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    background: "#eed4d4",
                    color: "#1f2937",   // force dark text
                    padding: "10px 14px",
                    borderRadius: "12px",
                    marginBottom: "12px",
                    border: "1px solid #a4b4d4",
                    maxWidth: "70%",
                  }}
                >
                  {item.bot}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef}></div>
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: "10px" }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask about loans..."
          style={{ flex: 1 }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default ChatUI;