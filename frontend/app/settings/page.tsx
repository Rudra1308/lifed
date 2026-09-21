"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Bell,
  Sparkles,
  Send,
  MessageSquare,
  Mail,
  Smartphone,
  Flame,
} from "lucide-react";
import { api, SettingsData, NotificationSettingsData } from "@/lib/api";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("anthropic/claude-3.5-sonnet");
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Notification Settings State
  const [notifSettings, setNotifSettings] = useState<NotificationSettingsData>({
    enabled: false,
    channel: "telegram",
    time: "08:00",
    telegram_bot_token: "",
    telegram_chat_id: "",
    discord_webhook_url: "",
    whatsapp_phone: "",
    whatsapp_apikey: "",
    webhook_url: "",
    email_to: "",
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_user: "",
    smtp_pass: "",
    example_quote: "The impediment to action advances action. What stands in the way becomes the way. — Marcus Aurelius",
    quote_theme: "Stoic resilience, focus, and relentless momentum",
    include_tasks: true,
    include_projects: true,
    include_goals: true,
    include_quote: true,
  });

  const [notifStatus, setNotifStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [notifMessage, setNotifMessage] = useState("");
  const [previewQuoteText, setPreviewQuoteText] = useState("");
  const [previewingQuote, setPreviewingQuote] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      const storedKey = localStorage.getItem("lifed_api_key");
      const storedModel = localStorage.getItem("lifed_model");
      if (storedKey) setApiKey(storedKey);
      if (storedModel) setModel(storedModel);
      else if (data.current_model) setModel(data.current_model);
    } catch {
      // Backend may be starting
    }

    try {
      const notifData = await api.getNotificationSettings();
      if (notifData) {
        setNotifSettings(notifData);
      }
    } catch {
      // Backend may be starting
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveAISettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      if (apiKey.trim()) {
        localStorage.setItem("lifed_api_key", apiKey.trim());
      } else {
        localStorage.removeItem("lifed_api_key");
      }
      localStorage.setItem("lifed_model", model.trim());

      const res = await api.updateSettings({
        openrouter_api_key: apiKey.trim() || undefined,
        model: model.trim() || undefined,
      });

      setSettings(res);
      setStatus("success");
      setMessage("Configuration updated successfully!");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Failed to save configuration");
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifStatus("saving");
    try {
      const updated = await api.updateNotificationSettings(notifSettings);
      setNotifSettings(updated);
      setNotifStatus("success");
      setNotifMessage("Notification settings saved successfully!");
      setTimeout(() => setNotifStatus("idle"), 3000);
    } catch (err: any) {
      setNotifStatus("error");
      setNotifMessage(err.message || "Failed to save notification settings");
    }
  };

  const handlePreviewQuote = async () => {
    setPreviewingQuote(true);
    try {
      const res = await api.previewMotivationalQuote({
        example_quote: notifSettings.example_quote,
        quote_theme: notifSettings.quote_theme,
      });
      setPreviewQuoteText(res.quote);
    } catch (err: any) {
      setPreviewQuoteText("Failed to preview quote: " + (err.message || "Error"));
    } finally {
      setPreviewingQuote(false);
    }
  };

  const handleSendTestMessage = async () => {
    setSendingTest(true);
    setNotifMessage("");
    try {
      // Save settings first so backend uses current values
      await api.updateNotificationSettings(notifSettings);
      const res = await api.sendTestNotification(notifSettings.channel);
      setNotifStatus("success");
      setNotifMessage(`Test message sent via ${notifSettings.channel.toUpperCase()}! Check your app.`);
      setTimeout(() => setNotifStatus("idle"), 4000);
    } catch (err: any) {
      setNotifStatus("error");
      setNotifMessage("Test failed: " + (err.message || "Verify your credentials."));
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <AppShell
      title="System Settings"
      subtitle="AI Configuration & Free Automated Notifications"
      matrixMode="focus"
    >
      <div className="max-w-3xl space-y-6">
        {/* Morning Automated Notifications Card (100% Free) */}
        <Card className="border-primary/50 shadow-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle>Morning Automated Brief (100% Free)</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="success">100% FREE</Badge>
                <Badge variant={notifSettings.enabled ? "success" : "secondary"}>
                  {notifSettings.enabled ? "ACTIVE SCHEDULE" : "PAUSED"}
                </Badge>
              </div>
            </div>
            <CardDescription>
              Receive your pending tasks, active projects, goals reminder, and a personalized motivational quote every morning at $0 cost.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveNotifications} className="space-y-5">
              {/* Enable Toggle & Morning Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-lg border border-border/60 bg-secondary/20">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="notif_enabled"
                    checked={notifSettings.enabled}
                    onChange={(e) =>
                      setNotifSettings({ ...notifSettings, enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <label htmlFor="notif_enabled" className="text-xs font-mono font-medium cursor-pointer">
                    Enable Morning Push Notification
                  </label>
                </div>

                <div className="flex items-center space-x-2 justify-start sm:justify-end">
                  <label className="text-xs font-mono text-muted-foreground">Morning Time:</label>
                  <input
                    type="time"
                    value={notifSettings.time}
                    onChange={(e) =>
                      setNotifSettings({ ...notifSettings, time: e.target.value })
                    }
                    className="h-8 rounded-md border border-border/70 bg-background px-2.5 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Delivery Channel Selector */}
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Delivery Channel
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "telegram", label: "Telegram Bot", desc: "Recommended", icon: Smartphone },
                    { id: "discord", label: "Discord", desc: "Webhook", icon: MessageSquare },
                    { id: "whatsapp", label: "WhatsApp", desc: "n8n / Gateway", icon: MessageSquare },
                    { id: "email", label: "Email (SMTP)", desc: "Direct Inbox", icon: Mail },
                  ].map((ch) => {
                    const Icon = ch.icon;
                    const isSelected = notifSettings.channel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() =>
                          setNotifSettings({ ...notifSettings, channel: ch.id as any })
                        }
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground shadow-xs"
                            : "border-border/60 bg-card/40 hover:bg-accent text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 font-semibold text-xs text-foreground">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                          <span>{ch.label}</span>
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{ch.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Channel-Specific Configuration */}
              <div className="p-4 rounded-lg border border-border/60 bg-card/60 space-y-3">
                {notifSettings.channel === "telegram" && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-primary font-semibold">
                        Telegram Bot Configuration
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        100% Free Forever • Instant Push
                      </span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                        Telegram Bot Token
                      </label>
                      <Input
                        type="password"
                        placeholder="e.g. 123456789:ABCdefGHIjklMNOpqrs..."
                        value={notifSettings.telegram_bot_token || ""}
                        onChange={(e) =>
                          setNotifSettings({ ...notifSettings, telegram_bot_token: e.target.value })
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                        Telegram Chat ID
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. 987654321"
                        value={notifSettings.telegram_chat_id || ""}
                        onChange={(e) =>
                          setNotifSettings({ ...notifSettings, telegram_chat_id: e.target.value })
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-2 pt-1 text-[11px] font-mono text-muted-foreground leading-relaxed">
                      <div className="bg-secondary/30 p-2.5 rounded border border-border/40 space-y-1">
                        <p className="font-semibold text-foreground flex items-center space-x-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-primary" />
                          <span>Interactive Two-Way Assistant Enabled:</span>
                        </p>
                        <p>
                          Once configured, you can text this bot from your phone to manage Lifed on the go:
                        </p>
                        <div className="grid grid-cols-2 gap-1 text-[10px] pt-1">
                          <code>/tasks — View pending tasks</code>
                          <code>/done &lt;id&gt; — Complete task/project</code>
                          <code>/projects — Active projects</code>
                          <code>/goals — Strategic goals</code>
                          <code>/brief — Today's brief</code>
                          <code>/quote — Fresh motivation</code>
                        </div>
                        <p className="pt-1 text-[10px] text-muted-foreground">
                          💬 Or chat naturally: <i>"Add task finish presentation urgent"</i> or <i>"Mark project 3.0 completed"</i>.
                        </p>
                      </div>

                      <div className="bg-secondary/30 p-2.5 rounded border border-border/40 space-y-1">
                        <p className="font-semibold text-foreground">
                          ☁️ Morning Briefs While Laptop Is Turned Off (GitHub Actions):
                        </p>
                        <p>
                          Go to your GitHub Repository → <b>Settings</b> → <b>Secrets and variables</b> → <b>Actions</b> → add:
                        </p>
                        <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                          <li><code>TELEGRAM_BOT_TOKEN</code> (your bot token from @BotFather)</li>
                          <li><code>TELEGRAM_CHAT_ID</code> (your chat ID from @userinfobot)</li>
                          <li><code>GEMINI_API_KEY</code> (optional, for free cloud AI quote generation)</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {notifSettings.channel === "discord" && (
                  <>
                    <span className="text-xs font-mono text-primary font-semibold block">
                      Discord Webhook Configuration
                    </span>
                    <div>
                      <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                        Discord Webhook URL
                      </label>
                      <Input
                        type="password"
                        placeholder="https://discord.com/api/webhooks/..."
                        value={notifSettings.discord_webhook_url || ""}
                        onChange={(e) =>
                          setNotifSettings({
                            ...notifSettings,
                            discord_webhook_url: e.target.value,
                          })
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground bg-secondary/30 p-2 rounded border border-border/40">
                      💡 <b>Setup:</b> In Discord, go to Server Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL.
                    </p>
                  </>
                )}

                {notifSettings.channel === "whatsapp" && (
                  <>
                    <span className="text-xs font-mono text-primary font-semibold block">
                      WhatsApp & n8n Automation
                    </span>
                    <div>
                      <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                        n8n or Custom Webhook URL (Recommended)
                      </label>
                      <Input
                        type="text"
                        placeholder="http://localhost:5678/webhook/morning-brief"
                        value={notifSettings.webhook_url || ""}
                        onChange={(e) =>
                          setNotifSettings({ ...notifSettings, webhook_url: e.target.value })
                        }
                        className="font-mono text-xs"
                      />
                      <p className="text-[10px] font-mono text-muted-foreground mt-1">
                        Pings your local n8n workflow with the JSON brief so n8n can dispatch to WhatsApp.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-border/40">
                      <p className="text-xs font-mono text-muted-foreground mb-2">
                        Or use CallMeBot Free WhatsApp API:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                            Phone (+CountryCode)
                          </label>
                          <Input
                            type="text"
                            placeholder="+1234567890"
                            value={notifSettings.whatsapp_phone || ""}
                            onChange={(e) =>
                              setNotifSettings({
                                ...notifSettings,
                                whatsapp_phone: e.target.value,
                              })
                            }
                            className="font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                            CallMeBot API Key
                          </label>
                          <Input
                            type="password"
                            placeholder="API Key"
                            value={notifSettings.whatsapp_apikey || ""}
                            onChange={(e) =>
                              setNotifSettings({
                                ...notifSettings,
                                whatsapp_apikey: e.target.value,
                              })
                            }
                            className="font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {notifSettings.channel === "email" && (
                  <>
                    <span className="text-xs font-mono text-primary font-semibold block">
                      Free Standard SMTP Email
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                          Recipient Email
                        </label>
                        <Input
                          type="email"
                          placeholder="you@gmail.com"
                          value={notifSettings.email_to || ""}
                          onChange={(e) =>
                            setNotifSettings({ ...notifSettings, email_to: e.target.value })
                          }
                          className="font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                          SMTP Host
                        </label>
                        <Input
                          type="text"
                          placeholder="smtp.gmail.com"
                          value={notifSettings.smtp_host || ""}
                          onChange={(e) =>
                            setNotifSettings({ ...notifSettings, smtp_host: e.target.value })
                          }
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                          SMTP Username (Sender Email)
                        </label>
                        <Input
                          type="text"
                          placeholder="your-bot@gmail.com"
                          value={notifSettings.smtp_user || ""}
                          onChange={(e) =>
                            setNotifSettings({ ...notifSettings, smtp_user: e.target.value })
                          }
                          className="font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                          SMTP Password / App Password
                        </label>
                        <Input
                          type="password"
                          placeholder="Google App Password (16 chars)"
                          value={notifSettings.smtp_pass || ""}
                          onChange={(e) =>
                            setNotifSettings({ ...notifSettings, smtp_pass: e.target.value })
                          }
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground bg-secondary/30 p-2 rounded border border-border/40">
                      💡 <b>Gmail Note:</b> Generate a free App Password at <code>myaccount.google.com/apppasswords</code> to send emails securely.
                    </p>
                  </>
                )}
              </div>

              {/* Editable Motivational Quote Engine */}
              <div className="p-4 rounded-lg border border-border/60 bg-secondary/10 space-y-3">
                <div className="flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">
                    Personalized Motivational Quote Engine
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Give Lifed an example quote you love. The AI will synthesize new, original quotes in the exact same style, tone, and philosophy every morning.
                </p>

                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                    Example Quote / Style Reference
                  </label>
                  <textarea
                    rows={2}
                    value={notifSettings.example_quote || ""}
                    onChange={(e) =>
                      setNotifSettings({ ...notifSettings, example_quote: e.target.value })
                    }
                    placeholder="e.g. The man who loves walking will walk further than the man who loves the destination."
                    className="w-full rounded-md border border-border/70 bg-background p-2.5 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                    Philosophy & Vibe
                  </label>
                  <Input
                    type="text"
                    value={notifSettings.quote_theme || ""}
                    onChange={(e) =>
                      setNotifSettings({ ...notifSettings, quote_theme: e.target.value })
                    }
                    placeholder="e.g. Stoic resilience, grit, deep technical focus, momentum"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePreviewQuote}
                    disabled={previewingQuote}
                    className="text-xs font-mono"
                  >
                    <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${previewingQuote ? "animate-spin" : "text-amber-500"}`} />
                    <span>{previewingQuote ? "Generating..." : "Preview AI Quote"}</span>
                  </Button>

                  <span className="text-[10px] font-mono text-muted-foreground">
                    Uses free Gemini / Ollama / OpenRouter
                  </span>
                </div>

                {previewQuoteText && (
                  <div className="p-3 rounded-md bg-background/80 border border-primary/30 text-xs font-sans italic text-foreground leading-relaxed mt-2">
                    💡 {previewQuoteText}
                  </div>
                )}
              </div>

              {/* Status Message */}
              {notifMessage && (
                <div
                  className={`flex items-center space-x-2 text-xs font-mono p-3 rounded-lg border ${
                    notifStatus === "error"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  }`}
                >
                  {notifStatus === "error" ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>{notifMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestMessage}
                  disabled={sendingTest}
                  className="text-xs font-mono"
                >
                  <Send className={`w-3.5 h-3.5 mr-1.5 ${sendingTest ? "animate-pulse text-primary" : ""}`} />
                  <span>{sendingTest ? "Sending Test..." : "Send Test Digest Now"}</span>
                </Button>

                <Button type="submit" size="sm" disabled={notifStatus === "saving"}>
                  {notifStatus === "saving" ? "Saving..." : "Save Notification Settings"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* OpenRouter AI Model Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-primary" />
                <CardTitle>OpenRouter AI Gateway</CardTitle>
              </div>
              <Badge variant={settings?.has_api_key ? "success" : "warning"}>
                {settings?.has_api_key
                  ? `Active (${settings.api_key_source.toUpperCase()})`
                  : "Key Required"}
              </Badge>
            </div>
            <CardDescription>
              Configure model access for autonomous tools, planning, and contextual chat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveAISettings} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  OpenRouter API Key
                </label>
                <Input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] font-mono text-muted-foreground mt-1.5">
                  Stored securely in your local environment and browser session. Never committed or sent externally.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Active Model
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {[
                    "anthropic/claude-3.5-sonnet",
                    "google/gemini-2.0-flash-001",
                    "openai/gpt-4o-mini",
                    "meta-llama/llama-3.3-70b-instruct",
                  ].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModel(m)}
                      className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-colors ${
                        model === m
                          ? "border-primary bg-primary text-primary-foreground font-semibold"
                          : "border-border/60 hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {message && (
                <div
                  className={`flex items-center space-x-2 text-xs font-mono p-3 rounded-lg border ${
                    status === "error"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  }`}
                >
                  {status === "error" ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>{message}</span>
                </div>
              )}

              <Button type="submit" disabled={status === "saving"}>
                {status === "saving" ? "Saving..." : "Save AI Configuration"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Local Storage & Security Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <CardTitle>Local Storage & Privacy</CardTitle>
            </div>
            <CardDescription>
              Local-first architecture ensuring personal data remains on your machine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Database Engine:</span>
              <span className="text-foreground">SQLite 3 (Local-First)</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Database Target:</span>
              <span className="text-foreground">{settings?.database_url || "sqlite:///./lifed.db"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Semantic Embeddings:</span>
              <span className="text-foreground">Local ONNX Python Engine</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Git Privacy Status:</span>
              <span className="text-emerald-500 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Protected by .gitignore</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}