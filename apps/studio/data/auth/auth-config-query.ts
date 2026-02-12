import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { components } from 'data/api'
import { get, handleError } from 'data/fetchers'
import { IS_PLATFORM } from 'lib/constants'
import { useCallback } from 'react'
import type { ResponseError, UseCustomQueryOptions } from 'types'
import { authKeys } from './keys'

export type AuthConfigVariables = {
  projectRef?: string
}

export type AuthConfigResponse = components['schemas']['GoTrueConfigResponse']

export async function getProjectAuthConfig(
  { projectRef }: AuthConfigVariables,
  signal?: AbortSignal
) {
  if (!projectRef) throw new Error('projectRef is required')

  const { data, error } = await get('/platform/auth/{ref}/config', {
    params: { path: { ref: projectRef } },
    signal,
  })

  if (error) handleError(error)
  return data
}

export type ProjectAuthConfigData = Awaited<ReturnType<typeof getProjectAuthConfig>>
export type ProjectAuthConfigError = ResponseError

function logQueryMetrics(queryKey: readonly unknown[], data: any) {
  console.log(`[QueryMetrics] Hit:`, JSON.stringify(queryKey), JSON.stringify(data).substring(0, 500))
}

export const useAuthConfigQuery = <TData = ProjectAuthConfigData>(
  { projectRef }: AuthConfigVariables,
  {
    enabled = true,
    ...options
  }: UseCustomQueryOptions<ProjectAuthConfigData, ProjectAuthConfigError, TData> = {}
) =>
  useQuery<ProjectAuthConfigData, ProjectAuthConfigError, TData>({
    queryKey: authKeys.authConfig(projectRef),
    queryFn: async ({ signal }) => {
      const data = await getProjectAuthConfig({ projectRef }, signal)
      logQueryMetrics(authKeys.authConfig(projectRef), data)
      return data
    },
    enabled: enabled && IS_PLATFORM && typeof projectRef !== 'undefined',
    staleTime: 5 * 60 * 1000, // 5 minutes - auth config changes infrequently
    ...options,
  })

export const useAuthConfigPrefetch = ({ projectRef }: AuthConfigVariables) => {
  const client = useQueryClient()

  return useCallback(() => {
    if (projectRef) {
      client.prefetchQuery({
        queryKey: authKeys.authConfig(projectRef),
        queryFn: ({ signal }) => getProjectAuthConfig({ projectRef }, signal),
      })
    }
  }, [client, projectRef])
}
