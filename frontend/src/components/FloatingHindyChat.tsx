import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  X, 
  Sparkles, 
  User, 
  Activity
} from 'lucide-react';
import hindyRobot from '../assets/hindy_robot_base.png';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface FloatingHindyChatProps {
  alertId: string;
  alertTitle?: string;
  analysisState?: 'red' | 'yellow' | 'green';
}

export const FloatingHindyChat: React.FC<FloatingHindyChatProps> = ({
  alertId,
  alertTitle,
  analysisState,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset conversation when alertId changes
  useEffect(() => {
    setMessages([
      {
        id: 'initial',
        role: 'assistant',
        content: `Hello! I'm Hindy, your SOC reasoning assistant. I am focused specifically on investigating ${alertId}. Ask me about this alert, why historical memories apply, or key signal differences.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setChatError(null);
    setInputMessage('');
  }, [alertId]);

  const quickQuestions = [
    'Why did you reach this assessment?',
    'What makes this different from past cases?',
    'What should I check next?',
    'Could this activity be legitimate?',
  ];

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSending || !alertId) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);
    setChatError(null);

    try {
      const response = await fetch(`/api/chat/${alertId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Hindy can't access the investigation context right now.");
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || "I don't have enough evidence in this investigation to confirm that.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setChatError(err.message || "Hindy can't access the investigation context right now.");
      const errorMsg: ChatMessage = {
        id: `assistant-err-${Date.now()}`,
        role: 'assistant',
        content: err.message || "Hindy can't access the investigation context right now.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* ========================================================= */}
      {/* 1. FLOATING HINDY MASCOT BUTTON (Bottom-Right) */}
      {/* ========================================================= */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111321]/90 hover:bg-[#181B2E] border border-[#C8FF35]/40 text-xs font-mono text-[#C8FF35] shadow-[0_0_15px_rgba(200,255,53,0.15)] transition-all cursor-pointer backdrop-blur-md animate-pulse"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask Hindy about {alertId}</span>
          </button>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Hindy Investigation Chat"
          className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#111321] to-[#0A0C16] border-2 border-[#C8FF35]/50 hover:border-[#C8FF35] shadow-[0_0_25px_rgba(200,255,53,0.3)] hover:shadow-[0_0_35px_rgba(200,255,53,0.5)] active:scale-95 transition-all flex items-center justify-center cursor-pointer group overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-[#C8FF35]/10 group-hover:bg-[#C8FF35]/20 transition-colors" />

          {/* 3D Hindy Mascot Avatar with floating animation */}
          <img
            src={hindyRobot}
            alt="Hindy"
            className="w-11 h-11 object-contain filter drop-shadow-[0_0_8px_rgba(200,255,53,0.5)] transform group-hover:scale-110 transition-transform duration-300 animate-[float_4s_ease-in-out_infinite]"
          />

          {/* Online Active Indicator Dot */}
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#C8FF35] border-2 border-[#090B16] shadow-[0_0_6px_#C8FF35]" />
        </button>
      </div>

      {/* ========================================================= */}
      {/* 2. COMPACT INVESTIGATION CHAT PANEL */}
      {/* ========================================================= */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-96 h-[520px] max-h-[80vh] bg-[#111321]/95 border border-[#B8A7FF]/25 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          {/* Header */}
          <div className="p-3.5 bg-[#090B16] border-b border-[#B8A7FF]/15 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-xl bg-[#111321] border border-[#C8FF35]/40 flex items-center justify-center overflow-hidden shrink-0">
                <img src={hindyRobot} alt="Hindy" className="w-7 h-7 object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs font-bold text-[#F5F3FF]">Ask Hindy about this alert.</h3>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30">
                    {alertId}
                  </span>
                  {analysisState && (
                    <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded uppercase font-bold ${
                      analysisState === 'red' ? 'bg-rose-500/20 text-rose-300' :
                      analysisState === 'yellow' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {analysisState === 'red' ? 'HIGH RISK' : analysisState === 'yellow' ? 'MODERATE' : 'BENIGN'}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#9D9BB6] font-mono truncate">
                  {alertTitle ? alertTitle : 'Focused on this investigation only.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-[#9D9BB6] hover:text-[#F5F3FF] hover:bg-[#181B2E] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {chatError && (
            <div className="px-3 py-1.5 bg-rose-950/60 border-b border-rose-500/30 text-[10px] font-mono text-rose-300">
              Notice: {chatError}
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-lg bg-[#090B16] border border-[#C8FF35]/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3 text-[#C8FF35]" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] p-3 rounded-2xl leading-relaxed ${
                      isUser
                        ? 'bg-[#1D2038] text-[#F5F3FF] border border-[#B8A7FF]/30 rounded-tr-none'
                        : 'bg-[#090B16] text-slate-200 border border-[#B8A7FF]/15 rounded-tl-none font-sans'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-[11px] sm:text-xs">
                      {msg.content}
                    </div>
                    <div className="text-[9px] text-[#9D9BB6]/60 font-mono mt-1 text-right">
                      {msg.timestamp}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-6 h-6 rounded-lg bg-[#181B2E] border border-[#B8A7FF]/20 flex items-center justify-center shrink-0 mt-0.5 text-[#B8A7FF]">
                      <User className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })}

            {isSending && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-lg bg-[#090B16] border border-[#C8FF35]/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="w-3 h-3 text-[#C8FF35] animate-spin" />
                </div>
                <div className="p-2.5 rounded-2xl bg-[#090B16] border border-[#B8A7FF]/15 rounded-tl-none text-[11px] font-mono text-[#9D9BB6] flex items-center gap-2">
                  <span>Hindy is checking investigation context...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggested Questions */}
          {messages.length <= 2 && !isSending && (
            <div className="p-2 bg-[#090B16]/90 border-t border-[#B8A7FF]/10 space-y-1">
              <div className="text-[10px] font-mono text-[#9D9BB6] px-1">SUGGESTED QUESTIONS:</div>
              <div className="flex flex-wrap gap-1.5">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(q)}
                    className="px-2 py-1 rounded-lg bg-[#111321] hover:bg-[#181B2E] border border-[#B8A7FF]/15 hover:border-[#C8FF35]/40 text-[10px] text-slate-300 hover:text-[#C8FF35] transition-all text-left cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-[#090B16] border-t border-[#B8A7FF]/15 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about this alert or evidence..."
              disabled={isSending}
              className="flex-1 px-3 py-2 bg-[#111321] border border-[#B8A7FF]/20 rounded-xl text-xs text-[#F5F3FF] placeholder-[#9D9BB6]/40 focus:outline-none focus:border-[#C8FF35] font-mono transition-all disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={isSending || !inputMessage.trim()}
              className="p-2 rounded-xl bg-[#C8FF35] hover:bg-[#d6ff52] disabled:opacity-30 disabled:cursor-not-allowed text-[#090B16] transition-all cursor-pointer shadow-[0_0_12px_rgba(200,255,53,0.3)] active:scale-95"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
