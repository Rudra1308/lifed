"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FolderKanban, Plus, Trash2, CheckCircle2, Circle, Pencil } from "lucide-react";
import { api, Project, Goal, TaskItem } from "@/lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState("");
  const [description, setDescription] = useState("");

  // Edit form state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editGoalId, setEditGoalId] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("active");

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
        status: "active",
      });
      setTitle("");
      setDescription("");
      setGoalId("");
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
      setTitle("");
      setDescription("");
      setGoalId("");
      setIsModalOpen(false);
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setEditTitle(project.title);
    setEditDescription(project.description || "");
    setEditGoalId(project.goal_id || "");
    setEditStatus(project.status || "active");
    setIsEditModalOpen(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editTitle.trim()) return;
    try {
      await api.updateProject(editingProject.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        goal_id: editGoalId || undefined,
        status: editStatus,
      });
      setIsEditModalOpen(false);
      setEditingProject(null);
      await loadData();
    } catch {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editingProject.id
            ? {
                ...p,
                title: editTitle.trim(),
                description: editDescription.trim() || undefined,
                goal_id: editGoalId || undefined,
                status: editStatus,
              }
            : p
        )
      );
      setIsEditModalOpen(false);
      setEditingProject(null);
    }
  };

  const toggleProjectStatus = async (project: Project) => {
    const nextStatus = project.status === "completed" ? "active" : "completed";
    try {
      await api.updateProject(project.id, { status: nextStatus });
      await loadData();
    } catch {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, status: nextStatus } : p))
      );
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

  const filteredProjects = projects.filter((p) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return p.status !== "completed";
    if (statusFilter === "completed") return p.status === "completed";
    return true;
  });

  const activeCount = projects.filter((p) => p.status !== "completed").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;

  return (
    <AppShell
      title="Projects"
      subtitle="Group actionable tasks into structured milestones"
      matrixMode="focus"
    >
      <div className="space-y-6 max-w-5xl">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Status Filters */}
          <div className="flex items-center space-x-1 border border-border/70 rounded-lg p-1 bg-card/60 backdrop-blur-md">
            {[
              { id: "all", label: `ALL (${projects.length})` },
              { id: "active", label: `ACTIVE (${activeCount})` },
              { id: "completed", label: `COMPLETED (${completedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`text-xs font-mono px-3 py-1 rounded-md transition-all ${
                  statusFilter === tab.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button onClick={() => setIsModalOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>New Project</span>
          </Button>
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project) => {
              const isDone = project.status === "completed";
              const linkedGoal = goals.find((g) => g.id === project.goal_id);
              const projectTasks = tasks.filter((t) => t.project_id === project.id);
              const completedTasks = projectTasks.filter((t) => t.status === "completed");
              const progress =
                projectTasks.length > 0
                  ? Math.round((completedTasks.length / projectTasks.length) * 100)
                  : isDone
                  ? 100
                  : 0;

              return (
                <Card
                  key={project.id}
                  className={`transition-all ${
                    isDone
                      ? "border-emerald-500/30 bg-card/40 opacity-80"
                      : "hover:border-border/90"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {/* Checkout Accomplished Checkbox Button */}
                        <button
                          onClick={() => toggleProjectStatus(project)}
                          className="shrink-0 transition-transform active:scale-90 text-muted-foreground hover:text-foreground"
                          title={isDone ? "Mark as Active" : "Mark as Accomplished"}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 hover:text-emerald-400 transition-colors" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground hover:text-emerald-500 transition-colors" />
                          )}
                        </button>

                        <div className="flex items-center space-x-2 truncate">
                          <FolderKanban
                            className={`w-4 h-4 shrink-0 ${
                              isDone ? "text-emerald-500" : "text-primary"
                            }`}
                          />
                          <CardTitle
                            className={`text-base truncate ${
                              isDone ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {project.title}
                          </CardTitle>
                        </div>
                      </div>

                      {/* Action buttons: Edit & Delete */}
                      <div className="flex items-center space-x-1 shrink-0">
                        {isDone && (
                          <Badge variant="success" className="text-[10px] py-0 px-1.5 mr-1">
                            ACCOMPLISHED
                          </Badge>
                        )}
                        <button
                          onClick={() => openEditModal(project)}
                          className="text-muted-foreground/60 hover:text-primary transition-colors p-1"
                          title="Edit Project"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="text-muted-foreground/60 hover:text-rose-500 transition-colors p-1"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {project.description && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {project.description}
                      </p>
                    )}

                    {linkedGoal && (
                      <div className="mt-2.5">
                        <span className="text-[10px] font-mono uppercase text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded border border-border/30">
                          Goal: {linkedGoal.title}
                        </span>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono text-muted-foreground">
                        <span>
                          Tasks: {completedTasks.length}/{projectTasks.length}
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-secondary/80 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            isDone ? "bg-emerald-500" : "bg-primary"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full">
              <Card className="p-8 text-center">
                <p className="text-xs font-mono text-muted-foreground">
                  No projects match your selected filter criteria.
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
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

      {/* Edit Project Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Project"
        description="Modify project details, status, or linked strategic objective."
      >
        <form onSubmit={handleUpdateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Project Title
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
              <option value="completed">Accomplished / Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Linked Goal (Optional)
            </label>
            <select
              value={editGoalId}
              onChange={(e) => setEditGoalId(e.target.value)}
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
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-md border border-border/70 bg-background/50 p-3 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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