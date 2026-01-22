/**
 * API Endpoint para búsqueda vectorial en la base de conocimientos
 * Usado como herramienta (tool) por OpenAI en n8n para acceder al vector store
 */

import { NextRequest, NextResponse } from 'next/server';
import { EmbeddingService } from '@/lib/agent/rag/embeddings/embedding-service';
import { searchKnowledgeBase } from '@/lib/vector-search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SearchRequest {
  query: string;
  limit?: number;
  userId?: string;
  minSimilarity?: number;
}

/**
 * POST /api/vector-search/knowledge
 * Busca en la base de conocimientos usando embeddings vectoriales
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar API key (seguridad)
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    const expectedKey = process.env.N8N_WEBHOOK_API_KEY;

    if (!expectedKey) {
      return NextResponse.json(
        { error: 'Server configuration error: N8N_WEBHOOK_API_KEY not set' },
        { status: 500 }
      );
    }

    if (!apiKey || apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Parsear body
    const body: SearchRequest = await request.json();
    const { query, limit = 5, userId, minSimilarity = 0.7 } = body;

    // Validar query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Verificar que OpenAI esté configurado
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 503 }
      );
    }

    // Generar embedding de la query
    const embeddingService = new EmbeddingService();
    const queryEmbedding = await embeddingService.embed(query.trim());

    // Buscar en la base de conocimientos
    const rawResults = await searchKnowledgeBase(queryEmbedding, limit, userId);

    // Filtrar por similitud mínima
    const results = rawResults.filter(r => r.similarity >= minSimilarity);

    // Formatear respuesta
    const response = {
      success: true,
      query,
      resultsCount: results.length,
      results: results.map(r => ({
        documentId: r.documentId,
        documentTitle: r.documentTitle,
        category: r.category,
        contentPreview: r.content.substring(0, 500) + (r.content.length > 500 ? '...' : ''), // Solo preview
        similarity: Math.round(r.similarity * 100) / 100, // Redondear a 2 decimales
      })),
      metadata: {
        limit,
        minSimilarity,
        totalFound: rawResults.length,
        filtered: rawResults.length - results.length,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('[Vector Search API] Error:', error);

    // Errores específicos
    if (error.message?.includes('OpenAI API key not configured')) {
      return NextResponse.json(
        { error: 'OpenAI service unavailable', details: error.message },
        { status: 503 }
      );
    }

    if (error.message?.includes('Invalid embedding')) {
      return NextResponse.json(
        { error: 'Embedding generation failed', details: error.message },
        { status: 500 }
      );
    }

    // Error genérico
    return NextResponse.json(
      { error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

/**
 * GET /api/vector-search/knowledge
 * Health check y documentación del endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'operational',
    endpoint: '/api/vector-search/knowledge',
    method: 'POST',
    description: 'Search knowledge base using vector embeddings (for OpenAI function calling in n8n)',
    authentication: 'Required: x-api-key header or Authorization Bearer token',
    usage: {
      request: {
        query: 'string (required) - The search query',
        limit: 'number (optional, default: 5) - Maximum number of results',
        userId: 'string (optional) - Filter by user ID',
        minSimilarity: 'number (optional, default: 0.7) - Minimum similarity threshold (0-1)',
      },
      response: {
        success: 'boolean',
        query: 'string - The original query',
        resultsCount: 'number - Number of results returned',
        results: 'array - Search results with documentId, documentTitle, category, content, similarity',
        metadata: 'object - Search metadata',
      },
    },
    example: {
      request: {
        query: '¿Cómo configurar el agente de IA?',
        limit: 3,
        minSimilarity: 0.75,
      },
      response: {
        success: true,
        query: '¿Cómo configurar el agente de IA?',
        resultsCount: 2,
        results: [
          {
            documentId: 'doc_123',
            documentTitle: 'Configuración del Agente',
            category: 'setup',
            content: 'Para configurar el agente...',
            similarity: 0.92,
          },
        ],
      },
    },
  });
}
