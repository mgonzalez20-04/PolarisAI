import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/agent/feedback
 * Guarda feedback del usuario sobre respuestas del agente
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      emailId,
      conversationId,
      messageId,
      feedbackType, // 'rating' | 'correction' | 'suggestion_accepted' | 'suggestion_rejected'
      rating, // 1-5 or -1/1 for thumbs
      originalSuggestion,
      userChoice,
      comment,
      metadata,
    } = body;

    // Validación
    if (!feedbackType) {
      return NextResponse.json({ error: 'feedbackType is required' }, { status: 400 });
    }

    // Crear feedback
    const feedback = await prisma.agentFeedback.create({
      data: {
        userId: session.user.id,
        emailId: emailId || null,
        conversationId: conversationId || null,
        messageId: messageId || null,
        feedbackType,
        rating: rating || null,
        originalSuggestion: originalSuggestion || null,
        userChoice: userChoice || null,
        comment: comment || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
    });
  } catch (error) {
    console.error('Error saving feedback:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent/feedback?emailId=xxx
 * Obtiene feedback de un email específico
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const emailId = searchParams.get('emailId');
    const conversationId = searchParams.get('conversationId');

    if (!emailId && !conversationId) {
      return NextResponse.json(
        { error: 'emailId or conversationId is required' },
        { status: 400 }
      );
    }

    // Obtener feedback
    const feedback = await prisma.agentFeedback.findMany({
      where: {
        userId: session.user.id,
        ...(emailId && { emailId }),
        ...(conversationId && { conversationId }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
