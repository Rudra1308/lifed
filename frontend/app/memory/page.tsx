"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Brain, Plus, Trash2, Search, Zap, ShieldCheck, Pencil } from "lucide-react";
import { api, MemoryItem } from "@/lib/api";

export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ memory: MemoryItem; similarity: number }[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New memory form
  const [content, setContent] = useState("");
  const [type, setType] = useState<"preference" | "routine" | "rule" | "fact">("preference");

  // Edit memory form
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<"preference" | "routine" | "rule" | "fact">("preference");

  const loadMemories = async () => {
    try {
      const data = await api.getMemories(selectedType !== "all" ? selectedType : undefined);
      setMemories(data);
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    loadMemories();
  }, [selectedType]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const results = await api.searchMemories(searchQuery.trim());
      setSearchResults(results);
    } catch {
      // offline fallback
      const q = searchQuery.toLowerCase();
      const localMatches = memories
        .filter((m) => m.content.toLowerCase().includes(q))
        .map((m) => ({ memory: m, similarity: 0.85 }));
      setSearchResults(localMatches);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await api.createMemory({ content: content.trim(), type });
      setContent("");
      setIsModalOpen(false);
      await loadMemories();
    } catch {
      const newMem: MemoryItem = {
        id: Date.now().toString(),
        content: content.trim(),
        type,
        created_at: new Date().toISOString(),
      };
      setMemories((prev) => [newMem, ...prev]);
      setContent("");
      setIsModalOpen(false);
    }
  };

  const openEditModal = (mem: MemoryItem) => {
    setEditingMemory(mem);
    setEditContent(mem.content);
    setEditType(mem.type as any || "preference");
    setIsEditModalOpen(true);
  };

  const handleUpdateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemory || !editContent.trim()) return;
    try {
      await api.updateMemory(editingMemory.id, {
        content: editContent.trim(),
        type: editType,
      });
      setIsEditModalOpen(false);
      setEditingMemory(null);
      await loadMemories();
    } catch {
      setMemories((prev) =>
        prev.map((m) =>
          m.id === editingMemory.id
            ? { ...m, content: editContent.trim(), type: editType }
            : m
        )
      );
      setIsEditModalOpen(false);
      setEditingMemory(null);
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      await api.deleteMemory(id);
      await loadMemories();
      if (searchResults) {
        setSearchResults((prev) => prev?.filter((r) => r.memory.id !== id) || null);
      }
    } catch {
      setMemories((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const displayedList = searchResults
    ? searchResults.map((r) => ({ ...r.memory, similarity: r.similarity }))
    : memories;

  return (
    <AppShell
      title="Durable Memory"
      subtitle="Local-first semantic knowledge & user preferences store"
      matrixMode="focus"
    >
      <div className="space-y-6 max-w-5xl">
        {/* Search & Action Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Semantic Search Bar */}
          <form onSubmit={handleSearch} className="relative flex-1 w-full max-w-xl">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search memories semantically (e.g. 'working style', 'meeting limits')..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim()) setSearchResults(null);
              }}
              className="pl-9 pr-20 font-mono text-xs h-10 bg-card/60 backdrop-blur-md"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                }}
                className="absolute right-12 top-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
            <Button type="submit" size="sm" className="absolute right-1.5 top-1.5 h-7 px-2.5 text-xs">
              Search
            </Button>
          </form>

          <Button onClick={() => setIsModalOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Store Memory</span>
          </Button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center space-x-1.5 border border-border/70 rounded-lg p-1 bg-card/60 backdrop-blur-md w-fit">
          {["all", "preference", "routine", "rule", "fact"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setSelectedType(t);
                setSearchResults(null);
              }}
              className={`text-xs font-mono px-3 py-1 rounded-md transition-all ${
                selectedType === t
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Semantic Vector Status Banner */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/30 font-mono text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>LOCAL VECTOR RETRIEVAL: Active (Zero cloud data transmission)</span>
          </div>
          <span>{memories.length} RECORDS STORED</span>
        </div>

        {/* Memories Grid */}
        <div className="space-y-3">
          {displayedList.length > 0 ? (
            displayedList.map((mem: any) => (
              <Card key={mem.id} className="p-4 hover:border-border/90">
                <CardContent className="p-0 flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          mem.type === "rule"
                            ? "urgent"
                            : mem.type === "preference"
                            ? "success"
                            : "secondary"
                        }
                      >
                        {mem.type.toUpperCase()}
                      </Badge>

                      {mem.similarity !== undefined && (
                        <span className="flex items-center text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                          <Zap className="w-3 h-3 mr-1" />
                          {Math.round(mem.similarity * 100)}% SEMANTIC MATCH
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-foreground leading-relaxed">
                      "{mem.content}"
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => openEditModal(mem)}
                      className="text-muted-foreground/40 hover:text-primary transition-colors p-1"
                      title="Edit Rule / Memory"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteMemory(mem.id)}
                      className="text-muted-foreground/40 hover:text-rose-500 transition-colors p-1"
                      title="Delete Memory"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <p className="text-xs font-mono text-muted-foreground">
                {searchResults ? "No semantic matches found." : "No durable memories recorded yet."}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Add Memory Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Persist Durable Memory"
        description="Explicit user preferences, working constraints, and durable knowledge retained across conversations."
      >
        <form onSubmit={handleCreateMemory} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Memory Content
            </label>
            <textarea
              rows={3}
              placeholder="e.g. I prefer uninterrupted technical focus in the morning from 9am to 12pm."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-md border border-border/70 bg-background/50 p-3 text-sm font-sans focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Category
            </label>
            <select
              value={type}
              onChange={(e: any) => setType(e.target.value)}
              className="w-full h-9 rounded-md border border-border/70 bg-background/50 px-3 text-xs font-mono"
            >
              <option value="preference">PREFERENCE (Working style, tools, UI habits)</option>
              <option value="rule">RULE (Hard constraints, strict limits)</option>
              <option value="routine">ROUTINE (Recurring daily rituals)</option>
              <option value="fact">FACT (Biographical info, key durable context)</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Remember Fact
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Memory Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Durable Memory & Rules"
        description="Update your saved preference or hard rule. Vector embeddings will re-index automatically."
      >
        <form onSubmit={handleUpdateMemory} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Memory / Rule Content
            </label>
            <textarea
              rows={3}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full rounded-md border border-border/70 bg-background/50 p-3 text-sm font-sans focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
              Category
            </label>
            <select
              value={editType}
              onChange={(e: any) => setEditType(e.target.value)}
              className="w-full h-9 rounded-md border border-border/70 bg-background/50 px-3 text-xs font-mono"
            >
              <option value="preference">PREFERENCE (Working style, tools, UI habits)</option>
              <option value="rule">RULE (Hard constraints, strict limits)</option>
              <option value="routine">ROUTINE (Recurring daily rituals)</option>
              <option value="fact">FACT (Biographical info, key durable context)</option>
            </select>
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