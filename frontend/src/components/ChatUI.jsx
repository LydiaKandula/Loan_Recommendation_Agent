//ChatUI.jsx

import { useState, useRef, useEffect } from "react";

function ChatUI() {

  const [message, setMessage] = useState("");

  const [chat, setChat] = useState([]);

  const [isListening, setIsListening] =
    useState(false);

  const chatEndRef = useRef(null);

  /* SPEECH RECOGNITION */

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  const recognition = new SpeechRecognition();

  recognition.continuous = false;

  recognition.lang = "en-US";

  recognition.interimResults = false;

  /* AI VOICE */

  const speakResponse = (text) => {

    const speech =
      new SpeechSynthesisUtterance(text);

    speech.lang = "en-US";

    speech.rate = 1;

    speech.pitch = 1;

    window.speechSynthesis.speak(speech);
  };

  /* SEND MESSAGE */

  const sendMessage = () => {

  if (!message.trim()) return;

  let botReply = "";

  const lowerMessage =
    message.toLowerCase();

  /* GREETINGS */

  if (
    lowerMessage.includes("hi") ||
    lowerMessage.includes("hello")
  ) {

    botReply =
      "Hello! I am your Loan Recommendation AI Agent. How can I assist you today?";

  }

  /* LOAN ELIGIBILITY */

  else if (
    lowerMessage.includes("eligible")
  ) {

    botReply =
      "Loan eligibility depends on income, expenses, and credit score.";

  }

  /* CREDIT SCORE */

  else if (
    lowerMessage.includes("credit")
  ) {

    botReply =
      "A credit score above 750 increases approval chances.";

  }

  /* HOME LOAN */

  else if (
    lowerMessage.includes("home loan")
  ) {

    botReply =
      "Home loans usually offer longer tenure and lower interest rates.";

  }

  /* PERSONAL LOAN */

  else if (
    lowerMessage.includes("personal loan")
  ) {

    botReply =
      "Personal loans are unsecured loans with faster approval.";

  }

  /* EMI */

  else if (
    lowerMessage.includes("emi")
  ) {

    botReply =
      "EMI depends on loan amount, tenure, and interest rate.";

  }

  /* DEFAULT */

  else {

    botReply =
      "I can help you with loan eligibility, credit score, EMI, and loan recommendations.";

  }

  setChat((prev) => [
    ...prev,

    {
      user: message,

      bot: botReply,
    },
  ]);

  /* AI VOICE */

  speakResponse(botReply);

  setMessage("");
};
  /* VOICE INPUT */

  const handleVoice = () => {

    setIsListening(true);

    recognition.start();

    recognition.onresult = (event) => {

      const transcript =
        event.results[0][0].transcript;

      setMessage(transcript);

      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  /* AUTO SCROLL */

  useEffect(() => {

    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [chat]);

  return (
    <div>

      {/* HEADER */}

      <div className="assistant-header">

        <div className="assistant-dot"></div>

        <div>

          <h3>
            Loan Recommendation AI Agent
          </h3>

        </div>

      </div>

      {/* CHAT BOX */}

      <div className="chat-box">

        {chat.length === 0 ? (

          <p className="empty-chat">
            Start conversation with AI assistant...
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

      {/* INPUT */}

      <div className="chat-input">

        <input
          type="text"
          placeholder="Ask about loans..."
          value={message}
          onChange={(e) =>
            setMessage(e.target.value)
          }
          onKeyDown={(e) =>
            e.key === "Enter" && sendMessage()
          }
        />

        {/* MIC */}

        {/* MIC */}
{/* MIC */}
<button
  type="button"
  className={`voice-button ${isListening ? "listening" : ""}`}
  onClick={handleVoice}
  aria-label="Voice input"
>
  <svg
    className="mic-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
    <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V20H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.08A7 7 0 0 0 19 11z" />
  </svg>
</button>

        {/* SEND */}

        <button onClick={sendMessage}>
          Send
        </button>

      </div>

    </div>
  );
}

export default ChatUI;