"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  Calendar,
  Pencil,
} from "lucide-react";
import { api, TaskItem, Project } from "@/lib/api";

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New task form state
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [duration, setDuration] = useState(30);
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");

  // Edit task form state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [editDuration, setEditDuration] = useState(30);
  const [editDeadline, setEditDeadline] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<"todo" | "in_progress" | "completed">("todo");

  const loadTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
      const projData = await api.getProjects();
      setProjects(projData);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.createTask({
        title: title.trim(),
        project_id: projectId || undefined,
        priority,
        estimated_duration: duration,
        deadline: deadline || undefined,
        notes: notes || undefined,
      });
      setTitle("");
      setDeadline("");
      setNotes("");
      setProjectId("");
      setIsModalOpen(false);
      await loadTasks();
    } catch {
      // Offline fallback
      const newTask: TaskItem = {
        id: Date.now().toString(),
        title: title.trim(),
        project_id: projectId || undefined,
        priority,
        estimated_duration: duration,
        deadline: deadline || undefined,
        notes: notes || undefined,
        status: "todo",
      };
      setTasks((prev) => [newTask, ...prev]);
      setTitle("");
      setDeadline("");
      setNotes("");
      setProjectId("");
      setIsModalOpen(false);
    }
  };

  const openEditModal = (task: TaskItem) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditProjectId(task.project_id || "");
    setEditPriority(task.priority || "medium");
    setEditDuration(task.estimated_duration || 30);
    setEditDeadline(task.deadline || "");
    setEditNotes(task.notes || "");
    setEditStatus(task.status);
    setIsEditModalOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;
    try {
      await api.updateTask(editingTask.id, {
        title: editTitle.trim(),
        project_id: editProjectId || undefined,
        priority: editPriority,
        estimated_duration: editDuration,
        deadline: editDeadline || undefined,
        notes: editNotes || undefined,
        status: editStatus,
      });
      setIsEditModalOpen(false);
      setEditingTask(null);
      await loadTasks();
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                title: editTitle.trim(),
                project_id: editProjectId || undefined,
                priority: editPriority,
                estimated_duration: editDuration,
                deadline: editDeadline || undefined,
                notes: editNotes || undefined,
                status: editStatus,
              }
            : t
        )
      );
      setIsEditModalOpen(false);
      setEditingTask(null);
    }
  };

  const toggleTaskStatus = async (task: TaskItem) => {
    const nextStatus = task.status === "completed" ? "todo" : "completed";
    try {
      await api.updateTask(task.id, { status: nextStatus });
      await loadTasks();
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      await loadTasks();
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <AppShell
      title="Task Management"
      subtitle="Actionable work items, deadlines, and time estimates"
      matrixMode="focus"
    >
      <div className="space-y-6 max-w-5xl">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 border border-border/70 rounded-lg p-1 bg-card/60 backdrop-blur-md">
              {["all", "todo", "in_progress", "completed"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`text-xs font-mono px-2.5 py-1 rounded-md transition-all ${
                    statusFilter === st
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {st.toUpperCase().replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1 border border-border/70 rounded-lg p-1 bg-card/60 backdrop-blur-md">
              {["all", "urgent", "high", "medium", "low"].map((pr) => (
                <button
                  key={pr}
                  onClick={() => setPriorityFilter(pr)}
                  className={`text-xs font-mono px-2 py-1 rounded-md transition-all ${
                    priorityFilter === pr
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {pr.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={() => setIsModalOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Add Task</span>
          </Button>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const isDone = task.status === "completed";
              const project = projects.find((p) => p.id === task.project_id);

              return (
                <Card
                  key={task.id}
                  className={`transition-all ${
                    isDone ? "border-border/30 bg-card/40 opacity-60 line-through" : "hover:border-border"
                  }`}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <button
                        onClick={() => toggleTaskStatus(task)}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        title={isDone ? "Mark as Incomplete" : "Mark as Completed"}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div className="truncate">
                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                        <div className="flex items-center space-x-2 mt-0.5">
                          {project && (
                            <span className="text-[10px] font-mono text-muted-foreground border border-border/40 px-1.5 py-0.2 rounded">
                              {project.title}
                            </span>
                          )}
                          {task.deadline && (
                            <span className="flex items-center text-[10px] font-mono text-muted-foreground">
                              <Calendar className="w-3 h-3 mr-1" />
                              {task.deadline}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 shrink-0">
                      {task.estimated_duration && (
                        <span className="hidden sm:flex items-center text-xs font-mono text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {task.estimated_duration}m
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

                      {/* Edit Button */}
                      <button
                        onClick={() => openEditModal(task)}
                        className="text-muted-foreground/60 hover:text-primary transition-colors p-1"
                        title="Edit Task"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-muted-foreground/60 hover:text-rose-500 transition-colors p-1"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="p-8 text-center">
              <p className="text-xs font-mono text-muted-foreground">
                No tasks match your selected filter criteria.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Task"
        description="Add an actionable task with estimated duration and priority."
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Task Title
            </label>
            <Input
              type="text"
              placeholder="e.g. Implement vector memory retriever"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Project (Optional)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full h-9 rounded-md border border-border/70 bg-background/50 px-3 text-xs font-mono"
            >
              <option value="">No Linked Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full h-9 rounded-md border border-border/70 bg-background/50 px-3 text-xs font-mono"
              >
                <option value="low">LOW</option>
                <option value="medium">MEDIUM</option>
                <option value="high">HIGH</option>
                <option value="urgent">URGENT</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                Duration (min)
              </label>
              <Input
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Deadline (Optional)
            </label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Additional context or checklist items..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-border/70 bg-background/50 p-2 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Task"
        description="Update title, priority, estimated duration, or completion status."
      >
        <form onSubmit={handleUpdateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Task Title
            </label>
            <Input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                Status
              </label>
              <select
                value={editStatus}
                onChange={(e: any) => setEditStatus(e.target.value)}
                className="w-full h-9 rounded-md border border-border/70 bg-background/50 px-3 text-xs font-mono"
              >
                <option value="todo">TODO</option>
                <option value="in_progress">IN PROGRESS</option>
                <option value="completed">COMPLETED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                Priority
              </label>
              <select
                value={editPriority}
                onChange={(e: any) => setEditPriority(e.target.value)}
                className="w-full h-9 rounded-md border border-border/70 bg-background/50 px-3 text-xs font-mono"
              >
                <option value="low">LOW</option>
                <option value="medium">MEDIUM</option>
                <option value="high">HIGH</option>
                <option value="urgent">URGENT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Project (Optional)
            </label>
            <select
              value={editProjectId}
              onChange={(e) => setEditProjectId(e.target.value)}
              className="w-full h-9 rounded-md border border-border/70 bg-background/50 px-3 text-xs font-mono"
            >
              <option value="">No Linked Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                Duration (min)
              </label>
              <Input
                type="number"
                min={5}
                step={5}
                value={editDuration}
                onChange={(e) => setEditDuration(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                Deadline (Optional)
              </label>
              <Input
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full rounded-md border border-border/70 bg-background/50 p-2 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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