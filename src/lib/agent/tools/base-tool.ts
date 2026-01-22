import { z } from 'zod';
import { ToolResult } from '../types/tool-types';

export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: z.ZodSchema;

  abstract execute(input: any): Promise<ToolResult>;

  /**
   * Valida input con zod schema
   */
  protected validate(input: any): any {
    try {
      return this.inputSchema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid input: ${error.errors.map((e) => e.message).join(', ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Convierte la tool a formato compatible con Claude/LangChain
   */
  toClaudeTool() {
    return {
      name: this.name,
      description: this.description,
      input_schema: this.zodToJsonSchema(this.inputSchema),
    };
  }

  /**
   * Convierte Zod schema a JSON Schema para Claude
   */
  private zodToJsonSchema(schema: z.ZodSchema): any {
    // Simplificación - en producción usar librería como zod-to-json-schema
    if (schema instanceof z.ZodObject) {
      const shape = (schema as any).shape;
      const properties: any = {};
      const required: string[] = [];

      Object.keys(shape).forEach((key) => {
        const field = shape[key];
        properties[key] = this.zodFieldToJson(field);

        if (!field.isOptional()) {
          required.push(key);
        }
      });

      return {
        type: 'object',
        properties,
        required,
      };
    }

    return { type: 'object' };
  }

  private zodFieldToJson(field: any): any {
    if (field instanceof z.ZodString) {
      return { type: 'string', description: field.description };
    }
    if (field instanceof z.ZodNumber) {
      return { type: 'number', description: field.description };
    }
    if (field instanceof z.ZodBoolean) {
      return { type: 'boolean', description: field.description };
    }
    if (field instanceof z.ZodArray) {
      return {
        type: 'array',
        items: this.zodFieldToJson(field._def.type),
        description: field.description,
      };
    }
    if (field instanceof z.ZodEnum) {
      return {
        type: 'string',
        enum: field._def.values,
        description: field.description,
      };
    }
    return { type: 'string' };
  }
}
