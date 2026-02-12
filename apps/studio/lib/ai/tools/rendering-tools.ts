import { tool } from 'ai'
import type { ToolSet } from 'ai'
import { z } from 'zod'

/** Schema for chart rendering configuration */
const chartConfigSchema = z.object({
  view: z.enum(['table', 'chart']).describe('How to render the results after execution'),
  xAxis: z.string().optional().describe('The column to use for the x-axis of the chart.'),
  yAxis: z.string().optional().describe('The column to use for the y-axis of the chart.'),
})

/** Schema for SQL execution input */
const executeSqlInputSchema = z.object({
  sql: z.string().describe('The SQL statement to execute.'),
  label: z.string().describe('A short 2-4 word label for the SQL statement.'),
  chartConfig: chartConfigSchema.describe('Chart configuration for rendering the results'),
  isWriteQuery: z
    .boolean()
    .describe(
      'Whether the SQL statement performs a write operation of any kind instead of a read operation'
    ),
})

/** Schema for edge function deployment input */
const deployEdgeFunctionInputSchema = z.object({
  name: z.string().describe('The URL-friendly name/slug of the Edge Function.'),
  code: z.string().describe('The TypeScript code for the Edge Function.'),
})

/** Schema for chat renaming input */
const renameChatInputSchema = z.object({
  newName: z.string().describe('The new name for the chat session. Five words or less.'),
})

/**
 * Returns UI rendering tools that handle client-side interactions.
 * These tools are always available regardless of opt-in level.
 */
export const getRenderingTools = (): ToolSet => ({
  /** Prompts the user to execute a SQL statement and view results */
  execute_sql: tool({
    description: 'Asks the user to execute a SQL statement and return the results',
    inputSchema: executeSqlInputSchema,
  }),
  /** Deploys a Supabase Edge Function from AI-generated code */
  deploy_edge_function: tool({
    description:
      'Ask the user to deploy a Supabase Edge Function from provided code on the client. Client will confirm before deploying and return the result',
    inputSchema: deployEdgeFunctionInputSchema,
  }),
  /** Renames the current chat session to match the conversation topic */
  rename_chat: tool({
    description: `Rename the current chat session when the current chat name doesn't describe the conversation topic.`,
    inputSchema: renameChatInputSchema,
    execute: async () => {
      return { status: 'Chat request sent to client' }
    },
  }),
})
