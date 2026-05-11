import { useState } from "react";

function ChatUI({ userData }) {

  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([]);

  // 🔊 Speak AI response
  const speak = (text) => {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    window.speechSynthesis.speak(speech);
  };

  // 🎤 Voice Input (FIXED)
  const startVoice = () => {

    if (!("webkitSpeechRecognition" in window)) {
      alert("Voice not supported. Please use Google Chrome.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      console.log("🎤 Listening...");
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      console.log("Voice Input:", text);
      setMsg(text); // fill input box
    };

    recognition.onerror = (err) => {
      console.error("Voice error:", err);
      alert("Voice error. Try again.");
    };

    recognition.start();
  };

  // 💬 Send message to backend
  const sendMessage = async () => {

    if (!msg.trim()) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...userData,
          question: msg
        })
      });

      const data = await res.json();

      const reply = data.reply || "No response from AI";

      setChat(prev => [
        ...prev,
        { sender: "user", text: msg },
        { sender: "bot", text: reply }
      ]);

      speak(reply); // 🔊 speak response

      setMsg("");

    } catch (error) {
      console.error("API Error:", error);
      alert("Backend not responding");
    }
  };

  return (
    <div className="chat-ui">

      <h3>🤖 Loan Assistant</h3>

      {/* Chat messages */}
      <div className="chat-box">
        {chat.map((c, i) => (
          <div
            key={i}
            className={c.sender === "user" ? "chat-user" : "chat-bot"}
          >
            {c.text}
          </div>
        ))}
      </div>

      {/* Input + Buttons */}
      <div className="chat-input">

        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Ask about loan..."
        />

        <button onClick={startVoice}>🎤</button>

        <button onClick={sendMessage}>Send</button>

      </div>
    </div>
  );
}

export default ChatUI;