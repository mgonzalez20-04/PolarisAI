import { z } from 'zod';

// Tool Types
export interface ToolResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  execute: (input: any) => Promise<ToolResult>;
}

export interface LangChainTool {
  name: string;
  description: string;
  schema: any;
  func: (input: any) => Promise<any>;
}
