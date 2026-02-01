import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage } from '../../services/chat.service';
import type { ChatMessage } from '../../services/ai'; // Re-use type or import from chat.service if unified

export const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  // useLocation removed as context is now backend-driven

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleOpen = () => setIsOpen(!isOpen);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: inputValue };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Backend handles context building now
      const response = await sendChatMessage(inputValue, sessionId);

      // Save session ID for continuity
      if (response.sessionId && !sessionId) {
        setSessionId(response.sessionId);
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Assistant Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again later.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-bottom-4 mb-4 flex h-[500px] w-[350px] flex-col overflow-hidden rounded-2xl border border-white/20 bg-slate-900/90 shadow-2xl backdrop-blur-xl duration-300 sm:w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <h3 className="text-sm font-bold text-white">AI Assistant</h3>
                <p className="text-[10px] text-white/50">
                  Powered by Vertex AI
                </p>
              </div>
            </div>
            <button
              onClick={toggleOpen}
              className="rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Messages Container */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto scroll-smooth p-4"
          >
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center space-y-3 p-6 text-center">
                <div className="text-4xl">✨</div>
                <p className="text-sm text-white/70">
                  Hi! I'm your AI financial assistant. How can I help you today?
                </p>
                <div className="mt-4 grid w-full grid-cols-1 gap-2">
                  {[
                    "What's my total debt?",
                    'Analyze my credit card utilization',
                    'When is my next bill due?',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInputValue(suggestion)}
                      className="rounded-lg border border-white/10 bg-white/5 p-2 text-left text-xs text-white/60 transition-all hover:bg-white/10 hover:text-white"
                    >
                      "{suggestion}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'rounded-tr-none bg-blue-600 text-white'
                      : 'rounded-tl-none border border-white/10 bg-white/10 text-white/90'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-tl-none border border-white/10 bg-white/10 px-4 py-2">
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:0.2s]" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-white/10 bg-white/5 p-4">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
                placeholder="Ask me anything..."
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 pr-10 text-sm text-white transition-all placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <button
                onClick={() => void handleSend()}
                disabled={isLoading || !inputValue.trim()}
                className="absolute right-2 p-1.5 text-blue-400 transition-colors hover:text-blue-300 disabled:text-white/20"
                aria-label="Send message"
              >
                <span className="text-xl">↗️</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggleOpen}
        className={`group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-blue-500/25 active:scale-95 ${
          isOpen ? 'rotate-90' : 'hover:rotate-12'
        }`}
        aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
      >
        <span className="text-2xl transition-transform group-hover:scale-110">
          {isOpen ? '✕' : '🤖'}
        </span>

        {/* Glow effect */}
        {!isOpen && (
          <div className="absolute inset-0 -z-10 animate-ping rounded-full bg-blue-400/20 opacity-0 group-hover:opacity-100" />
        )}
      </button>
    </div>
  );
};
