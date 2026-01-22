import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { BaseTool } from './base-tool';
import { ToolResult } from '../types/tool-types';

export class GetEmailContextTool extends BaseTool {
  name = 'get_email_context';
  description = 'Get detailed context about an email including sender, date, content, and related information';

  inputSchema = z.object({
    emailId: z.string().describe('The ID of the email to get context for'),
  });

  async execute(input: z.infer<typeof this.inputSchema>): Promise<ToolResult> {
    const { emailId } = this.validate(input);

    try {
      const email = await prisma.email.findUnique({
        where: { id: emailId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          case: true,
        },
      });

      if (!email) {
        return {
          success: false,
          error: 'Email not found',
        };
      }

      const context = {
        subject: email.subject,
        from: email.from,
        fromEmail: email.fromEmail,
        to: email.to,
        cc: email.cc,
        receivedAt: email.receivedAt,
        bodyPreview: email.bodyPreview,
        bodyText: email.bodyText,
        status: email.status,
        priority: email.priority,
        tags: email.tags.map((et) => et.tag.name),
        hasCase: email.hasCase,
        case: email.case
          ? {
              title: email.case.title,
              status: email.case.status,
              resolution: email.case.resolution,
            }
          : null,
      };

      return {
        success: true,
        data: context,
        message: 'Email context retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
