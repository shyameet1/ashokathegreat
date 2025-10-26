"use client";

import { useState, useRef, useEffect } from "react";

interface Answer {
  text: string;
  correct?: boolean;
}

interface Question {
  question: string;
  answers: Answer[];
  questionIndex: number;
  timeLeft?: number;
}

export default function Home() {
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Keyboard shortcut: Ctrl+Q to copy question and answers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "q") {
        e.preventDefault();
        if (currentQuestion) {
          copyAll();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentQuestion]);

  const handleConnect = () => {
    if (!pin) {
      setStatus("Please enter a PIN");
      return;
    }

    if (!name) {
      setStatus("Please enter a name");
      return;
    }

    setLoading(true);
    setStatus("Connecting...");

    const eventSource = new EventSource(
      `/api/kahoot/stream?pin=${encodeURIComponent(pin)}&name=${encodeURIComponent(name)}`
    );
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("connected", () => {
      setStatus("Connecting to game...");
      setLoading(false);
    });

    eventSource.addEventListener("joined", () => {
      setStatus("Connected! Waiting for quiz to start...");
      setConnected(true);
      setLoading(false);
    });

    eventSource.addEventListener("ready", () => {
      setStatus("Ready to play!");
      setConnected(true);
    });

    eventSource.addEventListener("question", (e) => {
      const data = JSON.parse(e.data);
      // Instantly replace the previous question
      setCurrentQuestion(data);
      setStatus(`Question ${data.questionIndex + 1}`);
      setCopyStatus(""); // Clear any previous copy status
    });

    eventSource.addEventListener("questionEnd", () => {
      // Keep the question visible until the next one arrives
      // setCurrentQuestion(null);
    });

    eventSource.addEventListener("finish", () => {
      setStatus("Game finished!");
      setConnected(false);
      eventSource.close();
    });

    eventSource.addEventListener("disconnect", () => {
      setStatus("Disconnected from game");
      setConnected(false);
      setLoading(false);
      eventSource.close();
    });

    eventSource.onerror = () => {
      setStatus("Error: Connection failed");
      setLoading(false);
      setConnected(false);
      eventSource.close();
    };
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`Copied ${label}!`);
      setTimeout(() => setCopyStatus(""), 2000);
    } catch (err) {
      setCopyStatus("Failed to copy");
    }
  };

  const copyAll = async () => {
    if (!currentQuestion) return;

    const text = `Question: ${currentQuestion.question}\n\nAnswers:\n${currentQuestion.answers
      .map((a, i) => `${i + 1}. ${a.text}`)
      .join("\n")}`;

    await copyToClipboard(text, "all");
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode
      ? "bg-gradient-to-br from-gray-900 to-gray-800"
      : "bg-gradient-to-br from-purple-500 to-pink-500"
      }`}>
      {/* Deploy to Vercel button */}
      <div className="absolute top-4 right-4">
        <a
          href="https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/kahoot-quiz-fetcher"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center px-4 py-2 rounded-lg font-semibold transition-colors ${darkMode
              ? "bg-black hover:bg-gray-900 text-white border border-gray-700"
              : "bg-black hover:bg-gray-900 text-white"
            }`}
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0L24 24H0L12 0z" />
          </svg>
          Deploy to Vercel
        </a>
      </div>

      <div className="flex min-h-screen items-center justify-center p-4">
        <main className="text-center w-full max-w-4xl">
          {/* Header with dark mode toggle */}
          <div className="mb-8">
            <h1 className={`text-7xl font-extrabold mb-4 ${darkMode ? "text-white" : "text-white"
              }`}>
              🎮 Kahoot Quiz Fetcher
            </h1>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${darkMode
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-white/20 hover:bg-white/30 text-white"
                }`}
            >
              {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>
          </div>

          {!connected ? (
            <div className={`rounded-lg shadow-2xl p-8 max-w-md mx-auto ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
              }`}>
              <label htmlFor="name" className={`block text-left font-semibold mb-2 ${darkMode ? "text-gray-200" : "text-gray-700"
                }`}>
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4 ${darkMode
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border border-gray-300 text-gray-900"
                  }`}
                disabled={loading}
              />

              <label htmlFor="pin" className={`block text-left font-semibold mb-2 ${darkMode ? "text-gray-200" : "text-gray-700"
                }`}>
                Game PIN
              </label>
              <input
                id="pin"
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter game PIN"
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4 ${darkMode
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border border-gray-300 text-gray-900"
                  }`}
                disabled={loading}
              />

              <button
                onClick={handleConnect}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? "Connecting..." : "Connect to Game"}
              </button>

              {status && (
                <div className={`mt-4 p-3 rounded-lg ${status.includes("Error")
                  ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                  : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                  }`}>
                  {status}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`rounded-lg shadow-xl p-4 ${darkMode ? "bg-gray-800/90 text-white" : "bg-white/90 text-gray-900"
                }`}>
                <p className="text-lg font-semibold">{status}</p>
                <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Press Ctrl+Q to copy question and answers
                </p>
              </div>

              {currentQuestion && (
                <div className={`rounded-lg shadow-2xl p-8 ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
                  }`}>
                  {/* Question Section - Easy to select and copy */}
                  <div className="mb-8">
                    <div className={`p-6 rounded-lg mb-4 border-2 ${darkMode
                      ? "bg-gray-700 border-purple-500"
                      : "bg-purple-50 border-purple-300"
                      }`}>
                      <h2 className={`text-3xl font-bold mb-2 select-all ${darkMode ? "text-white" : "text-gray-800"
                        }`}>
                        {currentQuestion.question}
                      </h2>
                    </div>
                    <button
                      onClick={copyAll}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
                    >
                      📋 Copy All (Ctrl+Q)
                    </button>
                  </div>

                  {/* Answers Section - Easy to select and copy */}
                  <div className="space-y-3 mb-6">
                    <h3 className={`text-xl font-semibold mb-4 ${darkMode ? "text-gray-200" : "text-gray-700"
                      }`}>
                      Answers:
                    </h3>
                    {currentQuestion.answers.map((answer, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-5 rounded-lg border-2 ${darkMode
                          ? "bg-gray-700 border-gray-600 hover:border-green-500"
                          : "bg-gray-50 border-gray-200 hover:border-green-400"
                          } transition-colors`}
                      >
                        <span className={`text-lg font-medium select-all ${darkMode ? "text-white" : "text-gray-800"
                          }`}>
                          {index + 1}. {answer.text}
                        </span>
                        <button
                          onClick={() => copyToClipboard(answer.text, `answer ${index + 1}`)}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors font-semibold ml-4"
                        >
                          📋 Copy
                        </button>
                      </div>
                    ))}
                  </div>

                  {copyStatus && (
                    <div className={`mt-4 p-3 rounded-lg ${darkMode
                      ? "bg-green-900 text-green-200"
                      : "bg-green-100 text-green-700"
                      }`}>
                      ✓ {copyStatus}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
