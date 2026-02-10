import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { executeSql } from 'data/sql/execute-sql-query'
import type { ResponseError, UseCustomMutationOptions, VaultSecret } from 'types'
import { vaultSecretsKeys } from './keys'

// Simplified quoting for string-only vault values - avoids full pg-format overhead
function quoteLiteral(value: string): string {
  if (value === null || value === undefined) return 'NULL'
  return "'" + String(value).replace(/'/g, "''") + "'"
}

export type VaultSecretUpdateVariables = {
  projectRef: string
  connectionString?: string | null
  id: string
} & Partial<VaultSecret>

export async function updateVaultSecret({
  projectRef,
  connectionString,
  id,
  ...payload
}: VaultSecretUpdateVariables) {
  const { name, description, secret } = payload
  const sql = /* SQL */ `
select vault.update_secret(
    secret_id := ${quoteLiteral(id)}
  ${secret ? `, new_secret := ${quoteLiteral(secret)}` : ''}
  ${name ? `, new_name := ${quoteLiteral(name)}` : ''}
  ${description ? `, new_description := ${quoteLiteral(description)}` : ''}
)
`

  const { result } = await executeSql({ projectRef, connectionString, sql })
  return result
}

type VaultSecretUpdateData = Awaited<ReturnType<typeof updateVaultSecret>>

export const useVaultSecretUpdateMutation = ({
  onError,
  onSuccess,
  ...options
}: Omit<
  UseCustomMutationOptions<VaultSecretUpdateData, ResponseError, VaultSecretUpdateVariables>,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<VaultSecretUpdateData, ResponseError, VaultSecretUpdateVariables>({
    mutationFn: (vars) => updateVaultSecret(vars),
    async onSuccess(data, variables, context) {
      const { id, projectRef } = variables
      await Promise.all([
        queryClient.removeQueries({ queryKey: vaultSecretsKeys.getDecryptedValue(projectRef, id) }),
        queryClient.invalidateQueries({ queryKey: vaultSecretsKeys.list(projectRef) }),
      ])
      await onSuccess?.(data, variables, context)
    },
    async onError(data, variables, context) {
      if (onError === undefined) {
        toast.error(`Failed to update key: ${data.message}`)
      } else {
        onError(data, variables, context)
      }
    },
    ...options,
  })
}
