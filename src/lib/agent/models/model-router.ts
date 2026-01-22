import { TaskType, ModelConfig } from '../types/agent-types';

export class ModelRouter {
  /**
   * Selecciona el modelo apropiado según el tipo de tarea
   * Haiku: rápido y barato para clasificación/búsqueda
   * Sonnet: mejor calidad para generación de respuestas
   */
  selectModel(context: {
    taskType: TaskType;
    complexity?: number;
    needsReasoning?: boolean;
  }): ModelConfig {
    // Usar Haiku para tareas rápidas
    if (
      context.taskType === 'classification' ||
      context.taskType === 'search' ||
      context.taskType === 'summary'
    ) {
      return {
        name: process.env.DEFAULT_FAST_MODEL || 'claude-3-5-haiku-20241022',
        provider: 'anthropic',
        maxTokens: 2048,
        temperature: 0.3,
      };
    }

    // Usar Sonnet para generación de respuestas complejas
    if (
      context.taskType === 'response_generation' ||
      context.needsReasoning ||
      (context.complexity !== undefined && context.complexity > 0.7)
    ) {
      return {
        name: process.env.DEFAULT_QUALITY_MODEL || 'claude-3-5-sonnet-20241022',
        provider: 'anthropic',
        maxTokens: 4096,
        temperature: 0.7,
      };
    }

    // Default: Haiku para análisis
    return {
      name: process.env.DEFAULT_FAST_MODEL || 'claude-3-5-haiku-20241022',
      provider: 'anthropic',
      maxTokens: 2048,
      temperature: 0.5,
    };
  }
}
