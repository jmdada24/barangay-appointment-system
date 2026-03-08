"use client";

import { useState, useEffect, useRef } from "react";
import { sendChatMessage, getChatbotGreeting } from "@/actions/chatbot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  AlertCircle,
  GripHorizontal,
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

interface Position {
  x: number;
  y: number;
}

const MAX_USER_TURNS = 15;

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const userTurns = messages.filter((m) => m.role === "user").length;
  const limitReached = userTurns >= MAX_USER_TURNS;

  function closeAndReset() {
    setIsOpen(false);
    setMessages([]);
    setInput("");
    setError(null);
    setLoading(false);
  }

  // Initialize position on mount (right side)
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (mobile) {
        const centerX = (window.innerWidth - 340) / 2;
        const topY = window.innerHeight - 620;
        setPosition({ x: centerX, y: topY });
      } else {
        const rightX = window.innerWidth - 420;
        const topY = 20;
        setPosition({ x: rightX, y: topY });
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load greeting when opening
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadGreeting();
    }
  }, [isOpen, messages.length]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;

      const maxX = window.innerWidth - (isMobile ? 340 : 400);
      const maxY = window.innerHeight - (isMobile ? 620 : 600);

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, isMobile]);

  function handleDragStart(e: React.MouseEvent) {
    if (!dragRef.current) return;
    const rect = dragRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
  }

  async function loadGreeting() {
    setLoading(true);
    const result = await getChatbotGreeting();
    if (result.success && result.data) {
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content: result.data.response,
          timestamp: new Date(),
        },
      ]);
    }
    setLoading(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();

    if (!input.trim() || loading) return;

    if (limitReached) {
      setMessages((prev) => [
        ...prev,
        {
          id: `limit-${Date.now()}`,
          role: "assistant",
          content:
            "You have reached the maximum of 15 questions for this chat session. Please refresh the page or close and reopen the chatbot to start a new session.",
          timestamp: new Date(),
        },
      ]);
      setInput("");
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setError(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        content: msg.content,
      }));

      const result = await sendChatMessage(userMessage, history);

      if (result.success && result.data) {
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.data.response,
          timestamp: new Date(result.data.timestamp),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setError(result.error || "Failed to get response");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  // Floating button (closed)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-br from-[#062E24] to-[#0a4a38] hover:from-[#051f1a] hover:to-[#082f26] text-white rounded-full p-3 sm:p-4 shadow-xl hover:shadow-2xl transition-all z-40 flex items-center justify-center"
        title="Open Chatbot"
      >
        <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
    );
  }

  // Chat window
  return (
    <div
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMobile ? "340px" : "400px",
        height: isMobile ? "500px" : "600px",
      }}
      className="bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden"
    >
      {/* Draggable Header */}
      <div
        ref={dragRef}
        onMouseDown={handleDragStart}
        className="bg-gradient-to-r from-[#062E24] to-[#0a4a38] text-white p-3 sm:p-4 rounded-t-xl flex items-center justify-between cursor-grab active:cursor-grabbing group shrink-0"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GripHorizontal className="h-4 w-4 opacity-60 group-hover:opacity-100 transition shrink-0" />
          <div className="min-w-0">
            <h3 className="font-semibold text-xs sm:text-sm truncate">Barangay Assistant</h3>
            <p className="text-xs text-green-100 truncate">
              Ask about our services ({Math.max(0, MAX_USER_TURNS - userTurns)} left)
            </p>
          </div>
        </div>
        <button onClick={closeAndReset} className="hover:bg-white/20 p-1 rounded transition shrink-0 ml-2">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Start a conversation...</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 text-xs sm:text-sm break-words ${
                    message.role === "user"
                      ? "bg-[#062E24] text-white rounded-br-none"
                      : "bg-gray-200 text-gray-900 rounded-bl-none"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-900 rounded-lg rounded-bl-none px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-start">
                <div className="bg-red-100 text-red-700 rounded-lg rounded-bl-none px-3 py-2 flex items-center gap-2 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  <span>{error}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t bg-white rounded-b-xl flex gap-2 shrink-0">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={limitReached ? "Chat limit reached. Close to reset." : "Ask a question..."}
          disabled={loading || limitReached}
          className="text-xs sm:text-sm h-8 sm:h-9"
        />
        <Button
          type="submit"
          disabled={loading || limitReached || !input.trim()}
          size="icon"
          className="bg-[#062E24] hover:bg-[#051f1a] h-8 w-8 sm:h-9 sm:w-9 shrink-0"
        >
          {loading ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Send className="h-3 w-3 sm:h-4 sm:w-4" />}
        </Button>
      </form>
    </div>
  );
}