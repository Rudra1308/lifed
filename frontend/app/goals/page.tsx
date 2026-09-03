"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Target, Plus, Trash2, TrendingUp, CheckCircle2 } from "lucide-react";
import { api, Goal } from "@/lib/api";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);

  const loadGoals = async () => {
    try {
      const g = await api.getGoals();
      setGoals(g);
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.createGoal({
        title: title.trim(),
        description: description || undefined,
        progress: Number(progress) || 0,
        status: "active",
      });
      setTitle("");
      setDescription("");
      setProgress(0);
      setIsModalOpen(false);
      await loadGoals();
    } catch {
      const newGoal: Goal = {
        id: Date.now().toString(),
        title: title.trim(),
        description: description || undefined,
        progress: Number(progress) || 0,
        status: "active",
      };
      setGoals((prev) => [newGoal, ...prev]);
      setIsModalOpen(false);
    }
  };

  const updateGoalProgress = async (id: string, newProgress: number) => {
    try {
      await api.updateGoal(id, { progress: newProgress });
      await loadGoals();
    } catch {
      setGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, progress: newProgress } : g))
      );
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      await api.deleteGoal(id);
      await loadGoals();
    } catch {
      setGoals((prev) => prev.filter((g) => g.id !== id));
    }
  };

  return (
    <AppShell
      title="Strategic Goals"
      subtitle="North-star objectives guiding autonomous task prioritization"
      matrixMode="focus"
    >
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono text-muted-foreground">
            {goals.length} ACTIVE GOALS
          </p>
          <Button onClick={() => setIsModalOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>New Goal</span>
          </Button>
        </div>

        <div className="space-y-4">
          {goals.map((goal) => (
            <Card key={goal.id} className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-primary shrink-0" />
                    <h3 className="font-semibold text-foreground text-base">{goal.title}</h3>
                    <Badge variant={goal.progress >= 100 ? "success" : "secondary"}>
                      {goal.progress >= 100 ? "COMPLETED" : "IN PROGRESS"}
                    </Badge>
                  </div>
                  {goal.description && (
                    <p className="text-xs text-muted-foreground">{goal.description}</p>
                  )}
                </div>

                <div className="flex items-center space-x-4 shrink-0">
                  <div className="w-36 space-y-1">
                    <div className="flex justify-between text-xs font-mono text-muted-foreground">
                      <span>Progress</span>
                      <span>{goal.progress}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={goal.progress || 0}
                      onChange={(e) => updateGoalProgress(goal.id, Number(e.target.value))}
                      className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="text-muted-foreground/50 hover:text-rose-500 transition-colors p-1"
                    title="Delete Goal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Define Strategic Goal"
        description="High-level milestones that give purpose to tasks."
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Goal Title
            </label>
            <Input
              type="text"
              placeholder="e.g. Master Autonomous AI Architectures"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Description
            </label>
            <Input
              type="text"
              placeholder="e.g. Build end-to-end multi-tool memory systems"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Initial Progress ({progress}%)
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Create Goal
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}