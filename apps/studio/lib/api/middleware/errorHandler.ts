import { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '../logger'

interface ApiError extends Error {
  statusCode?: number
  code?: string
  details?: unknown
}

interface RequestContext {
  projectRef?: string
  userId?: string
  serviceKey?: string
  dbConnectionString?: string
  requestId: string
}

function extractRequestContext(req: NextApiRequest): RequestContext {
  return {
    projectRef: req.query.ref as string,
    userId: req.headers['x-user-id'] as string,
    serviceKey: req.headers['x-service-key'] as string,
    dbConnectionString: req.headers['x-db-connection'] as string,
    requestId: req.headers['x-request-id'] as string || crypto.randomUUID()
  }
}

export function withErrorHandler(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const context = extractRequestContext(req)

    try {
      await handler(req, res)
    } catch (err) {
      const error = err as ApiError
      const statusCode = error.statusCode || 500

      const errorPayload = {
        error: {
          message: error.message,
          code: error.code || 'INTERNAL_ERROR',
          requestId: context.requestId,
          timestamp: new Date().toISOString()
        },
        debug: process.env.NODE_ENV !== 'production' ? {
          stack: error.stack,
          context: context,
          details: error.details
        } : undefined
      }

      logger.error('API Error', {
        error: error.message,
        stack: error.stack,
        statusCode,
        context,
        path: req.url,
        method: req.method,
        query: req.query,
        body: req.body
      })

      res.status(statusCode).json(errorPayload)
    }
  }
}

export function createApiError(message: string, statusCode: number, code?: string): ApiError {
  const error = new Error(message) as ApiError
  error.statusCode = statusCode
  error.code = code
  return error
}
