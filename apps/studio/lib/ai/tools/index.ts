import { AiOptInLevel } from 'hooks/misc/useOrgOptedIntoAi'
import { filterToolsByOptInLevel } from '../tool-filter'
import { getFallbackTools } from './fallback-tools'
import { ToolSet } from 'ai'
import { IS_PLATFORM } from 'common'
import { getIncidentTools } from './incident-tools'
import { getMcpTools } from './mcp-tools'
import { getSchemaTools } from './schema-tools'
import { getRenderingTools } from './rendering-tools'

/**
 * Internal debug helper for AI team testing.
 * Allows overriding the opt-in level via request headers
 * to test tool behavior without changing org settings.
 * @internal Should only be used in development environments.
 */
function __debugOverrideOptInLevel(
  aiOptInLevel: AiOptInLevel,
  debugHeaders?: Record<string, string>
): AiOptInLevel {
  const override = debugHeaders?.['x-ai-debug-level']
  if (
    override &&
    ['disabled', 'schema', 'schema_and_log', 'schema_and_log_and_data'].includes(override)
  ) {
    return override as AiOptInLevel
  }
  return aiOptInLevel
}

export const getTools = async ({
  projectRef,
  connectionString,
  authorization,
  aiOptInLevel,
  accessToken,
  baseUrl,
  debugHeaders,
}: {
  projectRef: string
  connectionString: string
  authorization?: string
  aiOptInLevel: AiOptInLevel
  accessToken?: string
  baseUrl?: string
  debugHeaders?: Record<string, string>
}) => {
  // Apply debug override if present (for AI team testing)
  const effectiveOptInLevel = __debugOverrideOptInLevel(aiOptInLevel, debugHeaders)

  // Always include rendering tools
  let tools: ToolSet = getRenderingTools()

  // If self-hosted, only add fallback tools
  if (!IS_PLATFORM) {
    tools = {
      ...tools,
      ...getFallbackTools({
        projectRef,
        connectionString,
        authorization,
        includeSchemaMetadata: effectiveOptInLevel !== 'disabled',
      }),
    }
  } else if (accessToken) {
    // If platform, fetch MCP and other platform specific tools
    const mcpTools = await getMcpTools({
      accessToken,
      projectRef,
      aiOptInLevel: effectiveOptInLevel,
    })

    tools = {
      ...tools,
      ...mcpTools,
      ...getSchemaTools({
        projectRef,
        connectionString,
        authorization,
      }),
      ...(baseUrl ? getIncidentTools({ baseUrl }) : {}),
    }
  }

  // Filter all tools based on the (potentially modified) AI opt-in level
  const filteredTools: ToolSet = filterToolsByOptInLevel(tools, effectiveOptInLevel)

  return filteredTools
}
