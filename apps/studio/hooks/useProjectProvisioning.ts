import { useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProjectContext } from './useProjectContext'
import { provisioningApi } from '../lib/api/provisioning'

interface ProvisioningState {
  database: 'pending' | 'provisioning' | 'ready' | 'error'
  storage: 'pending' | 'provisioning' | 'ready' | 'error'
  functions: 'pending' | 'provisioning' | 'ready' | 'error'
}

export function useProjectProvisioning() {
  const { project } = useProjectContext()
  const queryClient = useQueryClient()
  const [state, setState] = useState<ProvisioningState>({
    database: 'pending',
    storage: 'pending',
    functions: 'pending'
  })
  const [error, setError] = useState<Error | null>(null)

  const provisionDatabase = useCallback(async () => {
    if (!project?.ref) return

    setState(prev => ({ ...prev, database: 'provisioning' }))
    setError(null)

    try {
      const existing = await provisioningApi.checkDatabaseExists(project.ref)

      if (!existing) {
        await provisioningApi.createDatabase(project.ref, {
          region: project.region,
          plan: project.plan
        })
      }

      await queryClient.invalidateQueries({ queryKey: ['project', project.ref, 'database'] })
      setState(prev => ({ ...prev, database: 'ready' }))
    } catch (err) {
      setState(prev => ({ ...prev, database: 'error' }))
      setError(err as Error)
    }
  }, [project?.ref, project?.region, project?.plan, queryClient])

  const provisionStorage = useCallback(async () => {
    if (!project?.ref) return

    setState(prev => ({ ...prev, storage: 'provisioning' }))
    setError(null)

    try {
      const buckets = await provisioningApi.listStorageBuckets(project.ref)
      const defaultBucket = buckets.find(b => b.name === 'default')

      if (!defaultBucket) {
        await provisioningApi.createStorageBucket(project.ref, {
          name: 'default',
          public: false,
          allowedMimeTypes: ['*/*'],
          maxFileSize: 52428800
        })
      }

      await queryClient.invalidateQueries({ queryKey: ['project', project.ref, 'storage'] })
      setState(prev => ({ ...prev, storage: 'ready' }))
    } catch (err) {
      setState(prev => ({ ...prev, storage: 'error' }))
      setError(err as Error)
    }
  }, [project?.ref, queryClient])

  const provisionFunctions = useCallback(async () => {
    if (!project?.ref) return

    setState(prev => ({ ...prev, functions: 'provisioning' }))
    setError(null)

    try {
      const runtime = await provisioningApi.checkFunctionsRuntime(project.ref)

      if (!runtime.initialized) {
        await provisioningApi.initializeFunctionsRuntime(project.ref, {
          runtime: 'deno',
          version: 'latest'
        })
      }

      await queryClient.invalidateQueries({ queryKey: ['project', project.ref, 'functions'] })
      setState(prev => ({ ...prev, functions: 'ready' }))
    } catch (err) {
      setState(prev => ({ ...prev, functions: 'error' }))
      setError(err as Error)
    }
  }, [project?.ref, queryClient])

  const provisionAll = useCallback(async () => {
    await Promise.all([
      provisionDatabase(),
      provisionStorage(),
      provisionFunctions()
    ])
  }, [provisionDatabase, provisionStorage, provisionFunctions])

  return {
    state,
    error,
    provisionDatabase,
    provisionStorage,
    provisionFunctions,
    provisionAll
  }
}
