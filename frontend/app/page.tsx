"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Target,
  FolderKanban,
  CheckSquare,
  Plus,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { api, TaskItem } from "@/lib/api";
import Link from "next/link";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDashboard = async () => {
    try {
      const summary = await api.getDashboard();
      setData(summary);
    } catch {
      // Fallback demo data if backend is offline
      setData({
        greeting: "GOOD MORNING",
        date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
        top_priorities: [
          { id: "1", title: "Finish Lifed memory module", priority: "urgent", estimated_duration: 120, status: "todo" },
          { id: "2", title: "Follow up with prospects", priority: "high", estimated_duration: 45, status: "todo" },
          { id: "3", title: "NLP revision & embeddings test", priority: "medium", estimated_duration: 60, status: "todo" },
        ],
        ai_insight: "You have spent more time on client acquisition than portfolio work this week. Completing the memory module today restores velocity.",
        counts: { total_tasks: 8, pending_tasks: 6, completed_tasks: 2, active_projects: 3, active_goals: 2 },
        goals_summary: [
          { id: "g1", title: "Deploy Lifed AI Command Center", progress: 65, status: "active" },
          { id: "g2", title: "Deepen Agentic Tool Orchestration", progress: 40, status: "active" },
        ],
        active_projects: [
          { id: "p1", title: "Kinetic Matrix Visual System", status: "active" },
          { id: "p2", title: "Local Memory Engine", status: "active" },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setSubmitting(true);
    try {
      await api.createTask({
        title: newTaskTitle.trim(),
        priority: "high",
        estimated_duration: 30,
      });
      setNewTaskTitle("");
      await loadDashboard();
    } catch {
      // Offline fallback
      setData((prev: any) => ({
        ...prev,
        top_priorities: [
          { id: Date.now().toString(), title: newTaskTitle.trim(), priority: "high", estimated_duration: 30, status: "todo" },
          ...(prev?.top_priorities || []),
        ],
      }));
      setNewTaskTitle("");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "todo" : "completed";
    try {
      await api.updateTask(taskId, { status: newStatus });
      await loadDashboard();
    } catch {
      setData((prev: any) => ({
        ...prev,
        top_priorities: prev.top_priorities.map((t: any) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        ),
      }));
    }
  };

  return (
    <AppShell
      title="Daily Command Center"
      subtitle={data?.date || "Personal Decision Support"}
      matrixMode="ambient"
      showMatrixControls={true}
    >
      <div className="space-y-6">
        {/* Good Morning / Hero Greeting */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-xs font-semibold tracking-widest text-primary uppercase">
              {data?.greeting || "GOOD MORNING"}
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-sans mt-0.5">
              Command Center
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              Contextual priorities synthesized from active goals, deadlines, and schedule.
            </p>
          </div>

          {/* Quick Task Bar */}
          <form onSubmit={handleQuickAddTask} className="flex items-center space-x-2 w-full md:w-80">
            <Input
              type="text"
              placeholder="+ Quick capture task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="font-mono text-xs h-9 bg-card/60 backdrop-blur-md"
            />
            <Button type="submit" size="sm" disabled={submitting}>
              <Plus className="w-4 h-4" />
            </Button>
          </form>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Pending Tasks</p>
              <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                {data?.counts?.pending_tasks ?? 0}
              </p>
            </div>
            <CheckSquare className="w-5 h-5 text-muted-foreground/60" />
          </Card>
          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold font-mono text-emerald-500 mt-0.5">
                {data?.counts?.completed_tasks ?? 0}
              </p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-500/60" />
          </Card>
          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Active Projects</p>
              <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                {data?.counts?.active_projects ?? 0}
              </p>
            </div>
            <FolderKanban className="w-5 h-5 text-muted-foreground/60" />
          </Card>
          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Goals Tracked</p>
              <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                {data?.counts?.active_goals ?? 0}
              </p>
            </div>
            <Target className="w-5 h-5 text-muted-foreground/60" />
          </Card>
        </div>

        {/* Core Layout: Priorities & AI Insight */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Priorities Card (Takes 2 cols on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Today's Priorities</CardTitle>
                  <CardDescription>Intelligently ranked by urgency, importance, and goal impact</CardDescription>
                </div>
                <Link href="/tasks">
                  <Button variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground">
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {data?.top_priorities && data.top_priorities.length > 0 ? (
                  data.top_priorities.map((task: any, index: number) => {
                    const isDone = task.status === "completed";
                    return (
                      <div
                        key={task.id || index}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isDone
                            ? "border-border/30 bg-card/30 opacity-60 line-through"
                            : "border-border/70 bg-card/60 hover:bg-accent/40"
                        }`}
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <button
                            onClick={() => toggleTaskStatus(task.id, task.status)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>
                          <span className="font-mono text-xs text-muted-foreground w-4">
                            {index + 1}.
                          </span>
                          <span className="text-sm font-medium text-foreground truncate">
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {task.estimated_duration && (
                            <span className="flex items-center text-[11px] font-mono text-muted-foreground">
                              <Clock className="w-3 h-3 mr-1" />
                              ~{task.estimated_duration >= 60 ? `${Math.floor(task.estimated_duration / 60)}h` : `${task.estimated_duration}m`}
                            </span>
                          )}
                          <Badge
                            variant={
                              task.priority === "urgent"
                                ? "urgent"
                                : task.priority === "high"
                                ? "warning"
                                : "secondary"
                            }
                          >
                            {task.priority.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs font-mono text-muted-foreground py-4 text-center">
                    No priorities queued. Use the quick bar above or AI chat to schedule tasks.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* AI Insight Card (PRD Section 18) */}
            <Card className="border-primary/30 bg-primary/5 backdrop-blur-md">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-mono tracking-wider uppercase">
                    AI Decision Insight
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  "{data?.ai_insight}"
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Synthesized from durable memory & recent completions
                  </span>
                  <Link href="/brief">
                    <Button variant="outline" size="sm" className="h-7 text-xs font-mono">
                      Daily Brief Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Goal Progress & Active Projects */}
          <div className="space-y-6">
            {/* Goals Tracker */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Active Goals</CardTitle>
                </div>
                <Link href="/goals">
                  <span className="text-[11px] font-mono text-muted-foreground hover:text-foreground">
                    All
                  </span>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {data?.goals_summary && data.goals_summary.length > 0 ? (
                  data.goals_summary.map((g: any) => (
                    <div key={g.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="truncate">{g.title}</span>
                        <span className="font-mono text-muted-foreground">{g.progress || 0}%</span>
                      </div>
                      <div className="w-full bg-secondary/80 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, g.progress || 0))}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-mono text-muted-foreground py-2">
                    No active goals. Define high-level goals in the Goals tab.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Active Projects */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center space-x-2">
                  <FolderKanban className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Active Projects</CardTitle>
                </div>
                <Link href="/projects">
                  <span className="text-[11px] font-mono text-muted-foreground hover:text-foreground">
                    All
                  </span>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2 pt-2">
                {data?.active_projects && data.active_projects.length > 0 ? (
                  data.active_projects.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-md border border-border/50 bg-card/40 text-xs font-medium"
                    >
                      <span className="truncate">{p.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {p.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-mono text-muted-foreground py-2">
                    No active projects. Group your tasks by project.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}