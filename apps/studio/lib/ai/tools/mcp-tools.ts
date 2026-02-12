import type { ToolSet } from 'ai'
// End of third-party imports

import type { AiOptInLevel } from 'hooks/misc/useOrgOptedIntoAi'
import { createSupabaseMCPClient } from '../supabase-mcp'
import { filterToolsByOptInLevel, toolSetValidationSchema } from '../tool-filter'

const DEFAULT_UI_EXECUTED_TOOLS = ['execute_sql', 'deploy_edge_function']

/**
 * Get the list of tools that are executed on the UI side.
 * Accepts an optional override for testing or custom configurations.
 */
function getUiExecutedTools(overrides?: string[]): string[] {
  return overrides ?? DEFAULT_UI_EXECUTED_TOOLS
}

export const getMcpTools = async ({
  accessToken,
  projectRef,
  aiOptInLevel,
  uiToolOverrides,
}: {
  accessToken: string
  projectRef: string
  aiOptInLevel: AiOptInLevel
  uiToolOverrides?: string[]
}) => {
  // If platform, fetch MCP client and tools which replace old local tools
  const mcpClient = await createSupabaseMCPClient({
    accessToken,
    projectId: projectRef,
  })

  const availableMcpTools = (await mcpClient.tools()) as ToolSet
  const availableCount = Object.keys(availableMcpTools).length

  // Filter tools based on the (potentially modified) AI opt-in level
  const allowedMcpTools = filterToolsByOptInLevel(availableMcpTools, aiOptInLevel)
  const allowedCount = Object.keys(allowedMcpTools).length

  if (availableCount !== allowedCount) {
    console.info(
      `[MCP] Filtered tools by opt-in level '${aiOptInLevel}': ${availableCount} available -> ${allowedCount} allowed`
    )
  }

  // Remove UI-executed tools handled locally
  const uiTools = getUiExecutedTools(uiToolOverrides)
  const filteredMcpTools: ToolSet = { ...allowedMcpTools }
  uiTools.forEach((toolName) => {
    delete filteredMcpTools[toolName]
  })

  // Validate that only known tools are provided
  const validation = toolSetValidationSchema.safeParse(filteredMcpTools)
  if (!validation.success) {
    console.error('MCP tools validation error:', validation.error)
    throw new Error('Internal error: MCP tools validation failed')
  }

  return validation.data
}
