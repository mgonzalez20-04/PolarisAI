"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TagBadge } from "@/components/tag-badge";
import { useAlert } from "@/contexts/alert-context";

interface Tag {
  id: string;
  name: string;
  color: string;
}

const PRESET_COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#84CC16", // Lime
  "#10B981", // Emerald
  "#14B8A6", // Teal
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#A855F7", // Purple
  "#EC4899", // Pink
];

interface TagsManagerProps {
  onTagsChange?: () => void;
}

export function TagsManager({ onTagsChange }: TagsManagerProps = {}) {
  const { showAlert, showConfirm } = useAlert();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTag, setNewTag] = useState({ name: "", color: PRESET_COLORS[0] });
  const [editTag, setEditTag] = useState({ name: "", color: "" });

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tags");
      const data = await res.json();
      setTags(data);
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTag.name.trim()) return;

    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTag),
      });

      if (res.ok) {
        await fetchTags();
        setNewTag({ name: "", color: PRESET_COLORS[0] });
        setIsCreating(false);
        onTagsChange?.();
      } else {
        const error = await res.json();
        await showAlert("Error", error.error || "Error creating tag", "error");
      }
    } catch (error) {
      console.error("Error creating tag:", error);
      await showAlert("Error", "Error creating tag", "error");
    }
  };

  const handleUpdateTag = async (id: string) => {
    if (!editTag.name.trim()) return;

    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editTag),
      });

      if (res.ok) {
        await fetchTags();
        setEditingId(null);
        onTagsChange?.();
      } else {
        const error = await res.json();
        await showAlert("Error", error.error || "Error updating tag", "error");
      }
    } catch (error) {
      console.error("Error updating tag:", error);
      await showAlert("Error", "Error updating tag", "error");
    }
  };

  const handleDeleteTag = async (id: string) => {
    const confirmed = await showConfirm(
      "Eliminar Etiqueta",
      "¿Estás seguro de que quieres eliminar esta etiqueta?",
      "warning"
    );

    if (!confirmed) {
      return;
    }

    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchTags();
        onTagsChange?.();
      } else {
        await showAlert("Error", "Error deleting tag", "error");
      }
    } catch (error) {
      console.error("Error deleting tag:", error);
      await showAlert("Error", "Error deleting tag", "error");
    }
  };

  const startEditing = (tag: Tag) => {
    setEditingId(tag.id);
    setEditTag({ name: tag.name, color: tag.color });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Gestionar Etiquetas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestionar Etiquetas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new tag form */}
          {!isCreating ? (
            <Button
              onClick={() => setIsCreating(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva Etiqueta
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={newTag.name}
                  onChange={(e) =>
                    setNewTag({ ...newTag, name: e.target.value })
                  }
                  placeholder="Nombre de la etiqueta"
                  maxLength={30}
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="mt-2 grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTag({ ...newTag, color })}
                      className={`h-8 w-full rounded transition-all ${
                        newTag.color === color
                          ? "ring-2 ring-primary ring-offset-2"
                          : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateTag} size="sm" className="flex-1">
                  <Check className="mr-1 h-4 w-4" />
                  Crear
                </Button>
                <Button
                  onClick={() => {
                    setIsCreating(false);
                    setNewTag({ name: "", color: PRESET_COLORS[0] });
                  }}
                  variant="outline"
                  size="sm"
                >
                  <X className="mr-1 h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Tags list */}
          <div className="space-y-2">
            {loading ? (
              <p className="text-center text-sm text-muted-foreground">
                Cargando...
              </p>
            ) : tags.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                No hay etiquetas. Crea una para empezar.
              </p>
            ) : (
              tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  {editingId === tag.id ? (
                    <div className="flex-1 space-y-2">
                      <Input
                        value={editTag.name}
                        onChange={(e) =>
                          setEditTag({ ...editTag, name: e.target.value })
                        }
                        maxLength={30}
                      />
                      <div className="grid grid-cols-6 gap-2">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setEditTag({ ...editTag, color })}
                            className={`h-6 w-full rounded ${
                              editTag.color === color
                                ? "ring-2 ring-primary ring-offset-1"
                                : ""
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdateTag(tag.id)}
                          size="sm"
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Guardar
                        </Button>
                        <Button
                          onClick={() => setEditingId(null)}
                          variant="outline"
                          size="sm"
                        >
                          <X className="mr-1 h-3 w-3" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <TagBadge name={tag.name} color={tag.color} />
                      <div className="flex gap-1">
                        <Button
                          onClick={() => startEditing(tag)}
                          variant="ghost"
                          size="sm"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteTag(tag.id)}
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
