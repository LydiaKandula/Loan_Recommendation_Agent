import { useState, useEffect, useRef } from "react";

function ChatUI({ userId }) {

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  const socketRef = useRef(null);

  // STOP VOICE
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        window.speechSynthesis.cancel();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {

    if (!userId) return;

    console.log("Connecting WS for user:", userId);

    socketRef.current = new WebSocket(
      `ws://127.0.0.1:8000/ws/chat/${userId}`
    );

    socketRef.current.onopen = () => {
      console.log("WS Connected");
    };

    socketRef.current.onmessage = (event) => {

      console.log("AI:", event.data);

      setChat(prev => [
        ...prev,
        { bot: event.data }
      ]);

      speak(event.data);
    };

    socketRef.current.onerror = (err) => {
      console.log("WS Error:", err);
    };

    socketRef.current.onclose = () => {
      console.log("WS Closed");
    };

    return () => {
      if (socketRef.current) socketRef.current.close();
    };

  }, [userId]);

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(speech);
  };

  const sendMessage = () => {

    if (!message.trim()) return;

    if (!socketRef.current || socketRef.current.readyState !== 1) {
      alert("WebSocket not connected");
      return;
    }

    setChat(prev => [
      ...prev,
      { user: message }
    ]);

    socketRef.current.send(message);

    setMessage("");
  };

  if (!userId) {
    return <p>⚠️ Please submit loan form first</p>;
  }

  return (
    <div>

      <div className="chat-box">

        {chat.map((c, i) => (
          <div key={i}>
            {c.user && <div className="user-message">{c.user}</div>}
            {c.bot && <div className="bot-message">{c.bot}</div>}
          </div>
        ))}

      </div>

      <div className="chat-input">

        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type message..."
        />

        <button onClick={sendMessage}>Send</button>

      </div>

    </div>
  );
}

export default ChatUI;