//ChatUI.jsx

import { useState, useRef, useEffect } from "react";

function ChatUI() {

  const [message, setMessage] = useState("");

  const [chat, setChat] = useState([]);

  const [isListening, setIsListening] =
    useState(false);

  const chatEndRef = useRef(null);

  /* =========================
     BACKEND WEBSOCKET
  ========================= */

  const socketRef = useRef(null);

  useEffect(() => {

    socketRef.current =
      new WebSocket(
        "ws://127.0.0.1:8000/ws/chat"
      );

    /* RECEIVE AI RESPONSE */

    socketRef.current.onmessage = (
      event
    ) => {

      const botReply = event.data;

      setChat((prev) => {

        const updated = [...prev];

        /* UPDATE LAST BOT MESSAGE */

        updated[updated.length - 1] = {
          ...updated[updated.length - 1],

          bot: botReply,
        };

        return updated;
      });

      /* AI VOICE */

      speakResponse(botReply);
    };

    /* SOCKET ERROR */

    socketRef.current.onerror = (
      error
    ) => {

      console.log(
        "WebSocket Error:",
        error
      );

    };

    /* SOCKET CLOSE */

    socketRef.current.onclose = () => {

      console.log(
        "WebSocket Disconnected"
      );

    };

    return () => {

      if (socketRef.current) {
        socketRef.current.close();
      }

    };

  }, []);

  /* =========================
     SPEECH RECOGNITION
  ========================= */

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  const recognition =
    SpeechRecognition
      ? new SpeechRecognition()
      : null;

  if (recognition) {

    recognition.continuous = false;

    recognition.lang = "en-US";

    recognition.interimResults = false;

  }

  /* =========================
     AI VOICE RESPONSE
  ========================= */

  const speakResponse = (text) => {

    const speech =
      new SpeechSynthesisUtterance(text);

    speech.lang = "en-US";

    speech.rate = 1;

    speech.pitch = 1;

    window.speechSynthesis.speak(speech);
  };

  /* =========================
     SEND MESSAGE
  ========================= */

  const sendMessage = () => {

    if (!message.trim()) return;

    const userMessage = message;

    /* SHOW USER MESSAGE */

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

      socketRef.current.send(
        userMessage
      );

    } else {

      setChat((prev) => [
        ...prev,

        {
          user: userMessage,

          bot: "Backend not connected",
        },
      ]);

    }

    setMessage("");
  };

  /* =========================
     VOICE INPUT
  ========================= */

  const handleVoice = () => {

    if (!recognition) {

      alert(
        "Speech Recognition not supported"
      );

      return;
    }

    setIsListening(true);

    recognition.start();

    recognition.onresult = (
      event
    ) => {

      const transcript =
        event.results[0][0].transcript;

      setMessage(transcript);

      /* AUTO SEND VOICE MESSAGE */

      setChat((prev) => [
        ...prev,

        {
          user: transcript,

          bot: "Thinking...",
        },
      ]);

      if (
        socketRef.current &&
        socketRef.current.readyState === 1
      ) {

        socketRef.current.send(
          transcript
        );

      }

      setIsListening(false);
    };

    recognition.onerror = () => {

      setIsListening(false);

      alert(
        "Voice recognition error"
      );

    };

    recognition.onend = () => {

      setIsListening(false);

    };
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

              {/* USER */}

              <div className="user-row">

                <div className="user-message">

                  {item.user}

                </div>

              </div>

              {/* BOT */}

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
            e.key === "Enter" &&
            sendMessage()
          }
        />

        {/* MIC */}

        <button
          type="button"
          className={`voice-button ${
            isListening
              ? "listening"
              : ""
          }`}
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