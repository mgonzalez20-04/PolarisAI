import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { BaseTool } from './base-tool';
import { ToolResult } from '../types/tool-types';
import { EmbeddingService } from '../rag/embeddings/embedding-service';

export class CreateCaseTool extends BaseTool {
  name = 'create_case';
  description = 'Create a new support case from an email with resolution and response';

  inputSchema = z.object({
    emailId: z.string().describe('The ID of the email to create a case for'),
    title: z.string().describe('Title/summary of the case'),
    resolution: z
      .string()
      .describe('How the issue was resolved (technical details)'),
    response: z
      .string()
      .describe('Response sent to the customer'),
    tags: z
      .array(z.string())
      .optional()
      .describe('Tags/categories for the case'),
    category: z.string().optional().describe('Category of the case'),
  });

  async execute(input: z.infer<typeof this.inputSchema>): Promise<ToolResult> {
    const validated = this.validate(input);

    try {
      // Verificar que el email existe
      const email = await prisma.email.findUnique({
        where: { id: validated.emailId },
      });

      if (!email) {
        return {
          success: false,
          error: 'Email not found',
        };
      }

      // Verificar que no existe ya un caso para este email
      const existingCase = await prisma.case.findUnique({
        where: { emailId: validated.emailId },
      });

      if (existingCase) {
        return {
          success: false,
          error: 'A case already exists for this email',
        };
      }

      // Generar embedding del caso para futuras búsquedas
      const embeddingService = new EmbeddingService();
      const caseText = `${email.subject}\n\n${email.bodyText || email.bodyPreview}\n\nResolution: ${validated.resolution}`;
      const embedding = await embeddingService.embed(caseText);

      // Crear el caso
      const case_ = await prisma.case.create({
        data: {
          emailId: validated.emailId,
          userId: email.userId,
          title: validated.title,
          description: email.bodyText || email.bodyPreview || '',
          resolution: validated.resolution,
          response: validated.response,
          tags: validated.tags ? JSON.stringify(validated.tags) : null,
          category: validated.category,
          embedding: JSON.stringify(embedding),
          status: 'resolved',
          resolvedAt: new Date(),
        },
      });

      // Actualizar el email
      await prisma.email.update({
        where: { id: validated.emailId },
        data: {
          hasCase: true,
          status: 'Resolved',
        },
      });

      return {
        success: true,
        data: {
          caseId: case_.id,
          title: case_.title,
          status: case_.status,
        },
        message: 'Case created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
