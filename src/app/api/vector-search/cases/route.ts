/**
 * API Endpoint para búsqueda vectorial de casos resueltos
 * Usado como herramienta (tool) por OpenAI en n8n para buscar soluciones previas
 */

import { NextRequest, NextResponse } from 'next/server';
import { EmbeddingService } from '@/lib/agent/rag/embeddings/embedding-service';
import { searchSimilarCases } from '@/lib/vector-search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SearchCasesRequest {
  query: string;
  userId: string;
  limit?: number;
  minSimilarity?: number;
}

/**
 * POST /api/vector-search/cases
 * Busca casos resueltos similares usando embeddings vectoriales
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
    const body: SearchCasesRequest = await request.json();
    const { query, userId, limit = 5, minSimilarity = 0.7 } = body;

    // Validar parámetros
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId parameter is required' },
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

    // Buscar casos similares
    const rawResults = await searchSimilarCases(userId, queryEmbedding, limit);

    // Filtrar por similitud mínima
    const results = rawResults.filter(r => r.similarity >= minSimilarity);

    // Formatear respuesta
    const response = {
      success: true,
      query,
      userId,
      resultsCount: results.length,
      results: results.map(r => ({
        caseId: r.id,
        title: r.title,
        description: r.description,
        resolution: r.resolution,
        response: r.response,
        category: r.category,
        priority: r.priority,
        status: r.status,
        resolvedAt: r.resolvedAt,
        similarity: Math.round(r.similarity * 100) / 100,
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
    console.error('[Vector Search Cases API] Error:', error);

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

    return NextResponse.json(
      { error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

/**
 * GET /api/vector-search/cases
 * Health check y documentación del endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'operational',
    endpoint: '/api/vector-search/cases',
    method: 'POST',
    description: 'Search resolved cases using vector embeddings (for OpenAI function calling in n8n)',
    authentication: 'Required: x-api-key header or Authorization Bearer token',
    usage: {
      request: {
        query: 'string (required) - The search query',
        userId: 'string (required) - User ID to search cases for',
        limit: 'number (optional, default: 5) - Maximum number of results',
        minSimilarity: 'number (optional, default: 0.7) - Minimum similarity threshold (0-1)',
      },
      response: {
        success: 'boolean',
        query: 'string - The original query',
        userId: 'string',
        resultsCount: 'number',
        results: 'array - Resolved cases with caseId, title, resolution, response, similarity',
        metadata: 'object - Search metadata',
      },
    },
    example: {
      request: {
        query: 'problema con autenticación de usuario',
        userId: 'user_123',
        limit: 3,
      },
      response: {
        success: true,
        query: 'problema con autenticación de usuario',
        userId: 'user_123',
        resultsCount: 2,
        results: [
          {
            caseId: 'case_456',
            title: 'Error de login',
            resolution: 'Se reinició el servicio de autenticación',
            similarity: 0.89,
          },
        ],
      },
    },
  });
}
