"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FolderKanban, Plus, Trash2, CheckCircle2, ListTodo } from "lucide-react";
import { api, Project, Goal, TaskItem } from "@/lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState("");
  const [description, setDescription] = useState("");

  const loadData = async () => {
    try {
      const p = await api.getProjects();
      setProjects(p);
      const g = await api.getGoals();
      setGoals(g);
      const t = await api.getTasks();
      setTasks(t);
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.createProject({
        title: title.trim(),
        goal_id: goalId || undefined,
        description: description || undefined,
      });
      setTitle("");
      setDescription("");
      setIsModalOpen(false);
      await loadData();
    } catch {
      const newProj: Project = {
        id: Date.now().toString(),
        title: title.trim(),
        goal_id: goalId || undefined,
        description: description || undefined,
        status: "active",
      };
      setProjects((prev) => [newProj, ...prev]);
      setIsModalOpen(false);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await api.deleteProject(id);
      await loadData();
    } catch {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <AppShell
      title="Projects"
      subtitle="Group actionable tasks into structured milestones"
      matrixMode="focus"
    >
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono text-muted-foreground">
            {projects.length} ACTIVE INITIATIVES
          </p>
          <Button onClick={() => setIsModalOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>New Project</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => {
            const linkedGoal = goals.find((g) => g.id === project.goal_id);
            const projectTasks = tasks.filter((t) => t.project_id === project.id);
            const completedTasks = projectTasks.filter((t) => t.status === "completed");
            const progress =
              projectTasks.length > 0
                ? Math.round((completedTasks.length / projectTasks.length) * 100)
                : 0;

            return (
              <Card key={project.id} className="hover:border-border/90">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <FolderKanban className="w-4 h-4 text-primary" />
                      <CardTitle className="text-base">{project.title}</CardTitle>
                    </div>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="text-muted-foreground/50 hover:text-rose-500 transition-colors p-1"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {project.description && (
                    <p className="text-xs text-muted-foreground mt-1">{project.description}</p>
                  )}
                  {linkedGoal && (
                    <div className="mt-2">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">
                        Goal: {linkedGoal.title}
                      </span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono text-muted-foreground">
                      <span>Tasks: {completedTasks.length}/{projectTasks.length}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-secondary/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Project"
        description="Organize work under a cohesive title and linked objective."
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Project Title
            </label>
            <Input
              type="text"
              placeholder="e.g. Kinetic Matrix Visual System"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Linked Goal (Optional)
            </label>
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="w-full h-9 rounded-md border border-border/70 bg-background/50 px-3 text-xs font-mono"
            >
              <option value="">No Linked Goal</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Description
            </label>
            <Input
              type="text"
              placeholder="e.g. Canvas animation with theme reactivity"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}