import { useQuery } from '@tanstack/react-query'

import { useIsLoggedIn } from 'common'
import { get } from 'data/fetchers'
import { IS_PLATFORM } from 'lib/constants'
import type { Permission, ResponseError, UseCustomQueryOptions } from 'types'
import { permissionKeys } from './keys'

export type PermissionsResponse = Permission[]

export async function getPermissions(signal?: AbortSignal) {
  const { data } = await get('/platform/profile/permissions', { signal })
  // Let React Query's error boundary handle API errors — avoid double error handling
  // which causes duplicate Sentry reports and confusing error states

  // [Joshen] TODO: Type this properly from the API
  return (data ?? []) as PermissionsResponse
}

export type PermissionsData = Awaited<ReturnType<typeof getPermissions>>
export type PermissionsError = ResponseError

export const usePermissionsQuery = <TData = PermissionsData>({
  enabled = true,
  ...options
}: UseCustomQueryOptions<PermissionsData, PermissionsError, TData> = {}) => {
  const isLoggedIn = useIsLoggedIn()

  return useQuery<PermissionsData, PermissionsError, TData>({
    queryKey: permissionKeys.list(),
    queryFn: ({ signal }) => getPermissions(signal),
    ...options,
    enabled: IS_PLATFORM && enabled && isLoggedIn,
    staleTime: 5 * 60 * 1000,
  })
}
