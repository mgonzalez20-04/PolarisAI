import { BaseTool } from './base-tool';
import { GetEmailContextTool } from './get-email-context.tool';
import { CreateCaseTool } from './create-case.tool';
import { QueryExternalDatabaseTool } from './query-external-db.tool';

export class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map();

  constructor() {
    // Registrar todas las tools disponibles
    this.register(new GetEmailContextTool());
    this.register(new CreateCaseTool());
    this.register(new QueryExternalDatabaseTool());
    // Agregar más tools aquí según se implementen
  }

  register(tool: BaseTool): void {
    this.tools.set(tool.name, tool);
  }

  getAvailableTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Convierte tools a formato Claude
   */
  toClaudeTools(): any[] {
    return this.getAvailableTools().map((tool) => tool.toClaudeTool());
  }

  /**
   * Ejecuta una tool por nombre
   */
  async executeTool(name: string, input: any): Promise<any> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    return await tool.execute(input);
  }
}
