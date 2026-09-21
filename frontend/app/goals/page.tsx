"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Target, Plus, Trash2, Pencil } from "lucide-react";
import { api, Goal } from "@/lib/api";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);

  // Edit form state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editProgress, setEditProgress] = useState(0);
  const [editStatus, setEditStatus] = useState("active");

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
      setTitle("");
      setDescription("");
      setProgress(0);
      setIsModalOpen(false);
    }
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setEditTitle(goal.title);
    setEditDescription(goal.description || "");
    setEditProgress(goal.progress || 0);
    setEditStatus(goal.status || "active");
    setIsEditModalOpen(true);
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal || !editTitle.trim()) return;
    try {
      await api.updateGoal(editingGoal.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        progress: Number(editProgress),
        status: editStatus,
      });
      setIsEditModalOpen(false);
      setEditingGoal(null);
      await loadGoals();
    } catch {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === editingGoal.id
            ? {
                ...g,
                title: editTitle.trim(),
                description: editDescription.trim() || undefined,
                progress: Number(editProgress),
                status: editStatus,
              }
            : g
        )
      );
      setIsEditModalOpen(false);
      setEditingGoal(null);
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
            {goals.length} STRATEGIC GOALS
          </p>
          <Button onClick={() => setIsModalOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>New Goal</span>
          </Button>
        </div>

        <div className="space-y-4">
          {goals.map((goal) => {
            const isCompleted = goal.progress >= 100 || goal.status === "completed";
            return (
              <Card key={goal.id} className="p-5 hover:border-border/90 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-primary shrink-0" />
                      <h3 className="font-semibold text-foreground text-base">{goal.title}</h3>
                      <Badge variant={isCompleted ? "success" : "secondary"}>
                        {isCompleted ? "COMPLETED" : goal.status === "paused" ? "PAUSED" : "IN PROGRESS"}
                      </Badge>
                    </div>
                    {goal.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{goal.description}</p>
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

                    {/* Edit Button */}
                    <button
                      onClick={() => openEditModal(goal)}
                      className="text-muted-foreground/50 hover:text-primary transition-colors p-1"
                      title="Edit Goal"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
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
            );
          })}
        </div>
      </div>

      {/* Define Goal Modal */}
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
              placeholder="e.g. Build and publish 3 production-grade agent workflows."
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
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
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

      {/* Edit Goal Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Strategic Goal"
        description="Update goal title, description, status, or progress percentage."
      >
        <form onSubmit={handleUpdateGoal} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Goal Title
            </label>
            <Input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Status
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full h-9 rounded-md border border-border/70 bg-background/50 px-3 text-xs font-mono"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-md border border-border/70 bg-background/50 p-2.5 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Progress ({editProgress}%)
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={editProgress}
              onChange={(e) => setEditProgress(Number(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}