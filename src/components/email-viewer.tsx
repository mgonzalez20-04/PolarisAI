"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { X, Sparkles, Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TagBadge } from "@/components/tag-badge";
import { TagsManager } from "@/components/tags-manager";
import { useViewer } from "@/contexts/viewer-context";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Email {
  id: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  receivedAt: string;
  bodyPreview: string;
  bodyText?: string;
  bodyHtml?: string;
  isRead: boolean;
  status: string;
  priority?: string;
  resolutionNotes?: string;
  tags?: Array<{
    tag: Tag;
  }>;
}

interface Suggestion {
  title: string;
  description: string;
  confidence: number;
  relatedCaseId?: string;
}

interface SuggestionResult {
  suggestions: Suggestion[];
  suggestedResponse: {
    text: string;
    textEs?: string;
    detectedLanguage?: string;
    basedOnCaseIds: string[];
  };
}

export function EmailViewer() {
  const { viewerOpen, setViewerOpen, selectedEmailId } = useViewer();
  const [email, setEmail] = useState<Email | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [status, setStatus] = useState("New");
  const [priority, setPriority] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);

  useEffect(() => {
    if (selectedEmailId && viewerOpen) {
      // Reset state before fetching
      setEmail(null);
      setLoading(true);
      fetchEmail();
      fetchAvailableTags();
    }
  }, [selectedEmailId, viewerOpen]);

  const fetchEmail = async () => {
    if (!selectedEmailId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/emails/${selectedEmailId}`);
      const data = await res.json();
      setEmail(data);

      setStatus(data.status || "New");
      setPriority(data.priority || "");
      setResolutionNotes(data.resolutionNotes || "");

      if (!data.isRead) {
        await fetch(`/api/emails/${selectedEmailId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true }),
        });
      }

      fetchSuggestions();
    } catch (error) {
      console.error("Error fetching email:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    if (!selectedEmailId) return;

    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/emails/${selectedEmailId}/suggestions`);
      const data = await res.json();
      setSuggestions(data);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSaveTicketData = async () => {
    if (!email || !selectedEmailId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/emails/${selectedEmailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority: priority || null,
          resolutionNotes: resolutionNotes || null,
        }),
      });

      if (res.ok) {
        await fetchEmail();
      }
    } catch (error) {
      console.error("Error saving ticket data:", error);
    } finally {
      setSaving(false);
    }
  };

  const fetchAvailableTags = async () => {
    try {
      const res = await fetch("/api/tags");
      const data = await res.json();
      setAvailableTags(data);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const handleAddTag = async (tagId: string) => {
    if (!selectedEmailId) return;

    try {
      const res = await fetch(`/api/emails/${selectedEmailId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });

      if (res.ok) {
        await fetchEmail();
        setShowTagSelector(false);
      }
    } catch (error) {
      console.error("Error adding tag:", error);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!selectedEmailId) return;

    try {
      const res = await fetch(`/api/emails/${selectedEmailId}/tags/${tagId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchEmail();
      }
    } catch (error) {
      console.error("Error removing tag:", error);
    }
  };

  const handleClose = () => {
    setViewerOpen(false);
    setEmail(null);
    setSuggestions(null);
  };

  if (!viewerOpen) return null;

  return (
    <div className="flex h-full flex-col border-l bg-background animate-slide-in-right">
      <div className="flex h-full">
          {/* Main content */}
          <div className="flex-1 overflow-auto border-r p-8 custom-scrollbar">
            <div className="mb-6 flex items-center justify-between animate-fade-in-up">
              <h2 className="text-2xl font-bold tracking-tight">Detalle del Correo</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="hover:bg-red-500/10 hover:text-red-500 transition-all duration-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="space-y-4 w-full max-w-2xl">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse animate-shimmer"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse animate-shimmer"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse animate-shimmer w-3/4"></div>
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse animate-shimmer"></div>
                </div>
              </div>
            ) : !email ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center animate-scale-in">
                  <X className="mx-auto mb-4 h-16 w-16 text-red-400/60 animate-bounce-subtle" />
                  <h2 className="mb-2 text-2xl font-bold">Correo no encontrado</h2>
                  <p className="text-muted-foreground">Este correo ya no está disponible</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="mb-2 flex items-start justify-between">
                    <h1 className="text-2xl font-bold">{email.subject}</h1>
                    {(email.priority === "high" || email.priority === "urgent") && (
                      <Badge variant="destructive">
                        {email.priority === "urgent" ? "Urgente" : "Alta Prioridad"}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      <strong>De:</strong> {email.from} &lt;{email.fromEmail}&gt;
                    </p>
                    <p>
                      <strong>Para:</strong> {email.to}
                    </p>
                    <p>
                      <strong>Fecha:</strong>{" "}
                      {format(new Date(email.receivedAt), "d 'de' MMMM 'de' yyyy, HH:mm'h'", {
                        locale: es,
                      })}
                    </p>
                  </div>

                  {/* Etiquetas */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {email.tags &&
                      email.tags.map((emailTag) => (
                        <TagBadge
                          key={emailTag.tag.id}
                          name={emailTag.tag.name}
                          color={emailTag.tag.color}
                          removable
                          onRemove={() => handleRemoveTag(emailTag.tag.id)}
                        />
                      ))}
                    {!showTagSelector ? (
                      <Button
                        onClick={() => setShowTagSelector(true)}
                        variant="outline"
                        size="sm"
                        className="h-6"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Añadir etiqueta
                      </Button>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-0 top-0 z-10 rounded-md border bg-popover p-2 shadow-md">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-semibold">Seleccionar etiqueta</span>
                            <Button
                              onClick={() => setShowTagSelector(false)}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="max-h-48 space-y-1 overflow-auto">
                            {availableTags
                              .filter((tag) => !email.tags?.some((et) => et.tag.id === tag.id))
                              .length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Todas las etiquetas están asignadas
                              </p>
                            ) : (
                              availableTags
                                .filter((tag) => !email.tags?.some((et) => et.tag.id === tag.id))
                                .map((tag) => (
                                  <button
                                    key={tag.id}
                                    onClick={() => handleAddTag(tag.id)}
                                    className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                                  >
                                    <TagBadge name={tag.name} color={tag.color} />
                                  </button>
                                ))
                            )}
                          </div>
                          <div className="mt-2 border-t pt-2">
                            <TagsManager onTagsChange={fetchAvailableTags} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="prose max-w-none">
                  {email.bodyHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: email.bodyHtml }} />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans">
                      {email.bodyText || email.bodyPreview}
                    </pre>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-80 overflow-auto bg-muted/20 p-6 custom-scrollbar">
            <h2 className="mb-6 flex items-center text-xl font-bold tracking-tight animate-fade-in">
              <Sparkles className="mr-2 h-6 w-6 text-primary animate-pulse-slow" />
              Sugerencias IA
            </h2>

            {loadingSuggestions ? (
              <div className="space-y-3">
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse animate-shimmer"></div>
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse animate-shimmer"></div>
              </div>
            ) : suggestions && suggestions.suggestions && suggestions.suggestions.length > 0 ? (
              <>
                <div className="mb-6 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Casos Similares</h3>
                  {suggestions.suggestions.map((suggestion, idx) => (
                    <Card key={idx} className="transition-all duration-300 hover:shadow-lg hover:scale-[1.02] rounded-xl animate-fade-in-up border-l-4 border-l-blue-500" style={{animationDelay: `${idx * 0.1}s`}}>
                      <CardContent className="pt-4">
                        <h4 className="mb-2 font-bold text-base">{suggestion.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{suggestion.description}</p>
                        <div className="mt-3">
                          <Badge variant="secondary" className="font-semibold">
                            {Math.round(suggestion.confidence * 100)}% coincidencia
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Separator className="my-4" />

                {suggestions.suggestedResponse && suggestions.suggestedResponse.text && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Respuesta Sugerida</h3>

                    <Card>
                      <CardContent className="pt-4">
                        {suggestions.suggestedResponse.detectedLanguage &&
                          suggestions.suggestedResponse.detectedLanguage !== "es" && (
                            <div className="mb-2">
                              <Badge variant="outline" className="text-xs">
                                {suggestions.suggestedResponse.detectedLanguage === "en" &&
                                  "🇬🇧 Inglés"}
                                {suggestions.suggestedResponse.detectedLanguage === "de" &&
                                  "🇩🇪 Alemán"}
                              </Badge>
                            </div>
                          )}
                        <pre className="whitespace-pre-wrap text-sm">
                          {suggestions.suggestedResponse.text}
                        </pre>
                      </CardContent>
                    </Card>

                    {suggestions.suggestedResponse.textEs && (
                      <Card className="border-blue-200 bg-blue-50/50">
                        <CardContent className="pt-4">
                          <div className="mb-2">
                            <Badge variant="outline" className="bg-white text-xs">
                              🇪🇸 Español
                            </Badge>
                          </div>
                          <pre className="whitespace-pre-wrap text-sm text-blue-900">
                            {suggestions.suggestedResponse.textEs}
                          </pre>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                No hay sugerencias disponibles para este correo.
              </div>
            )}

            <Separator className="my-6" />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Gestión del Ticket</h3>

              <div>
                <Label>Estado</Label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="New">Nuevo</option>
                  <option value="Active">Activo</option>
                  <option value="Resolved">Resuelto</option>
                  <option value="Closed">Cerrado</option>
                </select>
              </div>

              <div>
                <Label>Prioridad</Label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="">Sin asignar</option>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div>
                <Label>Notas de Resolución</Label>
                <textarea
                  className="mt-1 min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe cómo se resolvió este ticket para que el agente de IA aprenda..."
                />
              </div>

              <Button
                onClick={handleSaveTicketData}
                disabled={saving}
                className="w-full"
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </div>
      </div>
  );
}
