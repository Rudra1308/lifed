"use client";

import React, { useState, useRef, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  User,
  Send,
  Sparkles,
  Terminal,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Zap,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

interface ToolExecution {
  name: string;
  arguments: any;
  result: any;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolExecution[];
  timestamp: string;
}

const SUGGESTED_PROMPTS = [
  "What should I work on today?",
  "Remember that I prefer technical work in the morning",
  "Add finishing the memory system to my Lifed tasks",
  "Show my current high-level goals",
];

function ToolCallCard({ tool }: { tool: ToolExecution }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-2 rounded-lg border border-border/60 bg-muted/30 p-2.5 font-mono text-xs">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold text-foreground">TOOL CALL: {tool.name}</span>
          <Badge variant="success" className="text-[10px] py-0 px-1.5">
            EXECUTED
          </Badge>
        </div>
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-border/40 space-y-2 text-[11px]">
          <div>
            <span className="text-muted-foreground">Arguments:</span>
            <pre className="mt-0.5 p-1.5 rounded bg-background/50 text-foreground overflow-x-auto">
              {JSON.stringify(tool.arguments, null, 2)}
            </pre>
          </div>
          <div>
            <span className="text-muted-foreground">Result:</span>
            <pre className="mt-0.5 p-1.5 rounded bg-background/50 text-foreground overflow-x-auto">
              {JSON.stringify(tool.result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content:
        "Hello, I am Lifed â€” your personal AI command center. I have direct access to your tasks, goals, memories, and daily schedule. How can I assist your focus today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await apiRequest<any>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: textToSend.trim() }),
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.reply,
        toolCalls: res.tool_calls,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error communicating with AI: ${err.message || "Failed to reach backend"}. Ensure backend is running and OpenRouter key is set.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="AI Command Assistant"
      subtitle="Context-Aware Tool Calling & Natural Language Planning"
      matrixMode="conversational"
    >
      <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-4xl mx-auto space-y-4">
        {/* Messages Feed */}
        <Card className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-card/75 backdrop-blur-xl">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${
                msg.role === "user" ? "flex-row-reverse space-x-reverse" : ""
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-foreground border-border"
                }`}
              >
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-xl p-3.5 shadow-xs text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground font-sans"
                    : "border border-border/70 bg-background/60 text-foreground font-sans"
                }`}
              >
                {/* Tool Executions */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mb-2">
                    {msg.toolCalls.map((t, idx) => (
                      <ToolCallCard key={idx} tool={t} />
                    ))}
                  </div>
                )}

                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <div
                  className={`mt-1.5 font-mono text-[10px] ${
                    msg.role === "user" ? "text-primary-foreground/70 text-right" : "text-muted-foreground"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-secondary border-border text-foreground">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="rounded-xl border border-border/70 bg-background/60 p-3.5 text-xs font-mono text-muted-foreground flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span>Lifed is reasoning and orchestrating tools...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </Card>

        {/* Suggested Prompts */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="text-[11px] font-mono whitespace-nowrap px-3 py-1.5 rounded-full border border-border/60 bg-card/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <Input
            type="text"
            placeholder="Ask Lifed to plan, schedule, prioritize, or remember..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="font-sans text-sm h-11 bg-card/70 backdrop-blur-md"
          />
          <Button type="submit" disabled={loading || !input.trim()} className="h-11 px-5">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </AppShell>
  );
}