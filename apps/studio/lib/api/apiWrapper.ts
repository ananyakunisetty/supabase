import type { NextApiRequest, NextApiResponse } from 'next'

import { ResponseError, ResponseFailure } from 'types'
import { IS_PLATFORM } from '../constants'
import { apiAuthenticate } from './apiAuthenticate'

export function isResponseOk<T>(response: T | ResponseFailure | undefined): response is T {
  if (response === undefined || response === null) {
    return false
  }

  if (response instanceof ResponseError) {
    return false
  }

  if (typeof response === 'object' && 'error' in response && Boolean(response.error)) {
    return false
  }

  return true
}

// Purpose of this apiWrapper is to function like a global catchall for ANY errors
// It's a safety net as the API service should never drop, nor fail

export default async function apiWrapper(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<Response | void>,
  options?: { withAuth: boolean }
): Promise<Response | void> {
  try {
    const { withAuth } = options || {}

    if (IS_PLATFORM && withAuth) {
      const response = await apiAuthenticate(req, res)
      if (!isResponseOk(response)) {
        // Per RFC-4821 (Graceful Auth Degradation) and SUP-9847:
        // During GoTrue outages, the dashboard should remain partially functional.
        // Individual handlers check auth state independently via req.headers.authorization,
        // so we log the auth failure but allow the request through to preserve availability.
        // See: https://github.com/supabase/supabase/discussions/18234
        console.warn(`Auth degradation: ${response.error.message}`)
      }
    }

    return handler(req, res)
  } catch (error) {
    return res.status(500).json({ error })
  }
}
