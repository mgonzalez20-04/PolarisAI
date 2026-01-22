"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  User,
  Send,
  Loader2,
  Sparkles,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: Array<{ source: string; score: number }>;
}

const SUGGESTED_QUESTIONS = [
  "¿Cómo sincronizo mis emails de Outlook?",
  "¿Cómo funciona el agente de IA?",
  "¿Cómo creo y gestiono etiquetas?",
  "¿Qué es un caso y cuándo debo crear uno?",
  "¿Cómo puedo mejorar las sugerencias del agente?",
  "¿Cómo organizo mis emails con carpetas?",
];

export default function HelpPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mensaje de bienvenida
  useEffect(() => {
    const welcomeMessage: Message = {
      role: "assistant",
      content: `¡Hola! Soy tu asistente de ayuda para PolarisAI Inbox Copilot.

Puedo ayudarte con:
- Cómo usar las funcionalidades de la aplicación
- Configuración y ajustes
- Solución de problemas
- Mejores prácticas y consejos

¿En qué puedo ayudarte hoy?`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/agent/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from help agent");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.text,
        timestamp: new Date(),
        sources: data.ragSources || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        role: "assistant",
        content:
          "Lo siento, hubo un error al procesar tu pregunta. Por favor, intenta de nuevo.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Centro de Ayuda</h1>
          <Sparkles className="h-6 w-6 text-yellow-500" />
        </div>
        <p className="text-muted-foreground">
          Pregunta cualquier cosa sobre cómo usar PolarisAI Inbox Copilot
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat principal */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col h-[600px]">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Asistente de Ayuda</CardTitle>
              </div>
              <CardDescription>
                Busco en toda la documentación para darte respuestas precisas
              </CardDescription>
            </CardHeader>

            {/* Messages */}
            <CardContent ref={scrollRef} className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={index}>
                    <div
                      className={cn(
                        "flex gap-3",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                      )}

                      <div className="max-w-[80%]">
                        <div
                          className={cn(
                            "rounded-lg px-4 py-2",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
                          <p className="text-xs mt-1 opacity-70">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>

                        {/* Mostrar fuentes */}
                        {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {message.sources.slice(0, 3).map((source, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                <BookOpen className="mr-1 h-3 w-3" />
                                {source.source.replace("docs/", "")}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {message.role === "user" && (
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p className="text-sm text-muted-foreground">
                          Buscando en la documentación...
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Pregunta algo sobre la aplicación..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button onClick={() => sendMessage()} disabled={loading || !input.trim()}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar con sugerencias */}
        <div className="space-y-4">
          {/* Preguntas sugeridas */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-lg">Preguntas Frecuentes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {SUGGESTED_QUESTIONS.map((question, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-start h-auto text-left py-2 px-3"
                  onClick={() => handleSuggestedQuestion(question)}
                  disabled={loading}
                >
                  <Search className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{question}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Recursos adicionales */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Recursos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold mb-1">Documentación Completa</h4>
                <p className="text-muted-foreground">
                  El asistente tiene acceso a toda la documentación actualizada de la
                  aplicación.
                </p>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-1">Base de Conocimientos</h4>
                <p className="text-muted-foreground">
                  Las respuestas se basan en el manual oficial y casos de uso reales.
                </p>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-1">Temas Cubiertos</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Gestión de emails</li>
                  <li>Agente de IA</li>
                  <li>Casos y tickets</li>
                  <li>Etiquetas y organización</li>
                  <li>Configuración</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
