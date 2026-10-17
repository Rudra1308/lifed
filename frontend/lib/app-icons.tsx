import React from "react";
import {
  Globe,
  Code2,
  Terminal,
  FileText,
  Bot,
  Brain,
  Music,
  MessageSquare,
  MessageCircle,
  Palette,
  Gamepad2,
  Sparkles,
  AppWindow,
  Compass,
} from "lucide-react";

export interface AppMetadata {
  displayName: string;
  category: "browser" | "development" | "productivity" | "ai" | "communication" | "media" | "system";
  color: string;
  bgColor: string;
  icon: (props: { className?: string }) => React.ReactElement;
}

export function getAppMetadata(processName?: string, title?: string): AppMetadata {
  const p = (processName || "").toLowerCase();
  const t = (title || "").toLowerCase();

  if (p.includes("brave")) {
    return {
      displayName: "Brave Browser",
      category: "browser",
      color: "text-orange-400",
      bgColor: "bg-orange-500/15 border-orange-500/30",
      icon: (props) => <Compass {...props} />,
    };
  }

  if (p.includes("chrome")) {
    return {
      displayName: "Google Chrome",
      category: "browser",
      color: "text-blue-400",
      bgColor: "bg-blue-500/15 border-blue-500/30",
      icon: (props) => <Globe {...props} />,
    };
  }

  if (p.includes("msedge") || p.includes("edge")) {
    return {
      displayName: "Microsoft Edge",
      category: "browser",
      color: "text-teal-400",
      bgColor: "bg-teal-500/15 border-teal-500/30",
      icon: (props) => <Globe {...props} />,
    };
  }

  if (p.includes("code") || p.includes("cursor") || p.includes("devenv")) {
    return {
      displayName: "VS Code",
      category: "development",
      color: "text-sky-400",
      bgColor: "bg-sky-500/15 border-sky-500/30",
      icon: (props) => <Code2 {...props} />,
    };
  }

  if (p.includes("terminal") || p.includes("powershell") || p.includes("cmd")) {
    return {
      displayName: "Terminal",
      category: "development",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/15 border-emerald-500/30",
      icon: (props) => <Terminal {...props} />,
    };
  }

  if (p.includes("notion") || p.includes("obsidian")) {
    return {
      displayName: p.includes("obsidian") ? "Obsidian" : "Notion",
      category: "productivity",
      color: "text-violet-400",
      bgColor: "bg-violet-500/15 border-violet-500/30",
      icon: (props) => <FileText {...props} />,
    };
  }

  if (p.includes("chatgpt")) {
    return {
      displayName: "ChatGPT",
      category: "ai",
      color: "text-emerald-300",
      bgColor: "bg-emerald-500/15 border-emerald-500/30",
      icon: (props) => <Bot {...props} />,
    };
  }

  if (p.includes("ollama")) {
    return {
      displayName: "Ollama (Local AI)",
      category: "ai",
      color: "text-amber-400",
      bgColor: "bg-amber-500/15 border-amber-500/30",
      icon: (props) => <Brain {...props} />,
    };
  }

  if (p.includes("spotify")) {
    return {
      displayName: "Spotify",
      category: "media",
      color: "text-green-400",
      bgColor: "bg-green-500/15 border-green-500/30",
      icon: (props) => <Music {...props} />,
    };
  }

  if (p.includes("discord") || p.includes("slack")) {
    return {
      displayName: p.includes("slack") ? "Slack" : "Discord",
      category: "communication",
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/15 border-indigo-500/30",
      icon: (props) => <MessageSquare {...props} />,
    };
  }

  if (p.includes("whatsapp") || p.includes("telegram")) {
    return {
      displayName: p.includes("telegram") ? "Telegram" : "WhatsApp",
      category: "communication",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/15 border-emerald-500/30",
      icon: (props) => <MessageCircle {...props} />,
    };
  }

  if (p.includes("figma")) {
    return {
      displayName: "Figma",
      category: "productivity",
      color: "text-rose-400",
      bgColor: "bg-rose-500/15 border-rose-500/30",
      icon: (props) => <Palette {...props} />,
    };
  }

  if (p.includes("steam")) {
    return {
      displayName: "Steam",
      category: "media",
      color: "text-sky-300",
      bgColor: "bg-sky-500/15 border-sky-500/30",
      icon: (props) => <Gamepad2 {...props} />,
    };
  }

  if (p.includes("electron") || p.includes("lifed")) {
    return {
      displayName: "Lifed Core",
      category: "ai",
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/15 border-cyan-500/30",
      icon: (props) => <Sparkles {...props} />,
    };
  }

  // Fallback
  const fallbackName = processName
    ? processName.charAt(0).toUpperCase() + processName.slice(1)
    : "Desktop App";

  return {
    displayName: fallbackName,
    category: "system",
    color: "text-zinc-400",
    bgColor: "bg-zinc-800/40 border-zinc-700/40",
    icon: (props) => <AppWindow {...props} />,
  };
}
