"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarCheck,
  Sparkles,
  Clock,
  RotateCw,
  Zap,
  CheckCircle2,
  Circle,
  HelpCircle,
} from "lucide-react";
import { api, DailyPlan, DailyPlanItem } from "@/lib/api";

export default function DailyBriefPage() {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [replanning, setReplanning] = useState(false);
  const [targetHours, setTargetHours] = useState(6);

  const loadPlan = async () => {
    try {
      const data = await api.getDailyPlan();
      setPlan(data);
    } catch {
      // Fallback
      setPlan({
        id: "demo-plan",
        date: new Date().toISOString().split("T")[0],
        tasks: [
          {
            id: "1",
            title: "Finish Lifed memory module & local embeddings",
            priority: "urgent",
            estimated_duration: 120,
            scheduled_time: "09:00 - 11:00",
            rationale: "Prioritized as #1 based on URGENT priority rating and aligned with your saved preference for morning deep technical work.",
          },
          {
            id: "2",
            title: "Follow up with prospects and portfolio demo",
            priority: "high",
            estimated_duration: 45,
            scheduled_time: "11:15 - 12:00",
            rationale: "Scheduled before lunch to maintain momentum on high-value business development outreach.",
          },
          {
            id: "3",
            title: "NLP revision & tool calling benchmarks",
            priority: "medium",
            estimated_duration: 60,
            scheduled_time: "13:30 - 14:30",
            rationale: "Afternoon review block following operational tasks.",
          },
        ],
        rationale:
          "Synthesized a 3.8h focus plan containing 3 high-value deliverables. Tasks are scheduled starting at 09:00 to honor your morning focus rhythm. High-impact objectives are scheduled first to guarantee milestone progress.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, []);

  const handleReplan = async () => {
    setReplanning(true);
    try {
      const freshPlan = await api.generateDailyPlan({ target_hours: targetHours });
      setPlan(freshPlan);
    } catch {
      await loadPlan();
    } finally {
      setReplanning(false);
    }
  };

  return (
    <AppShell
      title="Daily Brief & Intelligent Plan"
      subtitle={plan?.date ? `Synthesized Schedule for ${plan.date}` : "Prioritization & Time Blocking"}
      matrixMode="focus"
    >
      <div className="space-y-6 max-w-5xl">
        {/* Controls & Target Hours Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <CalendarCheck className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Intelligent Planning Engine</h2>
              <p className="text-xs font-mono text-muted-foreground">
                Deterministic priority ranking + memory constraint synthesis
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-muted-foreground">Target Hours:</span>
              <select
                value={targetHours}
                onChange={(e) => setTargetHours(Number(e.target.value))}
                className="h-8 rounded-md border border-border/70 bg-background/50 px-2 text-xs font-mono"
              >
                <option value={4}>4 Hours</option>
                <option value={6}>6 Hours</option>
                <option value={8}>8 Hours</option>
              </select>
            </div>

            <Button onClick={handleReplan} size="sm" disabled={replanning}>
              <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${replanning ? "animate-spin" : ""}`} />
              <span>{replanning ? "Replanning..." : "Replan Day"}</span>
            </Button>
          </div>
        </div>

        {/* Executive AI Rationale Card */}
        {plan?.rationale && (
          <Card className="border-primary/40 bg-primary/5 backdrop-blur-md">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-mono tracking-wider uppercase">
                  Executive Scheduling Rationale
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed font-sans font-medium">
                "{plan.rationale}"
              </p>
            </CardContent>
          </Card>
        )}

        {/* Scheduled Timeline Blocks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground px-1">
            <span>PLANNED SEQUENCE</span>
            <span>{plan?.tasks?.length || 0} BLOCKS SCHEDULED</span>
          </div>

          {plan?.tasks && plan.tasks.length > 0 ? (
            plan.tasks.map((item, idx) => (
              <Card key={item.id || idx} className="p-4 hover:border-border/90">
                <CardContent className="p-0 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        <Clock className="w-3 h-3 mr-1" />
                        {item.scheduled_time || "Morning Block"}
                      </span>

                      <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-xs font-mono text-muted-foreground">
                        ~{item.estimated_duration}m
                      </span>
                      <Badge
                        variant={
                          item.priority === "urgent"
                            ? "urgent"
                            : item.priority === "high"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {item.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Task Rationale Explanation */}
                  {item.rationale && (
                    <div className="flex items-start space-x-2 text-xs font-mono text-muted-foreground bg-secondary/30 p-2.5 rounded-md border border-border/40">
                      <HelpCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <span className="font-semibold text-foreground">Why this task: </span>
                        {item.rationale}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center font-mono text-xs text-muted-foreground">
              No tasks currently planned. Click "Replan Day" above to synthesize an optimized schedule.
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}