"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Check,
  X,
  Edit,
  Save,
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface AgentMessageFeedbackProps {
  messageId: string;
  conversationId: string;
  emailId: string;
  originalMessage: string;
  onFeedbackSubmitted?: () => void;
}

export function AgentMessageFeedback({
  messageId,
  conversationId,
  emailId,
  originalMessage,
  onFeedbackSubmitted,
}: AgentMessageFeedbackProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState("");
  const [showEditBox, setShowEditBox] = useState(false);
  const [correctedMessage, setCorrectedMessage] = useState(originalMessage);
  const [submitting, setSubmitting] = useState(false);

  const handleRating = async (rating: 'positive' | 'negative') => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/agent/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId,
          conversationId,
          messageId,
          feedbackType: 'rating',
          rating: rating === 'positive' ? 1 : -1,
          metadata: { timestamp: new Date().toISOString() },
        }),
      });

      if (response.ok) {
        setFeedbackGiven(rating);
        onFeedbackSubmitted?.();
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/agent/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId,
          conversationId,
          messageId,
          feedbackType: 'rating',
          rating: feedbackGiven === 'positive' ? 1 : -1,
          comment: comment.trim(),
          metadata: { hasComment: true },
        }),
      });

      if (response.ok) {
        setShowCommentBox(false);
        setComment("");
        onFeedbackSubmitted?.();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCorrectionSubmit = async () => {
    if (correctedMessage.trim() === originalMessage.trim()) {
      setShowEditBox(false);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/agent/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId,
          conversationId,
          messageId,
          feedbackType: 'correction',
          originalSuggestion: originalMessage,
          userChoice: correctedMessage.trim(),
          metadata: { correctionLength: correctedMessage.length },
        }),
      });

      if (response.ok) {
        setShowEditBox(false);
        onFeedbackSubmitted?.();
      }
    } catch (error) {
      console.error('Error submitting correction:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Botones de rating principal */}
      <div className="flex items-center gap-2">
        <Button
          variant={feedbackGiven === 'positive' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleRating('positive')}
          disabled={submitting || feedbackGiven !== null}
          className="h-8"
        >
          <ThumbsUp className={`h-4 w-4 ${feedbackGiven === 'positive' ? 'fill-current' : ''}`} />
        </Button>

        <Button
          variant={feedbackGiven === 'negative' ? 'destructive' : 'ghost'}
          size="sm"
          onClick={() => handleRating('negative')}
          disabled={submitting || feedbackGiven !== null}
          className="h-8"
        >
          <ThumbsDown className={`h-4 w-4 ${feedbackGiven === 'negative' ? 'fill-current' : ''}`} />
        </Button>

        {feedbackGiven && !showCommentBox && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCommentBox(true)}
            className="h-8"
          >
            <MessageSquare className="mr-1 h-4 w-4" />
            Añadir comentario
          </Button>
        )}

        {!showEditBox && !feedbackGiven && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEditBox(true)}
            className="h-8"
          >
            <Edit className="mr-1 h-4 w-4" />
            Corregir respuesta
          </Button>
        )}
      </div>

      {/* Caja de comentario */}
      {showCommentBox && (
        <Card className="p-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {feedbackGiven === 'positive'
                ? '¿Qué te gustó de esta respuesta?'
                : '¿Qué podría mejorarse?'}
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escribe tu comentario aquí..."
              className="min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCommentBox(false);
                  setComment("");
                }}
              >
                <X className="mr-1 h-4 w-4" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleCommentSubmit}
                disabled={!comment.trim() || submitting}
              >
                <Check className="mr-1 h-4 w-4" />
                Enviar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Caja de corrección */}
      {showEditBox && (
        <Card className="p-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Edita la respuesta con tu versión corregida:
            </label>
            <p className="text-xs text-muted-foreground">
              El agente aprenderá de tu corrección para mejorar respuestas futuras
            </p>
            <Textarea
              value={correctedMessage}
              onChange={(e) => setCorrectedMessage(e.target.value)}
              className="min-h-[120px] font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEditBox(false);
                  setCorrectedMessage(originalMessage);
                }}
              >
                <X className="mr-1 h-4 w-4" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleCorrectionSubmit}
                disabled={submitting}
              >
                <Save className="mr-1 h-4 w-4" />
                Guardar corrección
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Mensaje de confirmación */}
      {feedbackGiven && !showCommentBox && (
        <p className="text-xs text-muted-foreground">
          Gracias por tu feedback. El agente mejorará con tu ayuda.
        </p>
      )}
    </div>
  );
}
