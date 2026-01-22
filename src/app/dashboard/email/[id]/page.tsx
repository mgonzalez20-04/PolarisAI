"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Sparkles, Plus, X, Bot, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { TagBadge } from "@/components/tag-badge";
import { TagsManager } from "@/components/tags-manager";
import { AgentChatPanel } from "@/components/agent-chat-panel";
import type { SuggestionResult, Suggestion as SuggestionType } from "@/lib/suggestions/types";

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
  status: string; // New | Active | Resolved | Closed
  priority?: string; // low | medium | high | urgent
  resolutionNotes?: string;
  tags?: Array<{
    tag: Tag;
  }>;
}

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [email, setEmail] = useState<Email | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [status, setStatus] = useState("New");
  const [priority, setPriority] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showAgentChat, setShowAgentChat] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchEmail();
    }
  }, [params.id]);

  useEffect(() => {
    fetchAvailableTags();
  }, []);

  const fetchEmail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/emails/${params.id}`);
      const data = await res.json();
      setEmail(data);

      // Cargar estado actual
      setStatus(data.status || "New");
      setPriority(data.priority || "");
      setResolutionNotes(data.resolutionNotes || "");

      // Mark as read
      if (!data.isRead) {
        await fetch(`/api/emails/${params.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true }),
        });
      }

      // Fetch suggestions
      fetchSuggestions();
    } catch (error) {
      console.error("Error fetching email:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/emails/${params.id}/suggestions`);
      const data = await res.json();
      setSuggestions(data);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSaveTicketData = async () => {
    if (!email) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/emails/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority: priority || null,
          resolutionNotes: resolutionNotes || null,
        }),
      });

      if (res.ok) {
        // Refresh email data
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
    try {
      const res = await fetch(`/api/emails/${params.id}/tags`, {
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
    try {
      const res = await fetch(`/api/emails/${params.id}/tags/${tagId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchEmail();
      }
    } catch (error) {
      console.error("Error removing tag:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold">Correo no encontrado</h2>
          <Link href="/dashboard">
            <Button variant="outline">Volver a la bandeja</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-3">
      <div className="col-span-2 overflow-auto border-r p-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la bandeja
          </Button>
        </Link>

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
              <strong>Fecha:</strong> {format(new Date(email.receivedAt), "d 'de' MMMM 'de' yyyy, HH:mm'h'", { locale: es })}
            </p>
          </div>

          {/* Etiquetas */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {email.tags && email.tags.map((emailTag) => (
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
                <Plus className="h-3 w-3 mr-1" />
                Añadir etiqueta
              </Button>
            ) : (
              <div className="relative">
                <div className="absolute top-0 left-0 z-10 rounded-md border bg-popover p-2 shadow-md">
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
                    {availableTags.filter(
                      (tag) => !email.tags?.some((et) => et.tag.id === tag.id)
                    ).length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Todas las etiquetas están asignadas
                      </p>
                    ) : (
                      availableTags
                        .filter(
                          (tag) => !email.tags?.some((et) => et.tag.id === tag.id)
                        )
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
            <pre className="whitespace-pre-wrap font-sans">{email.bodyText || email.bodyPreview}</pre>
          )}
        </div>
      </div>

      <div className="overflow-auto bg-muted/20 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center text-xl font-semibold">
            <Sparkles className="mr-2 h-5 w-5 text-primary" />
            {showAgentChat ? 'Chat con el Agente' : 'Sugerencias IA'}
          </h2>
          <Button
            variant={showAgentChat ? "secondary" : "default"}
            size="sm"
            onClick={() => setShowAgentChat(!showAgentChat)}
          >
            {showAgentChat ? (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Ver Sugerencias
              </>
            ) : (
              <>
                <Bot className="mr-2 h-4 w-4" />
                Chat IA
              </>
            )}
          </Button>
        </div>

        {showAgentChat ? (
          <AgentChatPanel
            emailId={params.id as string}
            onClose={() => setShowAgentChat(false)}
          />
        ) : (
          <>
            {loadingSuggestions ? (
          <div className="text-sm text-muted-foreground">
            Analizando casos similares...
          </div>
        ) : suggestions && suggestions.suggestions && suggestions.suggestions.length > 0 ? (
          <>
            <div className="mb-6 space-y-3">
              <h3 className="text-sm font-semibold">Casos Similares</h3>
              {suggestions.suggestions.map((suggestion, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-4">
                    <h4 className="mb-1 font-semibold">{suggestion.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {suggestion.description}
                    </p>
                    <div className="mt-2">
                      <Badge variant="secondary">
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

                {/* Respuesta en idioma original */}
                <Card>
                  <CardContent className="pt-4">
                    {suggestions.suggestedResponse.detectedLanguage &&
                     suggestions.suggestedResponse.detectedLanguage !== "es" && (
                      <div className="mb-2">
                        <Badge variant="outline" className="text-xs">
                          {suggestions.suggestedResponse.detectedLanguage === "en" && "🇬🇧 Inglés"}
                          {suggestions.suggestedResponse.detectedLanguage === "de" && "🇩🇪 Alemán"}
                        </Badge>
                      </div>
                    )}
                    <pre className="whitespace-pre-wrap text-sm">
                      {suggestions.suggestedResponse.text}
                    </pre>
                  </CardContent>
                </Card>

                {/* Traducción al español si el idioma no es español */}
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
          </>
        )}
      </div>
    </div>
  );
}
