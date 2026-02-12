import type { ToolUIPart, UIMessage } from 'ai'
// End of third-party imports

import type { AiOptInLevel } from 'hooks/misc/useOrgOptedIntoAi'
import type { ToolName } from '../tool-filter'

interface ToolSanitizer {
  toolName: ToolName
  sanitize: <Tool extends ToolUIPart>(tool: Tool, optInLevel: AiOptInLevel) => Tool
}

/**
 * Type guard to check if a message part is a tool UI part.
 * Tool parts have a type prefixed with 'tool-' followed by the tool name.
 */
function isToolUIPart(
  part: UIMessage['parts'][number]
): part is ToolUIPart & { type: `tool-${string}` } {
  return typeof part.type === 'string' && part.type.startsWith('tool-')
}

/** Extract the tool name from a ToolUIPart's type field */
function getToolNameFromPart(part: ToolUIPart): string {
  return part.type.slice('tool-'.length)
}

export const NO_DATA_PERMISSIONS =
  'The query was executed and the user has viewed the results but decided not to share in the conversation due to permission levels. Continue with your plan unless instructed to interpret the result.'

const executeSqlSanitizer: ToolSanitizer = {
  toolName: 'execute_sql',
  sanitize: (tool, optInLevel) => {
    const output = tool.output
    let sanitizedOutput: unknown

    if (optInLevel !== 'schema_and_log_and_data') {
      if (Array.isArray(output)) {
        sanitizedOutput = NO_DATA_PERMISSIONS
      }
    } else {
      sanitizedOutput = output
    }

    return {
      ...tool,
      output: sanitizedOutput,
    }
  },
}

export const ALL_TOOL_SANITIZERS = {
  [executeSqlSanitizer.toolName]: executeSqlSanitizer,
}

export function sanitizeMessagePart(
  part: UIMessage['parts'][number],
  optInLevel: AiOptInLevel
): UIMessage['parts'][number] {
  if (isToolUIPart(part)) {
    const toolName = getToolNameFromPart(part)
    const sanitizer = ALL_TOOL_SANITIZERS[toolName]
    if (sanitizer) {
      return sanitizer.sanitize(part, optInLevel)
    }
  }

  return part
}
