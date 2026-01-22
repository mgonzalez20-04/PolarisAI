import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AgentOrchestrator } from '@/lib/agent/core/agent-orchestrator';
import { AgentConfig } from '@/lib/agent/types/agent-types';

// Configuración del agente
const agentConfig: AgentConfig = {
  models: {
    haiku: process.env.DEFAULT_FAST_MODEL || 'claude-3-5-haiku-20241022',
    sonnet: process.env.DEFAULT_QUALITY_MODEL || 'claude-3-5-sonnet-20241022',
  },
  ragConfig: {
    knowledgeBase: {
      enabled: process.env.ENABLE_RAG === 'true',
      topK: parseInt(process.env.RAG_KNOWLEDGE_BASE_TOP_K || '5'),
      minSimilarity: parseFloat(process.env.RAG_MIN_SIMILARITY || '0.75'),
    },
    historicalCases: {
      enabled: process.env.ENABLE_RAG === 'true',
      topK: parseInt(process.env.RAG_HISTORICAL_CASES_TOP_K || '10'),
      minConfidence: parseFloat(process.env.RAG_MIN_SIMILARITY || '0.7'),
    },
    conversations: {
      enabled: process.env.ENABLE_RAG === 'true',
      topK: 5,
    },
    reranking: {
      enabled: true,
      topK: 5,
    },
  },
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailId, message, taskType = 'response_generation' } = await req.json();

    if (!emailId || !message) {
      return NextResponse.json(
        { error: 'emailId and message are required' },
        { status: 400 }
      );
    }

    // Verificar que el email existe y pertenece al usuario
    const email = await prisma.email.findFirst({
      where: { id: emailId, userId: session.user.id },
    });

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Inicializar orchestrator con configuración completa
    const orchestrator = new AgentOrchestrator(agentConfig);

    // Procesar mensaje con RAG completo y tools
    const response = await orchestrator.processMessage({
      emailId,
      userId: session.user.id,
      message,
      taskType: taskType as any,
    });

    // Guardar métricas
    await prisma.agentMetrics.create({
      data: {
        conversationId: response.conversationId,
        userId: session.user.id,
        model: response.model,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        cost: response.cost,
        responseTimeMs: response.responseTimeMs,
        toolsUsed: JSON.stringify(response.toolCalls.map((t) => t.name)),
        ragSources: JSON.stringify(
          response.ragSources.map((s) => ({
            source: s.source,
            score: s.score,
          }))
        ),
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in agent chat:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
