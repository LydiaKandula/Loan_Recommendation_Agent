import { useState, useRef, useEffect } from "react";

function ChatUI() {

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  const chatEndRef = useRef(null);

  const sendMessage = () => {

    if (!message.trim()) return;

    const responses = [
      "You are eligible for a Home Loan.",
      "Your credit score looks excellent.",
      "You qualify for multiple loan options.",
      "Application looks good.",
    ];

    const randomResponse =
      responses[Math.floor(Math.random() * responses.length)];

    setChat([
      ...chat,
      {
        user: message,
        bot: randomResponse,
      },
    ]);

    setMessage("");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chat]);

  return (
    <div>

      <h2>Chat Assistant</h2>

      <p className="subtitle">
        Ask anything about loans
      </p>

      <div className="chat-box">

        {chat.length === 0 ? (

          <p className="empty-chat">
            Start conversation...
          </p>

        ) : (

          chat.map((item, index) => (

            <div key={index}>

              <div className="user-row">
                <div className="user-message">
                  {item.user}
                </div>
              </div>

              <div className="bot-row">
                <div className="bot-message">
                  {item.bot}
                </div>
              </div>

            </div>
          ))
        )}

        <div ref={chatEndRef}></div>

      </div>

      <div className="chat-input">

        <input
          type="text"
          placeholder="Ask about loans..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && sendMessage()
          }
        />

        <button onClick={sendMessage}>
          Send
        </button>

      </div>

    </div>
  );
}

export default ChatUI;