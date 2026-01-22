'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bot, User, Send, X, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentMessageFeedback } from './agent-message-feedback';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  messageId?: string; // ID del mensaje del agente para feedback
}

interface AgentChatPanelProps {
  emailId: string;
  onClose: () => void;
}

export function AgentChatPanel({ emailId, onClose }: AgentChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cargar conversación existente al montar
  useEffect(() => {
    loadExistingConversation();
  }, [emailId]);

  const loadExistingConversation = async () => {
    // Por ahora, empezar conversación vacía
    // En el futuro, podrías cargar el historial desde /api/agent/conversations
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId,
          message: input,
          taskType: 'response_generation',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from agent');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.text,
        timestamp: new Date(),
        messageId: data.messageId || `msg_${Date.now()}`, // Usar messageId de la respuesta
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setConversationId(data.conversationId);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-[600px] w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Agente de Soporte IA</h3>
          <Sparkles className="h-4 w-4 text-yellow-500" />
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="h-12 w-12 mb-4 text-muted-foreground/50" />
            <p className="text-sm">
              Pregúntame cualquier cosa sobre este email
            </p>
            <p className="text-xs mt-2">
              Puedo ayudarte a redactar respuestas, buscar soluciones similares, o crear casos
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                )}

                <div className="max-w-[80%]">
                  <div
                    className={cn(
                      'rounded-lg px-4 py-2',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Feedback solo para mensajes del asistente */}
                  {message.role === 'assistant' && conversationId && message.messageId && (
                    <AgentMessageFeedback
                      messageId={message.messageId}
                      conversationId={conversationId}
                      emailId={emailId}
                      originalMessage={message.content}
                    />
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  </div>
                )}
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
                    <p className="text-sm text-muted-foreground">Pensando...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {conversationId && (
          <p className="text-xs text-muted-foreground mt-2">
            Conversación guardada • Los mensajes se reutilizan para ahorrar costos
          </p>
        )}
      </div>
    </Card>
  );
}
