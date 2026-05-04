import { useState, useRef, useEffect } from "react";

function ChatUI() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const chatEndRef = useRef(null);

  const sendMessage = () => {
    if (!message.trim()) return;

    const userMsg = message;

    setChat((prev) => [
      ...prev,
      { user: userMsg, bot: "Typing..." },
    ]);

    setMessage("");

    setTimeout(() => {
      setChat((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].bot =
          "AI will respond here (backend later)";
        return updated;
      });
    }, 1000);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  return (
    <div>
      <h2>Chat Assistant</h2>

      <div style={{ minHeight: "200px" }}>
        {chat.map((c, i) => (
          <div key={i}>
            <p><b>You:</b> {c.user}</p>
            <p><b>Bot:</b> {c.bot}</p>
          </div>
        ))}
        <div ref={chatEndRef}></div>
      </div>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default ChatUI;